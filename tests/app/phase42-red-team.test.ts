import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { countWords } from "@hekayti/contracts";
import {
  LibraryStateSchema,
  type LibraryRecord,
} from "@hekayti/contracts/library";
import {
  StoryPlanSchema,
  PlanningRequestSchema,
  type StoryPlan,
  type PlanningRequest,
  type PlanFeedback,
} from "@hekayti/contracts/planner";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { canonicalJson, contentHash } from "@hekayti/core";
import {
  composeStoryPlan,
  validateStoryPlan,
  StoryPlannerService,
  rankPlanningCandidates,
} from "@hekayti/core/planner";
import {
  StoryWorkflowService,
  manualBridgeProvenance,
} from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
import {
  StoryLibraryService,
  libraryStatisticsByRecord,
} from "@hekayti/core/library";
import { project } from "./fixtures";

// Independent adversarial assertions. Fixture prose is local synthetic test data,
// not a provider output or a literary/native-quality claim.
const root = new URL(
  "../../examples/story-planner/manual-trials/",
  import.meta.url,
);
const readJson = (path: string) =>
  JSON.parse(readFileSync(new URL(path, root), "utf8"));
const original = StoryPlanSchema.parse(
  readJson("07-preschool-eg-adventure/plan.json"),
);
const seeds = parseLibraryBatch(
  readFileSync(
    new URL(
      "../../examples/starter-library/starter-library.jsonl",
      import.meta.url,
    ),
    "utf8",
  ),
);
const high = (plan: StoryPlan, category?: string) =>
  validateStoryPlan(plan).findings.some(
    (f) => f.severity === "high" && (!category || f.category === category),
  );
function planning(): PlanningRequest {
  const p = structuredClone(original.planning);
  p.request.projectId = project().projectId;
  p.request.storyId = "qa-story";
  p.request.requestId = "qa-request";
  p.request.revisionId = "qa-request-r1";
  p.planningRevisionId = "qa-planning-r1";
  p.variation = "FreshConcept";
  p.generation = 0;
  p.selectedFamily = null;
  return p;
}
function state(records: LibraryRecord[]) {
  return LibraryStateSchema.parse({
    schemaVersion: "library-state/1.0",
    recordVersion: 0,
    records,
    events: records.map((r) => ({
      eventId: `qa-create-${r.recordId}`,
      recordId: r.recordId,
      version: r.version,
      action: "CREATE",
      reviewerAlias: "synthetic-test",
      timestamp: "now",
    })),
    usage: [],
  });
}
function harness(
  records = seeds.filter((r) => r.payload.type === "STORY_FAMILY"),
  path = ":memory:",
) {
  const repo = new SqliteProjectRepository(path);
  repo.createProject(project());
  let n = 0;
  const seam = {
    id: () => `independent-${++n}`,
    now: () => "2026-10-06T12:00:00Z",
  };
  const workflow = new StoryWorkflowService(
    repo,
    new MockStoryConceptProvider(),
    new MockStoryDraftProvider(),
    seam,
  );
  const planner = new StoryPlannerService(repo, workflow, seam);
  importLibraryBatch(repo, records, 0, "qa-fixture", "now");
  return { repo, seam, workflow, planner };
}
async function accepted(h: ReturnType<typeof harness>, input = planning()) {
  let w = h.workflow.create(input.request);
  const s = await h.planner.plan(
    input,
    0,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  w = h.workflow.load(w.projectId)!;
  const a = await h.planner.accept(
    w.projectId,
    s.recordVersion,
    w.recordVersion,
    "synthetic-test-human-action",
    true,
  );
  const prepared = await h.planner.prepare(
    w.projectId,
    a.planner.recordVersion,
    a.workflow.recordVersion,
  );
  return { w: a.workflow, s: prepared.planner, pkg: prepared.package };
}
function response(data: Awaited<ReturnType<typeof accepted>>) {
  const p = data.pkg.plan,
    b = data.w.blueprints.at(-1)!;
  const editions = b.languageVersions.map((e, i) => {
    const pages = e.pages.map((page) => {
      const narration =
        e.mode === "ar-EG"
          ? "نور شافت اللعبة. استنت دورها بالراحة."
          : "رأت نور اللعبة. انتظرت دورها بهدوء.";
      return {
        ...page,
        narration,
        dialogue: [] as Array<{ speakerId: string; text: string }>,
        wordCount: countWords(narration),
      };
    });
    return {
      ...e,
      languageVersionId: `qa-edition-${i}`,
      pages,
      totalWords: pages.reduce((n, p) => n + p.wordCount, 0),
      review:
        "Unverified synthetic local fixture; human native/semantic review required.",
    };
  });
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
    draft: {
      schemaVersion: "story-draft/1.0",
      draftId: "qa-draft-1",
      sourceRevision: b.revisionId,
      conceptId: data.pkg.conceptId,
      editions,
      provenance: manualBridgeProvenance,
      status: "draft",
    },
  };
}
async function approved(h: ReturnType<typeof harness>) {
  const d = await accepted(h);
  let w = await h.planner.import(
    d.w.projectId,
    d.pkg.packageId,
    JSON.stringify(response(d)),
    d.s.recordVersion,
    d.w.recordVersion,
  );
  w = await h.workflow.qa(w.projectId, w.recordVersion);
  w = await h.workflow.approve(
    w.projectId,
    w.recordVersion,
    "synthetic-test-human-action",
    true,
  );
  return { ...d, w };
}

