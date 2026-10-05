import {
  app,
  BrowserWindow,
  protocol,
  net,
  ipcMain,
  dialog,
  session,
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
import { ageGuidance, contentHash, invalidateDependents } from "@hekayti/core";
import { SqliteProjectRepository, writeNewFile } from "@hekayti/persistence";
import { proofHtml, proofMetadata, proofPages } from "@hekayti/export";
import type { Result } from "./api";

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
