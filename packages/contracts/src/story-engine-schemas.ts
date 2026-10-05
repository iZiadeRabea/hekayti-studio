import { z } from "zod";
import {
  Id,
  AgeBandSchema,
  LanguageModeSchema,
  StoryObjectiveSchema,
  SyntheticPersonalizationSchema,
  CharacterBibleSchema,
  LanguageEditionSchema,
  countWords,
} from "./index";
import type {
  StoryRequest,
  TrustedFact,
  StoryStructureProfile,
  IdeaComponent,
  StoryBeat,
  StoryConcept,
  ConceptSet,
  ConceptEvaluation,
  StoryDraft,
  StoryQaReport,
} from "./index";

const text = z.string().min(1).max(2000);
const localized = z
  .object({ "ar-MSA-simple": text, "ar-EG": text, en: text })
  .strict();
const category = z.enum([
  "educational",
  "behavioral",
  "values",
  "everyday-life",
  "bedtime",
  "emotional-learning",
  "adventure",
  "discovery",
  "early-learning",
]);
const strategy = z.enum(["manual", "curated", "ai", "hybrid"]);
export const ProviderProvenanceSchema = z
  .object({
    kind: z.enum(["manual", "curated", "ai", "hybrid", "mock"]),
    providerId: Id,
    version: text,
    deterministic: z.boolean(),
  })
  .strict();
export const QaFindingSchema = z
  .object({
    findingId: Id,
    severity: z.enum(["blocker", "high", "medium", "low"]),
    category: text,
    location: text,
    message: text,
    suggestedAction: text,
  })
  .strict();
export const TrustedFactSchema: z.ZodType<TrustedFact> = z
  .object({
    factId: Id,
    statement: text,
    sourceReference: text,
    reviewStatus: z.enum(["unreviewed", "human-reviewed"]),
    reviewerAlias: text.nullable(),
  })
  .strict()
  .superRefine((f, c) => {
    if (f.reviewStatus === "human-reviewed" && !f.reviewerAlias)
      c.addIssue({
        code: "custom",
        path: ["reviewerAlias"],
        message: "Human-reviewed facts require a reviewer alias.",
      });
  });
export const StoryRequestSchema: z.ZodType<StoryRequest> = z
  .object({
    schemaVersion: z.literal("story-request/1.0"),
    requestId: Id,
    revisionId: Id,
    projectId: Id,
    storyId: Id,
    ageMonths: z.number().int().min(0).max(95),
    languageModes: z.array(LanguageModeSchema).min(1).max(3),
    primaryLanguageMode: LanguageModeSchema,
    primaryCategory: category,
    objective: StoryObjectiveSchema,
    theme: text,
    readingMode: z.enum(["adult-read", "emerging-reader"]),
    personalization: SyntheticPersonalizationSchema,
    sourceStrategy: strategy,
    trustedFacts: z.array(TrustedFactSchema).max(30),
    outputIntents: z
      .array(z.enum(["print", "digital", "video"]))
      .min(1)
      .max(3),
  })
  .strict()
  .superRefine((r, c) => {
    if (!r.languageModes.includes(r.primaryLanguageMode))
      c.addIssue({
        code: "custom",
        message: "Primary language must be declared.",
      });
    for (const values of [
      r.languageModes,
      r.outputIntents,
      r.trustedFacts.map((f) => f.factId),
    ])
      if (new Set(values).size !== values.length)
        c.addIssue({
          code: "custom",
          message: "Duplicate modes, outputs or facts are not allowed.",
        });
  });
const range = z
  .tuple([
    z.number().int().nonnegative().max(200),
    z.number().int().nonnegative().max(200),
  ])
  .refine((r) => r[0] <= r[1], "Range must be ordered.");
export const StoryStructureProfileSchema: z.ZodType<StoryStructureProfile> = z
  .object({
    ageBandId: AgeBandSchema,
    authority: z.literal("editorial-D/H"),
    narrativeForm: z.enum([
      "recognition",
      "routine",
      "simple-causal",
      "short-plot",
      "extended-plot",
    ]),
    conventionalPlot: z.boolean(),
    beatRange: range,
    activeCharacterRange: range,
    pageRange: range,
    wordsPerPage: range,
    sentenceWords: range,
    allowedMechanisms: z.array(text).min(1).max(30),
    conflict: z.enum(["none", "supported-friction", "bounded-problem"]),
    repetition: text,
    vocabulary: text,
    dialogue: text,
    emotionalComplexity: text,
    adventure: text,
    educationalComplexity: text,
    parentParticipation: text,
    durationGuidance: text,
    warnings: z.array(text).max(30),
  })
  .strict()
  .superRefine((s, c) => {
    if (!s.pageRange[0] || !s.beatRange[0])
      c.addIssue({
        code: "custom",
        message:
          "Page and recognition/meaning beat ranges must start above zero.",
      });
    if (
      s.narrativeForm === "recognition" &&
      (s.conventionalPlot || s.conflict !== "none")
    )
      c.addIssue({
        code: "custom",
        message: "Recognition units have no conventional plot or conflict.",
      });
  });
export const IdeaComponentSchema: z.ZodType<IdeaComponent> = z
  .object({
    componentId: Id,
    kind: z.enum([
      "theme",
      "objective",
      "setting",
      "character-archetype",
      "mechanism",
      "challenge",
      "conflict",
      "discovery",
      "resolution",
      "emotional-goal",
      "educational-goal",
    ]),
    label: localized,
    description: text,
  })
  .strict();