test("QA-01 returning from an explicitly different location requires a transition", () => {
  const p = structuredClone(original);
  p.beats[1]!.locationId = "qa-second-place";
  p.beats[1]!.fromLocationId = p.beats[0]!.locationId;
  p.beats[2]!.locationId = p.setting.locationId;
  p.beats[2]!.fromLocationId = null;
  assert.ok(
    high(p, "location"),
    "The actor teleports back to the default setting without a declared transition.",
  );
});

test("QA-02 inciting/turn/climax anchors must have causal chronological meaning", () => {
  for (const key of [
    "incitingBeatId",
    "turningBeatId",
    "climaxBeatId",
  ] as const) {
    const p = structuredClone(original);
    p[key] = p.endingBeatId;
    assert.ok(
      high(p),
      `${key} points to the ending after resolution but no blocker was raised.`,
    );
  }
});

test("QA-03 original problem cannot first recur only after resolution", () => {
  const p = structuredClone(original);
  for (const beat of p.beats)
    if (beat.beatId !== p.resolutionBeatId) beat.addressesProblemId = null;
  p.beats.at(-1)!.addressesProblemId = p.problem!.problemId;
  assert.ok(
    high(p, "problem"),
    "Only the resolution and later ending address the problem; its entire pre-resolution chain disappears.",
  );
});

test("QA-04 CompletelyNew fallback exposes reuse through another real record in the same family/pattern", async () => {
  const family = seeds.find(
    (r) => r.recordId === "structure-pattern-981b90da",
  )!;
  const member = seeds.find((r) => r.recordId === "source-aesop-2")!;
  const lib = state([family, member]);
  const p = {
    ...planning(),
    variation: "CompletelyNew" as const,
    selectedFamily: { recordId: family.recordId, version: family.version },
  };
  const plan = await composeStoryPlan(p, lib, {
    planId: "qa-new",
    revisionId: "qa-new-r1",
  });
  assert.equal(
    plan.provenance.selectedPatternId,
    family.creative!.dna!.pattern!.patternId,
  );
  assert.equal(plan.provenance.selectedStoryFamilyId, family.recordId);
  assert.ok(
    plan.provenance.limitations.some((l) => /reuse|alternative/i.test(l)),
    "Same selected family is silently reused through its IDEA_SEED; VariationCompliance is incorrectly ACCEPTABLE.",
  );
  assert.equal(validateStoryPlan(plan).signals.VariationCompliance, "REVIEW");
});

