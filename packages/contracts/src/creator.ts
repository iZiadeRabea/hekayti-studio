import { z } from "zod";
import { Id, LanguageModeSchema } from "./index";
import {
  ConsumerTargetSchema,
  CulturalProfileSchema,
  VariationSchema,
} from "./library";

export type LocalizedLabel = Record<"ar-EG" | "ar-MSA-simple" | "en", string>;
export const AgePresetSchema = z.enum([
  "UNDER_ONE",
  "ONE_TWO",
  "TWO_THREE",
  "THREE_FIVE",
  "FIVE_SEVEN",
]);
export const GoalPresetSchema = z.enum([
  "SHARING",
  "COOPERATION",
  "ANGER",
  "FEELINGS",
  "SLEEP",
  "CONFIDENCE",
  "COLORS",
  "NUMBERS",
  "PROBLEM_SOLVING",
  "MISTAKES",
  "HELPING",
  "CUSTOM",
]);
const authored = z.string().min(1).max(2000); // Deliberately no trim: authored Arabic is retained exactly.
export const SimpleCreateInputSchema = z
  .object({
    agePreset: AgePresetSchema.default("THREE_FIVE"),
    exactAgeMonths: z.number().int().min(0).max(95).optional(),
    primaryLanguageMode: LanguageModeSchema.default("ar-EG"),
    bothArabicEditions: z.boolean().default(false),
    category: z
      .enum([
        "adventure",
        "bedtime",
        "educational",
        "behavioral",
        "emotional-learning",
        "everyday-life",
        "values",
      ])
      .default("adventure"),
    goalPreset: GoalPresetSchema.default("SHARING"),
    customGoal: authored.optional(),
    successScenario: authored.optional(),
    setting: authored.optional(),
    constraints: authored.optional(),
    fictionalName: z.string().min(1).max(80).optional(),
    profile: CulturalProfileSchema.default("EGYPTIAN_ARAB_MUSLIM_FAMILY"),
    variation: VariationSchema.default("FreshConcept"),
    provisionalAcknowledged: z.boolean().default(false),
    expectedLibrary: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((x, c) => {
    if (x.goalPreset === "CUSTOM" && !x.customGoal)
      c.addIssue({
        code: "custom",
        path: ["customGoal"],
        message: "Custom goal is required.",
      });
    if (x.bothArabicEditions && x.primaryLanguageMode === "en")
      c.addIssue({
        code: "custom",
        path: ["primaryLanguageMode"],
        message: "Choose an Arabic primary edition for both Arabic editions.",
      });
  });
export type SimpleCreateInput = z.input<typeof SimpleCreateInputSchema>;
export interface SimpleDefaults {
  agePresets: {
    key: z.infer<typeof AgePresetSchema>;
    ageMonths: number;
    label: LocalizedLabel;
    note: LocalizedLabel;
  }[];
  goalPresets: {
    key: z.infer<typeof GoalPresetSchema>;
    label: LocalizedLabel;
    description: LocalizedLabel;
    successScenario: LocalizedLabel;
  }[];
  defaults: Omit<SimpleCreateInput, "expectedLibrary">;
  library: {
    recordVersion: number;
    total: number;
    promoted: number;
    provisional: number;
    needsInitialization: boolean;
  };
}
export interface PlanPresentation {
  mode: z.infer<typeof LanguageModeSchema>;
  supported: boolean;
  title: string;
  ageMonths: number;
  category: string;
  goal: string;
  objective: string;
  setting: string;
  constraints: string[];
  characters: { name: string; role: string }[];
  problem: string;
  opening: string;
  resolution: string;
  ending: string;
  events: {
    sequence: number;
    action: string;
    beforeState: string;
    afterState: string;
    cause: string;
    strategy: string;
    consequence: string;
    informationChange: string;
    relationshipChange: string;
  }[];
  notices: {
    code: string;
    severity: "blocker" | "high" | "medium" | "low";
    text: string;
    location?: string;
  }[];
}
export interface ReaderPage {
  pageId: string;
  pageNumber: number;
  narration: string;
  dialogue: { speaker: string; text: string }[];
  altText: string;
  wordCount: number;
}
export interface DraftChoice {
  draftId: string;
  number: number;
  modes: string[];
  current: boolean;
  providerLabel: string;
  providerBasis: "USER_REPORTED" | "CANONICAL" | "UNKNOWN";
}
export interface StoryReaderModel {
  notices: PlanPresentation["notices"];
  projectId: string;
  draftId: string;
  title: string;
  ageMonths: number;
  category: string;
  mode: z.infer<typeof LanguageModeSchema>;
  availableModes: string[];
  drafts: DraftChoice[];
  historical: boolean;
  providerLabel: string;
  providerBasis: DraftChoice["providerBasis"];
  pages: ReaderPage[];
  totalWords: number;
  review: {
    current: boolean;
    qaReady: boolean;
    approved: boolean;
    rejected: boolean;
  };
}
export interface StoryCompareModel {
  compatible: boolean;
  reason: string | null;
  mode: z.infer<typeof LanguageModeSchema>;
  left: StoryReaderModel;
  right: StoryReaderModel;
  pages: {
    pageNumber: number;
    left: ReaderPage | null;
    right: ReaderPage | null;
  }[];
}
export interface SimpleStoryList {
  total: number;
  offset: number;
  limit: number;
  stories: {
    projectId: string;
    title: string;
    ageMonths: number;
    category: string;
    modes: string[];
    draftCount: number;
    updatedAt: string;
  }[];
}
const version = z.number().int().nonnegative();
const base = {
  projectId: Id,
  expectedPlanner: version,
  expectedWorkflow: version,
};
export const SimpleCommandSchema = z.discriminatedUnion("action", [
  z
    .object({ action: z.literal("CREATE"), input: SimpleCreateInputSchema })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("ACCEPT"),
      reviewerAlias: z.string().trim().min(1).max(80),
      advisoryAcknowledged: z.literal(true),
    })
    .strict(),
  z.object({ ...base, action: z.literal("PREPARE") }).strict(),
  z
    .object({
      ...base,
      action: z.literal("COPY"),
      packageId: Id,
      target: ConsumerTargetSchema,
      syntheticReviewed: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("PREVIEW"),
      packageId: Id,
      json: z.string().min(1).max(500000),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("IMPORT"),
      packageId: Id,
      json: z.string().min(1).max(500000),
      providerLabel: z.enum(["CHATGPT", "GEMINI", "OTHER"]).optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("REVIEW"),
      draftId: Id,
      choice: z.enum(["LIKED", "NEEDS_EDIT", "REJECTED"]),
      reviewerAlias: z.string().trim().min(1).max(80),
      advisoryAcknowledged: z.literal(true),
      notes: z.string().max(2000),
      rating: z.number().int().min(1).max(5).optional(),
      expectedLibrary: version,
    })
    .strict(),
]);
export type SimpleCommand = z.input<typeof SimpleCommandSchema>;
