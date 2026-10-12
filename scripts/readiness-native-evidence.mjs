// Real Electron main-process services/IPC, isolated synthetic16-page story.
// Only file/save-dialog selections are supplied; approvals/fit/persistence are real.
import { _electron } from "playwright";
import { mkdtemp, writeFile, readFile, copyFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
const data = await mkdtemp(join(tmpdir(), "hekayti-readiness-native-"));
const packaged = process.argv.includes("--packaged");
function crc32(bytes) {
  let v = 0xffffffff;
  for (const b of bytes) {
    v ^= b;
    for (let j = 0; j < 8; j++) v = (v >>> 1) ^ (v & 1 ? 0xedb88320 : 0);
  }
  return (v ^ 0xffffffff) >>> 0;
}
const size = 2400,
  raw = Buffer.alloc((1 + size * 3) * size);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const o = y * (1 + size * 3) + 1 + x * 3;
    raw[o] = 240;
    raw[o + 1] = 226;
    raw[o + 2] = 204;
  }
const chunk = (type, bytes) => {
  const t = Buffer.from(type),
    l = Buffer.alloc(4),
    c = Buffer.alloc(4);
  l.writeUInt32BE(bytes.length);
  c.writeUInt32BE(crc32(Buffer.concat([t, bytes])));
  return Buffer.concat([l, t, bytes, c]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 2;
const art = join(data, "synthetic-blank-art.png");
await writeFile(
  art,
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
const launch = () =>
  _electron.launch({
    executablePath: resolve(
      packaged
        ? "dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe"
        : "node_modules/electron/dist/electron.exe",
    ),
    args: [
      ...(packaged ? [] : [resolve("apps/desktop")]),
      "--phase2-data=" + data,
    ],
    timeout: 30000,
  });
let app = await launch(),
  page = await app.firstWindow();
const gates = [];
const call = async (method, input) => {
  const result = await page.evaluate(
    ({ method, input }) => window.hekayti[method](input),
    { method, input },
  );
  assert.equal(
    result.ok,
    true,
    result.error?.code + ": " + result.error?.message,
  );
  return result.value;
};
const reject = async (method, input, code) => {
  const r = await page.evaluate(
    ({ method, input }) => window.hekayti[method](input),
    { method, input },
  );
  assert.equal(r.ok, false);
  assert.equal(r.error.code, code);
  return r.error;
};
const button = (name) => page.getByRole("button", { name, exact: true });
let s;
const command = async (input) => {
  s = await call("studioCommand", {
    projectId: s.book.projectId,
    expectedBook: s.book.recordVersion,
    mode: "ar-EG",
    ...input,
  });
  return s;
};
const choose = () =>
  app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
  }, art);
try {
  await page.waitForLoadState("domcontentloaded");
  await button("تجهيز مكتبة الإلهام").click();
  await page.getByTestId("book-create-flow").waitFor();
  // Real wizard: default automatic idea, no story idea typed.
  for (let step = 0; step < 7; step++) await button("التالي").click();
  await button("أنشئ القصة").click();
  await page.getByTestId("studio-story").waitFor();
  const initialList = await call("simpleList", { query: "", offset: 0, limit: 20 });
  const autoBook = await call("studioLoad", { projectId: initialList.stories[0].projectId });
  assert.ok(autoBook.book.intents.at(-1).intent.idea.text.trim());
  assert.notEqual(autoBook.book.intents.at(-1).intent.idea.source, "CUSTOM");
  gates.push("Actual packaged wizard default automatic idea without typed idea");
  const defaults = await call("simpleDefaults", {});
  const steps = [
    "نور يشوف الكتاب على السرير.",
    "نور يقرب الكتاب.",
    "نور يفتح الكتاب.",
    "نور يشوف الصورة.",
    "نور يقلب الصفحة.",
    "نور يمسك الكتاب.",
    "نور يبص للصورة.",
    "نور يرفع الكتاب.",
    "نور يحط الكتاب جنب الدبدوب.",
    "نور يشوف الدبدوب.",
    "نور يحضن الدبدوب.",
    "نور يمسك الكتاب تاني.",
    "نور يقلب الصفحة التانية.",
    "نور يقفل الكتاب.",
    "نور يحط الكتاب على السرير.",
    "نور ينام جنب الدبدوب.",
  ];
  s = await call("studioCreate", {
    agePreset: "THREE_FIVE",
    exactAgeMonths: 42,
    category: "bedtime",
    goalPreset: "SLEEP",
    fictionalName: "نور",
    primaryLanguageMode: "ar-EG",
    provisionalAcknowledged: true,
    expectedLibrary: defaults.library.recordVersion,
    bookIntent: {
      idea: { source: "CUSTOM", text: "سرير مريح: كتاب ودبدوب في غرفة النوم." },
      path: { mode: "CUSTOM", steps },
      length: "AUTO",
    },
  });
  const projectId = s.book.projectId;
  await command({ action: "PREPARE_WRITER" });
  const speaker = s.identities[0].name;
  await call("simpleCommand", {
    action: "IMPORT",
    projectId,
    packageId: s.session.package.packageId,
    expectedPlanner: s.session.planner.recordVersion,
    expectedWorkflow: s.session.workflow.recordVersion,
    json: JSON.stringify({
      schemaVersion: "writer-response/1.0",
      editions: [
        {
          mode: "ar-EG",
          pages: steps.map((text, i) => ({
            pageNumber: i + 1,
            narration: text,
            dialogue: i === 4 ? [{ speaker, text: "نقلب الصفحة سوا؟" }] : [],
            altText: text,
          })),
        },
      ],
    }),
  });
  s = await call("studioLoad", { projectId });
  const edition = s.session.workflow.drafts.at(-1).editions[0],
    pageId = edition.pages[4].pageId;
  assert.equal(edition.pages.length, 16);
  await command({ action: "PLAN_PAGE", pageId });
  let plan = s.compositionPlans.at(-1);
  assert.match(plan.visual.pageAction, /يقلب الصفحة/);
  assert.ok(
    s.scenes.some((scene) =>
      scene.after.some((e) => e.name.includes("الكتاب")),
    ),
  );
  await command({
    action: "SAVE_COMPOSITION",
    plan: {
      ...plan,
      visual: {
        ...plan.visual,
        cameraFraming: "لقطة جانبية من فوق السرير",
        compositionHint: "الكتاب في جانب الصورة",
      },
      repetitionOverride: true,
      notes: "تكرار مقصود؛ مراجعة بشرية",
    },
  });
  gates.push(
    "Real IPC synthetic16p exact authored action and saved framing/repetition plan",
  );
  await button("كتبي").click();
  await button("فتح الكتاب").first().click();
  await button("تنسيق الكتاب").click();
  const subtitle = page.getByLabel("عنوان فرعي للغلاف — اختياري", {
    exact: true,
  });
  await subtitle.fill("عنوان مؤقت غير محفوظ");
  await button("ترتيب تلقائي").click();
  await page.locator(".studio-local-error").getByRole("button").click();
  await page.waitForFunction(
    () => document.activeElement?.id === "studio-target-approval-current",
  );
  await button("العودة إلى الكتاب").click();
  assert.equal(await subtitle.inputValue(), "عنوان مؤقت غير محفوظ");
  gates.push(
    "Real IPC story approval recovery exact focus and unsaved subtitle return",
  );
  await command({
    action: "APPROVE_STORY",
    draftId: s.session.workflow.current.draftId,
  });
  const missing = await reject(
    "studioCommand",
    {
      action: "PROMPT",
      kind: "PAGE",
      pageId,
      projectId,
      expectedBook: s.book.recordVersion,
      mode: "ar-EG",
    },
    "BOOK_IDENTITY",
  );
  assert.equal(missing.target.characterId, s.identities[0].characterId);
  for (const id of s.identities.map((i) => i.characterId)) {
    await command({
      action: "IDENTITY",
      identity: {
        ...s.identities.find((i) => i.characterId === id),
        approvedProfile: true,
      },
    });
    await choose();
    s = await call("studioSelectAssets", {
      projectId,
      expectedBook: s.book.recordVersion,
      mode: "ar-EG",
      kind: "CHARACTER_SHEET",
      characterId: id,
    });
    await command({
      action: "IMAGE_DECISION",
      imageId: s.images.at(-1).imageId,
      choice: "APPROVE",
    });
  }
  gates.push(
    "Real identity error metadata and separate approved character sheets",
  );
  for (const slot of [
    { kind: "COVER" },
    ...edition.pages.map((p) => ({ kind: "PAGE", pageId: p.pageId })),
  ]) {
    await command({ action: "PROMPT", ...slot });
    if (slot.pageId === pageId)
      assert.match(s.text, /لقطة جانبية من فوق السرير/);
    await choose();
    s = await call("studioSelectAssets", {
      projectId,
      expectedBook: s.book.recordVersion,
      mode: "ar-EG",
      ...slot,
    });
    await command({
      action: "IMAGE_DECISION",
      imageId: s.images.at(-1).imageId,
      choice: "APPROVE",
    });
  }
  await command({ action: "PLAN_PAGE", pageId });
  plan = s.compositionPlans.at(-1);
  await command({
    action: "SAVE_COMPOSITION",
    plan: {
      ...plan,
      anchors: [
        { speakerId: edition.pages[4].dialogue[0].speakerId, x: 0.78, y: 0.7 },
      ],
      layoutReviewRequired: false,
    },
  });
  await command({ action: "AUTO_LAYOUT", mode: "ar-EG" });
  assert.equal(s.layout.pages.length, 17);
  await command({ action: "APPROVE_BOOK" });
  assert.equal(s.approved, true);
  gates.push(
    "Real-service approved16-page art bindings and native measured organic layout17pages",
  );
  const report = await call("studioReadiness", { projectId, expectedBook: s.book.recordVersion });
  assert.equal(report.measured, true);
  assert.equal(report.digitalReady, true);
  assert.equal(report.printReady, true);
  assert.ok(report.findings.some((f) => f.severity === "WARNING"));
  await command({ action: "SAVE_PROGRESS", progress: { section: "images", pageId: edition.pages[2].pageId, control: "image", autoAdvance: false } });
  const bookVersion = s.book.recordVersion,
    history = s.book.compositionPlans.length;
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  s = await call("studioLoad", { projectId });
  assert.equal(s.approved, true);
  assert.equal(s.book.recordVersion, bookVersion);
  assert.equal(s.book.compositionPlans.length, history);
  assert.equal(
    s.book.compositionPlans.find((p) => p.repetitionOverride).visual
      .cameraFraming,
    "لقطة جانبية من فوق السرير",
  );
  gates.push(
    "Actual process reopen preserves optional plans/history/override/art/layout/approval",
  );
  for (const kind of ["digital", "print"]) {
    const path = join(data, `synthetic-native-${kind}.pdf`);
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
    }, path);
    const out = await call("studioExport", {
      projectId,
      expectedBook: s.book.recordVersion,
      kind,
    });
    assert.equal(out.pages, 17);
    assert.ok((await readFile(path)).length > 1000);
  }
  gates.push("Native digital+print export actual guarded services17pages each");
  await writeFile(
    join(data, "native-results.json"),
    JSON.stringify(
      {
        data,
        packaged,
        gates,
        artQuality:
          "Blank synthetic fixture; no external art/photolikeness certification",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ data, packaged, gates }, null, 2));
} finally {
  await app.close();
}