test("QA-05 accepting a DNA family member updates its actual family variant count and usage", async () => {
  const family = seeds.find(
    (r) => r.recordId === "structure-pattern-981b90da",
  )!;
  const member = seeds.find((r) => r.recordId === "source-aesop-2")!;
  const h = harness([family, member]);
  try {
    const previousVariants = libraryStatisticsByRecord(
      h.repo.loadLibrary(),
    ).get(family.recordId)!.variantsCreated;
    const p = planning();
    p.generation = 1;
    const data = await accepted(h, p);
    assert.equal(
      data.pkg.plan.provenance.sources[0]!.ref.recordId,
      member.recordId,
    );
    assert.equal(
      data.pkg.plan.provenance.selectedStoryFamilyId,
      family.recordId,
    );
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
      "synthetic-test",
      true,
    );
    h.planner.feedback(
      w.projectId,
      {
        feedbackId: "qa-member-feedback",
        planRevisionId: data.pkg.plan.revisionId,
        requestRevisionId: w.current.requestRevisionId,
        draftId: w.current.draftId!,
        reportId: w.current.reportId!,
        approvalId: w.current.approvalId,
        outcome: "APPROVED",
        reviewerAlias: "synthetic-test",
        notes: "Local synthetic review action",
        ratings: {},
        timestamp: "now",
        humanReviewAcknowledged: true,
      },
      data.s.recordVersion,
      w.recordVersion,
      h.repo.loadLibrary().recordVersion,
    );
    const stats = libraryStatisticsByRecord(h.repo.loadLibrary()).get(
      family.recordId,
    )!;
    assert.deepEqual(
      stats,
      {
        variantsCreated: previousVariants + 1,
        timesUsed: 1,
        approvedCount: 1,
        rejectedCount: 0,
      },
      "Known family membership is lost when the retained source is its IDEA_SEED; real family usage/feedback counters remain zero.",
    );
  } finally {
    h.repo.close();
  }
});

test("QA-06 stale planner source cannot authorize fresh approved Library extraction", async () => {
  const h = harness();
  try {
    const data = await approved(h);
    const library = new StoryLibraryService(h.repo, h.seam);
    const ref = data.pkg.plan.provenance.sources[0]!.ref;
    library.action(
      ref.recordId,
      h.repo.loadLibrary().recordVersion,
      "qa-revise-source",
      "SCORE",
      "synthetic-test",
      {
        scores: { StoryQuality: 4 },
        editorialNote: "Synthetic source revision",
      },
    );
    const current = h.workflow.load(data.w.projectId)!;
    assert.throws(
      () => h.repo.validateCurrentPlannerSource(current),
      /changed/,
    );
    const before = h.repo.loadLibrary();
    assert.throws(
      () =>
        library.saveApproved(
          current,
          "APPROVED_STORY_REFERENCE",
          before.recordVersion,
          "qa-stale-extract",
          "synthetic-test",
        ),
      /stale|changed|current/i,
      "A planner approval that cannot pass current-source validation must not mint fresh approved reusable authority.",
    );
    assert.deepEqual(h.repo.loadLibrary(), before);
  } finally {
    h.repo.close();
  }
});

test("independent positive: ending/problem/setup/order/cast/disconnected/age attacks block", () => {
  const mutations: Array<(p: StoryPlan) => void> = [
    (p) => {
      p.beats.at(-1)!.causes = [p.beats[0]!.beatId];
    },
    (p) => {
      p.beats.find((b) => b.beatId === p.resolutionBeatId)!.addressesProblemId =
        "qa-unrelated";
    },
    (p) => {
      p.beats.find((b) => b.beatId === p.resolutionBeatId)!.requires = [
        "qa-unsetup",
      ];
    },
    (p) => {
      p.beats[1]!.causes = [p.endingBeatId];
    },
    (p) => {
      p.beats[1]!.actorId = "qa-unexplained";
    },
    (p) => {
      p.beats[1]!.causes = [];
    },
    (p) => {
      p.planning.request.ageMonths = 8;
      p.planning.request.primaryCategory = "bedtime";
    },
  ];
  for (const mutate of mutations) {
    const p = structuredClone(original);
    mutate(p);
    assert.ok(high(p));
  }
});

test("independent positive: all age boundaries change actual structural form", async () => {
  const lib = state(seeds.filter((r) => r.payload.type === "STORY_FAMILY"));
  const forms = new Map<number, string>();
  for (const age of [0, 11, 12, 23, 24, 35, 36, 59, 60, 95]) {
    const p = planning();
    p.request.ageMonths = age;
    p.request.primaryCategory = "bedtime";
    const plan = await composeStoryPlan(p, lib, {
      planId: `qa-age-${age}`,
      revisionId: `qa-age-${age}-r1`,
    });
    assert.equal(high(plan), false);
    forms.set(age, plan.guidance.narrativeForm);
  }
  for (const [before, after] of [
    [11, 12],
    [23, 24],
    [35, 36],
    [59, 60],
  ] as const)
    assert.notEqual(forms.get(before), forms.get(after));
});

