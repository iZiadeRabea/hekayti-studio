import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  PlanningRequestSchema,
  QualityStoryPlanSchema,
  StoryPlanSchema,
} from "@hekayti/contracts/planner";
import { LibraryStateSchema } from "@hekayti/contracts/library";
import {
  composeQualityStoryPlan as composeStoryPlan,
  validateStoryPlan,
  rankQualityCandidates,
  detectObjectiveIntent,
  objectiveStructureCompatibility,
  StoryPlannerService,
} from "@hekayti/core/planner";
import { parseLibraryBatch } from "@hekayti/core/creative";
import { SqliteProjectRepository } from "@hekayti/persistence";
import {
  StoryWorkflowService,
  manualBridgeProvenance,
} from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { canonicalJson, contentHash } from "@hekayti/core";
import { countWords } from "@hekayti/contracts";
import { importLibraryBatch } from "@hekayti/core/creative";
import { planGenerationInstructions } from "@hekayti/core/planner";
import { project } from "./fixtures";

const records = parseLibraryBatch(
  readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
);
const library = LibraryStateSchema.parse({
  schemaVersion: "library-state/1.0",
  recordVersion: 0,
  records,
  events: records.map((r) => ({
    eventId: `quality-${r.recordId}`,
    recordId: r.recordId,
    version: r.version,
    action: "CREATE",
    reviewerAlias: "synthetic-fixture",
    timestamp: "now",
  })),
  usage: [],
});
export const livePlanning = () =>
  PlanningRequestSchema.parse({
    schemaVersion: "planning-request/1.0",
    planningRevisionId: "quality-planning-1",
    request: {
      schemaVersion: "story-request/1.0",
      requestId: "quality-request",
      revisionId: "quality-request-1",
      projectId: "demo-product-design",
      storyId: "quality-story",
      ageMonths: 48,
      languageModes: ["ar-EG"],
      primaryLanguageMode: "ar-EG",
      primaryCategory: "adventure",
      objective: {
        kind: "behavioral",
        description: "Learn to share and take turns with others",
        successScenario: "The child shares a toy and takes turns with a friend",
      },
      theme: "A playground game",
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
    },
    profile: "EGYPTIAN_ARAB_MUSLIM_FAMILY",
    variation: "FreshConcept",
    generation: 0,
    selectedFamily: null,
    selectedCharacter: null,
    selectedSetting: "A familiar Egyptian neighborhood playground",
    constraints: [
      "Warm, playful and simple for a 4-year-old. No scary elements. Natural Egyptian setting and behavior.",
    ],
    inspirationReviewed: true,
    adaptationAcknowledged: true,
    sensitiveOptIn: false,
    religiousOptIn: false,
  });
