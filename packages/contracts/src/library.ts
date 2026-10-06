import { z } from "zod";
import { CreativeMetadataSchema } from "./library-metadata";
export * from "./library-metadata";
import { Id, AgeBandSchema, StoryObjectiveSchema } from "./index";
import {
  StoryConceptSchema,
  IdeaComponentSchema,
  StoryRequestSchema,
  StoryStructureProfileSchema,
} from "./story-engine-schemas";

const text = z.string().trim().min(1).max(2000);
export const LibraryStatusSchema = z.enum([
  "GENERATED",
  "SAVED",
  "REVIEWED",
  "APPROVED",
  "PROMOTED_TO_LIBRARY",
  "ARCHIVED",
]);
export const ConsumerTargetSchema = z.enum(["CHATGPT", "GEMINI", "GENERIC"]);
export const VariationSchema = z.enum([
  "SimilarVersion",
  "NewVariant",
  "FreshConcept",
  "CompletelyNew",
]);
export const OperatorMetadataSchema = z
  .object({
    sourceType: z.enum([
      "CURATED",
      "AI",
      "HYBRID",
      "HUMAN",
      "SYNTHETIC_HEKAYTI",
    ]),
    sourceProvider: z.enum(["CHATGPT", "GEMINI", "OTHER", "MANUAL"]),
    providerNote: text.nullable(),
    modelNote: text.nullable(),
  })
  .strict();
export const LibraryRefSchema = z
  .object({ recordId: Id, version: z.number().int().positive() })
  .strict();
const family = z
  .object({
    narrativePattern: text,
    mechanism: text,
    conflictPattern: text,
    resolutionPattern: text,
    emotionalArc: text,
    reusableConstraints: z.array(text).max(30),
  })
  .strict();