test("independent positive: real culture boundaries remain explicit, even for selected families", async () => {
  const lib = state(seeds);
  const p = planning();
  const guarded = seeds.filter(
    (r) =>
      r.payload.type === "STORY_FAMILY" &&
      (r.creative?.culture.fit === "NOT_DEFAULT" ||
        r.creative?.culture.fit === "SENSITIVE_REVIEW" ||
        r.creative?.culture.religiousReview ===
          "RELIGIOUS_ACCURACY_REVIEW_REQUIRED"),
  );
  assert.ok(guarded.length);
  for (const family of guarded) {
    await assert.rejects(
      () =>
        composeStoryPlan(
          {
            ...p,
            variation: "SimilarVersion",
            selectedFamily: {
              recordId: family.recordId,
              version: family.version,
            },
            sensitiveOptIn: false,
            religiousOptIn: false,
          },
          lib,
          { planId: "qa-cultural", revisionId: "qa-cultural-r1" },
        ),
      /consent|inspiration|cultural/,
    );
  }
  assert.ok(
    rankPlanningCandidates({ ...p, inspirationReviewed: false }, lib).every(
      (r) => r.record.status === "PROMOTED_TO_LIBRARY",
    ),
  );
});

test("independent positive: side-path draft import and declared envelope drift cannot mutate canonical state", async () => {
  const h = harness();
  try {
    const data = await accepted(h),
      out = response(data);
    const before = h.workflow.load(data.w.projectId)!;
    assert.throws(
      () =>
        h.workflow.importDraft(
          before.projectId,
          before.recordVersion,
          out.draft,
        ),
      /envelope|plan-response/,
    );
    const mutations: Array<(r: typeof out) => void> = [
      (r) => {
        r.planHash = "f".repeat(64);
      },
      (r) => {
        r.objective = "unrelated";
      },
      (r) => {
        r.majorBeatIds.reverse();
      },
      (r) => {
        r.resolutionBeatId = "unrelated";
      },
      (r) => {
        r.draft.editions[0]!.pages[0]!.dialogue = [
          { speakerId: "undeclared", text: "مرحبًا" },
        ];
      },
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(out);
      mutate(changed);
      await assert.rejects(() =>
        h.planner.import(
          before.projectId,
          data.pkg.packageId,
          JSON.stringify(changed),
          data.s.recordVersion,
          before.recordVersion,
        ),
      );
      assert.deepEqual(h.workflow.load(before.projectId), before);
    }
  } finally {
    h.repo.close();
  }
});

