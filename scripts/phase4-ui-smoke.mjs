import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { createConceptSet, buildStoryBlueprint } from "@hekayti/core/story";
import { createStoryDraft } from "@hekayti/core/language";
import { storyStructureFor } from "@hekayti/core/age";
import { manualBridgeProvenance } from "@hekayti/core/workflow";
import { countWords } from "@hekayti/contracts";
await mkdir("temp/phase4-ui", { recursive: true });
const data = await mkdtemp(resolve("temp/phase4-ui/run-"));
const launch = () =>
  electron.launch({
    executablePath: resolve("node_modules/electron/dist/electron.exe"),
    args: [resolve("apps/desktop"), "--phase2-data=" + data],
    timeout: 30000,
  });
let desktop = await launch();
const gates = [];
let projectId, packageId, recordId, approved;
const must = (result) => {
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
};
try {
  let page = await desktop.firstWindow();
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Source preference").inputValue(),
    "hybrid",
  );
  await page.getByRole("button", { name: "New Story", exact: true }).click();
  await page.getByTestId("workflow-state").waitFor();
  projectId = await page.getByLabel("Reopen story").inputValue();
  gates.push("HYBRID default + persisted synthetic request");
  await page
    .getByRole("button", { name: "Library / Inbox / Bridge", exact: true })
    .click();
  await page.getByLabel("Bridge current story").selectOption(projectId);
  await page
    .getByRole("button", { name: "Add synthetic starter", exact: true })
    .click();
  await page
    .getByTestId("library-count")
    .filter({ hasText: "1 records" })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Synthetic supported discovery family",
      exact: true,
    })
    .click();
  for (const name of ["REVIEW", "APPROVE", "PROMOTE to Library"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page
      .getByTestId("library-status")
      .filter({ hasText: name.split(" ")[0] + " recorded" })
      .waitFor();
  }
  await page.getByRole("button", { name: "Library", exact: true }).click();
  await page.getByLabel("Use context starter-supported-discovery").check();
  await page.getByRole("button", { name: "Bridge", exact: true }).click();
  await page
    .getByRole("button", { name: "Prepare immutable package", exact: true })
    .click();
  await page
    .getByLabel("Generation package instructions")
    .filter({ hasText: "HEKAYTI" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Copy package instructions", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByLabel("Synthetic package reviewed").check();
  await page
    .getByRole("button", { name: "Copy package instructions", exact: true })
    .click();
  await page
    .getByTestId("library-status")
    .filter({ hasText: "Copied after explicit" })
    .waitFor();
  const clipboard = await desktop.evaluate(({ clipboard }) =>
    clipboard.readText(),
  );
  assert.match(clipboard, /FIXED BY HEKAYTI/);
  assert.match(clipboard, /OPEN FOR AI CREATIVITY/);
  const prompt = await page
    .getByLabel("Generation package instructions")
    .inputValue();
  packageId = JSON.parse(
    prompt
      .split("FROZEN REQUEST / GUIDANCE / CONTEXT\n")[1]
      .split("\nOUTPUT JSON SCHEMA")[0],
  ).packageId;
  const p = must(
    await page.evaluate((id) => window.hekayti.bridgeLoad(id), packageId),
  );
  await page.getByLabel("Bridge consumer target").selectOption("GEMINI");
  await page.waitForFunction(() =>
    document
      .querySelector('[aria-label="Generation package instructions"]')
      .value.includes("target GEMINI"),
  );
  assert.equal(
    await page.getByLabel("Synthetic package reviewed").isChecked(),
    false,
  );
  gates.push(
    "Human promotion + frozen context + real clipboard copy + shared Gemini target",
  );
  await page.getByLabel("Paste concept response JSON").fill("{bad");
  await page
    .getByRole("button", { name: "Validate and import to Inbox", exact: true })
    .click();
  await page.getByLabel("Copy-ready repair instructions").waitFor();
  assert.match(
    await page.getByLabel("Copy-ready repair instructions").inputValue(),
    /No partial response/,
  );
  const stock = createConceptSet(p.request, p.guidance, p.generation);
  const candidates = structuredClone(stock.concepts);
  for (const [i, c] of candidates.entries()) {
    c.provenance = { ...manualBridgeProvenance };
    c.title = `Synthetic manual lantern ${i}`;
    c.premise = "A fictional lantern lights a shared path.";
    for (const [j, b] of c.outline.entries()) {
      b.focus = { "ar-MSA-simple": "فانوس", "ar-EG": "فانوس", en: "lantern" };
      b.beforeState = j ? `lantern state ${j}` : "unlit lantern";
      b.afterState = `lantern state ${j + 1}`;
      b.visibleFacts = [b.afterState];
    }
    c.resolutionDirection = c.outline.at(-1).afterState;
  }
  await page.getByLabel("Model note").fill("Operator reports unknown model");
  await page
    .getByLabel("Paste concept response JSON")
    .fill(
      JSON.stringify({
        schemaVersion: "bridge-response/1.0",
        packageId,
        requestRevisionId: p.request.revisionId,
        candidates,
      }),
    );
  await page
    .getByRole("button", { name: "Validate and import to Inbox", exact: true })
    .click();
  await page
    .getByTestId("library-status")
    .filter({ hasText: "unreviewed Inbox" })
    .waitFor();
  const state = must(await page.evaluate(() => window.hekayti.libraryLoad()));
  recordId = state.records.find(
    (r) => r.payload.type === "STORY_CONCEPT",
  ).recordId;
  assert.equal(
    state.records.find((r) => r.recordId === recordId).status,
    "GENERATED",
  );
  await page.getByRole("button", { name: "USE_NOW", exact: true }).click();
  await page
    .getByTestId("library-status")
    .filter({ hasText: "USE_NOW selected" })
    .waitFor();
  gates.push("Malformed JSON repair + atomic Inbox import + explicit use-now");
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  await page.getByLabel("Reopen story").selectOption(projectId);
  await page
    .getByRole("button", { name: "Build blueprint", exact: true })
    .click();
  await page
    .getByText("Current canonical blueprint", { exact: false })
    .waitFor();
  let s = must(
    await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
  );
  if (!s.current.blueprintRevisionId) {
    await page.waitForTimeout(300);
    s = must(
      await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
    );
  }
  const b = s.blueprints.at(-1);
  assert.equal(b.workingTitle, "Synthetic manual lantern 0");
  assert.equal(b.meaningBeats[0].afterState, "lantern state 1");
  await page
    .getByRole("button", { name: "Library / Inbox / Bridge", exact: true })
    .click();
  await page.getByLabel("Bridge current story").selectOption(projectId);
  await page.getByRole("button", { name: "Bridge", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Prepare manual draft instructions",
      exact: true,
    })
    .click();
  await page
    .getByLabel("Manual draft instructions")
    .filter({ hasText: "HEKAYTI" })
    .waitFor();
  const template = buildStoryBlueprint(
    p.request,
    storyStructureFor(p.request),
    stock.concepts[0],
    "smoke-template",
  );
  const draft = createStoryDraft(
    p.request,
    stock.concepts[0],
    template,
    "smoke-manual-draft",
  );
  draft.provenance = { ...manualBridgeProvenance };
  draft.sourceRevision = b.revisionId;
  draft.conceptId = candidates[0].conceptId;
  for (const e of draft.editions) {
    e.sourceRevision = b.revisionId;
    e.pages = e.pages.map((page, i) => {
      const narration =
        e.mode === "ar-EG"
          ? "الفانوس الصغير نوّر الطريق. لقينا مكان هادي مع بعض واطمّنا."
          : "أضاء الفانوس الصغير الطريق. وجدنا مكانًا هادئًا معًا وشعرنا بالطمأنينة.";
      return {
        ...page,
        pageId: b.pagePlan[i].pageId,
        narration,
        altText: narration,
        wordCount: countWords(narration),
      };
    });
    e.totalWords = e.pages.reduce((n, page) => n + page.wordCount, 0);
  }
  await page.getByLabel("Paste manual draft JSON").fill(JSON.stringify(draft));
  await page
    .getByRole("button", {
      name: "Validate and import manual draft",
      exact: true,
    })
    .click();
  await page
    .getByTestId("library-status")
    .filter({ hasText: "Manual prose retained" })
    .waitFor();
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  await page.getByLabel("Reopen story").selectOption(projectId);
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
  approved = must(
    await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
  );
  assert.equal(approved.drafts.at(-1).provenance.kind, "manual");
  assert.equal(approved.current.approvalId !== null, true);
  gates.push(
    "Imported creative Blueprint preserved + manual prose + current advisory acknowledgment + canonical approval",
  );
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  const invalid = await page.evaluate(() =>
    window.hekayti.bridgePrepare({ unexpected: "deny" }),
  );
  assert.equal(invalid.ok, false);
  gates.push("Isolated renderer + strict IPC rejects extra fields");
  await page.screenshot({
    path: join(data, "approved-manual-story.png"),
    fullPage: true,
  });
  await desktop.close();
  desktop = await launch();
  page = await desktop.firstWindow();
  await page
    .getByRole("button", { name: "Library / Inbox / Bridge", exact: true })
    .click();
  await page
    .getByTestId("library-count")
    .filter({ hasText: "3 records" })
    .waitFor();
  const reopened = must(
    await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
  );
  assert.deepEqual(reopened, approved);
  const reopenedLibrary = must(
    await page.evaluate(() => window.hekayti.libraryLoad()),
  );
  assert.equal(reopenedLibrary.usage.length, 2);
  await page.getByRole("button", { name: "Bridge", exact: true }).click();
  await page.getByLabel("Reopen bridge package").fill(packageId);
  await page
    .getByRole("button", { name: "Reopen frozen package", exact: true })
    .click();
  await page
    .getByLabel("Generation package instructions")
    .filter({ hasText: "HEKAYTI" })
    .waitFor();
  assert.equal(
    await page.getByLabel("Synthetic package reviewed").isChecked(),
    false,
  );
  gates.push(
    "Offline restart: Library/context usage + exact approved workflow + frozen package reopen",
  );
  await writeFile(
    join(data, "evidence.json"),
    JSON.stringify(
      {
        status: "PASS",
        projectId,
        packageId,
        recordId,
        gates,
        scope:
          "offline synthetic UI only; no consumer-model/native quality claim",
        data,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        gates: gates.length,
        evidence: join(data, "evidence.json"),
      },
      null,
      2,
    ),
  );
} finally {
  await desktop.close();
}
