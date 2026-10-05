import { z } from "zod";

export const Id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const Text = z.string().max(20000);
const Hash = z.string().regex(/^[a-f0-9]{64}$/);
export const LanguageModeSchema = z.enum(["ar-MSA-simple", "ar-EG", "en"]);
export type LanguageMode = z.infer<typeof LanguageModeSchema>;
export const languageInfo = {
  "ar-MSA-simple": { lang: "ar", dir: "rtl" },
  "ar-EG": { lang: "ar-EG", dir: "rtl" },
  en: { lang: "en", dir: "ltr" },
} as const;
export const AgeBandSchema = z.enum([
  "0-11m",
  "12-23m",
  "24-35m",
  "36-59m",
  "60-95m",
]);
export function ageBandFor(age: number): z.infer<typeof AgeBandSchema> {
  if (!Number.isInteger(age) || age < 0 || age >= 96)
    throw new Error(
      "Age must be whole months from 0 to 95; older ages need a reviewed profile.",
    );
  return age < 12
    ? "0-11m"
    : age < 24
      ? "12-23m"
      : age < 36
        ? "24-35m"
        : age < 60
          ? "36-59m"
          : "60-95m";
}
export const StoryObjectiveSchema = z
  .object({
    kind: z.enum([
      "educational",
      "behavioral",
      "emotional",
      "connection",
      "entertainment",
    ]),
    description: Text.min(1),
    successScenario: Text.min(1),
  })
  .strict();
export type StoryObjective = z.infer<typeof StoryObjectiveSchema>;
export interface AgeProfile {
  id: z.infer<typeof AgeBandSchema>;
  version: "age-profiles/0.1";
  authority: "editorial-D/H";
  words: readonly [number, number];
  pages: readonly [number, number];
  wordsPerPage: readonly [number, number];
  sentenceWords: readonly [number, number];
  cast: readonly [number, number];
  events: readonly [number, number];
  vocabulary: string;
  repetition: string;
  visualComplexity: string;
  emotions: string;
  education: string;
  plot: string;
  dialogue: string;
  narration: string;
  interaction: string;
  adventure: string;
  adventureEligible: boolean;
}
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}
export function publicError(error: unknown): { code: string; message: string } {
  return error instanceof AppError
    ? { code: error.code, message: error.message }
    : error instanceof ValidationError
      ? { code: "VALIDATION", message: error.message }
      : {
          code: "OPERATION_FAILED",
          message:
            "The operation failed safely. Existing data was retained. See local diagnostics.",
        };
}
export const PersonalizationProfileSchema = z
  .object({
    level: z.number().int().min(0).max(4),
    heroMode: z.enum(["none", "child-protagonist", "supporting"]),
    privateProfileRef: Id.nullable(),
  })
  .strict();
export type PersonalizationProfile = z.infer<
  typeof PersonalizationProfileSchema
>;
export const CharacterBibleSchema = z
  .object({
    characterId: Id,
    bibleVersion: Id,
    origin: z.literal("synthetic"),
    displayName: Text.min(1),
    species: Text.optional(),
    ageRange: Text.optional(),
    hair: Text.optional(),
    skinTone: Text.optional(),
    facialTraits: Text.optional(),
    clothing: Text.optional(),
    proportions: Text.optional(),
    expressions: z.array(Text).optional(),
    accessories: z.array(Text).optional(),
    intendedAnatomy: Text.optional(),
    approvedReferenceImages: z.array(Id),
    illustrationReference: Id.nullable().optional(),
    consistencyNotes: Text,
  })
  .strict();
export type CharacterBible = z.infer<typeof CharacterBibleSchema>;
export const CharacterSchema = z
  .object({
    characterId: Id,
    displayName: Text,
    origin: z.literal("synthetic"),
    bibleVersion: Id,
  })
  .strict();
