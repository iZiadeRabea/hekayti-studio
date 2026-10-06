import { emptyStoryDna, narrativePattern } from "@hekayti/core/dna";
export function enrichDna(item, first, last, entry, entries) {
  const dna = emptyStoryDna(),
    partial = item.openingOnly || entry?.incomplete;
  dna.fields.opening = {
    value: first,
    evidence: `${item.locator}: bounded opening observation`,
    confidence: "SOURCE_EXTRACTED",
  };
  if (!partial && !/papyrus breaks off/i.test(item.body))
    dna.fields.ending = {
      value: last,
      evidence: `${item.locator}: bounded closing observation, not an inferred resolution`,
      confidence: "SOURCE_EXTRACTED",
    };
  if (!entry) return dna;
  for (const [field, value] of Object.entries(entry))
    if (field in dna.fields) {
      dna.fields[field] =
        value === "NOT_AVAILABLE"
          ? { value: null, evidence: null, confidence: "NOT_AVAILABLE" }
          : {
              value,
              evidence: `${item.locator}: agent editorial paraphrase of observed source action, not qualified human review`,
              confidence: "EDITORIAL_INFERENCE",
            };
    }
  const chain = entry.chain ?? [];
  dna.causalLinks = chain
    .slice(1)
    .map((effect, i) => ({
      cause: chain[i],
      effect,
      evidence: `${item.locator}: sequential source-action abstraction; agent editorial inference`,
      confidence: "EDITORIAL_INFERENCE",
    }));
  const vector = entry.vector ?? entries[entry.patternLike]?.vector;
  if (vector)
    dna.pattern = narrativePattern(
      Object.fromEntries(
        [
          "goalCategory",
          "conflictCategory",
          "mechanism",
          "attemptSequence",
          "turn",
          "resolutionCategory",
        ].map((k, i) => [k, vector[i]]),
      ),
    );
  Object.assign(dna.dimensions, {
    plotDepth: entry.depth ?? "UNKNOWN",
    meaningBeats: chain.length ? [chain.length, chain.length] : null,
    repetition: entry.repetition ?? "UNKNOWN",
    parentParticipation: entry.parent ?? "UNKNOWN",
    ageFit:
      "Original is not age-approved; simplify causal chain and remove threats before child use.",
    styleVoice:
      "Historic narrative source; agent structural abstraction is not a reusable Arabic prose style.",
    basis: `Representative source-action enrichment from ${item.locator}; unmeasured cast/location/density/style dimensions remain unknown.`,
  });
  return dna;
}