test("exact live owner request: structural social intent, concrete reciprocal progression and resolution", async (t) => {
  assert.equal(library.records.length, 791);
  assert.deepEqual(
    livePlanning(),
    JSON.parse(
      readFileSync("examples/story-planner/quality-live-request.json", "utf8"),
    ),
  );
  const artifact = JSON.parse(
    readFileSync("examples/story-planner/quality-live-regression.json", "utf8"),
  );
  assert.ok(Object.values(artifact.gates).every((v) => v === true));
  const actual = await composeStoryPlan(livePlanning(), library, {
    planId: artifact.after.plan.planId,
    revisionId: artifact.after.plan.revisionId,
  });
  assert.equal(await contentHash(actual), artifact.after.hash);
  assert.equal(
    await contentHash(StoryPlanSchema.parse(artifact.before.plan)),
    artifact.before.hash,
  );
  const plan = await composeStoryPlan(livePlanning(), library, {
    planId: "quality-plan",
    revisionId: "quality-plan-1",
  });
  t.diagnostic(
    JSON.stringify({
      family: plan.provenance.selectedStoryFamilyId,
      pattern: plan.provenance.selectedPatternId,
      mode: plan.provenance.sourceMode,
      characters: plan.characters.length,
      goal: plan.goal.description,
      beats: plan.beats.map((b) => ({
        action: b.action,
        summary: b.summary,
        before: b.beforeState,
        after: b.afterState,
      })),
      findings: validateStoryPlan(plan).findings.filter(
        (f) => f.severity === "high",
      ),
    }),
  );
  assert.ok(
    plan.characters.length >= 2,
    "Social sharing needs two active participants, not only broad metadata",
  );
  assert.ok(
    !plan.beats.some((b) =>
      /Approach \d|next visible clue|enables The child/.test(b.summary),
    ),
  );
  assert.equal(plan.schemaVersion, "story-plan/1.1");
  assert.notEqual(plan.provenance.sourceMode, "EDITORIAL_FALLBACK");
  assert.ok(plan.provenance.selectedStoryFamilyId);
  assert.ok(plan.provenance.sources.length);
  assert.equal(
    plan.quality.objectiveIntent.primaryIntent,
    "SHARING_TURN_TAKING",
  );
  assert.ok(
    plan.quality.objectiveIntent.evidence.some(
      (e) => e.field === "successScenario",
    ),
  );
  assert.ok(
    ["STRONG", "ACCEPTABLE"].includes(
      plan.quality.structuralCompatibility.level,
    ),
  );
  assert.ok(
    plan.quality.structuralCompatibility.evidence.some((e) =>
      /mechanism|resolution|attempt|narrative/.test(e.field),
    ),
  );
  assert.ok(
    plan.quality.transitions.find((t) => t.beatId === plan.resolutionBeatId)!
      .participantIds.length >= 2,
  );
  assert.ok(
    /each child|each leads|each child lead/.test(
      plan.quality.situation.resolutionMethod,
    ),
  );
  assert.ok(new Set(plan.quality.transitions.map((t) => t.strategy)).size >= 4);
  assert.ok(
    !plan.goal.description.includes(
      plan.planning.request.objective.description,
    ),
  );
  assert.equal(
    validateStoryPlan(plan).findings.some((f) =>
      ["high", "blocker"].includes(f.severity),
    ),
    false,
  );
});

const compose = (p = livePlanning(), state = library) =>
  composeStoryPlan(p, state, {
    planId: "quality-test",
    revisionId: "quality-test-1",
  });
