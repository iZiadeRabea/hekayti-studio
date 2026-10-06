import { z } from "zod";
const text = z.string().trim().min(1).max(2000);
const PatternSchema = z
  .object({
    patternId: text,
    signature: text,
    goalCategory: text,
    conflictCategory: text,
    mechanism: text,
    attemptSequence: text,
    turn: text,
    resolutionCategory: text,
    basis: z.literal("EDITORIAL_STRUCTURAL_GROUPING_NOT_TRADITIONAL_TALE_TYPE"),
  })
  .strict()
  .superRefine((p, c) => {
    const keys = [
      "goalCategory",
      "conflictCategory",
      "mechanism",
      "attemptSequence",
      "turn",
      "resolutionCategory",
    ] as const;
    const signature = JSON.stringify(
      Object.fromEntries([...keys].sort().map((k) => [k, p[k]])),
    );
    let n = 0x811c9dc5;
    for (const char of signature)
      n = Math.imul(n ^ char.charCodeAt(0), 0x01000193) >>> 0;
    if (
      p.signature !== signature ||
      p.patternId !== `pattern-${n.toString(16).padStart(8, "0")}` ||
      keys.some((k) =>
        ["unknown", "not_available"].includes(p[k].toLowerCase()),
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "Pattern ID/signature must recompute from the complete structural vector; unknown categories cannot define a pattern.",
      });
  });
export const DnaFieldSchema = z
  .object({
    value: text.nullable(),
    evidence: text.nullable(),
    confidence: z.enum([
      "SOURCE_EXTRACTED",
      "EDITORIAL_INFERENCE",
      "UNKNOWN",
      "NOT_AVAILABLE",
    ]),
  })
  .strict()
  .superRefine((f, c) => {
    if (
      f.confidence === "UNKNOWN" || f.confidence === "NOT_AVAILABLE"
        ? f.value !== null || f.evidence !== null
        : !f.value || !f.evidence
    )
      c.addIssue({
        code: "custom",
        message:
          "Known/inferred DNA requires evidence; unknown/not available remains explicit null.",
      });
  });
export const dnaFields = [
  "protagonist",
  "goal",
  "need",
  "setting",
  "opening",
  "incitingEvent",
  "problem",
  "stakes",
  "conflictType",
  "attemptSequence",
  "turningPoint",
  "discovery",
  "climax",
  "resolution",
  "ending",
  "theme",
  "emotionalArc",
  "characterArc",
] as const;
export const StoryDnaSchema = z
  .object({
    schemaVersion: z.literal("story-dna/1.0"),
    fields: z.record(z.enum(dnaFields), DnaFieldSchema),
    causalLinks: z
      .array(
        z
          .object({
            cause: text,
            effect: text,
            evidence: text,
            confidence: z.enum(["SOURCE_EXTRACTED", "EDITORIAL_INFERENCE"]),
          })
          .strict(),
      )
      .max(30),
    dimensions: z
      .object({
        majorCharacters: z
          .tuple([
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
          ])
          .nullable(),
        meaningBeats: z
          .tuple([
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
          ])
          .nullable(),
        locations: z
          .tuple([
            z.number().int().nonnegative(),
            z.number().int().nonnegative(),
          ])
          .nullable(),
        plotDepth: z.enum([
          "RECOGNITION",
          "SIMPLE_CAUSAL",
          "SHORT_PLOT",
          "COMPLEX",
          "UNKNOWN",
        ]),
        dialogueDensity: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
        narrationDensity: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
        repetition: z.enum(["NONE", "REPEATED", "CUMULATIVE", "UNKNOWN"]),
        twist: z.enum(["PRESENT", "ABSENT", "UNKNOWN"]),
        emotionalComplexity: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
        adventure: z.enum(["LOW", "MEDIUM", "HIGH", "UNKNOWN"]),
        parentParticipation: z.enum(["NOT_IN_SOURCE", "PRESENT", "UNKNOWN"]),
        ageFit: text.nullable(),
        styleVoice: text.nullable(),
        sentenceVocabulary: text.nullable(),
        directDescriptive: text.nullable(),
        tone: text.nullable(),
        bedtimeReadAloud: text.nullable(),
        basis: text,
        confidence: z.literal("PROVISIONAL_EDITORIAL_INFERENCE"),
      })
      .strict(),
    pattern: PatternSchema.nullable(),
  })
  .strict()
  .superRefine((d, c) => {
    for (const range of [
      d.dimensions.majorCharacters,
      d.dimensions.meaningBeats,
      d.dimensions.locations,
    ])
      if (range && range[0] > range[1])
        c.addIssue({
          code: "custom",
          message: "Dimension ranges require minimum <= maximum.",
        });
  });
export type StoryDna = z.infer<typeof StoryDnaSchema>;
