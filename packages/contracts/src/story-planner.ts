import { z } from "zod";
import { Id, CharacterBibleSchema, LanguageModeSchema } from "./index";
import {
  StoryRequestSchema,
  StoryStructureProfileSchema,
  StoryConceptSchema,
  StoryDraftSchema,
  QaFindingSchema,
} from "./story-engine-schemas";
import {
  LibraryRefSchema,
  VariationSchema,
  ConsumerTargetSchema,
  EditorialScoresSchema,
  CulturalProfileSchema,
} from "./library";

const text = z.string().trim().min(1).max(2000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const PlanningRequestSchema = z
  .object({
    schemaVersion: z.literal("planning-request/1.0"),
    planningRevisionId: Id,
    request: StoryRequestSchema,
    profile: CulturalProfileSchema.default("EGYPTIAN_ARAB_MUSLIM_FAMILY"),
    variation: VariationSchema,
    generation: z.number().int().min(0).max(1000000),
    selectedFamily: LibraryRefSchema.nullable(),
    selectedCharacter: CharacterBibleSchema.nullable(),
    selectedSetting: text.nullable(),
    constraints: z.array(text).max(20),
    inspirationReviewed: z.boolean(),
    adaptationAcknowledged: z.boolean(),
    sensitiveOptIn: z.boolean(),
    religiousOptIn: z.boolean(),
  })
  .strict();
export type PlanningRequest = z.infer<typeof PlanningRequestSchema>;
export const DerivedBlockSchema = z
  .object({
    blockId: Id,
    kind: z.enum([
      "goal",
      "protagonist",
      "setting",
      "mechanism",
      "conflict",
      "attempt",
      "turn",
      "resolution",
      "emotion",
      "ending",
    ]),
    value: text,
    source: LibraryRefSchema,
    sourceField: text,
    basis: z.literal("DERIVED_EDITORIAL_ABSTRACTION_NOT_SOURCE_FACT"),
  })
  .strict();
export type DerivedBlock = z.infer<typeof DerivedBlockSchema>;
const PlanBeatSchema = z
  .object({
    beatId: Id,
    sequence: z.number().int().positive().max(200),
    role: z.enum([
      "OPENING",
      "INCITING",
      "ATTEMPT",
      "TURN",
      "RESOLUTION",
      "ENDING",
      "RECOGNITION",
      "REPEAT",
    ]),
    action: z.enum([
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
    ]),
    actorId: Id.nullable(),
    locationId: Id,
    fromLocationId: Id.nullable(),
    beforeState: text,
    afterState: text,
    summary: text,
    emotion: text,
    causes: z.array(Id).max(20),
    setupRefs: z.array(Id).max(20),
    introduces: z.array(Id).max(20),
    requires: z.array(Id).max(20),
    establishes: z.array(Id).max(20),
    addressesProblemId: Id.nullable(),
    achievesGoalId: Id.nullable(),
    progress: text,
  })
  .strict();
export const LegacyStoryPlanSchema = z
  .object({
    schemaVersion: z.literal("story-plan/1.0"),
    planId: Id,
    revisionId: Id,
    planning: PlanningRequestSchema,
    title: text,
    protagonistId: Id.nullable(),
    recognitionSubject: text.nullable(),
    goal: z.object({ goalId: Id, description: text }).strict(),
    need: text.nullable(),
    setting: z.object({ locationId: Id, description: text }).strict(),
    openingState: text,
    problem: z.object({ problemId: Id, description: text }).strict().nullable(),
    stakes: text.nullable(),
    incitingBeatId: Id.nullable(),
    turningBeatId: Id.nullable(),
    climaxBeatId: Id.nullable(),
    discovery: text.nullable(),
    characters: z.array(CharacterBibleSchema).max(20),
    beats: z.array(PlanBeatSchema).min(1).max(200),
    resolutionBeatId: Id,
    endingBeatId: Id,
    emotionalArc: text,
    guidance: StoryStructureProfileSchema,
    languageGuidance: z.array(text).min(1).max(10),
    provenance: z
      .object({
        selectedStoryFamilyId: Id.nullable(),
        selectedPatternId: text.nullable(),
        sourceDnaIds: z.array(Id).max(30),
        sources: z
          .array(
            z
              .object({
                ref: LibraryRefSchema,
                digest: hash,
                lifecycle: text,
                fit: text,
                provisional: z.boolean(),
              })
              .strict(),
          )
          .max(30),
        derivedBlocks: z.array(DerivedBlockSchema).max(100),
        sourceMode: z.enum([
          "PROMOTED_LIBRARY",
          "ACKNOWLEDGED_PROVISIONAL",
          "EDITORIAL_FALLBACK",
        ]),
        mechanism: text,
        patternVector: z
          .object({
            goalCategory: text,
            conflictCategory: text,
            mechanism: text,
            attemptSequence: text,
            turn: text,
            resolutionCategory: text,
          })
          .strict()
          .nullable(),
        selectionSignals: z.array(text).max(30),
        limitations: z.array(text).max(30),
      })
      .strict(),
  })
  .strict();
export const ObjectiveIntentSchema = z
  .object({
    schemaVersion: z.literal("objective-intent/1.0"),
    primaryIntent: z.enum([
      "SHARING_TURN_TAKING",
      "COOPERATION_HELPING",
      "EMOTIONAL_REGULATION",
      "ROUTINE_HABIT",
      "LEARNING_DISCOVERY",
      "CONNECTION_REPAIR",
      "GENERAL_BEHAVIORAL",
      "GENERAL_EDUCATIONAL",
      "GENERAL_EMOTIONAL",
      "GENERAL_ENTERTAINMENT",
    ]),
    evidence: z
      .array(
        z
          .object({
            field: z.enum(["kind", "description", "successScenario"]),
            matched: text,
          })
          .strict(),
      )
      .min(1)
      .max(10),
    socialMechanisms: z.array(text).max(5),
    storyNeeds: z.array(text).max(8),
    limited: z.boolean(),
  })
  .strict();
export type ObjectiveIntent = z.infer<typeof ObjectiveIntentSchema>;
export const StructuralCompatibilitySchema = z
  .object({
    level: z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "MISMATCH"]),
    evidence: z
      .array(z.object({ field: text, matched: text }).strict())
      .max(30),
    reasons: z.array(text).min(1).max(10),
  })
  .strict();
