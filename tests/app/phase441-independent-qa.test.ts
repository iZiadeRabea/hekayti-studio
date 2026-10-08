import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BookStudioService,
  imageState,
  visualActionSignature,
  deriveVisualIntent,
  planComposition,
  layoutGeometryIssues,
  validateBookAppend,
  validateBookSources,
} from "@hekayti/core/book";
import type {
  BookStudioSnapshot,
  ScenePage,
  BookLayout,
  AssetManifest,
  BookImage,
} from "@hekayti/contracts/book";
import { studioPrerequisites } from "../../apps/desktop/renderer/src/studio-recovery";
import { bookPageMarkup } from "@hekayti/export/book";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { StoryPlannerService } from "@hekayti/core/planner";
import { SimpleCreatorService } from "@hekayti/core/creator";
import { StoryLibraryService } from "@hekayti/core/library";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { canonicalJson, contentHash } from "@hekayti/core";
import { mkdtempSync, rmSync, rmdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { DatabaseSync } from "node:sqlite";

const settings = {
  preset: "SQUARE" as const,
  widthMm: 200,
  heightMm: 200,
  safeMm: 12,
  gutterMm: 0,
  bleedMm: 3,
  pageNumbers: true,
};
const page = (
  narration: string,
  dialogue: { speakerId: string; text: string }[] = [],
) => ({ pageId: "page-exact", narration, dialogue, altText: "" });
const scene: ScenePage = {
  pageNumber: 1,
  beatId: "beat",
  creatorStep: 0,
  intent: "قراءة هادئة",
  action: "حدث عام",
  before: [],
  after: [],
  reviewRequired: false,
};

function imageFixture(
  before: ReturnType<typeof page>,
  after: ReturnType<typeof page>,
) {
  const image = {
    imageId: "art",
    slot: "page:page-exact",
    kind: "PAGE",
    pageId: "page-exact",
    assetId: "asset",
    binding: {
      draftId: "old-draft",
      storyRevision: "story",
      styleRevision: "style",
      identityRevisions: [],
      sheetVersions: [],
    },
    createdAt: "now",
  };
  const book = {
    images: [image],
    decisions: [{ decisionId: "review", imageId: "art", choice: "APPROVE" }],
    identities: [],
    styles: [{ revisionId: "style" }],
  };
  const workflow = {
    current: { draftId: "new-draft" },
    drafts: [
      { draftId: "old-draft", editions: [{ mode: "ar-EG", pages: [before] }] },
      { draftId: "new-draft", editions: [{ mode: "ar-EG", pages: [after] }] },
    ],
  };
  return imageState(
    book as never,
    workflow as never,
    { currentPlanRevisionId: "story" } as never,
    image as never,
  );
}

test("independent: approved page art becomes stale when the physical actor changes", () => {
  assert.equal(
    imageFixture(page("نور حط الكتاب."), page("رامي حط الكتاب.")).stale,
    true,
  );
});
test("independent: approved page art becomes stale when the physical destination changes", () => {
  assert.equal(
    imageFixture(
      page("نور حط الكتاب فوق السرير."),
      page("نور حط الكتاب تحت السرير."),
    ).stale,
    true,
  );
});
test("independent: canonical dialogue physical changes cannot retain old approved page art", () => {
  const before = page("نور فتح الكتاب.", [
    { speakerId: "noor", text: "أنا حطيت الدبدوب على السرير." },
  ]);
  const after = page("نور فتح الكتاب.", [
    { speakerId: "noor", text: "أنا حطيت الدبدوب تحت السرير." },
  ]);
  assert.equal(imageFixture(before, after).stale, true);
});
test("independent: a recognized action cannot hide a changed unknown action in the same sentence", () => {
  assert.equal(
    imageFixture(
      page("نور يمسك الكتاب ويربط الشريط."),
      page("نور يمسك الكتاب ويفك الشريط."),
    ).stale,
    true,
  );
});
test("independent: mama is a character name rather than a negation word", () => {
  const visual = deriveVisualIntent(
    page("نور بيقلب صفحة الكتاب مع ماما بهدوء."),
    1,
    "draft",
    "story",
    scene,
  );
  assert.equal(visual.reviewRequired, false);
  assert.match(visual.focus, /اليد والكتاب/);
});
test("independent: punctuation and descriptive reflow preserve compatible art", () => {
  const before = page("نور يمسك الكتاب.");
  const after = page("نور يمسك الكتاب! بهدوء وبراحة وسط الضوء الناعم.");
  assert.equal(visualActionSignature(before), visualActionSignature(after));
  assert.equal(imageFixture(before, after).status, "APPROVED");
});
test("independent: negated and unknown physical narration cannot be masked by old alt text", () => {
  const before = { ...page("نور يربط الشريط."), altText: "نور يمسك الكتاب" };
  const after = { ...page("نور يفك الشريط."), altText: before.altText };
  assert.equal(imageFixture(before, after).stale, true);
  const negative = deriveVisualIntent(
    page("نور لم يقلب الكتاب."),
    1,
    "draft",
    "story",
    scene,
  );
  assert.equal(negative.reviewRequired, true);
  assert.doesNotMatch(negative.focus, /اليد والكتاب/);
});

function composedFixture() {
  const source = page("نور يمسك الكتاب.");
  const visual = deriveVisualIntent(source, 1, "draft", "story", scene);
  const saved = planComposition({
    page: source,
    visual,
    settings,
    revisionId: "cp",
    mode: "ar-EG",
    createdAt: "now",
  });
  const snapshot = {
    mode: "ar-EG",
    scenes: [scene],
    book: {
      projectId: "synthetic-project",
      recordVersion: 0,
      images: [],
      decisions: [],
      compositionPlans: [saved],
    },
    session: {
      workflow: {
        recordVersion: 0,
        current: { draftId: "draft" },
        drafts: [
          { draftId: "draft", editions: [{ mode: "ar-EG", pages: [source] }] },
        ],
      },
      planner: { recordVersion: 0, currentPlanRevisionId: "story" },
    },
  };
  const studio = new BookStudioService(
    {
      loadWorkflow: () => snapshot.session.workflow,
      loadPlanner: () => snapshot.session.planner,
      saveBook: (next: typeof snapshot.book) => {
        snapshot.book = next;
      },
    } as never,
    null as never,
    null as never,
    null as never,
    { id: () => "new-cp", now: () => "now" },
  );
  studio.load = () => snapshot as never;
  // Exercise the exact shared composition routine used by PLAN_PAGE, PROMPT and AUTO_LAYOUT.
  const compose = () =>
    (
      studio as unknown as {
        composePage(
          s: BookStudioSnapshot,
          pageId: string,
          settings: typeof saved.settings,
        ): typeof saved;
      }
    ).composePage(snapshot as never, source.pageId, settings);
  const replan = async () => {
    const next = await studio.command({
      projectId: snapshot.book.projectId,
      expectedBook: 0,
      action: "PLAN_PAGE",
      mode: "ar-EG",
      pageId: source.pageId,
      settings,
    });
    return next.book.compositionPlans!.at(-1)!;
  };
  return { saved, compose, replan };
}
test("independent: saved creator framing and composition direction survive prompt preparation", () => {
  const { saved, compose } = composedFixture();
  saved.visual.cameraFraming = "لقطة مختلفة محفوظة من صاحب الكتاب";
  saved.visual.compositionHint = "الكتاب يمين المشهد ومساحة السرد يساره";
  const next = compose();
  assert.equal(next.visual.cameraFraming, saved.visual.cameraFraming);
  assert.equal(next.visual.compositionHint, saved.visual.compositionHint);
});
test("independent: valid manual text placement survives prompt preparation", () => {
  const { saved, compose } = composedFixture();
  saved.regions[0]!.rect = { x: 0.15, y: 0.65, width: 0.64, height: 0.15 };
  assert.deepEqual(compose().regions, saved.regions);
});
test("independent: explicit rearrangement must respect newly protected important art", async () => {
  const { saved, replan } = composedFixture();
  saved.protectedRegions = [{ ...saved.regions[0]!.rect }];
  const next = await replan();
  const layout = {
    pageId: next.pageId,
    pageNumber: 1,
    imageId: "art",
    anchors: next.anchors,
    protectedRegions: next.protectedRegions,
    boxes: next.regions.map((r, i) => ({
      boxId: `b${i}`,
      kind: r.kind,
      sourceIndex: r.sourceIndex,
      ...r.rect,
      fontPt: r.fontPt,
      style: "PAPER" as const,
      tail: "NONE" as const,
      text: "نص",
    })),
  };
  assert.deepEqual(layoutGeometryIssues(layout), []);
});
test("independent: immutable optional composition history cannot be modified", () => {
  const { saved } = composedFixture();
  const book = {
    intents: [],
    assets: [],
    identities: [],
    styles: [],
    prompts: [],
    images: [],
    decisions: [],
    layouts: [],
    approvals: [],
    ratings: [],
    storyTitles: [],
    compositionPlans: [saved],
  };
  assert.throws(
    () =>
      validateBookAppend(
        book as never,
        {
          ...book,
          compositionPlans: [{ ...saved, notes: "changed" }],
        } as never,
      ),
    (e: any) => e.code === "BOOK_IMMUTABLE",
  );
});
test("independent: three character prerequisites keep canonical identity/sheet isolation", () => {
  const identities = ["a", "b", "c"].map((characterId) => ({
    characterId,
    name: characterId,
    approvedProfile: characterId !== "b",
  }));
  const s = {
    identities,
    images: [
      {
        characterId: "a",
        kind: "CHARACTER_SHEET",
        selected: true,
        status: "APPROVED",
        stale: false,
      },
      {
        characterId: "c",
        kind: "CHARACTER_SHEET",
        selected: true,
        status: "APPROVED",
        stale: false,
      },
    ],
    mode: "ar-EG",
    session: {
      workflow: {
        current: { approvalId: "approved", draftId: null },
        drafts: [],
      },
    },
  };
  const issues = studioPrerequisites(s as never).filter(
    (q) => q.target?.characterId,
  );
  assert.deepEqual(
    issues.map((q) => [q.target!.characterId, q.target!.control]),
    [
      ["b", "identity"],
      ["b", "sheet"],
    ],
  );
});
test("independent: cloud tail bases overlap bubble bounds and tips retain exact speaker anchors in four directions", () => {
  const box = {
    boxId: "dialogue-exact",
    kind: "DIALOGUE" as const,
    sourceIndex: 0,
    speakerId: "speaker-exact",
    x: 0.3,
    y: 0.3,
    width: 0.4,
    height: 0.3,
    fontPt: 20,
    style: "BUBBLE" as const,
    bubbleShape: "CLOUD" as const,
    tail: "ANCHOR" as const,
    text: "سرد واضح",
  };
  for (const anchor of [
    { x: 0.1, y: 0.45 },
    { x: 0.9, y: 0.45 },
    { x: 0.5, y: 0.1 },
    { x: 0.5, y: 0.9 },
  ]) {
    const html = bookPageMarkup(
      { settings, mode: "ar-EG" } as never,
      {
        pageId: "page-exact",
        pageNumber: 1,
        imageId: "art",
        anchors: [{ speakerId: box.speakerId, ...anchor }],
        boxes: [box],
      },
      "data:image/png;base64,YQ==",
      "print",
    );
    const points =
      /class="bubble-tail"[^]*?<path d="M([\d.]+),([\d.]+) L([\d.]+),([\d.]+) L([\d.]+),([\d.]+)/.exec(
        html,
      );
    assert.ok(points);
    const [ax, ay, tx, ty, bx, by] = points.slice(1).map(Number);
    assert.equal(tx, anchor.x * settings.widthMm);
    assert.equal(ty, anchor.y * settings.heightMm);
    const baseX = (ax! + bx!) / 2,
      baseY = (ay! + by!) / 2;
    assert.ok(
      baseX > box.x * settings.widthMm &&
        baseX < (box.x + box.width) * settings.widthMm,
    );
    assert.ok(
      baseY > box.y * settings.heightMm &&
        baseY < (box.y + box.height) * settings.heightMm,
    );
  }
});

