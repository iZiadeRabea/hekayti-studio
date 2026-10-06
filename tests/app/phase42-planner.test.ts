import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { countWords, type StoryRequest } from "@hekayti/contracts";
import {
  PlanningRequestSchema,
  StoryPlanSchema,
  PlanResponseSchema,
  type PlanningRequest,
  type PlanFeedback,
} from "@hekayti/contracts/planner";
import {
  SqliteProjectRepository,
  createCreativeArchive,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
import {
  composeStoryPlan,
  validateStoryPlan,
  derivePlanningBlocks,
  rankPlanningCandidates,
  StoryPlannerService,
  planGenerationInstructions,
  parsePlanResponse,
} from "@hekayti/core/planner";
import {
  StoryWorkflowService,
  manualBridgeProvenance,
  type WorkflowSnapshot,
} from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
import {
  latestLibraryRecords,
  StoryLibraryService,
  libraryStatisticsByRecord,
} from "@hekayti/core/library";
import { patternFeedback } from "@hekayti/core/dna";
import { project } from "./fixtures";

function request(age = 48): StoryRequest {
  return {
    schemaVersion: "story-request/1.0",
    requestId: "r",
    revisionId: "r-1",
    projectId: "demo-product-design",
    storyId: "s",
    ageMonths: age,
    languageModes: ["ar-MSA-simple", "ar-EG"],
    primaryLanguageMode: "ar-EG",
    primaryCategory: "behavioral",
    objective: {
      kind: "behavioral",
      description: "Sharing",
      successScenario: "Take turns with the same familiar toy",
    },
    theme: "Sharing a toy",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "synthetic",
      level: 0,
      preferences: [],
      heroMode: "none",
    },
    sourceStrategy: "hybrid",
    trustedFacts: [],
    outputIntents: ["print", "digital"],
  };
}
function planning(age = 48): PlanningRequest {
  return {
    schemaVersion: "planning-request/1.0",
    planningRevisionId: "planning-1",
    request: request(age),
    profile: "EGYPTIAN_ARAB_MUSLIM_FAMILY",
    variation: "FreshConcept",
    generation: 0,
    selectedFamily: null,
    selectedCharacter: null,
    selectedSetting: null,
    constraints: [],
    inspirationReviewed: true,
    adaptationAcknowledged: true,
    sensitiveOptIn: false,
    religiousOptIn: false,
  };
}
const seed = parseLibraryBatch(
  readFileSync(
    new URL(
      "../../examples/starter-library/starter-library.jsonl",
      import.meta.url,
    ),
    "utf8",
  ),
);
function harness(path = ":memory:", all = false) {
  const repo = new SqliteProjectRepository(path);
  repo.createProject(project());
  let n = 0;
  const seam = {
    id: () => `planner-${++n}`,
    now: () => "2026-10-06T10:00:00Z",
  };
  const workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      seam,
    ),
    planner = new StoryPlannerService(repo, workflow, seam);
  importLibraryBatch(
    repo,
    all ? seed : seed.filter((r) => r.payload.type === "STORY_FAMILY"),
    0,
    "fixture",
    "now",
  );
  return { repo, workflow, planner, seam };
}
function prose(w: WorkflowSnapshot) {
  const b = w.blueprints.at(-1)!;
  return {
    schemaVersion: "story-draft/1.0",
    draftId: "manual-draft-1",
    sourceRevision: b.revisionId,
    conceptId: w.current.conceptId!,
    editions: b.languageVersions.map((e, i) => ({
      ...e,
      languageVersionId: `manual-edition-${i}`,
      pages: e.pages.map((page) => ({
        ...page,
        narration:
          e.mode === "ar-EG"
            ? "نور شافت اللعبة. استنت دورها بالراحة."
            : "رأت نور اللعبة. انتظرت دورها بهدوء.",
        dialogue: [],
        wordCount: 8,
      })),
      totalWords: e.pages.length * 8,
      review:
        "Unverified synthetic fixture prose; manual native review required.",
    })),
    provenance: manualBridgeProvenance,
    status: "draft",
  };
}
async function accepted(h: ReturnType<typeof harness>, p = planning()) {
  let w = h.workflow.create(p.request);
  let s = await h.planner.plan(
    p,
    0,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  const result = await h.planner.accept(
    w.projectId,
    s.recordVersion,
    w.recordVersion,
    "fixture-human-action",
    true,
  );
  w = result.workflow;
  s = result.planner;
  const prepared = await h.planner.prepare(
    w.projectId,
    s.recordVersion,
    w.recordVersion,
  );
  return { w, s: prepared.planner, pkg: prepared.package };
}
function response(data: Awaited<ReturnType<typeof accepted>>) {
  const p = data.pkg.plan,
    d = prose(data.w);
  for (const e of d.editions) {
    for (const page of e.pages) page.wordCount = countWords(page.narration);
    e.totalWords = e.pages.reduce((n, p) => n + p.wordCount, 0);
  }
  return {
    schemaVersion: "plan-response/1.0",
    packageId: data.pkg.packageId,
    planRevisionId: p.revisionId,
    planHash: data.pkg.acceptance.planHash,
    requestRevisionId: p.planning.request.revisionId,
    objective: p.planning.request.objective.description,
    actors: p.characters.map((c) => c.characterId),
    majorBeatIds: p.beats.map((b) => b.beatId),
    resolutionBeatId: p.resolutionBeatId,
    draft: d,
  };
}

test("A–D deterministic real starter retrieval and derived blocks preserve honest unknown DNA", async () => {
  const h = harness(":memory:", true),
    lib = h.repo.loadLibrary(),
    p = planning();
  assert.equal(lib.records.length, 791);
  assert.equal(
    lib.records.filter((r) => r.creative?.culture.fit === "READY").length,
    0,
  );
  const first = await composeStoryPlan(p, lib, {
      planId: "p",
      revisionId: "pv",
    }),
    second = await composeStoryPlan(p, lib, { planId: "p", revisionId: "pv" });
  assert.deepEqual(first, second);
  assert.ok(first.provenance.sources.length);
  assert.ok(first.provenance.derivedBlocks.length);
  assert.ok(first.provenance.selectedPatternId);
  assert.equal(
    validateStoryPlan(first).findings.some((f) => f.severity === "high"),
    false,
  );
  const sparse = lib.records.find(
    (r) =>
      r.creative?.dna &&
      !r.creative.dna.pattern &&
      r.creative.dna.fields.goal.value === null,
  )!;
  assert.ok(!derivePlanningBlocks(sparse).some((b) => b.kind === "goal"));
  h.repo.close();
});
test("D infant/toddler/preschool/older structures differ materially and hard adventure/video gates remain", async () => {
  const h = harness(),
    lib = h.repo.loadLibrary();
  const plans = await Promise.all(
    [8, 18, 30, 48, 72].map((age) =>
      composeStoryPlan(planning(age), lib, {
        planId: `p${age}`,
        revisionId: `pv${age}`,
      }),
    ),
  );
  assert.equal(plans[0]!.problem, null);
  assert.equal(plans[0]!.climaxBeatId, null);
  assert.ok(plans[0]!.beats.some((b) => b.action === "repeat"));
  assert.equal(plans[1]!.beats.length, 3);
  assert.equal(plans[2]!.beats.length, 4);
  assert.equal(plans[3]!.beats.length, 5);
  assert.equal(plans[4]!.beats.length, 7);
  for (const p of plans)
    assert.equal(
      validateStoryPlan(p).findings.some((f) => f.severity === "high"),
      false,
    );
  const tooYoung = planning(10);
  tooYoung.request.primaryCategory = "adventure";
  await assert.rejects(
    () => composeStoryPlan(tooYoung, lib, { planId: "p", revisionId: "pv" }),
    /Under-two adventure/,
  );
  tooYoung.request.primaryCategory = "bedtime";
  tooYoung.request.outputIntents.push("video");
  await assert.rejects(
    () => composeStoryPlan(tooYoung, lib, { planId: "p", revisionId: "pv" }),
    /video/,
  );
  h.repo.close();
});
test("E provisional/adaptation/sensitivity/religion are separate explicit opt-ins; no promotion bypass", async () => {
  const h = harness(":memory:", true),
    lib = h.repo.loadLibrary(),
    p = planning();
  const no = { ...p, inspirationReviewed: false };
  assert.equal(rankPlanningCandidates(no, lib).length, 0);
  assert.equal(
    rankPlanningCandidates({ ...p, adaptationAcknowledged: false }, lib).length,
    0,
  );
  const normal = rankPlanningCandidates(p, lib);
  assert.ok(
    normal.every(
      (x) =>
        !["SENSITIVE_REVIEW", "NOT_DEFAULT"].includes(
          x.record.creative!.culture.fit,
        ),
    ),
  );
  assert.ok(
    normal.every(
      (x) =>
        x.record.creative!.culture.religiousReview !==
        "RELIGIOUS_ACCURACY_REVIEW_REQUIRED",
    ),
  );
  const expanded = rankPlanningCandidates(
    { ...p, sensitiveOptIn: true, religiousOptIn: true },
    lib,
  );
  assert.ok(expanded.length >= normal.length);
  const fallback = await composeStoryPlan(no, lib, {
    planId: "f",
    revisionId: "fr",
  });
  assert.equal(fallback.provenance.sourceMode, "EDITORIAL_FALLBACK");
  assert.equal(
    lib.records.every((r) => r.status === "GENERATED"),
    true,
  );
  h.repo.close();
});
test("F four variations retain/revise family or avoid same vector and disclose lack of alternative", async () => {
  const h = harness(),
    lib = h.repo.loadLibrary(),
    family = rankPlanningCandidates(planning(), lib)[0]!.record,
    selectedFamily = { recordId: family.recordId, version: family.version };
  const plans = await Promise.all(
    (
      ["SimilarVersion", "NewVariant", "FreshConcept", "CompletelyNew"] as const
    ).map((variation) =>
      composeStoryPlan({ ...planning(), selectedFamily, variation }, lib, {
        planId: variation,
        revisionId: `v-${variation}`,
      }),
    ),
  );
  assert.equal(plans[0]!.provenance.selectedStoryFamilyId, family.recordId);
  assert.equal(plans[1]!.provenance.selectedStoryFamilyId, family.recordId);
  assert.notDeepEqual(
    plans[0]!.beats.map((b) => b.action),
    plans[1]!.beats.map((b) => b.action),
  );
  for (const p of plans.slice(2)) {
    assert.notEqual(p.provenance.selectedStoryFamilyId, family.recordId);
    assert.notEqual(
      p.provenance.selectedPatternId,
      family.creative?.dna?.pattern?.patternId,
    );
  }
  const only = {
    ...lib,
    records: [family],
    events: lib.events.filter((e) => e.recordId === family.recordId),
  };
  const limited = await composeStoryPlan(
    { ...planning(), selectedFamily, variation: "CompletelyNew" },
    only,
    { planId: "p", revisionId: "pv" },
  );
  assert.ok(
    limited.provenance.limitations.some((l) =>
      l.includes("No unused alternative"),
    ),
  );
  h.repo.close();
});
test("B/F different structural families change actual actions even with same theme/objective", async () => {
  const h = harness(),
    lib = h.repo.loadLibrary(),
    families = latestLibraryRecords(lib).filter(
      (r) => r.payload.type === "STORY_FAMILY" && r.creative?.dna?.pattern,
    );
  const plans = await Promise.all(
    families.map((f) =>
      composeStoryPlan(
        {
          ...planning(),
          sensitiveOptIn: true,
          religiousOptIn: true,
          variation: "SimilarVersion",
          selectedFamily: { recordId: f.recordId, version: f.version },
        },
        lib,
        { planId: f.recordId, revisionId: `p-${f.recordId}` },
      ),
    ),
  );
  assert.ok(
    new Set(plans.map((p) => p.beats.map((b) => b.action).join(","))).size >= 4,
  );
  assert.ok(
    new Set(plans.map((p) => p.provenance.selectedPatternId)).size >= 10,
  );
  h.repo.close();
});
test("G/H adversarial causality, cast, state, locations, progression, setup, ending and age are caught", async () => {
  const h = harness(),
    p = await composeStoryPlan(planning(), h.repo.loadLibrary(), {
      planId: "p",
      revisionId: "pv",
    });
  const mutations: [string, (plan: typeof p) => void][] = [
    [
      "resolution",
      (p) => {
        p.beats.at(-2)!.addressesProblemId = "other";
      },
    ],
    [
      "cast",
      (p) => {
        p.beats[1]!.actorId = "sudden-actor";
      },
    ],
    [
      "ordering",
      (p) => {
        p.beats[1]!.causes = [p.beats[2]!.beatId];
      },
    ],
    [
      "state",
      (p) => {
        p.beats[1]!.beforeState = "impossible";
      },
    ],
    [
      "location",
      (p) => {
        p.beats[1]!.locationId = "moon";
      },
    ],
    [
      "setup",
      (p) => {
        p.beats.at(-2)!.requires = ["magic-token"];
      },
    ],
    [
      "ending",
      (p) => {
        p.endingBeatId = p.beats[0]!.beatId;
      },
    ],
    [
      "age",
      (p) => {
        p.planning.request.ageMonths = 8;
      },
    ],
    [
      "causality",
      (p) => {
        p.beats[1]!.causes = [];
      },
    ],
  ];
  for (const [category, edit] of mutations) {
    const changed = structuredClone(p);
    edit(changed);
    assert.ok(
      validateStoryPlan(changed).findings.some(
        (f) => f.category === category && f.severity === "high",
      ),
      category,
    );
  }
  const repeated = structuredClone(p);
  repeated.beats[1]!.role = "ATTEMPT";
  repeated.beats[2]!.role = "ATTEMPT";
  repeated.beats[2]!.progress = repeated.beats[1]!.progress;
  assert.ok(
    validateStoryPlan(repeated).findings.some(
      (f) => f.category === "progression",
    ),
  );
  h.repo.close();
});
test("strict versioned planner wrappers reject unsupported versions/fields/private character origin", () => {
  const p = planning();
  assert.equal(
    PlanningRequestSchema.safeParse({ ...p, apiKey: "not-a-key" }).success,
    false,
  );
  assert.equal(
    PlanningRequestSchema.safeParse({
      ...p,
      schemaVersion: "planning-request/9",
    }).success,
    false,
  );
  assert.equal(
    PlanningRequestSchema.safeParse({
      ...p,
      selectedCharacter: { origin: "private" },
    }).success,
    false,
  );
});
test("I/M accepted plan enters single canonical concept/Blueprint; provider packages share schema and immutable meaning", async () => {
  const h = harness(),
    data = await accepted(h);
  assert.equal(data.w.schemaVersion, "workflow/1.2");
  assert.equal(data.w.conceptSets[0]!.concepts.length, 1);
  assert.equal(data.w.blueprints.length, 1);
  const strings = (["CHATGPT", "GEMINI", "GENERIC"] as const).map((t) =>
    planGenerationInstructions(data.pkg, data.w, t),
  );
  assert.ok(
    strings.every(
      (s) =>
        s.includes("FIXED STORY STRUCTURE") &&
        s.includes("AI WRITING FREEDOM") &&
        s.includes("FULL SHARED OUTPUT SCHEMA"),
    ),
  );
  assert.equal(
    strings[0]!.split("FROZEN STORY PLAN")[1],
    strings[1]!.split("FROZEN STORY PLAN")[1],
  );
  assert.equal(data.w.current.approvalId, null);
  h.repo.close();
});
test("J major anchor/language/page/speaker/hash drift fails atomically; current prose proceeds through QA/approval", async () => {
  const h = harness(),
    data = await accepted(h),
    out = response(data);
  assert.equal(PlanResponseSchema.safeParse(out).success, true);
  for (const edit of [
    (o: typeof out) => {
      o.planHash = "a".repeat(64);
    },
    (o: typeof out) => {
      o.objective = "other";
    },
    (o: typeof out) => {
      o.actors.push("extra");
    },
    (o: typeof out) => {
      o.majorBeatIds.reverse();
    },
    (o: typeof out) => {
      o.resolutionBeatId = "other";
    },
    (o: typeof out) => {
      o.draft.editions[0]!.mode = "en";
    },
    (o: typeof out) => {
      o.draft.editions[0]!.pages[0]!.pageId = "wrong";
    },
  ]) {
    const changed = structuredClone(out);
    edit(changed);
    await assert.rejects(() =>
      h.planner.import(
        data.w.projectId,
        data.pkg.packageId,
        JSON.stringify(changed),
        data.s.recordVersion,
        data.w.recordVersion,
      ),
    );
    assert.equal(h.workflow.load(data.w.projectId)!.drafts.length, 0);
  }
  let w = await h.planner.import(
    data.w.projectId,
    data.pkg.packageId,
    JSON.stringify(out),
    data.s.recordVersion,
    data.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  assert.ok(
    w.reports
      .at(-1)!
      .findings.some(
        (f) =>
          f.category.includes("language") ||
          f.message.includes("human") ||
          f.message.includes("native"),
      ),
  );
  w = await h.workflow.approve(
    w.projectId,
    w.recordVersion,
    "fixture-reviewer",
    true,
  );
  assert.ok(w.current.approvalId);
  h.repo.close();
});
test("K feedback requires actual exact canonical approval; family/pattern counts and rating update once", async () => {
  const h = harness(),
    data = await accepted(h);
  let w = await h.planner.import(
    data.w.projectId,
    data.pkg.packageId,
    JSON.stringify(response(data)),
    data.s.recordVersion,
    data.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  const f: PlanFeedback = {
    feedbackId: "feedback",
    planRevisionId: data.pkg.plan.revisionId,
    requestRevisionId: w.current.requestRevisionId,
    draftId: w.current.draftId!,
    reportId: w.current.reportId!,
    approvalId: null,
    outcome: "APPROVED",
    reviewerAlias: "fixture-reviewer",
    notes: "Actual synthetic fixture review action",
    ratings: { StoryQuality: 4 },
    timestamp: "now",
    humanReviewAcknowledged: true,
  };
  assert.throws(
    () =>
      h.planner.feedback(
        w.projectId,
        f,
        data.s.recordVersion,
        w.recordVersion,
        h.repo.loadLibrary().recordVersion,
      ),
    /approval/,
  );
  w = await h.workflow.approve(
    w.projectId,
    w.recordVersion,
    "fixture-reviewer",
    true,
  );
  f.approvalId = w.current.approvalId;
  const saved = h.planner.feedback(
      w.projectId,
      f,
      data.s.recordVersion,
      w.recordVersion,
      h.repo.loadLibrary().recordVersion,
    ),
    lib = h.repo.loadLibrary();
  assert.deepEqual(h.planner.feedback(w.projectId, f, 0, 0, 0), saved);
  assert.equal(h.repo.loadLibrary().recordVersion, lib.recordVersion);
  const id = data.pkg.plan.provenance.sources[0]!.ref.recordId;
  assert.equal(libraryStatisticsByRecord(lib).get(id)!.approvedCount, 1);
  assert.equal(
    latestLibraryRecords(lib).find((r) => r.recordId === id)!.scores!
      .StoryQuality,
    4,
  );
  if (data.pkg.plan.provenance.selectedPatternId)
    assert.ok(
      patternFeedback(lib, data.pkg.plan.provenance.selectedPatternId)
        .approvedCount >= 1,
    );
  h.repo.close();
});
test("acceptance and packages cannot survive request/source revisions, and acceptance rollback is atomic", async () => {
  const h = harness(),
    data = await accepted(h);
  const revised = {
    ...data.w.requests.at(-1)!,
    revisionId: "r-2",
    theme: "other",
  };
  const w = h.workflow.reviseRequest(
    data.w.projectId,
    data.w.recordVersion,
    revised,
  );
  await assert.rejects(
    () =>
      h.planner.import(
        w.projectId,
        data.pkg.packageId,
        JSON.stringify(response(data)),
        data.s.recordVersion,
        w.recordVersion,
      ),
    /changed/,
  );
  assert.equal(h.workflow.load(w.projectId)!.drafts.length, 0);
  h.repo.close();
  const h2 = harness(),
    data2 = await accepted(h2),
    source = data2.pkg.plan.provenance.sources[0]!.ref,
    library = new StoryLibraryService(h2.repo, h2.seam);
  library.action(
    source.recordId,
    h2.repo.loadLibrary().recordVersion,
    "save-source",
    "SAVE",
    "fixture-reviewer",
  );
  await assert.rejects(
    () =>
      h2.planner.prepare(
        data2.w.projectId,
        data2.s.recordVersion,
        data2.w.recordVersion,
      ),
    /source changed/,
  );
  h2.repo.close();
});
test("planner history/reload/seal/CAS retain immutable accepted plan and legacy hash paths", async () => {
  mkdirSync("temp/phase42-tests", { recursive: true });
  const path = join(mkdtempSync("temp/phase42-tests/run-"), "planner.sqlite"),
    h = harness(path),
    data = await accepted(h);
  assert.deepEqual(h.repo.loadPlanner(data.w.projectId), data.s);
  const tampered = structuredClone(data.s);
  tampered.plans[0]!.title = "rewrite";
  assert.throws(
    () => h.repo.savePlanner(tampered, data.s.recordVersion),
    /append-only|frozen sources/,
  );
  assert.throws(() => h.repo.savePlanner(data.s, 0), /reload/);
  h.repo.close();
  const reopened = new SqliteProjectRepository(path);
  assert.deepEqual(reopened.loadWorkflow(data.w.projectId), data.w);
  assert.deepEqual(reopened.loadPlanner(data.w.projectId), data.s);
  reopened.close();
  const db = new DatabaseSync(path);
  db.prepare("UPDATE story_planners SET digest=?").run("a".repeat(64));
  db.close();
  const reader = new SqliteProjectRepository(path);
  assert.throws(
    () => reader.loadPlanner(data.w.projectId),
    /original retained/,
  );
  reader.close();
});
test("K rejected review is exact/current, idempotent, and cannot fabricate approval", async () => {
  const h = harness(),
    data = await accepted(h);
  let w = await h.planner.import(
    data.w.projectId,
    data.pkg.packageId,
    JSON.stringify(response(data)),
    data.s.recordVersion,
    data.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  const f: PlanFeedback = {
    feedbackId: "reject",
    planRevisionId: data.pkg.plan.revisionId,
    requestRevisionId: w.current.requestRevisionId,
    draftId: w.current.draftId!,
    reportId: w.current.reportId!,
    approvalId: null,
    outcome: "REJECTED",
    reviewerAlias: "fixture-reviewer",
    notes: "Actual rejection of this synthetic reviewed draft",
    ratings: {},
    timestamp: "now",
    humanReviewAcknowledged: true,
  };
  const saved = h.planner.feedback(
    w.projectId,
    f,
    data.s.recordVersion,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  assert.deepEqual(h.planner.feedback(w.projectId, f, 0, 0, 0), saved);
  const stats = libraryStatisticsByRecord(h.repo.loadLibrary()).get(
    data.pkg.plan.provenance.sources[0]!.ref.recordId,
  )!;
  assert.equal(stats.rejectedCount, 1);
  assert.equal(stats.approvedCount, 0);
  assert.throws(
    () =>
      h.planner.feedback(
        w.projectId,
        { ...f, notes: "retry changed" },
        0,
        0,
        0,
      ),
    /retry differs/,
  );
  h.repo.close();
});
test("K EDITED requires a real earlier draft and current revised canonical approval", async () => {
  const h = harness(),
    data = await accepted(h);
  let w = await h.planner.import(
    data.w.projectId,
    data.pkg.packageId,
    JSON.stringify(response(data)),
    data.s.recordVersion,
    data.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  w = await h.workflow.approve(
    w.projectId,
    w.recordVersion,
    "fixture-reviewer",
    true,
  );
  const f: PlanFeedback = {
    feedbackId: "edited",
    planRevisionId: data.pkg.plan.revisionId,
    requestRevisionId: w.current.requestRevisionId,
    draftId: w.current.draftId!,
    reportId: w.current.reportId!,
    approvalId: w.current.approvalId,
    outcome: "EDITED",
    reviewerAlias: "fixture-reviewer",
    notes: "Actual revised synthetic review",
    ratings: {},
    timestamp: "now",
    humanReviewAcknowledged: true,
  };
  assert.throws(
    () =>
      h.planner.feedback(
        w.projectId,
        f,
        data.s.recordVersion,
        w.recordVersion,
        h.repo.loadLibrary().recordVersion,
      ),
    /earlier draft/,
  );
  const next = response(data);
  next.draft.draftId = "manual-draft-2";
  next.draft.editions.forEach((e) => (e.languageVersionId += "-revised"));
  w = await h.planner.import(
    w.projectId,
    data.pkg.packageId,
    JSON.stringify(next),
    data.s.recordVersion,
    w.recordVersion,
  );
  assert.equal(w.current.approvalId, null);
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  w = await h.workflow.approve(
    w.projectId,
    w.recordVersion,
    "fixture-reviewer",
    true,
  );
  const saved = h.planner.feedback(
    w.projectId,
    {
      ...f,
      draftId: w.current.draftId!,
      reportId: w.current.reportId!,
      approvalId: w.current.approvalId,
    },
    data.s.recordVersion,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  assert.equal(saved.feedback[0]!.outcome, "EDITED");
  h.repo.close();
});
test("changed plan invalidates approved derivatives; old packages and acceptance cannot be replayed", async () => {
  const h = harness(),
    data = await accepted(h);
  let w = await h.planner.import(
    data.w.projectId,
    data.pkg.packageId,
    JSON.stringify(response(data)),
    data.s.recordVersion,
    data.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  w = await h.workflow.approve(
    w.projectId,
    w.recordVersion,
    "fixture-reviewer",
    true,
  );
  const next = await h.planner.plan(
    { ...planning(), planningRevisionId: "planning-2", generation: 1 },
    data.s.recordVersion,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  const changed = h.workflow.load(w.projectId)!;
  assert.equal(changed.current.approvalId, null);
  assert.equal(changed.current.draftId, null);
  assert.equal(changed.approvals.length, 1);
  assert.equal(next.currentAcceptanceId, null);
  await assert.rejects(
    () =>
      h.planner.import(
        w.projectId,
        data.pkg.packageId,
        JSON.stringify(response(data)),
        next.recordVersion,
        changed.recordVersion,
      ),
    /no longer current/,
  );
  h.repo.close();
});
test("generic manual draft route cannot bypass planned hash/revision envelope", async () => {
  const h = harness(),
    data = await accepted(h);
  assert.throws(
    () =>
      h.workflow.importDraft(
        data.w.projectId,
        data.w.recordVersion,
        response(data).draft,
      ),
    /plan-response envelope/,
  );
  assert.equal(h.workflow.load(data.w.projectId)!.drafts.length, 0);
  h.repo.close();
});
test("source change prevents fresh QA/approval; actual family variant creation stays GENERATED", async () => {
  const h = harness(),
    data = await accepted(h);
  assert.equal(
    libraryStatisticsByRecord(h.repo.loadLibrary()).get(
      data.pkg.plan.provenance.selectedStoryFamilyId!,
    )!.variantsCreated,
    1,
  );
  const variant = latestLibraryRecords(h.repo.loadLibrary()).find(
    (r) => r.origin.transport === "planner-derived",
  )!;
  assert.equal(variant.status, "GENERATED");
  assert.equal(
    variant.family?.recordId,
    data.pkg.plan.provenance.selectedStoryFamilyId,
  );
  let w = await h.planner.import(
    data.w.projectId,
    data.pkg.packageId,
    JSON.stringify(response(data)),
    data.s.recordVersion,
    data.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  const source = data.pkg.plan.provenance.sources[0]!.ref;
  new StoryLibraryService(h.repo, h.seam).action(
    source.recordId,
    h.repo.loadLibrary().recordVersion,
    "change",
    "SAVE",
    "fixture-reviewer",
  );
  await assert.rejects(
    () =>
      h.workflow.approve(
        w.projectId,
        w.recordVersion,
        "fixture-reviewer",
        true,
      ),
    /source changed/,
  );
  h.repo.close();
});
test("storage extension cannot silently rebuild missing planner tables", async () => {
  mkdirSync("temp/phase42-tests", { recursive: true });
  const path = join(
      mkdtempSync("temp/phase42-tests/missing-"),
      "planner.sqlite",
    ),
    h = harness(path);
  await accepted(h);
  h.repo.close();
  const db = new DatabaseSync(path);
  db.exec("DROP TABLE story_planners; DROP TABLE story_planner_meta;");
  db.close();
  assert.throws(
    () => new SqliteProjectRepository(path),
    /Previously initialized/,
  );
});
test("L eight manual trial cases are reproducible, copy-ready and have no invented results", () => {
  const root = new URL(
      "../../examples/story-planner/manual-trials/",
      import.meta.url,
    ),
    before = readFileSync(new URL("manifest.json", root), "utf8"),
    manifest = JSON.parse(before);
  assert.equal(manifest.cases.length, 8);
  assert.equal(manifest.providerCalls, 0);
  assert.equal(manifest.operationalApprovals, 0);
  for (const c of manifest.cases) {
    const plan = StoryPlanSchema.parse(
      JSON.parse(readFileSync(new URL(`${c.id}/plan.json`, root), "utf8")),
    );
    assert.equal(
      validateStoryPlan(plan).findings.some((f) => f.severity === "high"),
      false,
    );
    const evalForm = JSON.parse(
      readFileSync(new URL(`${c.id}/evaluation.json`, root), "utf8"),
    );
    assert.equal(evalForm.overallPreference, null);
    assert.equal(evalForm.status, "NOT_RUN");
    for (const provider of ["chatgpt", "gemini"]) {
      const text = readFileSync(
        new URL(`${c.id}/${provider}-package.txt`, root),
        "utf8",
      );
      assert.ok(text.includes("UNREVIEWED SYNTHETIC TRIAL TEMPLATE"));
      assert.ok(text.includes(c.planHash));
    }
  }
  const generated = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/generate-story-planner-trials.ts"],
    { encoding: "utf8" },
  );
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(readFileSync(new URL("manifest.json", root), "utf8"), before);
});
test("accepted GENERATED planner variant survives creative recovery without planner/approval authority", async () => {
  const h = harness(),
    data = await accepted(h),
    bytes = createCreativeArchive(h.repo, true),
    restored = new SqliteProjectRepository(":memory:"),
    preview = previewCreativeRestore(restored, bytes);
  restoreCreativeArchive(
    restored,
    bytes,
    { digest: preview.digest, expectedVersion: 0, choices: {} },
    "now",
  );
  const lib = restored.loadLibrary(),
    variant = latestLibraryRecords(lib).find(
      (r) => r.recordId === data.w.current.conceptId,
    )!;
  assert.equal(variant.status, "GENERATED");
  assert.equal(variant.origin.transport, "human-authored");
  assert.equal(
    variant.family?.recordId,
    data.pkg.plan.provenance.selectedStoryFamilyId,
  );
  assert.equal(lib.usage.length, 0);
  assert.equal(restored.loadPlanner(data.w.projectId), null);
  assert.equal(restored.loadWorkflow(data.w.projectId), null);
  assert.ok(
    !Buffer.from(bytes)
      .toString("utf8")
      .includes(data.pkg.acceptance.acceptanceId),
  );
  restored.close();
  h.repo.close();
});
