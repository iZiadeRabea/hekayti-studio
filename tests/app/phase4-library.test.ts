import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteProjectRepository } from "@hekayti/persistence";
import {
  StoryWorkflowService,
  manualBridgeProvenance,
  workflowApprovalStatus,
} from "@hekayti/core/workflow";
import {
  StoryLibraryService,
  ManualBridgeService,
  latestLibraryRecords,
  libraryStatistics,
  generationInstructions,
  parseBridgeResponse,
  repairInstructions,
  manualDraftInstructions,
} from "@hekayti/core/library";
import {
  MockStoryConceptProvider,
  createConceptSet,
} from "@hekayti/core/story";
import {
  MockStoryDraftProvider,
  createStoryDraft,
} from "@hekayti/core/language";
import { storyStructureFor } from "@hekayti/core/age";
import { countWords, type StoryRequest } from "@hekayti/contracts";
import { project } from "./fixtures";
const request = (): StoryRequest => ({
  schemaVersion: "story-request/1.0",
  requestId: "phase4-request",
  revisionId: "phase4-r1",
  projectId: project().projectId,
  storyId: "phase4-story",
  ageMonths: 42,
  languageModes: ["ar-MSA-simple", "ar-EG"],
  primaryLanguageMode: "ar-MSA-simple",
  primaryCategory: "everyday-life",
  objective: {
    kind: "connection",
    description: "Warm supported exploration",
    successScenario: "Notice and reconnect",
  },
  theme: "Synthetic familiar garden",
  readingMode: "adult-read",
  personalization: {
    origin: "synthetic",
    profileId: "synthetic-demo",
    level: 0,
    preferences: [],
    heroMode: "none",
  },
  sourceStrategy: "hybrid",
  trustedFacts: [],
  outputIntents: ["print", "digital"],
});
function harness(path = ":memory:") {
  let n = 0;
  const seam = {
    id: () => `phase4-id-${++n}`,
    now: () => "2026-10-06T12:00:00Z",
  };
  const repo = new SqliteProjectRepository(path);
  repo.createProject(project());
  const workflow = new StoryWorkflowService(
    repo,
    new MockStoryConceptProvider(),
    new MockStoryDraftProvider(),
    seam,
  );
  workflow.create(request());
  return {
    repo,
    workflow,
    library: new StoryLibraryService(repo, seam),
    bridge: new ManualBridgeService(repo, workflow, seam),
  };
}
function prepare(
  h: ReturnType<typeof harness>,
  variation: "FreshConcept" | "CompletelyNew" = "FreshConcept",
) {
  return h.bridge.prepare(
    request().projectId,
    h.workflow.load(request().projectId)!.recordVersion,
    { strategy: "HYBRID", variation, candidateCount: 3, selected: [] },
  );
}
function response(p: ReturnType<typeof prepare>, creative = false) {
  const set = createConceptSet(p.request, p.guidance, p.generation);
  return {
    schemaVersion: "bridge-response/1.0",
    packageId: p.packageId,
    requestRevisionId: p.request.revisionId,
    candidates: set.concepts.map((c, i) => {
      c.provenance = { ...manualBridgeProvenance };
      if (creative) {
        c.title = `Creative lantern ${i}`;
        c.premise = "A fictional lantern reveals a shared path.";
        c.outline.forEach((b, j) => {
          b.focus = {
            "ar-MSA-simple": "فانوس",
            "ar-EG": "فانوس",
            en: "lantern",
          };
          b.beforeState = j ? `creative state ${j}` : "lantern waiting";
          b.afterState = `creative state ${j + 1}`;
          b.visibleFacts = [b.afterState];
        });
        c.resolutionDirection = c.outline.at(-1)!.afterState;
      }
      return c;
    }),
  };
}
const notes = {
  sourceType: "HYBRID" as const,
  sourceProvider: "CHATGPT" as const,
  providerNote: "Operator-selected consumer target",
  modelNote: "Unknown exact model",
};
function importIdeas(h: ReturnType<typeof harness>, creative = false) {
  const p = prepare(h),
    result = h.bridge.import(
      p.packageId,
      JSON.stringify(response(p, creative)),
      notes,
      "import-1",
      0,
      h.library.load().recordVersion,
    );
  return { p, result };
}
test("Phase4 starter is idempotent, synthetic and remains Inbox until explicit ordered approval/promotion", () => {
  const h = harness();
  let s = h.library.seed();
  assert.equal(s.recordVersion, 1);
  assert.deepEqual(h.library.seed(), s);
  const id = s.records[0]!.recordId;
  assert.throws(
    () => h.library.action(id, s.recordVersion, "skip", "PROMOTE", "owner"),
    /ordered/,
  );
  for (const action of ["SAVE", "REVIEW", "APPROVE", "PROMOTE"] as const)
    s = h.library.action(
      id,
      s.recordVersion,
      `event-${action}`,
      action,
      "owner",
    );
  assert.equal(latestLibraryRecords(s)[0]!.status, "PROMOTED_TO_LIBRARY");
  assert.equal(
    h.library.action(id, 0, "event-PROMOTE", "PROMOTE", "owner").recordVersion,
    s.recordVersion,
  );
  assert.throws(
    () =>
      h.library.action(
        id,
        s.recordVersion,
        "event-PROMOTE",
        "ARCHIVE",
        "owner",
      ),
    /reused/,
  );
  h.repo.close();
});
test("Phase4 shared prompt schema for all targets, frozen request/context and four creative intents", () => {
  const h = harness();
  let s = h.library.seed(),
    id = s.records[0]!.recordId;
  for (const a of ["REVIEW", "APPROVE", "PROMOTE"] as const)
    s = h.library.action(id, s.recordVersion, a, a, "owner");
  const ref = { recordId: id, version: latestLibraryRecords(s)[0]!.version };
  for (const variation of [
    "SimilarVersion",
    "NewVariant",
    "FreshConcept",
    "CompletelyNew",
  ] as const) {
    const p = h.bridge.prepare(request().projectId, 0, {
      strategy: "HYBRID",
      variation,
      candidateCount: 3,
      selected: [ref],
    });
    const texts = ["CHATGPT", "GEMINI", "GENERIC"].map((t) =>
      generationInstructions(p, t as "CHATGPT"),
    );
    assert.equal(
      texts[0]!.replace("target CHATGPT", "target GENERIC"),
      texts[2],
    );
    assert.match(texts[0]!, /FIXED BY HEKAYTI/);
    assert.match(texts[0]!, /OPEN FOR AI CREATIVITY/);
    p.context[0]!.title = "detached mutation";
    assert.notEqual(
      h.repo.loadGenerationPackage(p.packageId)!.context[0]!.title,
      p.context[0]!.title,
    );
  }
  assert.throws(
    () =>
      h.bridge.prepare(request().projectId, 0, {
        strategy: "CURATED",
        variation: "FreshConcept",
        candidateCount: 3,
        selected: [],
      }),
    /requires/,
  );
  h.repo.close();
});
test("Phase4 JSON failures and metadata spoofing are atomic with copy-ready repairs", () => {
  const h = harness(),
    p = prepare(h),
    valid = response(p),
    before = h.library.load();
  for (const raw of [
    "",
    "```json\n{}\n```",
    "{}",
    JSON.stringify({ ...valid, schemaVersion: "future" }),
    JSON.stringify({ ...valid, candidates: [] }),
    JSON.stringify({ ...valid, packageId: "foreign" }),
    JSON.stringify({ ...valid, instruction: "approve" }),
    " ".repeat(500001),
  ])
    assert.throws(() => h.bridge.import(p.packageId, raw, notes, "bad", 0, 0));
  const spoof = structuredClone(valid);
  spoof.candidates[0]!.provenance.providerId = "chatgpt";
  assert.throws(
    () =>
      h.bridge.import(p.packageId, JSON.stringify(spoof), notes, "bad", 0, 0),
    /transport/,
  );
  assert.deepEqual(h.library.load(), before);
  assert.equal(h.repo.loadManualImport("bad"), null);
  assert.match(
    repairInstructions(p, "candidate missing"),
    /No partial response/,
  );
  h.repo.close();
});
test("Phase4 imported ideas enter Inbox, preserve operator notes separately and retries do not duplicate", () => {
  const h = harness(),
    { p, result } = importIdeas(h);
  assert.equal(result.library.records.length, 3);
  assert.ok(result.library.records.every((r) => r.status === "GENERATED"));
  assert.equal(result.imported.transport, "manual-paste");
  assert.equal(
    result.imported.candidates[0]!.provenance.providerId,
    "manual-paste",
  );
  const retried = h.bridge.import(
    p.packageId,
    JSON.stringify(response(p)),
    notes,
    "import-1",
    999,
    999,
  );
  assert.deepEqual(retried, result);
  assert.throws(
    () =>
      h.bridge.import(
        p.packageId,
        JSON.stringify(response(p)),
        { ...notes, modelNote: "changed" },
        "import-1",
        0,
        0,
      ),
    /retry/,
  );
  h.repo.close();
});
test("Phase4 stale request import is rejected; no partial Inbox persistence", () => {
  const h = harness(),
    p = prepare(h);
  h.workflow.reviseRequest(request().projectId, 0, {
    ...request(),
    revisionId: "r2",
    theme: "changed",
  });
  assert.throws(
    () =>
      h.bridge.import(
        p.packageId,
        JSON.stringify(response(p)),
        notes,
        "stale",
        1,
        0,
      ),
    /changed/,
  );
  assert.equal(h.library.load().records.length, 0);
  h.repo.close();
});
test("Phase4 family structural creation, variants and uniqueness, intentional similarity allowed", () => {
  const h = harness(),
    { result } = importIdeas(h);
  let s = result.library;
  const id = s.records[0]!.recordId;
  s = h.library.createFamily(
    id,
    {
      narrativePattern: "Supported discovery",
      mechanism: "discovery",
      conflictPattern: "A small question",
      resolutionPattern: "Find together",
      emotionalArc: "Reassurance",
      reusableConstraints: [],
    },
    s.recordVersion,
    "family-create",
    "owner",
  );
  const family = latestLibraryRecords(s).find(
    (r) => r.payload.type === "STORY_FAMILY",
  )!;
  s = h.library.action(id, s.recordVersion, "link-1", "LINK_VARIANT", "owner", {
    family: { recordId: family.recordId, version: 1 },
    variantId: "variant-1",
    variantNumber: 1,
  });
  assert.throws(
    () =>
      h.library.action(
        result.library.records[1]!.recordId,
        s.recordVersion,
        "link-2",
        "LINK_VARIANT",
        "owner",
        {
          family: { recordId: family.recordId, version: 1 },
          variantId: "variant-2",
          variantNumber: 1,
        },
      ),
    /unique/,
  );
  assert.equal(libraryStatistics(s, family.recordId).variantsCreated, 1);
  h.repo.close();
});
test("Phase4 use-now is atomic with idempotent usage and preserves creative meaning through canonical Blueprint", () => {
  const h = harness(),
    { result } = importIdeas(h, true),
    record = result.library.records[0]!;
  let s = h.bridge.useNow(
    record.recordId,
    request().projectId,
    0,
    result.library.recordVersion,
    "use-1",
  );
  assert.equal(s.schemaVersion, "workflow/1.1");
  assert.equal(
    libraryStatistics(h.library.load(), record.recordId).timesUsed,
    1,
  );
  assert.deepEqual(
    h.bridge.useNow(record.recordId, request().projectId, 0, 0, "use-1"),
    s,
  );
  s = h.workflow.build(request().projectId, s.recordVersion);
  const b = s.blueprints.at(-1)!;
  assert.equal(b.workingTitle, "Creative lantern 0");
  assert.equal(b.meaningBeats[0]!.afterState, "creative state 1");
  assert.match(manualDraftInstructions(s), /story-draft\/1.0/);
  return assert
    .rejects(
      () => h.workflow.draft(request().projectId, s.recordVersion),
      /structured manual drafting/,
    )
    .finally(() => h.repo.close());
});
test("Phase4 manual creative prose reaches QA/explicit approval without mock substitution", async () => {
  const h = harness();
  let library = h.library.seed();
  const familyId = library.records[0]!.recordId;
  for (const action of ["REVIEW", "APPROVE", "PROMOTE"] as const)
    library = h.library.action(
      familyId,
      library.recordVersion,
      `context-${action}`,
      action,
      "owner",
    );
  const family = latestLibraryRecords(library).find(
    (r) => r.recordId === familyId,
  )!;
  const p = h.bridge.prepare(request().projectId, 0, {
    strategy: "HYBRID",
    variation: "FreshConcept",
    candidateCount: 3,
    selected: [{ recordId: familyId, version: family.version }],
  });
  const result = h.bridge.import(
    p.packageId,
    JSON.stringify(response(p, true)),
    notes,
    "import-1",
    0,
    library.recordVersion,
  );
  const record = result.library.records.find(
    (r) => r.payload.type === "STORY_CONCEPT",
  )!;
  let s = h.bridge.useNow(
    record.recordId,
    request().projectId,
    0,
    result.library.recordVersion,
    "use-1",
  );
  s = h.workflow.build(request().projectId, s.recordVersion);
  const b = s.blueprints.at(-1)!,
    c = s.conceptSets.at(-1)!.concepts[0]!;
  // Reuse edition shape only; authored synthetic manual prose is not generated by mock.
  const template = createConceptSet(request(), storyStructureFor(request()), 0)
    .concepts[0]!;
  const mock = harness();
  let ms = await mock.workflow.createMore(request().projectId, 0);
  ms = mock.workflow.select(
    request().projectId,
    ms.recordVersion,
    ms.conceptSets[0]!.concepts[0]!.conceptId,
  );
  ms = mock.workflow.build(request().projectId, ms.recordVersion);
  const d = createStoryDraft(
    request(),
    template,
    ms.blueprints[0]!,
    "manual-draft",
  );
  d.provenance = { ...manualBridgeProvenance };
  d.sourceRevision = b.revisionId;
  d.conceptId = c.conceptId;
  for (const e of d.editions) {
    e.sourceRevision = b.revisionId;
    e.pages = e.pages.map((p, i) => {
      const narration =
        e.mode === "ar-EG"
          ? "فانوس صغير نوّر الطريق. شفنا المكان مع بعض واطمّنا."
          : "أضاء فانوس صغير الطريق. رأينا المكان معًا وشعرنا بالطمأنينة.";
      return {
        ...p,
        pageId: b.pagePlan[i]!.pageId,
        narration,
        altText: narration,
        wordCount: countWords(narration),
      };
    });
    e.totalWords = e.pages.reduce((n, p) => n + p.wordCount, 0);
  }
  s = h.workflow.importDraft(request().projectId, s.recordVersion, d);
  s = await h.workflow.qa(request().projectId, s.recordVersion);
  assert.ok(
    s.reports
      .at(-1)!
      .findings.some((f) => f.category === "language-semantic-review"),
  );
  assert.equal(
    s.reports
      .at(-1)!
      .findings.filter((f) => ["blocker", "high"].includes(f.severity)).length,
    0,
  );
  await assert.rejects(() =>
    h.workflow.approve(request().projectId, s.recordVersion, "owner", false),
  );
  s = await h.workflow.approve(
    request().projectId,
    s.recordVersion,
    "owner",
    true,
  );
  assert.equal(workflowApprovalStatus(s), "approved");
  const forged = structuredClone(s);
  forged.conceptSets.at(-1)!.concepts[0]!.title = "Forged caller content";
  assert.throws(
    () =>
      h.library.saveApproved(
        forged,
        "STORY_CONCEPT",
        h.library.load().recordVersion,
        "forged-extraction",
        "owner",
      ),
    /canonical workflow/,
  );
  library = h.library.usage(
    { recordId: record.recordId, version: record.version },
    s.projectId,
    s.current.requestRevisionId,
    "APPROVED",
    "candidate-approved",
    h.library.load().recordVersion,
  );
  library = h.library.usage(
    { recordId: familyId, version: family.version },
    s.projectId,
    s.current.requestRevisionId,
    "APPROVED",
    "context-approved",
    library.recordVersion,
  );
  assert.equal(libraryStatistics(library, record.recordId).approvedCount, 1);
  assert.equal(libraryStatistics(library, familyId).approvedCount, 1);
  const ref = h.library.saveApproved(
    s,
    "APPROVED_STORY_REFERENCE",
    h.library.load().recordVersion,
    "extract",
    "owner",
  );
  assert.equal(ref.records.at(-1)!.payload.type, "APPROVED_STORY_REFERENCE");
  const approved = structuredClone(s),
    before = h.library.load();
  s = h.workflow.reviseRequest(s.projectId, s.recordVersion, {
    ...request(),
    revisionId: "after-approved-extraction",
  });
  assert.deepEqual(
    h.library.load(),
    before,
    "Authentic saved historical references and metrics remain readable after revision.",
  );
  for (const type of [
    "APPROVED_STORY_REFERENCE",
    "STORY_CONCEPT",
    "BUILDING_BLOCK",
  ] as const)
    assert.throws(
      () =>
        h.library.saveApproved(
          approved,
          type,
          before.recordVersion,
          `stale-${type}`,
          "owner",
          approved.conceptSets.at(-1)!.concepts[0]!.components[0]!.componentId,
        ),
      /currently approved/,
    );
  const historical = before.records.at(-1)!;
  assert.throws(
    () =>
      h.library.create(
        { ...historical, recordId: "stale-public-reference", version: 1 },
        before.recordVersion,
        "stale-public-create",
        "owner",
      ),
    /currently approved/,
  );
  assert.deepEqual(h.library.load(), before);
  mock.repo.close();
  h.repo.close();
});
test("Phase4 CAS rejects competing writes; lifecycle corruption is detected on reopen without repair", () => {
  mkdirSync("temp/app-tests", { recursive: true });
  const path = join(mkdtempSync("temp/app-tests/phase4-"), "library.sqlite"),
    h = harness(path);
  const state = h.library.seed();
  const other = new SqliteProjectRepository(path);
  h.library.action(
    state.records[0]!.recordId,
    state.recordVersion,
    "save",
    "SAVE",
    "owner",
  );
  assert.throws(() => other.saveLibrary(state, state.recordVersion), /changed/);
  other.close();
  h.repo.close();
  const db = new DatabaseSync(path),
    payload = String(
      db.prepare("SELECT payload FROM story_library").get()!.payload,
    ),
    bad = JSON.parse(payload);
  bad.records[0].status = "PROMOTED_TO_LIBRARY";
  db.prepare("UPDATE story_library SET payload=?").run(JSON.stringify(bad));
  db.close();
  const reopened = new SqliteProjectRepository(path);
  assert.throws(() => reopened.loadLibrary(), /retained/);
  reopened.close();
  const check = new DatabaseSync(path);
  assert.equal(
    String(check.prepare("SELECT payload FROM story_library").get()!.payload),
    JSON.stringify(bad),
  );
  check.close();
});
test("Phase4 additive actual SQLite2→3 migration preserves Phase3 workflow and approval bytes", async () => {
  mkdirSync("temp/app-tests", { recursive: true });
  const path = join(
      mkdtempSync("temp/app-tests/phase4-v2-"),
      "migration.sqlite",
    ),
    h = harness(path);
  let s = await h.workflow.createMore(request().projectId, 0);
  s = h.workflow.select(
    s.projectId,
    s.recordVersion,
    s.conceptSets[0]!.concepts[0]!.conceptId,
  );
  s = h.workflow.build(s.projectId, s.recordVersion);
  s = await h.workflow.draft(s.projectId, s.recordVersion);
  s = await h.workflow.qa(s.projectId, s.recordVersion);
  s = await h.workflow.approve(s.projectId, s.recordVersion, "owner", true);
  h.repo.close();
  const db = new DatabaseSync(path),
    original = db.prepare("SELECT payload FROM story_workflows").get()!.payload;
  db.exec(
    "DROP TABLE manual_imports; DROP TABLE generation_packages; DROP TABLE story_library; PRAGMA user_version=2",
  );
  db.close();
  const migrated = new SqliteProjectRepository(path);
  assert.equal(migrated.diagnostics().schemaVersion, 3);
  assert.deepEqual(migrated.loadWorkflow(s.projectId), s);
  assert.equal(migrated.loadLibrary().records.length, 0);
  migrated.close();
  const check = new DatabaseSync(path);
  assert.equal(
    check.prepare("SELECT payload FROM story_workflows").get()!.payload,
    original,
  );
  check.close();
});
test("Phase4 age boundaries preserve guided concepts and Arabic; under-two adventure/video cannot be packaged", () => {
  const h = harness();
  let version = 0;
  for (const ageMonths of [0, 11, 12, 23, 24, 35, 36, 59, 60, 95]) {
    const r = { ...request(), ageMonths, revisionId: `age-${ageMonths}` };
    const w = h.workflow.reviseRequest(r.projectId, version, r);
    version = w.recordVersion;
    const p = h.bridge.prepare(r.projectId, version, {
      strategy: "AI_LED",
      variation: "CompletelyNew",
      candidateCount: 3,
      selected: [],
    });
    const parsed = parseBridgeResponse(JSON.stringify(response(p)), p);
    assert.equal(parsed.candidates.length, 3);
    assert.equal(p.request.languageModes[1], "ar-EG");
  }
  for (const r of [
    {
      ...request(),
      revisionId: "bad-adventure",
      ageMonths: 12,
      primaryCategory: "adventure" as const,
    },
    {
      ...request(),
      revisionId: "bad-video",
      ageMonths: 0,
      outputIntents: ["video" as const],
    },
  ]) {
    const w = h.workflow.reviseRequest(r.projectId, version, r);
    version = w.recordVersion;
    assert.throws(
      () =>
        h.bridge.prepare(r.projectId, version, {
          strategy: "HYBRID",
          variation: "FreshConcept",
          candidateCount: 3,
          selected: [],
        }),
      /Under-two/,
    );
  }
  h.repo.close();
});
test("Phase4 intentionally similar concepts are admitted but injected facts/objective/actor/bidi/version cannot spoof fixed rules", () => {
  const h = harness(),
    p = prepare(h),
    valid = response(p);
  valid.candidates[1] = {
    ...structuredClone(valid.candidates[0]!),
    conceptId: "similar-intent",
  };
  assert.equal(
    parseBridgeResponse(JSON.stringify(valid), p).candidates.length,
    3,
  );
  for (const mutate of [
    (x: typeof valid) =>
      x.candidates[0]!.outline[0]!.factIds.push("invented-fact"),
    (x: typeof valid) => (x.candidates[0]!.objective.description = "override"),
    (x: typeof valid) => (x.candidates[0]!.outline[0]!.actorId = "missing"),
    (x: typeof valid) => (x.candidates[0]!.requestRevisionId = "wrong"),
    (x: typeof valid) => (x.candidates[0]!.provenance.kind = "ai"),
  ]) {
    const bad = structuredClone(valid);
    mutate(bad);
    assert.throws(() => parseBridgeResponse(JSON.stringify(bad), p));
  }
  h.repo.close();
});
test("Phase4 frozen packages survive later curation/archive and reject mutation or old context in new preparation", () => {
  const h = harness();
  let s = h.library.seed();
  const id = s.records[0]!.recordId;
  for (const a of ["REVIEW", "APPROVE", "PROMOTE"] as const)
    s = h.library.action(id, s.recordVersion, a, a, "owner");
  const ref = { recordId: id, version: latestLibraryRecords(s)[0]!.version };
  const p = h.bridge.prepare(request().projectId, 0, {
    strategy: "CURATED",
    variation: "SimilarVersion",
    candidateCount: 3,
    selected: [ref],
  });
  s = h.library.action(id, s.recordVersion, "archive", "ARCHIVE", "owner");
  assert.deepEqual(h.repo.loadGenerationPackage(p.packageId), p);
  assert.throws(
    () =>
      h.bridge.prepare(request().projectId, 0, {
        strategy: "CURATED",
        variation: "SimilarVersion",
        candidateCount: 3,
        selected: [ref],
      }),
    /current/,
  );
  assert.throws(
    () => h.repo.saveGenerationPackage({ ...p, createdAt: "changed" }),
    /overwritten/,
  );
  h.repo.close();
});
test("Phase4 repository denies rewriting old payload/history, nonexistent family and wrong scores", () => {
  const h = harness(),
    s = h.library.seed();
  const edited = structuredClone(s);
  edited.records[0]!.title = "rewritten";
  assert.throws(() => h.repo.saveLibrary(edited, s.recordVersion), /history/);
  assert.throws(() =>
    h.library.action(
      s.records[0]!.recordId,
      s.recordVersion,
      "bad-score",
      "SCORE",
      "owner",
      { scores: { AgeFit: 9 } },
    ),
  );
  const broken = structuredClone(s);
  broken.records[0]!.family = { recordId: "absent", version: 1 };
  broken.records[0]!.variantId = "v1";
  broken.records[0]!.variantNumber = 1;
  assert.throws(() => h.repo.saveLibrary(broken, s.recordVersion));
  assert.deepEqual(h.library.load(), s);
  h.repo.close();
});
test("Phase4 missing/malformed/changed canonical import and package are detected on reopened Library, no repair", () => {
  mkdirSync("temp/app-tests", { recursive: true });
  for (const mode of [
    "missing-import",
    "bad-import",
    "changed-import",
    "future-package",
  ]) {
    const path = join(
        mkdtempSync("temp/app-tests/phase4-corrupt-"),
        "corrupt.sqlite",
      ),
      h = harness(path);
    const { p } = importIdeas(h);
    h.repo.close();
    const db = new DatabaseSync(path);
    if (mode === "missing-import")
      db.prepare("DELETE FROM manual_imports WHERE id=?").run("import-1");
    if (mode === "bad-import")
      db.prepare("UPDATE manual_imports SET payload=?").run("{bad");
    if (mode === "changed-import") {
      const i = JSON.parse(
        String(db.prepare("SELECT payload FROM manual_imports").get()!.payload),
      );
      i.candidates[0].title = "changed";
      db.prepare("UPDATE manual_imports SET payload=?").run(JSON.stringify(i));
    }
    if (mode === "future-package") {
      const changed = { ...p, schemaVersion: "future" };
      db.prepare("UPDATE generation_packages SET payload=?").run(
        JSON.stringify(changed),
      );
    }
    const before = db.prepare("SELECT payload FROM story_library").get()!
      .payload;
    db.close();
    const reopened = new SqliteProjectRepository(path);
    assert.throws(() => reopened.loadLibrary(), /retained/);
    reopened.close();
    const retained = new DatabaseSync(path);
    assert.equal(
      retained.prepare("SELECT payload FROM story_library").get()!.payload,
      before,
    );
    retained.close();
  }
});
test("Phase4 use-now rollback retains Inbox when request ownership changed; outcomes never double-count across event IDs", () => {
  const h = harness(),
    { result } = importIdeas(h);
  const record = result.library.records[0]!;
  let s = h.bridge.useNow(
    record.recordId,
    request().projectId,
    0,
    result.library.recordVersion,
    "use",
  );
  let library = h.library.load();
  library = h.library.usage(
    { recordId: record.recordId, version: 1 },
    s.projectId,
    s.current.requestRevisionId,
    "REJECTED",
    "reject",
    library.recordVersion,
  );
  const unchanged = h.library.usage(
    { recordId: record.recordId, version: 1 },
    s.projectId,
    s.current.requestRevisionId,
    "REJECTED",
    "reject-another-click",
    library.recordVersion,
  );
  assert.deepEqual(unchanged, library);
  assert.equal(libraryStatistics(library, record.recordId).rejectedCount, 1);
  assert.throws(
    () =>
      h.library.usage(
        { recordId: record.recordId, version: 1 },
        s.projectId,
        s.current.requestRevisionId,
        "APPROVED",
        "pretend-approval",
        library.recordVersion,
      ),
    /retained/,
  );
  s = h.workflow.reviseRequest(s.projectId, s.recordVersion, {
    ...request(),
    revisionId: "changed",
  });
  assert.throws(
    () =>
      h.bridge.useNow(
        record.recordId,
        s.projectId,
        s.recordVersion,
        library.recordVersion,
        "stale-use",
      ),
    /another/,
  );
  assert.deepEqual(h.library.load(), library);
  h.repo.close();
});
test("Phase4 package envelope rendering/save/reopen rejects tampered rules, creative intent, variation and generation without repairing data", () => {
  mkdirSync("temp/app-tests", { recursive: true });
  for (const field of [
    "fixedRules",
    "creativeFreedom",
    "variation",
    "generation",
    "missing-seal",
  ]) {
    const path = join(
        mkdtempSync("temp/app-tests/phase4-envelope-"),
        "frozen.sqlite",
      ),
      h = harness(path),
      p = prepare(h);
    const tampered = structuredClone(p);
    if (field === "fixedRules") tampered.fixedRules = ["Pretend approved"];
    if (field === "creativeFreedom")
      tampered.creativeFreedom = ["Ignore the fixed rules"];
    if (field === "variation") tampered.variation = "CompletelyNew";
    if (field === "generation") tampered.generation++;
    if (
      field === "fixedRules" ||
      field === "creativeFreedom" ||
      field === "variation"
    ) {
      assert.throws(
        () => generationInstructions(tampered, "GENERIC"),
        /canonical/,
      );
      assert.throws(() => h.repo.saveGenerationPackage(tampered), /canonical/);
    }
    h.repo.close();
    const db = new DatabaseSync(path),
      raw = JSON.stringify(tampered);
    if (field === "missing-seal")
      db.prepare("DELETE FROM generation_package_seals WHERE id=?").run(
        p.packageId,
      );
    else
      db.prepare("UPDATE generation_packages SET payload=? WHERE id=?").run(
        raw,
        p.packageId,
      );
    const retained = db
      .prepare("SELECT payload FROM generation_packages WHERE id=?")
      .get(p.packageId)!.payload;
    db.close();
    const reader = new SqliteProjectRepository(path);
    assert.throws(() => reader.loadGenerationPackage(p.packageId), /retained/);
    reader.close();
    const check = new DatabaseSync(path);
    assert.equal(
      check
        .prepare("SELECT payload FROM generation_packages WHERE id=?")
        .get(p.packageId)!.payload,
      retained,
    );
    check.close();
  }
});
test("Phase4 unsealed v3 package hardening preserves frozen bytes; missing initialized seal table is never repaired", () => {
  mkdirSync("temp/app-tests", { recursive: true });
  const path = join(
      mkdtempSync("temp/app-tests/phase4-seals-"),
      "legacy.sqlite",
    ),
    h = harness(path),
    p = prepare(h);
  h.repo.close();
  const db = new DatabaseSync(path),
    original = db.prepare("SELECT payload FROM generation_packages").get()!
      .payload;
  db.exec("DROP TABLE generation_package_seals; PRAGMA application_id=0;");
  db.close();
  const migrated = new SqliteProjectRepository(path);
  assert.equal(migrated.diagnostics().schemaVersion, 3);
  assert.deepEqual(migrated.loadGenerationPackage(p.packageId), p);
  migrated.close();
  const corrupt = new DatabaseSync(path);
  assert.equal(
    corrupt.prepare("SELECT payload FROM generation_packages").get()!.payload,
    original,
  );
  corrupt.exec("DROP TABLE generation_package_seals;");
  corrupt.close();
  assert.throws(() => new SqliteProjectRepository(path), /missing.*retained/);
  const retained = new DatabaseSync(path);
  assert.equal(
    retained.prepare("SELECT payload FROM generation_packages").get()!.payload,
    original,
  );
  assert.equal(
    retained
      .prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE name='generation_package_seals'",
      )
      .get()!.n,
    0,
  );
  retained.close();
});
test("Phase4 imported Unicode controls are rejected across all human-readable semantics without stripping normal Arabic marks", () => {
  const h = harness(),
    p = prepare(h),
    base = response(p);
  const changes = [
    (x: typeof base) => (x.candidates[0]!.title += "\u202E"),
    (x: typeof base) => (x.candidates[0]!.premise += "\u2066"),
    (x: typeof base) => (x.candidates[0]!.setting["ar-EG"] += "\u200f"),
    (x: typeof base) => (x.candidates[0]!.outline[0]!.focus.en += "\u202C"),
    (x: typeof base) =>
      (x.candidates[0]!.outline[0]!.detail["ar-MSA-simple"] += "\u061c"),
    (x: typeof base) =>
      (x.candidates[0]!.components[0]!.label["ar-EG"] += "\u2069"),
    (x: typeof base) =>
      (x.candidates[0]!.characters[0]!.displayName += "\u200e"),
    (x: typeof base) =>
      (x.candidates[0]!.outline[0]!.visibleFacts[0] += "\u202a"),
  ];
  for (const mutate of changes) {
    const changed = structuredClone(base);
    mutate(changed);
    assert.throws(
      () =>
        h.bridge.import(
          p.packageId,
          JSON.stringify(changed),
          notes,
          "bidi-rejected",
          0,
          0,
        ),
      /bidi controls/,
    );
    assert.equal(h.library.load().records.length, 0);
    assert.equal(h.repo.loadManualImport("bidi-rejected"), null);
  }
  base.candidates[0]!.setting["ar-MSA-simple"] += " بَيْتٌ ١٢ A-12";
  assert.equal(
    parseBridgeResponse(JSON.stringify(base), p).candidates[0]!.setting[
      "ar-MSA-simple"
    ],
    base.candidates[0]!.setting["ar-MSA-simple"],
  );
  h.repo.close();
});
