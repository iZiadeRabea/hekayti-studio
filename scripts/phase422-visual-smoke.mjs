// Readonly visual follow-up against a previously generated isolated synthetic smoke.
import { _electron as electron } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import assert from "node:assert/strict";
const data = resolve(process.argv[2] ?? ""),
  packaged = process.argv.includes("--packaged");
assert.ok(
  data.startsWith(resolve("temp/phase42-ui") + sep),
  "Only an isolated planner smoke directory is allowed",
);
const receipt = JSON.parse(await readFile(join(data, "evidence.json"), "utf8"));
assert.equal(receipt.status, "PASS");
assert.equal(receipt.writerLive, true);
assert.ok(receipt.projectId.startsWith("owner-live-synthetic-"));
const app = await electron.launch({
  executablePath: resolve(
    packaged
      ? "dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe"
      : "node_modules/electron/dist/electron.exe",
  ),
  args: [
    ...(packaged ? [] : [resolve("apps/desktop")]),
    "--phase2-data=" + data,
  ],
});
try {
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.getByTestId("ui-language-en").click();
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  await page.getByLabel("Reopen story").selectOption(receipt.projectId);
  await page.getByTestId("writer-prompt-preview").waitFor();
  const before = await page.evaluate(
    async (id) => ({
      planner: await window.hekayti.plannerLoad(id),
      workflow: await window.hekayti.loadStory(id),
      library: await window.hekayti.libraryLoad(),
    }),
    receipt.projectId,
  );
  const pkg = before.planner.value.packages.at(-1),
    blueprint = before.workflow.value.blueprints.at(-1);
  const response = {
    schemaVersion: "writer-response/1.0",
    editions: pkg.plan.planning.request.languageModes.map((mode) => ({
      mode,
      pages: blueprint.pagePlan.map((_, i) => ({
        pageNumber: i + 1,
        narration:
          "مدت نور الكرة إلى سلمى. أخذت سلمى دورها وأعادت الكرة إلى نور.",
        dialogue: [],
        altText: "طفلتان تتبادلان الكرة.",
      })),
    })),
  };
  response.editions[0].pages[1].dialogue = [
    { speaker: "unknown-fixture", text: "مرحبا" },
  ];
  await page.getByLabel("Planner result JSON").fill(JSON.stringify(response));
  await page
    .getByRole("button", {
      name: "Validate response without saving",
      exact: true,
    })
    .click();
  await page.getByTestId("writer-response-feedback").waitFor();
  await page.getByTestId("ui-language-ar").click();
  const item = page
    .getByTestId("writer-response-feedback")
    .locator("li")
    .first();
  await item.locator("summary").click();
  // Imported feedback advances source authority; its older package correctly fails stale.
  assert.match(await item.innerText(), /أعد تحميل القصة والمخطط/);
  assert.match(await item.innerText(), /PLANNER_STALE/);
  await item.screenshot({
    path: join(data, "arabic-writer-stale-readable.png"),
  });
  await page
    .getByTestId("writer-prompt-preview")
    .screenshot({ path: join(data, "arabic-writer-prompt-readable.png") });
  const after = await page.evaluate(
    async (id) => ({
      planner: await window.hekayti.plannerLoad(id),
      workflow: await window.hekayti.loadStory(id),
      library: await window.hekayti.libraryLoad(),
    }),
    receipt.projectId,
  );
  assert.deepEqual(after, before);
  await writeFile(
    join(data, "visual-evidence.json"),
    JSON.stringify(
      {
        status: "PASS",
        packaged,
        data,
        checks: [
          "Actual Arabic prompt and current-package stale guidance/code screenshots",
          "Readonly failed preview leaves planner/workflow/Library identical",
        ],
        scope: "Isolated synthetic smoke only; no human quality/provider claim",
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS readable Arabic writer prompt/stale screenshots; unchanged canonical state: " +
      data,
  );
} finally {
  await app.close();
}
