import { readFileSync, writeFileSync } from "node:fs";
import { PlanningRequestSchema } from "@hekayti/contracts/planner";
import { LibraryStateSchema } from "@hekayti/contracts/library";
import { parseLibraryBatch } from "@hekayti/core/creative";
import {
  composeStoryPlan,
  composeQualityStoryPlan,
  validateStoryPlan,
} from "@hekayti/core/planner";
import { contentHash } from "@hekayti/core";
const planning = PlanningRequestSchema.parse(
    JSON.parse(
      readFileSync("examples/story-planner/quality-live-request.json", "utf8"),
    ),
  ),
  records = parseLibraryBatch(
    readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
  ),
  state = LibraryStateSchema.parse({
    schemaVersion: "library-state/1.0",
    recordVersion: 0,
    records,
    events: records.map((r) => ({
      eventId: `quality-live-${r.recordId}`,
      recordId: r.recordId,
      version: r.version,
      action: "CREATE",
      reviewerAlias: "synthetic-fixture",
      timestamp: "now",
    })),
    usage: [],
  }),
  ids = { planId: "quality-live-plan", revisionId: "quality-live-plan-1" },
  before = await composeStoryPlan(planning, state, ids),
  after = await composeQualityStoryPlan(planning, state, ids),
  qa = validateStoryPlan(after);
const result = {
  schemaVersion: "quality-live-regression/1.0",
  notice:
    "Exact owner-provided synthetic request; deterministic local engineering reproduction. No provider output, operational/human approval or literary/native/child-appeal certification.",
  corpus: {
    records: records.length,
    ready: records.filter((r) => r.creative?.culture.fit === "READY").length,
    mutated: false,
  },
  planning,
  before: {
    boundary: "Stable Phase4.2 legacy1.0 composer",
    plan: before,
    qa: validateStoryPlan(before),
    hash: await contentHash(before),
  },
  after: {
    boundary: "Current desktop planner-quality/1.0 opt-in / StoryPlan1.1",
    plan: after,
    qa,
    hash: await contentHash(after),
  },
  gates: {
    A: after.provenance.sourceMode !== "EDITORIAL_FALLBACK",
    B:
      !!after.provenance.selectedStoryFamilyId &&
      !!after.provenance.sources.length,
    C: ["STRONG", "ACCEPTABLE"].includes(
      after.quality.structuralCompatibility.level,
    ),
    D:
      (after.quality.transitions.find(
        (t) => t.beatId === after.resolutionBeatId,
      )?.participantIds.length ?? 0) >= 2,
    E: new Set(after.quality.transitions.map((t) => t.strategy)).size >= 4,
    F: /each child/.test(after.quality.situation.resolutionMethod),
    G: !after.goal.description.includes(planning.request.objective.description),
    H: !after.beats.some((b) =>
      /Approach \d|next visible clue/.test(b.summary),
    ),
    I: !qa.findings.some((f) => ["high", "blocker"].includes(f.severity)),
  },
  providerCalls: 0,
};
if (Object.values(result.gates).some((v) => !v))
  throw new Error("Exact live regression gate failed");
writeFileSync(
  "examples/story-planner/quality-live-regression.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `Exact live A–I PASS: ${after.quality.objectiveIntent.primaryIntent} / ${after.provenance.selectedStoryFamilyId} / ${after.provenance.sourceMode}`,
);