export type StructuralCompatibility = z.infer<
  typeof StructuralCompatibilitySchema
>;
export const PlannerQualitySchema = z
  .object({
    schemaVersion: z.literal("planner-quality/1.0"),
    objectiveIntent: ObjectiveIntentSchema,
    structuralCompatibility: StructuralCompatibilitySchema,
    situation: z
      .object({
        focus: text,
        initialFriction: text.nullable(),
        resolutionMethod: text,
        basis: z.literal("EDITORIAL_SITUATION_NOT_SOURCE_FACT"),
      })
      .strict(),
    transitions: z
      .array(
        z
          .object({
            beatId: Id,
            participantIds: z.array(Id).max(20),
            strategy: text,
            informationChange: text,
            relationshipChange: text,
            consequence: text,
            resolutionMethod: text.nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();
export const QualityStoryPlanSchema = LegacyStoryPlanSchema.extend({
  schemaVersion: z.literal("story-plan/1.1"),
  quality: PlannerQualitySchema,
});
export const CategoryIntentSchema = z
  .object({
    schemaVersion: z.literal("category-intent/1.0"),
    category: z.enum([
      "educational",
      "behavioral",
      "values",
      "everyday-life",
      "bedtime",
      "emotional-learning",
      "adventure",
      "discovery",
      "early-learning",
    ]),
    signature: text,
    storyNeeds: z.array(text).min(1).max(8),
  })
  .strict();
export const WriterStoryPlanSchema = QualityStoryPlanSchema.extend({
  schemaVersion: z.literal("story-plan/1.2"),
  quality: PlannerQualitySchema.extend({
    categoryIntent: CategoryIntentSchema,
  }),
});
export const StoryPlanSchema = z.union([
  LegacyStoryPlanSchema,
  QualityStoryPlanSchema,
  WriterStoryPlanSchema,
]);
export type StoryPlan = z.infer<typeof StoryPlanSchema>;
export const LegacyPlanQaSchema = z
  .object({
    schemaVersion: z.literal("plan-qa/1.0"),
    planRevisionId: Id,
    findings: z.array(QaFindingSchema).max(200),
    signals: z
      .object({
        AgeFit: z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "FAIL"]),
        CausalCoherence: z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "FAIL"]),
        ObjectiveAlignment: z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "FAIL"]),
        CulturalFit: z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "FAIL"]),
        StructuralCompleteness: z.enum([
          "STRONG",
          "ACCEPTABLE",
          "REVIEW",
          "FAIL",
        ]),
        VariationCompliance: z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "FAIL"]),
      })
      .strict(),
    method: z.literal("DETERMINISTIC_EDITORIAL_ADVISORY"),
    humanReviewRequired: z.literal(true),
  })
  .strict();
