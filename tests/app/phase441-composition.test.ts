import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveVisualIntent,
  planComposition,
  compositionBoxes,
  layoutGeometryIssues,
  similarVisualIntents,
  visualActionSignature,
} from "@hekayti/core/book";
import {
  CompositionPlanSchema,
  PageLayoutSchema,
  BookStateSchema,
  type ScenePage,
} from "@hekayti/contracts/book";
import { bookPageMarkup } from "@hekayti/export/book";
import {
  studioIssue,
  targetElementId,
} from "../../apps/desktop/renderer/src/studio-recovery";
const settings = {
  preset: "SQUARE" as const,
  widthMm: 200,
  heightMm: 200,
  safeMm: 12,
  gutterMm: 0,
  bleedMm: 3,
  pageNumbers: true,
};
const scene: ScenePage = {
  pageNumber: 1,
  beatId: "beat",
  creatorStep: 0,
  intent: "لحظة قراءة هادئة",
  action: "يبدأ في البيت",
  before: [],
  after: [
    {
      entityId: "noor",
      kind: "CHARACTER",
      name: "نور",
      location: "غرفة النوم",
      visibility: "VISIBLE",
      heldBy: null,
      coveredBy: null,
      state: "بجوار الكتاب",
    },
    {
      entityId: "mother",
      kind: "CHARACTER",
      name: "ماما",
      location: "غرفة النوم",
      visibility: "VISIBLE",
      heldBy: null,
      coveredBy: null,
      state: "تستمع",
    },
    {
      entityId: "book",
      kind: "PROP",
      name: "الكتاب",
      location: "على السرير",
      visibility: "VISIBLE",
      heldBy: null,
      coveredBy: null,
      state: "مفتوح",
    },
    {
      entityId: "teddy",
      kind: "PROP",
      name: "الدبدوب",
      location: "بجوار الوسادة",
      visibility: "VISIBLE",
      heldBy: null,
      coveredBy: null,
      state: "ثابت",
    },
  ],
  reviewRequired: false,
};
function make(
  narration: string,
  dialogue: { speakerId: string; text: string }[] = [],
  prior?: ReturnType<typeof planComposition>,
) {
  const page = { pageId: "page", narration, dialogue, altText: "" };
  const visual = deriveVisualIntent(page, 1, "draft", "story", scene);
  const plan = planComposition({
    page,
    visual,
    settings,
    revisionId: "composition",
    mode: "ar-EG",
    createdAt: "now",
    imageId: "art",
    prior,
  });
  let n = 0;
  const layout = {
    pageId: "page",
    pageNumber: 1,
    imageId: "art",
    anchors: plan.anchors,
    protectedRegions: plan.protectedRegions,
    boxes: compositionBoxes(plan, page, () => `box-${++n}`),
  };
  return { page, visual, plan, layout };
}
test("scenario 1 narration only has text-sized integrated region without speech bubbles", () => {
  const x = make("نور قعد جنب الكتاب المفتوح.");
  assert.equal(x.plan.regions.length, 1);
  assert.equal(x.layout.boxes[0]!.kind, "NARRATION");
  assert.equal(x.layout.boxes[0]!.tail, "NONE");
  assert.ok(x.plan.regions[0]!.rect.height < 0.24);
  assert.deepEqual(layoutGeometryIssues(x.layout), []);
});
test("scenario 2 one speaker/listener and explicit manual anchor retain canonical ownership", () => {
  const base = make("", [
    { speakerId: "noor", text: "بصي على الصورة يا ماما." },
  ]);
  const x = make("", base.page.dialogue, {
    ...base.plan,
    anchors: [{ speakerId: "noor", x: 0.75, y: 0.65 }],
  });
  assert.deepEqual(x.visual.speakers, ["noor"]);
  assert.deepEqual(x.visual.listeners, ["mother"]);
  assert.equal(x.layout.boxes[0]!.tail, "ANCHOR");
  assert.equal(x.layout.boxes[0]!.speakerId, "noor");
  assert.deepEqual(layoutGeometryIssues(x.layout), []);
});
test("scenario 3 two speakers preserve source order and right-to-left initial placement without collision", () => {
  const x = make("", [
    { speakerId: "noor", text: "دي صورة جديدة." },
    { speakerId: "mother", text: "شايف فيها إيه؟" },
  ]);
  assert.deepEqual(
    x.layout.boxes.map((b) => [b.sourceIndex, b.speakerId]),
    [
      [0, "noor"],
      [1, "mother"],
    ],
  );
  assert.ok(x.layout.boxes[0]!.x > x.layout.boxes[1]!.x);
  assert.deepEqual(layoutGeometryIssues(x.layout), []);
});
test("scenario 4 narration plus dialogue has distinct non-overlapping regions", () => {
  const x = make("نور قرب الكتاب.", [{ speakerId: "noor", text: "بصي!" }]);
  assert.equal(x.layout.boxes.length, 2);
  assert.deepEqual(layoutGeometryIssues(x.layout), []);
});
test("scenario 5 long dialogue fails visibly instead of shrinking below safe font", () => {
  assert.throws(
    () =>
      make("", [
        {
          speakerId: "noor",
          text: "كلام طويل يحتاج مساحة مقروءة. ".repeat(200),
        },
      ]),
    (e: any) => e.code === "BOOK_TEXT_FIT" && e.target.pageId === "page",
  );
});
test("scenario 6 cloud shape and exact speaker tail use common deterministic page markup", () => {
  const base = make("", [{ speakerId: "noor", text: "شايف الصورة." }]);
  const x = make("", base.page.dialogue, {
    ...base.plan,
    anchors: [{ speakerId: "noor", x: 0.75, y: 0.65 }],
  });
  const html = bookPageMarkup(
    { settings, mode: "ar-EG" } as any,
    x.layout,
    "data:image/png;base64,YQ==",
    "print",
  );
  assert.match(html, /book-bubble-shape/);
  assert.match(html, /bubble-tail/);
  assert.match(html, /شايف الصورة/);
  assert.equal(x.layout.boxes[0]!.bubbleShape, "CLOUD");
});
test("scenario 7 creator-protected busy art fails packing rather than overwriting protected visuals", () => {
  const x = make("سرد قصير.");
  const p = planComposition({
    page: x.page,
    visual: x.visual,
    settings,
    revisionId: "c2",
    mode: "ar-EG",
    createdAt: "now",
    imageId: "art",
    prior: {
      ...x.plan,
      protectedRegions: [{ x: 0.06, y: 0.06, width: 0.88, height: 0.88 }],
    },
  });
  assert.equal(p.layoutReviewRequired, true);
  assert.equal(p.regions.length, 0);
  assert.throws(() => compositionBoxes(p, x.page, () => "box"));
});
test("synthetic سرير مريح sixteen-page progression uses authored actions/bedroom/book/teddy and honors intentional repetition", () => {
  const lines = [
    "نور قعد جنب كتاب مفتوح.",
    "نور بص للصورة في الكتاب.",
    "نور بيقلب صفحة الكتاب.",
    "الصورة الجديدة ظهرت في الكتاب.",
    "نور ابتسم للصورة.",
    "نور حط الكتاب جنب الدبدوب.",
    "نور فتح الكتاب تاني.",
    "نور شاف صورة في الكتاب.",
    "نور بيقلب صفحة الكتاب.",
    "نور ابتسم للصورة الجديدة.",
    "نور حضن الدبدوب.",
    "نور حط الدبدوب جنب الوسادة.",
    "نور قفل الكتاب.",
    "نور حط الكتاب جنب السرير.",
    "نور نام في السرير.",
    "نور نام في السرير.",
  ];
  const plans = lines.map((n, i) =>
    deriveVisualIntent(
      { pageId: `p-${i}`, narration: n, dialogue: [], altText: "" },
      i + 1,
      "draft",
      "story",
      { ...scene, pageNumber: i + 1 },
    ),
  );
  assert.equal(plans.length, 16);
  assert.equal(plans[2]!.pageAction, lines[2]);
  assert.notEqual(plans[2]!.cameraFraming, plans[4]!.cameraFraming);
  assert.ok(
    plans.every(
      (p) =>
        p.continuity.some((c) => c.includes("الدبدوب")) &&
        p.continuity.some((c) => c.includes("غرفة النوم")),
    ),
  );
  assert.ok(similarVisualIntents(plans[14]!, plans[15]!));
  const p = make(lines[15]!).plan;
  assert.ok(
    CompositionPlanSchema.parse({ ...p, repetitionOverride: true })
      .repetitionOverride,
  );
  const negated = deriveVisualIntent(
    {
      pageId: "neg",
      narration: "نور لم يقلب صفحة الكتاب.",
      dialogue: [],
      altText: "",
    },
    1,
    "d",
    "s",
    scene,
  );
  assert.ok(negated.reviewRequired);
  assert.doesNotMatch(negated.focus, /اليد والكتاب/);
});
test("punctuation and descriptive length preserve compatible action signature; physical action changes do not", () => {
  const p = {
    pageId: "page",
    narration: "نور بيقلب صفحة الكتاب.",
    dialogue: [],
    altText: "",
  };
  assert.equal(
    visualActionSignature(p),
    visualActionSignature({
      ...p,
      narration: "نور بيقلب صفحة الكتاب! بهدوء وبراحة وسط الضوء الناعم.",
    }),
  );
  assert.notEqual(
    visualActionSignature(p),
    visualActionSignature({ ...p, narration: "نور قفل الكتاب." }),
  );
});
test("exact recovery metadata is not guessed from code/display name; legacy layout/schema remain accepted", () => {
  const issue = studioIssue(
    {
      code: "BOOK_IDENTITY",
      message: "تعريف غير معتمد",
      target: {
        section: "images",
        characterId: "actor-exact",
        control: "identity",
      },
    },
    "book",
  );
  assert.equal(
    targetElementId(issue.target!),
    "studio-target-identity-actor-exact",
  );
  assert.equal(
    studioIssue({ code: "BOOK_IMAGES", message: "missing" }, "book").target,
    undefined,
  );
  const x = make("سرد قصير.");
  assert.ok(PageLayoutSchema.parse(x.layout));
  assert.ok(BookStateSchema.shape.compositionPlans.isOptional());
});