const has = (
  p: ReturnType<typeof QualityStoryPlanSchema.parse>,
  category: string,
) => validateStoryPlan(p).findings.some((f) => f.category === category);
test("bounded paraphrases use objective fields and unknowns are honest GENERAL fallbacks", () => {
  for (const [description, successScenario] of [
    ["Taking turns in a game", "Each friend takes a turn with the ball"],
    ["Sharing a toy with a friend", "Pass the toy so the friend can play"],
    ["نتعلم تبادل الأدوار", "يتناوب الطفلان على اللعبة"],
  ])
    assert.equal(
      detectObjectiveIntent({
        kind: "behavioral",
        description: description!,
        successScenario: successScenario!,
      }).primaryIntent,
      "SHARING_TURN_TAKING",
    );
  const unknown = detectObjectiveIntent({
    kind: "educational",
    description: "Understand orbital zibbons",
    successScenario: "Arrange the zibbons correctly",
  });
  assert.equal(unknown.primaryIntent, "GENERAL_EDUCATIONAL");
  assert.equal(unknown.limited, true);
  assert.equal(
    detectObjectiveIntent({
      kind: "entertainment",
      description: "A garden discovery",
      successScenario: "Find a familiar object",
    }).primaryIntent,
    "GENERAL_ENTERTAINMENT",
  );
});
test("structural matching uses fields not titles; compatible social cohort governs repeated regeneration", async () => {
  const p = livePlanning(),
    rows = rankQualityCandidates(p, library);
  assert.ok(rows.length > 0);
  assert.ok(
    rows.every((r) => ["STRONG", "ACCEPTABLE"].includes(r.compatibility.level)),
  );
  const journey = records.find(
    (r) =>
      r.payload.type === "STORY_FAMILY" &&
      r.payload.structure.mechanism === "journey-and-return",
  )!;
  assert.equal(
    objectiveStructureCompatibility(
      detectObjectiveIntent(p.request.objective),
      [journey],
    ).level,
    "MISMATCH",
  );
  const renamed = structuredClone(journey);
  renamed.title = "Sharing turn-taking cooperation every child gets a turn";
  assert.deepEqual(
    objectiveStructureCompatibility(
      detectObjectiveIntent(p.request.objective),
      [renamed],
    ),
    objectiveStructureCompatibility(
      detectObjectiveIntent(p.request.objective),
      [journey],
    ),
  );
  for (let generation = 0; generation < 8; generation++) {
    const plan = await compose({ ...p, generation });
    assert.ok(
      ["STRONG", "ACCEPTABLE"].includes(
        plan.quality.structuralCompatibility.level,
      ),
    );
    assert.notEqual(plan.provenance.selectedStoryFamilyId, journey.recordId);
  }
  p.selectedFamily = { recordId: journey.recordId, version: journey.version };
  p.variation = "SimilarVersion";
  const explicit = await compose(p);
  assert.equal(explicit.provenance.selectedStoryFamilyId, journey.recordId);
  assert.ok(has(explicit, "INTENT_STRUCTURE_MISMATCH"));
  const qa = validateStoryPlan(explicit);
  assert.equal(qa.schemaVersion, "plan-qa/1.1");
  if (qa.schemaVersion === "plan-qa/1.1")
    assert.equal(qa.signals.StructuralCompatibility, "FAIL");
});
test("empty or irrelevant Library produces a concrete, disclosed and reviewable fallback", async () => {
  const empty = { ...library, records: [], events: [], usage: [] };
  const fallback = await compose(livePlanning(), empty);
  assert.equal(fallback.provenance.sourceMode, "EDITORIAL_FALLBACK");
  assert.equal(fallback.provenance.sources.length, 0);
  assert.equal(fallback.quality.structuralCompatibility.level, "REVIEW");
  assert.ok(fallback.beats.some((b) => /ball|toy/.test(b.summary)));
  assert.ok(/each child/.test(fallback.quality.situation.resolutionMethod));
  assert.equal(
    validateStoryPlan(fallback).findings.some((f) => f.severity === "high"),
    false,
  );
  const p = livePlanning();
  p.request.objective = {
    kind: "behavioral",
    description: "Orbital zibbons",
    successScenario: "Arrange zibbons",
  };
  const unknown = await compose(p, empty);
  assert.equal(
    unknown.quality.objectiveIntent.primaryIntent,
    "GENERAL_BEHAVIORAL",
  );
  assert.ok(
    unknown.provenance.limitations.some((l) =>
      l.includes("limited rule coverage"),
    ),
  );
  assert.ok(unknown.beats.every((b) => !b.summary.includes("zibbons")));
});
test("emotional, educational, repair and helping objectives produce distinct concrete operations", async () => {
  const inputs = [
    {
      kind: "emotional",
      description: "Calm down when frustrated",
      successScenario: "Pause and breathe after the blocks fall",
    },
    {
      kind: "educational",
      description: "Count three objects",
      successScenario: "Count each block once",
    },
    {
      kind: "connection",
      description: "Apologize and make amends",
      successScenario: "Repair a friend's drawing",
    },
    {
      kind: "behavioral",
      description: "Work together and help a friend",
      successScenario: "Both children build a stable bridge",
    },
  ] as const;
  const plans = [];
  for (const objective of inputs) {
    const p = livePlanning();
    p.request.objective = objective;
    const plan = await compose(p);
    plans.push(plan);
    assert.equal(
      validateStoryPlan(plan).findings.some((f) => f.severity === "high"),
      false,
    );
  }
  assert.deepEqual(
    plans.map((p) => p.quality.objectiveIntent.primaryIntent),
    [
      "EMOTIONAL_REGULATION",
      "LEARNING_DISCOVERY",
      "CONNECTION_REPAIR",
      "COOPERATION_HELPING",
    ],
  );
  assert.equal(
    new Set(plans.map((p) => p.quality.situation.resolutionMethod)).size,
    4,
  );
  assert.ok(plans[0]!.quality.situation.resolutionMethod.includes("breathes"));
  assert.equal(plans[0]!.quality.objectiveIntent.socialMechanisms.length, 0);
  assert.ok(
    plans[1]!.quality.situation.resolutionMethod.includes("one number"),
  );
  assert.ok(
    plans[1]!.quality.structuralCompatibility.evidence.some((e) =>
      /test|compar|contrast|observ|discover|recogn/.test(e.matched),
    ),
  );
});
test("infant, toddler, older and bedtime forms retain safe repetition and calm/no-conflict freedom", async () => {
  for (const ageMonths of [6, 18, 30, 48, 72]) {
    const p = livePlanning();
    p.request.ageMonths = ageMonths;
    p.request.primaryCategory = "behavioral";
    const plan = await compose(p);
    assert.equal(
      validateStoryPlan(plan).findings.some((f) => f.severity === "high"),
      false,
      `${ageMonths}`,
    );
    if (ageMonths < 12) {
      assert.equal(plan.problem, null);
      assert.equal(plan.climaxBeatId, null);
      assert.ok(plan.characters.length <= 1);
      assert.equal(has(plan, "NON_PROGRESSING_BEATS"), false);
    }
    if (ageMonths < 24) assert.equal(has(plan, "NON_PROGRESSING_BEATS"), false);
  }
  const p = livePlanning();
  p.request.primaryCategory = "bedtime";
  p.request.objective = {
    kind: "emotional",
    description: "A calm bedtime routine",
    successScenario: "Settle beside a familiar soft toy",
  };
  const bedtime = await compose(p);
  assert.equal(bedtime.problem, null);
  assert.equal(bedtime.stakes, null);
  assert.equal(bedtime.climaxBeatId, null);
  assert.ok(
    bedtime.beats.every(
      (b) => !/(?:grab|game stops|excluded|unfair)/.test(b.summary),
    ),
  );
  assert.equal(
    validateStoryPlan(bedtime).findings.some((f) => f.severity === "high"),
    false,
  );
});
test("quality adversaries expose nonprogression, copied goals, placeholders, weak HOW and inactive social cast", async () => {
  const original = await compose();
  const cases: [string, (p: typeof original) => void][] = [
    [
      "NON_PROGRESSING_BEATS",
      (p) => {
        p.beats[2]!.action = p.beats[1]!.action;
        p.beats[2]!.summary = p.beats[1]!.summary;
      },
    ],
    [
      "GENERIC_BEAT_DESCRIPTION",
      (p) => {
        p.beats[1]!.summary = "Approach 1: use the next visible clue";
      },
    ],
    [
      "OBJECTIVE_RESTATEMENT",
      (p) => {
        p.goal.description = p.planning.request.objective.description;
        p.beats[0]!.summary = p.planning.request.objective.description;
      },
    ],
    [
      "WEAK_RESOLUTION_MECHANISM",
      (p) => {
        p.beats.at(-2)!.summary = p.planning.request.objective.successScenario;
        p.quality.transitions.at(-2)!.resolutionMethod = null;
      },
    ],
    [
      "SOCIAL_INTENT_CAST_MISMATCH",
      (p) => {
        p.quality.transitions.forEach(
          (t) => (t.participantIds = [p.characters[0]!.characterId]),
        );
      },
    ],
    [
      "INTENT_STRUCTURE_MISMATCH",
      (p) => {
        p.quality.objectiveIntent.primaryIntent = "GENERAL_BEHAVIORAL";
      },
    ],
  ];
  for (const [category, mutate] of cases) {
    const plan = structuredClone(original);
    mutate(plan);
    assert.ok(has(plan, category), category);
  }
  const repeating = structuredClone(original),
    t1 = repeating.quality.transitions[1]!,
    t2 = repeating.quality.transitions[2]!;
  repeating.beats[1]!.action = "compare";
  repeating.beats[2]!.action = "compare";
  t1.strategy = "Compare an incomplete peek with a complete turn";
  t2.strategy = "Compare a turn marker with no marker";
  assert.equal(
    has(repeating, "NON_PROGRESSING_BEATS"),
    false,
    "Same action label can progress through different concrete strategies/results",
  );
});

