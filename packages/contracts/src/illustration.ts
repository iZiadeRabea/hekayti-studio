import { z } from "zod";
import { Id, LanguageModeSchema } from "./index";
import { SimpleCreateInputSchema } from "./creator";
const text = z.string().min(1).max(4000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const VisualCharacterSchema = z
  .object({
    characterId: Id,
    name: text,
    origin: z.literal("synthetic"),
    appearanceBasis: z.enum(["SYNTHETIC_DEFAULT", "EXPLICIT_EDIT"]),
    ageDescription: text,
    presentation: text,
    skin: text,
    hair: text,
    face: text,
    clothes: text,
    colors: text,
    proportions: text,
    carriedItem: text,
    expressions: text,
    stabilityRules: text,
  })
  .strict();
export const VisualBibleSchema = z
  .object({
    schemaVersion: z.literal("visual-bible/1.0"),
    revisionId: Id,
    characters: z.array(VisualCharacterSchema).max(20),
    location: text,
    locationAnchors: z.array(text).max(5),
    props: z.array(text).max(30),
    continuityRules: z.array(text).max(20),
  })
  .strict();
export const VisualStyleSchema = z
  .object({
    schemaVersion: z.literal("visual-style/1.0"),
    revisionId: Id,
    medium: z.enum(["PAPER_CUT_COLLAGE", "SOFT_WATERCOLOR"]),
    texture: text,
    light: text,
    palette: text,
    composition: text,
    negativeRules: z.array(text).max(30),
  })
  .strict();
export const IllustrationPageSchema = z
  .object({
    pageId: Id,
    pageNumber: z.number().int().positive(),
    beatRefs: z.array(Id).max(30),
    characters: z.array(Id).max(20),
    action: text,
    expression: text,
    setting: text,
    props: z.array(text).max(30),
    beforeState: text,
    afterState: text,
    framing: text,
    camera: text,
    composition: text,
    mustShow: z.array(text).max(30),
    mustNotShow: z.array(text).max(30),
    continuity: z.array(text).max(20),
    textSafeRegion: text,
    visualPurpose: text,
    reviewRequired: z.boolean(),
  })
  .strict();
export const IllustrationPlanSchema = z
  .object({
    schemaVersion: z.literal("illustration-plan/1.0"),
    planId: Id,
    projectId: Id,
    draftId: Id,
    mode: LanguageModeSchema,
    createdAt: text,
    dependencies: z
      .object({
        draftHash: hash,
        storyRevision: Id,
        storyHash: hash,
        planRevision: Id,
        planHash: hash,
        bibleRevision: Id,
        bibleHash: hash,
        styleRevision: Id,
        styleHash: hash,
      })
      .strict(),
    bible: VisualBibleSchema,
    style: VisualStyleSchema,
    pages: z.array(IllustrationPageSchema).min(1).max(100),
  })
  .strict();
export const IllustrationPromptSchema = z
  .object({
    schemaVersion: z.literal("illustration-prompt/1.0"),
    promptId: Id,
    planId: Id,
    planHash: hash,
    kind: z.enum(["CHARACTER_REFERENCE", "COVER", "PAGE"]),
    characterId: Id.optional(),
    pageId: Id.optional(),
    pageNumber: z.number().int().positive().optional(),
    arabicSummary: text,
    technicalPrompt: z.string().min(1).max(30000),
    reviewRequired: z.boolean(),
  })
  .strict();
export const CreatorStateSchema = z
  .object({
    schemaVersion: z.literal("creator-state/1.0"),
    projectId: Id,
    recordVersion: z.number().int().nonnegative(),
    inputs: z
      .array(
        z
          .object({ requestRevisionId: Id, input: SimpleCreateInputSchema })
          .strict(),
      )
      .max(1000),
    providerNotes: z
      .array(
        z
          .object({
            draftId: Id,
            label: z.enum(["CHATGPT", "GEMINI", "OTHER"]),
            basis: z.literal("USER_REPORTED"),
          })
          .strict(),
      )
      .max(1000),
    reviews: z
      .array(
        z
          .object({
            reviewId: Id,
            draftId: Id,
            choice: z.enum(["LIKED", "NEEDS_EDIT", "REJECTED"]),
            notes: z.string().max(2000),
            rating: z.number().int().min(1).max(5).optional(),
            reviewerAlias: text,
            reportId: Id,
            timestamp: text,
          })
          .strict(),
      )
      .max(1000),
    bibles: z.array(VisualBibleSchema).max(1000),
    styles: z.array(VisualStyleSchema).max(1000),
    plans: z.array(IllustrationPlanSchema).max(1000),
    prompts: z.array(IllustrationPromptSchema).max(10000),
  })
  .strict()
  .superRefine((x, c) => {
    for (const list of [
      x.bibles.map((v) => v.revisionId),
      x.styles.map((v) => v.revisionId),
      x.plans.map((v) => v.planId),
      x.prompts.map((v) => v.promptId),
      x.providerNotes.map((v) => v.draftId),
      x.reviews.map((v) => v.reviewId),
    ])
      if (new Set(list).size !== list.length)
        c.addIssue({
          code: "custom",
          message: "Duplicate retained creator identities.",
        });
    for (const p of x.plans)
      if (p.projectId !== x.projectId)
        c.addIssue({
          code: "custom",
          message: "Illustration plan owner differs.",
        });
  });
export type CreatorState = z.infer<typeof CreatorStateSchema>;
export type VisualBible = z.infer<typeof VisualBibleSchema>;
export type VisualStyle = z.infer<typeof VisualStyleSchema>;
export type IllustrationPlan = z.infer<typeof IllustrationPlanSchema>;
export type IllustrationPrompt = z.infer<typeof IllustrationPromptSchema>;
export interface IllustrationSnapshot {
  recordVersion: number;
  plan: IllustrationPlan | null;
  plans: { planId: string; draftId: string; mode: string; stale: boolean }[];
  bible: VisualBible | null;
  style: VisualStyle | null;
  prompts: IllustrationPrompt[];
  stale: boolean;
  staleReasons: string[];
  notice: string;
}
const base = {
  projectId: Id,
  expectedCreator: z.number().int().nonnegative(),
  expectedPlanner: z.number().int().nonnegative(),
  expectedWorkflow: z.number().int().nonnegative(),
};
export const IllustrationCommandSchema = z.discriminatedUnion("action", [
  z
    .object({ ...base, action: z.literal("PREPARE"), mode: LanguageModeSchema })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("EDIT_BIBLE"),
      bible: VisualBibleSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("EDIT_STYLE"),
      style: VisualStyleSchema,
    })
    .strict(),
  z.object({ ...base, action: z.literal("GENERATE"), planId: Id }).strict(),
  z
    .object({
      ...base,
      action: z.literal("COPY"),
      promptId: Id,
      syntheticReviewed: z.literal(true),
    })
    .strict(),
]);
export type IllustrationCommand = z.input<typeof IllustrationCommandSchema>;
