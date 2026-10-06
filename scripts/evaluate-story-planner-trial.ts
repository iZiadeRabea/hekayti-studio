import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { BlueprintSchema, validate } from "@hekayti/contracts";
import {
  StoryPlanSchema,
  PlanResponseSchema,
} from "@hekayti/contracts/planner";
import { canonicalJson, contentHash } from "@hekayti/core";
import { planToConcept, validateStoryPlan } from "@hekayti/core/planner";
import { reviewStoryAge } from "@hekayti/core/age";
import { reviewStoryLanguage } from "@hekayti/core/language";
import { reviewStoryBlueprint } from "@hekayti/core/story";
import { manualBridgeProvenance } from "@hekayti/core/workflow";

const [caseId, responsePath] = process.argv.slice(2);
if (!caseId || !responsePath || !/^[0-9]{2}-[a-z0-9-]+$/.test(caseId))
  throw new Error(
    "Usage: node --import tsx scripts/evaluate-story-planner-trial.ts CASE_ID SYNTHETIC_RESPONSE.json",
  );
const dir = resolve("examples/story-planner/manual-trials", caseId),
  plan = validate(
    StoryPlanSchema,
    JSON.parse(readFileSync(join(dir, "plan.json"), "utf8")),
  ),
  blueprint = validate(
    BlueprintSchema,
    JSON.parse(readFileSync(join(dir, "blueprint.json"), "utf8")),
  ),
  raw = readFileSync(responsePath, "utf8");
if (
  new TextEncoder().encode(raw).length > 500000 ||
  /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u.test(raw)
)
  throw new Error(
    "Response exceeds byte limit or contains embedded bidi controls.",
  );
const out = validate(PlanResponseSchema, JSON.parse(raw)),
  r = plan.planning.request,
  concept = planToConcept(plan),
  hash = await contentHash(plan);
if (
  out.packageId !== `${caseId}-manual-trial` ||
  out.planRevisionId !== plan.revisionId ||
  out.planHash !== hash ||
  out.requestRevisionId !== r.revisionId ||
  out.objective !== r.objective.description ||
  canonicalJson(out.actors) !==
    canonicalJson(plan.characters.map((c) => c.characterId)) ||
  canonicalJson(out.majorBeatIds) !==
    canonicalJson(plan.beats.map((b) => b.beatId)) ||
  out.resolutionBeatId !== plan.resolutionBeatId ||
  out.draft.conceptId !== concept.conceptId ||
  out.draft.sourceRevision !== blueprint.revisionId ||
  canonicalJson(out.draft.provenance) !== canonicalJson(manualBridgeProvenance)
)
  throw new Error("Plan anchors/ownership/provenance drifted.");
const assembled = validate(BlueprintSchema, {
  ...blueprint,
  languageVersions: out.draft.editions,
});
const findings = [
  ...validateStoryPlan(plan).findings,
  ...reviewStoryLanguage(r, concept, assembled, out.draft.editions, true),
  ...reviewStoryAge(r, concept, assembled),
  ...reviewStoryBlueprint(r, concept, assembled),
];
console.log(
  JSON.stringify(
    {
      status: findings.some((f) => ["high", "blocker"].includes(f.severity))
        ? "BLOCKED"
        : "STRUCTURAL_CHECKS_PASSED_HUMAN_REVIEW_REQUIRED",
      caseId,
      planHash: hash,
      findings,
      operationalImport: false,
      approval: false,
      providerComparison: null,
      limitations: [
        "Declared anchors do not prove actual prose follows the plan.",
        "Inspect every page/beat and Arabic register manually.",
        "No native/literary/age/child-appeal/provider-quality certification.",
        "Standalone trial files are separate from live accepted packages; importing into the app requires its current accepted-plan package.",
      ],
    },
    null,
    2,
  ),
);