test("independent: retained legacy geometry reopens byte-for-byte while fresh approval/export require correction", async () => {
  const dir = mkdtempSync(join(tmpdir(), "hekayti-phase441-qa-legacy-"));
  const database = join(dir, "synthetic.sqlite");
  let repo = new SqliteProjectRepository(database);
  let n = 0;
  const seam = {
    id: () => `legacy-qa-${++n}`,
    now: () => "2026-10-07T12:00:00Z",
  };
  const services = () => {
    const workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      seam,
    );
    const planner = new StoryPlannerService(
      repo,
      workflow,
      seam,
      "planner-quality/1.1",
    );
    const creator = new SimpleCreatorService(repo, workflow, planner, seam);
    return {
      creator,
      studio: new BookStudioService(
        repo,
        creator,
        workflow,
        planner,
        seam,
        async () => "f".repeat(64),
      ),
    };
  };
  try {
    let { creator, studio } = services();
    new StoryLibraryService(repo, seam).seed();
    const steps = [
      "نور يشوف طرف لعبة تحت القماشة.",
      "نور يقرب منها.",
      "نور يرفع القماشة.",
      "اللعبة تظهر كاملة.",
      "نور يحضنها.",
      "نور يهدأ وينام.",
    ];
    let s = await studio.create({
      agePreset: "UNDER_ONE",
      exactAgeMonths: 7,
      category: "bedtime",
      goalPreset: "SLEEP",
      fictionalName: "نور",
      primaryLanguageMode: "ar-EG",
      provisionalAcknowledged: true,
      expectedLibrary: repo.loadLibrary().recordVersion,
      bookIntent: {
        idea: {
          source: "CUSTOM",
          text: "نور يكتشف لعبة ناعمة تحت القماشة ثم يحتضنها وينام.",
        },
        path: { mode: "CUSTOM", steps },
        length: "AUTO",
      },
    });
    const projectId = s.book.projectId;
    s = await studio.command({
      action: "PREPARE_WRITER",
      projectId,
      expectedBook: s.book.recordVersion,
    });
    await creator.command({
      action: "IMPORT",
      projectId,
      packageId: s.session.package!.packageId,
      expectedPlanner: s.session.planner.recordVersion,
      expectedWorkflow: s.session.workflow.recordVersion,
      json: JSON.stringify({
        schemaVersion: "writer-response/1.0",
        editions: [
          {
            mode: "ar-EG",
            pages: steps.map((narration, i) => ({
              pageNumber: i + 1,
              narration,
              dialogue: [],
              altText: narration,
            })),
          },
        ],
      }),
    });
    s = studio.load(projectId);
    s = await studio.command({
      action: "APPROVE_STORY",
      projectId,
      expectedBook: s.book.recordVersion,
      draftId: s.session.workflow.current.draftId!,
    });
    const draft = s.session.workflow.drafts.at(-1)!;
    const sourcePages = draft.editions[0]!.pages;
    const assets: AssetManifest[] = [null, ...sourcePages].map(
      (source, i): AssetManifest => ({
        assetId: `legacy-asset-${i}`,
        projectId,
        sha256: "a".repeat(64),
        mime: "image/png",
        bytes: 100,
        width: 2400,
        height: 2400,
        classification: "PUBLIC_SYNTHETIC",
        purpose: source ? "PAGE" : "COVER",
        createdAt: "now",
      }),
    );
    const images: BookImage[] = [null, ...sourcePages].map(
      (source, i): BookImage => ({
        imageId: `legacy-art-${i}`,
        slot: source ? `page:${source.pageId}` : "cover",
        kind: source ? "PAGE" : "COVER",
        ...(source ? { pageId: source.pageId } : {}),
        assetId: assets[i]!.assetId,
        createdAt: "now",
        binding: {
          draftId: draft.draftId,
          sceneHash: "a".repeat(64),
          storyRevision: s.session.planner.currentPlanRevisionId!,
          styleRevision: s.book.styles.at(-1)!.revisionId,
          identityRevisions: [],
          sheetVersions: [],
        },
      }),
    );
    const decisions = images.map((image, i) => ({
      decisionId: `legacy-decision-${i}`,
      imageId: image.imageId,
      choice: "APPROVE" as const,
      notes: "synthetic historical approval",
      createdAt: "now",
    }));
    const legacy: BookLayout = {
      revisionId: "legacy-layout",
      draftId: draft.draftId,
      mode: "ar-EG",
      title: "حكاية نور",
      subtitle: "عنوان فرعي قديم",
      brand: "",
      settings,
      font: "Noto Sans Arabic",
      createdAt: "now",
      pages: [null, ...sourcePages].map(
        (source, i): BookLayout["pages"][number] => ({
          pageId: source?.pageId ?? "legacy-cover",
          pageNumber: i,
          imageId: images[i]!.imageId,
          anchors: [],
          boxes: source
            ? [
                {
                  boxId: `legacy-text-${i}`,
                  kind: "NARRATION",
                  sourceIndex: 0,
                  x: 0.1,
                  y: 0.1,
                  width: 0.8,
                  height: 0.2,
                  fontPt: 20,
                  style: "PAPER",
                  tail: "NONE",
                  text: source.narration,
                },
              ]
            : [
                {
                  boxId: "legacy-title",
                  kind: "TITLE",
                  sourceIndex: 0,
                  x: 0.1,
                  y: 0.1,
                  width: 0.8,
                  height: 0.2,
                  fontPt: 20,
                  style: "PAPER",
                  tail: "NONE",
                  text: "حكاية نور",
                },
                {
                  boxId: "legacy-subtitle",
                  kind: "SUBTITLE",
                  sourceIndex: 0,
                  x: 0.1,
                  y: 0.15,
                  width: 0.8,
                  height: 0.2,
                  fontPt: 20,
                  style: "PAPER",
                  tail: "NONE",
                  text: "عنوان فرعي قديم",
                },
              ],
        }),
      ),
    };
    const selectionDecisions = decisions.map((d) => d.decisionId);
    const approval = {
      approvalId: "legacy-book-approval",
      layoutRevisionId: legacy.revisionId,
      renderFingerprint: "f".repeat(64),
      selectionDecisions,
      createdAt: "now",
      contentHash: await contentHash({
        layout: legacy,
        classification: s.book.classification,
        renderFingerprint: "f".repeat(64),
        selectionDecisions,
      }),
    };
    // Emulate a sealed, valid older payload: v0.7.0 did not reject these overlapping cover layers.
    repo.saveBook(
      {
        ...s.book,
        assets,
        images,
        decisions,
        layouts: [legacy],
        approvals: [approval],
      },
      s.book.recordVersion,
    );
    const stored = () =>
      (repo as unknown as { db: DatabaseSync }).db
        .prepare(
          "SELECT payload,version,digest FROM illustrated_books WHERE project_id=?",
        )
        .get(projectId);
    const rawBefore = { ...stored()! };
    const workflowBefore = canonicalJson(repo.loadWorkflow(projectId));
    const plannerBefore = canonicalJson(repo.loadPlanner(projectId));
    repo.close();
    repo = new SqliteProjectRepository(database);
    ({ creator, studio } = services());
    s = studio.load(projectId);
    assert.deepEqual({ ...stored()! }, rawBefore);
    assert.equal(canonicalJson(repo.loadWorkflow(projectId)), workflowBefore);
    assert.equal(canonicalJson(repo.loadPlanner(projectId)), plannerBefore);
    assert.equal(s.book.approvals[0]!.contentHash, approval.contentHash);
    assert.equal(s.book.layouts[0]!.revisionId, legacy.revisionId);
    assert.equal(s.book.compositionPlans, undefined);
    assert.throws(
      () =>
        repo.saveBook(
          {
            ...s.book,
            approvals: [
              ...s.book.approvals,
              {
                ...approval,
                approvalId: "forged-later-approval",
                contentHash: "0".repeat(64),
              },
            ],
          },
          s.book.recordVersion,
        ),
      (e: any) => e.code === "BOOK_APPROVAL_SOURCE",
    );
    const command = (
      action: "APPROVE_BOOK" | "SAVE_LAYOUT",
      layout?: BookLayout,
    ) =>
      studio.command({
        projectId,
        expectedBook: s.book.recordVersion,
        ...(action === "SAVE_LAYOUT"
          ? { action, layout: layout! }
          : { action }),
      });
    await assert.rejects(
      command("APPROVE_BOOK"),
      (e: any) => e.code === "BOOK_LAYOUT_GEOMETRY",
    );
    await assert.rejects(
      studio.exportModel(projectId, s.book.recordVersion),
      (e: any) => e.code === "BOOK_LAYOUT_GEOMETRY",
    );
    await assert.rejects(
      command("SAVE_LAYOUT", legacy),
      (e: any) => e.code === "BOOK_LAYOUT_GEOMETRY",
    );
    assert.deepEqual({ ...stored()! }, rawBefore);
    const forged = structuredClone(s.book);
    forged.layouts[0]!.pages[1]!.boxes[0]!.text = "نص غير مطابق للمصدر";
    assert.throws(
      () => validateBookSources(forged, s.session.workflow, s.session.planner),
      (e: any) => e.code === "BOOK_LAYOUT_SOURCE",
    );
    const unsafe = structuredClone(s.book);
    unsafe.layouts[0]!.pages[1]!.boxes[0]!.x = 0;
    assert.throws(
      () => validateBookSources(unsafe, s.session.workflow, s.session.planner),
      (e: any) => e.code === "BOOK_SAFE_MARGIN",
    );
    const corrected = structuredClone(legacy);
    corrected.pages[0]!.boxes[1]!.y = 0.55;
    s = await command("SAVE_LAYOUT", corrected);
    s = await command("APPROVE_BOOK");
    assert.equal(
      (await studio.exportModel(projectId, s.book.recordVersion)).approved,
      true,
    );
    assert.equal(canonicalJson(s.book.layouts[0]), canonicalJson(legacy));
    assert.equal(canonicalJson(s.book.approvals[0]), canonicalJson(approval));
    assert.equal(s.book.layouts.length, 2);
    assert.equal(s.book.approvals.length, 2);
  } finally {
    repo.close();
    for (const suffix of ["", "-wal", "-shm"])
      rmSync(database + suffix, { force: true });
    rmdirSync(dir);
  }
});
