import { z } from "zod";
import { Id, LanguageModeSchema } from "./index";
import type { SimpleSession } from "@hekayti/core/creator";
const text = z.string().min(1).max(4000);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const version = z.number().int().nonnegative();
const finite = z.number().finite();
export const BookIntentSchema = z
  .object({
    idea: z
      .object({
        source: z.enum(["SUGGESTED", "LIBRARY", "CUSTOM"]),
        text,
        libraryRef: z
          .object({ recordId: Id, version: z.number().int().positive() })
          .strict()
          .optional(),
      })
      .strict(),
    path: z
      .object({
        mode: z.enum(["AUTO", "GUIDED", "CUSTOM"]),
        key: z
          .enum([
            "QUIET_DISCOVERY",
            "BEDTIME",
            "RECOGNITION",
            "FEELINGS",
            "DAILY_ROUTINE",
            "SMALL_PROBLEM",
            "SHARING",
            "ADVENTURE",
          ])
          .optional(),
        steps: z.array(text).max(32).default([]),
      })
      .strict(),
    length: z.enum(["AUTO", "SHORT", "NORMAL", "LONG"]).default("AUTO"),
  })
  .strict()
  .superRefine((x, c) => {
    if (x.idea.source === "LIBRARY" && !x.idea.libraryRef)
      c.addIssue({
        code: "custom",
        message: "Library idea needs its exact source.",
      });
    if (x.idea.source !== "LIBRARY" && x.idea.libraryRef)
      c.addIssue({
        code: "custom",
        message: "Only a Library idea carries Library source authority.",
      });
    if (x.path.mode === "CUSTOM" && x.path.steps.length < 2)
      c.addIssue({
        code: "custom",
        message: "A custom path needs at least two steps.",
      });
    if (x.path.mode === "GUIDED" && !x.path.key)
      c.addIssue({ code: "custom", message: "Choose a guided path." });
  });
export type BookIntent = z.infer<typeof BookIntentSchema>;
export const EntityStateSchema = z
  .object({
    entityId: Id,
    kind: z.enum(["CHARACTER", "PROP"]),
    name: text,
    location: text,
    visibility: z.enum([
      "VISIBLE",
      "PARTIAL",
      "COVERED",
      "OUT_OF_SCENE",
      "UNKNOWN",
    ]),
    heldBy: Id.nullable(),
    coveredBy: Id.nullable(),
    state: text,
  })
  .strict();
export const ScenePageSchema = z
  .object({
    pageNumber: z.number().int().positive().max(100),
    beatId: Id,
    creatorStep: z.number().int().nonnegative(),
    intent: text,
    action: text,
    before: z.array(EntityStateSchema).max(40),
    after: z.array(EntityStateSchema).max(40),
    reviewRequired: z.boolean(),
  })
  .strict()
  .superRefine((x, c) => {
    for (const list of [x.before, x.after]) {
      if (new Set(list.map((e) => e.entityId)).size !== list.length)
        c.addIssue({
          code: "custom",
          message: "Scene entity identities must be unique.",
        });
      for (const e of list) {
        if (
          e.heldBy &&
          (!list.some(
            (holder) =>
              holder.entityId === e.heldBy && holder.kind === "CHARACTER",
          ) ||
            e.heldBy === e.entityId)
        )
          c.addIssue({
            code: "custom",
            message: "Held-by must resolve to a distinct declared actor.",
          });
        if (
          e.coveredBy &&
          (!list.some(
            (cover) => cover.entityId === e.coveredBy && cover.kind === "PROP",
          ) ||
            e.coveredBy === e.entityId)
        )
          c.addIssue({
            code: "custom",
            message: "Covered-by must resolve to a distinct declared prop.",
          });
      }
    }
  });
