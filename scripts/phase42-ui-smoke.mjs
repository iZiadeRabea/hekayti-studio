// Actual offline Electron UI/IPC; synthetic operator actions are test fixtures,
// never a claim of literary/native/provider quality or actual human review.
import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
import { countWords } from "@hekayti/contracts";
import { manualBridgeProvenance } from "@hekayti/core/workflow";
import { validateStoryPlan } from "@hekayti/core/planner";
import {
  readCreativeArchive,
  SqliteProjectRepository,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
await mkdir("temp/phase42-ui", { recursive: true });
const packaged = process.argv.includes("--packaged"),
  ownerLive = process.argv.includes("--owner-live"),
  writerLive = process.argv.includes("--writer-live"),
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
  const saved = (message = "Planner change saved and validated.") =>
    page.getByTestId("planner-status").filter({ hasText: message }).waitFor();
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
  let ownerPlanning;
  if (ownerLive || writerLive) {
    ownerPlanning = JSON.parse(
      await readFile(
        "examples/story-planner/quality-live-request.json",
        "utf8",
      ),
    );
    if (writerLive) {
      ownerPlanning.request.ageMonths = 42;
      ownerPlanning.request.languageModes = ["ar-MSA-simple", "ar-EG"];
      ownerPlanning.constraints = [];
    }
    // Seed the exact synthetic fixture through the public desktop IPC: theme,
    // languageModes and profileId are not editable in the minimal creator form.
    // IDs are isolated so the default demo project is not overwritten.
    ownerPlanning.request.projectId =
      "owner-live-synthetic-" + crypto.randomUUID();
    ownerPlanning.request.storyId = "owner-live-story-" + crypto.randomUUID();
    must(
      await page.evaluate(
        (request) => window.hekayti.newStory(request),
        ownerPlanning.request,
      ),
    );
    await button("Projects").click();
    await button("Story Creator").click();
    await page
      .getByLabel("Reopen story")
      .selectOption(ownerPlanning.request.projectId);
    await page
      .getByLabel("Optional fictional setting")
      .fill(ownerPlanning.selectedSetting);
    await page
      .getByLabel("Creator constraints for human review")
      .fill(ownerPlanning.constraints[0] ?? "");
  } else await button("New Story").click();
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
  let exactLiveResult;
  if (ownerLive || writerLive) {
    const live = planner.plans[0],
      qa = validateStoryPlan(live);
    const expected = JSON.parse(
      await readFile(
        "examples/story-planner/quality-live-regression.json",
        "utf8",
      ),
    ).after.plan;
    assert.equal(
      live.schemaVersion,
      writerLive ? "story-plan/1.2" : "story-plan/1.1",
    );
    assert.deepEqual(live.planning.request, ownerPlanning.request);
    for (const key of [
      "profile",
      "variation",
      "generation",
      "selectedFamily",
      "selectedCharacter",
      "selectedSetting",
      "constraints",
      "inspirationReviewed",
      "adaptationAcknowledged",
      "sensitiveOptIn",
      "religiousOptIn",
    ])
      assert.deepEqual(live.planning[key], ownerPlanning[key]);
    assert.equal(
      live.quality.objectiveIntent.primaryIntent,
      "SHARING_TURN_TAKING",
    );
    assert.equal(
      live.provenance.selectedStoryFamilyId,
      expected.provenance.selectedStoryFamilyId,
    );
    assert.equal(live.provenance.selectedPatternId, null);
    if (!writerLive)
      assert.deepEqual(
        live.beats.map((b) => b.summary),
        expected.beats.map((b) => b.summary),
      );
    if (!writerLive)
      assert.equal(
        live.quality.situation.resolutionMethod,
        expected.quality.situation.resolutionMethod,
      );
    if (writerLive) {
      assert.equal(live.quality.categoryIntent.category, "adventure");
      assert.equal(qa.signals.CategoryPresence, "REVIEW");
      assert.match(live.beats.map((b) => b.summary).join(" "), /ground marker/);
      assert.match(
        live.beats.map((b) => b.summary).join(" "),
        /folded play mat corner/,
      );
      assert.match(live.quality.situation.resolutionMethod, /destination/);
      assert.match(
        live.quality.situation.resolutionMethod,
        /swap roller and catcher/,
      );
    }
    assert.ok(
      !qa.findings.some((f) => ["high", "blocker"].includes(f.severity)),
    );
    const resolution = live.quality.transitions.find(
      (t) => t.beatId === live.resolutionBeatId,
    );
    const acceptance = {
      A: live.provenance.sourceMode !== "EDITORIAL_FALLBACK",
      B:
        !!live.provenance.selectedStoryFamilyId &&
        live.provenance.sources.length > 0,
      C: ["STRONG", "ACCEPTABLE"].includes(
        live.quality.structuralCompatibility.level,
      ),
      D: new Set(resolution.participantIds).size >= 2,
      E: new Set(live.quality.transitions.map((t) => t.strategy)).size >= 4,
      F: /each child/.test(live.quality.situation.resolutionMethod),
      G: !live.goal.description.includes(
        live.planning.request.objective.description,
      ),
      H: !live.beats.some((b) =>
        /Approach \d|next visible clue/.test(b.summary),
      ),
      I: !qa.findings.some((f) => ["high", "blocker"].includes(f.severity)),
    };
    assert.ok(Object.values(acceptance).every(Boolean));
    exactLiveResult = {
      intent: live.quality.objectiveIntent.primaryIntent,
      family: live.provenance.selectedStoryFamilyId,
      pattern: live.provenance.selectedPatternId,
      sourceMode: live.provenance.sourceMode,
      characters: live.characters,
      beats: live.beats,
      quality: live.quality,
      signals: qa.signals,
      findings: qa.findings,
      acceptance,
    };
    await writeFile(
      join(data, "exact-live-result.json"),
      JSON.stringify(exactLiveResult, null, 2),
    );
    await page.getByTestId("planner-quality").waitFor();
    await page
      .getByTestId("story-planner")
      .screenshot({ path: join(data, "exact-live-plan.png") });
  }
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
  await saved("Prompt prepared.");
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
      .filter({
        hasText:
          target === "CHATGPT"
            ? "ChatGPT prompt copied."
            : target === "GEMINI"
              ? "Gemini prompt copied."
              : "Writer prompt copied.",
      })
      .waitFor();
    copyTexts[target] = await app.evaluate(({ clipboard }) =>
      clipboard.readText(),
    );
    assert.match(copyTexts[target], /ما يجب الحفاظ عليه|FIXED STORY STRUCTURE/);
    assert.match(
      copyTexts[target],
      /ما يمكن للكاتب ابتكاره|AI WRITING FREEDOM/,
    );
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
  let response = {
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
  if (pkg.outputSchemaVersion === "writer-response/1.0") {
    response = {
      schemaVersion: "writer-response/1.0",
      editions: plan.planning.request.languageModes.map((mode) => ({
        mode,
        pages: blueprint.pagePlan.map((_, i) => ({
          pageNumber: i + 1,
          narration:
            mode === "ar-MSA-simple"
              ? "مدت نور الكرة إلى سلمى. أخذت سلمى دورها ثم أعادت الكرة إلى نور."
              : "نور مدت الكورة لسلمى. سلمى خدت دورها ورجعت الكورة لنور.",
          dialogue: [],
          altText: "طفلتان تتبادلان الكرة.",
        })),
      })),
    };
  }
  if (writerLive) {
    const original = {
      planner,
      workflow,
      library: must(await page.evaluate(() => window.hekayti.libraryLoad())),
    };
    const preview = async (value) => {
      await page
        .getByLabel("Planner result JSON")
        .fill(typeof value === "string" ? value : JSON.stringify(value));
      await button("Validate response without saving").click();
      await page.getByTestId("writer-response-feedback").waitFor();
    };
    const unchanged = async () => {
      assert.deepEqual(
        must(
          await page.evaluate(
            (id) => window.hekayti.plannerLoad(id),
            projectId,
          ),
        ),
        original.planner,
      );
      assert.deepEqual(
        must(
          await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
        ),
        original.workflow,
      );
      assert.deepEqual(
        must(await page.evaluate(() => window.hekayti.libraryLoad())),
        original.library,
      );
    };
    assert.equal(
      await page.getByTestId("writer-prompt-preview").getAttribute("readonly"),
      "",
    );
    const prompt = await page.getByTestId("writer-prompt-preview").inputValue();
    for (const heading of [
      "القصة المطلوبة",
      "العمر",
      "نوع القصة",
      "هدف القصة",
      "الشخصيات",
      "المكان",
      "تسلسل الأحداث",
      "ما يجب الحفاظ عليه",
      "ما يمكن للكاتب ابتكاره",
      "قواعد اللغة",
      "قواعد الجودة الأدبية",
      "صيغة الرد المطلوبة",
    ])
      assert.ok(prompt.includes(heading));
    await preview("{");
    assert.match(
      await page.getByTestId("writer-response-feedback").innerText(),
      /Response JSON is invalid/,
    );
    await unchanged();
    await button("Validate / Import planned prose").click();
    await page.waitForFunction(
      () =>
        !document.querySelector('[aria-label="Planner result JSON"]').disabled,
    );
    await unchanged();
    const bad = structuredClone(response);
    bad.editions[0].pages[1].dialogue = [
      { speaker: "unknown-fixture", text: "مرحبا" },
    ];
    await preview(bad);
    let feedback = await page
      .getByTestId("writer-response-feedback")
      .innerText();
    assert.match(feedback, /not a known story character/);
    assert.match(feedback, /ar-MSA-simple/);
    assert.match(feedback, /Page\s+2/);
    assert.match(feedback, /unknown-fixture/);
    await page.getByTestId("ui-language-ar").click();
    const locationItem = page
      .getByTestId("writer-response-feedback")
      .locator("li")
      .first();
    await locationItem.locator("summary").click();
    await locationItem.screenshot({
      path: join(data, "arabic-writer-location-readable.png"),
    });
    await page
      .getByTestId("writer-prompt-preview")
      .screenshot({ path: join(data, "arabic-writer-prompt-readable.png") });
    await page.getByTestId("ui-language-en").click();
    await unchanged();
    const register = structuredClone(response);
    register.editions[0].pages[1].narration =
      "نور عايزة تشارك الكرة. أخذت سلمى دورها وأعادت الكرة لنور.";
    await preview(register);
    assert.match(
      await page.getByTestId("writer-response-feedback").innerText(),
      /requested register/,
    );
    await unchanged();
    response.editions.reverse();
    response.editions.forEach((e) => e.pages.reverse());
    await preview(response);
    assert.match(
      await page.getByTestId("writer-response-feedback").innerText(),
      /Review the response before import|Response is ready/,
    );
    await unchanged();
    await page.getByTestId("ui-language-ar").click();
    assert.equal(
      await page.getByLabel("لغة القصة", { exact: true }).inputValue(),
      "ar-EG",
    );
    assert.equal(
      await page.getByTestId("writer-prompt-preview").inputValue(),
      prompt,
    );
    await page
      .getByTestId("writer-response-feedback")
      .screenshot({ path: join(data, "arabic-writer-preview.png") });
    await page.getByTestId("ui-language-en").click();
    gates.push(
      "Writer readonly human prompt headings, malformed/unknown-speaker/register location diagnostics, zero state mutation after previews/failed import, reversed editions/pages, UI language independent of story language and prompt",
    );
  }
  await page.getByLabel("Planner result JSON").fill(JSON.stringify(response));
  await button("Validate / Import planned prose").click();
  await saved("Draft imported successfully.");
  if (writerLive) {
    const imported = must(
      await page.evaluate((id) => window.hekayti.loadStory(id), projectId),
    );
    assert.deepEqual(
      imported.drafts.at(-1).editions.map((e) => e.mode),
      plan.planning.request.languageModes,
    );
    assert.ok(
      imported.drafts
        .at(-1)
        .editions.every(
          (e) => e.pages[0].pageId === blueprint.pagePlan[0].pageId,
        ),
    );
  }
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
    ownerLive,
    writerLive,
    exactLiveResult,
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
