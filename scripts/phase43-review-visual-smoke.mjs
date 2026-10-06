// Explicit synthetic operator actions on an existing isolated PASS fixture only.
import { _electron as electron } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import assert from "node:assert/strict";
const data = resolve(process.argv[2] ?? ""), packaged = process.argv.includes("--packaged");
assert.ok(data.startsWith(resolve("temp/phase43-ui") + sep));
const receipt = JSON.parse(await readFile(join(data, "evidence.json"), "utf8"));
assert.equal(receipt.status, "PASS");
const app = await electron.launch({ executablePath: resolve(packaged ? "dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe" : "node_modules/electron/dist/electron.exe"), args: [...(packaged ? [] : [resolve("apps/desktop")]), "--phase2-data=" + data] });
const screenshots = [];
try {
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1400, height: 1000 });
  const button = name => page.getByRole("button", { name, exact: true });
  const shot = async name => { const path = join(data, name + ".png"); await page.screenshot({ path, fullPage: true }); screenshots.push(path); };
  const load = async () => { const r = await page.evaluate(projectId => window.hekayti.simpleLoad({ projectId }), receipt.projectId); assert.equal(r.ok, true); return r.value; };
  await button("قصصي").click();
  await button("فتح").first().click();
  await button("قراءة القصة").click();
  await page.getByTestId("simple-reader").waitFor();
  assert.equal((await load()).workflow.current.approvalId, null);
  await shot("15-reader-grouped-notices");
  await button("تحضير الصور").click();
  await page.getByTestId("simple-illustrations").waitFor();
  for (const tab of [null, "غلاف القصة"]) {
    if (tab) await button(tab).click();
    await page.getByLabel("راجعت مرجع الشخصية وبرومبت هذه الصورة.", { exact: true }).first().check();
    await button("نسخ برومبت الصورة").first().click();
    await page.getByRole("status").filter({ hasText: "تم نسخ برومبت الصورة." }).waitFor();
    const text = await app.evaluate(({ clipboard }) => clipboard.readText());
    assert.match(text, /paper.cut/i);
    assert.match(text, /لا نص أو حروف داخل الصورة، حتى الغلاف/);
  }
  await shot("16-cover-reviewed-copy");
  await button("عودة").click();
  await button("أعجبتني").click();
  await page.getByLabel(/^التقييم/).selectOption("4");
  await page.getByLabel("ملاحظات", { exact: true }).fill("مراجعة خيالية للاختبار فقط، وليست شهادة جودة بشرية.");
  await page.getByLabel("اقرأ القصة وراجع ملاحظاتها قبل حفظ رأيك.", { exact: true }).check();
  await button("حفظ المراجعة").click();
  await page.getByTestId("simple-reader").waitFor();
  const loaded = await load();
  assert.ok(loaded.workflow.current.approvalId);
  await shot("17-explicit-synthetic-like");
  const evidence = { status: "PASS", packaged, data, projectId: receipt.projectId, approvalId: loaded.workflow.current.approvalId, screenshots, gates: ["Actual character-reference and no-text cover prompt copy require explicit prompt review", "Actual LIKED/rating/notes requires explicit Reader acknowledgement and creates approval only then"], scope: "Synthetic operator fixture, not real human quality approval; no image/provider calls" };
  await writeFile(join(data, "review-visual-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally { await app.close(); }
