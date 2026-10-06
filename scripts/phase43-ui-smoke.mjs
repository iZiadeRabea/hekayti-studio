// Isolated actual Electron UI/IPC. Synthetic prose/review actions are fixtures,
// never native literary/provider certification or real human approval.
import { _electron as electron } from "playwright";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
await mkdir("temp/phase43-ui", { recursive: true });
const data = await mkdtemp(resolve("temp/phase43-ui/run-"));
const packaged = process.argv.includes("--packaged");
const gates = [],
  screenshots = [];
const fixture = {
  setting: "ملعب صغير في الحي جنب البيت",
  constraints: "عايز القصة خفيفة ومضحكة، من غير خوف، وتحصل في مكان مصري طبيعي.",
  goal: "يتعلم الطفل يستنى دوره ويلعب مع صاحبه.",
};
const must = (r) => {
  assert.equal(r.ok, true, JSON.stringify(r));
  return r.value;
};
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
let app = await launch(),
  page,
  projectId,
  firstDraft,
  secondDraft,
  firstPlan,
  currentPlan;
const button = (name) => page.getByRole("button", { name, exact: true });
const shot = async (name) => {
  const path = join(data, name + ".png");
  await page.screenshot({ path, fullPage: true });
  screenshots.push(path);
};
const session = async () =>
  must(
    await page.evaluate(
      (projectId) => window.hekayti.simpleLoad({ projectId }),
      projectId,
    ),
  );