export type Character = z.infer<typeof CharacterSchema>;
export const DialogueSchema = z.object({ speakerId: Id, text: Text }).strict();
export const LanguageEditionSchema = z
  .object({
    languageVersionId: Id,
    mode: LanguageModeSchema,
    sourceRevision: Id,
    status: z.enum(["draft", "approved"]),
    diacriticsPolicy: Text,
    pages: z
      .array(
        z
          .object({
            pageId: Id,
            narration: Text,
            dialogue: z.array(DialogueSchema),
            altText: Text,
            wordCount: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    totalWords: z.number().int().nonnegative(),
    glossaryRefs: z.array(Text),
    review: Text,
  })
  .strict();
export type LanguageEdition = z.infer<typeof LanguageEditionSchema>;
export const MeaningBeatSchema = z
  .object({
    beatId: Id,
    sequence: z.number().int().positive(),
    purpose: Text,
    actionOrDiscovery: Text,
    emotion: Text,
    visibleFacts: z.array(Text),
    beforeState: Text,
    afterState: Text,
    nextBeatId: Id.nullable(),
  })
  .strict();
export const PageSchema = z
  .object({
    pageId: Id,
    order: z.number().int().positive(),
    beatIds: z.array(Id).min(1),
    spreadGroup: Id.nullable(),
    textSafeRegion: Text,
    artBrief: Text,
    mustShow: z.array(Text),
    mustNotShow: z.array(Text),
    characterStates: Text,
    propStates: Text,
  })
  .strict();
export type Page = z.infer<typeof PageSchema>;
export const SceneSchema = z
  .object({
    sceneId: Id,
    environmentRef: Text,
    beatIds: z.array(Id),
    propState: Text,
  })
  .strict();
export type Scene = z.infer<typeof SceneSchema>;
export const DependencySchema = z
  .object({ id: Id, revisionId: Id, hash: Hash })
  .strict();
export type Dependency = z.infer<typeof DependencySchema>;
export const ApprovalSchema = z
  .object({
    approvalId: Id,
    targetId: Id,
    scope: z.enum(["text", "plan", "character", "art", "layout", "export"]),
    revisionId: Id,
    hash: Hash,
    dependencies: z.array(DependencySchema),
    reviewerAlias: Text.min(1),
    approvedAt: z.iso.datetime(),
  })
  .strict();
export type Approval = z.infer<typeof ApprovalSchema>;
export const IllustrationReferenceSchema = z
  .object({
    assetId: Id,
    pageId: Id,
    uri: z.string().regex(/^asset:/),
    hash: Hash,
    dependencies: z.array(DependencySchema),
    state: z.enum(["candidate", "approved", "stale"]),
  })
  .strict();
export type IllustrationReference = z.infer<typeof IllustrationReferenceSchema>;
export const VideoShotSchema = z
  .object({
    shotId: Id,
    pageId: Id,
    beatIds: z.array(Id),
    illustrationId: Id,
    durationSeconds: z.number().positive().max(60),
    narrationPageId: Id,
    motion: z.enum(["still", "pan", "zoom", "parallax"]),
  })
  .strict();
export type VideoShot = z.infer<typeof VideoShotSchema>;
export const StyleProfileSchema = z
  .object({
    styleId: Id,
    version: Id,
    medium: z.literal("layered-paper-cut"),
    palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)),
    rules: z.array(Text),
  })
  .strict();
export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export const ExportRecordSchema = z
  .object({
    exportId: Id,
    storyRevisionId: Id,
    mode: z.enum(["print", "digital", "video"]),
    profileId: Id,
    pageIds: z.array(Id),
    dependencies: z.array(DependencySchema),
    outputHash: Hash,
    uri: Text,
    status: z.enum(["candidate", "approved", "stale"]),
  })
  .strict();
export type ExportRecord = z.infer<typeof ExportRecordSchema>;
export const ProjectSchema = z
  .object({
    schemaVersion: z.literal("project/1.0"),
    projectId: Id,
    title: Text.min(1),
    origin: z.literal("synthetic"),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    recordVersion: z.number().int().nonnegative(),
  })
  .strict();
export type Project = z.infer<typeof ProjectSchema>;
export const StorySchema = z
  .object({ storyId: Id, projectId: Id, latestRevisionId: Id })
  .strict();
export type Story = z.infer<typeof StorySchema>;
export const StoryVersionSchema = z
  .object({
    revisionId: Id,
    storyId: Id,
    parentRevisionId: Id.nullable(),
    contentHash: Hash,
  })
  .strict();
export type StoryVersion = z.infer<typeof StoryVersionSchema>;

export const BlueprintSchema = z
  .object({
    schemaVersion: z.literal("blueprint/1.0"),
    profileOrigin: z.literal("synthetic"),
    specificationOnly: z.boolean(),
    storyId: Id,
    projectId: Id,
    revisionId: Id,
    workingTitle: Text.min(1),
    ageMonths: z.number().int().min(0).max(95),
    ageBandId: AgeBandSchema,
    ageProfileVersion: z.literal("age-profiles/0.1"),
    languageModes: z.array(LanguageModeSchema).min(1),
    primaryLanguageMode: LanguageModeSchema,
    primaryCategory: z.enum([
      "educational",
      "behavioral",
      "values",
      "everyday-life",
      "bedtime",
      "emotional-learning",
      "adventure",
      "discovery",
      "early-learning",
      "personalized",
    ]),
    secondaryCategories: z.array(Text),
    objective: StoryObjectiveSchema,
    educationalObjective: Text.nullable(),
    behavioralObjective: Text.nullable(),
    emotionalObjective: Text.nullable(),
    theme: Text,
    tone: Text,
    readingMode: z.enum(["adult-read", "emerging-reader"]),
    protagonistId: Id.nullable(),
    supportingCharacterIds: z.array(Id),
    characterBibleRefs: z.array(
      z.object({ characterId: Id, bibleVersion: Id }).strict(),
    ),
    characterBibles: z.array(CharacterBibleSchema),
    personalization: PersonalizationProfileSchema,
    setting: Text,
    environmentBibleRef: Text,
    meaningBeats: z.array(MeaningBeatSchema).min(1).max(200),
    pagePlan: z.array(PageSchema).min(1).max(200),
    languageVersions: z.array(LanguageEditionSchema).min(1),
    illustrationBrief: Text,
    styleProfileRef: Text,
    videoAdaptationNotes: z
      .object({
        childViewingEligibility: z.enum([
          "ineligible-child-viewing",
          "eligible-co-viewing",
        ]),
        reason: Text,
        shotPlanStatus: Text,
      })
      .strict(),
    outputIntents: z.array(z.enum(["print", "digital", "video"])),
    safetyQualityChecks: z.array(
      z.object({ check: Text, status: Text }).strict(),
    ),
    approvalRecords: z.array(ApprovalSchema),
    lineage: z.object({ parentRevisionId: Id.nullable() }).strict(),
    dependencyHashes: z.record(z.string(), z.string()),
    generatedAssets: z.array(IllustrationReferenceSchema),
    exportRefs: z.array(Id),
    parentParticipation: Text.optional(),
    accessibility: z
      .object({ colourNotOnlyCue: z.boolean(), readAloud: z.boolean() })
      .optional(),
    testExpectations: z
      .object({
        storyWordRange: z.tuple([z.number(), z.number()]),
        storyPageCount: z.number(),
        videoEligible: z.boolean(),
        realPersonalData: z.literal(false),
        heroImplicit: z.literal(false),
        conventionalPlotRequired: z.boolean(),
      })
      .optional(),
  })
  .strict()
  .superRefine((b, ctx) => {
    const error = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const unique = (values: string[], path: string) => {
      if (new Set(values).size !== values.length)
        error([path], "Duplicate IDs/modes are not allowed.");
    };
    unique(
      b.pagePlan.map((p) => p.pageId),
      "pagePlan",
    );
    unique(
      b.meaningBeats.map((x) => x.beatId),
      "meaningBeats",
    );
    unique(b.languageModes, "languageModes");
    unique(
      b.languageVersions.map((x) => x.mode),
      "languageVersions",
    );
    unique(
      b.characterBibles.map((x) => x.characterId),
      "characterBibles",
    );
    if (
      Number.isInteger(b.ageMonths) &&
      b.ageMonths >= 0 &&
      b.ageMonths < 96 &&
      ageBandFor(b.ageMonths) !== b.ageBandId
    )
      error(["ageBandId"], "Age band does not match exact age.");
    if (
      b.personalization.level !== 0 ||
      b.personalization.heroMode !== "none" ||
      b.personalization.privateProfileRef !== null
    )
      error(
        ["personalization"],
        "Phase 2 accepts synthetic level-0 data only; private personalization is not enabled.",
      );
    const charIds = new Set(b.characterBibles.map((c) => c.characterId));
    for (const id of [b.protagonistId, ...b.supportingCharacterIds].filter(
      Boolean,
    ))
      if (!charIds.has(id!))
        error(["protagonistId"], "Unresolved character reference.");
    for (const ref of b.characterBibleRefs)
      if (
        !b.characterBibles.some(
          (c) =>
            c.characterId === ref.characterId &&
            c.bibleVersion === ref.bibleVersion,
        )
      )
        error(["characterBibleRefs"], "Unresolved character bible version.");
    const beatIds = new Set(b.meaningBeats.map((x) => x.beatId));
    const pageIds = new Set(b.pagePlan.map((x) => x.pageId));
    b.meaningBeats.forEach((beat, i) => {
      if (beat.sequence !== i + 1)
        error(["meaningBeats", i], "Beats must be contiguous and ordered.");
      if (beat.nextBeatId !== (b.meaningBeats[i + 1]?.beatId ?? null))
        error(["meaningBeats", i, "nextBeatId"], "Next beat must match order.");
    });
    b.pagePlan.forEach((p, i) => {
      if (p.order !== i + 1)
        error(
          ["pagePlan", i, "order"],
          "Pages must be contiguous and ordered.",
        );
      if (p.beatIds.some((id) => !beatIds.has(id)))
        error(["pagePlan", i, "beatIds"], "Unknown beat reference.");
    });
    if (
      !b.languageModes.includes(b.primaryLanguageMode) ||
      !b.languageVersions.some((e) => e.mode === b.primaryLanguageMode)
    )
      error(["primaryLanguageMode"], "Primary edition is required.");
    for (const e of b.languageVersions) {
      if (
        !b.languageModes.includes(e.mode) ||
        e.sourceRevision !== b.revisionId
      )
        error(
          ["languageVersions"],
          "Edition must match declared mode and canonical revision.",
        );
      if (
        e.pages.length !== pageIds.size ||
        new Set(e.pages.map((p) => p.pageId)).size !== pageIds.size ||
        e.pages.some((p, i) => p.pageId !== b.pagePlan[i]?.pageId)
      )
        error(
          ["languageVersions"],
          "Edition pages must match canonical page order exactly.",
        );
      const counts = e.pages.map((p) =>
        countWords([p.narration, ...p.dialogue.map((d) => d.text)].join(" ")),
      );
      if (
        e.pages.some((p, i) => p.wordCount !== counts[i]) ||
        e.totalWords !== counts.reduce((x, y) => x + y, 0)
      )
        error(["languageVersions"], "Measured word totals do not match prose.");
      if (
        e.pages.some((p) => p.dialogue.some((d) => !charIds.has(d.speakerId)))
      )
        error(["languageVersions"], "Unknown dialogue speaker.");
    }
    if (
      b.videoAdaptationNotes.childViewingEligibility !==
      (b.ageMonths < 24 ? "ineligible-child-viewing" : "eligible-co-viewing")
    )
      error(
        ["videoAdaptationNotes"],
        "Under-two child-facing video is excluded by product policy.",
      );
  });
export type StoryBlueprint = z.infer<typeof BlueprintSchema>;
export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/u)
    .filter((t) => /[\p{L}\p{N}]/u.test(t)).length;
}
export class ValidationError extends Error {
  constructor(public readonly issues: { path: string; message: string }[]) {
    super(issues.map((i) => `${i.path}: ${i.message}`).join("\n"));
    this.name = "ValidationError";
  }
}
export function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success)
    throw new ValidationError(
      r.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    );
  return r.data;
}
export function loadBlueprint(value: unknown): {
  blueprint: StoryBlueprint;
  migrations: string[];
} {
  const version = (value as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (version === "blueprint/1.0")
    return { blueprint: validate(BlueprintSchema, value), migrations: [] };
  if (version !== "blueprint/0.1")
    throw new ValidationError([
      {
        path: "schemaVersion",
        message:
          "Unsupported or missing version; original data was not modified.",
      },
    ]);
  const source = structuredClone(value) as Record<string, any>;
  const mode = (s: unknown) =>
    s === "msa-simple" ? "ar-MSA-simple" : s === "ar-eg" ? "ar-EG" : s;
  source.schemaVersion = "blueprint/1.0";
  source.languageModes = Array.isArray(source.languageModes)
    ? source.languageModes.map(mode)
    : source.languageModes;
  source.primaryLanguageMode = mode(source.primaryLanguageMode);
  if (
    source.videoAdaptationNotes?.childViewingEligibility ===
    "eligible-with-caregiver"
  )
    source.videoAdaptationNotes.childViewingEligibility = "eligible-co-viewing";
  if (Array.isArray(source.languageVersions))
    source.languageVersions = source.languageVersions.map(
      (e: Record<string, unknown>) => ({
        ...e,
        mode: mode(e.mode),
        status:
          e.status === "proposed-copy-for-spec-not-approved-manuscript"
            ? "draft"
            : e.status,
      }),
    );
  return {
    blueprint: validate(BlueprintSchema, source),
    migrations: [
      "blueprint/0.1 -> blueprint/1.0: explicit language/video policy aliases and draft status; no text/meaning changed",
    ],
  };
}
export function parseBlueprintJson(text: string) {
  if (text.length > 2_000_000)
    throw new ValidationError([
      { path: "file", message: "Project exceeds Phase 2 import size limit." },
    ]);
  try {
    return loadBlueprint(JSON.parse(text));
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError([
      {
        path: "file",
        message: "Invalid JSON; original file was not modified.",
      },
    ]);
  }
}

export interface StoryGenerationProvider {
  generate(input: {
    blueprint: StoryBlueprint;
    requestId: string;
    signal?: AbortSignal;
  }): Promise<{ draft: unknown; providerRequestId: string }>;
}
export interface IllustrationProvider {
  generate(input: {
    page: Page;
    characterBibles: CharacterBible[];
    style: StyleProfile;
    requestId: string;
    signal?: AbortSignal;
  }): Promise<{ candidateUri: string; providerRequestId: string }>;
}
export interface VideoProvider {
  render(input: {
    shots: VideoShot[];
    requestId: string;
    signal?: AbortSignal;
  }): Promise<{ candidateUri: string }>;
}
