import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  countWords,
  type StoryRequest,
  type StoryConceptProvider,
  type StoryDraftProvider,
} from "@hekayti/contracts";
import {
  StoryRequestSchema,
  TrustedFactSchema,
} from "@hekayti/contracts/story";
import {
  createConceptSet,
  evaluateConcepts,
  buildStoryBlueprint,
  reviewStoryBlueprint,
  MockStoryConceptProvider,
} from "@hekayti/core/story";
import { storyStructureFor, reviewStoryAge } from "@hekayti/core/age";
import {
  createStoryDraft,
  reviewStoryLanguage,
  MockStoryDraftProvider,
} from "@hekayti/core/language";
import {
  StoryWorkflowService,
  WorkflowSnapshotSchema,
  workflowApprovalStatus,
} from "@hekayti/core/workflow";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { project } from "./fixtures";

function request(ageMonths = 42): StoryRequest {
  return {
    schemaVersion: "story-request/1.0",
    requestId: "red-request",
    revisionId: "red-request-r1",
    projectId: "demo-product-design",
    storyId: "red-story",
    ageMonths,
    languageModes: ["ar-MSA-simple", "ar-EG"],
    primaryLanguageMode: "ar-MSA-simple",
    primaryCategory: "everyday-life",
    objective: {
      kind: "connection",
      description: "Warm supported exploration",
      successScenario: "Notice and reconnect",
    },
    theme: "Familiar garden",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "synthetic-red",
      level: 0,
      preferences: [],
      heroMode: "none",
    },
    sourceStrategy: "ai",
    trustedFacts: [],
    outputIntents: ["print", "digital"],
  };
}
function composition(age = 42) {
  const r = request(age),
    p = storyStructureFor(r),
    set = createConceptSet(r, p),
    c = set.concepts[0]!,
    b = buildStoryBlueprint(r, p, c, "red-blueprint");
  return { r, p, set, c, b, d: createStoryDraft(r, c, b, "red-draft") };
}
function harness(
  concepts: StoryConceptProvider = new MockStoryConceptProvider(),
  drafts: StoryDraftProvider = new MockStoryDraftProvider(),
  path = ":memory:",
) {
  const repo = new SqliteProjectRepository(path);
  repo.createProject(project());
  let n = 0;
  return {
    repo,
    service: new StoryWorkflowService(repo, concepts, drafts, {
      id: () => `red-${++n}`,
      now: () => "2026-10-06T00:00:00Z",
    }),
  };
}
async function ready(service: StoryWorkflowService, r = request()) {
  let s = service.create(r);
  s = await service.createMore(s.projectId, s.recordVersion);
  s = service.select(
    s.projectId,
    s.recordVersion,
    s.conceptSets[0]!.concepts[0]!.conceptId,
  );
  s = service.build(s.projectId, s.recordVersion);
  s = await service.draft(s.projectId, s.recordVersion);
  return service.qa(s.projectId, s.recordVersion);
}
const blocked = (f: { severity: string }[]) =>
  f.some((x) => x.severity === "high" || x.severity === "blocker");
function dbPath() {
  mkdirSync("temp/red-team", { recursive: true });
  return join(mkdtempSync("temp/red-team/run-"), "red.sqlite");
}

test("red team: age boundaries and infant plot leakage", () => {
  for (const age of [0, 11, 12, 23, 24, 35, 36, 59, 60, 95]) {
    const { r, c, b, d } = composition(age);
    assert.equal(
      blocked(reviewStoryAge(r, c, { ...b, languageVersions: d.editions })),
      false,
    );
  }
  const { r, c } = composition(8);
  c.outline[0]!.action = "solve";
  assert.ok(blocked(reviewStoryAge(r, c)));
  for (const age of [8, 18])
    assert.throws(() =>
      storyStructureFor({ ...request(age), primaryCategory: "adventure" }),
    );
  assert.throws(() =>
    storyStructureFor({ ...request(8), outputIntents: ["video"] }),
  );
  assert.equal(StoryRequestSchema.safeParse(request(96)).success, false);
});