test("concrete educational/habit sub-situations do not ignore color, shape, floating or washing objectives", async () => {
  const cases = [
    [
      "educational",
      "Compare colors and sort colored blocks",
      "Put each block in its matching color tray",
      /color pictures|matching tray/,
    ],
    [
      "educational",
      "Notice familiar shapes",
      "Match blocks to shape pictures",
      /block's shape/,
    ],
    [
      "educational",
      "Observe which objects float or sink",
      "Compare a cork and pebble in water",
      /cork|pebble/,
    ],
    [
      "behavioral",
      "Follow the hand-washing routine",
      "Wash and dry with a familiar adult",
      /soap|rinse|towel/,
    ],
    [
      "behavioral",
      "Practice brushing teeth",
      "Follow the familiar caregiver's brushing cues",
      /brush|cup/,
    ],
  ] as const;
  for (const [kind, description, successScenario, expected] of cases) {
    const p = livePlanning();
    p.request.primaryCategory = "everyday-life";
    p.request.objective = { kind, description, successScenario };
    const plan = await compose(p);
    assert.match(plan.quality.situation.resolutionMethod, expected);
    assert.equal(
      validateStoryPlan(plan).findings.some((f) => f.severity === "high"),
      false,
    );
  }
});

test("current desktop-selected quality service reaches frozen manual package, canonical QA/approval and real feedback", async () => {
  const repo = new SqliteProjectRepository(":memory:");
  repo.createProject(project());
  let n = 0;
  const seam = {
      id: () => `quality-integration-${++n}`,
      now: () => "2026-10-06T12:00:00Z",
    },
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
      "planner-quality/1.0",
    );
  try {
    importLibraryBatch(repo, records, 0, "quality-corpus", "now");
    const p = livePlanning(),
      initial = workflow.create(p.request);
    let state = await planner.plan(
      p,
      0,
      initial.recordVersion,
      repo.loadLibrary().recordVersion,
    );
    const accepted = await planner.accept(
      initial.projectId,
      state.recordVersion,
      workflow.load(initial.projectId)!.recordVersion,
      "synthetic-fixture",
      true,
    );
    let w = accepted.workflow;
    state = accepted.planner;
    const prepared = await planner.prepare(
      w.projectId,
      state.recordVersion,
      w.recordVersion,
    );
    state = prepared.planner;
    const pkg = prepared.package,
      plan = QualityStoryPlanSchema.parse(pkg.plan),
      blueprint = w.blueprints.at(-1)!;
    assert.equal(pkg.acceptance.planHash, await contentHash(plan));
    assert.ok(
      w.conceptSets
        .at(-1)!
        .concepts[0]!.outline.some((b) => b.focus["ar-EG"].includes("swap")),
    );
    for (const provider of ["CHATGPT", "GEMINI", "GENERIC"] as const) {
      const prompt = planGenerationInstructions(pkg, w, provider);
      assert.ok(prompt.includes(plan.quality.situation.resolutionMethod));
      assert.ok(prompt.includes("story-plan/1.1"));
      assert.ok(prompt.includes("plan-response/1.0"));
      assert.ok(prompt.includes(pkg.acceptance.planHash));
    }
    const narration = "نور شافت اللعبة. استنت دورها بالراحة.",
      draft = {
        schemaVersion: "story-draft/1.0",
        draftId: "quality-manual-draft",
        sourceRevision: blueprint.revisionId,
        conceptId: w.current.conceptId,
        editions: blueprint.languageVersions.map((e, i) => ({
          ...e,
          languageVersionId: `quality-edition-${i}`,
          pages: e.pages.map((page) => ({
            ...page,
            narration,
            dialogue: [],
            wordCount: countWords(narration),
          })),
          totalWords: e.pages.length * countWords(narration),
          review:
            "Unverified synthetic fixture prose; human semantic/native review required.",
        })),
        provenance: manualBridgeProvenance,
        status: "draft",
      };
    const response = {
      schemaVersion: "plan-response/1.0",
      packageId: pkg.packageId,
      planRevisionId: plan.revisionId,
      planHash: pkg.acceptance.planHash,
      requestRevisionId: p.request.revisionId,
      objective: p.request.objective.description,
      actors: plan.characters.map((c) => c.characterId),
      majorBeatIds: plan.beats.map((b) => b.beatId),
      resolutionBeatId: plan.resolutionBeatId,
      draft,
    };
    const drift = structuredClone(response);
    drift.planHash = "a".repeat(64);
    await assert.rejects(
      () =>
        planner.import(
          w.projectId,
          pkg.packageId,
          JSON.stringify(drift),
          state.recordVersion,
          w.recordVersion,
        ),
      /drift/i,
    );
    w = await planner.import(
      w.projectId,
      pkg.packageId,
      JSON.stringify(response),
      state.recordVersion,
      w.recordVersion,
    );
    w = await workflow.qa(w.projectId, w.recordVersion);
    w = await workflow.approve(
      w.projectId,
      w.recordVersion,
      "synthetic-fixture",
      true,
    );
    const feedback = {
      feedbackId: "quality-feedback",
      planRevisionId: plan.revisionId,
      requestRevisionId: p.request.revisionId,
      draftId: w.current.draftId!,
      reportId: w.current.reportId!,
      approvalId: w.current.approvalId,
      outcome: "APPROVED" as const,
      reviewerAlias: "synthetic-fixture",
      notes: "Synthetic test operation; not literary certification",
      ratings: {},
      timestamp: "now",
      humanReviewAcknowledged: true as const,
    };
    const saved = planner.feedback(
      w.projectId,
      feedback,
      state.recordVersion,
      w.recordVersion,
      repo.loadLibrary().recordVersion,
    );
    const before = repo.loadLibrary();
    planner.feedback(
      w.projectId,
      feedback,
      saved.recordVersion,
      w.recordVersion,
      before.recordVersion,
    );
    assert.deepEqual(repo.loadLibrary(), before);
    assert.equal(saved.feedback.length, 1);
    const tampered = structuredClone(saved);
    if (tampered.plans[0]!.schemaVersion === "story-plan/1.1")
      tampered.plans[0]!.quality.structuralCompatibility.level = "MISMATCH";
    assert.throws(
      () => repo.savePlanner(tampered, saved.recordVersion),
      /append-only|immutable|frozen sources/i,
    );
  } finally {
    repo.close();
  }
});