export type ScenePage = z.infer<typeof ScenePageSchema>;
export const AssetManifestSchema = z
  .object({
    assetId: Id,
    projectId: Id,
    sha256: hash,
    mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
    bytes: z.number().int().positive().max(40000000),
    width: z.number().int().positive().max(16000),
    height: z.number().int().positive().max(16000),
    classification: z.enum(["PUBLIC_SYNTHETIC", "PRIVATE_LOCAL_PROJECT"]),
    purpose: z.enum(["PHOTO", "CHARACTER_SHEET", "COVER", "PAGE"]),
    createdAt: text,
  })
  .strict()
  .superRefine((x, c) => {
    if (x.purpose === "PHOTO" && x.classification !== "PRIVATE_LOCAL_PROJECT")
      c.addIssue({
        code: "custom",
        message: "Photo references must remain private.",
      });
    if (x.width * x.height > 40000000)
      c.addIssue({
        code: "custom",
        message: "Decoded image exceeds pixel bounds.",
      });
  });
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
export const IdentityPackSchema = z
  .object({
    revisionId: Id,
    characterId: Id,
    name: text,
    ageMonths: z.number().int().min(0).max(95),
    identityMode: z.enum(["FICTIONAL", "REAL_PHOTOS"]),
    referenceAssets: z.array(Id).max(24),
    creatorNotes: z.string().max(4000),
    likeness: z.enum(["NATURAL", "STRONG", "CLOSEST"]),
    hairRule: text,
    appearanceRule: text,
    faceRule: text,
    clothingRule: text,
    proportionsRule: text,
    accessoryRule: text,
    mustPreserve: z.array(text).max(20),
    mustNotChange: z.array(text).max(20),
    styleAllowance: text,
    approvedProfile: z.boolean(),
  })
  .strict()
  .superRefine((x, c) => {
    if (x.identityMode === "REAL_PHOTOS" && !x.referenceAssets.length)
      c.addIssue({
        code: "custom",
        message: "Real identity requires selected reference photos.",
      });
  });
export type IdentityPack = z.infer<typeof IdentityPackSchema>;
export const VisualBindingSchema = z
  .object({
    storyRevision: Id,
    draftId: Id.nullable(),
    sceneHash: hash,
    identityRevisions: z.array(Id).max(20),
    sheetVersions: z.array(Id).max(20),
    styleRevision: Id,
  })
  .strict();
export const BookImageSchema = z
  .object({
    imageId: Id,
    slot: text,
    kind: z.enum(["CHARACTER_SHEET", "COVER", "PAGE"]),
    characterId: Id.optional(),
    pageId: Id.optional(),
    assetId: Id,
    binding: VisualBindingSchema,
    createdAt: text,
  })
  .strict();
export type BookImage = z.infer<typeof BookImageSchema>;
export const ImageDecisionSchema = z
  .object({
    decisionId: Id,
    imageId: Id,
    choice: z.enum(["USE", "APPROVE", "REJECT", "ARCHIVE"]),
    notes: z.string().max(2000),
    createdAt: text,
  })
  .strict();
export const BookPromptSchema = z
  .object({
    promptId: Id,
    slot: text,
    kind: z.enum(["CHARACTER_REFERENCE", "COVER", "PAGE"]),
    binding: VisualBindingSchema,
    summary: text,
    text: z.string().min(1).max(30000),
    createdAt: text,
  })
  .strict();
export const BookSettingsSchema = z
  .object({
    preset: z.enum(["SQUARE", "A5", "CUSTOM"]),
    widthMm: finite.min(90).max(420),
    heightMm: finite.min(90).max(420),
    safeMm: finite.min(5).max(30),
    gutterMm: finite.min(0).max(20),
    bleedMm: finite.min(0).max(6),
    pageNumbers: z.boolean(),
  })
  .strict()
  .superRefine((x, c) => {
    if (x.safeMm * 2 + x.gutterMm >= Math.min(x.widthMm, x.heightMm))
      c.addIssue({ code: "custom", message: "Margins leave no usable page." });
  });
export type BookSettings = z.infer<typeof BookSettingsSchema>;
export const AnchorSchema = z
  .object({ speakerId: Id, x: finite.min(0).max(1), y: finite.min(0).max(1) })
  .strict();
export const TextBoxSchema = z
  .object({
    boxId: Id,
    kind: z.enum([
      "TITLE",
      "SUBTITLE",
      "BRAND",
      "NARRATION",
      "DIALOGUE",
      "PAGE_NUMBER",
    ]),
    sourceIndex: z.number().int().min(0).max(100),
    speakerId: Id.optional(),
    x: finite.min(0).max(1),
    y: finite.min(0).max(1),
    width: finite.min(0.05).max(1),
    height: finite.min(0.03).max(1),
    fontPt: finite.min(14).max(60),
    style: z.enum(["CLEAN", "PAPER", "CAPTION", "BUBBLE"]),
    tail: z.enum(["NONE", "LEFT", "RIGHT", "TOP", "BOTTOM", "ANCHOR"]),
    text: z.string().max(8000),
  })
  .strict()
  .superRefine((x, c) => {
    if (x.x + x.width > 1.000001 || x.y + x.height > 1.000001)
      c.addIssue({ code: "custom", message: "Text box exceeds page." });
    if (x.kind === "DIALOGUE" && !x.speakerId)
      c.addIssue({
        code: "custom",
        message: "Dialogue must bind its canonical speaker.",
      });
  });