test("red team: renamed concepts retain duplicate causal fingerprint", () => {
  const { r, p, set } = composition();
  const duplicate = structuredClone(set.concepts[0]!);
  duplicate.conceptId = "renamed";
  duplicate.title = "A brand new title";
  const oldObject = duplicate.outline[0]!.focus.en;
  duplicate.coreChallenge = duplicate.coreChallenge.replaceAll(
    oldObject,
    "a ribbon",
  );
  duplicate.resolutionDirection = duplicate.resolutionDirection.replaceAll(
    oldObject,
    "a ribbon",
  );
  for (const beat of duplicate.outline) {
    beat.focus = {
      "ar-MSA-simple": "الشريط",
      "ar-EG": "الشريط",
      en: "a ribbon",
    };
    beat.beforeState = beat.beforeState.replaceAll(oldObject, "a ribbon");
    beat.afterState = beat.afterState.replaceAll(oldObject, "a ribbon");
    beat.visibleFacts = beat.visibleFacts.map((x) =>
      x.replaceAll(oldObject, "a ribbon"),
    );
  }
  set.concepts[1] = duplicate;
  assert.ok(
    evaluateConcepts(r, p, set)[1]!.findings.some(
      (x) => x.category === "diversity" && x.severity === "high",
    ),
  );
});

test("red team: arbitrary objective and unsupported preferences remain explicit advisories", () => {
  const r = request();
  r.objective = {
    kind: "educational",
    description: "Explain orbital mechanics",
    successScenario: "Calculate escape velocity",
  };
  r.personalization = {
    ...r.personalization,
    level: 2,
    displayName: "ليلى",
    preferences: ["synthetic telescope"],
  };
  const p = storyStructureFor(r),
    set = createConceptSet(r, p),
    findings = evaluateConcepts(r, p, set).flatMap((x) => x.findings);
  assert.ok(
    findings.some((x) => x.category === "objective" && x.severity === "medium"),
  );
  assert.ok(findings.some((x) => x.category === "personalization"));
  assert.equal(
    StoryRequestSchema.safeParse({
      ...r,
      personalization: { ...r.personalization, origin: "private", level: 4 },
    }).success,
    false,
  );
  assert.equal(
    TrustedFactSchema.safeParse({
      factId: "f",
      statement: "Synthetic claim",
      sourceReference: "fixture",
      reviewStatus: "human-reviewed",
      reviewerAlias: null,
    }).success,
    false,
  );
});

test("red team: unknown facts and visible state/character mutations block QA", () => {
  const { r, c, b } = composition();
  c.outline[0]!.factIds = ["forged"];
  assert.ok(blocked(reviewStoryBlueprint(r, c, b)));
  const other = composition();
  other.b.meaningBeats[1]!.beforeState = "contradictory state";
  assert.ok(blocked(reviewStoryBlueprint(other.r, other.c, other.b)));
  other.c.outline[0]!.actorId = "foreign-actor";
  assert.ok(blocked(reviewStoryAge(other.r, other.c)));
});

for (const attack of [
  "pages",
  "quantity",
  "actor",
  "bidi",
  "count",
  "source",
] as const) {
  test(`red team: language ${attack} fails blocking review`, () => {
    const { r, c, b, d } = composition();
    const e = d.editions[0]!,
      page = e.pages[0]!;
    if (attack === "pages") e.pages.reverse();
    if (attack === "quantity") page.narration = "أربع أشياء جديدة.";
    if (attack === "actor")
      page.narration = page.narration.replaceAll(
        c.characters[0]!.displayName,
        "شخص آخر",
      );
    if (attack === "bidi") page.narration += "\u202Ehidden\u202C";
    if (attack === "count") page.wordCount += 100;
    if (attack === "source") e.sourceRevision = "foreign";
    assert.ok(blocked(reviewStoryLanguage(r, c, b, d.editions)));
  });
}

test("red team: complete lexical preservation cannot certify factual/event equivalence", () => {
  const { r, c, b, d } = composition();
  const e = d.editions[0]!,
    page = e.pages[0]!;
  page.narration += " الشمس تدور حول الأرض. ضاع الشيء للأبد.";
  page.wordCount = countWords(page.narration);
  e.totalWords = e.pages.reduce((n, x) => n + x.wordCount, 0);
  const findings = reviewStoryLanguage(r, c, b, d.editions);
  assert.ok(
    findings.some(
      (x) =>
        x.category === "language-semantic-review" && x.severity === "medium",
    ),
  );
  // Accepted advisory design limitation; this is evidence, not a quality certificate.
  assert.equal(blocked(findings), false);
});