test("quality source proof rejects re-sealed fabricated compatibility while retaining original corrupt bytes", async () => {
  mkdirSync("temp/phase421-tests", { recursive: true });
  const path = join(
      mkdtempSync("temp/phase421-tests/source-"),
      "synthetic.sqlite",
    ),
    repo = new SqliteProjectRepository(path);
  repo.createProject(project());
  importLibraryBatch(repo, records, 0, "quality-source-corpus", "now");
  let n = 0;
  const seam = { id: () => `quality-source-${++n}`, now: () => "now" },
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
      "planner-quality/1.0",
    ),
    p = livePlanning(),
    w = workflow.create(p.request);
  const s = await planner.plan(
    p,
    0,
    w.recordVersion,
    repo.loadLibrary().recordVersion,
  );
  repo.close();
  const changed = structuredClone(s);
  if (changed.plans[0]!.schemaVersion === "story-plan/1.1")
    changed.plans[0]!.quality.structuralCompatibility.reasons = [
      "Invented perfect fit",
    ];
  const payload = canonicalJson(changed),
    digest = await contentHash(changed),
    db = new DatabaseSync(path);
  db.prepare(
    "UPDATE story_planners SET payload=?,digest=? WHERE project_id=?",
  ).run(payload, digest, p.request.projectId);
  db.close();
  const reopened = new SqliteProjectRepository(path);
  assert.throws(
    () => reopened.loadPlanner(p.request.projectId),
    /failed validation|corrupt/i,
  );
  reopened.close();
  const originalBytes = new DatabaseSync(path, { readOnly: true });
  assert.equal(
    originalBytes
      .prepare("SELECT payload FROM story_planners WHERE project_id=?")
      .get(p.request.projectId)!.payload,
    payload,
  );
  originalBytes.close();
});

