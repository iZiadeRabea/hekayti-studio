// Actual offline Electron UI/IPC; synthetic operator actions are test fixtures,
// never a claim of literary/native/provider quality or actual human review.
import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { countWords } from "@hekayti/contracts";
import { manualBridgeProvenance } from "@hekayti/core/workflow";
import {
  readCreativeArchive,
  SqliteProjectRepository,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
await mkdir("temp/phase42-ui", { recursive: true });
const packaged = process.argv.includes("--packaged"),
  data = await mkdtemp(resolve("temp/phase42-ui/run-")),
  gates = [],
  archive = join(data, "planner-creative.zip");
const launch = () =>
  electron.launch({
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
const must = (r) => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value;
};
let app = await launch();
try {
  let page = await app.firstWindow();
  await page.getByTestId("ui-language-en").click();
  const button = (name) => page.getByRole("button", { name, exact: true });
  const saved = () =>
    page
      .getByTestId("planner-status")
      .filter({ hasText: "Planner change saved and validated." })
      .waitFor();
  await button("Starter / Creative Library").click();
  await page
    .getByLabel(
      "I reviewed public/synthetic creative text; no private child/customer information.",
    )
    .check();
  await button("Import traceable starter").click();
  await page
    .getByTestId("creative-library-status")
    .filter({ hasText: "791 added" })
    .waitFor();
  await button("Story Creator").click();
  await page.getByLabel("Story age months").fill("48");
  await page
    .getByLabel("Story language", { exact: true })
    .selectOption("ar-EG");
  await button("New Story").click();
  await page.getByTestId("workflow-state").waitFor();
  const projectId = await page.getByLabel("Reopen story").inputValue();
  await page
    .getByLabel(
      "I reviewed provisional Library inspiration; this does not promote it.",
    )
    .check();
  await page
    .getByLabel("I acknowledge cultural/age/Arabic adaptation needs.")
    .check();
  await button("Plan Story / regenerate with choices").click();
  await saved();
  await page
    .getByText("Logic QA and source provenance", { exact: true })
    .click();
  assert.equal(
    await button("Accept Plan and build Blueprint").isDisabled(),
    true,
  );
  let planner = must(
    await page.evaluate((id) => window.hekayti.plannerLoad(id), projectId),
  );
  assert.equal(planner.plans.length, 1);
  assert.ok(planner.plans[0].provenance.sources.length > 0);
  gates.push(
    "Actual 791-row import/request/plan/source provenance/logic display; acceptance gated by explicit acknowledgement",
  );
  await page
    .getByLabel(
      "I reviewed this plan and advisory limits; accept fixed structure.",
    )
    .check();
  await button("Accept Plan and build Blueprint").click();
  await saved();
  await button("Prepare manual writing package").click();
  await saved();
  const copyTexts = {};
  for (const target of ["CHATGPT", "GEMINI", "GENERIC"]) {
    assert.equal(await button("Copy for " + target).isDisabled(), true);
    await page
      .getByLabel(
        "I reviewed the whole package for synthetic-only external copying.",
      )
      .check();
    await button("Copy for " + target).click();
    await page
      .getByTestId("planner-status")
      .filter({ hasText: "Copy-ready package copied" })
      .waitFor();
    copyTexts[target] = await app.evaluate(({ clipboard }) =>
      clipboard.readText(),
    );
    assert.match(copyTexts[target], /FIXED STORY STRUCTURE/);
    assert.match(copyTexts[target], /AI WRITING FREEDOM/);
  }
  planner = must(
    await page.evaluate((id) => window.hekayti.plannerLoad(id), projectId),
  );
  const pkg = planner.packages.at(-1),
    plan = pkg.plan;
  let workflow = must(
    await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
  );
  const blueprint = workflow.blueprints.at(-1);
  const draft = {
    schemaVersion: "story-draft/1.0",
    draftId: "synthetic-ui-prose",
    sourceRevision: blueprint.revisionId,
    conceptId: workflow.current.conceptId,
    status: "draft",
    provenance: manualBridgeProvenance,
    editions: blueprint.languageVersions.map((e, i) => {
      const pages = e.pages.map((p) => ({
        ...p,
        narration: "ليلى شافت اللعبة. استنت دورها بالراحة.",
        dialogue: [],
        wordCount: countWords("ليلى شافت اللعبة. استنت دورها بالراحة."),
      }));
      return {
        ...e,
        languageVersionId: "synthetic-ui-edition-" + i,
        pages,
        totalWords: pages.reduce((n, p) => n + p.wordCount, 0),
        review:
          "Unverified synthetic smoke prose; no provider or human-quality claim.",
      };
    }),
  };
  const response = {
    schemaVersion: "plan-response/1.0",
    packageId: pkg.packageId,
    planRevisionId: plan.revisionId,
    planHash: pkg.acceptance.planHash,
    requestRevisionId: plan.planning.request.revisionId,
    objective: plan.planning.request.objective.description,
    actors: plan.characters.map((c) => c.characterId),
    majorBeatIds: plan.beats.map((b) => b.beatId),
    resolutionBeatId: plan.resolutionBeatId,
    draft,
  };
  await page.getByLabel("Planner result JSON").fill(JSON.stringify(response));
  await button("Validate / Import planned prose").click();
  await saved();
  await button("Run structured QA").click();
  await page.getByLabel("Acknowledge advisory limits").check();
  await button("Explicitly approve current text").click();
  await page
    .getByTestId("workflow-state")
    .filter({ hasText: "approval approved" })
    .waitFor();
  await page
    .getByLabel("Review notes", { exact: true })
    .fill(
      "SYNTHETIC UI TEST ACTION ONLY: tested current approval/feedback binding; not actual editorial review.",
    );
  await button("Record APPROVED").click();
  await saved();
  planner = must(
    await page.evaluate((id) => window.hekayti.plannerLoad(id), projectId),
  );
  assert.equal(planner.feedback.length, 1);
  const library = must(await page.evaluate(() => window.hekayti.libraryLoad()));
  const variants = library.records.filter(
    (r) => r.origin.transport === "planner-derived",
  );
  assert.ok(variants.length > 0);
  assert.ok(variants.every((r) => r.status === "GENERATED"));
  gates.push(
    "Three real clipboard packages; synthetic structured import; canonical QA/explicit test approval; current feedback creates GENERATED planner variant",
  );
  await page.screenshot({
    path: join(data, "planner-feedback.png"),
    fullPage: true,
  });
  await button("Starter / Creative Library").click();
  await page
    .getByLabel(
      "I reviewed public/synthetic creative text; no private child/customer information.",
    )
    .check();
  await app.evaluate(({ dialog }, path) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
  }, archive);
  await button("Export creative ZIP").click();
  await page
    .getByTestId("creative-library-status")
    .filter({ hasText: "Creative ZIP saved" })
    .waitFor();
  const bytes = await readFile(archive),
    portable = readCreativeArchive(bytes);
  const variantIds = new Set(variants.map((r) => r.recordId));
  assert.ok(portable.bundle.records.some((r) => variantIds.has(r.recordId)));
  assert.ok(
    portable.bundle.records.every(
      (r) =>
        r.origin.importId === null &&
        r.origin.packageId === null &&
        r.status === "GENERATED",
    ),
  );
  assert.equal(JSON.stringify(portable.bundle).includes(projectId), false);
  const restored = new SqliteProjectRepository(
    join(data, "independent-creative-restore.sqlite"),
  );
  try {
    const preview = previewCreativeRestore(restored, bytes);
    assert.equal(restored.loadLibrary().records.length, 0);
    restoreCreativeArchive(
      restored,
      bytes,
      { digest: preview.digest, expectedVersion: 0, choices: {} },
      "synthetic-smoke",
    );
    assert.ok(
      restored
        .loadLibrary()
        .records.some(
          (r) => variantIds.has(r.recordId) && r.status === "GENERATED",
        ),
    );
    assert.equal(restored.loadPlanner(projectId), null);
  } finally {
    restored.close();
  }
  gates.push(
    "Actual creative ZIP projection includes planner-derived reusable variant and excludes operational planner history by archive schema",
  );
  const retained = planner;
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page.getByTestId("ui-language-en").click();
  await button("Story Creator").click();
  await page.getByLabel("Reopen story").selectOption(projectId);
  await page
    .getByTestId("workflow-state")
    .filter({ hasText: "approval approved" })
    .waitFor();
  assert.deepEqual(
    must(
      await page.evaluate((id) => window.hekayti.plannerLoad(id), projectId),
    ),
    retained,
  );
  assert.equal(
    must(await page.evaluate((id) => window.hekayti.loadStory(id), projectId))
      .approvals.length,
    1,
  );
  gates.push(
    "Actual process restart preserves accepted plan/package/feedback and canonical historical approval",
  );
  const evidence = {
    status: "PASS",
    packaged,
    data,
    projectId,
    archive,
    gates,
    scope:
      "Synthetic offline test actions; isolated userdata; no API/private data/provider/human-quality claims.",
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