const qualitySignal = z.enum(["STRONG", "ACCEPTABLE", "REVIEW", "FAIL"]);
export const QualityPlanQaSchema = LegacyPlanQaSchema.extend({
  schemaVersion: z.literal("plan-qa/1.1"),
  signals: LegacyPlanQaSchema.shape.signals.extend({
    ObjectiveIntentFit: qualitySignal,
    StructuralCompatibility: qualitySignal,
    BeatProgression: qualitySignal,
    SituationSpecificity: qualitySignal,
    ResolutionSpecificity: qualitySignal,
  }),
});
export const WriterPlanQaSchema = QualityPlanQaSchema.extend({
  schemaVersion: z.literal("plan-qa/1.2"),
  signals: QualityPlanQaSchema.shape.signals.extend({
    CategoryPresence: qualitySignal,
  }),
});
export const PlanQaSchema = z.union([
  LegacyPlanQaSchema,
  QualityPlanQaSchema,
  WriterPlanQaSchema,
]);
export type PlanQa = z.infer<typeof PlanQaSchema>;
export const PlanAcceptanceSchema = z
  .object({
    acceptanceId: Id,
    planRevisionId: Id,
    planHash: hash,
    requestRevisionId: Id,
    reviewerAlias: text,
    acceptedAt: text,
    advisoryAcknowledged: z.literal(true),
  })
  .strict();
export const PlannedConceptSetSchema = z
  .object({
    schemaVersion: z.literal("planned-concept-set/1.0"),
    conceptSetId: Id,
    requestId: Id,
    requestRevisionId: Id,
    generation: z.number().int().nonnegative().max(1000000),
    concepts: z.array(StoryConceptSchema).length(1),
  })
  .strict();
export const PlannerWorkflowSourceSchema = z
  .object({
    plan: StoryPlanSchema,
    acceptance: PlanAcceptanceSchema,
    concept: StoryConceptSchema,
  })
  .strict();
export const LegacyPlanPackageSchema = z
  .object({
    schemaVersion: z.literal("plan-package/1.0"),
    packageId: Id,
    createdAt: text,
    plan: StoryPlanSchema,
    acceptance: PlanAcceptanceSchema,
    blueprintRevisionId: Id,
    conceptId: Id,
    fixedStructure: z.array(text).min(1).max(30),
    proseFreedom: z.array(text).min(1).max(20),
    outputSchemaVersion: z.literal("plan-response/1.0"),
    humanReviewRequired: z.literal(true),
  })
  .strict();
export const WriterPlanPackageSchema = LegacyPlanPackageSchema.extend({
  schemaVersion: z.literal("plan-package/1.1"),
  outputSchemaVersion: z.literal("writer-response/1.0"),
});
export const PlanPackageSchema = z.union([
  LegacyPlanPackageSchema,
  WriterPlanPackageSchema,
]);
export type PlanPackage = z.infer<typeof PlanPackageSchema>;
export const WriterResponseSchema = z
  .object({
    schemaVersion: z.literal("writer-response/1.0"),
    editions: z
      .array(
        z
          .object({
            mode: LanguageModeSchema,
            pages: z
              .array(
                z
                  .object({
                    pageNumber: z.number().int().positive().max(200),
                    narration: z.string().max(20000),
                    dialogue: z
                      .array(
                        z
                          .object({
                            speaker: z.string().trim().min(1).max(200),
                            text: z.string().min(1).max(20000),
                          })
                          .strict(),
                      )
                      .max(200),
                    altText: z.string().max(20000),
                  })
                  .strict(),
              )
              .min(1)
              .max(200),
          })
          .strict(),
      )
      .min(1)
      .max(3),
  })
  .strict();
