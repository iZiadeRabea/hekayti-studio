// Actual Arabic-default renderer/IPC and restart in isolated synthetic storage.
// No normal userdata, translation service, provider call or actual human review.
import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
await mkdir("temp/phase421-localization", { recursive: true });
const data = await mkdtemp(resolve("temp/phase421-localization/run-")),
  packaged = process.argv.includes("--packaged"),
  gates = [];
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
  await page.getByTestId("creator-mode-switch").click(); // Advanced Arabic regression; Phase43 separately proves fresh Simple default.
  await page.setViewportSize({ width: 1400, height: 900 });
  assert.deepEqual(
    await page.evaluate(() => [
      document.documentElement.lang,
      document.documentElement.dir,
    ]),
    ["ar", "rtl"],
  );
  assert.equal(
    await page.getByTestId("ui-language-ar").getAttribute("aria-pressed"),
    "true",
  );
  await page
    .getByRole("button", {
      name: "مكتبة الإلهام والمواد الإبداعية",
      exact: true,
    })
    .click();
  await page
    .getByLabel(
      "راجعت النصوص العامة أو الخيالية، ولا توجد معلومات خاصة بطفل أو عميل.",
    )
    .check();
  await page
    .getByRole("button", { name: "استيراد إلهام موثق المصدر", exact: true })
    .click();
  await page.waitForFunction(async () => {
    const r = await window.hekayti.libraryPage({ limit: 1 });
    return r.ok && r.value.total === 791;
  });
  await page.getByRole("button", { name: "منشئ القصة", exact: true }).click();
  await page.getByLabel("عمر الطفل بالشهور", { exact: true }).fill("48");
  await page.getByLabel("لغة القصة", { exact: true }).selectOption("ar-EG");
  await page
    .getByLabel("نوع القصة", { exact: true })
    .selectOption("behavioral");
  await page.getByLabel("الهدف", { exact: true }).selectOption("behavioral");
  const authored = "المشاركة في اللعبة وتبادل الأدوار",
    success = "يتبادل الطفلان اللعب بالكرة";
  await page.getByLabel("وصف الهدف", { exact: true }).fill(authored);
  await page.getByLabel("موقف تحقق الهدف", { exact: true }).fill(success);
  await page.getByRole("button", { name: "قصة جديدة", exact: true }).click();
  await page.getByTestId("workflow-state").waitFor();
  const id = await page
    .getByLabel("فتح قصة محفوظة", { exact: true })
    .inputValue();
  const initial = must(
    await page.evaluate((id) => window.hekayti.loadStory(id), id),
  );
  assert.equal(initial.requests.at(-1).primaryLanguageMode, "ar-EG");
  assert.equal(initial.requests.at(-1).primaryCategory, "behavioral");
  assert.equal(initial.requests.at(-1).objective.description, authored);
  await page
    .getByLabel(
      "راجعت الإلهام الأولي من المكتبة؛ وهذا لا يعني اعتماده للاستخدام النهائي.",
    )
    .check();
  await page
    .getByLabel(
      "أقرّ بالحاجة إلى ملاءمة المحتوى ثقافيًا وللعمر واللغة العربية.",
    )
    .check();
  const variation = page.getByLabel("أسلوب التنويع", { exact: true });
  assert.equal(await variation.inputValue(), "FreshConcept");
  assert.deepEqual(
    await variation
      .locator("option")
      .evaluateAll((xs) => xs.map((x) => x.value)),
    ["SimilarVersion", "NewVariant", "FreshConcept", "CompletelyNew"],
  );
  await page
    .getByRole("button", {
      name: "خطّط القصة / أعد التخطيط بالاختيارات",
      exact: true,
    })
    .click();
  await page
    .getByTestId("planner-status")
    .filter({ hasText: "تم حفظ التغييرات والتحقق من الخطة" })
    .waitFor();
  const planner = must(
      await page.evaluate((id) => window.hekayti.plannerLoad(id), id),
    ),
    plan = planner.plans.at(-1);
  assert.equal(plan.schemaVersion, "story-plan/1.2");
  assert.equal(
    plan.quality.objectiveIntent.primaryIntent,
    "SHARING_TURN_TAKING",
  );
  assert.equal(plan.planning.variation, "FreshConcept");
  assert.equal(plan.planning.profile, "EGYPTIAN_ARAB_MUSLIM_FAMILY");
  await page.getByTestId("planner-quality").waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
    "Expanded quality metadata must not overflow the viewport",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: join(data, "arabic-creator.png") });
  assert.ok(
    (await page.getByTestId("planner-quality").innerText()).includes(
      "المشاركة وتبادل الأدوار",
    ),
  );
  await page
    .getByText("مراجعة منطق القصة ومصادر البناء", { exact: true })
    .click();
  assert.equal(
    await page
      .getByTestId("story-planner")
      .locator("pre")
      .first()
      .getAttribute("dir"),
    "ltr",
  );
  assert.equal(
    await page
      .getByTestId("planner-quality")
      .locator("bdi")
      .first()
      .getAttribute("dir"),
    "ltr",
  );
  await page
    .getByTestId("story-planner")
    .screenshot({ path: join(data, "arabic-plan.png") });
  gates.push(
    "Fresh Arabic default/RTL, Arabic creator labels, unchanged canonical age/language/category/variation/profile values and actual StoryPlan1.2 quality display",
  );
  await page
    .getByLabel("راجعت الخطة وحدود المراجعة؛ وأوافق على تثبيت بنية القصة.")
    .check();
  await page
    .getByRole("button", { name: "اعتماد الخطة وبناء مخطط القصة", exact: true })
    .click();
  await page
    .getByRole("button", { name: "تجهيز برومبت الكتابة", exact: true })
    .click();
  await page
    .getByLabel(
      "راجعت البرومبت كاملًا، وأؤكد أنه يحتوي بيانات خيالية فقط قبل نسخه لخدمة خارجية.",
    )
    .check();
  await page
    .getByRole("button", { name: "نسخ لـ CHATGPT", exact: true })
    .click();
  await page
    .getByTestId("planner-status")
    .filter({ hasText: "تم نسخ برومبت ChatGPT." })
    .waitFor();
  assert.match(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
    /ما يجب الحفاظ عليه/,
  );
  const retained = must(
    await page.evaluate((id) => window.hekayti.loadStory(id), id),
  );
  await page.getByTestId("ui-language-en").click();
  assert.deepEqual(
    await page.evaluate(() => [
      document.documentElement.lang,
      document.documentElement.dir,
    ]),
    ["en", "ltr"],
  );
  assert.equal(
    await page.getByLabel("Story language", { exact: true }).inputValue(),
    "ar-EG",
  );
  assert.equal(
    await page
      .getByLabel("Objective description", { exact: true })
      .inputValue(),
    authored,
  );
  assert.deepEqual(
    must(await page.evaluate((id) => window.hekayti.loadStory(id), id)),
    retained,
  );
  await page.screenshot({ path: join(data, "english-switch.png") });
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .click();
  await page.getByLabel("Reopen story", { exact: true }).selectOption(id);
  await page.getByTestId("planner-quality").waitFor();
  assert.deepEqual(
    await page.evaluate(() => [
      document.documentElement.lang,
      document.documentElement.dir,
    ]),
    ["en", "ltr"],
  );
  assert.deepEqual(
    must(await page.evaluate((id) => window.hekayti.loadStory(id), id)),
    retained,
  );
  await page.getByTestId("ui-language-ar").click();
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  assert.deepEqual(
    await page.evaluate(() => [
      document.documentElement.lang,
      document.documentElement.dir,
    ]),
    ["ar", "rtl"],
  );
  gates.push(
    "Actual Arabic accept/prepare/clipboard path; UI switch does not translate authored story text or change workflow; English and Arabic preferences persist across process restarts",
  );
  await page.getByRole("button", { name: "منشئ القصة", exact: true }).click();
  await page.getByLabel("عمر الطفل بالشهور", { exact: true }).fill("8");
  await page
    .getByLabel("لغة القصة", { exact: true })
    .selectOption("ar-MSA-simple");
  await page
    .getByLabel("نوع القصة", { exact: true })
    .selectOption("early-learning");
  await page.getByRole("button", { name: "قصة جديدة", exact: true }).click();
  await page.getByTestId("workflow-state").waitFor();
  const infantId = await page
    .getByLabel("فتح قصة محفوظة", { exact: true })
    .inputValue();
  await page
    .getByLabel(
      "راجعت الإلهام الأولي من المكتبة؛ وهذا لا يعني اعتماده للاستخدام النهائي.",
    )
    .check();
  await page
    .getByLabel(
      "أقرّ بالحاجة إلى ملاءمة المحتوى ثقافيًا وللعمر واللغة العربية.",
    )
    .check();
  await page
    .getByRole("button", {
      name: "خطّط القصة / أعد التخطيط بالاختيارات",
      exact: true,
    })
    .click();
  await page
    .getByTestId("planner-status")
    .filter({ hasText: "تم حفظ التغييرات والتحقق من الخطة" })
    .waitFor();
  const infant = must(
    await page.evaluate((id) => window.hekayti.plannerLoad(id), infantId),
  ).plans.at(-1);
  assert.ok(infant.beats.some((beat) => beat.role === "REPEAT"));
  assert.ok(
    (await page.getByTestId("story-planner").innerText()).includes("التكرار:"),
  );
  assert.ok(
    !(await page.getByTestId("story-planner").innerText()).includes("REPEAT:"),
  );
  await page
    .getByTestId("story-planner")
    .screenshot({ path: join(data, "arabic-infant-repeat.png") });
  gates.push(
    "Actual8-month StoryPlan1.2 REPEAT role displays Arabic التكرار while canonical role and simplified-MSA story language remain unchanged",
  );
  const evidence = {
    status: "PASS",
    packaged,
    data,
    projectId: id,
    schemaVersion: plan.schemaVersion,
    objectiveIntent: plan.quality.objectiveIntent.primaryIntent,
    gates,
    scope:
      "Synthetic isolated UI actions only; no actual provider/translation API/human-quality claim.",
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
