import {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  dialog,
  session,
  clipboard,
} from "electron";
import { join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  parseBlueprintJson,
  validate,
  Id,
  ProjectSchema,
  AppError,
  publicError,
  type StoryBlueprint,
} from "@hekayti/contracts";
import {
  ageGuidance,
  contentHash,
  canonicalJson,
  invalidateDependents,
} from "@hekayti/core";
import { SqliteProjectRepository, writeNewFile } from "@hekayti/persistence";
import {
  writeCreativeArchive,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
import { proofHtml, proofMetadata, proofPages } from "@hekayti/export";
import type { Result } from "./api";
import {installBookRuntime} from "./book-runtime";
import { StoryRequestSchema } from "@hekayti/contracts/story";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { SimpleCreatorService } from "@hekayti/core/creator";
import { IllustrationService } from "@hekayti/core/illustration";
import { SimpleCommandSchema } from "@hekayti/contracts/creator";
import { IllustrationCommandSchema } from "@hekayti/contracts/illustration";
import { LanguageModeSchema } from "@hekayti/contracts";
import {
  StoryPlannerService,
  planGenerationInstructions,
} from "@hekayti/core/planner";
import {
  PlanningRequestSchema,
  PlanFeedbackSchema,
} from "@hekayti/contracts/planner";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import {
  LibraryRecordSchema,
  LibraryRefSchema,
  EditorialScoresSchema,
  ConsumerTargetSchema,
  VariationSchema,
  OperatorMetadataSchema,
} from "@hekayti/contracts/library";
import {
  StoryLibraryService,
  ManualBridgeService,
  generationInstructions,
  manualDraftInstructions,
  repairInstructions,
  latestLibraryRecords,
} from "@hekayti/core/library";

protocol.registerSchemesAsPrivileged([
  {
    scheme: "hekayti",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
const root = join(app.getAppPath(), "dist");
const smoke = process.argv.includes("--phase2-smoke");
const smokeRoot = process.argv
  .find((x) => x.startsWith("--smoke-root="))
  ?.slice("--smoke-root=".length);
const testDataRoot = process.argv
  .find((x) => x.startsWith("--phase2-data="))
  ?.slice("--phase2-data=".length);
if (smoke) {
  if (!smokeRoot)
    throw new Error("Smoke requires explicit isolated data directory.");
  app.setPath("userData", resolve(smokeRoot));
} else if (testDataRoot) app.setPath("userData", resolve(testDataRoot));
else
  app.setPath(
    "userData",
    join(app.getPath("appData"), "Hekayti-Studio-Phase2-Synthetic"),
  );
let repo: SqliteProjectRepository;
let workflow: StoryWorkflowService;
let win: BrowserWindow;
const revisionByProject = new Map<string, string>();
async function fixtures(): Promise<StoryBlueprint[]> {
  return Promise.all(
    ["test-a-under-1", "test-b-1-to-2", "test-c-3-plus"].map(async (n) => {
      const b = parseBlueprintJson(
        await readFile(join(root, "fixtures", n + ".json"), "utf8"),
      ).blueprint;
      return { ...b, projectId: "phase2-" + b.storyId };
    }),
  );
}
async function seed() {
  for (const b of await fixtures()) {
    if (!repo.loadProject(b.projectId)) {
      const now = new Date().toISOString();
      repo.transaction(() => {
        repo.createProject(
          validate(ProjectSchema, {
            schemaVersion: "project/1.0",
            projectId: b.projectId,
            title: b.workingTitle,
            origin: "synthetic",
            createdAt: now,
            updatedAt: now,
            recordVersion: 0,
          }),
        );
        repo.saveBlueprint(b);
      });
    }
    revisionByProject.set(b.projectId, b.revisionId);
  }
  return repo.listProjects();
}
async function exportProof() {
  const input = await fixtures();
  const fonts = {
    arabic: (await readFile(join(root, "fonts", "arabic.woff2"))).toString(
      "base64",
    ),
    latin: (await readFile(join(root, "fonts", "latin.woff2"))).toString(
      "base64",
    ),
  };
  const output = join(
    app.getPath("userData"),
    "exports",
    "proof-" + randomUUID(),
  );
  await mkdir(output, { recursive: true });
  const paths: { print: string; digital: string; pageCount: number } = {
    print: "",
    digital: "",
    pageCount: proofPages(input).length,
  };
  for (const kind of ["print", "digital"] as const) {
    const htmlPath = join(output, kind + ".html");
    await writeFile(htmlPath, proofHtml(input, kind, fonts), { flag: "wx" });
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
      },
    });
    try {
      await pdfWindow.loadFile(htmlPath);
      await pdfWindow.webContents.executeJavaScript(
        "document.fonts.ready.then(()=>true)",
      );
      const bounds = await pdfWindow.webContents.executeJavaScript(
        `Array.from(document.querySelectorAll('.text')).map((e,i)=>({page:i+1,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,overflow:e.scrollHeight>e.clientHeight+1, bottom:e.getBoundingClientRect().bottom, pageBottom:e.closest('.page').getBoundingClientRect().bottom-parseFloat(getComputedStyle(e.closest('.page')).paddingBottom)}))`,
      );
      await writeNewFile(
        join(output, kind + "-layout-bounds.json"),
        new TextEncoder().encode(JSON.stringify(bounds, null, 2)),
      );
      if (
        bounds.some(
          (b: { overflow: boolean; bottom: number; pageBottom: number }) =>
            b.overflow || b.bottom > b.pageBottom,
        )
      )
        throw new AppError(
          "PDF_OVERFLOW",
          "Synthetic text exceeds its safe layout; previous exports retained.",
        );
      const bytes = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        generateTaggedPDF: true,
      });
      const target = join(output, `hekayti-phase2-${kind}-proof.pdf`);
      await writeNewFile(target, bytes);
      paths[kind] = target;
      await writeNewFile(
        join(output, kind + "-metadata.json"),
        new TextEncoder().encode(
          JSON.stringify(await proofMetadata(input, kind), null, 2),
        ),
      );
    } finally {
      pdfWindow.destroy();
    }
  }
  return paths;
}
function handle<T>(channel: string, fn: (arg: unknown) => T | Promise<T>) {
  ipcMain.handle(channel, async (event, arg): Promise<Result<T>> => {
    try {
      if (
        event.sender !== win.webContents ||
        event.senderFrame !== win.webContents.mainFrame ||
        event.senderFrame.url !== "hekayti://studio/index.html"
      )
        throw new AppError("IPC_DENIED", "Unexpected request origin.");
      return { ok: true, value: await fn(arg) };
    } catch (error) {
      const visible = publicError(error);
      await mkdir(join(app.getPath("userData"), "logs"), { recursive: true });
      await writeFile(
        join(app.getPath("userData"), "logs", "diagnostics.log"),
        `${new Date().toISOString()} ${channel} ${visible.code}\n`,
        { flag: "a" },
      ).catch(() => {});
      return { ok: false, error: visible };
    }
  });
}
app
  .whenReady()
  .then(async () => {
    repo = new SqliteProjectRepository(
      join(app.getPath("userData"), "metadata", "synthetic.sqlite"),
    );
    workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      { id: () => randomUUID(), now: () => new Date().toISOString() },
    );
    const seam = {
        id: () => randomUUID(),
        now: () => new Date().toISOString(),
      },
      library = new StoryLibraryService(repo, seam),
      bridge = new ManualBridgeService(repo, workflow, seam);
    await seed();
    protocol.handle("hekayti", (request) => {
      const url = new URL(request.url);
      const renderer = resolve(root, "renderer");
      const file = resolve(renderer, "." + decodeURIComponent(url.pathname));
      if (url.host !== "studio" || !file.startsWith(renderer + sep))
        return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });
    session.defaultSession.setPermissionRequestHandler(
      (_wc, _permission, callback) => callback(false),
    );
    session.defaultSession.setPermissionCheckHandler(() => false);
    win = new BrowserWindow({
      width: 1120,
      height: 900,
      title: "Hekayti Studio - Phase 2 Synthetic Lab",
      webPreferences: {
        preload: join(root, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    handle("projects:list", () => repo.listProjects());
    handle("library:load", () => library.load());
    handle("library:page", (arg) => repo.pageLibrary(arg));
    const publicBatchInput = z
      .object({
        expectedVersion: z.number().int().nonnegative(),
        publicCreativeReviewed: z.literal(true),
      })
      .strict();
    const importRaw = (raw: string, expectedVersion: number) => {
      const records = parseLibraryBatch(raw),
        result = importLibraryBatch(
          repo,
          records,
          expectedVersion,
          randomUUID(),
          new Date().toISOString(),
        );
      return { added: result.added, replayed: result.replayed };
    };
    handle("library:starter-import", async (arg) => {
      const x = validate(
        publicBatchInput.extend({
          profile: z
            .enum(["EGYPTIAN_ARAB_MUSLIM_FAMILY", "GENERAL_FAMILY"])
            .default("EGYPTIAN_ARAB_MUSLIM_FAMILY"),
        }),
        arg,
      );
      const records = parseLibraryBatch(
        await readFile(join(root, "fixtures/starter-library.jsonl"), "utf8"),
      );
      for (const r of records)
        if (r.creative) r.creative.culture.profile = x.profile;
      return importRaw(JSON.stringify(records), x.expectedVersion);
    });
    handle("library:batch-open", async (arg) => {
      const x = validate(publicBatchInput, arg);
      const selected = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [
          { name: "Creative JSON/JSONL", extensions: ["json", "jsonl"] },
        ],
      });
      if (selected.canceled) return null;
      const path = selected.filePaths[0]!;
      if ((await stat(path)).size > 25_000_000)
        throw new AppError(
          "LIBRARY_BATCH_SIZE",
          "Creative import exceeds25MB; original retained.",
        );
      return importRaw(await readFile(path, "utf8"), x.expectedVersion);
    });
    handle("creative:export", async (arg) => {
      validate(
        z.object({ publicCreativeReviewed: z.literal(true) }).strict(),
        arg,
      );
      const selected = await dialog.showSaveDialog(win, {
        defaultPath: "hekayti-creative-library.zip",
        filters: [
          { name: "Portable creative Library ZIP", extensions: ["zip"] },
        ],
      });
      if (selected.canceled || !selected.filePath) return null;
      return writeCreativeArchive(selected.filePath, repo, true);
    });
    let creativePreview: { id: string; bytes: Buffer; digest: string } | null =
      null;
    handle("creative:preview", async () => {
      const selected = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [
          { name: "Portable creative Library ZIP", extensions: ["zip"] },
        ],
      });
      if (selected.canceled) return null;
      const path = selected.filePaths[0]!;
      if ((await stat(path)).size > 30_000_000)
        throw new AppError("CREATIVE_ZIP", "Creative ZIP exceeds30MB.");
      const bytes = await readFile(path),
        preview = previewCreativeRestore(repo, bytes);
      creativePreview = { id: randomUUID(), bytes, digest: preview.digest };
      const { records, ...result } = preview;
      return { previewId: creativePreview.id, ...result };
    });
    handle("creative:restore", (arg) => {
      const x = validate(
        z
          .object({
            previewId: Id,
            digest: z.string().regex(/^[a-f0-9]{64}$/),
            expectedVersion: z.number().int().nonnegative(),
            choice: z.enum(["KEEP_EXISTING", "COPY_WITH_NEW_IDS"]),
          })
          .strict(),
        arg,
      );
      if (
        !creativePreview ||
        creativePreview.id !== x.previewId ||
        creativePreview.digest !== x.digest
      )
        throw new AppError(
          "CREATIVE_STALE",
          "Preview no longer available; choose archive again.",
        );
      const current = previewCreativeRestore(repo, creativePreview.bytes),
        choices = Object.fromEntries(
          current.conflicts.map((r) => [r.recordId, x.choice]),
        );
      const result = restoreCreativeArchive(
        repo,
        creativePreview.bytes,
        { digest: x.digest, expectedVersion: x.expectedVersion, choices },
        new Date().toISOString(),
      );
      creativePreview = null;
      return result;
    });
    handle("bridge:load", (arg) =>
      repo.loadGenerationPackage(validate(Id, arg)),
    );
    handle("bridge:copy", (arg) => {
      const x = validate(
        z.discriminatedUnion("kind", [
          z
            .object({
              kind: z.literal("package"),
              packageId: Id,
              target: ConsumerTargetSchema,
              syntheticReviewed: z.literal(true),
            })
            .strict(),
          z
            .object({
              kind: z.literal("draft"),
              projectId: Id,
              syntheticReviewed: z.literal(true),
            })
            .strict(),
          z
            .object({
              kind: z.literal("repair"),
              packageId: Id,
              error: z.string().max(3000),
              syntheticReviewed: z.literal(true),
            })
            .strict(),
        ]),
        arg,
      );
      let text: string;
      if (x.kind === "draft") {
        const s = workflow.load(x.projectId);
        if (!s) throw new AppError("WORKFLOW_MISSING", "Story missing.");
        text = manualDraftInstructions(s);
      } else {
        const p = repo.loadGenerationPackage(x.packageId);
        if (!p) throw new AppError("BRIDGE_PACKAGE", "Package missing.");
        text =
          x.kind === "package"
            ? generationInstructions(p, x.target)
            : repairInstructions(p, x.error);
      }
      clipboard.writeText(text);
      return true;
    });
    handle("library:seed", () => library.seed());
    const libraryBase = {
      expectedVersion: z.number().int().nonnegative(),
      eventId: Id,
      reviewerAlias: z.string().trim().min(1).max(80),
    };
    const libraryCommand = z.discriminatedUnion("action", [
      z
        .object({
          ...libraryBase,
          action: z.literal("CREATE"),
          record: LibraryRecordSchema,
        })
        .strict(),
      ...(["SAVE", "REVIEW", "APPROVE", "PROMOTE", "ARCHIVE"] as const).map(
        (action) =>
          z
            .object({ ...libraryBase, action: z.literal(action), recordId: Id })
            .strict(),
      ),
      z
        .object({
          ...libraryBase,
          action: z.literal("SCORE"),
          recordId: Id,
          scores: EditorialScoresSchema,
          editorialNote: z.string().trim().min(1).max(2000),
        })
        .strict(),
      z
        .object({
          ...libraryBase,
          action: z.literal("LINK_VARIANT"),
          recordId: Id,
          family: LibraryRefSchema,
          variantId: Id,
          variantNumber: z.number().int().positive(),
        })
        .strict(),
      z
        .object({
          ...libraryBase,
          action: z.literal("CREATE_STORY_FAMILY"),
          recordId: Id,
          structure: z
            .object({
              narrativePattern: z.string().min(1).max(2000),
              mechanism: z.string().min(1).max(2000),
              conflictPattern: z.string().min(1).max(2000),
              resolutionPattern: z.string().min(1).max(2000),
              emotionalArc: z.string().min(1).max(2000),
              reusableConstraints: z.array(z.string().min(1).max(2000)).max(30),
            })
            .strict(),
        })
        .strict(),
      z
        .object({
          ...libraryBase,
          action: z.literal("EXTRACT_APPROVED"),
          projectId: Id,
          type: z.enum([
            "STORY_CONCEPT",
            "APPROVED_STORY_REFERENCE",
            "BUILDING_BLOCK",
          ]),
          componentId: Id.optional(),
        })
        .strict(),
      z
        .object({
          ...libraryBase,
          action: z.literal("LOG_OUTCOME"),
          record: LibraryRefSchema,
          projectId: Id,
          requestRevisionId: Id,
          outcome: z.enum(["APPROVED", "REJECTED"]),
        })
        .strict(),
    ]);
    handle("library:command", (arg) => {
      const x = validate(libraryCommand, arg);
      if (x.action === "CREATE")
        return library.create(
          x.record,
          x.expectedVersion,
          x.eventId,
          x.reviewerAlias,
        );
      if (x.action === "CREATE_STORY_FAMILY")
        return library.createFamily(
          x.recordId,
          x.structure,
          x.expectedVersion,
          x.eventId,
          x.reviewerAlias,
        );
      if (x.action === "EXTRACT_APPROVED") {
        const s = workflow.load(x.projectId);
        if (!s) throw new AppError("WORKFLOW_MISSING", "Story missing.");
        return library.saveApproved(
          s,
          x.type,
          x.expectedVersion,
          x.eventId,
          x.reviewerAlias,
          x.componentId,
        );
      }
      if (x.action === "LOG_OUTCOME")
        return library.usage(
          x.record,
          x.projectId,
          x.requestRevisionId,
          x.outcome,
          x.eventId,
          x.expectedVersion,
        );
      return library.action(
        x.recordId,
        x.expectedVersion,
        x.eventId,
        x.action,
        x.reviewerAlias,
        x.action === "SCORE"
          ? { scores: x.scores, editorialNote: x.editorialNote }
          : x.action === "LINK_VARIANT"
            ? {
                family: x.family,
                variantId: x.variantId,
                variantNumber: x.variantNumber,
              }
            : {},
      );
    });
    handle("bridge:prepare", (arg) => {
      const x = validate(
        z
          .object({
            projectId: Id,
            expectedWorkflow: z.number().int().nonnegative(),
            strategy: z.enum(["HYBRID", "CURATED", "AI_LED"]),
            variation: VariationSchema,
            candidateCount: z.number().int().min(3).max(5),
            selected: z.array(LibraryRefSchema).max(30),
            culturalAcknowledged: z.literal(true).optional(),
          })
          .strict(),
        arg,
      );
      return bridge.prepare(x.projectId, x.expectedWorkflow, x);
    });
    handle("bridge:text", (arg) => {
      const x = validate(
          z.object({ packageId: Id, target: ConsumerTargetSchema }).strict(),
          arg,
        ),
        p = repo.loadGenerationPackage(x.packageId);
      if (!p) throw new AppError("BRIDGE_PACKAGE", "Package missing.");
      return generationInstructions(p, x.target);
    });
    handle("bridge:import", (arg) => {
      const x = validate(
        z
          .object({
            packageId: Id,
            json: z.string().min(1).max(500000),
            metadata: OperatorMetadataSchema,
            importId: Id,
            expectedWorkflow: z.number().int().nonnegative(),
            expectedLibrary: z.number().int().nonnegative(),
          })
          .strict(),
        arg,
      );
      return bridge.import(
        x.packageId,
        x.json,
        x.metadata,
        x.importId,
        x.expectedWorkflow,
        x.expectedLibrary,
      );
    });
    handle("bridge:use", (arg) => {
      const x = validate(
        z
          .object({
            recordId: Id,
            projectId: Id,
            expectedWorkflow: z.number().int().nonnegative(),
            expectedLibrary: z.number().int().nonnegative(),
            eventId: Id,
          })
          .strict(),
        arg,
      );
      return bridge.useNow(
        x.recordId,
        x.projectId,
        x.expectedWorkflow,
        x.expectedLibrary,
        x.eventId,
      );
    });
    handle("bridge:draft-text", (arg) => {
      const s = workflow.load(validate(Id, arg));
      if (!s) throw new AppError("WORKFLOW_MISSING", "Story missing.");
      return manualDraftInstructions(s);
    });
    handle("bridge:draft-import", (arg) => {
      const x = validate(
        z
          .object({
            projectId: Id,
            expectedVersion: z.number().int().nonnegative(),
            json: z.string().min(1).max(500000),
          })
          .strict(),
        arg,
      );
      if (new TextEncoder().encode(x.json).length > 500000)
        throw new AppError("BRIDGE_SIZE", "Draft exceeds byte limit.");
      let input: unknown;
      try {
        input = JSON.parse(x.json);
      } catch {
        throw new AppError("BRIDGE_JSON", "Paste draft JSON only.");
      }
      return workflow.importDraft(x.projectId, x.expectedVersion, input);
    });
    const planner = new StoryPlannerService(
      repo,
      workflow,
      {
        id: randomUUID,
        now: () => new Date().toISOString(),
      },
      "planner-quality/1.1",
    );
    const creator = new SimpleCreatorService(repo, workflow, planner, {
      id: randomUUID,
      now: () => new Date().toISOString(),
    });
    const illustration = new IllustrationService(repo, workflow, planner, {
      id: randomUUID,
      now: () => new Date().toISOString(),
    });
    installBookRuntime(repo,creator,workflow,planner,win,handle,root);
    const simpleLoadInput = z
      .object({ projectId: Id, mode: LanguageModeSchema.optional() })
      .strict();
    handle("simple:defaults", () => creator.defaults());
    handle("simple:load", (arg) => {
      const x = validate(simpleLoadInput, arg);
      return creator.load(x.projectId, x.mode);
    });
    handle("simple:list", (arg) =>
      creator.list(
        validate(
          z
            .object({
              query: z.string().max(200).optional(),
              offset: z.number().int().nonnegative().max(100000).optional(),
              limit: z.number().int().min(1).max(50).optional(),
              mode: LanguageModeSchema.optional(),
            })
            .strict(),
          arg,
        ),
      ),
    );
    handle("simple:reader", (arg) => {
      const x = validate(
        z
          .object({
            projectId: Id,
            draftId: Id.optional(),
            mode: LanguageModeSchema,
          })
          .strict(),
        arg,
      );
      return creator.reader(x.projectId, x.draftId, x.mode);
    });
    handle("simple:compare", (arg) => {
      const x = validate(
        z
          .object({
            projectId: Id,
            leftDraftId: Id,
            rightDraftId: Id,
            mode: LanguageModeSchema,
          })
          .strict(),
        arg,
      );
      return creator.compare(
        x.projectId,
        x.leftDraftId,
        x.rightDraftId,
        x.mode,
      );
    });
    handle("simple:command", async (arg) => {
      const x = validate(SimpleCommandSchema, arg),
        out = await creator.command(x);
      if (x.action === "COPY" && out.text) clipboard.writeText(out.text);
      return out;
    });
    handle("simple:starter", async (arg) => {
      const x = validate(
          z
            .object({
              expectedLibrary: z.number().int().nonnegative(),
              publicCreativeReviewed: z.literal(true),
            })
            .strict(),
          arg,
        ),
        state = repo.loadLibrary();
      if (state.recordVersion !== x.expectedLibrary)
        throw new AppError(
          "PLANNER_STALE",
          "Reload Library before initialization.",
        );
      const records = parseLibraryBatch(
        await readFile(join(root, "fixtures/starter-library.jsonl"), "utf8"),
      );
      if (state.records.length)
        return {
          added: 0,
          replayed: latestLibraryRecords(state).filter((r) =>
            records.some((source) => source.recordId === r.recordId),
          ).length,
        };
      const result = importLibraryBatch(
        repo,
        records,
        x.expectedLibrary,
        randomUUID(),
        new Date().toISOString(),
      );
      return { added: result.added, replayed: result.replayed };
    });
    handle("illustration:load", async (arg) => {
      const x = validate(
        simpleLoadInput.extend({ planId: Id.optional() }),
        arg,
      );
      return illustration.load(x.projectId, x.mode, x.planId);
    });
    handle("illustration:command", async (arg) => {
      const x = validate(IllustrationCommandSchema, arg),
        out = await illustration.command(x);
      if (x.action === "COPY" && out.text) clipboard.writeText(out.text);
      return out;
    });
    handle("planner:load", (arg) => planner.load(validate(Id, arg)));
    const plannerBase = {
      projectId: Id,
      expectedPlanner: z.number().int().nonnegative(),
      expectedWorkflow: z.number().int().nonnegative(),
    };
    const plannerCommand = z.discriminatedUnion("action", [
      z
        .object({
          ...plannerBase,
          action: z.literal("PLAN"),
          planning: PlanningRequestSchema,
          expectedLibrary: z.number().int().nonnegative(),
        })
        .strict(),
      z
        .object({
          ...plannerBase,
          action: z.literal("ACCEPT"),
          reviewerAlias: z.string().trim().min(1).max(80),
          advisoryAcknowledged: z.literal(true),
        })
        .strict(),
      z.object({ ...plannerBase, action: z.literal("PREPARE") }).strict(),
      z
        .object({
          ...plannerBase,
          action: z.literal("COPY"),
          packageId: Id,
          target: ConsumerTargetSchema,
          syntheticReviewed: z.literal(true),
        })
        .strict(),
      z
        .object({
          ...plannerBase,
          action: z.literal("IMPORT"),
          packageId: Id,
          json: z.string().min(1).max(500000),
        })
        .strict(),
      z
        .object({
          ...plannerBase,
          action: z.literal("PREVIEW"),
          packageId: Id,
          json: z.string().min(1).max(500000),
        })
        .strict(),
      z
        .object({
          ...plannerBase,
          action: z.literal("FEEDBACK"),
          feedback: PlanFeedbackSchema,
          expectedLibrary: z.number().int().nonnegative(),
        })
        .strict(),
    ]);
    handle("planner:command", async (arg) => {
      const x = validate(plannerCommand, arg);
      if (x.action === "PLAN") {
        if (x.planning.request.projectId !== x.projectId)
          throw new AppError("PLANNER_OWNER", "Planning project differs.");
        return {
          planner: await planner.plan(
            x.planning,
            x.expectedPlanner,
            x.expectedWorkflow,
            x.expectedLibrary,
          ),
          workflow: workflow.load(x.projectId)!,
        };
      }
      if (x.action === "ACCEPT")
        return planner.accept(
          x.projectId,
          x.expectedPlanner,
          x.expectedWorkflow,
          x.reviewerAlias,
          x.advisoryAcknowledged,
        );
      if (x.action === "PREPARE")
        return planner.prepare(
          x.projectId,
          x.expectedPlanner,
          x.expectedWorkflow,
        );
      if (x.action === "PREVIEW")
        return planner.preview(
          x.projectId,
          x.packageId,
          x.json,
          x.expectedPlanner,
          x.expectedWorkflow,
        );
      if (x.action === "IMPORT")
        return {
          planner: planner.load(x.projectId),
          workflow: await planner.import(
            x.projectId,
            x.packageId,
            x.json,
            x.expectedPlanner,
            x.expectedWorkflow,
          ),
        };
      if (x.action === "FEEDBACK")
        return {
          planner: planner.feedback(
            x.projectId,
            x.feedback,
            x.expectedPlanner,
            x.expectedWorkflow,
            x.expectedLibrary,
          ),
        };
      const s = planner.load(x.projectId),
        w = workflow.load(x.projectId),
        p = s.packages.find((p) => p.packageId === x.packageId);
      if (
        !w ||
        s.recordVersion !== x.expectedPlanner ||
        w.recordVersion !== x.expectedWorkflow ||
        !p ||
        p.plan.revisionId !== s.currentPlanRevisionId ||
        p.acceptance.acceptanceId !== s.currentAcceptanceId ||
        canonicalJson(p.plan.planning.request) !==
          canonicalJson(w.requests.at(-1)) ||
        p.blueprintRevisionId !== w.current.blueprintRevisionId
      )
        throw new AppError("PLANNER_STALE", "Reload current accepted package.");
      const latest = latestLibraryRecords(repo.loadLibrary());
      if (
        p.plan.provenance.sources.some(
          (source) =>
            !latest.some(
              (r) =>
                r.recordId === source.ref.recordId &&
                r.version === source.ref.version,
            ),
        )
      )
        throw new AppError("PLANNER_STALE", "Source changed; plan again.");
      const text = planGenerationInstructions(p, w, x.target);
      clipboard.writeText(text);
      return { planner: s, text };
    });
    handle("story:new", (arg) => {
      const request = validate(StoryRequestSchema, arg),
        now = new Date().toISOString();
      return repo.transaction(() => {
        repo.createProject(
          validate(ProjectSchema, {
            schemaVersion: "project/1.0",
            projectId: request.projectId,
            title: "Synthetic story creator",
            origin: "synthetic",
            createdAt: now,
            updatedAt: now,
            recordVersion: 0,
          }),
        );
        return workflow.create(request);
      });
    });
    handle("story:load", (arg) => workflow.load(validate(Id, arg)));
    handle("story:revise", (arg) => {
      const x = validate(
        z
          .object({
            projectId: Id,
            expectedVersion: z.number().int().nonnegative(),
            request: StoryRequestSchema,
          })
          .strict(),
        arg,
      );
      return workflow.reviseRequest(x.projectId, x.expectedVersion, x.request);
    });
    const commandBase = {
      projectId: Id,
      expectedVersion: z.number().int().nonnegative(),
    };
    const commandSchema = z.discriminatedUnion("action", [
      z.object({ ...commandBase, action: z.literal("create-more") }).strict(),
      z
        .object({ ...commandBase, action: z.literal("select"), conceptId: Id })
        .strict(),
      z.object({ ...commandBase, action: z.literal("build") }).strict(),
      z.object({ ...commandBase, action: z.literal("draft") }).strict(),
      z.object({ ...commandBase, action: z.literal("qa") }).strict(),
      z
        .object({
          ...commandBase,
          action: z.literal("approve"),
          reviewerAlias: z.string().min(1).max(80),
          advisoryAcknowledged: z.literal(true),
        })
        .strict(),
    ]);
    handle("story:action", (arg) => {
      const x = validate(commandSchema, arg);
      switch (x.action) {
        case "create-more":
          return workflow.createMore(x.projectId, x.expectedVersion);
        case "select":
          return workflow.select(x.projectId, x.expectedVersion, x.conceptId);
        case "build":
          return workflow.build(x.projectId, x.expectedVersion);
        case "draft":
          return workflow.draft(x.projectId, x.expectedVersion);
        case "qa":
          return workflow.qa(x.projectId, x.expectedVersion);
        case "approve":
          return workflow.approve(
            x.projectId,
            x.expectedVersion,
            x.reviewerAlias,
            x.advisoryAcknowledged,
          );
      }
    });
    handle("projects:seed", () => seed());
    handle("projects:inspect", (arg) => {
      const id = validate(Id, arg);
      const revision = revisionByProject.get(id);
      if (!revision)
        throw new AppError(
          "PROJECT_MISSING",
          "Choose a synthetic fixture project.",
        );
      return repo.loadBlueprint(revision)!;
    });
    handle("projects:title", (arg) => {
      const input = validate(
        z
          .object({
            projectId: Id,
            title: z.string().min(1).max(120),
            expectedVersion: z.number().int().nonnegative(),
          })
          .strict(),
        arg,
      );
      const p = repo.loadProject(input.projectId);
      if (!p) throw new AppError("PROJECT_MISSING", "Project not found.");
      return repo.updateProject(
        { ...p, title: input.title, updatedAt: new Date().toISOString() },
        input.expectedVersion,
      );
    });
    handle("projects:open", async () => {
      const selected = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [{ name: "Synthetic blueprint JSON", extensions: ["json"] }],
      });
      if (selected.canceled) return null;
      const file = selected.filePaths[0]!;
      if ((await stat(file)).size > 2_000_000)
        throw new AppError(
          "IMPORT_SIZE",
          "Selected project exceeds prototype import limit.",
        );
      return parseBlueprintJson(await readFile(file, "utf8"));
    });
    handle("projects:save", async (arg) => {
      const id = validate(Id, arg);
      const b = repo.loadBlueprint(revisionByProject.get(id) ?? "");
      if (!b)
        throw new AppError(
          "PROJECT_MISSING",
          "Select a synthetic fixture first.",
        );
      const selected = await dialog.showSaveDialog(win, {
        defaultPath: join(
          app.getPath("userData"),
          id + "-" + randomUUID() + ".json",
        ),
        filters: [{ name: "Synthetic snapshot", extensions: ["json"] }],
      });
      if (selected.canceled || !selected.filePath) return null;
      await writeNewFile(
        selected.filePath,
        new TextEncoder().encode(JSON.stringify(b, null, 2)),
      );
      return selected.filePath;
    });
    handle("export:proof", () => exportProof());
    handle("diagnostics", () => ({
      appVersion: app.getVersion(),
      versions: process.versions,
      ...repo.diagnostics(),
      dataPath: app.getPath("userData"),
      packaged: app.isPackaged,
      privateDataEnabled: false,
      paidProviders: false,
    }));
    await win.loadURL("hekayti://studio/index.html");
    if (!smoke) {
      win.show();
      win.focus();
    }
    if (smoke) {
      try {
        const security = await win.webContents.executeJavaScript(
          '({nodeAbsent:typeof window.require==="undefined"&&typeof window.process==="undefined",bridge:typeof window.hekayti?.listProjects==="function",react:!!document.querySelector("h1")})',
        );
        if (!security.nodeAbsent || !security.bridge || !security.react)
          throw new Error("Renderer boundary/render failed");
        const exports = await exportProof();
        const data = {
          status: "PASS",
          packaged: app.isPackaged,
          versions: process.versions,
          ...repo.diagnostics(),
          security,
          projects: repo.listProjects().length,
          roundTrip: repo.loadBlueprint((await fixtures())[1]!.revisionId)
            ?.languageVersions[0]!.pages[0]!.narration,
          age: ageGuidance({
            ageMonths: 20,
            mode: "ar-EG",
            category: "behavioral",
          }),
          staleness: invalidateDependents(
            ["text"],
            [{ id: "art", dependencies: ["text"], state: "approved" }],
          )[0]!.state,
          export: exports,
          sourceHash: await contentHash(await fixtures()),
          dataPath: app.getPath("userData"),
        };
        await writeNewFile(
          join(app.getPath("userData"), "smoke-result.json"),
          new TextEncoder().encode(JSON.stringify(data, null, 2)),
        );
        app.quit();
      } catch (error) {
        console.error(publicError(error));
        app.exit(1);
      }
    }
  })
  .catch((error) => {
    console.error(publicError(error));
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => repo?.close());