export type TextBox = z.infer<typeof TextBoxSchema>;
export const PageLayoutSchema = z
  .object({
    pageId: Id,
    pageNumber: z.number().int().nonnegative().max(100),
    imageId: Id,
    anchors: z.array(AnchorSchema).max(20),
    boxes: z.array(TextBoxSchema).min(1).max(102),
  })
  .strict();
export type PageLayout = z.infer<typeof PageLayoutSchema>;
export const BookLayoutSchema = z
  .object({
    revisionId: Id,
    draftId: Id,
    mode: LanguageModeSchema,
    title: text,
    subtitle: z.string().max(200),
    brand: z.string().max(200),
    settings: BookSettingsSchema,
    pages: z.array(PageLayoutSchema).min(2).max(101),
    font: z.literal("Noto Sans Arabic"),
    createdAt: text,
  })
  .strict();
export type BookLayout = z.infer<typeof BookLayoutSchema>;
export const BookStateSchema = z
  .object({
    schemaVersion: z.literal("book-state/1.0"),
    projectId: Id,
    recordVersion: version,
    classification: z.enum(["PUBLIC_SYNTHETIC", "PRIVATE_LOCAL_PROJECT"]),
    intents: z
      .array(
        z
          .object({
            revisionId: Id,
            planRevisionId: Id,
            intent: BookIntentSchema,
            scenes: z.array(ScenePageSchema).min(1).max(100),
            createdAt: text,
          })
          .strict(),
      )
      .max(1000),
    assets: z.array(AssetManifestSchema).max(5000),
    identities: z.array(IdentityPackSchema).max(1000),
    styles: z
      .array(z.object({ revisionId: Id, description: text }).strict())
      .max(1000),
    prompts: z.array(BookPromptSchema).max(10000),
    images: z.array(BookImageSchema).max(5000),
    decisions: z.array(ImageDecisionSchema).max(10000),
    layouts: z.array(BookLayoutSchema).max(1000),
    approvals: z
      .array(
        z
          .object({
            approvalId: Id,
            layoutRevisionId: Id,
            contentHash: hash,
            renderFingerprint: hash,
            createdAt: text,
          })
          .strict(),
      )
      .max(1000),
    ratings: z
      .array(
        z
          .object({
            draftId: Id,
            naturalness: z.number().int().min(1).max(5),
            enjoyment: z.number().int().min(1).max(5),
            logic: z.number().int().min(1).max(5),
            ageFit: z.number().int().min(1).max(5),
            rhythm: z.number().int().min(1).max(5),
          })
          .strict(),
      )
      .max(1000),
    storyTitles: z
      .array(z.object({ draftId: Id, title: text }).strict())
      .max(1000),
  })
  .strict()
  .superRefine((x, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    for (const list of [
      x.assets.map((a) => a.assetId),
      x.identities.map((a) => a.revisionId),
      x.images.map((a) => a.imageId),
      x.layouts.map((a) => a.revisionId),
      x.prompts.map((a) => a.promptId),
      x.decisions.map((a) => a.decisionId),
      x.intents.map((a) => a.revisionId),
      x.styles.map((a) => a.revisionId),
      x.approvals.map((a) => a.approvalId),
    ])
      if (new Set(list).size !== list.length)
        fail("Duplicate book identities.");
    for (const a of x.assets)
      if (a.projectId !== x.projectId)
        fail("Asset belongs to another project.");
    if (
      x.assets.some((a) => a.classification === "PRIVATE_LOCAL_PROJECT") &&
      x.classification !== "PRIVATE_LOCAL_PROJECT"
    )
      fail("Private classification cannot be removed.");
    for (const i of x.identities)
      if (
        i.referenceAssets.some(
          (id) =>
            !x.assets.some((a) => a.assetId === id && a.purpose === "PHOTO"),
        )
      )
        fail("Identity reference photo is missing.");
    for (const i of x.images)
      if (
        !x.assets.some((a) => a.assetId === i.assetId && a.purpose === i.kind)
      )
        fail("Image asset purpose differs.");
    for (const d of x.decisions)
      if (!x.images.some((i) => i.imageId === d.imageId))
        fail("Image decision source is missing.");
    for (const l of x.layouts)
      if (l.pages.some((p) => !x.images.some((i) => i.imageId === p.imageId)))
        fail("Layout image source is missing.");
    for (const a of x.approvals)
      if (!x.layouts.some((l) => l.revisionId === a.layoutRevisionId))
        fail("Approval layout is missing.");
  });
