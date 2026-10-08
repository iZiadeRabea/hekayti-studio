import { app, BrowserWindow, dialog, nativeImage, clipboard } from "electron";
import {
  readFile,
  mkdir,
  writeFile,
  unlink,
  lstat,
  realpath,
  rename,
} from "node:fs/promises";
import { join, resolve, dirname, sep } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { AppError, Id, LanguageModeSchema } from "@hekayti/contracts";
import { SimpleCreateInputSchema } from "@hekayti/contracts/creator";
import {
  BookCommandSchema,
  SelectBookAssetsSchema,
  type BookStudioSnapshot,
  type AssetManifest,
} from "@hekayti/contracts/book";
import {
  PrivateBookAssetStore,
  ensurePrivateBookDirectory,
  SqliteProjectRepository,
} from "@hekayti/persistence";
import { BookStudioService } from "@hekayti/core/book";
import type { SimpleCreatorService } from "@hekayti/core/creator";
import type { StoryWorkflowService } from "@hekayti/core/workflow";
import type { StoryPlannerService } from "@hekayti/core/planner";
import { contentHash } from "@hekayti/core";
import {
  bookHtml,
  measureBookScript,
  BOOK_RENDERER_VERSION,
} from "@hekayti/export";
const version = z.number().int().nonnegative();
export function installBookRuntime(
  repo: SqliteProjectRepository,
  creator: SimpleCreatorService,
  workflow: StoryWorkflowService,
  planner: StoryPlannerService,
  win: BrowserWindow,
  handle: <T>(channel: string, fn: (arg: unknown) => T | Promise<T>) => void,
  distRoot: string,
) {
  const privateRoot = join(app.getPath("userData"), "private-books"),
    assets = new PrivateBookAssetStore(
      join(privateRoot, "assets"),
      {
        dimensions: (bytes) => {
          const image = nativeImage.createFromBuffer(Buffer.from(bytes));
          return image.isEmpty() ? null : image.getSize();
        },
      },
      [app.getAppPath(), process.cwd()],
    );
  const fonts = Promise.all([
    readFile(join(distRoot, "fonts", "arabic.woff2")),
    readFile(join(distRoot, "fonts", "latin.woff2")),
  ]).then(([arabic, latin]) => ({
    arabic: arabic.toString("base64"),
    latin: latin.toString("base64"),
  }));
  async function render(
    s: BookStudioSnapshot,
    kind: "digital" | "print",
    pdf = false,
    visible = false,
  ) {
    const layout = s.layout;
    if (!layout) throw new AppError("BOOK_LAYOUT", "جهز تصميم الكتاب أولًا.");
    const imageData: Record<string, string> = {};
    let total = 0;
    for (const page of layout.pages) {
      const image = s.book.images.find((i) => i.imageId === page.imageId)!,
        ref = s.book.assets.find((a) => a.assetId === image.assetId)!;
      total += ref.bytes;
      if (total > 120000000)
        throw new AppError(
          "BOOK_EXPORT_SIZE",
          "صور الكتاب كبيرة جدًا؛ استورد نسخًا مناسبة لحجم الكتاب.",
        );
      const data = await assets.preview(ref);
      if (!data)
        throw new AppError(
          "BOOK_ASSET_MISSING",
          "الصورة المرجعية غير موجودة في مكانها. أعد ربط الصورة.",
        );
      imageData[page.imageId] = data;
    }
    const f = await fonts,
      html = bookHtml(layout, kind, f, imageData),
      fingerprint = await contentHash({
        fonts: f,
        renderer: BOOK_RENDERER_VERSION,
      });
    const tempDir = join(privateRoot, "render-temp");
    await ensurePrivateBookDirectory(tempDir, [
      app.getAppPath(),
      process.cwd(),
    ]);
    const path = join(tempDir, randomUUID() + ".html");
    await writeFile(path, html, { flag: "wx" });
    const view = new BrowserWindow({
      show: false,
      title: "معاينة الكتاب",
      width: 900,
      height: 900,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });
    view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    view.webContents.on("will-navigate", (event) => event.preventDefault());
    try {
      await view.loadFile(path);
      const measured = (await view.webContents.executeJavaScript(
        measureBookScript,
      )) as {
        errors: { boxId: string; page: string; reason: string }[];
        pages: number;
        fontReady: boolean;
      };
      if (!measured.fontReady || measured.pages !== layout.pages.length)
        throw new AppError(
          "BOOK_RENDER",
          "لم يكتمل تحميل خط الكتاب أو صفحاته.",
        );
      if (pdf && measured.errors.length)
        throw new AppError(
          "BOOK_TEXT_OVERFLOW",
          `النص طويل على المساحة الحالية في الصفحة ${measured.errors[0]!.page}. كبّر مساحة النص أو عدّله.`,
          {
            section: "book",
            pageId: layout.pages.find(
              (p) => String(p.pageNumber) === measured.errors[0]!.page,
            )?.pageId,
            control: "layout",
          },
        );
      const bytes = pdf
        ? await view.webContents.printToPDF({
            printBackground: true,
            preferCSSPageSize: true,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            generateTaggedPDF: true,
          })
        : null;
      if (
        bytes &&
        (bytes.length > 150000000 ||
          !bytes.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
          !bytes.subarray(-32).toString().includes("%%EOF"))
      )
        throw new AppError(
          "BOOK_PDF_INVALID",
          "لم يكتمل ملف PDF؛ النسخة السابقة محفوظة.",
        );
      if (visible) {
        view.on("closed", () => {
          void unlink(path).catch(() => {});
        });
        view.show();
      }
      return {
        html,
        pages: measured.pages,
        errors: measured.errors,
        fingerprint,
        bytes,
      };
    } finally {
      if (!visible || !view.isVisible()) {
        view.destroy();
        await unlink(path).catch(() => {});
      }
    }
  }
  const studio = new BookStudioService(
    repo,
    creator,
    workflow,
    planner,
    { id: randomUUID, now: () => new Date().toISOString() },
    async (s) => {
      const result = await render(s, "digital");
      if (result.errors.length)
        throw new AppError(
          "BOOK_TEXT_OVERFLOW",
          `النص طويل على المساحة الحالية في الصفحة ${result.errors[0]!.page}.`,
          {
            section: "book",
            pageId: s.layout?.pages.find(
              (p) => String(p.pageNumber) === result.errors[0]!.page,
            )?.pageId,
            control: "layout",
          },
        );
      return result.fingerprint;
    },
  );
  const base = z.object({ projectId: Id, expectedBook: version }).strict();
  const ref = (projectId: string, assetId: string): AssetManifest => {
    const a = repo
      .loadBook(projectId)
      .assets.find((a) => a.assetId === assetId);
    if (!a) throw new AppError("BOOK_ASSET", "الصورة غير موجودة في المشروع.");
    return a;
  };
  const preflight = async (
    s: BookStudioSnapshot,
    sheetVersions: string[] = [],
  ) => {
    for (const identity of s.identities)
      for (const id of identity.referenceAssets)
        if (!(await assets.read(ref(s.book.projectId, id))))
          throw new AppError(
            "BOOK_ASSET_MISSING",
            "الصورة المرجعية غير موجودة في مكانها. أعد ربط الصورة.",
            {
              section: "images",
              characterId: identity.characterId,
              control: "identity",
            },
          );
    for (const sheetId of new Set(sheetVersions)) {
      const sheet = s.book.images.find(
        (i) => i.imageId === sheetId && i.kind === "CHARACTER_SHEET",
      );
      if (!sheet || !(await assets.read(ref(s.book.projectId, sheet.assetId))))
        throw new AppError(
          "BOOK_ASSET_MISSING",
          "مرجع شكل الشخصية المعتمد غير موجود؛ أعد ربط نفس الصورة قبل تجهيز البرومبت أو اعتماد الكتاب.",
          {
            section: "images",
            characterId: sheet?.characterId,
            imageId: sheet?.imageId,
            control: "sheet",
          },
        );
    }
  };
  handle("studio:defaults", (arg) => {
    const x = z
      .object({
        ageMonths: z.number().int().min(0).max(95),
        category: z.string().max(100),
        goalPreset: z.string().max(100),
        mode: LanguageModeSchema,
      })
      .strict()
      .parse(arg);
    return studio.defaults(x.ageMonths, x.category, x.goalPreset, x.mode);
  });
  handle("studio:create", (arg) =>
    studio.create(SimpleCreateInputSchema.parse(arg)),
  );
  handle("studio:load", (arg) => {
    const x = z
      .object({ projectId: Id, mode: LanguageModeSchema.optional() })
      .strict()
      .parse(arg);
    return studio.load(x.projectId, x.mode);
  });
  handle("studio:command", async (arg) => {
    const x = BookCommandSchema.parse(arg),
      snapshot = studio.load(x.projectId, x.mode);
    if (["PROMPT", "COPY_PROMPT", "APPROVE_BOOK"].includes(x.action))
      await preflight(
        snapshot,
        x.action === "COPY_PROMPT"
          ? (snapshot.prompts.find((p) => p.promptId === x.promptId)?.binding
              .sheetVersions ?? [])
          : x.action === "PROMPT"
            ? x.kind === "CHARACTER_REFERENCE"
              ? []
              : snapshot.images
                  .filter((i) => i.kind === "CHARACTER_SHEET" && i.selected)
                  .map((i) => i.imageId)
            : [
                ...snapshot.images
                  .filter((i) => i.kind === "CHARACTER_SHEET" && i.selected)
                  .map((i) => i.imageId),
                ...(snapshot.layout?.pages.flatMap(
                  (p) =>
                    snapshot.images.find((i) => i.imageId === p.imageId)
                      ?.binding.sheetVersions ?? [],
                ) ?? []),
              ],
      );
    if (
      x.action === "IMAGE_DECISION" &&
      ["APPROVE", "USE"].includes(x.choice)
    ) {
      const image = snapshot.images.find((i) => i.imageId === x.imageId);
      if (!image || !(await assets.read(ref(x.projectId, image.assetId))))
        throw new AppError(
          "BOOK_ASSET_MISSING",
          "الصورة غير موجودة؛ أعد ربط النسخة الأصلية قبل اعتمادها.",
        );
    }
    const now = studio.load(x.projectId);
    if (
      now.session.workflow.recordVersion !==
        snapshot.session.workflow.recordVersion ||
      now.session.planner.recordVersion !==
        snapshot.session.planner.recordVersion
    )
      throw new AppError(
        "BOOK_SOURCE_CONFLICT",
        "القصة تغيرت أثناء فحص الصور؛ افتحها من جديد.",
      );
    const out = await studio.command(x);
    if (x.action === "COPY_PROMPT" && out.text) clipboard.writeText(out.text);
    return out;
  });
  handle("studio:select-assets", async (arg) => {
    const x = SelectBookAssetsSchema.parse(arg),
      current = studio.load(x.projectId);
    if (current.book.recordVersion !== x.expectedBook)
      throw new AppError("BOOK_CONFLICT", "الكتاب تغير؛ افتحه من جديد.");
    const selection = await dialog.showOpenDialog(win, {
      title:
        x.kind === "PHOTO" ? "اختار صور الشخصية الخاصة" : "استورد صورة الكتاب",
      filters: [{ name: "صور", extensions: ["png", "jpg", "jpeg", "webp"] }],
      properties:
        x.kind === "PHOTO" ? ["openFile", "multiSelections"] : ["openFile"],
    });
    if (selection.canceled) return null;
    if (selection.filePaths.length > (x.kind === "PHOTO" ? 24 : 1))
      throw new AppError(
        "BOOK_ASSET_COUNT",
        "اختر حتى ٢٤ صورة مرجعية، أو صورة واحدة للنسخة.",
      );
    const imported = [];
    for (const path of selection.filePaths)
      imported.push(
        await assets.importSelected(
          x.projectId,
          path,
          x.kind,
          current.book.classification,
        ),
      );
    const now = studio.load(x.projectId);
    if (
      now.session.workflow.recordVersion !==
        current.session.workflow.recordVersion ||
      now.session.planner.recordVersion !==
        current.session.planner.recordVersion
    )
      throw new AppError(
        "BOOK_SOURCE_CONFLICT",
        "القصة تغيرت أثناء اختيار الصورة؛ افتحها من جديد.",
      );
    return studio.addSelectedAssets(x, imported);
  });
  handle("studio:asset-preview", async (arg) => {
    const x = z.object({ projectId: Id, assetId: Id }).strict().parse(arg);
    return assets.preview(ref(x.projectId, x.assetId));
  });
  handle("studio:relink-asset", async (arg) => {
    const x = base.extend({ assetId: Id }).parse(arg);
    if (repo.loadBook(x.projectId).recordVersion !== x.expectedBook)
      throw new AppError("BOOK_CONFLICT", "الكتاب تغير؛ افتحه من جديد.");
    const manifest = ref(x.projectId, x.assetId),
      selection = await dialog.showOpenDialog(win, {
        title: "أعد ربط نفس الصورة الأصلية",
        filters: [{ name: "صور", extensions: ["png", "jpg", "jpeg", "webp"] }],
        properties: ["openFile"],
      });
    if (selection.canceled) return null;
    if (repo.loadBook(x.projectId).recordVersion !== x.expectedBook)
      throw new AppError("BOOK_CONFLICT", "الكتاب تغير أثناء اختيار الصورة.");
    await assets.relinkSelected(manifest, selection.filePaths[0]!);
    return studio.load(x.projectId);
  });
  handle("studio:preview", async (arg) => {
    const x = base.parse(arg),
      s = studio.load(x.projectId);
    if (s.book.recordVersion !== x.expectedBook)
      throw new AppError("BOOK_CONFLICT", "الكتاب تغير؛ افتحه من جديد.");
    const r = await render(s, "digital");
    return { html: r.html, pages: r.pages, errors: r.errors };
  });
  handle("studio:show-preview", async (arg) => {
    const x = base.parse(arg),
      s = studio.load(x.projectId);
    if (s.book.recordVersion !== x.expectedBook)
      throw new AppError("BOOK_CONFLICT", "الكتاب تغير؛ افتحه من جديد.");
    const r = await render(s, "digital", false, true);
    return { pages: r.pages, errors: r.errors };
  });
  handle("studio:export", async (arg) => {
    const x = base.extend({ kind: z.enum(["digital", "print"]) }).parse(arg),
      s = await studio.exportModel(x.projectId, x.expectedBook);
    await preflight(
      s,
      s.layout?.pages.flatMap(
        (p) =>
          s.images.find((i) => i.imageId === p.imageId)?.binding
            .sheetVersions ?? [],
      ) ?? [],
    );
    const output = join(privateRoot, "exports", x.projectId);
    await ensurePrivateBookDirectory(output, [app.getAppPath(), process.cwd()]);
    const choice = await dialog.showSaveDialog(win, {
      title: x.kind === "print" ? "تصدير كتاب للطباعة" : "تصدير كتاب رقمي",
      defaultPath: join(output, `book-${x.kind}.pdf`),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (choice.canceled || !choice.filePath) return null;
    const target = resolve(choice.filePath),
      parent = dirname(target),
      canonicalParent = await ensurePrivateBookDirectory(parent, [
        app.getAppPath(),
        process.cwd(),
      ]);
    if (canonicalParent.toLowerCase() !== resolve(parent).toLowerCase())
      throw new AppError(
        "BOOK_EXPORT_PATH",
        "اختر مجلدًا محليًا مباشرًا للتصدير.",
      );
    const sourceRoots = [app.getAppPath(), process.cwd()].map((r) =>
      resolve(r).toLowerCase(),
    );
    if (
      sourceRoots.some(
        (r) =>
          target.toLowerCase() === r ||
          target.toLowerCase().startsWith(r + sep),
      )
    )
      throw new AppError(
        "BOOK_EXPORT_PRIVATE",
        "احفظ الكتاب خارج ملفات المصدر والنسخ العامة.",
      );
    if (
      s.book.classification === "PRIVATE_LOCAL_PROJECT" &&
      /(?:^|[\\/])(?:OneDrive|Google Drive|GoogleDrive|Dropbox)(?:[\\/]|$)/i.test(
        target,
      )
    )
      throw new AppError(
        "BOOK_EXPORT_PRIVATE",
        "هذا كتاب خاص؛ اختر مجلدًا محليًا غير متزامن سحابيًا.",
      );
    try {
      if ((await lstat(target)).isSymbolicLink())
        throw new AppError("BOOK_EXPORT_PATH", "لا يمكن التصدير إلى رابط ملف.");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    const r = await render(s, x.kind, true);
    if (r.fingerprint !== s.book.approvals.at(-1)!.renderFingerprint)
      throw new AppError(
        "BOOK_FONT_STALE",
        "خط الكتاب أو طريقة الرسم تغيرت؛ راجع الكتاب واعتمده من جديد.",
      );
    await studio.exportModel(x.projectId, x.expectedBook);
    const candidate = join(parent, ".hekayti-" + randomUUID() + ".candidate");
    await writeFile(candidate, r.bytes!, { flag: "wx" });
    try {
      await rename(candidate, target);
    } catch (e) {
      await unlink(candidate).catch(() => {});
      throw e;
    }
    return {
      path: target,
      pages: r.pages,
      sha256: createHash("sha256").update(r.bytes!).digest("hex"),
    };
  });
  return { studio, assets, render };
}
