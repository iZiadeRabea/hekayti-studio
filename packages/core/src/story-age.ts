import {
  AppError,
  BlueprintSchema,
  SyntheticPersonalizationSchema,
  LanguageModeSchema,
  StoryObjectiveSchema,
  countWords,
  type StoryRequest,
  type StoryStructureProfile,
  type StoryConcept,
  type StoryBlueprint,
  type QaFinding,
  type BeatAction,
} from "@hekayti/contracts";
import { ageGuidance } from "./index";

const categories = [
  "educational",
  "behavioral",
  "values",
  "everyday-life",
  "bedtime",
  "emotional-learning",
  "adventure",
  "discovery",
  "early-learning",
];
const actions: BeatAction[] = [
  "recognize",
  "reveal",
  "repeat",
  "notice",
  "try",
  "compare",
  "ask-help",
  "cooperate",
  "discover",
  "solve",
  "return",
  "settle",
];
const recognitionActions: BeatAction[] = [
  "recognize",
  "reveal",
  "repeat",
  "notice",
  "settle",
];

// Validate only the frozen boundary here; full request schemas live in contracts/story.
function guidanceFor(request: StoryRequest) {
  if (
    !request ||
    request.schemaVersion !== "story-request/1.0" ||
    !categories.includes(request.primaryCategory) ||
    !["adult-read", "emerging-reader"].includes(request.readingMode) ||
    !Array.isArray(request.languageModes) ||
    !request.languageModes.length ||
    new Set(request.languageModes).size !== request.languageModes.length ||
    request.languageModes.some(
      (mode) => !LanguageModeSchema.safeParse(mode).success,
    ) ||
    !request.languageModes.includes(request.primaryLanguageMode) ||
    !SyntheticPersonalizationSchema.safeParse(request.personalization)
      .success ||
    !StoryObjectiveSchema.safeParse(request.objective).success ||
    !Array.isArray(request.outputIntents) ||
    request.outputIntents.some(
      (intent) => !["print", "digital", "video"].includes(intent),
    )
  )
    throw new AppError(
      "AGE_INPUT",
      "A supported synthetic story request is required for age guidance.",
    );
  if (
    !Number.isInteger(request.ageMonths) ||
    request.ageMonths < 0 ||
    request.ageMonths >= 96
  )
    throw new AppError(
      "AGE_UNSUPPORTED",
      "Use whole months from 0 to 95; older ages require a reviewed new profile.",
    );
  return ageGuidance({
    ageMonths: request.ageMonths,
    mode: request.primaryLanguageMode,
    category: request.primaryCategory,
    readingMode: request.readingMode,
  });
}

export function storyStructureFor(
  request: StoryRequest,
): StoryStructureProfile {
  const { profile: p, warnings } = guidanceFor(request);
  if (request.primaryCategory === "adventure" && !p.adventureEligible)
    throw new AppError(
      "AGE_ADVENTURE_INELIGIBLE",
      "Under-two adventure is blocked. Choose familiar recognition or a caregiver-supported routine instead.",
    );
  if (request.ageMonths < 24 && request.outputIntents.includes("video"))
    throw new AppError(
      "AGE_VIDEO_INELIGIBLE",
      "Under-two child-facing video is disabled. Choose print or caregiver-shared digital reading instead.",
    );
  const infant = p.id === "0-11m";
  const toddler = p.id === "12-23m";
  const causal = p.id === "24-35m";
  return {
    ageBandId: p.id,
    authority: p.authority,
    narrativeForm: infant
      ? "recognition"
      : toddler
        ? "routine"
        : causal
          ? "simple-causal"
          : p.id === "36-59m"
            ? "short-plot"
            : "extended-plot",
    conventionalPlot: !infant && !toddler,
    // Infant units are explicitly not p.events (which remains [0, 0]).
    beatRange: infant ? [3, 5] : [...p.events],
    activeCharacterRange: [...p.cast],
    pageRange: [...p.pages],
    wordsPerPage: [...p.wordsPerPage],
    sentenceWords: [...p.sentenceWords],
    allowedMechanisms: infant
      ? ["recognition", "reveal", "sound-play"]
      : toddler
        ? ["routine", "helping", "discovery"]
        : causal
          ? ["discovery", "problem-solving", "helping", "building"]
          : [
              "discovery",
              "problem-solving",
              "cooperation",
              "journey",
              "mystery",
              "treasure-hunt",
              "building",
              "helping",
            ],
    conflict: infant
      ? "none"
      : toddler || causal
        ? "supported-friction"
        : "bounded-problem",
    repetition: p.repetition,
    vocabulary: p.vocabulary,
    dialogue: p.dialogue,
    emotionalComplexity: p.emotions,
    adventure: p.adventure,
    educationalComplexity: p.education,
    parentParticipation: `${p.interaction}. ${p.narration}. Caregiver cues are optional and separate from child narration.`,
    durationGuidance:
      "Read at the child's pace, pause for response and stop freely. Use actual read-aloud review; there is no universal minutes-per-year rule or guaranteed attention duration.",
    warnings: [
      ...warnings,
      ...(request.readingMode === "emerging-reader"
        ? [
            "Emerging-reader mode is a selected reading context, not evidence of independent literacy or maturity.",
          ]
        : []),
    ],
  };
}