const payload = z.discriminatedUnion("type", [
  z.object({ type: z.literal("IDEA_SEED"), idea: text }).strict(),
  z
    .object({ type: z.literal("STORY_CONCEPT"), concept: StoryConceptSchema })
    .strict(),
  z.object({ type: z.literal("STORY_FAMILY"), structure: family }).strict(),
  z
    .object({ type: z.literal("BUILDING_BLOCK"), block: IdeaComponentSchema })
    .strict(),
  z
    .object({
      type: z.literal("APPROVED_STORY_REFERENCE"),
      concept: StoryConceptSchema,
      projectId: Id,
      approvalId: Id,
      reportId: Id,
      contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
]);
export const EditorialScoresSchema = z
  .object({
    StoryQuality: z.number().int().min(1).max(5).optional(),
    AgeFit: z.number().int().min(1).max(5).optional(),
    LanguageQuality: z.number().int().min(1).max(5).optional(),
    Creativity: z.number().int().min(1).max(5).optional(),
    ObjectiveFit: z.number().int().min(1).max(5).optional(),
    ReusePotential: z.number().int().min(1).max(5).optional(),
  })
  .strict();
export const LibraryRecordSchema = z
  .object({
    schemaVersion: z.literal("library-record/1.0"),
    recordId: Id,
    version: z.number().int().positive(),
    title: text,
    creative: CreativeMetadataSchema.optional(),
    payload,
    status: LibraryStatusSchema,
    metadata: OperatorMetadataSchema,
    tags: z
      .object({
        ageBands: z.array(AgeBandSchema).max(5),
        storyTypes: z
          .array(
            z.enum([
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
          )
          .max(10),
        themes: z.array(text).max(30),
        objectives: z
          .array(
            z.enum([
              "educational",
              "behavioral",
              "emotional",
              "connection",
              "entertainment",
            ]),
          )
          .max(5),
        mechanism: text,
      })
      .strict(),
    family: LibraryRefSchema.nullable(),
    variantId: Id.nullable(),
    variantNumber: z.number().int().positive().nullable(),
    derivedFrom: LibraryRefSchema.nullable(),
    scores: EditorialScoresSchema.nullable(),
    editorialNote: text.nullable(),
    origin: z
      .object({
        transport: z.enum([
          "human-authored",
          "manual-paste",
          "synthetic-starter",
          "approved-workflow",
          "planner-derived",
        ]),
        importId: Id.nullable(),
        packageId: Id.nullable(),
      })
      .strict(),
  })
  .strict()
  .superRefine((r, c) => {
    if (
      Boolean(r.family) !== Boolean(r.variantId) ||
      Boolean(r.family) !== Boolean(r.variantNumber)
    )
      c.addIssue({
        code: "custom",
        message:
          "Family variants require family, variantId and number together.",
      });
    if (r.payload.type === "STORY_FAMILY" && r.family)
      c.addIssue({
        code: "custom",
        message: "A structural family cannot itself be a variant.",
      });
  });
export type LibraryRecord = z.infer<typeof LibraryRecordSchema>;
export const LibraryEventSchema = z
  .object({
    eventId: Id,
    recordId: Id,
    version: z.number().int().positive(),
    action: z.enum([
      "CREATE",
      "SAVE",
      "REVIEW",
      "APPROVE",
      "PROMOTE",
      "ARCHIVE",
      "SCORE",
      "LINK_VARIANT",
    ]),
    reviewerAlias: text,
    timestamp: text,
  })
  .strict();
export const UsageEventSchema = z
  .object({
    eventId: Id,
    record: LibraryRefSchema,
    projectId: Id,
    requestRevisionId: Id,
    outcome: z.enum(["USED", "APPROVED", "REJECTED"]),
    timestamp: text,
  })
  .strict();
export const LibraryStateSchema = z
  .object({
    schemaVersion: z.literal("library-state/1.0"),
    recordVersion: z.number().int().nonnegative(),
    records: z.array(LibraryRecordSchema).max(10000),
    events: z.array(LibraryEventSchema).max(30000),
    usage: z.array(UsageEventSchema).max(30000),
  })
  .strict()
  .superRefine((s, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    const refs = new Map(
      s.records.map((r, index) => [`${r.recordId}:${r.version}`, { r, index }]),
    );
    const resolve = (ref: z.infer<typeof LibraryRefSchema>) =>
      refs.get(`${ref.recordId}:${ref.version}`);
    const events = new Set(s.events.map((e) => `${e.recordId}:${e.version}`));
    if (refs.size !== s.records.length)
      fail("Record revisions must be unique.");
    if (
      new Set(s.events.map((e) => e.eventId)).size !== s.events.length ||
      new Set(s.usage.map((e) => e.eventId)).size !== s.usage.length
    )
      fail("Event identities must be unique.");
    if (
      new Set(
        s.usage.map(
          (e) =>
            `${e.record.recordId}:${e.projectId}:${e.requestRevisionId}:${e.outcome}`,
        ),
      ).size !== s.usage.length
    )
      fail("Usage outcomes count each record/request once, including retries.");
    const latest = new Map<string, z.infer<typeof LibraryRecordSchema>>();
    const patternSignatures = new Map<string, string>();
    for (const [index, r] of s.records.entries()) {
      const pattern = r.creative?.dna?.pattern;
      if (pattern) {
        const known = patternSignatures.get(pattern.patternId);
        if (known && known !== pattern.signature)
          fail(
            "Compact pattern ID collision: complete structural signatures differ.",
          );
        patternSignatures.set(pattern.patternId, pattern.signature);
      }
      const previous = latest.get(r.recordId);
      if (r.version !== (previous?.version ?? 0) + 1)
        fail("Record versions must be contiguous and ordered.");
      if (!events.has(`${r.recordId}:${r.version}`))
        fail("Record revision requires its human audit event.");
      if (r.family) {
        const f = resolve(r.family);
        if (f?.r.payload.type !== "STORY_FAMILY" || f.index >= index)
          fail(
            "Family reference must resolve to an earlier structural family.",
          );
      }
      if (r.derivedFrom) {
        const d = resolve(r.derivedFrom);
        if (!d || d.index >= index || d.r.recordId === r.recordId)
          fail(
            "Derived lineage must refer to an earlier different record, never itself or a cycle.",
          );
      }
      latest.set(r.recordId, r);
    }
    const variants = [...latest.values()].filter((r) => r.family);
    if (
      new Set(variants.map((r) => `${r.family!.recordId}:${r.variantNumber}`))
        .size !== variants.length ||
      new Set(variants.map((r) => r.variantId)).size !== variants.length
    )
      fail("Family variant numbers and identities must be unique.");
    for (const e of s.events)
      if (!refs.has(`${e.recordId}:${e.version}`))
        fail("Event record missing.");
    for (const e of s.usage)
      if (!resolve(e.record)) fail("Usage record missing.");
  });
export type LibraryState = z.infer<typeof LibraryStateSchema>;
export const GenerationPackageSchema = z
  .object({
    schemaVersion: z.literal("generation-package/1.0"),
    packageId: Id,
    createdAt: text,
    request: StoryRequestSchema,
    strategy: z.enum(["HYBRID", "CURATED", "AI_LED"]),
    variation: VariationSchema,
    candidateCount: z.number().int().min(3).max(5),
    context: z.array(LibraryRecordSchema).max(30),
    guidance: StoryStructureProfileSchema,
    fixedRules: z.array(text).min(1).max(30),
    creativeFreedom: z.array(text).min(1).max(30),
    outputSchemaVersion: z.literal("bridge-response/1.0"),
    generation: z.number().int().nonnegative(),
    humanReviewRequired: z.literal(true),
    culturalAcknowledged: z.literal(true).optional(),
  })
  .strict();
export type GenerationPackage = z.infer<typeof GenerationPackageSchema>;
export const BridgeResponseSchema = z
  .object({
    schemaVersion: z.literal("bridge-response/1.0"),
    packageId: Id,
    requestRevisionId: Id,
    candidates: z.array(StoryConceptSchema).min(3).max(5),
  })
  .strict();
export const ManualImportSchema = z
  .object({
    schemaVersion: z.literal("manual-import/1.0"),
    importId: Id,
    packageId: Id,
    requestRevisionId: Id,
    transport: z.literal("manual-paste"),
    metadata: OperatorMetadataSchema,
    candidates: z.array(StoryConceptSchema).min(3).max(5),
    recordIds: z.array(Id).min(3).max(5),
  })
  .strict()
  .superRefine((i, c) => {
    if (
      i.candidates.length !== i.recordIds.length ||
      new Set(i.recordIds).size !== i.recordIds.length ||
      new Set(i.candidates.map((x) => x.conceptId)).size !==
        i.candidates.length ||
      i.candidates.some((x) => x.requestRevisionId !== i.requestRevisionId)
    )
      c.addIssue({
        code: "custom",
        message: "Import identities/counts/request ownership must match.",
      });
  });
export type ManualImport = z.infer<typeof ManualImportSchema>;
