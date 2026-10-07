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
const data = await mkdtemp(join(tmpdir(), "hekayti-phase44-ui-"));
const gates = [];
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
  const row = Buffer.alloc(1 + width * 3);
  for (let i = 0; i < width; i++) {
    row[1 + i * 3] = 218;
    row[2 + i * 3] = 231;
    row[3 + i * 3] = 195;
  }
  const raw = Buffer.alloc(row.length * height);
  for (let y = 0; y < height; y++) row.copy(raw, y * row.length);
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
  const steps = [
    "تولين تشوف طرف حاجة مدورة وناعمة تحت القماشة.",
    "تولين تقرب منها.",
    "تولين ترفع القماشة.",
    "اللعبة تظهر كاملة.",
    "تولين تحضنها.",
    "تولين تهدأ وتنام.",
  ];
  for (const text of steps) {
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
  let listed = await call("simpleList", { query: "", offset: 0, limit: 20 }),
    projectId = listed.stories[0].projectId,
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
  gates.push("fictionaldefinition prompt characterSheet importreviewapproval");
  const edition = s.session.workflow.drafts.find(
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
  // Reopen via the visible saved-book flow so UI state comes only from actual persistence.
  await button("كتبي").click();
  await button("فتح الكتاب").first().click();
  await button("الكتاب").click();
  await page.getByTestId("book-composer").waitFor();
  await page.getByLabel("الصفحة", { exact: true }).selectOption("1");
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
  const exports = [];
  for (const kind of ["digital", "print"]) {
    const path = join(data, "synthetic-" + kind + ".pdf");
    await app.evaluate(({ dialog }, path) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath: path });
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
  gates.push("processrestart persistedintent history assets layout approvals");
  // Synthetic files exercise photo mode only after all book/export screenshots.
  await app.evaluate(
    ({ dialog }, paths) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: paths,
      });
    },
    [art, low],
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
      creatorNotes: "Synthetic identity-pack operator test; not a real person.",
    },
  });
  s = await command(s, {
    action: "PROMPT",
    kind: "CHARACTER_REFERENCE",
    characterId: s.identities[0].characterId,
  });
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
  await choose(art);
  const relinked = await call("studioRelinkAsset", {
    projectId,
    expectedBook: s.book.recordVersion,
    assetId: photoAsset,
  });
  assert.ok(relinked);
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