test("quality variations retain explicit family and change observable strategy without arbitrary incompatible regeneration", async () => {
  const p = livePlanning(),
    family = rankQualityCandidates(p, library)[0]!.record;
  p.selectedFamily = { recordId: family.recordId, version: family.version };
  p.variation = "SimilarVersion";
  const similar = await compose(p),
    same = await compose({ ...p, generation: 5 }),
    variant = await compose({ ...p, variation: "NewVariant" });
  assert.equal(
    similar.quality.transitions[1]!.strategy,
    same.quality.transitions[1]!.strategy,
  );
  assert.notEqual(
    similar.quality.transitions[1]!.strategy,
    variant.quality.transitions[1]!.strategy,
  );
  assert.notEqual(similar.beats[1]!.summary, variant.beats[1]!.summary);
  assert.equal(variant.provenance.selectedStoryFamilyId, family.recordId);
  const only = {
    ...library,
    records: [family],
    events: library.events.filter((e) => e.recordId === family.recordId),
  };
  const limited = await compose({ ...p, variation: "CompletelyNew" }, only);
  assert.ok(
    limited.provenance.limitations.some((l) =>
      l.includes("No unused alternative"),
    ),
  );
  assert.equal(
    validateStoryPlan(limited).signals.VariationCompliance,
    "REVIEW",
  );
});

