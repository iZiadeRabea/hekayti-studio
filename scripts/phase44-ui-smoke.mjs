// Isolated real Electron UI/IPC; only deliberately synthetic story/art fixtures.
// Dialog selection is supplied by the harness; all storage/review/layout/export
// still use the actual main-process endpoints and their approval/fit checks.
import { _electron as electron } from "playwright";
import { mkdtemp, writeFile, readFile, unlink } from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
const packaged = process.argv.includes("--packaged");
const resumeData = process.argv
  .find((a) => a.startsWith("--resume-data="))
  ?.slice("--resume-data=".length);
const resumePhotos = process.argv.includes("--resume-photos");
const resumeHistory = process.argv.includes("--resume-history") || resumePhotos;
const resumeSharing =
  process.argv.includes("--resume-sharing") || resumeHistory;
const data = resumeData
  ? resolve(resumeData)
  : await mkdtemp(join(tmpdir(), "hekayti-phase44-ui-"));
assert.ok(
  data
    .toLowerCase()
    .startsWith(join(tmpdir(), "hekayti-phase44-ui-").toLowerCase()),
  "Only isolated synthetic test directories may be resumed",
);
const gates = [];
const gatePush = gates.push.bind(gates);
gates.push = (...items) => {
  console.log("PASS " + items.join("; "));
  return gatePush(...items);
};
const must = (result) => {
  assert.equal(result.ok, true, result.error?.code);
  return result.value;
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
  page = await app.firstWindow();
await page.waitForLoadState("domcontentloaded");
const button = (name) => page.getByRole("button", { name, exact: true });
const call = async (method, input) =>
  must(
    await page.evaluate(({ method, input }) => window.hekayti[method](input), {
      method,
      input,
    }),
  );
const command = async (snapshot, input) =>
  call("studioCommand", {
    projectId: snapshot.book.projectId,
    expectedBook: snapshot.book.recordVersion,
    ...input,
  });
async function settle() {
  await page.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll("button")).some(
        (button) =>
          button.textContent?.trim() === "كتاب جديد" && button.disabled,
      ),
  );
}
async function next() {
  await button("التالي").click();
  await settle();
}
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let j = 0; j < 8; j++)
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function png(width, height) {
  const raw = Buffer.alloc((1 + width * 3) * height);
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 3);
    for (let x = 0; x < width; x++) {
      raw[offset + 1 + x * 3] = 90 + Math.floor((x / width) * 130);
      raw[offset + 2 + x * 3] = 100 + Math.floor((y / height) * 120);
      raw[offset + 3 + x * 3] =
        (Math.floor(x / (width / 8)) + Math.floor(y / (height / 8))) % 2
          ? 180
          : 95;
    }
  }
  const chunk = (type, bytes) => {
    const label = Buffer.from(type),
      length = Buffer.alloc(4),
      crc = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    crc.writeUInt32BE(crc32(Buffer.concat([label, bytes])));
    return Buffer.concat([length, label, bytes, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
const art = join(data, "synthetic-art.png"),
  low = join(data, "synthetic-low-resolution.png");
await writeFile(art, png(2400, 2400));
await writeFile(low, png(96, 96));
const choose = async (path) =>
  app.evaluate(({ dialog }, path) => {
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [path],
    });
  }, path);
try {
  let s, projectId, edition;
  const exports = [];
  const steps = [
    "تولين تشوف طرف حاجة مدورة وناعمة تحت القماشة.",
    "تولين تقرب منها.",
    "تولين ترفع القماشة.",
    "اللعبة تظهر كاملة.",
    "تولين تحضنها.",
    "تولين تهدأ وتنام.",
  ];
  if (!resumeData) {
    assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
    await page.getByTestId("creator-mode").waitFor();
    assert.equal(
      await page.getByTestId("creator-mode").getAttribute("data-mode"),
      "SIMPLE",
    );
    await button("تجهيز مكتبة الإلهام").click();
    await page.getByTestId("book-create-flow").waitFor();
    await page.getByLabel("العمر بالشهور", { exact: true }).fill("7");
    await settle();
    await next();
    await next();
    await page
      .locator(".studio-choice-grid button")
      .filter({ hasText: "نوم" })
      .first()
      .click();
    await next();
    await page
      .locator("textarea")
      .fill(
        "تولين تشوف حاجة ناعمة ومدورة جزء منها تحت القماشة، تقرب، تكشفها، تحضنها وتنام.",
      );
    await next();
    await page.locator("select").selectOption("SLEEP");
    await next();
    await button("أبني المسار بنفسي").click();
    const createdSteps = [
      "تولين تشوف طرف حاجة مدورة وناعمة تحت القماشة.",
      "تولين تقرب منها.",
      "تولين ترفع القماشة.",
      "اللعبة تظهر كاملة.",
      "تولين تحضنها.",
      "تولين تهدأ وتنام.",
    ];
    for (const text of createdSteps) {
      await button("إضافة خطوة").click();
      await page.locator(".studio-path-step textarea").last().fill(text);
    }
    await next();
    await page.locator("select").selectOption("NAMED");
    await page.getByLabel("اسم الشخصية", { exact: true }).fill("تولين");
    await next();
    await page.locator("input").fill("البيت");
    await button("أنشئ القصة").click();
    await page.getByTestId("studio-story").waitFor();
    const listed = await call("simpleList", {
      query: "",
      offset: 0,
      limit: 20,
    });
    projectId = listed.stories[0].projectId;
    s = await call("studioLoad", { projectId });
    assert.equal(s.scenes.length, 6);
    assert.deepEqual(s.book.intents.at(-1).intent.path.steps, steps);
    assert.equal(s.session.presentation.ageMonths, 7);
    gates.push("Arabic staged7month custom6step intent saved");
    await button("جهّز برومبت القصة").click();
    await page.getByLabel("الصق رد الكاتب", { exact: true }).waitFor();
    s = await call("studioLoad", { projectId });
    const response = {
      schemaVersion: "writer-response/1.0",
      editions: [
        {
          mode: "ar-EG",
          pages: [
            {
              pageNumber: 1,
              narration:
                "تولين بصّت على طرف اللعبة الناعم اللي باين من تحت القماشة.",
              dialogue: [],
              altText: "لعبة ناعمة تحت قماشة مألوفة.",
            },
            {
              pageNumber: 2,
              narration: "قربت تولين شوية شوية، والقماشة لسه فوق اللعبة.",
              dialogue: [],
              altText: "تولين تقرب من اللعبة المغطاة جزئيًا.",
            },
            {
              pageNumber: 3,
              narration: "تولين مسكت طرف القماشة ورفعته برفق.",
              dialogue: [],
              altText: "تولين ترفع القماشة عن اللعبة.",
            },
            {
              pageNumber: 4,
              narration: "آه، دي لعبتها الناعمة! دلوقتي بانت كلها.",
              dialogue: [],
              altText: "اللعبة ظاهرة بالكامل بجوار القماشة.",
            },
            {
              pageNumber: 5,
              narration: "تولين حضنت لعبتها، وقربتها منها.",
              dialogue: [],
              altText: "تولين تمسك لعبتها وتحضنها.",
            },
            {
              pageNumber: 6,
              narration:
                "حضن دافي، وعينين بيقفلوا بهدوء. نامت تولين ولعبتها جنبها.",
              dialogue: [],
              altText: "تولين تهدأ وتنام وهي تحتضن لعبتها.",
            },
          ],
        },
      ],
    };
    await page
      .getByLabel("الصق رد الكاتب", { exact: true })
      .fill(JSON.stringify(response));
    await button("استيراد القصة").click();
    await button("تعديل القصة").waitFor();
    s = await call("studioLoad", { projectId });
    assert.ok(s.session.workflow.current.draftId);
    const oldDraft = s.session.workflow.current.draftId;
    await button("تعديل القصة").click();
    await page
      .getByLabel("عنوان القصة", { exact: true })
      .fill("تولين ولعبتها الناعمة");
    await button("حفظ نسخة جديدة").click();
    await settle();
    s = await call("studioLoad", { projectId });
    assert.equal(s.session.workflow.drafts.length, 2);
    assert.notEqual(s.session.workflow.current.draftId, oldDraft);
    await button("اعتماد القصة").click();
    await settle();
    s = await call("studioLoad", { projectId });
    assert.ok(s.session.workflow.current.approvalId);
    gates.push("manualWriter1.0 editnewrevision explicitstoryapproval");
    await button("الصور").click();
    await page.getByTestId("studio-images").waitFor();
    await button("تعديل تعريف الشخصية").first().click();
    await button("حفظ واعتماد تعريف الشخصية").click();
    await settle();
    s = await call("studioLoad", { projectId });
    assert.equal(s.identities[0].approvedProfile, true);
    await button("جهّز برومبت الشخصية").first().click();
    await settle();
    s = await call("studioLoad", { projectId });
    assert.match(s.prompts.at(-1).text, /NO written words/);
    await choose(art);
    await button("استيراد لوحة الشخصية").first().click();
    await page.locator(".studio-image-preview").last().waitFor();
    await button("اعتماد شكل الشخصية").last().click();
    await settle();
    s = await call("studioLoad", { projectId });
    assert.ok(
      s.images.some(
        (i) => i.kind === "CHARACTER_SHEET" && i.status === "APPROVED",
      ),
    );
    gates.push(
      "fictionaldefinition prompt characterSheet importreviewapproval",
    );
    edition = s.session.workflow.drafts.find(
      (d) => d.draftId === s.session.workflow.current.draftId,
    ).editions[0];
    for (const slot of [
      { kind: "COVER" },
      ...edition.pages.map((p) => ({ kind: "PAGE", pageId: p.pageId })),
    ]) {
      s = await command(s, {
        action: "PROMPT",
        kind: slot.kind,
        ...(slot.pageId ? { pageId: slot.pageId } : {}),
      });
      await choose(art);
      s = await call("studioSelectAssets", {
        projectId,
        expectedBook: s.book.recordVersion,
        ...slot,
      });
      s = await command(s, {
        action: "IMAGE_DECISION",
        imageId: s.images.at(-1).imageId,
        choice: "APPROVE",
        notes: "Synthetic operator fixture; not literary/art approval.",
      });
    }
    s = await command(s, {
      action: "AUTO_LAYOUT",
      mode: "ar-EG",
      subtitle: "حكاية هادية",
      brand: "حكايتي",
    });
    assert.equal(s.layout.pages.length, 7);
    assert.equal(s.approved, false);
  } else {
    const listed = await call("simpleList", {
      query: "",
      offset: 0,
      limit: 20,
    });
    projectId = listed.stories.find((story) => story.ageMonths === 7).projectId;
    s = await call("studioLoad", { projectId });
    if (!resumeSharing)
      edition = s.session.workflow.drafts.find(
        (d) => d.draftId === s.session.workflow.current.draftId,
      ).editions[0];
    if (process.argv.includes("--reflow"))
      s = await command(s, {
        action: "AUTO_LAYOUT",
        mode: "ar-EG",
        subtitle: "حكاية هادية",
        brand: "حكايتي",
      });
    gates.push(
      "resumed prior successful native setup from actual persisted synthetic project",
    );
  }
  if (!resumeSharing) {
    // Reopen via the visible saved-book flow so UI state comes only from actual persistence.
    await button("كتبي").click();
    await button("فتح الكتاب").first().click();
    await button("الكتاب").click();
    await page.getByTestId("book-composer").waitFor();
    await page.getByLabel(/^الصفحة/).selectOption("1");
    const narration = page.locator(".book-text-layer.narration").first();
    await narration.click();
    const before = s.layout.pages[1].boxes.find((b) => b.kind === "NARRATION");
    const bounds = await narration.boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds.x + bounds.width / 2 + 8,
      bounds.y + bounds.height / 2 - 8,
      { steps: 5 },
    );
    await page.mouse.up();
    await button("حفظ التصميم").click();
    await settle();
    s = await call("studioLoad", { projectId });
    assert.ok(
      s.layout.pages[1].boxes.some(
        (b) => b.kind === "NARRATION" && (b.x !== before.x || b.y !== before.y),
      ),
    );
    await button("معاينة الكتاب").click();
    await settle();
    const windows = app.windows();
    assert.ok(windows.length >= 2);
    await windows.at(-1).close();
    await button("اعتماد الكتاب").click();
    await settle();
    s = await call("studioLoad", { projectId });
    if (!s.approved) {
      const checked = await call("studioPreview", {
        projectId,
        expectedBook: s.book.recordVersion,
      });
      console.log(
        "APPROVAL_DIAGNOSTIC " +
          JSON.stringify({
            notices: s.notices,
            ui: (await page.locator("body").innerText()).slice(-1600),
            preview: { pages: checked.pages, errors: checked.errors },
          }),
      );
    }
    assert.equal(s.approved, true);
    gates.push(
      "actualart Arabiclivecanvas dragpersist trustedpreview fitapproval",
    );
    const selectedSheet = s.images.find(
      (image) =>
        image.kind === "CHARACTER_SHEET" &&
        image.selected &&
        image.status === "APPROVED",
    );
    assert.ok(selectedSheet);
    const userData = await app.evaluate(({ app }) => app.getPath("userData"));
    const sheetPath = resolve(
      userData,
      "private-books",
      "assets",
      projectId,
      selectedSheet.assetId + ".png",
    );
    assert.ok(
      sheetPath.toLowerCase().startsWith(resolve(data).toLowerCase() + sep),
    );
    assert.ok((await readFile(sheetPath)).length > 0);
    await unlink(sheetPath); // Controlled synthetic missing-file fault; never an owner file.
    const rejected = async (method, input) => {
      const result = await page.evaluate(
        ({ method, input }) => window.hekayti[method](input),
        { method, input },
      );
      assert.equal(result.ok, false, "Missing sheet must block " + method);
      assert.equal(result.error.code, "BOOK_ASSET_MISSING");
    };
    await rejected("studioCommand", {
      projectId,
      expectedBook: s.book.recordVersion,
      action: "PROMPT",
      kind: "PAGE",
      pageId: edition.pages[0].pageId,
    });
    const boundPrompt = s.prompts.find((prompt) => prompt.kind === "PAGE");
    await rejected("studioCommand", {
      projectId,
      expectedBook: s.book.recordVersion,
      action: "COPY_PROMPT",
      promptId: boundPrompt.promptId,
    });
    await rejected("studioCommand", {
      projectId,
      expectedBook: s.book.recordVersion,
      action: "APPROVE_BOOK",
    });
    await rejected("studioExport", {
      projectId,
      expectedBook: s.book.recordVersion,
      kind: "print",
    });
    await choose(art);
    s = await call("studioRelinkAsset", {
      projectId,
      expectedBook: s.book.recordVersion,
      assetId: selectedSheet.assetId,
    });
    assert.ok(s.approved);
    gates.push(
      "missingsyntheticapprovedsheet blocks dependentpreparecopy approval export exactrelinkrestores",
    );
    for (const kind of ["digital", "print"]) {
      const path = join(data, "synthetic-" + kind + ".pdf");
      await app.evaluate(({ dialog }, path) => {
        dialog.showSaveDialog = async () => ({
          canceled: false,
          filePath: path,
        });
      }, path);
      const result = await call("studioExport", {
        projectId,
        expectedBook: s.book.recordVersion,
        kind,
      });
      assert.equal(result.pages, 7);
      assert.ok((await readFile(path)).length > 1000);
      exports.push(result);
    }
    gates.push("digitalPrintPDF actualmain endpoints7pages");
    await page.screenshot({
      path: join(data, "synthetic-composer.png"),
      fullPage: true,
    });
    await app.close();
    app = await launch();
    page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    await button("كتبي").click();
    await button("فتح الكتاب").first().click();
    s = await call("studioLoad", { projectId });
    assert.equal(s.approved, true);
    assert.equal(s.layout.pages.length, 7);
    assert.deepEqual(s.book.intents.at(-1).intent.path.steps, steps);
    gates.push(
      "processrestart persistedintent history assets layout approvals",
    );
    const defaults = await call("simpleDefaults", {});
    const baseInput = {
      agePreset: "UNDER_ONE",
      exactAgeMonths: 7,
      category: "bedtime",
      goalPreset: "SLEEP",
      fictionalName: "تولين",
      primaryLanguageMode: "ar-EG",
      provisionalAcknowledged: true,
      expectedLibrary: defaults.library.recordVersion,
    };
    const premise =
      "تولين تشوف حاجة ناعمة ومدورة تحت القماشة، تكشفها وتحضنها وتنام.";
    const auto = await call("studioCreate", {
      ...baseInput,
      bookIntent: {
        idea: { source: "CUSTOM", text: premise },
        path: { mode: "AUTO", steps: [] },
        length: "AUTO",
      },
    });
    assert.equal(auto.scenes.length, 6);
    const infantChoices = await call("studioDefaults", {
      ageMonths: 7,
      category: "bedtime",
      goalPreset: "SLEEP",
      mode: "ar-EG",
    });
    const chosen = infantChoices.paths.find((p) => p.key === "RECOGNITION");
    const guided = await call("studioCreate", {
      ...baseInput,
      bookIntent: {
        idea: { source: "CUSTOM", text: premise },
        path: { mode: "GUIDED", key: chosen.key, steps: [] },
        length: "AUTO",
      },
    });
    assert.deepEqual(
      guided.scenes.map((p) => p.intent),
      chosen.steps,
    );
    gates.push(
      "native AUTO6steps GUIDED exactselectedpathauthority CUSTOM retained",
    );
  }
  if (!resumePhotos) {
    const originalDefaults = await call("simpleDefaults", {});
    let sharing;
    if (!resumeSharing) {
      sharing = await call("studioCreate", {
        agePreset: "THREE_FIVE",
        exactAgeMonths: 42,
        category: "adventure",
        goalPreset: "SHARING",
        fictionalName: "تولين",
        primaryLanguageMode: "ar-EG",
        provisionalAcknowledged: true,
        expectedLibrary: originalDefaults.library.recordVersion,
        bookIntent: {
          idea: {
            source: "CUSTOM",
            text: "طفلان في مغامرة صغيرة يتبادلان أدوار اللعب حتى يكملا معًا.",
          },
          path: { mode: "AUTO", steps: [] },
          length: "SHORT",
        },
      });
      assert.equal(sharing.identities.length, 2);
      sharing = await command(sharing, { action: "PREPARE_WRITER" });
      const sharingProject = sharing.book.projectId;
      const prose = {
        schemaVersion: "writer-response/1.0",
        editions: [
          {
            mode: "ar-EG",
            pages: sharing.session.workflow.blueprints
              .at(-1)
              .pagePlan.map((p, i) => ({
                pageNumber: i + 1,
                narration:
                  i === 0
                    ? "اللعبة في إيد تولين، وسلمى مستنية دورها."
                    : "تولين وسلمى يكملوا اللعب مع بعض بهدوء.",
                dialogue:
                  i === 0
                    ? sharing.identities.map((actor, index) => ({
                        speaker: actor.name,
                        text:
                          index === 0
                            ? "تحبي تلعبي بعدي؟"
                            : "آه، نستنى العلامة.",
                      }))
                    : [],
                altText: "طفلتان تتبادلان الدور.",
              })),
          },
        ],
      };
      await call("simpleCommand", {
        action: "IMPORT",
        projectId: sharingProject,
        packageId: sharing.session.package.packageId,
        expectedPlanner: sharing.session.planner.recordVersion,
        expectedWorkflow: sharing.session.workflow.recordVersion,
        json: JSON.stringify(prose),
      });
      sharing = await call("studioLoad", { projectId: sharingProject });
      sharing = await command(sharing, {
        action: "APPROVE_STORY",
        draftId: sharing.session.workflow.current.draftId,
      });
      for (const identity of sharing.identities) {
        sharing = await command(sharing, {
          action: "IDENTITY",
          identity: { ...identity, approvedProfile: true },
        });
        sharing = await command(sharing, {
          action: "PROMPT",
          kind: "CHARACTER_REFERENCE",
          characterId: identity.characterId,
        });
        await choose(art);
        sharing = await call("studioSelectAssets", {
          projectId: sharingProject,
          expectedBook: sharing.book.recordVersion,
          kind: "CHARACTER_SHEET",
          characterId: identity.characterId,
        });
        sharing = await command(sharing, {
          action: "IMAGE_DECISION",
          imageId: sharing.images.at(-1).imageId,
          choice: "APPROVE",
        });
      }
      const sharingPages =
        sharing.session.workflow.drafts.at(-1).editions[0].pages;
      for (const slot of [
        { kind: "COVER" },
        ...sharingPages.map((p) => ({ kind: "PAGE", pageId: p.pageId })),
      ]) {
        sharing = await command(sharing, { action: "PROMPT", ...slot });
        await choose(art);
        sharing = await call("studioSelectAssets", {
          projectId: sharingProject,
          expectedBook: sharing.book.recordVersion,
          ...slot,
        });
        sharing = await command(sharing, {
          action: "IMAGE_DECISION",
          imageId: sharing.images.at(-1).imageId,
          choice: "APPROVE",
        });
      }
      sharing = await command(sharing, {
        action: "AUTO_LAYOUT",
        mode: "ar-EG",
      });
    } else {
      const list = await call("simpleList", {
        query: "",
        offset: 0,
        limit: 20,
      });
      sharing = await call("studioLoad", {
        projectId: list.stories.find((story) => story.ageMonths === 42)
          .projectId,
      });
      gates.push(
        "resumed approved synthetic42month setup from actual persistence",
      );
    }
    const sharingProject = sharing.book.projectId;
    if (!resumeHistory) {
      await button("كتبي").click();
      await button("فتح الكتاب").first().click();
      await button("الكتاب").click();
      await page.getByLabel(/^الصفحة/).selectOption("1");
      const bubbles = page.locator(".book-text-layer.dialogue");
      assert.equal(await bubbles.count(), 2);
      const speakers = sharing.layout.pages[1].boxes
        .filter((b) => b.kind === "DIALOGUE")
        .map((b) => b.speakerId);
      const initialBubbleWidth = sharing.layout.pages[1].boxes.find(
        (b) => b.kind === "DIALOGUE",
      ).width;
      for (let i = 0; i < 2; i++) {
        await page
          .getByLabel(/^حدد مكان المتحدث على الصورة/)
          .selectOption(speakers[i]);
        await page.locator(".book-page-canvas").scrollIntoViewIfNeeded();
        const sharingBounds = await page
          .locator(".book-page-canvas")
          .boundingBox();
        await page.mouse.click(
          sharingBounds.x + sharingBounds.width * (i === 0 ? 0.2 : 0.8),
          sharingBounds.y + sharingBounds.height * 0.5,
        );
        await bubbles.nth(i).click();
        await page.getByLabel(/^اتجاه ذيل الفقاعة/).selectOption("ANCHOR");
      }
      await bubbles.first().click();
      const resize = page.getByLabel("تغيير مساحة النص", { exact: true });
      const resizeBounds = await resize.boundingBox();
      await page.mouse.move(
        resizeBounds.x + resizeBounds.width / 2,
        resizeBounds.y + resizeBounds.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        resizeBounds.x + resizeBounds.width / 2 - 15,
        resizeBounds.y + resizeBounds.height / 2 + 5,
        { steps: 5 },
      );
      await page.mouse.up();
      await button("حفظ التصميم").click();
      await settle();
      sharing = await call("studioLoad", { projectId: sharingProject });
      assert.equal(sharing.layout.pages[1].anchors.length, 2);
      assert.deepEqual(
        sharing.layout.pages[1].boxes
          .filter((b) => b.kind === "DIALOGUE")
          .map((b) => b.speakerId),
        speakers,
      );
      assert.notEqual(
        sharing.layout.pages[1].boxes.find((b) => b.kind === "DIALOGUE").width,
        initialBubbleWidth,
      );
      await button("اعتماد الكتاب").click();
      await settle();
      sharing = await call("studioLoad", { projectId: sharingProject });
      assert.ok(sharing.approved);
      const sharingPDF = join(data, "synthetic-two-speakers-print.pdf");
      await app.evaluate(({ dialog }, path) => {
        dialog.showSaveDialog = async () => ({
          canceled: false,
          filePath: path,
        });
      }, sharingPDF);
      exports.push(
        await call("studioExport", {
          projectId: sharingProject,
          expectedBook: sharing.book.recordVersion,
          kind: "print",
        }),
      );
      gates.push(
        "native42month adventure twoexactspeakers UIanchors resize humanapproval printPDF",
      );
    }
    const originalImage = sharing.images.find(
      (i) => i.kind === "PAGE" && i.status === "APPROVED",
    );
    if (!resumeHistory) {
      await choose(low);
      sharing = await call("studioSelectAssets", {
        projectId: sharingProject,
        expectedBook: sharing.book.recordVersion,
        kind: "PAGE",
        pageId: originalImage.pageId,
      });
    }
    await button("كتبي").click();
    await button("فتح الكتاب").first().click();
    await button("الصور").click();
    await button("صفحة 1").click();
    await page.getByText(/منخفضة للمقاس الحالي/).waitFor();
    sharing = await command(sharing, {
      action: "IMAGE_DECISION",
      imageId: sharing.images.at(-1).imageId,
      choice: "REJECT",
    });
    sharing = await command(sharing, {
      action: "IMAGE_DECISION",
      imageId: originalImage.imageId,
      choice: "USE",
    });
    assert.ok(
      sharing.images.find((i) => i.imageId === originalImage.imageId).selected,
    );
    assert.equal(
      sharing.images.find((i) => i.imageId === originalImage.imageId).status,
      "APPROVED",
    );
    sharing = await command(sharing, {
      action: "STYLE",
      description: "قصاصات ورق بألوان جديدة للاختبار الخيالي",
    });
    const staleResult = await page.evaluate(
      (input) => window.hekayti.studioCommand(input),
      {
        projectId: sharingProject,
        expectedBook: sharing.book.recordVersion,
        action: "IMAGE_DECISION",
        imageId: originalImage.imageId,
        choice: "USE",
      },
    );
    assert.equal(staleResult.ok, false);
    assert.equal(
      (await call("simpleDefaults", {})).library.recordVersion,
      originalDefaults.library.recordVersion,
    );
    gates.push(
      "native lowDPIwarning historyUSE retainsapproval staleUSErejected Libraryunchanged",
    );
  }
  // Synthetic files exercise photo mode only after all book/export screenshots.
  if (!resumePhotos) {
    await choose(art);
    s = await call("studioSelectAssets", {
      projectId,
      expectedBook: s.book.recordVersion,
      kind: "PHOTO",
      characterId: s.identities[0].characterId,
    });
    assert.equal(s.identities[0].referenceAssets.length, 1);
    await app.evaluate(
      ({ dialog }, paths) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: paths,
        });
      },
      [low],
    );
    s = await call("studioSelectAssets", {
      projectId,
      expectedBook: s.book.recordVersion,
      kind: "PHOTO",
      characterId: s.identities[0].characterId,
    });
    assert.equal(s.book.classification, "PRIVATE_LOCAL_PROJECT");
    assert.equal(s.identities[0].identityMode, "REAL_PHOTOS");
    assert.equal(s.identities[0].referenceAssets.length, 2);
    assert.equal(s.identities[0].approvedProfile, false);
    assert.equal(s.approved, false);
    s = await command(s, {
      action: "IDENTITY",
      identity: {
        ...s.identities[0],
        approvedProfile: true,
        likeness: "STRONG",
        creatorNotes:
          "Synthetic identity-pack operator test; not a real person.",
      },
    });
    s = await command(s, {
      action: "PROMPT",
      kind: "CHARACTER_REFERENCE",
      characterId: s.identities[0].characterId,
    });
  }
  assert.match(
    s.prompts.at(-1).text,
    /Attach\/use the approved real reference photos/,
  );
  assert.match(s.prompts.at(-1).text, /100% reproduction cannot be guaranteed/);
  assert.match(s.prompts.at(-1).text, /Do not replace with a generic child/);
  const photoAsset = s.identities[0].referenceAssets[0];
  assert.ok(
    await call("studioAssetPreview", { projectId, assetId: photoAsset }),
  );
  const photoUserData = await app.evaluate(({ app }) =>
    app.getPath("userData"),
  );
  const photoPath = resolve(
    photoUserData,
    "private-books",
    "assets",
    projectId,
    photoAsset + ".png",
  );
  assert.ok(
    photoPath.toLowerCase().startsWith(resolve(data).toLowerCase() + sep),
  );
  await unlink(photoPath);
  assert.equal(
    await call("studioAssetPreview", { projectId, assetId: photoAsset }),
    null,
  );
  const missingPhoto = await page.evaluate(
    (input) => window.hekayti.studioCommand(input),
    {
      projectId,
      expectedBook: s.book.recordVersion,
      action: "PROMPT",
      kind: "CHARACTER_REFERENCE",
      characterId: s.identities[0].characterId,
    },
  );
  assert.equal(missingPhoto.ok, false);
  assert.equal(missingPhoto.error.code, "BOOK_ASSET_MISSING");
  await choose(art);
  const relinked = await call("studioRelinkAsset", {
    projectId,
    expectedBook: s.book.recordVersion,
    assetId: photoAsset,
  });
  assert.ok(relinked);
  assert.ok(
    await call("studioAssetPreview", { projectId, assetId: photoAsset }),
  );
  gates.push(
    "synthetic2photos privateidentity manifest explicitreview promptpreview relink noScreenshot",
  );
  await page.getByTestId("creator-mode-switch").click();
  assert.equal(
    await page.getByTestId("creator-mode").getAttribute("data-mode"),
    "ADVANCED",
  );
  gates.push("Advanced retained");
  await writeFile(
    join(data, "receipt.json"),
    JSON.stringify(
      {
        status: "PASS",
        packaged,
        data,
        projectId,
        gates,
        exports,
        syntheticOnly: true,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ status: "PASS", packaged, gates, data }));
} catch (error) {
  console.error("FAIL Phase4.4 isolated UI:", error.stack);
  process.exitCode = 1;
} finally {
  await app.close();
}
