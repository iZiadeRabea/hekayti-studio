// New isolated synthetic data only. Real packaged UI/IPC; dialog paths are the
// only mocked native transport. Blank test art is not artistic acceptance.
import { _electron } from "playwright";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
const resume = process.argv.find(arg => arg.startsWith("--resume="))?.slice(9);
if (resume) assert.ok(dirname(resolve(resume)) === resolve(tmpdir()) && basename(resume).startsWith("hekayti-story-flow-native-"), "Resume only this harness's isolated synthetic fixture");
const data = resume ? resolve(resume) : await mkdtemp(join(tmpdir(), "hekayti-story-flow-native-"));
const packaged = process.argv.includes("--packaged");
const legacyOnly = process.argv.includes("--legacy-only");
const started = Date.now(), gates = [];
const gate = (name) => { gates.push(name); console.log(JSON.stringify({ gate: name, elapsedMs: Date.now() - started })); };
const size = 2400, raw = Buffer.alloc((size * 3 + 1) * size);
for (let y = 0; y < size; y++) raw.fill(235, y * (size * 3 + 1) + 1, (y + 1) * (size * 3 + 1));
function chunk(type, bytes) {
  const t = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  let v = 0xffffffff;
  for (const b of Buffer.concat([t, bytes])) { v ^= b; for (let i = 0; i < 8; i++) v = (v >>> 1) ^ (v & 1 ? 0xedb88320 : 0); }
  length.writeUInt32BE(bytes.length); crc.writeUInt32BE((v ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, t, bytes, crc]);
}
const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size, 4); header[8] = 8; header[9] = 2;
const art = join(data, "synthetic-blank-art.png");
await writeFile(art, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", header), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
const launch = (directory = data) => _electron.launch({ executablePath: resolve(packaged ? "dist/story-flow-package/win-unpacked/Hekayti Studio Phase 2.exe" : "node_modules/electron/dist/electron.exe"), args: [...(packaged ? [] : [resolve("apps/desktop")]), "--phase2-data=" + directory], timeout: 30000 });
let app, page, s, projectId;
const button = name => page.getByRole("button", { name, exact: true });
const idle = () => page.waitForFunction(() => ![...document.querySelectorAll(".studio-project-nav button")].some(b => b.disabled));
const call = async (method, input) => { const r = await page.evaluate(({ method, input }) => window.hekayti[method](input), { method, input }); assert.equal(r.ok, true, r.error?.code + ": " + r.error?.message); return r.value; };
const load = async () => s = await call("studioLoad", { projectId });
const command = async input => s = await call("studioCommand", { projectId, expectedBook: s.book.recordVersion, mode: "ar-EG", ...input });
const reopenBook = async () => { await button("كتبي").click(); await button("فتح الكتاب").first().click(); await idle(); };
const choose = () => app.evaluate(({ dialog }, path) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] }); }, art);
try {
  if (!legacyOnly) {
  app = await launch(); page = await app.firstWindow(); await page.waitForLoadState("domcontentloaded"); gate("isolated-native-startup");
  assert.equal(await app.evaluate(({ app }) => app.getVersion()), "0.7.3");
  if (!resume) {
  await button("تجهيز مكتبة الإلهام").click(); await page.getByTestId("book-create-flow").waitFor();
  await button("تخصيص متقدم").click(); assert.equal(await page.getByTestId("book-create-flow").locator(".studio-steps > li").count(), 8);
  await button("إنشاء سريع").click();
  await page.getByLabel("العمر بالشهور", { exact: true }).fill("7");
  await page.getByLabel("اسم الطفل أو البطل — اختياري", { exact: true }).fill("نور");
  await button("قبل النوم").click(); await button("اقترحلي فكرة").click();
  await button("راجع الفكرة").click(); await page.getByTestId("quick-idea-review").waitFor();
  await button("ابدأ القصة").click(); await page.getByTestId("studio-story").waitFor(); await idle();
  projectId = (await call("simpleList", { query: "", offset: 0, limit: 20 })).stories[0].projectId; await load();
  assert.notEqual(s.book.intents.at(-1).intent.idea.source, "CUSTOM");
  assert.equal(s.book.intents.at(-1).intent.length, "SHORT");
  gate("actual-two-screen-auto-idea-seven-months-advanced-retained");
  await button("١. نسخ برومبت القصة").click(); await idle(); await load();
  assert.ok((await app.evaluate(({ clipboard }) => clipboard.readText())).includes("writer-response/1.0"));
  // React textarea children may append the current value to the label name.
  const paste = page.getByLabel(/^٢\. لصق الرد هنا/);
  await paste.fill("{}"); await button("٣. مراجعة القصة").click(); await idle();
  assert.equal((await load()).session.workflow.current.approvalId, null);
  const pages = [
    { narration: "الطفل يلاحظ طرف الشكل.", altText: "طرف مدور ظاهر من تحت قماشة مألوفة، والطفل ينظر بدعم مألوف." },
    { narration: "الشخص المألوف يرفع القماشة قليلا.", altText: "القماشة مرفوعة شوية وجزء أكبر من الشكل ظاهر بدعم مألوف." },
    { narration: "الشخص المألوف يظل بجانب الطفل.", altText: "جزء من الشكل ظاهر تحت القماشة، والطفل هادئ مع دعم مألوف." },
    { narration: "الطفل يهدأ في حضن مألوف.", altText: "الطفل مستريح مع الشخص المألوف." },
  ];
  await paste.fill(JSON.stringify({ schemaVersion: "writer-response/1.0", editions: [{ mode: "ar-EG", pages: pages.map((p, i) => ({ pageNumber: i + 1, ...p, dialogue: [] })) }] }));
  await button("٣. مراجعة القصة").click(); await idle();
  await page.getByTestId("story-progression").waitFor();
  assert.ok((await page.getByTestId("story-progression").innerText()).includes("لا تعرض الشيء كاملًا"));
  await load(); assert.equal(s.session.workflow.current.approvalId, null);
  await button("اعتماد القصة").click(); await idle(); await load(); assert.ok(s.session.workflow.current.approvalId);
  gate("actual-copy-invalid-then-valid-paste-progress-review-explicit-approval");
  // Existing identity/sheet commands use actual IPC and isolated synthetic files.
  for (const identity of s.identities) {
    await command({ action: "IDENTITY", identity: { ...identity, approvedProfile: true } }); await choose();
    s = await call("studioSelectAssets", { projectId, expectedBook: s.book.recordVersion, mode: "ar-EG", kind: "CHARACTER_SHEET", characterId: identity.characterId });
    await command({ action: "IMAGE_DECISION", imageId: s.images.at(-1).imageId, choice: "APPROVE" });
  }
  const edition = s.session.workflow.drafts.find(d => d.draftId === s.session.workflow.current.draftId).editions.find(e => e.mode === "ar-EG");
  assert.equal(edition.pages.length, 4);
  for (const slot of [{ kind: "COVER" }, ...edition.pages.map(p => ({ kind: "PAGE", pageId: p.pageId }))]) {
    await command({ action: "PROMPT", ...slot });
    if (slot.pageId === edition.pages[0].pageId || slot.pageId === edition.pages[1].pageId) { assert.match(s.text, /MUST NOT SHOW YET/); assert.match(s.text, /PARTIAL/); assert.match(s.text, /لا تعرض الشيء كاملًا/); }
    await choose(); s = await call("studioSelectAssets", { projectId, expectedBook: s.book.recordVersion, mode: "ar-EG", ...slot });
    await reopenBook(); await button("الصور").click(); await button(slot.kind === "COVER" ? "الغلاف" : `صفحة ${edition.pages.findIndex(p => p.pageId === slot.pageId) + 1}`).click();
    if (slot.kind === "PAGE") await page.getByTestId("scene-image-checklist").first().waitFor();
    await button("اعتماد الصورة").first().click(); await idle(); await load();
    assert.equal(s.images.find(i => i.selected && i.kind === slot.kind && i.pageId === slot.pageId).status, "APPROVED");
  }
  await page.getByTestId("book-storyboard").waitFor();
  gate("real-ipc-page-specific-prompts-native-human-checklist-art-approval-and-overview");
  } else {
    projectId = (await call("simpleList", { query: "", offset: 0, limit: 20 })).stories[0].projectId;
    await reopenBook(); await load(); assert.equal(s.images.filter(i => i.kind === "PAGE").length, 4);
    gate("resume-existing-synthetic-late-gates-only");
  }
  await button("مراجعة الكتاب وتصديره").click(); await button("تنسيق الكتاب").click();
  await button("ترتيب تلقائي").click(); await idle(); await load(); assert.equal(s.layout.pages.length, 5);
  await button("اعتماد الكتاب").click(); await idle(); await load(); assert.equal(s.approved, true);
  await button("مراجعة نهائية").click(); await button("فحص الكتاب قبل التصدير").click(); await idle();
  await load(); // Stage navigation saves progress; use its settled current CAS.
  const ready = await call("studioReadiness", { projectId, expectedBook: s.book.recordVersion }); assert.equal(ready.digitalReady, true); assert.equal(ready.printReady, true);
  for (const kind of ["digital", "print"]) {
    const path = join(data, `synthetic-${kind}.pdf`);
    await app.evaluate(({ dialog }, path) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: path }); }, path);
    await button(kind === "digital" ? "تصدير رقمي" : "تصدير للطباعة").click(); await idle();
  }
  gate("actual-native-five-page-layout-human-approval-readiness-digital-print-export");
  await load(); const before = JSON.stringify({ book: s.book, workflow: s.session.workflow });
  await app.close(); app = await launch(); page = await app.firstWindow(); await page.waitForLoadState("domcontentloaded");
  await reopenBook(); await load();
  assert.equal(JSON.stringify({ book: s.book, workflow: s.session.workflow }), before);
  gate("actual-close-reopen-exact-story-art-layout-approval-history");
  await app.close(); app = undefined;
  }
  // Strict established historical synthetic fixture, never arbitrary owner data.
  const legacy = join(tmpdir(), "hekayti-phase44-ui-hx7HDv");
  const legacyRows = () => {
    const db = new DatabaseSync(join(legacy, "metadata", "synthetic.sqlite"), { readOnly: true });
    try { return JSON.stringify({ workflow: db.prepare("SELECT project_id,payload FROM story_workflows ORDER BY project_id").all(), book: db.prepare("SELECT project_id,payload FROM illustrated_books ORDER BY project_id").all() }); }
    finally { db.close(); }
  };
  const old = legacyRows(); app = await launch(legacy); page = await app.firstWindow(); await page.waitForLoadState("domcontentloaded");
  const list = await call("simpleList", { query: "", offset: 0, limit: 20 }); assert.ok(list.stories.length);
  await page.getByTestId("creator-mode").waitFor();
  const wasAdvanced = await page.getByTestId("creator-mode").getAttribute("data-mode") === "ADVANCED";
  if (wasAdvanced) await page.getByTestId("creator-mode-switch").click();
  await button("كتبي").click(); await button("فتح الكتاب").first().click();
  await page.getByTestId("studio-story").waitFor();
  for (const row of list.stories) await call("studioLoad", { projectId: row.projectId });
  if (wasAdvanced) await page.getByTestId("creator-mode-switch").click();
  await app.close(); app = undefined; assert.equal(legacyRows(), old);
  gate("actual-old-synthetic-package-open-original-payloads-unchanged");
  console.log(JSON.stringify({ data, projectId, packaged, gates, elapsedMs: Date.now() - started, limits: "Synthetic blank art; no visual recognition/owner-art claims. Owner DB never opened." }));
} finally { if (app) await app.close(); }