export type WriterResponse = z.infer<typeof WriterResponseSchema>;
export type WriterDiagnostic = {
  code: string;
  message: string;
  mode?: z.infer<typeof LanguageModeSchema>;
  pageNumber?: number;
  speaker?: string;
};
export type WriterPreview = {
  status: "READY" | "REVIEW" | "FAIL";
  diagnostics: WriterDiagnostic[];
  editions: {
    mode: z.infer<typeof LanguageModeSchema>;
    pageCount: number;
    totalWords: number;
  }[];
};
export const PlanResponseSchema = z
  .object({
    schemaVersion: z.literal("plan-response/1.0"),
    packageId: Id,
    planRevisionId: Id,
    planHash: hash,
    requestRevisionId: Id,
    objective: text,
    actors: z.array(Id).max(20),
    majorBeatIds: z.array(Id).min(1).max(200),
    resolutionBeatId: Id,
    draft: StoryDraftSchema,
  })
  .strict();
export const PlanFeedbackSchema = z
  .object({
    feedbackId: Id,
    planRevisionId: Id,
    requestRevisionId: Id,
    draftId: Id,
    reportId: Id,
    approvalId: Id.nullable(),
    outcome: z.enum(["APPROVED", "EDITED", "REJECTED"]),
    reviewerAlias: text,
    notes: text,
    ratings: EditorialScoresSchema,
    logic: z.number().int().min(1).max(5).optional(),
    culturalFit: z.number().int().min(1).max(5).optional(),
    timestamp: text,
    humanReviewAcknowledged: z.literal(true),
  })
  .strict();
export type PlanFeedback = z.infer<typeof PlanFeedbackSchema>;
export const PlannerSnapshotSchema = z
  .object({
    schemaVersion: z.literal("planner-state/1.0"),
    projectId: Id,
    recordVersion: z.number().int().nonnegative(),
    plans: z.array(StoryPlanSchema).max(1000),
    acceptances: z.array(PlanAcceptanceSchema).max(1000),
    packages: z.array(PlanPackageSchema).max(1000),
    feedback: z.array(PlanFeedbackSchema).max(1000),
    currentPlanRevisionId: Id.nullable(),
    currentAcceptanceId: Id.nullable(),
  })
  .strict()
  .superRefine((s, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    for (const ids of [
      s.plans.map((p) => p.revisionId),
      s.acceptances.map((a) => a.acceptanceId),
      s.packages.map((p) => p.packageId),
      s.feedback.map((f) => f.feedbackId),
    ])
      if (new Set(ids).size !== ids.length)
        fail("Planner artifact identities must be unique.");
    for (const p of s.plans)
      if (p.planning.request.projectId !== s.projectId)
        fail("Plan project mismatch.");
    for (const a of s.acceptances) {
      const p = s.plans.find((p) => p.revisionId === a.planRevisionId);
      if (!p || p.planning.request.revisionId !== a.requestRevisionId)
        fail("Acceptance source missing.");
    }
    for (const p of s.packages)
      if (
        !s.acceptances.some(
          (a) => JSON.stringify(a) === JSON.stringify(p.acceptance),
        ) ||
        !s.plans.some((plan) => JSON.stringify(plan) === JSON.stringify(p.plan))
      )
        fail("Package frozen sources differ.");
    for (const f of s.feedback)
      if (
        !s.plans.some(
          (p) =>
            p.revisionId === f.planRevisionId &&
            p.planning.request.revisionId === f.requestRevisionId,
        )
      )
        fail("Feedback plan missing.");
    if (
      s.currentPlanRevisionId &&
      s.plans.at(-1)?.revisionId !== s.currentPlanRevisionId
    )
      fail("Current plan must be the latest retained revision.");
    if (
      s.currentAcceptanceId &&
      !s.acceptances.some(
        (a) =>
          a.acceptanceId === s.currentAcceptanceId &&
          a.planRevisionId === s.currentPlanRevisionId,
      )
    )
      fail("Current acceptance mismatch.");
  });
export type PlannerSnapshot = z.infer<typeof PlannerSnapshotSchema>;
export { ConsumerTargetSchema };