test("independent positive: real feedback is idempotent and a historical approval cannot justify a new outcome", async () => {
  const h = harness();
  try {
    const data = await approved(h),
      w = data.w;
    const f: PlanFeedback = {
      feedbackId: "qa-feedback-once",
      planRevisionId: data.pkg.plan.revisionId,
      requestRevisionId: w.current.requestRevisionId,
      draftId: w.current.draftId!,
      reportId: w.current.reportId!,
      approvalId: w.current.approvalId,
      outcome: "APPROVED",
      reviewerAlias: "synthetic-test",
      notes: "Local synthetic current review action",
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
    const library = h.repo.loadLibrary();
    assert.deepEqual(h.planner.feedback(w.projectId, f, 0, 0, 0), saved);
    assert.deepEqual(h.repo.loadLibrary(), library);
    const revised = response(data);
    revised.draft.draftId = "qa-draft-2";
    for (const edition of revised.draft.editions)
      edition.languageVersionId += "-2";
    let next = await h.planner.import(
      w.projectId,
      data.pkg.packageId,
      JSON.stringify(revised),
      saved.recordVersion,
      w.recordVersion,
    );
    next = await h.workflow.qa(next.projectId, next.recordVersion);
    assert.throws(
      () =>
        h.planner.feedback(
          next.projectId,
          { ...f, feedbackId: "qa-historical-forgery" },
          saved.recordVersion,
          next.recordVersion,
          library.recordVersion,
        ),
      /current canonical draft/,
    );
    assert.deepEqual(h.repo.loadLibrary(), library);
    assert.equal(h.planner.load(w.projectId).feedback.length, 1);
  } finally {
    h.repo.close();
  }
});

test("independent positive: transaction failure after canonical build rolls back all three stores", async () => {
  const h = harness();
  try {
    const p = planning(),
      w = h.workflow.create(p.request);
    const s = await h.planner.plan(
      p,
      0,
      w.recordVersion,
      h.repo.loadLibrary().recordVersion,
    );
    const beforeWorkflow = h.workflow.load(w.projectId),
      beforePlanner = h.planner.load(w.projectId),
      beforeLibrary = h.repo.loadLibrary();
    const save = h.repo.saveLibrary.bind(h.repo);
    h.repo.saveLibrary = () => {
      throw new Error("qa-injected-library-write-failure");
    };
    try {
      await assert.rejects(
        () =>
          h.planner.accept(
            w.projectId,
            s.recordVersion,
            beforeWorkflow!.recordVersion,
            "synthetic-test",
            true,
          ),
        /qa-injected/,
      );
    } finally {
      h.repo.saveLibrary = save;
    }
    assert.deepEqual(h.workflow.load(w.projectId), beforeWorkflow);
    assert.deepEqual(h.planner.load(w.projectId), beforePlanner);
    assert.deepEqual(h.repo.loadLibrary(), beforeLibrary);
  } finally {
    h.repo.close();
  }
});

test("independent positive: accepted plan mutation and re-sealed frozen package corruption are rejected", async () => {
  mkdirSync("temp/phase42-independent-qa", { recursive: true });
  const dbPath = join(
    mkdtempSync("temp/phase42-independent-qa/run-"),
    "synthetic.sqlite",
  );
  const h = harness(undefined, dbPath);
  const data = await accepted(h);
  const modified = structuredClone(data.s);
  modified.plans[0]!.beats[1]!.summary = "qa-rewrite";
  assert.throws(
    () => h.repo.savePlanner(modified, data.s.recordVersion),
    /append-only|frozen/,
  );
  h.repo.close();
  const reopened = new SqliteProjectRepository(dbPath);
  assert.deepEqual(reopened.loadPlanner(data.w.projectId), data.s);
  reopened.close();
  const corrupt = structuredClone(data.s);
  corrupt.packages[0]!.plan.title = "qa-corrupt-frozen-copy";
  const db = new DatabaseSync(dbPath);
  db.prepare(
    "UPDATE story_planners SET payload=?,digest=? WHERE project_id=?",
  ).run(canonicalJson(corrupt), await contentHash(corrupt), data.w.projectId);
  db.close();
  const reader = new SqliteProjectRepository(dbPath);
  try {
    assert.throws(
      () => reader.loadPlanner(data.w.projectId),
      /original retained/,
    );
  } finally {
    reader.close();
  }
});

test("independent positive: eight local manual kits are usable, hash-bound and honestly unreviewed", async () => {
  const manifest = readJson("manifest.json");
  assert.equal(manifest.cases.length, 8);
  assert.equal(manifest.providerCalls, 0);
  assert.equal(manifest.operationalApprovals, 0);
  assert.equal(manifest.operationalAcceptances, 0);
  for (const item of manifest.cases) {
    const plan = StoryPlanSchema.parse(readJson(`${item.id}/plan.json`));
    const request = PlanningRequestSchema.parse(
      readJson(`${item.id}/request.json`),
    );
    assert.equal(await contentHash(plan), item.planHash);
    assert.equal(await contentHash(request), item.requestHash);
    assert.deepEqual(plan.planning, request);
    assert.equal(high(plan), false);
    const blueprint = readJson(`${item.id}/blueprint.json`);
    for (const provider of ["chatgpt", "gemini"]) {
      const text = readFileSync(
        new URL(`${item.id}/${provider}-package.txt`, root),
        "utf8",
      );
      assert.ok(
        text.includes(item.planHash) &&
          text.includes(blueprint.revisionId) &&
          text.includes("FULL SHARED RESPONSE SCHEMA"),
      );
      for (const page of blueprint.pagePlan)
        assert.ok(text.includes(page.pageId));
    }
    const evaluation = readJson(`${item.id}/evaluation.json`);
    assert.equal(evaluation.status, "NOT_RUN");
    assert.equal(evaluation.overallPreference, null);
    assert.equal(evaluation.humanReviewer, null);
    for (const result of evaluation.results)
      assert.equal(result.responseFile, null);
  }
  assert.match(
    readFileSync(new URL("README.md", root), "utf8"),
    /Static trial package IDs cannot replay authority/,
  );
});