export function reviewStoryAge(
  request: StoryRequest,
  concept?: StoryConcept,
  blueprint?: StoryBlueprint,
): QaFinding[] {
  const findings: QaFinding[] = [];
  const add = (
    severity: QaFinding["severity"],
    category: string,
    location: string,
    message: string,
    suggestedAction: string,
  ) =>
    findings.push({
      findingId: `age-${findings.length + 1}`,
      severity,
      category,
      location,
      message,
      suggestedAction,
    });
  let structure: StoryStructureProfile;
  try {
    structure = storyStructureFor(request);
  } catch (error) {
    add(
      "blocker",
      "age-eligibility",
      "request",
      error instanceof Error ? error.message : "Invalid age input.",
      "Correct the request; hard eligibility gates cannot be waived by editorial overrides.",
    );
    return findings;
  }
  const p = guidanceFor(request).profile;
  const range = (
    value: number,
    bounds: readonly [number, number],
    location: string,
    label: string,
  ) => {
    if (value < bounds[0] || value > bounds[1])
      add(
        "medium",
        "age-budget",
        location,
        `${label} ${value} is outside the advisory range ${bounds[0]}–${bounds[1]}.`,
        "Review with an editor/caregiver; revise or document a justified editorial override without truncating automatically.",
      );
  };
  if (concept) {
    if (
      !Array.isArray(concept.outline) ||
      !Array.isArray(concept.characters) ||
      typeof concept.mechanism !== "string" ||
      typeof concept.coreChallenge !== "string" ||
      concept.outline.some(
        (beat) =>
          !beat ||
          !actions.includes(beat.action) ||
          !(beat.actorId === null || typeof beat.actorId === "string"),
      )
    ) {
      add(
        "blocker",
        "age-input",
        "concept",
        "Malformed semantic outline cannot be reviewed safely.",
        "Validate the concept against the frozen runtime contract.",
      );
      return findings;
    }
    if (
      concept.requestId !== request.requestId ||
      concept.requestRevisionId !== request.revisionId ||
      concept.primaryCategory !== request.primaryCategory
    )
      add(
        "blocker",
        "age-mismatch",
        "concept",
        "Concept request revision/category does not match the age-reviewed request.",
        "Regenerate or select a concept for this exact request revision.",
      );
    if (!structure.allowedMechanisms.includes(concept.mechanism))
      add(
        "high",
        "age-mechanism",
        "concept.mechanism",
        `Mechanism ${concept.mechanism} is outside this band's editorial categories.`,
        `Use ${structure.allowedMechanisms.join(", ")} or obtain explicit editorial review.`,
      );
    const unitCount =
      p.id === "0-11m"
        ? concept.outline.length
        : concept.outline.filter(
            (beat) => !["repeat", "settle"].includes(beat.action),
          ).length;
    range(
      unitCount,
      structure.beatRange,
      "concept.outline",
      p.id === "0-11m"
        ? "Recognition units (not plot events)"
        : "Visible narrative events (excluding repeated units and calm closing)",
    );
    const actorIds = new Set(
      concept.outline
        .map((beat) => beat.actorId)
        .filter((id): id is string => id !== null),
    );
    for (const character of concept.characters) {
      if (!character || typeof character.characterId !== "string") {
        add(
          "blocker",
          "age-input",
          "concept.characters",
          "Malformed cast cannot be counted safely.",
          "Validate character bibles before review.",
        );
        return findings;
      }
    }
    if (
      [...actorIds].some(
        (id) =>
          !concept.characters.some((character) => character.characterId === id),
      )
    )
      add(
        "blocker",
        "age-input",
        "concept.outline.actorId",
        "Active actor lacks a declared character bible.",
        "Resolve semantic actors before age review.",
      );
    range(actorIds.size, p.cast, "concept.characters", "Named active cast");
    if (
      p.id === "0-11m" &&
      concept.outline.some((beat) => !recognitionActions.includes(beat.action))
    )
      add(
        "high",
        "age-conflict",
        "concept.outline",
        "Infant recognition sequences contain conventional action/problem-solving events.",
        "Use recognition, reveal, repetition, noticing and calm closing; no conventional quest or problem is required.",
      );
    if (
      p.id === "12-23m" &&
      concept.outline.some((beat) =>
        ["solve", "cooperate", "return"].includes(beat.action),
      )
    )
      add(
        "high",
        "age-conflict",
        "concept.outline",
        "The toddler outline implies independent solving, cooperation or quest return beyond a familiar supported routine.",
        "Use a familiar action, small supported friction and visible caregiver help.",
      );
    // A narrow English metadata flag only: it never certifies arbitrary prose safe.
    if (
      /\b(peril|villain|danger|punishment|humiliation|quest)\b/iu.test(
        concept.coreChallenge,
      )
    )
      add(
        "high",
        "age-conflict",
        "concept.coreChallenge",
        "Challenge metadata contains conflict requiring human safety and age review.",
        "Inspect the actual meaning; replace peril or fear-based compliance with a bounded reassuring situation.",
      );
  }
  if (blueprint) {
    const parsed = BlueprintSchema.safeParse(blueprint);
    if (!parsed.success) {
      add(
        "blocker",
        "age-input",
        "blueprint",
        "Blueprint failed canonical runtime validation; age review cannot certify it.",
        "Correct canonical validation findings before further review.",
      );
      return findings;
    }
    if (
      blueprint.ageMonths !== request.ageMonths ||
      blueprint.ageBandId !== structure.ageBandId ||
      blueprint.primaryCategory !== request.primaryCategory ||
      blueprint.storyId !== request.storyId ||
      blueprint.projectId !== request.projectId
    )
      add(
        "blocker",
        "age-mismatch",
        "blueprint",
        "Blueprint age, band or story ownership differs from the request.",
        "Rebuild against the exact request and age profile.",
      );
    if (blueprint.ageMonths < 24 && blueprint.outputIntents.includes("video"))
      add(
        "blocker",
        "age-eligibility",
        "blueprint.outputIntents",
        "Under-two child-facing video is disabled by product policy.",
        "Use print or caregiver-shared digital reading; a parent-only production preview is a separate labelled workflow.",
      );
    if (!concept) {
      // Canonical prose beats contain no typed actor/action; do not pretend that
      // page subdivisions or free-text bibles establish active event counts.
      if (p.id === "0-11m")
        range(
          blueprint.meaningBeats.length,
          structure.beatRange,
          "blueprint.meaningBeats",
          "Recognition unit count",
        );
      add(
        "low",
        "age-semantic-review",
        "blueprint.meaningBeats",
        "Blueprint-only review cannot establish active actors or conventional events from free text.",
        "Supply the selected typed concept for structural review and inspect canonical meaning manually.",
      );
    } else if (
      blueprint.meaningBeats.length !== concept.outline.length ||
      blueprint.meaningBeats.some(
        (beat, i) => beat.beatId !== concept.outline[i]?.beatId,
      )
    )
      add(
        "blocker",
        "age-mismatch",
        "blueprint.meaningBeats",
        "Canonical beat mapping differs from the age-reviewed concept.",
        "Rebuild the canonical mapping without adding unreviewed events.",
      );
    range(
      blueprint.pagePlan.length,
      p.pages,
      "blueprint.pagePlan",
      "Story pages",
    );
    for (const edition of blueprint.languageVersions) {
      const counts = edition.pages.map((page) =>
        countWords(
          [page.narration, ...page.dialogue.map((line) => line.text)].join(" "),
        ),
      );
      range(
        counts.reduce((sum, count) => sum + count, 0),
        p.words,
        `blueprint.languageVersions.${edition.mode}`,
        "Measured story words",
      );
      counts.forEach((count, i) =>
        range(
          count,
          p.wordsPerPage,
          `blueprint.languageVersions.${edition.mode}.pages.${i}`,
          "Measured page words",
        ),
      );
      if (
        p.id === "0-11m" &&
        edition.pages.some((page) =>
          page.dialogue.some((line) => countWords(line.text) > 0),
        )
      )
        add(
          "low",
          "age-dialogue",
          `blueprint.languageVersions.${edition.mode}`,
          "Infant edition includes spoken dialogue; the profile suggests virtually none.",
          "Prefer caregiver labels and sound imitation; review any intentional dialogue.",
        );
    }
    if (!blueprint.parentParticipation?.trim())
      add(
        "medium",
        "age-adult-involvement",
        "blueprint.parentParticipation",
        "No optional caregiver participation guidance was recorded.",
        structure.parentParticipation,
      );
  }
  add(
    "low",
    "age-human-review",
    "age-profile",
    "Age structures and numeric budgets are provisional editorial guidance; personalization does not establish maturity or ability.",
    "Arrange native-language and qualified/caregiver review before production. Keep research evidence separate from editorial decisions.",
  );
  return findings;
}
