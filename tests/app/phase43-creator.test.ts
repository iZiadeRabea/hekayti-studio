import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { StoryPlannerService } from "@hekayti/core/planner";
import { SimpleCreatorService, presentPlan } from "@hekayti/core/creator";
import { IllustrationService } from "@hekayti/core/illustration";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { importLibraryBatch, parseLibraryBatch } from "@hekayti/core/creative";
import { canonicalJson } from "@hekayti/core";
const records = parseLibraryBatch(
  readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
);
function harness(seed = true) {
  const repo = new SqliteProjectRepository(":memory:");
  let n = 0;
  const seam = { id: () => `simple-${++n}`, now: () => "2026-10-06T12:00:00Z" },
    workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      seam,
    ),
    planner = new StoryPlannerService(
      repo,
      workflow,
      seam,
      "planner-quality/1.1",
    ),
    creator = new SimpleCreatorService(repo, workflow, planner, seam),
    illustration = new IllustrationService(repo, workflow, planner, seam);
  if (seed) importLibraryBatch(repo, records, 0, "synthetic", "now");
  return { repo, workflow, planner, creator, illustration, seam };
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
test("Arabic supported goal presets expose selected concrete operation across categories", async () => {
  const h = harness();
  for (const [goalPreset, category] of [
    ["COOPERATION", "adventure"],
    ["ANGER", "emotional-learning"],
    ["COLORS", "educational"],
    ["NUMBERS", "educational"],
    ["SLEEP", "bedtime"],
    ["SHARING", "bedtime"],
    ["SHARING", "educational"],
    ["CONFIDENCE", "behavioral"],
    ["PROBLEM_SOLVING", "adventure"],
    ["HELPING", "values"],
    ["MISTAKES", "emotional-learning"],
    ["FEELINGS", "emotional-learning"],
  ] as const) {
    const s = await h.creator.create({
        goalPreset,
        category,
        primaryLanguageMode: "ar-EG",
        expectedLibrary: h.repo.loadLibrary().recordVersion,
        provisionalAcknowledged: true,
      }),
      p = s.planner.plans[0]!;
    const unknown = s.presentation.events.flatMap((e, i) =>
      Object.entries(e)
        .filter(([, v]) => typeof v === "string" && v.includes("لم نختَرع"))
        .map(
          ([key]) =>
            `${i}:${key}: ${JSON.stringify(p.beats[i])} / ${p.schemaVersion !== "story-plan/1.0" ? JSON.stringify(p.quality.transitions[i]) : ""}`,
        ),
    );
    assert.equal(
      s.presentation.supported,
      true,
      `${goalPreset}/${category}: ${unknown.join("\n")}\n${p.goal.description}\n${p.openingState}`,
    );
  }
  h.repo.close();
});
test("reviewed age presets use AgeEngine forms and Arabic semantics without automatic acceptance", async () => {
  const h = harness();
  for (const [agePreset, age] of [
    ["UNDER_ONE", 6],
    ["ONE_TWO", 18],
    ["TWO_THREE", 30],
    ["THREE_FIVE", 42],
    ["FIVE_SEVEN", 72],
  ] as const) {
    const s = await h.creator.create({
      agePreset,
      category: age < 24 ? "educational" : "adventure",
      goalPreset: "SHARING",
      expectedLibrary: h.repo.loadLibrary().recordVersion,
      provisionalAcknowledged: true,
    });
    assert.equal(s.presentation.ageMonths, age);
    assert.equal(s.planner.currentAcceptanceId, null);
    assert.equal(
      s.presentation.supported,
      true,
      `${age}: ${JSON.stringify(s.presentation.events)}`,
    );
  }
  h.repo.close();
});
test("exact authored whitespace survives reopen in separate metadata, not historical schema changes", async () => {
  const h = harness(),
    input = {
      ...owner,
      setting: ` ${owner.setting} `,
      constraints: ` ${owner.constraints}\n`,
      customGoal: ` ${owner.customGoal} `,
      expectedLibrary: h.repo.loadLibrary().recordVersion,
    },
    s = await h.creator.create(input),
    reopened = h.creator.load(s.workflow.projectId);
  assert.equal(reopened.authoredInput!.setting, input.setting);
  assert.equal(reopened.authoredInput!.customGoal, input.customGoal);
  assert.equal(reopened.authoredInput!.constraints, input.constraints);
  assert.equal(h.creator.list({ query: "من غير خوف" }).total, 1);
  h.repo.close();
});
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
    reviewerAlias: "synthetic-human",
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
function response(
  h: Awaited<ReturnType<typeof prepared>>,
  ending = "فرح نور وسلمى ولعبا معًا.",
) {
  const bp = h.s.workflow.blueprints.find(
    (b) => b.revisionId === h.s.package!.blueprintRevisionId,
  )!;
  return JSON.stringify({
    schemaVersion: "writer-response/1.0",
    editions: h.s.package!.plan.planning.request.languageModes.map((mode) => ({
      mode,
      pages: bp.pagePlan.map((_, i) => ({
        pageNumber: i + 1,
        narration:
          i === bp.pagePlan.length - 1
            ? ending
            : "أخذ نور دوره وأعاد اللعبة لسلمى، ثم تبادلا الأدوار.",
        dialogue: [],
        altText: "طفلان خياليان يلعبان معًا.",
      })),
    })),
  });
}
test("Simple exact owner Arabic is retained; CREATE never accepts/builds; presentation carries actual route and exchange", async () => {
  const h = harness(),
    s = await h.creator.create({
      ...owner,
      expectedLibrary: h.repo.loadLibrary().recordVersion,
    }),
    p = s.planner.plans[0]!;
  assert.equal(s.workflow.current.blueprintRevisionId, null);
  assert.equal(s.planner.currentAcceptanceId, null);
  assert.equal(p.planning.request.objective.description, owner.customGoal);
  assert.equal(p.planning.selectedSetting, owner.setting);
  assert.deepEqual(p.planning.constraints, [owner.constraints]);
  assert.equal(
    p.schemaVersion !== "story-plan/1.0" &&
      p.quality.objectiveIntent.primaryIntent,
    "SHARING_TURN_TAKING",
  );
  assert.equal(s.presentation.setting, owner.setting);
  assert.doesNotMatch(
    JSON.stringify(s.presentation),
    /holds|waits|A familiar|cooperate/,
  );
  assert.match(s.presentation.resolution, /تبديل|تسليم/);
  assert.match(
    s.presentation.events.map((e) => e.action).join(" "),
    /حصيرة|علامة/,
  );
  assert.equal(
    s.presentation.supported,
    true,
    JSON.stringify(s.presentation, null, 2),
  );
  assert.equal(
    h.creator.load(s.workflow.projectId).presentation.objective,
    owner.customGoal,
  );
  h.repo.close();
});
test("empty/provisional/stale/unsafe create fails without orphan projects", async () => {
  const h = harness(false);
  await assert.rejects(
    h.creator.create({ ...owner, expectedLibrary: 0 }),
    /starter Library/,
  );
  assert.equal(h.repo.listProjects().length, 0);
  importLibraryBatch(h.repo, records, 0, "synthetic", "now");
  await assert.rejects(
    h.creator.create({
      ...owner,
      provisionalAcknowledged: false,
      expectedLibrary: h.repo.loadLibrary().recordVersion,
    }),
    /acknowledge/,
  );
  await assert.rejects(
    h.creator.create({
      ...owner,
      exactAgeMonths: 6,
      expectedLibrary: h.repo.loadLibrary().recordVersion,
    }),
  );
  assert.equal(h.repo.listProjects().length, 0);
  h.repo.close();
});
test("writer preview/history/edition/compare preserve retained bytes and current authority", async () => {
  const h = await prepared(),
    id = h.s.workflow.projectId,
    before = canonicalJson(h.repo.loadWorkflow(id));
  const preview = await h.creator.command({
    action: "PREVIEW",
    projectId: id,
    packageId: h.s.package!.packageId,
    expectedPlanner: h.s.planner.recordVersion,
    expectedWorkflow: h.s.workflow.recordVersion,
    json: response(h),
  });
  assert.notEqual(preview.preview!.status, "FAIL");
  assert.equal(canonicalJson(h.repo.loadWorkflow(id)), before);
  const first = await h.creator.command({
    action: "IMPORT",
    projectId: id,
    packageId: h.s.package!.packageId,
    expectedPlanner: h.s.planner.recordVersion,
    expectedWorkflow: h.s.workflow.recordVersion,
    json: response(h),
    providerLabel: "GEMINI",
  });
  const firstId = first.workflow.current.draftId!;
  const second = await h.creator.command({
    action: "IMPORT",
    projectId: id,
    packageId: h.s.package!.packageId,
    expectedPlanner: first.planner.recordVersion,
    expectedWorkflow: first.workflow.recordVersion,
    json: response(h, "فرحا معًا وجلسا جنب اللعبة."),
    providerLabel: "CHATGPT",
  });
  const current = canonicalJson(second.workflow),
    reader = h.creator.reader(id, firstId, "ar-MSA-simple");
  assert.equal(reader.historical, true);
  assert.equal(reader.providerBasis, "USER_REPORTED");
  assert.equal(reader.providerLabel, "GEMINI");
  assert.equal(
    reader.pages[0]!.narration,
    "أخذ نور دوره وأعاد اللعبة لسلمى، ثم تبادلا الأدوار.",
  );
  const comparison = h.creator.compare(
    id,
    firstId,
    second.workflow.current.draftId!,
    "ar-EG",
  );
  assert.equal(comparison.compatible, true);
  assert.equal(comparison.pages.length, 12);
  assert.equal(canonicalJson(h.repo.loadWorkflow(id)), current);
  assert.equal(h.creator.list({ query: "رحلة", limit: 1 }).stories.length, 1);
  h.repo.close();
});
test("illustration derives12 exact pages, refs before cover/pages, immutable edits mark old prompts stale", async () => {
  const h = await prepared(),
    id = h.s.workflow.projectId,
    s = await h.creator.command({
      action: "IMPORT",
      projectId: id,
      packageId: h.s.package!.packageId,
      expectedPlanner: h.s.planner.recordVersion,
      expectedWorkflow: h.s.workflow.recordVersion,
      json: response(h),
    });
  let out = await h.illustration.command({
    action: "PREPARE",
    projectId: id,
    mode: "ar-EG",
    expectedCreator: s.creatorVersion,
    expectedPlanner: s.planner.recordVersion,
    expectedWorkflow: s.workflow.recordVersion,
  });
  assert.equal(out.plan!.pages.length, 12);
  out = await h.illustration.command({
    action: "GENERATE",
    projectId: id,
    planId: out.plan!.planId,
    expectedCreator: out.recordVersion,
    expectedPlanner: s.planner.recordVersion,
    expectedWorkflow: s.workflow.recordVersion,
  });
  assert.equal(out.prompts.filter((p) => p.kind === "PAGE").length, 12);
  assert.equal(out.prompts[0]!.kind, "CHARACTER_REFERENCE");
  assert.equal(out.prompts[2]!.kind, "COVER");
  assert.match(
    out.prompts.find((p) => p.kind === "PAGE")!.arabicSummary,
    /أخذ نور/,
  );
  assert.match(
    out.prompts.find((p) => p.kind === "COVER")!.technicalPrompt,
    /لا عنوان/,
  );
  assert.equal(out.stale, false);
  const original = canonicalJson(out.plan),
    oldId = out.plan!.planId;
  await h.illustration.command({
    action: "EDIT_STYLE",
    projectId: id,
    expectedCreator: out.recordVersion,
    expectedPlanner: s.planner.recordVersion,
    expectedWorkflow: s.workflow.recordVersion,
    style: {
      ...out.style!,
      revisionId: h.seam.id(),
      palette: "ألوان هادئة متنوعة",
    },
  });
  const history = await h.illustration.load(id, "ar-EG", oldId);
  assert.equal(history.stale, true);
  assert.equal(canonicalJson(history.plan), original);
  await assert.rejects(
    h.illustration.command({
      action: "COPY",
      projectId: id,
      expectedCreator: history.recordVersion,
      expectedPlanner: s.planner.recordVersion,
      expectedWorkflow: s.workflow.recordVersion,
      promptId: out.prompts[0]!.promptId,
      syntheticReviewed: true,
    }),
    /Regenerate/,
  );
  h.repo.close();
});
test("unknown legacy/custom semantic clauses are honestly marked review, not translated into generic success", async () => {
  const h = await prepared(),
    p = structuredClone(h.s.package!.plan);
  p.beats[0]!.summary = "A completely custom purple kite operation.";
  const view = presentPlan(p, "ar-EG");
  assert.equal(view.supported, false);
  assert.match(view.events[0]!.action, /لم نختَرع/);
  assert.doesNotMatch(JSON.stringify(view), /purple kite/);
  h.repo.close();
});
test("Simple review uses canonical QA/approval/feedback, preserves edit intent, no promotion and atomic failures", async () => {
  const h = await prepared(),
    id = h.s.workflow.projectId;
  let s = await h.creator.command({
    action: "IMPORT",
    projectId: id,
    packageId: h.s.package!.packageId,
    expectedPlanner: h.s.planner.recordVersion,
    expectedWorkflow: h.s.workflow.recordVersion,
    json: response(h),
    providerLabel: "GEMINI",
  });
  assert.ok(s.workflow.current.reportId);
  assert.equal(s.workflow.current.approvalId, null);
  const review = (choice: "LIKED" | "NEEDS_EDIT" | "REJECTED") => ({
    action: "REVIEW" as const,
    projectId: id,
    draftId: s.workflow.current.draftId!,
    choice,
    expectedPlanner: s.planner.recordVersion,
    expectedWorkflow: s.workflow.recordVersion,
    expectedLibrary: h.repo.loadLibrary().recordVersion,
    reviewerAlias: "synthetic-human",
    advisoryAcknowledged: true as const,
    notes: "مراجعة محفوظة",
    rating: 4,
  });
  s = await h.creator.command(review("NEEDS_EDIT"));
  assert.equal(s.workflow.current.approvalId, null);
  assert.equal(s.planner.feedback.length, 0);
  assert.equal(h.repo.loadCreator(id).reviews.at(-1)!.choice, "NEEDS_EDIT");
  s = await h.creator.command(review("LIKED"));
  assert.ok(s.workflow.current.approvalId);
  assert.equal(s.planner.feedback.at(-1)!.outcome, "APPROVED");
  assert.deepEqual(s.planner.feedback.at(-1)!.ratings, {});
  assert.equal(h.repo.loadCreator(id).reviews.at(-1)!.rating, 4);
  assert.equal(h.creator.reader(id, undefined, "ar-EG").review.approved, true);
  const before = canonicalJson({
    workflow: h.repo.loadWorkflow(id),
    planner: h.repo.loadPlanner(id),
    creator: h.repo.loadCreator(id),
    library: h.repo.loadLibrary(),
  });
  await assert.rejects(
    h.creator.command(review("LIKED")),
    /already has feedback/,
  );
  assert.equal(
    canonicalJson({
      workflow: h.repo.loadWorkflow(id),
      planner: h.repo.loadPlanner(id),
      creator: h.repo.loadCreator(id),
      library: h.repo.loadLibrary(),
    }),
    before,
  );
  assert.equal(
    h.repo
      .loadLibrary()
      .records.filter((r) => r.status === "PROMOTED_TO_LIBRARY").length,
    0,
  );
  h.repo.close();
});
test("creator persistence rejects rewritten history and invented provider/draft links", async () => {
  const h = await prepared(),
    id = h.s.workflow.projectId,
    state = h.repo.loadCreator(id);
  assert.throws(
    () =>
      h.repo.saveCreator(
        {
          ...state,
          providerNotes: [
            {
              draftId: "invented-draft",
              label: "GEMINI",
              basis: "USER_REPORTED",
            },
          ],
        },
        state.recordVersion,
      ),
    /exact canonical/,
  );
  assert.throws(
    () => h.repo.saveCreator({ ...state, inputs: [] }, state.recordVersion),
    /append-only/,
  );
  assert.equal(canonicalJson(h.repo.loadCreator(id)), canonicalJson(state));
  h.repo.close();
});
