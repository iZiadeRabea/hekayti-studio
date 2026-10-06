import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PlanningRequestSchema } from "@hekayti/contracts/planner";
import { LibraryStateSchema } from "@hekayti/contracts/library";
import {
  composeQualityStoryPlan,
  detectObjectiveIntent,
  validateStoryPlan,
} from "@hekayti/core/planner";

const planning = () =>
  PlanningRequestSchema.parse(
    JSON.parse(
      readFileSync("examples/story-planner/quality-live-request.json", "utf8"),
    ),
  );
const empty = LibraryStateSchema.parse({
  schemaVersion: "library-state/1.0",
  recordVersion: 0,
  records: [],
  events: [],
  usage: [],
});
const compose = () =>
  composeQualityStoryPlan(planning(), empty, {
    planId: "boundary-plan",
    revisionId: "boundary-r1",
  });
const high = (plan: Awaited<ReturnType<typeof compose>>, category: string) =>
  validateStoryPlan(plan).findings.some(
    (f) => f.category === category && ["high", "blocker"].includes(f.severity),
  );

test("bounded positive goals distinguish feelings, negation, competing educational operations and uncertainty", () => {
  for (const description of [
    "مشاركة المشاعر مع شخص موثوق",
    "Share feelings with a parent",
  ]) {
    const intent = detectObjectiveIntent({
      kind: "emotional",
      description,
      successScenario: "يتحدث الطفل عن حزنه مع أحد والديه",
    });
    assert.equal(intent.primaryIntent, "EMOTIONAL_REGULATION");
    assert.equal(intent.limited, false);
  }
  for (const description of [
    "Do not share a toy when it is broken",
    "Never take turns with the broken toy",
    "Avoid sharing a toy before repair",
    "لا مشاركة اللعبة المكسورة",
  ]) {
    const intent = detectObjectiveIntent({
      kind: "behavioral",
      description,
      successScenario: "The child keeps the broken toy aside for repair",
    });
    assert.equal(intent.primaryIntent, "GENERAL_BEHAVIORAL");
    assert.equal(intent.limited, true);
  }
  const contradiction = detectObjectiveIntent({
    kind: "behavioral",
    description: "Do not share a toy",
    successScenario: "Share a toy with a friend",
  });
  assert.equal(contradiction.limited, true);
  for (const description of [
    "Compare colors without fear",
    "Notice colors while worried",
  ]) {
    const intent = detectObjectiveIntent({
      kind: "educational",
      description,
      successScenario: "Sort each block by color",
    });
    assert.equal(intent.primaryIntent, "LEARNING_DISCOVERY");
    assert.ok(intent.evidence.some((e) => e.field === "successScenario"));
    assert.equal(
      intent.evidence.some((e) => e.matched === "fear"),
      false,
    );
  }
  const positive = detectObjectiveIntent(planning().request.objective);
  assert.equal(positive.primaryIntent, "SHARING_TURN_TAKING");
  assert.equal(positive.limited, false);
});

test("enumerated padding is not progression but changed quantities remain meaningful evidence", async () => {
  const plan = await compose();
  for (const [index, counter] of [
    [1, "1"],
    [2, "2"],
  ] as const) {
    const beat = plan.beats[index]!,
      transition = plan.quality.transitions[index]!;
    beat.action = "try";
    beat.role = "ATTEMPT";
    beat.summary = `Try ${counter}: keep the toy while the friend waits`;
    for (const key of [
      "strategy",
      "informationChange",
      "relationshipChange",
      "consequence",
    ] as const)
      transition[key] = `Still unchanged; step ${counter}`;
  }
  assert.equal(high(plan, "NON_PROGRESSING_BEATS"), true);
  const meaningful = await compose();
  const current = meaningful.quality.transitions[2]!,
    previous = meaningful.quality.transitions[1]!;
  Object.assign(current, {
    strategy: previous.strategy,
    informationChange: "Count 2 blocks after counting 1 block",
    relationshipChange: previous.relationshipChange,
    consequence: previous.consequence,
  });
  meaningful.beats[2]!.action = meaningful.beats[1]!.action;
  assert.equal(high(meaningful, "NON_PROGRESSING_BEATS"), false);
});

test("duplicate participants are explicitly invalid even with a globally active two-person cast", async () => {
  const plan = await compose();
  assert.equal(plan.characters.length, 2);
  const resolution = plan.quality.transitions.find(
    (t) => t.beatId === plan.resolutionBeatId,
  )!;
  assert.equal(new Set(resolution.participantIds).size, 2);
  resolution.participantIds = [
    plan.characters[0]!.characterId,
    plan.characters[0]!.characterId,
  ];
  assert.equal(high(plan, "SOCIAL_INTENT_CAST_MISMATCH"), true);
});
