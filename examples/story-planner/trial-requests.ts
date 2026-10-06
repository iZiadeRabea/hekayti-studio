import type { StoryRequest } from "@hekayti/contracts";
import type { PlanningRequest } from "@hekayti/contracts/planner";
const cases = [
  [
    "01-infant-msa-recognition",
    8,
    "ar-MSA-simple",
    "early-learning",
    "connection",
    "Familiar soft ball",
    "Shared attention to a soft ball and repeated sound",
  ],
  [
    "02-infant-eg-bedtime",
    10,
    "ar-EG",
    "bedtime",
    "connection",
    "A warm goodnight routine",
    "Notice the same familiar blanket and settle with caregiver",
  ],
  [
    "03-toddler-msa-routine",
    18,
    "ar-MSA-simple",
    "everyday-life",
    "behavioral",
    "Putting a toy in its basket",
    "Try one familiar action with caregiver support",
  ],
  [
    "04-toddler-eg-education",
    22,
    "ar-EG",
    "educational",
    "educational",
    "Big and small cups",
    "Notice a visible size difference with adult naming",
  ],
  [
    "05-two-year-eg-turns",
    30,
    "ar-EG",
    "behavioral",
    "behavioral",
    "Taking turns",
    "Wait briefly and take a supported turn with the same toy",
  ],
  [
    "06-preschool-msa-sharing",
    48,
    "ar-MSA-simple",
    "values",
    "behavioral",
    "Sharing materials",
    "Two friends use the same materials together",
  ],
  [
    "07-preschool-eg-adventure",
    52,
    "ar-EG",
    "adventure",
    "entertainment",
    "A supervised garden discovery",
    "Follow visible clues with a companion and return reassured",
  ],
  [
    "08-older-msa-education",
    72,
    "ar-MSA-simple",
    "educational",
    "educational",
    "Sorting familiar leaves",
    "Compare visible features and explain one simple grouping",
  ],
] as const;
export const trialRequests: PlanningRequest[] = cases.map(
  (
    [id, ageMonths, mode, primaryCategory, kind, description, successScenario],
    i,
  ) => ({
    schemaVersion: "planning-request/1.0",
    planningRevisionId: `${id}-planning`,
    request: {
      schemaVersion: "story-request/1.0",
      requestId: `${id}-request`,
      revisionId: `${id}-request-r1`,
      projectId: `${id}-project`,
      storyId: `${id}-story`,
      ageMonths,
      languageModes: [mode],
      primaryLanguageMode: mode,
      primaryCategory,
      objective: { kind, description, successScenario },
      theme: description,
      readingMode: "adult-read",
      personalization: {
        origin: "synthetic",
        profileId: "synthetic-trial",
        level: 0,
        preferences: [],
        heroMode: "none",
      },
      sourceStrategy: "hybrid",
      trustedFacts: [],
      outputIntents: ["print", "digital"],
    } satisfies StoryRequest,
    profile: "EGYPTIAN_ARAB_MUSLIM_FAMILY",
    variation:
      i === 4
        ? "NewVariant"
        : i === 5
          ? "SimilarVersion"
          : i === 7
            ? "CompletelyNew"
            : "FreshConcept",
    generation: i,
    selectedFamily: null,
    selectedCharacter: null,
    selectedSetting: null,
    constraints: [
      "Synthetic-only fictional story. No private identifying details; no unsolicited religious lesson.",
    ],
    inspirationReviewed: true,
    adaptationAcknowledged: true,
    sensitiveOptIn: false,
    religiousOptIn: false,
  }),
);
