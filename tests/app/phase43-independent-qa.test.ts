import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalJson } from "@hekayti/core";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { StoryPlannerService } from "@hekayti/core/planner";
import { SimpleCreatorService, presentPlan } from "@hekayti/core/creator";
import { IllustrationService } from "@hekayti/core/illustration";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { importLibraryBatch, parseLibraryBatch } from "@hekayti/core/creative";
const records = parseLibraryBatch(
  readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
);
function harness() {
  const repo = new SqliteProjectRepository(":memory:");
  let n = 0;
  const seam = { id: () => `qa43-${++n}`, now: () => "2026-10-06T18:00:00Z" };
  const workflow = new StoryWorkflowService(
    repo,
    new MockStoryConceptProvider(),
    new MockStoryDraftProvider(),
    seam,
  );
  const planner = new StoryPlannerService(
    repo,
    workflow,
    seam,
    "planner-quality/1.1",
  );
  const creator = new SimpleCreatorService(repo, workflow, planner, seam);
  const illustration = new IllustrationService(repo, workflow, planner, seam);
  importLibraryBatch(repo, records, 0, "synthetic-independent", "now");
  return { repo, seam, workflow, planner, creator, illustration };
}
const owner = {
  agePreset: "THREE_FIVE" as const,
  exactAgeMonths: 42,
  primaryLanguageMode: "ar-EG" as const,
  bothArabicEditions: true,
  category: "adventure" as const,
  goalPreset: "CUSTOM" as const,
  customGoal: "يتعلم الطفل يستنى دوره ويلعب مع صاحبه.",
  setting: "ملعب صغير في الحي جنب البيت",
  constraints: "عايز القصة خفيفة ومضحكة، من غير خوف، وتحصل في مكان مصري طبيعي.",
  provisionalAcknowledged: true,
};
async function prepared() {
  const h = harness();
  let s = await h.creator.create({
    ...owner,
    expectedLibrary: h.repo.loadLibrary().recordVersion,
  });
  s = await h.creator.command({
    action: "ACCEPT",
    projectId: s.workflow.projectId,
    expectedPlanner: s.planner.recordVersion,
    expectedWorkflow: s.workflow.recordVersion,
    reviewerAlias: "synthetic-reviewer",
    advisoryAcknowledged: true,
  });
  s = await h.creator.command({
    action: "PREPARE",
    projectId: s.workflow.projectId,
    expectedPlanner: s.planner.recordVersion,
    expectedWorkflow: s.workflow.recordVersion,
  });
  return { ...h, s };
}
function raw(h: Awaited<ReturnType<typeof prepared>>) {
  const bp = h.s.workflow.blueprints.find(
    (b) => b.revisionId === h.s.package!.blueprintRevisionId,
  )!;
  return JSON.stringify({
    schemaVersion: "writer-response/1.0",
    editions: h.s.package!.plan.planning.request.languageModes.map((mode) => ({
      mode,
      pages: bp.pagePlan.map((_, i) => ({
        pageNumber: i + 1,
        narration: "نور سلمت الكرة لسلمى، وسلمى أخذت دورها وأعادت الكرة لنور.",
        dialogue: [],
        altText: "تبادل الكرة.",
      })),
    })),
  });
}
function importCommand(h: Awaited<ReturnType<typeof prepared>>) {
  return {
    action: "IMPORT" as const,
    projectId: h.s.workflow.projectId,
    packageId: h.s.package!.packageId,
    expectedPlanner: h.s.planner.recordVersion,
    expectedWorkflow: h.s.workflow.recordVersion,
    json: raw(h),
    providerLabel: "GEMINI" as const,
  };
}
test("P43 independent: atomic draft/provider-note/QA rollback at either hook failure", async (t) => {
  for (const boundary of ["annotation", "qa"] as const)
    await t.test(boundary, async () => {
      const h = await prepared(),
        id = h.s.workflow.projectId;
      const snapshot = () =>
        canonicalJson({
          workflow: h.repo.loadWorkflow(id),
          planner: h.repo.loadPlanner(id),
          creator: h.repo.loadCreator(id),
          library: h.repo.loadLibrary(),
        });
      const before = snapshot();
      if (boundary === "annotation")
        h.repo.saveCreator = () => {
          throw Error("Synthetic annotation fault");
        };
      else
        h.workflow.recordPreparedQa = () => {
          throw Error("Synthetic QA commit fault");
        };
      await assert.rejects(h.creator.command(importCommand(h)), /Synthetic/);
      assert.equal(snapshot(), before);
      h.repo.close();
    });
});
test("P43 independent: explicit custom Arabic denial cannot synthesize positive sharing success", async () => {
  const h = harness();
  try {
    const s = await h.creator.create({
      ...owner,
      customGoal: "لا يشارك الطفل اللعبة ولا ينتظر دوره مع صاحبه.",
      expectedLibrary: h.repo.loadLibrary().recordVersion,
    });
    const p = s.planner.plans[0]!;
    assert.ok(p.schemaVersion !== "story-plan/1.0");
    assert.ok(
      p.quality.objectiveIntent.primaryIntent !== "SHARING_TURN_TAKING" ||
        p.quality.objectiveIntent.limited ||
        !s.presentation.supported,
      "A denied custom operation must remain uncertain, not become a confident reciprocal-sharing plan from invented success text",
    );
  } finally {
    h.repo.close();
  }
});
test("P43 independent: simplified MSA projects controlled actions independently of Egyptian morphology", async () => {
  const h = harness();
  try {
    const s = await h.creator.create({
      ...owner,
      expectedLibrary: h.repo.loadLibrary().recordVersion,
    });
    const msa = presentPlan(s.planner.plans[0]!, "ar-MSA-simple");
    assert.equal(msa.supported, true);
    assert.doesNotMatch(
      msa.events.map((e) => e.action).join(" ") +
        " " +
        msa.goal +
        " " +
        msa.resolution,
      /بيدحرج|ياخد|يحددوا|يتفقوا|يوصلوا|عشان|يشاوروا|ماكملش/,
      "Controlled MSA presentation must not certify unconverted Egyptian action forms as its MSA edition",
    );
  } finally {
    h.repo.close();
  }
});
test("P43 independent: all exposed goals work with representative alternate exposed categories", async (t) => {
  const h = harness();
  try {
    for (const [goalPreset, category] of [
      ["COLORS", "bedtime"],
      ["SLEEP", "adventure"],
      ["HELPING", "educational"],
      ["NUMBERS", "values"],
      ["FEELINGS", "everyday-life"],
    ] as const)
      await t.test(`${goalPreset}/${category}`, async () => {
        const s = await h.creator.create({
          goalPreset,
          category,
          primaryLanguageMode: "ar-EG",
          expectedLibrary: h.repo.loadLibrary().recordVersion,
          provisionalAcknowledged: true,
        });
        assert.equal(
          s.presentation.supported,
          true,
          "Simple exposes this goal/category combination without unsupported-language guidance before creation",
        );
      });
  } finally {
    h.repo.close();
  }
});
test("P43 independent: new accepted cast must not reuse a previous story visual bible as current", async () => {
  const h = await prepared(),
    id = h.s.workflow.projectId;
  try {
    let s = await h.creator.command(importCommand(h));
    const old = await h.illustration.command({
      action: "PREPARE",
      projectId: id,
      mode: "ar-EG",
      expectedCreator: s.creatorVersion,
      expectedPlanner: s.planner.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
    });
    const planning = structuredClone(s.planner.plans.at(-1)!.planning);
    planning.planningRevisionId = h.seam.id();
    planning.selectedCharacter = {
      ...s.planner.plans.at(-1)!.characters[0]!,
      characterId: h.seam.id(),
      bibleVersion: h.seam.id(),
      displayName: "ياسين",
    };
    const planned = await h.planner.plan(
      planning,
      s.planner.recordVersion,
      s.workflow.recordVersion,
      h.repo.loadLibrary().recordVersion,
    );
    s = h.creator.load(id);
    s = await h.creator.command({
      action: "ACCEPT",
      projectId: id,
      expectedPlanner: planned.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
      reviewerAlias: "synthetic-reviewer",
      advisoryAcknowledged: true,
    });
    s = await h.creator.command({
      action: "PREPARE",
      projectId: id,
      expectedPlanner: s.planner.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
    });
    h.s = s;
    s = await h.creator.command(importCommand(h));
    const current = await h.illustration.command({
      action: "PREPARE",
      projectId: id,
      mode: "ar-EG",
      expectedCreator: s.creatorVersion,
      expectedPlanner: s.planner.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
    });
    assert.equal(current.stale, false);
    assert.deepEqual(
      current.plan!.bible.characters.map((c) => c.characterId).sort(),
      s.planner.plans
        .at(-1)!
        .characters.map((c) => c.characterId)
        .sort(),
      "A current illustration plan must define its actual accepted cast",
    );
    assert.notEqual(current.plan!.bible.revisionId, old.plan!.bible.revisionId);
    assert.equal(
      canonicalJson(
        h.repo.loadCreator(id).plans.find((p) => p.planId === old.plan!.planId),
      ),
      canonicalJson(old.plan),
      "Cast reconciliation must retain the previous plan without rewriting its bible",
    );
  } finally {
    h.repo.close();
  }
});

