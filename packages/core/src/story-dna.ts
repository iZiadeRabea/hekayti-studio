import { AppError, validate } from "@hekayti/contracts";
import {
  StoryDnaSchema,
  dnaFields,
  type StoryDna,
  type LibraryState,
} from "@hekayti/contracts/library";
import {
  libraryStatisticsByRecord,
  latestLibraryRecords,
} from "./story-library";
import { canonicalJson } from "./index";
export function emptyStoryDna(): StoryDna {
  return {
    schemaVersion: "story-dna/1.0",
    fields: Object.fromEntries(
      dnaFields.map((k) => [
        k,
        { value: null, evidence: null, confidence: "UNKNOWN" },
      ]),
    ) as StoryDna["fields"],
    causalLinks: [],
    pattern: null,
    dimensions: {
      majorCharacters: null,
      meaningBeats: null,
      locations: null,
      plotDepth: "UNKNOWN",
      dialogueDensity: "UNKNOWN",
      narrationDensity: "UNKNOWN",
      repetition: "UNKNOWN",
      twist: "UNKNOWN",
      emotionalComplexity: "UNKNOWN",
      adventure: "UNKNOWN",
      parentParticipation: "UNKNOWN",
      ageFit: null,
      styleVoice: null,
      sentenceVocabulary: null,
      directDescriptive: null,
      tone: null,
      bedtimeReadAloud: null,
      basis:
        "No verified measurement or qualified reviewer; unspecified dimensions remain unknown.",
      confidence: "PROVISIONAL_EDITORIAL_INFERENCE",
    },
  };
}
export function narrativePattern(input: {
  goalCategory: string;
  conflictCategory: string;
  mechanism: string;
  attemptSequence: string;
  turn: string;
  resolutionCategory: string;
}): NonNullable<StoryDna["pattern"]> {
  if (
    Object.values(input).some(
      (x) =>
        !x.trim() || ["unknown", "not_available"].includes(x.toLowerCase()),
    )
  )
    throw new AppError(
      "DNA_PATTERN",
      "A pattern requires substantive structural categories, not names/themes/settings or unknowns.",
    );
  const signature = canonicalJson(input);
  let n = 0x811c9dc5;
  for (const c of signature)
    n = Math.imul(n ^ c.charCodeAt(0), 0x01000193) >>> 0;
  return {
    patternId: `pattern-${n.toString(16).padStart(8, "0")}`,
    signature,
    ...input,
    basis: "EDITORIAL_STRUCTURAL_GROUPING_NOT_TRADITIONAL_TALE_TYPE",
  };
}
export function storyDnaAdvisories(input: StoryDna) {
  const d = validate(StoryDnaSchema, input),
    flags: { code: string; message: string }[] = [];
  if (
    d.fields.problem.value &&
    (!d.fields.resolution.value || !d.causalLinks.length)
  )
    flags.push({
      code: "MISSING_RESOLUTION_LINK",
      message:
        "Problem has no evidenced causal resolution link; review rather than invent.",
    });
  if (
    d.fields.resolution.value &&
    !d.fields.opening.value &&
    !d.fields.incitingEvent.value
  )
    flags.push({
      code: "UNSETUP_SOLUTION",
      message: "Resolution has no evidenced setup.",
    });
  if (d.fields.goal.value && !d.fields.ending.value)
    flags.push({
      code: "DISAPPEARING_GOAL",
      message: "Goal-to-ending binding unavailable.",
    });
  if (
    d.causalLinks.some(
      (link, i) => i > 0 && d.causalLinks[i - 1]!.effect !== link.cause,
    )
  )
    flags.push({
      code: "CAUSAL_JUMP",
      message:
        "Causal observations do not form a connected chain; may be incomplete extraction.",
    });
  if (d.causalLinks.some((l) => l.cause === l.effect))
    flags.push({
      code: "CONTRADICTION_OR_NO_CHANGE",
      message:
        "An observed transition repeats the same state; check its meaning.",
    });
  if (d.fields.attemptSequence.value && !d.causalLinks.length)
    flags.push({
      code: "DISCONNECTED_BEATS",
      message: "Attempts lack explicit cause/effect evidence.",
    });
  return flags;
}
export function patternFeedback(state: LibraryState, patternId: string) {
  const records = latestLibraryRecords(state).filter(
      (r) => r.creative?.dna?.pattern?.patternId === patternId,
    ),
    totals = {
      timesUsed: 0,
      approvedCount: 0,
      rejectedCount: 0,
      variantsCreated: 0,
    },
    ratings: Record<string, number[]> = {};
  const scored = new Set(
      state.events.filter((e) => e.action === "SCORE").map((e) => e.recordId),
    ),
    statistics = libraryStatisticsByRecord(state);
  for (const r of records) {
    const stats = statistics.get(r.recordId)!;
    for (const k of Object.keys(totals) as (keyof typeof totals)[])
      totals[k] += stats[k];
    if (scored.has(r.recordId))
      for (const [key, n] of Object.entries(r.scores ?? {}))
        (ratings[key] ??= []).push(n);
  }
  return {
    patternId,
    records: records.length,
    ...totals,
    averageRatings: Object.fromEntries(
      Object.entries(ratings).map(([k, v]) => [
        k,
        { count: v.length, average: v.reduce((a, b) => a + b, 0) / v.length },
      ]),
    ),
    notes: records.flatMap((r) =>
      scored.has(r.recordId) && r.editorialNote
        ? [{ recordId: r.recordId, note: r.editorialNote }]
        : [],
    ),
    authority:
      "Actual persisted user events/ratings only; imported historical summaries not counted",
  };
}