test("red team: empty/foreign/stale selection and rejected async provider preserve history", async () => {
  const base = new MockStoryConceptProvider();
  let reject = false;
  const provider: StoryConceptProvider = {
    provenance: base.provenance,
    async createConcepts(r, p, g) {
      if (reject) throw new Error("synthetic offline");
      return base.createConcepts(r, p, g);
    },
  };
  const { repo, service } = harness(provider);
  let s = service.create(request());
  for (const id of ["", "foreign"])
    assert.throws(() => service.select(s.projectId, s.recordVersion, id));
  s = await service.createMore(s.projectId, s.recordVersion);
  const old = s.conceptSets[0]!.concepts[0]!.conceptId;
  s = await service.createMore(s.projectId, s.recordVersion);
  assert.throws(() => service.select(s.projectId, s.recordVersion, old));
  reject = true;
  await assert.rejects(
    () => service.createMore(s.projectId, s.recordVersion),
    /offline/,
  );
  assert.deepEqual(repo.loadWorkflow(s.projectId), s);
  repo.close();
});

test("red team: competing async saves accept one result and discard the stale result", async () => {
  const base = new MockStoryConceptProvider();
  const releases: (() => void)[] = [];
  const provider: StoryConceptProvider = {
    provenance: base.provenance,
    createConcepts(r, p, g) {
      return new Promise((resolve) =>
        releases.push(() => resolve(base.createConcepts(r, p, g))),
      );
    },
  };
  const { repo, service } = harness(provider);
  const s = service.create(request());
  const first = service.createMore(s.projectId, 0),
    second = service.createMore(s.projectId, 0);
  releases[0]!();
  const winner = await first;
  releases[1]!();
  await assert.rejects(() => second, /reload/);
  assert.deepEqual(repo.loadWorkflow(s.projectId), winner);
  repo.close();
});

test("red team: approval invalidation, immutable request history and malformed versions", async () => {
  const { repo, service } = harness();
  let s = await ready(service);
  s = await service.approve(
    s.projectId,
    s.recordVersion,
    "synthetic-reviewer",
    true,
  );
  const old = structuredClone(s);
  s = service.reviseRequest(s.projectId, s.recordVersion, {
    ...request(),
    revisionId: "red-r2",
    theme: "Changed synthetic theme",
  });
  assert.equal(workflowApprovalStatus(s), "stale");
  assert.deepEqual(s.approvals, old.approvals);
  assert.throws(() =>
    repo.saveWorkflow({ ...s, current: old.current }, s.recordVersion),
  );
  const rewritten = structuredClone(s);
  rewritten.requests[0]!.theme = "erased";
  assert.throws(
    () => repo.saveWorkflow(rewritten, s.recordVersion),
    /retained/,
  );
  assert.equal(
    WorkflowSnapshotSchema.safeParse({ ...s, schemaVersion: "workflow/99" })
      .success,
    false,
  );
  repo.close();
});

test("RT-001: historical approval must bind its report's exact draft", async () => {
  const { repo, service } = harness();
  let s = await ready(service);
  const firstReport = s.reports[0]!;
  s = await service.draft(s.projectId, s.recordVersion);
  s = await service.qa(s.projectId, s.recordVersion);
  s = await service.approve(
    s.projectId,
    s.recordVersion,
    "synthetic-reviewer",
    true,
  );
  const forged = structuredClone(s),
    record = structuredClone(s.approvals[0]!);
  record.approval.approvalId = "crosslinked-approval";
  record.reportId = firstReport.reportId;
  record.approval.hash = firstReport.contentHash;
  forged.approvals.push(record);
  forged.current.approvalId = null;
  try {
    assert.throws(
      () => repo.saveWorkflow(forged, s.recordVersion),
      "Wrong-draft historical approval must be rejected",
    );
  } finally {
    repo.close();
  }
});

