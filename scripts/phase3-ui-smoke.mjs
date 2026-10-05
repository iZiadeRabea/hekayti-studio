import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
await mkdir("temp/phase3-ui", { recursive: true });
const data = await mkdtemp(resolve("temp/phase3-ui/run-"));
const launch = () =>
  electron.launch({
    executablePath: resolve("node_modules/electron/dist/electron.exe"),
    args: [resolve("apps/desktop"), "--phase2-data=" + data],
    timeout: 30000,
  });
let desktop = await launch(),
  projectId,
  approved;
try {
  const page = await desktop.firstWindow();
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  await page.getByLabel("Story age months").fill("42");
  await page.getByLabel("Synthetic personalization").selectOption("3");
  await page.getByLabel("Grammatical agreement").selectOption("feminine");
  await page.getByLabel("Source preference").selectOption("ai");
  await page.getByRole("button", { name: "New Story", exact: true }).click();
  await page.getByTestId("workflow-state").waitFor();
  await page
    .getByRole("button", { name: "Create more concepts", exact: true })
    .click();
  await page.locator(".concept-card").first().waitFor();
  assert.equal(await page.locator(".concept-card").count(), 3);
  await page
    .getByRole("button", { name: "Select / replace concept", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Build blueprint", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Draft language editions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run structured QA", exact: true })
    .click();
  await page.getByText("QA ", { exact: false }).first().waitFor();
  await page.getByLabel("Acknowledge advisory limits").check();
  await page
    .getByRole("button", {
      name: "Explicitly approve current text",
      exact: true,
    })
    .click();
  await page
    .getByTestId("workflow-state")
    .filter({ hasText: "approval approved" })
    .waitFor();
  projectId = await page.getByLabel("Reopen story").inputValue();
  const loaded = await page.evaluate(
    (id) => window.hekayti.loadStory(id),
    projectId,
  );
  assert.equal(loaded.ok, true);
  approved = loaded.value;
  assert.equal(approved.requests[0].sourceStrategy, "ai");
  assert.equal(approved.drafts[0].provenance.kind, "mock");
  assert.equal(approved.approvals.length, 1);
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  const invalid = await page.evaluate(
    (id) =>
      window.hekayti.storyAction({
        projectId: id,
        expectedVersion: 0,
        action: "build",
        secret: "unexpected",
      }),
    projectId,
  );
  assert.equal(invalid.ok, false);
  const prefs = await desktop.evaluate(({ BrowserWindow }) => {
    const p =
      BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();
    return {
      sandbox: p.sandbox,
      contextIsolation: p.contextIsolation,
      nodeIntegration: p.nodeIntegration,
      webSecurity: p.webSecurity,
    };
  });
  assert.deepEqual(prefs, {
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false,
    webSecurity: true,
  });
  await page.screenshot({
    path: join(data, "creator-approved.png"),
    fullPage: true,
  });
  await desktop.close();
  desktop = await launch();
  const reopened = await desktop.firstWindow();
  await reopened
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  await reopened.getByLabel("Reopen story").selectOption(projectId);
  await reopened
    .getByTestId("workflow-state")
    .filter({ hasText: "approval approved" })
    .waitFor();
  const persisted = await reopened.evaluate(
    (id) => window.hekayti.loadStory(id),
    projectId,
  );
  assert.deepEqual(persisted.value, approved);
  await reopened
    .getByRole("button", { name: "Create more concepts", exact: true })
    .click();
  await reopened
    .getByTestId("workflow-state")
    .filter({ hasText: "approval stale" })
    .waitFor();
  await reopened
    .getByRole("button", { name: "Select / replace concept", exact: true })
    .last()
    .click();
  await reopened
    .getByRole("button", { name: "Build blueprint", exact: true })
    .click();
  await reopened
    .getByRole("button", { name: "Draft language editions", exact: true })
    .click();
  await reopened
    .getByRole("button", { name: "Run structured QA", exact: true })
    .click();
  await reopened.getByLabel("Acknowledge advisory limits").check();
  await reopened
    .getByRole("button", {
      name: "Explicitly approve current text",
      exact: true,
    })
    .click();
  await reopened
    .getByTestId("workflow-state")
    .filter({ hasText: "approval approved" })
    .waitFor();
  await reopened.getByLabel("Story age months").fill("18");
  await reopened
    .getByRole("button", { name: "Save changed request", exact: true })
    .click();
  await reopened
    .getByTestId("workflow-state")
    .filter({ hasText: "approval stale" })
    .waitFor();
  const final = await reopened.evaluate(
    (id) => window.hekayti.loadStory(id),
    projectId,
  );
  assert.equal(final.value.approvals.length, 2);
  assert.equal(final.value.requests.length, 2);
  assert.equal(final.value.blueprints.length, 2);
  assert.equal(final.value.drafts.length, 2);
  await reopened.screenshot({
    path: join(data, "creator-stale.png"),
    fullPage: true,
  });
  const result = {
    status: "PASS",
    data,
    projectId,
    checks: [
      "request/cards/select/build/draft/QA/explicit approval",
      "MSA/Egyptian editions",
      "actual mock provenance",
      "strict IPC rejection",
      "secure renderer",
      "actual process restart and persisted approval",
      "create-more/replace/new request invalidation",
      "immutable two approvals/blueprints/drafts",
    ],
    legacyRegression: "Run scripts/ui-smoke.mjs separately",
  };
  await writeFile(
    join(data, "phase3-ui-result.json"),
    JSON.stringify(result, null, 2),
    { flag: "wx" },
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await desktop.close();
}
