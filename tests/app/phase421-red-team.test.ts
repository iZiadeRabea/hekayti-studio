import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { countWords } from "@hekayti/contracts";
import {
  PlanningRequestSchema,
  QualityStoryPlanSchema,
  type PlanningRequest,
} from "@hekayti/contracts/planner";
import { LibraryStateSchema } from "@hekayti/contracts/library";
import {
  SqliteProjectRepository,
  createCreativeArchive,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
import {
  composeQualityStoryPlan,
  rankQualityCandidates,
  validateStoryPlan,
  StoryPlannerService,
  detectObjectiveIntent,
  planGenerationInstructions,
} from "@hekayti/core/planner";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
import {
  StoryWorkflowService,
  manualBridgeProvenance,
} from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { canonicalJson, contentHash } from "@hekayti/core";
import {
  UiLanguageProvider,
  UiLanguageSwitch,
  UiStatus,
} from "../../apps/desktop/renderer/src/UiLanguage";
import {
  label,
  readUiLanguage,
  saveUiLanguage,
  UI_LANGUAGE_KEY,
} from "../../apps/desktop/renderer/src/ui-language";
import { StoryCreator } from "../../apps/desktop/renderer/src/StoryCreator";
import { project } from "./fixtures";

const records = parseLibraryBatch(
  readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
);
const library = LibraryStateSchema.parse({
  schemaVersion: "library-state/1.0",
  recordVersion: 0,
  records,
  events: records.map((r) => ({
    eventId: `independent-${r.recordId}`,
    recordId: r.recordId,
    version: r.version,
    action: "CREATE",
    reviewerAlias: "synthetic-test",
    timestamp: "now",
  })),
  usage: [],
});
const planning = () =>
  PlanningRequestSchema.parse(
    JSON.parse(
      readFileSync("examples/story-planner/quality-live-request.json", "utf8"),
    ),
  );
const compose = (p = planning(), state = library) =>
  composeQualityStoryPlan(p, state, {
    planId: "independent-quality",
    revisionId: "independent-quality-r1",
  });
const blocks = (
  p: ReturnType<typeof QualityStoryPlanSchema.parse>,
  category?: string,
) =>
  validateStoryPlan(p).findings.some(
    (f) =>
      ["high", "blocker"].includes(f.severity) &&
      (!category || f.category === category),
  );
function harness() {
  const repo = new SqliteProjectRepository(":memory:");
  repo.createProject(project());
  let n = 0;
  const seam = {
    id: () => `independent-421-${++n}`,
    now: () => "2026-10-06T15:00:00Z",
  };
  const workflow = new StoryWorkflowService(
    repo,
    new MockStoryConceptProvider(),
    new MockStoryDraftProvider(),
    seam,
  );
  // This is the fourth argument actually selected by apps/desktop/src/main.ts.
  const planner = new StoryPlannerService(
    repo,
    workflow,
    seam,
    "planner-quality/1.0",
  );
  importLibraryBatch(repo, records, 0, "independent-quality-corpus", "now");
  return { repo, workflow, planner };
}
async function livePlan(h: ReturnType<typeof harness>, p: PlanningRequest) {
  const w = h.workflow.create(p.request);
  const s = await h.planner.plan(
    p,
    0,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  return {
    w: h.workflow.load(w.projectId)!,
    s,
    plan: QualityStoryPlanSchema.parse(s.plans.at(-1)),
  };
}

test("P421-QA-01: Arabic sharing feelings must not become sharing a toy in the desktop-selected service", async () => {
  const h = harness();
  try {
    const p = planning();
    p.request.objective = {
      kind: "emotional",
      description: "مشاركة المشاعر مع شخص موثوق",
      successScenario: "يتحدث الطفل عن حزنه مع أحد والديه",
    };
    const result = await livePlan(h, p);
    assert.notEqual(
      result.plan.quality.objectiveIntent.primaryIntent,
      "SHARING_TURN_TAKING",
      "Sharing feelings is not reciprocal object ownership; the generated toy-turn plan misses the requested emotional objective.",
    );
    assert.ok(
      ["EMOTIONAL_REGULATION", "GENERAL_EMOTIONAL"].includes(
        result.plan.quality.objectiveIntent.primaryIntent,
      ),
    );
  } finally {
    h.repo.close();
  }
});

test("P421-QA-02: a negated toy-sharing instruction must not silently produce positive sharing", async () => {
  const h = harness();
  try {
    const p = planning();
    p.request.objective = {
      kind: "behavioral",
      description: "Do not share a toy when it is broken",
      successScenario: "The child keeps the broken toy aside for repair",
    };
    const result = await livePlan(h, p);
    assert.notEqual(
      result.plan.quality.objectiveIntent.primaryIntent,
      "SHARING_TURN_TAKING",
      "The intent matcher ignores 'Do not' and composes the opposite objective with no limited-coverage warning.",
    );
    assert.ok(
      result.plan.quality.objectiveIntent.limited || blocks(result.plan),
    );
  } finally {
    h.repo.close();
  }
});

test("P421-QA-03: incidental negated emotion must not override explicit educational discovery", async () => {
  const h = harness();
  try {
    const p = planning();
    p.request.objective = {
      kind: "educational",
      description: "Compare colors without fear",
      successScenario: "Sort each block by color",
    };
    const { plan } = await livePlan(h, p);
    assert.equal(
      plan.quality.objectiveIntent.primaryIntent,
      "LEARNING_DISCOVERY",
      "An incidental 'without fear' selects the falling-tower coping episode instead of observable color sorting.",
    );
    assert.match(
      plan.quality.situation.resolutionMethod,
      /color|matching tray/,
    );
  } finally {
    h.repo.close();
  }
});

test("P421-QA-04: fake attempt counters are not meaningful narrative progression", async () => {
  const p = await compose();
  for (const i of [1, 2]) {
    const beat = p.beats[i]!,
      transition = p.quality.transitions[i]!;
    beat.actorId = p.characters[0]!.characterId;
    beat.action = "try";
    beat.role = "ATTEMPT";
    beat.summary = `Attempt ${i}: Noor keeps rolling the ball alone while the friend still waits`;
    beat.afterState = `The ball is held by Noor and the friend still waits; attempt ${i}`;
    beat.progress = `The same unchanged game is paused; attempt ${i}`;
    beat.beforeState = p.beats[i - 1]!.afterState;
    transition.strategy = `Keep rolling alone; attempt ${i}`;
    transition.informationChange = `The friend is still waiting; attempt ${i}`;
    transition.relationshipChange = `The friend remains excluded; attempt ${i}`;
    transition.consequence = `The game is still paused; attempt ${i}`;
  }
  p.beats[3]!.beforeState = p.beats[2]!.afterState;
  assert.ok(
    blocks(p, "NON_PROGRESSING_BEATS"),
    "Only numerical counters differ, yet BeatProgression remains ACCEPTABLE.",
  );
});

test("P421-QA-05: duplicated participant IDs cannot satisfy a two-person resolution", async () => {
  const p = await compose(),
    resolution = p.quality.transitions.find(
      (t) => t.beatId === p.resolutionBeatId,
    )!;
  resolution.participantIds = [
    p.characters[0]!.characterId,
    p.characters[0]!.characterId,
  ];
  assert.ok(
    blocks(p, "SOCIAL_INTENT_CAST_MISMATCH"),
    "Global active cast has two names, but the reciprocal resolution contains only one distinct participant.",
  );
});

test("P421-QA-06: known infant REPEAT role has an Arabic display label without changing its value", async () => {
  const p = planning();
  p.request.ageMonths = 8;
  p.request.primaryCategory = "early-learning";
  const infant = await compose(p);
  const repeated = infant.beats.find((b) => b.role === "REPEAT")!;
  assert.ok(repeated);
  assert.notEqual(
    label(repeated.role, "ar"),
    "REPEAT",
    "The Arabic-first infant planner leaks its known uppercase internal beat enum.",
  );
  assert.equal(repeated.role, "REPEAT");
});

test("independent owner A-I checks use the current service and exact 791-record snapshot", async () => {
  const main = readFileSync("apps/desktop/src/main.ts", "utf8");
  assert.match(
    main,
    /new StoryPlannerService\([\s\S]{0,350}"planner-quality\/1\.0"/,
  );
  const h = harness();
  try {
    const before = canonicalJson(h.repo.loadLibrary());
    const { plan } = await livePlan(h, planning());
    assert.equal(h.repo.loadLibrary().records.length, 791);
    assert.equal(canonicalJson(h.repo.loadLibrary()), before);
    assert.equal(plan.schemaVersion, "story-plan/1.1");
    assert.equal(plan.planning.request.ageMonths, 48);
    assert.equal(plan.planning.request.primaryLanguageMode, "ar-EG");
    assert.equal(plan.planning.request.primaryCategory, "adventure");
    assert.equal(plan.planning.variation, "FreshConcept");
    assert.equal(plan.planning.inspirationReviewed, true);
    assert.equal(plan.planning.adaptationAcknowledged, true);
    assert.equal(plan.planning.sensitiveOptIn, false);
    assert.equal(plan.planning.religiousOptIn, false);
    assert.deepEqual(plan.planning.constraints, planning().constraints);
    assert.equal(plan.planning.selectedSetting, planning().selectedSetting);
    assert.equal(
      plan.quality.objectiveIntent.primaryIntent,
      "SHARING_TURN_TAKING",
    );
    assert.equal(plan.provenance.sourceMode, "ACKNOWLEDGED_PROVISIONAL");
    assert.equal(plan.provenance.selectedStoryFamilyId, "hekayti-family-2");
    assert.ok(
      plan.provenance.selectedStoryFamilyId && plan.provenance.sources.length,
    );
    assert.equal(
      plan.provenance.selectedPatternId,
      null,
      "A synthetic family without DNA cannot invent a pattern ID.",
    );
    assert.ok(
      ["STRONG", "ACCEPTABLE"].includes(
        plan.quality.structuralCompatibility.level,
      ),
    );
    const resolution = plan.quality.transitions.find(
      (t) => t.beatId === plan.resolutionBeatId,
    )!;
    assert.equal(new Set(resolution.participantIds).size, 2);
    assert.match(
      resolution.resolutionMethod!,
      /swap.*each|each.*turn|each.*roll/,
    );
    assert.match(plan.beats[1]!.summary, /alone|peek/);
    assert.match(plan.beats[1]!.afterState, /paused/);
    assert.match(plan.beats[2]!.summary, /swap|turn card/);
    assert.match(plan.beats.at(-1)!.summary, /gentle round|another/);
    assert.equal(
      plan.beats.some((b) =>
        /Approach \d|next visible clue|^Practice|enables The child/.test(
          b.summary,
        ),
      ),
      false,
    );
    assert.ok(
      new Set(plan.quality.transitions.map((t) => t.strategy)).size >= 4,
    );
    assert.equal(blocks(plan), false);
  } finally {
    h.repo.close();
  }
});

test("independent: intent matching is not a family title/ID special case and unrelated selections are blocked", async () => {
  const p = planning(),
    original = rankQualityCandidates(p, library)[0]!.record;
  const renamed = structuredClone(original);
  renamed.recordId = "qa-another-family";
  renamed.title = "Neutral fictional scaffold";
  const state = LibraryStateSchema.parse({
    ...library,
    records: [renamed],
    events: [
      {
        ...library.events.find((e) => e.recordId === original.recordId)!,
        recordId: renamed.recordId,
        eventId: "qa-renamed",
      },
    ],
    usage: [],
  });
  const adapted = await compose(p, state);
  assert.equal(adapted.provenance.selectedStoryFamilyId, renamed.recordId);
  assert.equal(blocks(adapted), false);
  const journey = records.find(
    (r) =>
      r.payload.type === "STORY_FAMILY" &&
      r.payload.structure.mechanism === "journey-and-return",
  )!;
  const mismatch = await compose({
    ...p,
    variation: "SimilarVersion",
    selectedFamily: { recordId: journey.recordId, version: journey.version },
  });
  assert.ok(blocks(mismatch, "INTENT_STRUCTURE_MISMATCH"));
  for (const generation of [1, 4, 8])
    assert.equal(blocks(await compose({ ...p, generation })), false);
});

test("independent: quiet/infant repetition, recognized paraphrases and honest empty-Library fallback", async () => {
  for (const objective of [
    {
      kind: "behavioral" as const,
      description: "Taking turns in a game",
      successScenario: "Each friend takes a turn with the ball",
    },
    {
      kind: "emotional" as const,
      description: "Share feelings with a parent",
      successScenario: "Name sadness and ask for a pause",
    },
  ]) {
    const intent = detectObjectiveIntent(objective);
    assert.equal(intent.limited, false);
    assert.equal(
      intent.primaryIntent,
      objective.kind === "emotional"
        ? "EMOTIONAL_REGULATION"
        : "SHARING_TURN_TAKING",
    );
  }
  const p = planning();
  p.request.primaryCategory = "bedtime";
  p.request.objective = {
    kind: "emotional",
    description: "Calm bedtime",
    successScenario: "Settle beside a soft toy",
  };
  const quiet = await compose(p);
  assert.equal(quiet.problem, null);
  assert.equal(quiet.climaxBeatId, null);
  assert.equal(blocks(quiet), false);
  p.request.ageMonths = 8;
  const infant = await compose(p);
  assert.equal(infant.problem, null);
  assert.ok(infant.characters.length <= 1);
  assert.equal(blocks(infant), false);
  const unknown = planning();
  unknown.request.objective = {
    kind: "educational",
    description: "Understand orbital zibbons",
    successScenario: "Name the zibbons",
  };
  const empty = LibraryStateSchema.parse({
    ...library,
    records: [],
    events: [],
    usage: [],
  });
  const fallback = await compose(unknown, empty);
  assert.equal(fallback.provenance.sourceMode, "EDITORIAL_FALLBACK");
  assert.equal(fallback.provenance.sources.length, 0);
  assert.equal(fallback.quality.objectiveIntent.limited, true);
  assert.equal(fallback.quality.structuralCompatibility.level, "REVIEW");
});

test("independent: concrete quality plan remains frozen through manual import, approval, feedback and creative recovery", async () => {
  const h = harness();
  try {
    const { w: initial, s, plan } = await livePlan(h, planning());
    const accepted = await h.planner.accept(
      initial.projectId,
      s.recordVersion,
      initial.recordVersion,
      "synthetic-local-review-action",
      true,
    );
    let w = accepted.workflow;
    const prepared = await h.planner.prepare(
        w.projectId,
        accepted.planner.recordVersion,
        w.recordVersion,
      ),
      pkg = prepared.package,
      state = prepared.planner;
    assert.equal(pkg.acceptance.planHash, await contentHash(plan));
    for (const provider of ["CHATGPT", "GEMINI", "GENERIC"] as const)
      assert.ok(
        planGenerationInstructions(pkg, w, provider).includes(
          plan.quality.situation.resolutionMethod,
        ),
      );
    const blueprint = w.blueprints.at(-1)!,
      narration = "نور شافت اللعبة. استنت دورها بالراحة.";
    const draft = {
      schemaVersion: "story-draft/1.0",
      draftId: "independent-421-draft",
      sourceRevision: blueprint.revisionId,
      conceptId: w.current.conceptId,
      status: "draft",
      provenance: manualBridgeProvenance,
      editions: blueprint.languageVersions.map((edition, i) => ({
        ...edition,
        languageVersionId: `independent-421-edition-${i}`,
        pages: edition.pages.map((page) => ({
          ...page,
          narration,
          dialogue: [],
          wordCount: countWords(narration),
        })),
        totalWords: edition.pages.length * countWords(narration),
        review:
          "Synthetic local fixture, not provider prose or verified literary/native quality.",
      })),
    };
    const out = {
      schemaVersion: "plan-response/1.0",
      packageId: pkg.packageId,
      planRevisionId: plan.revisionId,
      planHash: pkg.acceptance.planHash,
      requestRevisionId: plan.planning.request.revisionId,
      objective: plan.planning.request.objective.description,
      actors: plan.characters.map((c) => c.characterId),
      majorBeatIds: plan.beats.map((b) => b.beatId),
      resolutionBeatId: plan.resolutionBeatId,
      draft,
    };
    await assert.rejects(() =>
      h.planner.import(
        w.projectId,
        pkg.packageId,
        JSON.stringify({ ...out, planHash: "a".repeat(64) }),
        state.recordVersion,
        w.recordVersion,
      ),
    );
    assert.equal(h.workflow.load(w.projectId)!.drafts.length, 0);
    w = await h.planner.import(
      w.projectId,
      pkg.packageId,
      JSON.stringify(out),
      state.recordVersion,
      w.recordVersion,
    );
    w = await h.workflow.qa(w.projectId, w.recordVersion);
    w = await h.workflow.approve(
      w.projectId,
      w.recordVersion,
      "synthetic-local-review-action",
      true,
    );
    const f = {
      feedbackId: "independent-421-feedback",
      planRevisionId: plan.revisionId,
      requestRevisionId: plan.planning.request.revisionId,
      draftId: w.current.draftId!,
      reportId: w.current.reportId!,
      approvalId: w.current.approvalId,
      outcome: "APPROVED" as const,
      reviewerAlias: "synthetic-local-review-action",
      notes: "Actual synthetic test action, no provider-quality claim",
      ratings: {},
      timestamp: "now",
      humanReviewAcknowledged: true as const,
    };
    const saved = h.planner.feedback(
        w.projectId,
        f,
        state.recordVersion,
        w.recordVersion,
        h.repo.loadLibrary().recordVersion,
      ),
      before = h.repo.loadLibrary();
    assert.deepEqual(h.planner.feedback(w.projectId, f, 0, 0, 0), saved);
    assert.deepEqual(h.repo.loadLibrary(), before);
    const bytes = createCreativeArchive(h.repo, true),
      restored = new SqliteProjectRepository(":memory:");
    try {
      const preview = previewCreativeRestore(restored, bytes);
      restoreCreativeArchive(
        restored,
        bytes,
        { digest: preview.digest, expectedVersion: 0, choices: {} },
        "now",
      );
      assert.equal(restored.loadPlanner(w.projectId), null);
      assert.equal(restored.loadWorkflow(w.projectId), null);
      assert.equal(
        restored
          .loadLibrary()
          .records.find((r) => r.recordId === pkg.conceptId)!.status,
        "GENERATED",
      );
    } finally {
      restored.close();
    }
  } finally {
    h.repo.close();
  }
});

test("independent: Arabic/English presentation and storage preserve authored story inputs and canonical values", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window"),
    raw = "PLANNER_STALE: source revision ABC-12";
  function render(language: "ar" | "en") {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: { getItem: () => language, setItem: () => {} } },
    });
    return renderToStaticMarkup(
      React.createElement(
        UiLanguageProvider,
        null,
        React.createElement(
          React.Fragment,
          null,
          React.createElement(UiLanguageSwitch),
          React.createElement(StoryCreator),
          React.createElement(UiStatus, { raw }),
        ),
      ),
    );
  }
  try {
    const ar = render("ar"),
      en = render("en");
    assert.match(ar, /منشئ القصة/);
    assert.match(en, /New Story/);
    assert.match(ar, /العربية/);
    assert.match(ar, /English/);
    for (const html of [ar, en]) {
      assert.ok(html.includes('value="ar-MSA-simple" selected=""'));
      assert.ok(html.includes('value="hybrid" selected=""'));
      assert.ok(html.includes("Warm supported exploration"));
      assert.ok(html.includes(raw));
    }
    assert.ok(ar.includes('dir="ltr"'));
    assert.equal(readUiLanguage(), "ar");
    let stored: unknown;
    saveUiLanguage("en", {
      setItem: (key, value) => {
        stored = [key, value];
      },
    });
    assert.deepEqual(stored, [UI_LANGUAGE_KEY, "en"]);
    assert.equal(
      readUiLanguage({
        getItem: () => {
          throw Error("storage blocked");
        },
      }),
      "ar",
    );
    assert.equal(
      label("unknown-exact-source-text", "ar"),
      "unknown-exact-source-text",
    );
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
