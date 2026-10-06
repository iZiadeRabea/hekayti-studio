import { z } from "zod";
import { StoryDnaSchema } from "./story-dna";
export * from "./story-dna";
const text = z.string().trim().min(1).max(2000);
export const CulturalProfileSchema = z.enum([
  "EGYPTIAN_ARAB_MUSLIM_FAMILY",
  "GENERAL_FAMILY",
]);
export const CulturalFitSchema = z.enum([
  "READY",
  "NEEDS_ADAPTATION",
  "SENSITIVE_REVIEW",
  "NOT_DEFAULT",
]);
export const CreativeMetadataSchema = z
  .object({
    schemaVersion: z.literal("creative-metadata/1.0"),
    dna: StoryDnaSchema.optional(),
    source: z
      .object({
        collectionId: text,
        collectionTitle: text,
        itemUrl: z.url().max(2000),
        itemLocator: text,
        retrievedAt: text,
        sourceCulture: text,
        originalLanguage: text.nullable(),
        era: text.nullable(),
        author: text.nullable(),
        kind: z.enum([
          "SOURCE_DERIVED",
          "CATALOG_LEAD",
          "SYNTHETIC_HEKAYTI",
          "PORTABLE_ATTRIBUTION",
        ]),
        extractionMethod: z.enum([
          "ORIGINAL_ABSTRACT",
          "EXTRACTIVE_SEED",
          "CATALOG_ONLY",
          "HUMAN_AUTHORED",
          "AGENT_EDITORIAL_SYNTHESIS",
          "PORTABLE_PROJECTION",
        ]),
        confidence: z.enum(["high", "medium", "low"]),
        evidence: text,
        evidenceSha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
        rights: z.enum([
          "UNREVIEWED",
          "HISTORICAL_PD_US_ASSERTION",
          "USER_REVIEWED",
        ]),
        rightsNote: text,
        summaryScope: z
          .enum([
            "COMPLETE_NARRATIVE",
            "OPENING_OBSERVATION",
            "EXTRACTIVE_OBSERVATIONS",
            "CATALOG_ONLY",
            "NOT_APPLICABLE",
          ])
          .optional(),
      })
      .strict()
      .nullable(),
    culture: z
      .object({
        profile: CulturalProfileSchema,
        fit: CulturalFitSchema,
        assessment: z.literal("PROVISIONAL_EDITORIAL_SCREENING"),
        factors: z
          .array(
            z
              .object({
                dimension: z.enum([
                  "violence",
                  "fear",
                  "family",
                  "faith",
                  "language",
                  "stereotypes",
                  "age",
                  "setting",
                  "ethics",
                ]),
                finding: text,
                adaptation: text,
              })
              .strict(),
          )
          .max(20),
        religiousReview: z.enum([
          "NO_RELIGIOUS_CLAIM",
          "RELIGIOUS_ACCURACY_REVIEW_REQUIRED",
        ]),
        religiousNote: text,
        reviewedBy: z.literal(null),
      })
      .strict(),
    historicalAttribution: z
      .object({
        originalType: text,
        originalStatus: text,
        originalVersion: z.number().int().positive(),
        approvalHash: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .nullable(),
        authority: z.literal("HISTORICAL_ONLY_NOT_CURRENT_APPROVAL"),
      })
      .strict()
      .nullable(),
    usageSummary: z
      .object({
        timesUsed: z.number().int().nonnegative(),
        variantsCreated: z.number().int().nonnegative(),
        approvedCount: z.number().int().nonnegative(),
        rejectedCount: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type CreativeMetadata = z.infer<typeof CreativeMetadataSchema>;
export const LibraryQuerySchema = z
  .object({
    offset: z.number().int().min(0).max(100000).default(0),
    limit: z.number().int().min(1).max(100).default(30),
    search: z.string().max(200).default(""),
    type: z.string().max(50).optional(),
    status: z.string().max(50).optional(),
    age: z.string().max(50).optional(),
    theme: z.string().max(100).optional(),
    objective: z.string().max(100).optional(),
    storyType: z.string().max(100).optional(),
    source: z.string().max(100).optional(),
    provider: z.string().max(50).optional(),
    culture: z.string().max(100).optional(),
    fit: CulturalFitSchema.optional(),
    religious: z.string().max(100).optional(),
    familyId: z.string().max(100).optional(),
    patternId: z.string().max(100).optional(),
    plotDepth: z.string().max(50).optional(),
    profile: CulturalProfileSchema.optional(),
  })
  .strict();
export type LibraryQuery = z.infer<typeof LibraryQuerySchema>;