export type BookState = z.infer<typeof BookStateSchema>;
export interface BookStudioSnapshot {
  session: SimpleSession;
  book: BookState;
  mode: z.infer<typeof LanguageModeSchema>;
  scenes: ScenePage[];
  identities: IdentityPack[];
  images: (BookImage & {
    status:
      "IMPORTED" | "REVIEW_REQUIRED" | "APPROVED" | "REJECTED" | "ARCHIVED";
    stale: boolean;
    reasons: string[];
  })[];
  prompts: z.infer<typeof BookPromptSchema>[];
  layout: BookLayout | null;
  approved: boolean;
  notices: { code: string; text: string; pageId?: string }[];
  text?: string;
}
const base = { projectId: Id, expectedBook: version };
export const BookCommandSchema = z.discriminatedUnion("action", [
  z
    .object({ ...base, action: z.literal("COPY_PROMPT"), promptId: Id })
    .strict(),
  z.object({ ...base, action: z.literal("PREPARE_WRITER") }).strict(),
  z
    .object({
      ...base,
      action: z.literal("EDIT_PATH"),
      intent: BookIntentSchema,
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("EDIT_STORY"),
      draftId: Id,
      title: text,
      mode: LanguageModeSchema,
      pages: z
        .array(
          z
            .object({
              pageNumber: z.number().int().positive(),
              narration: z.string().max(8000),
              dialogue: z
                .array(
                  z
                    .object({ speakerId: Id, text: z.string().max(2000) })
                    .strict(),
                )
                .max(20),
              altText: z.string().max(2000),
            })
            .strict(),
        )
        .min(1)
        .max(100),
    })
    .strict(),
  z
    .object({ ...base, action: z.literal("APPROVE_STORY"), draftId: Id })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("IDENTITY"),
      identity: IdentityPackSchema,
    })
    .strict(),
  z.object({ ...base, action: z.literal("STYLE"), description: text }).strict(),
  z
    .object({
      ...base,
      action: z.literal("PROMPT"),
      kind: z.enum(["CHARACTER_REFERENCE", "COVER", "PAGE"]),
      characterId: Id.optional(),
      pageId: Id.optional(),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("IMAGE_DECISION"),
      imageId: Id,
      choice: z.enum(["USE", "APPROVE", "REJECT", "ARCHIVE"]),
      notes: z.string().max(2000).default(""),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("AUTO_LAYOUT"),
      mode: LanguageModeSchema,
      settings: BookSettingsSchema.optional(),
      subtitle: z.string().max(200).default(""),
      brand: z.string().max(200).default(""),
    })
    .strict(),
  z
    .object({
      ...base,
      action: z.literal("SAVE_LAYOUT"),
      layout: BookLayoutSchema,
    })
    .strict(),
  z.object({ ...base, action: z.literal("APPROVE_BOOK") }).strict(),
  z
    .object({
      ...base,
      action: z.literal("RATE"),
      ratings: BookStateSchema.shape.ratings.element,
    })
    .strict(),
]);
export type BookCommand = z.input<typeof BookCommandSchema>;
export const SelectBookAssetsSchema = z
  .object({
    ...base,
    kind: z.enum(["PHOTO", "CHARACTER_SHEET", "COVER", "PAGE"]),
    characterId: Id.optional(),
    pageId: Id.optional(),
  })
  .strict()
  .superRefine((x, c) => {
    if (
      (x.kind === "PHOTO" || x.kind === "CHARACTER_SHEET") &&
      (!x.characterId || x.pageId)
    )
      c.addIssue({
        code: "custom",
        message: "Character asset requires its exact actor only.",
      });
    if (x.kind === "PAGE" && (!x.pageId || x.characterId))
      c.addIssue({
        code: "custom",
        message: "Page asset requires its exact page only.",
      });
    if (x.kind === "COVER" && (x.pageId || x.characterId))
      c.addIssue({
        code: "custom",
        message: "Cover cannot carry a character or page slot.",
      });
  });
export type SelectBookAssets = z.input<typeof SelectBookAssetsSchema>;
export interface BookDefaults {
  goalChoices?: { key: string; label: string; description: string }[];
  ideas: {
    key: string;
    title: string;
    description: string;
    ageMin: number;
    ageMax: number;
    category: string;
    libraryRef?: { recordId: string; version: number };
  }[];
  paths: {
    key: NonNullable<BookIntent["path"]["key"]>;
    title: string;
    steps: string[];
    ageMin: number;
    ageMax: number;
  }[];
  settings: BookSettings;
}
