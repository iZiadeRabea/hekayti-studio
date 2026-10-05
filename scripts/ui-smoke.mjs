import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, readFile, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
await mkdir("temp/phase2-ui", { recursive: true });
const data = await mkdtemp(resolve("temp/phase2-ui/run-"));
// Playwright passes arguments into Electron; use synthetic isolated storage, no smoke auto-quit.
const desktop = await electron.launch({
  executablePath: resolve("node_modules/electron/dist/electron.exe"),
  args: [resolve("apps/desktop"), "--phase2-data=" + data],
  timeout: 30000,
});
try {
  const page = await desktop.firstWindow();
  await page
    .getByRole("heading", { name: "حكايتي - مختبر المرحلة الثانية" })
    .waitFor();
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  await page.getByRole("button", { name: "RTL Test", exact: true }).click();
  const samples = [
    ["MSA", "قَالَ نُنّو: «كُرَةٌ حَمْرَاءُ». A-12 رقم ١٢.", "rtl"],
    ["Egyptian", "بصّ هنا! يلا نجرّب تاني.", "rtl"],
    ["English", "Look here! We can try again.", "ltr"],
    ["Mixed", "الرمز A-12 والاسم Paper Cut. (رقم 12)؟", "rtl"],
  ];
  for (const [name, text, dir] of samples) {
    const box = page.getByRole("textbox", { name: name + " editing sample" });
    assert.equal(await box.getAttribute("dir"), dir);
    await box.fill(text);
    await box.press("End");
    await box.press("Enter");
    await box.pressSequentially(
      name === "English" ? "Second line." : "سطر ثانٍ.",
    );
    assert.equal(
      await box.inputValue(),
      text + "\n" + (name === "English" ? "Second line." : "سطر ثانٍ."),
    );
    await box.press("Control+A");
    assert.equal(
      await box.evaluate((el) => el.selectionEnd - el.selectionStart),
      (await box.inputValue()).length,
    );
  }
  await page.screenshot({
    path: join(data, "rtl-editing.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Save synthetic title edit", exact: true })
    .first()
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "SQLite update saved" })
    .waitFor();
  const listed = await page.evaluate(() => window.hekayti.listProjects());
  assert.equal(listed.ok, true);
  assert.equal(listed.value[0].recordVersion >= 1, true);
  // Native dialogs are mocked ONLY here to test host I/O deterministically; native manual UI is separate.
  const output = join(data, "synthetic-snapshot.json");
  await desktop.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, output);
  const saved = await page.evaluate(
    (id) => window.hekayti.saveProject(id),
    listed.value[0].projectId,
  );
  assert.equal(saved.ok, true);
  assert.equal((await stat(output)).size > 0, true);
  await desktop.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
  }, output);
  const opened = await page.evaluate(() => window.hekayti.openProject());
  assert.equal(opened.ok, true);
  assert.equal(opened.value.blueprint.schemaVersion, "blueprint/1.0");
  const second = await page.evaluate(
    (id) => window.hekayti.saveProject(id),
    listed.value[0].projectId,
  );
  assert.equal(second.ok, false);
  assert.equal(
    (await readFile(output, "utf8")).includes("blueprint/1.0"),
    true,
  );
  const invalid = await page.evaluate(() =>
    window.hekayti.updateTitle({
      projectId: "missing",
      title: "test",
      expectedVersion: 0,
    }),
  );
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, "PROJECT_MISSING");
  const security = await desktop.evaluate(({ BrowserWindow }) => {
    const prefs =
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return {
      contextIsolation: prefs.contextIsolation,
      sandbox: prefs.sandbox,
      nodeIntegration: prefs.nodeIntegration,
      webSecurity: prefs.webSecurity,
    };
  });
  assert.deepEqual(security, {
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    webSecurity: true,
  });
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        data,
        checks: [
          "4 language edit/selection/linebreaks",
          "renderer Node absent",
          "SQLite UI update",
          "new-file save/open through host",
          "no-clobber error",
          "readable missing project",
          "secure webPreferences",
        ],
        security,
      },
      null,
      2,
    ),
  );
} finally {
  await desktop.close();
}