test("RT-002: missing canonical character rows must be detected on workflow reopen", async () => {
  const path = dbPath();
  const { repo, service } = harness(undefined, undefined, path);
  const s = await ready(service);
  const character = s.blueprints[0]!.characterBibles[0]!;
  assert.ok(
    repo.loadCharacter(
      s.projectId,
      character.characterId,
      character.bibleVersion,
    ),
  );
  repo.close();
  const db = new DatabaseSync(path);
  db.prepare(
    "DELETE FROM characters WHERE project_id=? AND id=? AND version=?",
  ).run(s.projectId, character.characterId, character.bibleVersion);
  db.close();
  const reader = new SqliteProjectRepository(path);
  try {
    assert.equal(
      reader.loadCharacter(
        s.projectId,
        character.characterId,
        character.bibleVersion,
      ),
      null,
    );
    assert.throws(() => reader.loadWorkflow(s.projectId), /retained/);
  } finally {
    reader.close();
  }
});

test("red team: report hash tampering is rejected without replacing original payload", async () => {
  const { repo, service } = harness();
  const s = await ready(service),
    forged = structuredClone(s);
  const report = structuredClone(forged.reports[0]!);
  report.reportId = "tampered-report";
  report.contentHash = "0".repeat(64);
  forged.reports.push(report);
  forged.reportLinks.push({
    ...forged.reportLinks[0]!,
    reportId: report.reportId,
  });
  assert.throws(() => repo.saveWorkflow(forged, s.recordVersion), /hash/);
  assert.deepEqual(repo.loadWorkflow(s.projectId), s);
  repo.close();
});

test("red team: forged objective provider and invalid async draft results are discarded", async () => {
  const base = new MockStoryConceptProvider();
  const concepts: StoryConceptProvider = {
    provenance: base.provenance,
    async createConcepts(r, p, g) {
      const set = await base.createConcepts(r, p, g);
      set.concepts[0]!.objective.description = "Provider replacement";
      return set;
    },
  };
  const first = harness(concepts),
    initial = first.service.create(request());
  await assert.rejects(() => first.service.createMore(initial.projectId, 0));
  assert.deepEqual(first.repo.loadWorkflow(initial.projectId), initial);
  first.repo.close();
  const draftBase = new MockStoryDraftProvider();
  let invalid = false;
  const drafts: StoryDraftProvider = {
    provenance: draftBase.provenance,
    async createDraft(r, c, b, id) {
      const d = await draftBase.createDraft(r, c, b, id);
      if (invalid) d.editions[0]!.pages.reverse();
      return d;
    },
  };
  const second = harness(undefined, drafts),
    s = await ready(second.service);
  invalid = true;
  await assert.rejects(() =>
    second.service.draft(s.projectId, s.recordVersion),
  );
  assert.deepEqual(second.repo.loadWorkflow(s.projectId), s);
  second.repo.close();
});

test("red team: future database is preserved and invalid legacy migration rolls back", () => {
  const path = dbPath(),
    db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE sentinel(value TEXT); INSERT INTO sentinel VALUES('retained'); PRAGMA user_version=99",
  );
  db.close();
  assert.throws(() => new SqliteProjectRepository(path), /newer/);
  const check = new DatabaseSync(path);
  assert.equal(
    check.prepare("SELECT value FROM sentinel").get()!.value,
    "retained",
  );
  check.close();
  const legacy = dbPath(),
    old = new DatabaseSync(legacy);
  old.exec(
    "CREATE TABLE projects(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER); CREATE TABLE blueprints(payload TEXT); CREATE TABLE editions(payload TEXT); CREATE TABLE characters(payload TEXT); INSERT INTO blueprints VALUES('{}'); PRAGMA user_version=1",
  );
  old.close();
  assert.throws(() => new SqliteProjectRepository(legacy));
  const retained = new DatabaseSync(legacy);
  assert.equal(retained.prepare("PRAGMA user_version").get()!.user_version, 1);
  assert.equal(
    retained
      .prepare(
        "SELECT COUNT(*) n FROM sqlite_master WHERE name='story_workflows'",
      )
      .get()!.n,
    0,
  );
  retained.close();
});