test("actual retained v0.5.2 accepted plan/package/workflow golden reload stays byte/hash identical", async () => {
  const fixture = JSON.parse(
    readFileSync("tests/app/fixtures/phase421-legacy-release.json", "utf8"),
  );
  assert.equal(
    fixture.sourceRelease,
    "96e64925d9556981808f00ed323941c2e61ce2dd",
  );
  mkdirSync("temp/phase421-tests", { recursive: true });
  const path = join(
    mkdtempSync("temp/phase421-tests/golden-"),
    "synthetic.sqlite",
  );
  new SqliteProjectRepository(path).close();
  const db = new DatabaseSync(path);
  for (const table of [
    "projects",
    "blueprints",
    "editions",
    "characters",
    "story_workflows",
    "story_library",
    "library_index",
    "library_index_meta",
    "story_planners",
    "story_planner_meta",
  ]) {
    for (const row of fixture.rows[table]) {
      const columns = Object.keys(row);
      assert.ok(columns.every((c) => /^[a-z_]+$/.test(c)));
      db.prepare(
        `INSERT OR REPLACE INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`,
      ).run(...columns.map((c) => row[c]));
    }
  }
  db.close();
  const repo = new SqliteProjectRepository(path);
  const beforePlanner = repo.loadPlanner(fixture.projectId)!,
    beforeWorkflow = repo.loadWorkflow(fixture.projectId)!;
  assert.equal(await contentHash(beforePlanner), fixture.plannerPayloadHash);
  assert.equal(await contentHash(beforeWorkflow), fixture.workflowPayloadHash);
  assert.deepEqual(
    await Promise.all(beforePlanner.plans.map(contentHash)),
    fixture.planHashes,
  );
  assert.deepEqual(
    await Promise.all(beforePlanner.packages.map(contentHash)),
    fixture.packageHashes,
  );
  assert.equal(beforePlanner.plans[0]!.schemaVersion, "story-plan/1.0");
  const legacyQa = validateStoryPlan(beforePlanner.plans[0]!);
  assert.equal(legacyQa.schemaVersion, "plan-qa/1.0");
  assert.ok(!("ObjectiveIntentFit" in legacyQa.signals));
  assert.equal(beforeWorkflow.approvals.length, 1);
  assert.equal(beforePlanner.feedback.length, 1);
  const workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      { id: () => "quality-new", now: () => "now" },
    ),
    planner = new StoryPlannerService(
      repo,
      workflow,
      { id: () => "quality-new", now: () => "now" },
      "planner-quality/1.0",
    );
  const next = await planner.plan(
    {
      ...beforePlanner.plans[0]!.planning,
      planningRevisionId: "golden-next-planning",
    },
    beforePlanner.recordVersion,
    beforeWorkflow.recordVersion,
    repo.loadLibrary().recordVersion,
  );
  assert.equal(next.plans.at(-1)!.schemaVersion, "story-plan/1.1");
  assert.equal(
    canonicalJson(next.plans[0]),
    canonicalJson(beforePlanner.plans[0]),
  );
  assert.equal(
    canonicalJson(next.packages[0]),
    canonicalJson(beforePlanner.packages[0]),
  );
  assert.equal(repo.loadWorkflow(fixture.projectId)!.approvals.length, 1);
  repo.close();
  const reopened = new SqliteProjectRepository(path);
  assert.equal(
    await contentHash(reopened.loadPlanner(fixture.projectId)!.packages[0]),
    fixture.packageHashes[0],
  );
  reopened.close();
});