async function openStory() {
  await button("قصصي").click();
  await button("فتح").first().click();
  await page.getByTestId("simple-plan-preview").waitFor();
}
async function writeResponse(marker) {
  await page.getByLabel("راجعت الخطة وملاحظاتها.", { exact: true }).check();
  await button("متابعة لكتابة القصة").click();
  await page.getByTestId("simple-writer").waitFor();
  await button("تجهيز البرومبت").click();
  await page
    .getByRole("status")
    .filter({ hasText: "تم تجهيز البرومبت." })
    .waitFor();
  const loaded = await session();
  const pkg = loaded.planner.packages.at(-1),
    bp = loaded.workflow.blueprints.find(
      (x) => x.revisionId === loaded.workflow.current.blueprintRevisionId,
    );
  assert.equal(pkg.outputSchemaVersion, "writer-response/1.0");
  assert.equal(bp.pagePlan.length, 12);
  const editions = [];
  for (const mode of ["ar-MSA-simple", "ar-EG"]) {
    const view = must(
      await page.evaluate((input) => window.hekayti.simpleLoad(input), {
        projectId,
        mode,
      }),
    ).presentation;
    assert.equal(view.supported, true);
    editions.push({
      mode,
      pages: bp.pagePlan.map((p, i) => {
        const sequences = pkg.plan.beats
          .filter((x) => p.beatIds.includes(x.beatId))
          .map((x) => x.sequence);
        const text = view.events
          .filter((x) => sequences.includes(x.sequence))
          .map((x) => x.action)
          .join(" ");
        return {
          pageNumber: i + 1,
          narration: `${marker} ${text}`,
          dialogue: [],
          altText: "نور وسلمى في الملعب الصغير.",
        };
      }),
    });
  }
  await page
    .getByLabel("راجع البرومبت قبل نسخه، واستخدم الخدمة الخارجية يدويًا.", {
      exact: true,
    })
    .check();
  await button("Gemini").click();
  await page
    .getByRole("status")
    .filter({ hasText: "تم نسخ برومبت Gemini." })
    .waitFor();
  assert.match(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
    /writer-response\/1.0/,
  );
  await button("ChatGPT").click();
  await page
    .getByRole("status")
    .filter({ hasText: "تم نسخ برومبت ChatGPT." })
    .waitFor();
  const raw = page.getByTestId("simple-writer-response");
  const before = await session();
  await raw.fill("{");
  await button("فحص الرد").click();
  await page
    .getByTestId("writer-response-feedback")
    .filter({ hasText: "لا يمكن استيراد الرد" })
    .waitFor();
  assert.equal(await button("استيراد القصة").isDisabled(), true);
  const after = await session();
  assert.deepEqual(after, before);
  await raw.fill(
    JSON.stringify({ schemaVersion: "writer-response/1.0", editions }),
  );
  await button("فحص الرد").click();
  await page
    .getByTestId("writer-response-feedback")
    .filter({ hasText: /جاهز للاستيراد|راجع الملاحظات قبل استيراد الرد/ })
    .waitFor();
  assert.equal(await button("استيراد القصة").isEnabled(), true);
  await button("استيراد القصة").click();
  await page.getByTestId("simple-reader").waitFor();
  await page
    .getByRole("status")
    .filter({ hasText: "تم استيراد القصة بنجاح." })
    .waitFor();
  const saved = await session();
  assert.equal(saved.workflow.current.approvalId, null);
  assert.equal(saved.workflow.drafts.at(-1).editions.length, 2);
  gates.push(
    `writer ${marker}: both manual copy paths, malformed readonly, reversed editions valid import, no approval`,
  );
  return saved.workflow.current.draftId;
}
async function preparePictures() {
  await button("تحضير الصور").click();
  await page.getByTestId("simple-illustrations").waitFor();
  await button("تجهيز خطة الصور الحالية").click();
  await button("تجهيز برومبتات الصور").waitFor({ state: "visible" });
  await button("تجهيز برومبتات الصور").click();
  await page.locator(".visual-summary").first().waitFor();
  return must(
    await page.evaluate(
      (projectId) =>
        window.hekayti.illustrationLoad({ projectId, mode: "ar-EG" }),
      projectId,
    ),
  );
}
try {
  page = await app.firstWindow();
  await page.setViewportSize({ width: 1400, height: 1000 });
  await page
    .getByRole("button", { name: "تجهيز مكتبة الإلهام", exact: true })
    .waitFor();
  assert.deepEqual(
    await page.evaluate(() => [
      document.documentElement.lang,
      document.documentElement.dir,
      localStorage.getItem("hekayti.creatorMode"),
    ]),
    ["ar", "rtl", null],
  );
  assert.equal(
    await page.getByTestId("creator-mode").getAttribute("data-mode"),
    "SIMPLE",
  );
  assert.equal(
    must(await page.evaluate(() => window.hekayti.simpleDefaults())).library
      .total,
    0,
  );
  await shot("01-first-time-empty");
  await button("تجهيز مكتبة الإلهام").click();
  await page.getByTestId("simple-story-form").waitFor();
  assert.equal(
    must(await page.evaluate(() => window.hekayti.simpleDefaults())).library
      .total,
    791,
  );
  await page
    .getByLabel("راجعت التنبيه: مواد المكتبة إلهام مبدئي يحتاج مراجعة.", {
      exact: true,
    })
    .check();
  await page.getByLabel("لغة القصة", { exact: true }).selectOption("ar-EG");
  await page.getByLabel("إنشاء النسختين", { exact: true }).check();
  await page.getByLabel("هدف القصة", { exact: true }).selectOption("CUSTOM");
  await page.getByLabel("هدف مخصص", { exact: true }).fill(fixture.goal);
  await page.getByText("خيارات إضافية", { exact: true }).click();
  await page.getByLabel("العمر الدقيق بالشهور", { exact: true }).fill("42");
  await page.getByLabel("مكان القصة", { exact: true }).fill(fixture.setting);
  await page
    .getByLabel("اشتراطات الكاتب", { exact: true })
    .fill(fixture.constraints);
  await shot("02-exact-arabic-input");
  await button("أنشئ القصة").click();
  await page.getByTestId("simple-plan-preview").waitFor();
  const previewText = await page.getByTestId("simple-plan-preview").innerText();
  assert.ok(!/[A-Za-z]/.test(previewText));
  projectId = must(await page.evaluate(() => window.hekayti.simpleList({})))
    .stories[0].projectId;
  let loaded = await session();
  assert.equal(loaded.workflow.current.blueprintRevisionId, null);
  assert.equal(loaded.planner.currentAcceptanceId, null);
  assert.equal(loaded.planner.packages.length, 0);
  assert.equal(loaded.authoredInput.setting, fixture.setting);
  assert.equal(loaded.authoredInput.customGoal, fixture.goal);
  assert.equal(loaded.authoredInput.constraints, fixture.constraints);
  assert.equal(loaded.presentation.supported, true);
  assert.equal(loaded.presentation.events.length > 0, true);
  await shot("03-arabic-human-preview");
  gates.push(
    "fresh Simple/Arabic/RTL; explicit empty Library791; exact42 authored Arabic persisted; preview no visible English/IDs; no hidden acceptance/package",
  );
  firstDraft = await writeResponse("نسخة أولى.");
  await shot("04-reader-eg-unapproved");
  assert.ok(
    (await page.getByTestId("simple-reader").innerText()).includes(
      "الخدمة كما ذكرها الكاتب",
    ),
  );
  await page.getByRole("button", { name: "فصحى مبسطة", exact: true }).click();
  await page.getByTestId("reader-page").waitFor();
  await shot("05-reader-msa");
  await page
    .getByRole("button", { name: "العربية المصرية", exact: true })
    .click();
  for (let i = 1; i < 12; i++) await button("التالي").click();
  assert.match(await page.getByTestId("reader-page").innerText(), /صفحة 12/);
  await button("عرض القصة كاملة").click();
  assert.equal(await page.getByTestId("reader-page").count(), 12);
  await shot("06-reader-all-pages");
  const aPictures = await preparePictures();
  firstPlan = aPictures.plan.planId;
  assert.equal(aPictures.plan.draftId, firstDraft);
  assert.equal(aPictures.plan.pages.length, 12);
  assert.equal(aPictures.prompts.filter((x) => x.kind === "PAGE").length, 12);
  assert.equal(aPictures.prompts.filter((x) => x.kind === "COVER").length, 1);
  assert.equal(
    aPictures.prompts.filter((x) => x.kind === "CHARACTER_REFERENCE").length,
    aPictures.plan.bible.characters.length,
  );
  assert.equal(aPictures.plan.style.medium, "PAPER_CUT_COLLAGE");
  assert.ok(
    !aPictures.prompts.some((x) =>
      x.arabicSummary.includes("نص الصفحة المعتمد"),
    ),
  );
  await shot("07-character-reference");
  await button("غلاف القصة").click();
  await shot("08-cover-no-text");
  await button("صفحة 12").click();
  assert.match(await page.getByTestId("reader-page").innerText(), /نسخة أولى/);
  await shot("09-page12-image-summary");
  await button("تعديل الأسلوب البصري الجاري").click();
  await page
    .getByLabel(/^الملمس/)
    .fill("قصاصات ورقية واضحة وخفيفة.");
  await button("حفظ").click();
  await page.getByTestId("illustration-stale").waitFor();
  assert.equal(await button("تجهيز برومبتات الصور").isDisabled(), true);
  await shot("10-edited-style-stale");
  await button("عودة").click();
  await button("عودة إلى القصة").click();
  await openStory();
  secondDraft = await writeResponse("نسخة تانية.");
  const bPictures = await preparePictures();
  currentPlan = bPictures.plan.planId;
  assert.equal(bPictures.plan.draftId, secondDraft);
  await page
    .getByLabel(/^نسخ خطة الصور/)
    .selectOption(firstPlan);
  await page.locator(".visual-summary").first().waitFor();
  await button("صفحة 12").click();
  assert.match(await page.getByTestId("reader-page").innerText(), /نسخة أولى/);
  await shot("11-historical-A-exact-source");
  await button("تجهيز خطة الصور الحالية").click();
  await button("تجهيز برومبتات الصور").click();
  await button("صفحة 12").click();
  await page
    .getByTestId("reader-page")
    .filter({ hasText: "نسخة تانية" })
    .waitFor();
  assert.ok(
    !(await page.getByTestId("reader-page").innerText()).includes("نسخة أولى"),
  );
  assert.equal(
    await page.getByTestId("illustration-source-mismatch").count(),
    0,
  );
  await shot("12-historical-to-current-B-source");
  gates.push(
    "both Reader editions/12 pages/all; character refs+cover+12 prompts; edited style stale; historical A/current PREPARE B exact text/edition/heading",
  );
  await button("عودة").click();
  await button("مقارنة نسختين").click();
  await page.locator(".reader-comparison").first().waitFor();
  assert.equal(await page.locator(".reader-comparison").count(), 12);
  await shot("13-two-real-drafts");
  await button("عودة").click();
  await button("تحتاج تعديل").click();
  await page
    .getByLabel("ملاحظات", { exact: true })
    .fill("ملاحظة خيالية: خفف التكرار.");
  await page
    .getByLabel("اقرأ القصة وراجع ملاحظاتها قبل حفظ رأيك.", { exact: true })
    .check();
  await button("حفظ المراجعة").click();
  await page.getByTestId("simple-reader").waitFor();
  loaded = await session();
  assert.equal(loaded.workflow.current.approvalId, null);
  await page.getByTestId("ui-language-en").click();
  assert.equal(await page.evaluate(() => document.documentElement.dir), "ltr");
  const englishSession = await session();
  assert.equal(
    englishSession.workflow.requests.at(-1).primaryLanguageMode,
    "ar-EG",
  );
  await page.getByTestId("creator-mode-switch").click();
  await page
    .getByRole("button", { name: "Story Creator", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Core Data Inspector", exact: true })
      .count(),
    1,
  );
  await shot("14-advanced-preserved");
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  assert.equal(
    await page.getByTestId("creator-mode").getAttribute("data-mode"),
    "ADVANCED",
  );
  assert.equal(
    await page.getByTestId("ui-language-en").getAttribute("aria-pressed"),
    "true",
  );
  await page.getByTestId("creator-mode-switch").click();
  await page.getByTestId("ui-language-ar").click();
  await openStory();
  loaded = await session();
  assert.equal(loaded.authoredInput.constraints, fixture.constraints);
  await app.close();
  app = await launch();
  page = await app.firstWindow();
  assert.equal(
    await page.getByTestId("creator-mode").getAttribute("data-mode"),
    "SIMPLE",
  );
  assert.equal(
    await page.getByTestId("ui-language-ar").getAttribute("aria-pressed"),
    "true",
  );
  gates.push(
    "real retained compare; NEEDS_EDIT no approval; UI/story-language independence; Advanced tools and both preferences persist restart; exact authored reopen",
  );
  await writeFile(
    join(data, "evidence.json"),
    JSON.stringify(
      {
        status: "PASS",
        packaged,
        data,
        projectId,
        firstDraft,
        secondDraft,
        firstPlan,
        currentPlan,
        gates,
        screenshots,
        fixture,
        scope:
          "isolated synthetic prose/operator actions; no provider, images, customer data or literary certification",
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      status: "PASS",
      packaged,
      data,
      gates,
      screenshots: screenshots.length,
    }),
  );
} catch (error) {
  if (page) await shot("failure").catch(() => {});
  await writeFile(
    join(data, "failure.json"),
    JSON.stringify(
      {
        status: "FAIL",
        packaged,
        data,
        projectId,
        gates,
        error: String(error),
        screenshots,
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await app.close();
}