test("P43 independent closure: positive owner intent, same-cast reuse, honest prose and exact edition", async () => {
  const h = await prepared(),
    id = h.s.workflow.projectId;
  try {
    const ownerPlan = h.s.planner.plans.at(-1)!;
    assert.ok(ownerPlan.schemaVersion !== "story-plan/1.0");
    const intent = ownerPlan.quality.objectiveIntent;
    assert.equal(intent.primaryIntent, "SHARING_TURN_TAKING");
    assert.equal(intent.limited, false);
    const s = await h.creator.command(importCommand(h));
    assert.equal(s.workflow.current.approvalId, null);
    const first = await h.illustration.command({
      action: "PREPARE",
      projectId: id,
      mode: "ar-EG",
      expectedCreator: s.creatorVersion,
      expectedPlanner: s.planner.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
    });
    const again = await h.illustration.command({
      action: "PREPARE",
      projectId: id,
      mode: "ar-EG",
      expectedCreator: first.recordVersion,
      expectedPlanner: s.planner.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
    });
    assert.equal(again.plan!.bible.revisionId, first.plan!.bible.revisionId);
    assert.match(again.plan!.pages[0]!.action, /نص مسودة الصفحة المحفوظة/);
    assert.doesNotMatch(again.plan!.pages[0]!.action, /نص الصفحة المعتمد/);
    await assert.rejects(
      h.illustration.load(id, "ar-MSA-simple", again.plan!.planId),
      (error: unknown) =>
        (error as { code?: string }).code === "CREATOR_EDITION_MISSING",
    );
  } finally {
    h.repo.close();
  }
});

test("P43 independent closure: conflicting custom success blocks before persistence", async () => {
  const h = harness();
  try {
    const before = canonicalJson({
      projects: h.repo.listProjects(),
      library: h.repo.loadLibrary(),
    });
    await assert.rejects(
      h.creator.create({
        ...owner,
        customGoal: "لَا ينتظر الطفل دوره مع صاحبه.",
        successScenario: "يتبادل الطفل اللعبة ويستنى دوره مع صاحبه.",
        expectedLibrary: h.repo.loadLibrary().recordVersion,
      }),
      (error: unknown) =>
        (error as { code?: string }).code === "CREATOR_CUSTOM_INTENT_REVIEW",
    );
    assert.equal(
      canonicalJson({
        projects: h.repo.listProjects(),
        library: h.repo.loadLibrary(),
      }),
      before,
    );
  } finally {
    h.repo.close();
  }
});
