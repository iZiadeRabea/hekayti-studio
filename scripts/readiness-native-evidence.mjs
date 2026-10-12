// Real Electron main-process services/IPC, isolated synthetic16-page story.
// Only file/save-dialog selections are supplied; approvals/fit/persistence are real.
import { _electron } from "playwright";
import { mkdtemp, writeFile, readFile, copyFile } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
const resume = process.argv.find((arg) => arg.startsWith("--resume="))?.slice(9);
if (resume) assert.ok(dirname(resolve(resume)) === resolve(tmpdir()) && basename(resume).startsWith("hekayti-readiness-native-"), "Resume only this harness's isolated synthetic OS-temp fixture");
const data = resume ? resolve(resume) : await mkdtemp(join(tmpdir(), "hekayti-readiness-native-"));
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
const started = Date.now();
let app = await launch(),
  page = await app.firstWindow();
console.log(JSON.stringify({ operation: "launch-to-first-window", elapsedMs: Date.now() - started }));
const gates = [];
const recordGate = gates.push.bind(gates);
gates.push = (...values) => { for (const gate of values) console.log(JSON.stringify({ gate, elapsedMs: Date.now() - started })); return recordGate(...values); };
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
const idle = () => page.waitForFunction(() => ![...document.querySelectorAll(".studio-project-nav button")].some((button) => button.disabled));
let s, projectId, edition;
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
  if (!resume) {
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
  gates.push("Actual native wizard default automatic idea without typed idea");
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
  projectId = s.book.projectId;
  await command({ action: "PREPARE_WRITER" });
  assert.ok(s.identities.length >= 2, "Two independently approved characters required");
  const speaker = s.identities[0].name, listener = s.identities[1].name;
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
            dialogue: i === 4 ? [{ speaker, text: "نقلب الصفحة سوا؟" }, { speaker: listener, text: "نشوف الصورة الجديدة." }] : [],
            altText: text,
          })),
        },
      ],
    }),
  });
  s = await call("studioLoad", { projectId });
  edition = s.session.workflow.drafts.at(-1).editions[0];
  const pageId = edition.pages[4].pageId;
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
  const initialSubtitle = page.getByLabel("عنوان فرعي للغلاف — اختياري", { exact: true });
  const initialSavedSubtitle = await initialSubtitle.inputValue();
  await initialSubtitle.fill("عنوان مؤقت غير محفوظ");
  await button("ترتيب تلقائي").click();
  await page.locator(".studio-local-error").getByRole("button").click();
  await page.waitForFunction(
    () => document.activeElement?.id === "studio-target-approval-current",
  );
  await button("العودة إلى الكتاب").click();
  assert.equal(await initialSubtitle.inputValue(), "عنوان مؤقت غير محفوظ");
  await button("كتبي").click(); await idle();
  await page.getByTestId("creator-mode-switch").click();
  assert.equal(await page.getByTestId("creator-mode").getAttribute("data-mode"), "SIMPLE");
  assert.equal(await initialSubtitle.inputValue(), "عنوان مؤقت غير محفوظ");
  await button("تجاهل التعديلات غير المحفوظة").click();
  await button("الاحتفاظ بالتعديلات").click();
  assert.equal(await initialSubtitle.inputValue(), "عنوان مؤقت غير محفوظ");
  const beforeDiscard = await call("studioLoad", { projectId });
  await button("تجاهل التعديلات غير المحفوظة").click();
  await button("تأكيد تجاهل التعديلات").click();
  assert.equal(await initialSubtitle.inputValue(), initialSavedSubtitle);
  assert.equal((await call("studioLoad", { projectId })).book.recordVersion, beforeDiscard.book.recordVersion);
  await page.getByTestId("creator-mode-switch").click();
  assert.equal(await page.getByTestId("creator-mode").getAttribute("data-mode"), "ADVANCED");
  await page.getByTestId("creator-mode-switch").click();
  await button("كتبي").click(); await button("فتح الكتاب").first().click();
  gates.push(
    "Actual UI prelayout dirty header/Advanced retention, keep edits, explicit local discard without history mutation, clean Advanced escape and exact approval-error recovery",
  );
  s = await call("studioLoad", { projectId });
  await command({ action: "APPROVE_STORY", draftId: s.session.workflow.current.draftId });
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
    console.log(JSON.stringify({ operation: "manual-art", slot: slot.pageId ? edition.pages.findIndex((p) => p.pageId === slot.pageId) + 1 : "cover", elapsedMs: Date.now() - started }));
    // Missing-page3 and unapproved art are examined before repair/import approval.
    if (slot.pageId === edition.pages[2].pageId) {
      const report = await call("studioReadiness", { projectId, expectedBook: s.book.recordVersion });
      const finding = report.findings.find((f) => f.code === "BOOK_IMAGE" && f.target.pageId === slot.pageId);
      assert.ok(finding); assert.equal(finding.severity, "BLOCKER"); assert.equal(report.digitalReady, false);
      gates.push("Native pre-export missing page3 exact canonical target blocks readiness");
    }
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
    if (slot.pageId === edition.pages[2].pageId) {
      const report = await call("studioReadiness", { projectId, expectedBook: s.book.recordVersion });
      assert.ok(report.findings.some((f) => f.code === "BOOK_IMAGE" && f.target.pageId === slot.pageId));
      gates.push("Native imported unapproved page3 remains blocked until explicit approval");
      await button("كتبي").click();
      await button("فتح الكتاب").first().click();
      await button("الصور").click();
      await button("صفحة 3").click();
      await page.getByText("أرفق المراجع التالية يدويًا مع هذا البرومبت؛ لا تُنقل الصور تلقائيًا.", { exact: true }).waitFor();
      await page.getByText("غير مطلوب: مراجع الشخصيات التي لا تظهر في هذه الصفحة.", { exact: true }).waitFor();
      assert.ok(await page.getByText("مطلوب — لوحة الشخصية المرتبطة بهذا البرومبت", { exact: false }).count() > 0);
      await button("اعتماد الصورة").first().click();
      await page.waitForFunction((id) => document.getElementById(`studio-target-image-${id}`), edition.pages[3].pageId);
      s = await call("studioLoad", { projectId });
      assert.equal(s.book.creatorProgress.pageId, edition.pages[3].pageId);
      assert.equal(s.images.find((i) => i.pageId === slot.pageId && i.selected).status, "APPROVED");
      gates.push("Actual UI native import review approval settles then auto-advances to canonical page4");
      continue;
    }
    if (slot.pageId === edition.pages.at(-1).pageId) {
      await button("كتبي").click(); await button("فتح الكتاب").first().click(); await button("الصور").click();
      await button("صفحة 16").click(); await button("اعتماد الصورة").first().click();
      await page.getByTestId("book-storyboard").waitFor();
      s = await call("studioLoad", { projectId });
      assert.equal(s.book.creatorProgress.pageId, undefined);
      gates.push("Actual UI last artwork approval offers full canonical book overview");
      continue;
    }
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
        { speakerId: edition.pages[4].dialogue[1].speakerId, x: 0.22, y: 0.7 },
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
  assert.equal(report.findings.some((f) => f.code === "BOOK_IMAGE" && f.target.pageId === edition.pages[2].pageId), false);
  const goodLayout = structuredClone(s.layout);
  const sourcePages = edition.pages.map((p, index) => ({ pageNumber: index + 1, narration: p.narration, dialogue: p.dialogue.map((d) => ({ speakerId: d.speakerId, text: d.text })), altText: p.altText }));
  const longPages = structuredClone(sourcePages);
  longPages[4].dialogue[0].text = "أنا شايف صورة الكتاب قدامي وبقلب الصفحة بهدوء. ".repeat(32);
  const editAndRelink = async (pages) => {
    await command({ action: "EDIT_STORY", draftId: s.session.workflow.current.draftId, title: goodLayout.title, mode: "ar-EG", pages });
    await command({ action: "APPROVE_STORY", draftId: s.session.workflow.current.draftId });
    for (const image of s.images.filter((i) => i.selected && i.stale && i.kind !== "CHARACTER_SHEET")) {
      const slot = { kind: image.kind, ...(image.pageId ? { pageId: image.pageId } : {}) };
      await command({ action: "PROMPT", ...slot }); await choose();
      s = await call("studioSelectAssets", { projectId, expectedBook: s.book.recordVersion, mode: "ar-EG", ...slot });
      await command({ action: "IMAGE_DECISION", imageId: s.images.at(-1).imageId, choice: "APPROVE" });
    }
    const layout = structuredClone(goodLayout);
    layout.draftId = s.session.workflow.current.draftId;
    for (const p of layout.pages) {
      p.imageId = s.images.find((i) => i.selected && (p.pageNumber ? i.pageId === p.pageId : i.kind === "COVER")).imageId;
      if (p.pageNumber) for (const box of p.boxes) {
        if (box.kind === "NARRATION") box.text = pages[p.pageNumber - 1].narration;
        if (box.kind === "DIALOGUE") box.text = pages[p.pageNumber - 1].dialogue[box.sourceIndex].text;
      }
    }
    await command({ action: "SAVE_LAYOUT", layout });
  };
  await editAndRelink(longPages);
  const overflow = await call("studioReadiness", { projectId, expectedBook: s.book.recordVersion });
  assert.equal(overflow.digitalReady, false);
  assert.ok(overflow.findings.some((f) => f.code === "BOOK_TEXT_OVERFLOW" && f.target.pageId === edition.pages[4].pageId));
  await button("كتبي").click(); await button("فتح الكتاب").first().click(); await button("مراجعة نهائية").click();
  await button("فحص الكتاب قبل التصدير").click();
  const overflowRow = page.locator("[data-testid=final-review] article").filter({ hasText: "الكلام لا يسع المساحة المقاسة" }).first();
  await overflowRow.getByRole("button").click();
  await page.waitForFunction((id) => document.getElementById(`studio-target-layout-${id}`) === document.activeElement, edition.pages[4].pageId);
  await button("العودة إلى المراجعة النهائية").click();
  s = await call("studioLoad", { projectId });
  await editAndRelink(sourcePages);
  await command({ action: "APPROVE_BOOK" });
  const refreshed = await call("studioReadiness", { projectId, expectedBook: s.book.recordVersion });
  assert.equal(refreshed.digitalReady, true);
  assert.equal(refreshed.findings.some((f) => f.code === "BOOK_TEXT_OVERFLOW"), false);
  gates.push("Native measured long dialogue exact page5 UI fix target/return; repaired source/layout clears obsolete findings");
  // Current UI opens overview from the persisted snapshot; navigation is real IPC.
  await button("كتبي").click();
  await button("فتح الكتاب").first().click();
  await button("الصور").click();
  await button("العودة إلى الكتاب كاملًا").click();
  await page.getByTestId("book-storyboard").waitFor();
  assert.equal(await page.locator("[data-testid=book-storyboard] [data-slot]").count(), 17);
  assert.equal(await page.locator("[data-testid=book-storyboard] [data-slot]").first().getAttribute("data-slot"), "cover");
  await page.locator(`[data-testid=book-storyboard] [data-page-id="${edition.pages[2].pageId}"]`).click();
  await page.waitForFunction((pageId) => document.getElementById(`studio-target-image-${pageId}`), edition.pages[2].pageId);
  await button("مراجعة نهائية").click();
  await button("فحص الكتاب قبل التصدير").click();
  await page.getByText("جاهز للتصدير الرقمي والطباعة", { exact: true }).waitFor();
  gates.push("Actual UI cover+16 storyboard canonical order/exact page and final review measured ready with nonblocking warnings");
  } else {
    const list = await call("simpleList", { query: "", offset: 0, limit: 20 });
    for (const row of list.stories) {
      const candidate = await call("studioLoad", { projectId: row.projectId });
      if (candidate.layout?.pages.length === 17 && candidate.identities.length >= 2) { assert.equal(s, undefined, "Only one complete synthetic fixture"); s = candidate; }
    }
    assert.ok(s?.approved);
    projectId = s.book.projectId;
    edition = s.session.workflow.drafts.at(-1).editions.find((e) => e.mode === "ar-EG");
    assert.equal(edition.pages.length, 16);
    await button("كتبي").click(); await button("فتح الكتاب").first().click();
    gates.push("Segmented native continuation of saved synthetic16-page fixture; earlier completed gates recorded in predecessor native log, not repeated here");
  }
  s = await call("studioLoad", { projectId });
  await button("تنسيق الكتاب").click();
  const composer = page.getByTestId("book-composer");
  await composer.getByLabel(/^الصفحة/).selectOption("3");
  await idle();
  s = await call("studioLoad", { projectId });
  assert.equal(s.book.creatorProgress.pageId, edition.pages[2].pageId);
  const coverSubtitle = composer.getByLabel("عنوان فرعي للغلاف — اختياري", { exact: true });
  await composer.locator("summary").click();
  const savedSubtitle = await coverSubtitle.inputValue();
  await coverSubtitle.fill("تعديل محلي غير محفوظ");
  await page.getByText("هناك تعديلات تنسيق لم تُحفظ. ارجع إلى تنسيق الكتاب واحفظها قبل الفحص أو التصدير؛ تعديلاتك باقية.", { exact: false }).waitFor();
  await button("مراجعة نهائية").click();
  assert.equal(await page.getByTestId("final-review").count(), 0);
  assert.equal(await coverSubtitle.inputValue(), "تعديل محلي غير محفوظ");
  for (const name of ["كتبي", "المكتبة", "الإعدادات", "كتاب جديد"]) {
    await button(name).click(); await idle();
    assert.equal(await coverSubtitle.inputValue(), "تعديل محلي غير محفوظ");
    assert.equal(await composer.isVisible(), true);
  }
  await page.getByTestId("creator-mode-switch").click();
  assert.equal(await page.getByTestId("creator-mode").getAttribute("data-mode"), "SIMPLE");
  assert.equal(await coverSubtitle.inputValue(), "تعديل محلي غير محفوظ");
  await button("الشخصيات").first().click();
  await button("العودة إلى التعديلات").click();
  assert.equal(await coverSubtitle.inputValue(), "تعديل محلي غير محفوظ");
  await button("تجاهل التعديلات غير المحفوظة").click();
  await button("تأكيد تجاهل التعديلات").click();
  assert.equal(await coverSubtitle.inputValue(), savedSubtitle);
  await coverSubtitle.fill("عنوان محفوظ لاختبار الاستعادة");
  const narrationHitbox = composer.locator(".book-text-layer.narration").first();
  const dragRect = await narrationHitbox.boundingBox();
  assert.ok(dragRect);
  await page.mouse.move(dragRect.x + dragRect.width / 2, dragRect.y + dragRect.height / 2);
  await page.mouse.down();
  await page.mouse.move(dragRect.x + dragRect.width / 2 + 3, dragRect.y + dragRect.height / 2, { steps: 3 });
  await page.mouse.up();
  await button("حفظ التصميم").click();
  await idle();
  s = await call("studioLoad", { projectId });
  assert.equal(s.approved, false);
  await button("مراجعة نهائية").click();
  await button("فحص الكتاب قبل التصدير").click();
  await page.getByText("الكتاب الحالي يحتاج مراجعة واعتمادًا صريحًا بعد حفظ التنسيق.", { exact: false }).waitFor();
  assert.equal(await button("تصدير رقمي").isDisabled(), true);
  await button("تنسيق الكتاب").click(); await idle();
  await button("اعتماد الكتاب").click();
  await idle();
  s = await call("studioLoad", { projectId });
  assert.equal(s.approved, true);
  assert.equal(s.layout.subtitle, "عنوان محفوظ لاختبار الاستعادة");
  assert.equal(s.layout.pages[0].boxes.find((box) => box.kind === "SUBTITLE")?.text, s.layout.subtitle);
  gates.push("Actual UI final review/header/Advanced switch cannot bypass unsaved composer edits; navigate/return retains edits and explicit save/approval restores readiness");
  await command({ action: "SAVE_PROGRESS", progress: { section: "book", pageId: edition.pages[2].pageId, control: "layout", autoAdvance: false } });
  const bookVersion = s.book.recordVersion,
    history = s.book.compositionPlans.length,
    savedGeometry = JSON.stringify(s.layout.pages[3]);
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  s = await call("studioLoad", { projectId });
  assert.equal(s.approved, true);
  assert.equal(s.book.recordVersion, bookVersion);
  assert.equal(s.book.creatorProgress.pageId, edition.pages[2].pageId);
  assert.equal(s.book.creatorProgress.autoAdvance, false);
  assert.equal(s.layout.subtitle, "عنوان محفوظ لاختبار الاستعادة");
  assert.equal(JSON.stringify(s.layout.pages[3]), savedGeometry);
  assert.equal(s.book.compositionPlans.length, history);
  assert.equal(
    s.book.compositionPlans.find((p) => p.repetitionOverride).visual
      .cameraFraming,
    "لقطة جانبية من فوق السرير",
  );
  gates.push(
    "Actual process reopen preserves optional plans/history/override/art/layout/approval",
  );
  await button("كتبي").click(); await button("فتح الكتاب").first().click();
  assert.equal(await page.getByTestId("book-composer").getByLabel(/^الصفحة/).inputValue(), "3");
  assert.equal(await page.getByTestId("book-composer").getByLabel("عنوان فرعي للغلاف — اختياري", { exact: true }).inputValue(), "عنوان محفوظ لاختبار الاستعادة");
  gates.push("Actual UI saved canonical composer page3 resumes after process reopen");
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
        segmented: !!resume,
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


