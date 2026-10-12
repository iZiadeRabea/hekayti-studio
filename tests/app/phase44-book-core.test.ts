import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { StoryPlannerService } from "@hekayti/core/planner";
import { SimpleCreatorService } from "@hekayti/core/creator";
import { BookStudioService } from "@hekayti/core/book";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { importLibraryBatch, parseLibraryBatch } from "@hekayti/core/creative";
import { canonicalJson } from "@hekayti/core";
import { bookHtml, printResolution } from "@hekayti/export";
import type {
  BookStudioSnapshot,
  AssetManifest,
} from "@hekayti/contracts/book";
function harness() {
  const repo = new SqliteProjectRepository(":memory:");
  let n = 0;
  const seam = { id: () => `book-${++n}`, now: () => "2026-10-07T12:00:00Z" },
    workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      seam,
    ),
    planner = new StoryPlannerService(
      repo,
      workflow,
      seam,
      "planner-quality/1.1",
    ),
    creator = new SimpleCreatorService(repo, workflow, planner, seam),
    studio = new BookStudioService(
      repo,
      creator,
      workflow,
      planner,
      seam,
      async () => "f".repeat(64),
    );
  importLibraryBatch(
    repo,
    parseLibraryBatch(
      readFileSync("examples/starter-library/starter-library.jsonl", "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(0, 26)
        .join("\n"),
    ),
    0,
    "synthetic",
    "now",
  );
  return { repo, workflow, planner, creator, studio };
}
const steps = [
  "تولين تشوف طرف حاجة مدورة وناعمة تحت القماشة.",
  "تولين تقرب منها.",
  "تولين ترفع القماشة.",
  "اللعبة تظهر كاملة.",
  "تولين تحضنها.",
  "تولين تهدأ وتنام.",
];
const input = {
  agePreset: "UNDER_ONE" as const,
  exactAgeMonths: 7,
  category: "bedtime" as const,
  goalPreset: "SLEEP" as const,
  fictionalName: "تولين",
  primaryLanguageMode: "ar-EG" as const,
  provisionalAcknowledged: true,
  bookIntent: {
    idea: {
      source: "CUSTOM" as const,
      text: "تولين تشوف حاجة ناعمة ومدورة جزء منها تحت القماشة، تقرب، تكشفها، تحضنها وتنام.",
    },
    path: { mode: "CUSTOM" as const, steps },
    length: "AUTO" as const,
  },
};
test("Toleen six-step intent reaches canonical six-page manual writer without Library mutation", async () => {
  const h = harness(),
    version = h.repo.loadLibrary().recordVersion;
  let s = await h.studio.create({ ...input, expectedLibrary: version });
  assert.equal(s.scenes.length, 6);
  assert.deepEqual(
    s.scenes.map((x) => x.intent),
    steps,
  );
  assert.equal(
    s.scenes[0]!.after.find((e) => e.kind === "PROP")!.visibility,
    "PARTIAL",
  );
  assert.equal(
    s.scenes[2]!.after.find((e) => e.name.includes("الشيء"))!.coveredBy,
    null,
  );
  assert.equal(
    s.scenes[4]!.after.find((e) => e.name.includes("الشيء"))!.heldBy,
    s.identities[0]!.characterId,
  );
  s = await h.studio.command({
    action: "PREPARE_WRITER",
    projectId: s.book.projectId,
    expectedBook: s.book.recordVersion,
  });
  assert.equal(s.session.workflow.blueprints.at(-1)!.pagePlan.length, 6);
  assert.match(s.text!, /الحدث الداخلي ليس جملة نهائية/);
  assert.equal(h.repo.loadLibrary().recordVersion, version);
  assert.ok(s.session.package);
  const old = canonicalJson(s.session.planner.plans);
  await h.studio.command({
    action: "EDIT_PATH",
    projectId: s.book.projectId,
    expectedBook: s.book.recordVersion,
    intent: {
      ...input.bookIntent,
      path: {
        mode: "CUSTOM",
        steps: [...steps.slice(0, 5), "تولين تستقر وتنام بهدوء."],
      },
    },
  });
  assert.equal(
    canonicalJson(h.repo.loadPlanner(s.book.projectId)!.plans.slice(0, 1)),
    old,
  );
  h.repo.close();
});
test("freeform intent stays exact and age-ineligible path fails before any saved project", async () => {
  const h = harness();
  const idea = "تولين تتابع ظلًا ناعمًا ويتغير الضوء جنبها.";
  const s = await h.studio.create({
    ...input,
    expectedLibrary: h.repo.loadLibrary().recordVersion,
    bookIntent: {
      idea: { source: "CUSTOM", text: idea },
      path: {
        mode: "CUSTOM",
        steps: ["تولين تلحظ الظل.", "الضوء يتغير.", "تولين تهدأ."],
      },
      length: "AUTO",
    },
  });
  assert.equal(s.book.intents[0]!.intent.idea.text, idea);
  assert.ok(s.scenes.some((x) => x.reviewRequired));
  const count = h.repo.listProjects().length;
  await assert.rejects(
    h.studio.create({
      ...input,
      expectedLibrary: h.repo.loadLibrary().recordVersion,
      bookIntent: {
        ...input.bookIntent,
        path: { mode: "GUIDED", key: "ADVENTURE", steps: [] },
      },
    }),
  );
  assert.equal(h.repo.listProjects().length, count);
  h.repo.close();
});
test("private synthetic-photo identity, image locks, editable Arabic book and scoped staleness integrate", async () => {
  const h = harness();
  let s = await h.studio.create({
    ...input,
    expectedLibrary: h.repo.loadLibrary().recordVersion,
  });
  const run = async (command: Record<string, unknown>) => {
    s = await h.studio.command({
      ...command,
      projectId: s.book.projectId,
      expectedBook: s.book.recordVersion,
    } as never);
    return s;
  };
  await run({ action: "PREPARE_WRITER" });
  const pkg = s.session.package!;
  const response = {
    schemaVersion: "writer-response/1.0",
    editions: [
      {
        mode: "ar-EG",
        pages: steps.map((n, i) => ({
          pageNumber: i + 1,
          narration: n,
          dialogue: i === 0 ? [{ speaker: "تولين", text: "آه!" }] : [],
          altText: n,
        })),
      },
    ],
  };
  await h.creator.command({
    action: "IMPORT",
    projectId: s.book.projectId,
    packageId: pkg.packageId,
    expectedPlanner: s.session.planner.recordVersion,
    expectedWorkflow: s.session.workflow.recordVersion,
    json: JSON.stringify(response),
  });
  s = h.studio.load(s.book.projectId);
  await run({
    action: "APPROVE_STORY",
    draftId: s.session.workflow.current.draftId,
  });
  let assetNumber = 0;
  const asset = (
    purpose: AssetManifest["purpose"],
    privacy: AssetManifest["classification"] = "PUBLIC_SYNTHETIC",
  ): AssetManifest => ({
    assetId: `synthetic-${++assetNumber}`,
    projectId: s.book.projectId,
    sha256: "a".repeat(64),
    mime: "image/png",
    bytes: 100,
    width: 2400,
    height: 2400,
    classification: privacy,
    purpose,
    createdAt: "now",
  });
  s = await h.studio.addSelectedAssets(
    {
      projectId: s.book.projectId,
      expectedBook: s.book.recordVersion,
      kind: "PHOTO",
      characterId: s.identities[0]!.characterId,
    },
    [asset("PHOTO", "PRIVATE_LOCAL_PROJECT")],
  );
  assert.equal(s.book.classification, "PRIVATE_LOCAL_PROJECT");
  assert.equal(s.identities[0]!.identityMode, "REAL_PHOTOS");
  assert.equal(s.identities[0]!.referenceAssets.length, 1);
  assert.equal(s.identities[0]!.approvedProfile, false);
  await run({
    action: "IDENTITY",
    identity: { ...s.identities[0]!, approvedProfile: true },
  });
  await run({
    action: "PROMPT",
    kind: "CHARACTER_REFERENCE",
    characterId: s.identities[0]!.characterId,
  });
  assert.match(s.text!, /IDENTITY AUTHORITY/);
  assert.match(s.text!, /not replace with a generic child/i);
  assert.match(s.text!, /not transferred automatically/i);
  assert.match(s.text!, /cannot be guaranteed/i);
  s = await h.studio.addSelectedAssets(
    {
      projectId: s.book.projectId,
      expectedBook: s.book.recordVersion,
      kind: "CHARACTER_SHEET",
      characterId: s.identities[0]!.characterId,
    },
    [asset("CHARACTER_SHEET", "PRIVATE_LOCAL_PROJECT")],
  );
  await run({
    action: "IMAGE_DECISION",
    imageId: s.images.at(-1)!.imageId,
    choice: "APPROVE",
  });
  await run({
    action: "PROMPT",
    kind: "PAGE",
    pageId: s.session.workflow.drafts.at(-1)!.editions[0]!.pages[2]!.pageId,
  });
  assert.match(s.text!, /Character Sheet/);
  // Retain the historical beat ledger, but an authored lifting event alone
  // must not instruct a fully uncovered end-state for the current page.
  assert.match(s.book.intents[0]!.scenes[2]!.after.find(e=>e.name.includes("القماشة"))!.state, /مرفوعة بعيدًا/);
  assert.match(s.text!, /Required current-page state: تولين ترفع القماشة/);
  assert.match(s.text!, /Declared visibility: UNKNOWN/);
  assert.match(s.text!, /HUMAN REVIEW REQUIRED/);
  assert.doesNotMatch(s.text!, /identityRevision|referenceAssets|Exact approved bindings/);
  assert.match(s.text!, /No reset of cloth coverage/);
  s = await h.studio.addSelectedAssets(
    {
      projectId: s.book.projectId,
      expectedBook: s.book.recordVersion,
      kind: "COVER",
    },
    [asset("COVER", "PRIVATE_LOCAL_PROJECT")],
  );
  await run({
    action: "IMAGE_DECISION",
    imageId: s.images.at(-1)!.imageId,
    choice: "APPROVE",
  });
  for (const page of s.session.workflow.drafts.at(-1)!.editions[0]!.pages) {
    s = await h.studio.addSelectedAssets(
      {
        projectId: s.book.projectId,
        expectedBook: s.book.recordVersion,
        kind: "PAGE",
        pageId: page.pageId,
      },
      [asset("PAGE", "PRIVATE_LOCAL_PROJECT")],
    );
    await run({
      action: "IMAGE_DECISION",
      imageId: s.images.at(-1)!.imageId,
      choice: "APPROVE",
    });
  }
  await run({ action: "AUTO_LAYOUT", mode: "ar-EG" });
  assert.equal(s.layout!.pages.length, 7);
  const bubble = s.layout!.pages[1]!.boxes.find((b) => b.kind === "DIALOGUE")!;
  assert.equal(bubble.speakerId, s.identities[0]!.characterId);
  for (const settings of [
    s.layout!.settings,
    {
      ...s.layout!.settings,
      preset: "CUSTOM" as const,
      heightMm: 90,
      safeMm: 5,
    },
  ]) {
    const proof = h.studio.autoLayout(s, "ar-EG", settings);
    for (const page of proof.pages.slice(1)) {
      const number = page.boxes.find((b) => b.kind === "PAGE_NUMBER")!;
      assert.equal(number.fontPt, 14);
      assert.ok(number.height * settings.heightMm >= 11 - 1e-8);
      assert.ok(
        number.y + number.height <= 1 - settings.safeMm / settings.heightMm,
      );
      assert.ok(
        page.boxes
          .filter((b) => b.kind !== "PAGE_NUMBER")
          .every((b) => b.y + b.height <= number.y - 0.01),
      );
    }
  }
  const branded = h.studio.autoLayout(
      s,
      "ar-EG",
      s.layout!.settings,
      "حكاية هادية",
      "حكايتي",
    ),
    coverBoxes = branded.pages[0]!.boxes,
    brand = coverBoxes.find((b) => b.kind === "BRAND")!;
  assert.equal(brand.text, "حكايتي");
  assert.equal(brand.fontPt, 26);
  assert.ok(brand.height * branded.settings.heightMm >= 28 - 1e-8);
  assert.ok(
    coverBoxes.every(
      (b) =>
        b.y + b.height <=
        1 - branded.settings.safeMm / branded.settings.heightMm,
    ),
  );
  assert.ok(
    coverBoxes
      .filter((b) => b.kind !== "BRAND")
      .every((b) => b.y + b.height <= brand.y),
  );
  const html = bookHtml(
    s.layout!,
    "print",
    { arabic: "YQ==", latin: "Yg==" },
    Object.fromEntries(
      s.layout!.pages.map((p) => [p.imageId, "data:image/png;base64,YQ=="]),
    ),
  );
  assert.match(html, /dir="rtl"/);
  assert.match(html, /206mm/);
  assert.match(html, /class="book-box BUBBLE CLOUD DIALOGUE"/);
  assert.doesNotMatch(html, /RevisionHash|technical metadata/);
  assert.equal(
    printResolution({ width: 2400, height: 2400 }, s.layout!.settings).low,
    false,
  );
  assert.equal(
    printResolution({ width: 120, height: 120 }, s.layout!.settings).low,
    true,
  );
  const anchoredLayout=structuredClone(s.layout!);
  for(const page of anchoredLayout.pages)for(const box of page.boxes.filter(b=>b.kind==="DIALOGUE")){page.anchors.push({speakerId:box.speakerId!,x:.8,y:.7});box.tail="ANCHOR";}
  await run({action:"SAVE_LAYOUT",layout:anchoredLayout});
  await run({ action: "APPROVE_BOOK" });
  assert.ok(s.approved);
  await h.studio.exportModel(s.book.projectId, s.book.recordVersion);
  assert.throws(
    () =>
      h.repo.saveBook(
        {
          ...s.book,
          approvals: [
            ...s.book.approvals,
            {
              ...s.book.approvals.at(-1)!,
              approvalId: "forged-approval",
              contentHash: "0".repeat(64),
            },
          ],
        },
        s.book.recordVersion,
      ),
    /approval differs/,
  );
  const forged = structuredClone(s.layout!);
  forged.pages[1]!.boxes.find((b) => b.kind === "DIALOGUE")!.speakerId =
    "foreign-actor";
  await assert.rejects(
    run({ action: "SAVE_LAYOUT", layout: forged }),
    /exact text/,
  );
  const old = s.session.workflow.drafts.at(-1)!,
    pages = old.editions[0]!.pages.map((p, i) => ({
      pageNumber: i + 1,
      narration: p.narration + "!",
      dialogue: p.dialogue,
      altText: p.altText,
    }));
  await run({
    action: "EDIT_STORY",
    draftId: old.draftId,
    title: "تولين والقماشة",
    mode: "ar-EG",
    pages,
  });
  assert.equal(s.session.workflow.drafts.length, 2);
  assert.equal(
    h.creator.reader(s.book.projectId, undefined, "ar-EG").title,
    "تولين والقماشة",
  );
  assert.ok(s.images.filter((i) => i.kind === "PAGE").every((i) => !i.stale));
  assert.equal(s.approved, false);
  await assert.rejects(
    h.studio.exportModel(s.book.projectId, s.book.recordVersion),
  );
  await assert.rejects(
    run({ action: "APPROVE_STORY", draftId: old.draftId }),
    /المسودة الحالية/,
  );
  const current = s.session.workflow.drafts.at(-1)!;
  pages[2]!.narration = "تولين تسيب القماشة مكانها.";
  await run({
    action: "EDIT_STORY",
    draftId: current.draftId,
    title: "تولين والقماشة",
    mode: "ar-EG",
    pages,
  });
  assert.equal(
    s.images.find((i) => i.kind === "PAGE" && i.pageId === pagesToId(s, 1))!
      .stale,
    false,
  );
  assert.ok(s.images.filter((i) => i.kind === "PAGE").some((i) => i.stale));
  assert.equal(
    s.scenes[2]!.after.find((e) => e.kind === "PROP")!.visibility,
    "UNKNOWN",
  );
  assert.throws(() =>
    h.repo.saveBook(
      { ...s.book, classification: "PUBLIC_SYNTHETIC" },
      s.book.recordVersion,
    ),
  );
  assert.equal(h.repo.loadLibrary().recordVersion, 1);
  h.repo.close();
});
function pagesToId(s: BookStudioSnapshot, n: number) {
  return s.session.workflow.drafts.at(-1)!.editions[0]!.pages[n - 1]!.pageId;
}
test("preschool sharing keeps the actual prop ledger and two speakers bind distinct editable export bubbles", async () => {
  const h = harness();
  let s = await h.studio.create({
    ...input,
    agePreset: "THREE_FIVE",
    exactAgeMonths: 42,
    category: "adventure",
    goalPreset: "SHARING",
    expectedLibrary: h.repo.loadLibrary().recordVersion,
    bookIntent: {
      idea: {
        source: "CUSTOM",
        text: "طفلان في مغامرة صغيرة يتبادلان أدوار اللعب حتى يكملا معًا.",
      },
      path: { mode: "AUTO", steps: [] },
      length: "SHORT",
    },
  });
  assert.equal(s.identities.length, 2);
  assert.ok(s.scenes[0]!.before.some((e) => e.kind === "PROP"));
  for (let i = 1; i < s.scenes.length; i++)
    assert.deepEqual(s.scenes[i]!.before, s.scenes[i - 1]!.after);
  assert.ok(
    s.scenes.every(
      (scene) => !/\b(?:holds|waits|rolling|child)\b/.test(scene.intent),
    ),
  );
  const run = async (command: Record<string, unknown>) =>
    (s = await h.studio.command({
      ...command,
      projectId: s.book.projectId,
      expectedBook: s.book.recordVersion,
    } as never));
  await run({ action: "PREPARE_WRITER" });
  const pkg = s.session.package!,
    bp = s.session.workflow.blueprints.at(-1)!,
    names = s.identities.map((i) => i.name);
  const response = {
    schemaVersion: "writer-response/1.0",
    editions: [
      {
        mode: "ar-EG",
        pages: bp.pagePlan.map((p, i) => ({
          pageNumber: i + 1,
          narration:
            i === 0
              ? "اللعبة في إيد تولين، وسلمى مستنية دورها."
              : "تولين وسلمى يكملوا اللعب مع بعض بهدوء.",
          dialogue:
            i === 0
              ? [
                  { speaker: names[0], text: "تحبي تلعبي بعدي؟" },
                  { speaker: names[1], text: "آه، نستنى العلامة." },
                ]
              : [],
          altText: "طفلتان تلعبان وتتبادلان الدور.",
        })),
      },
    ],
  };
  await h.creator.command({
    action: "IMPORT",
    projectId: s.book.projectId,
    packageId: pkg.packageId,
    expectedPlanner: s.session.planner.recordVersion,
    expectedWorkflow: s.session.workflow.recordVersion,
    json: JSON.stringify(response),
  });
  s = h.studio.load(s.book.projectId);
  await run({
    action: "APPROVE_STORY",
    draftId: s.session.workflow.current.draftId,
  });
  let n = 0;
  const asset = (purpose: AssetManifest["purpose"]): AssetManifest => ({
    assetId: `sharing-image-${++n}`,
    projectId: s.book.projectId,
    sha256: "a".repeat(64),
    mime: "image/png",
    bytes: 100,
    width: 2400,
    height: 2400,
    classification: "PUBLIC_SYNTHETIC",
    purpose,
    createdAt: "now",
  });
  for (const identity of s.identities) {
    await run({
      action: "IDENTITY",
      identity: { ...identity, approvedProfile: true },
    });
    s = await h.studio.addSelectedAssets(
      {
        projectId: s.book.projectId,
        expectedBook: s.book.recordVersion,
        kind: "CHARACTER_SHEET",
        characterId: identity.characterId,
      },
      [asset("CHARACTER_SHEET")],
    );
    await run({
      action: "IMAGE_DECISION",
      imageId: s.images.at(-1)!.imageId,
      choice: "APPROVE",
    });
  }
  s = await h.studio.addSelectedAssets(
    {
      projectId: s.book.projectId,
      expectedBook: s.book.recordVersion,
      kind: "COVER",
    },
    [asset("COVER")],
  );
  await run({
    action: "IMAGE_DECISION",
    imageId: s.images.at(-1)!.imageId,
    choice: "APPROVE",
  });
  for (const page of s.session.workflow.drafts.at(-1)!.editions[0]!.pages) {
    s = await h.studio.addSelectedAssets(
      {
        projectId: s.book.projectId,
        expectedBook: s.book.recordVersion,
        kind: "PAGE",
        pageId: page.pageId,
      },
      [asset("PAGE")],
    );
    await run({
      action: "IMAGE_DECISION",
      imageId: s.images.at(-1)!.imageId,
      choice: "APPROVE",
    });
  }
  await run({ action: "AUTO_LAYOUT", mode: "ar-EG" });
  const layout = structuredClone(s.layout!),
    page = layout.pages[1]!,
    bubbles = page.boxes.filter((b) => b.kind === "DIALOGUE");
  assert.equal(bubbles.length, 2);
  assert.notEqual(bubbles[0]!.speakerId, bubbles[1]!.speakerId);
  page.anchors = [
    { speakerId: bubbles[0]!.speakerId!, x: 0.2, y: 0.5 },
    { speakerId: bubbles[1]!.speakerId!, x: 0.8, y: 0.5 },
  ];
  bubbles.forEach((b) => (b.tail = "ANCHOR"));
  await run({ action: "SAVE_LAYOUT", layout });
  const html = bookHtml(
    s.layout!,
    "digital",
    { arabic: "YQ==", latin: "Yg==" },
    Object.fromEntries(
      s.layout!.pages.map((p) => [p.imageId, "data:image/png;base64,YQ=="]),
    ),
  );
  assert.match(html, /200mm/);
  assert.equal((html.match(/class="bubble-tail"/g) ?? []).length, 2);
  assert.match(html, /تحبي تلعبي/);
  assert.match(html, /آه، نستنى/);
  await run({ action: "APPROVE_BOOK" });
  assert.ok(s.approved);
  assert.equal(h.repo.loadLibrary().recordVersion, 1);
  h.repo.close();
});
test("unknown automatic premise is retained instead of silently reusing an unrelated rolling or sharing story", async () => {
  const h = harness(),
    idea = "تولين تتابع ظل الشباك على الحائط وتتخيل أنه ورقة تتحرك.";
  const s = await h.studio.create({
    ...input,
    agePreset: "THREE_FIVE",
    exactAgeMonths: 42,
    category: "everyday-life",
    goalPreset: "CUSTOM",
    customGoal: "تلاحظ تغير الضوء",
    expectedLibrary: h.repo.loadLibrary().recordVersion,
    bookIntent: {
      idea: { source: "CUSTOM", text: idea },
      path: { mode: "AUTO", steps: [] },
      length: "AUTO",
    },
  });
  assert.ok(s.scenes.every((scene) => scene.intent.includes(idea)));
  assert.ok(s.scenes.every((scene) => scene.reviewRequired));
  assert.equal(s.book.intents[0]!.intent.idea.text, idea);
  assert.ok(
    s.scenes.every((scene) => scene.after.every((e) => e.kind !== "PROP")),
  );
  h.repo.close();
});