export const StoryBeatSchema: z.ZodType<StoryBeat> = z
  .object({
    beatId: Id,
    sequence: z.number().int().positive().max(200),
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
    focus: localized,
    detail: localized,
    emotion: text,
    beforeState: text,
    afterState: text,
    visibleFacts: z.array(text).min(1).max(30),
    factIds: z.array(Id).max(30),
  })
  .strict();
export const StoryConceptSchema: z.ZodType<StoryConcept> = z
  .object({
    conceptId: Id,
    requestId: Id,
    requestRevisionId: Id,
    title: text,
    premise: text,
    primaryCategory: category,
    objective: StoryObjectiveSchema,
    setting: localized,
    mainCharacterId: Id.nullable(),
    characters: z.array(CharacterBibleSchema).max(20),
    coreChallenge: text,
    resolutionDirection: text,
    ageFitSummary: text,
    mechanism: text,
    components: z.array(IdeaComponentSchema).min(1).max(40),
    outline: z.array(StoryBeatSchema).min(1).max(200),
    provenance: ProviderProvenanceSchema,
  })
  .strict()
  .superRefine((s, c) => {
    const chars = new Set(s.characters.map((x) => x.characterId));
    if (
      chars.size !== s.characters.length ||
      new Set(s.outline.map((b) => b.beatId)).size !== s.outline.length
    )
      c.addIssue({
        code: "custom",
        message: "Character and beat IDs must be unique.",
      });
    if (s.mainCharacterId !== null && !chars.has(s.mainCharacterId))
      c.addIssue({ code: "custom", message: "Main character must resolve." });
    s.outline.forEach((b, i) => {
      if (b.sequence !== i + 1)
        c.addIssue({
          code: "custom",
          path: ["outline", i],
          message: "Beats must be ordered and contiguous.",
        });
      if (b.actorId !== null && !chars.has(b.actorId))
        c.addIssue({
          code: "custom",
          path: ["outline", i, "actorId"],
          message: "Actor must resolve.",
        });
      if (i && b.beforeState !== s.outline[i - 1]!.afterState)
        c.addIssue({
          code: "custom",
          path: ["outline", i, "beforeState"],
          message: "State chain must remain continuous.",
        });
    });
  });
export const ConceptSetSchema: z.ZodType<ConceptSet> = z
  .object({
    schemaVersion: z.literal("concept-set/1.0"),
    conceptSetId: Id,
    requestId: Id,
    requestRevisionId: Id,
    generation: z.number().int().nonnegative().max(1000000),
    concepts: z.array(StoryConceptSchema).min(2).max(12),
  })
  .strict()
  .superRefine((s, c) => {
    if (new Set(s.concepts.map((x) => x.conceptId)).size !== s.concepts.length)
      c.addIssue({ code: "custom", message: "Concept IDs must be unique." });
    if (
      s.concepts.some(
        (x) =>
          x.requestId !== s.requestId ||
          x.requestRevisionId !== s.requestRevisionId,
      )
    )
      c.addIssue({
        code: "custom",
        message: "Concept ownership must match set.",
      });
  });
export const ConceptEvaluationSchema: z.ZodType<ConceptEvaluation> = z
  .object({
    conceptId: Id,
    structuralSignature: text,
    findings: z.array(QaFindingSchema).max(200),
    humanSelectionRequired: z.literal(true),
  })
  .strict();
export const StoryDraftSchema: z.ZodType<StoryDraft> = z
  .object({
    schemaVersion: z.literal("story-draft/1.0"),
    draftId: Id,
    sourceRevision: Id,
    conceptId: Id,
    editions: z.array(LanguageEditionSchema).min(1).max(3),
    provenance: ProviderProvenanceSchema,
    status: z.literal("draft"),
  })
  .strict()
  .superRefine((s, c) => {
    if (new Set(s.editions.map((e) => e.mode)).size !== s.editions.length)
      c.addIssue({ code: "custom", message: "Edition modes must be unique." });
    s.editions.forEach((e) => {
      if (e.status !== "draft" || e.sourceRevision !== s.sourceRevision)
        c.addIssue({
          code: "custom",
          message:
            "Draft editions must be unapproved and match source revision.",
        });
      const counts = e.pages.map((p) =>
        countWords([p.narration, ...p.dialogue.map((d) => d.text)].join(" ")),
      );
      if (
        e.pages.some((p, i) => p.wordCount !== counts[i]) ||
        e.totalWords !== counts.reduce((a, b) => a + b, 0)
      )
        c.addIssue({
          code: "custom",
          message: "Word totals must match measured prose.",
        });
      if (new Set(e.pages.map((p) => p.pageId)).size !== e.pages.length)
        c.addIssue({
          code: "custom",
          message: "Draft page IDs must be unique.",
        });
      if (
        e.pages.some((p, i) => p.pageId !== s.editions[0]!.pages[i]?.pageId) ||
        e.pages.length !== s.editions[0]!.pages.length
      )
        c.addIssue({
          code: "custom",
          message: "Edition page coverage and order must agree.",
        });
    });
  });
export const StoryQaReportSchema: z.ZodType<StoryQaReport> = z
  .object({
    reportId: Id,
    sourceRevision: Id,
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    findings: z.array(QaFindingSchema).max(200),
    humanReviewRequired: z.literal(true),
    method: z.literal("deterministic-advisory"),
  })
  .strict();
