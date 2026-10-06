// Actual Electron/renderer/IPC/filesystem path; isolated fresh userdata only.
import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
await mkdir("temp/phase41-ui", { recursive: true });
const data = await mkdtemp(resolve("temp/phase41-ui/source-")),
  restoredData = await mkdtemp(resolve("temp/phase41-ui/restore-")),
  archive = join(data, "public-creative.zip"),
  gates = [];
const packaged = process.argv.includes("--packaged");
const launch = (dir) =>
  electron.launch({
    executablePath: resolve(packaged ? "dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe" : "node_modules/electron/dist/electron.exe"),
    args: [...(packaged ? [] : [resolve("apps/desktop")]), "--phase2-data=" + dir],
    timeout: 30000,
  });
let app = await launch(data);
const must = (r) => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value;
};
try {
  let page = await app.firstWindow();
  await page
    .getByRole("button", { name: "Starter / Creative Library", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Import traceable starter", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByLabel(
      "I reviewed public/synthetic creative text; no private child/customer information.",
    )
    .check();
  await page
    .getByRole("button", { name: "Import traceable starter", exact: true })
    .click();
  await page
    .getByTestId("creative-library-status")
    .filter({ hasText: "791 added" })
    .waitFor();
  await page
    .getByTestId("paged-library-count")
    .filter({ hasText: "791 matches" })
    .waitFor();
  assert.equal(
    await page
      .locator('section[aria-label="Starter and creative Library"] > ul > li')
      .count(),
    30,
  );
  gates.push(
    "Explicit 791-row import; no auto approval; bounded30-row rendering",
  );
  await page
    .getByLabel("Paged culture", { exact: true })
    .fill("Egyptian Arabic tales");
  await page
    .getByTestId("paged-library-count")
    .filter({ hasText: "12 matches" })
    .waitFor();
  await page
    .getByRole("button", { name: /^Histoire/ })
    .first()
    .click();
  await page.getByRole("heading", { name: /^Histoire/ }).waitFor();
  assert.ok(
    (await page.getByLabel("Creative record details").innerText()).includes(
      "OPENING_OBSERVATION",
    ),
  );
  gates.push(
    "Egyptian source filter + opening-only/DNA/religious provenance visible",
  );
  await page.getByLabel("Paged culture", { exact: true }).fill("");
  await page
    .getByLabel("Search title", { exact: true })
    .fill("The Lion And The Mouse");
  await page
    .getByRole("button", { name: "The Lion And The Mouse", exact: true })
    .click();
  for (const action of ["SAVE", "REVIEW", "APPROVE", "PROMOTE"]) {
    await page
      .getByRole("button", { name: `${action} creative record`, exact: true })
      .click();
    await page
      .getByTestId("creative-library-status")
      .filter({ hasText: `${action} recorded explicitly` })
      .waitFor();
  }
  gates.push(
    "Explicit lifecycle promotion, no cultural-certification conflation",
  );
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, archive);
  await page
    .getByRole("button", { name: "Export creative ZIP", exact: true })
    .click();
  await page
    .getByTestId("creative-library-status")
    .filter({ hasText: "Creative ZIP saved" })
    .waitFor();
  assert.ok((await stat(archive)).size > 1_000_000);
  gates.push("Actual creative ZIP export via native-dialog IPC boundary");
  await page.screenshot({
    path: join(data, "starter-dna.png"),
    fullPage: true,
  });
  await app.close();
  app = await launch(restoredData);
  page = await app.firstWindow();
  await page
    .getByRole("button", { name: "Starter / Creative Library", exact: true })
    .click();
  await app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
  }, archive);
  await page
    .getByRole("button", { name: "Preview creative restore", exact: true })
    .click();
  await page
    .getByTestId("creative-library-status")
    .filter({ hasText: "791 additions" })
    .waitFor();
  assert.equal(
    must(await page.evaluate(() => window.hekayti.libraryPage({}))).total,
    0,
  );
  gates.push("Dry-run restore is read-only in independent empty DB");
  await page
    .getByLabel(
      "I reviewed public/synthetic creative text; no private child/customer information.",
    )
    .check();
  await page
    .getByRole("button", { name: "Confirm creative restore", exact: true })
    .click();
  await page
    .getByTestId("creative-library-status")
    .filter({ hasText: "791 additions" })
    .waitFor();
  await page
    .getByTestId("paged-library-count")
    .filter({ hasText: "791 matches" })
    .waitFor();
  const state = must(await page.evaluate(() => window.hekayti.libraryLoad()));
  assert.equal(
    state.records.every((r) => r.status === "GENERATED"),
    true,
  );
  gates.push(
    "Independent empty restore retains791 records and demotes historic approvals",
  );
  await app.close();
  app = await launch(restoredData);
  page = await app.firstWindow();
  await page
    .getByRole("button", { name: "Starter / Creative Library", exact: true })
    .click();
  await page
    .getByTestId("paged-library-count")
    .filter({ hasText: "791 matches" })
    .waitFor();
  gates.push("Actual app restart reopens persisted imported corpus");
  const evidence = {
    status: "PASS",
    packaged,
    gates,
    data,
    restoredData,
    archive,
    scope:
      "Offline public/synthetic data; no normal userdata/provider login/private data; native dialogs test-routed to isolated paths",
  };
  await writeFile(
    join(data, "evidence.json"),
    JSON.stringify(evidence, null, 2),
    { flag: "wx" },
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await app.close();
}
