// Actual source renderer, isolated hidden Electron; explicitly mocked transport.
// This proves DOM recovery/unsaved-input behavior, not production IPC or art quality.
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { _electron } from "playwright";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { StoryPlannerService } from "@hekayti/core/planner";
import { SimpleCreatorService } from "@hekayti/core/creator";
import { BookStudioService } from "@hekayti/core/book";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { importLibraryBatch, parseLibraryBatch } from "@hekayti/core/creative";
const dir = await mkdtemp(join(tmpdir(), "hekayti-phase44-ui-441-recovery-"));
const repo = new SqliteProjectRepository(":memory:");
let serial = 0;
const seam = { id: () => `ui-${++serial}`, now: () => "2026-10-08T10:00:00Z" };
const workflow = new StoryWorkflowService(
  repo,
  new MockStoryConceptProvider(),
  new MockStoryDraftProvider(),
  seam,
);
const planner = new StoryPlannerService(
  repo,
  workflow,
  seam,
  "planner-quality/1.1",
);
const creator = new SimpleCreatorService(repo, workflow, planner, seam);
const studio = new BookStudioService(
  repo,
  creator,
  workflow,
  planner,
  seam,
  async () => "f".repeat(64),
);
importLibraryBatch(
  repo,
  parseLibraryBatch(
    (await readFile("examples/starter-library/starter-library.jsonl", "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(0, 26)
      .join("\n"),
  ),
  0,
  "synthetic",
  "now",
);
const steps = [
  "نور يشوف الكتاب على السرير.",
  "نور يقرب الكتاب.",
  "نور يفتح الكتاب.",
  "نور يشوف الصورة.",
  "نور يقلب الصفحة.",
  "نور يستقر جنب الدبدوب.",
];
let snapshot = await studio.create({
  agePreset: "THREE_FIVE",
  exactAgeMonths: 42,
  category: "bedtime",
  goalPreset: "SLEEP",
  fictionalName: "نور",
  primaryLanguageMode: "ar-EG",
  provisionalAcknowledged: true,
  expectedLibrary: repo.loadLibrary().recordVersion,
  bookIntent: {
    idea: { source: "CUSTOM", text: "كتاب على سرير مريح." },
    path: { mode: "CUSTOM", steps },
    length: "AUTO",
  },
});
snapshot = await studio.command({
  action: "PREPARE_WRITER",
  projectId: snapshot.book.projectId,
  expectedBook: snapshot.book.recordVersion,
});
await creator.command({
  action: "IMPORT",
  projectId: snapshot.book.projectId,
  packageId: snapshot.session.package.packageId,
  expectedPlanner: snapshot.session.planner.recordVersion,
  expectedWorkflow: snapshot.session.workflow.recordVersion,
  json: JSON.stringify({
    schemaVersion: "writer-response/1.0",
    editions: [
      {
        mode: "ar-EG",
        pages: steps.map((text, i) => ({
          pageNumber: i + 1,
          narration: text,
          dialogue: [],
          altText: text,
        })),
      },
    ],
  }),
});
snapshot = studio.load(snapshot.book.projectId);
const fixture = {
  snapshot,
  reader: creator.reader(snapshot.book.projectId, undefined, "ar-EG"),
  simple: creator.defaults(),
  choices: studio.defaults(),
};
await writeFile(join(dir, "fixture.json"), JSON.stringify(fixture));
await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {BookStudioApp} from './apps/desktop/renderer/src/BookStudioApp.tsx';import {UiLanguageProvider} from './apps/desktop/renderer/src/UiLanguage.tsx';createRoot(document.getElementById('root')).render(<UiLanguageProvider><BookStudioApp/></UiLanguageProvider>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  format: "iife",
  outfile: join(dir, "ui.js"),
  jsx: "automatic",
});
await writeFile(
  join(dir, "index.html"),
  `<html lang="ar" dir="rtl"><meta charset="utf-8"><body><div id="root"></div></body></html>`,
);
await writeFile(
  join(dir, "main.cjs"),
  `const {app,BrowserWindow}=require('electron');app.setPath('userData',${JSON.stringify(join(dir, "user-data"))});app.whenReady().then(()=>{const w=new BrowserWindow({show:false,width:1280,height:1000,webPreferences:{nodeIntegration:true,contextIsolation:false}});w.loadURL('about:blank');});`,
);
const app = await _electron.launch({
  executablePath: resolve("node_modules/electron/dist/electron.exe"),
  args: [join(dir, "main.cjs")],
  timeout: 30000,
});
const page = await app.firstWindow();
const gates = [];
try {
  await page.goto(`file://${join(dir, "index.html").replaceAll("\\", "/")}`);
  await page.evaluate((f) => {
    const ok = (value) => Promise.resolve({ ok: true, value });
    window.__created = [];
    window.hekayti = {
      simpleDefaults: () => ok(f.simple),
      studioDefaults: () => ok(f.choices),
      simpleReader: () => ok(f.reader),
      studioCreate: (input) => {
        window.__created.push(input);
        return ok(f.snapshot);
      },
      studioAssetPreview: () => ok(null),
      studioCommand: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: "BOOK_IDENTITY",
            message: "اعتمد تعريف نور أولًا.",
            target: {
              section: "images",
              characterId: f.snapshot.identities[0].characterId,
              control: "identity",
            },
          },
        }),
    };
  }, fixture);
  // Reload source after transport is installed: no application restart.
  await page.evaluate(async () => {
    document.getElementById("root").replaceChildren();
    const s = document.createElement("script");
    s.src = "ui.js?fixture=1";
    document.body.append(s);
  });
  const button = (name) => page.getByRole("button", { name, exact: true });
  await button("التالي").waitFor();
  for (let i = 0; i < 3; i++) await button("التالي").click();
  assert.ok(await button("التالي").isEnabled());
  gates.push("Default relevant idea permits continuation without typed idea");
  await button("أكتب فكرتي").click();
  await page
    .locator("textarea")
    .first()
    .fill("فكرتي غير المحفوظة عن سرير مريح");
  await button("السابق").click();
  await button("التالي").click();
  assert.equal(
    await page.locator("textarea").first().inputValue(),
    "فكرتي غير المحفوظة عن سرير مريح",
  );
  gates.push("Manual idea survives wizard back/forward");
  for (let i = 3; i < 7; i++) await button("التالي").click();
  await button("أنشئ القصة").click();
  await button("الكتاب").click();
  const subtitle = page.getByLabel("عنوان فرعي للغلاف — اختياري", {
    exact: true,
  });
  await subtitle.fill("عنوان لم أحفظه بعد");
  await button("ترتيب تلقائي").click();
  await page.locator(".studio-local-error").getByRole("button").click();
  const identityId = `studio-target-identity-${fixture.snapshot.identities[0].characterId}`;
  await page.waitForFunction(
    (id) => document.activeElement?.id === id,
    identityId,
  );
  assert.equal(
    (await page
      .locator(`#identity-editor-${fixture.snapshot.identities[0].characterId}`)
      .locator("input")
      .count()) > 0,
    true,
  );
  gates.push(
    "Structured identity error opens and focuses exact character editor",
  );
  const identityName = page
    .locator(`#identity-editor-${fixture.snapshot.identities[0].characterId}`)
    .locator("input")
    .first();
  await identityName.fill("اسم مؤقت لم أحفظه");
  await button("العودة إلى الكتاب").click();
  assert.equal(await subtitle.inputValue(), "عنوان لم أحفظه بعد");
  gates.push("Recovery return preserves unsaved cover subtitle");
  await button("ترتيب تلقائي").click();
  await page.locator(".studio-local-error").getByRole("button").click();
  await page.waitForFunction(
    (id) => document.activeElement?.id === id,
    identityId,
  );
  assert.equal(await identityName.inputValue(), "اسم مؤقت لم أحفظه");
  gates.push(
    "Repeated exact-character recovery preserves unsaved identity portal fields",
  );
  await writeFile(
    join(dir, "ui-results.json"),
    JSON.stringify(
      {
        transport: "mocked; actual source renderer in isolated native Electron",
        gates,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ dir, gates }, null, 2));
} finally {
  await app.close();
  repo.close();
}
