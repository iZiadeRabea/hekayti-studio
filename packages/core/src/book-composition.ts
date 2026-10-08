import type {
  BookSettings,
  CompositionPlan,
  ScenePage,
  TextBox,
  VisualIntent,
  PageLayout,
} from "@hekayti/contracts/book";
import { AppError } from "@hekayti/contracts";

export type StoryPageText = {
  pageId: string;
  narration: string;
  dialogue: { speakerId: string; text: string }[];
  altText: string;
};
const comparable = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/[\p{P}\p{Z}\u064b-\u065f]/gu, "")
    .toLowerCase();
export function visualActionSignature(page: StoryPageText): string {
  if (
    page.narration &&
    !/(?:قلب|قلّب|يقلب|يمسك|مسك|رفع|يرفع|كشف|يكشف|فتح|يفتح|قفل|يقفل|حضن|يحضن|شاف|يشوف|بص|يبص|نظر|ينظر|ابتسم|ضحك|نام|ينام|مش[ىي]|يجري|جر[ىي]|حط|يحط|أخذ|ياخد|وقف|جلس|turn|hold|open|close|smil|look|sleep)/i.test(
      page.narration,
    )
  )
    return comparable([page.narration, page.altText].join(" "));
  const prose = [page.narration, page.altText].join(" ").normalize("NFKC");
  const actions = prose.match(
    /(?:بي|ي|ت)?(?:قلب|قلّب|يقلب|يمسك|مسك|رفع|يرفع|كشف|يكشف|فتح|يفتح|قفل|يقفل|حضن|يحضن|شاف|يشوف|بص|يبص|نظر|ينظر|ابتسم|ضحك|نام|ينام|مش[ىي]|يجري|جر[ىي]|حط|يحط|أخذ|ياخد|وقف|جلس|جلس|turn\w*|hold\w*|open\w*|close\w*|smil\w*|look\w*|sleep\w*)/gi,
  );
  // Unknown prose stays conservative rather than pretending semantic understanding.
  if (!actions?.length) return comparable(prose);
  const props =
    prose.match(
      /(?:كتاب|دبدوب|قماش[ةه]|سرير|وساد[ةه]|بطاني[ةه]|كر[ةه]|باب|شباك|غرف[ةه]|book|teddy|bed|blanket|ball|door|room)/gi,
    ) ?? [];
  const negation = /(?:لا |لم |لن |مش |ما |not |never )/.test(prose)
    ? "NEGATED"
    : "";
  return JSON.stringify({
    actions: [...new Set(actions.map(comparable))].sort(),
    props: [...new Set(props.map(comparable))].sort(),
    negation,
    alt: comparable(page.altText),
  });
}
export function deriveVisualIntent(
  page: StoryPageText,
  pageNumber: number,
  draftId: string,
  storyRevision: string,
  scene?: ScenePage,
): VisualIntent {
  // Authored page prose is authority even when a planner beat is generic.
  const action =
    [page.narration, ...page.dialogue.map((d) => d.text)]
      .filter(Boolean)
      .join(" ") ||
    page.altText ||
    scene?.action ||
    "صفحة بلا نص؛ راجع وصف المشهد";
  const speakers = [...new Set(page.dialogue.map((d) => d.speakerId))];
  const present = [
    ...new Set([
      ...(scene?.after
        .filter(
          (e) => e.kind === "CHARACTER" && e.visibility !== "OUT_OF_SCENE",
        )
        .map((e) => e.entityId) ?? []),
      ...speakers,
    ]),
  ];
  const negated = /(?:لا |لم |لن |مش |ما |not |never )/.test(action);
  const turn =
      !negated && /(?:يقل[بّ]|قلب|تقليب|turn.{0,15}page)/i.test(action),
    picture = !negated && /(?:صور[ةه]|picture|illustration)/i.test(action),
    reaction = !negated && /(?:ابتسم|ضحك|فرح|smil|laugh)/i.test(action);
  const focus = turn
    ? "الفعل الموصوف لتقليب الصفحة؛ اليد والكتاب"
    : reaction
      ? "تعبير الشخصية ورد الفعل المذكور"
      : picture
        ? "الصورة المذكورة واتجاه الانتباه إليها"
        : page.altText || action;
  const changes =
    scene?.after.flatMap((e) => {
      const before = scene.before.find((q) => q.entityId === e.entityId);
      return before && JSON.stringify(before) !== JSON.stringify(e)
        ? [
            `${e.name}: ${before.state} ← ${e.state}؛ ${before.location} ← ${e.location}`,
          ]
        : [];
    }) ?? [];
  return {
    pageId: page.pageId,
    pageNumber,
    draftId,
    storyRevision,
    pageAction: action,
    narrativePurpose: scene?.intent || "إظهار اللحظة الفعلية في النص",
    stateChange: changes,
    charactersPresent: present,
    speakers,
    listeners: speakers.length
      ? present.filter((id) => !speakers.includes(id))
      : [],
    focus,
    cameraFraming: turn
      ? "لقطة قريبة للفعل مع بقاء الشخصية قابلة للتعرف"
      : reaction
        ? "لقطة متوسطة للتعبير"
        : picture
          ? "لقطة تسمح بقراءة الانتباه إلى الصورة"
          : "لقطة واضحة للمشهد الموصوف",
    compositionHint: turn
      ? "الكتاب واليد في منطقة التركيز، ومساحة هادئة بعيدًا عنهما"
      : reaction
        ? "اترك الوجه ورد الفعل واضحين"
        : "رتب العناصر المذكورة حول فعل الصفحة دون إضافة حدث",
    continuity: (scene?.after ?? []).map(
      (e) =>
        `${e.name}: ${e.location}؛ ${e.state}؛ ${e.visibility}${e.heldBy ? `; held by ${scene?.after.find((q) => q.entityId === e.heldBy)?.name ?? "declared actor"}` : ""}${e.coveredBy ? `; covered by ${scene?.after.find((q) => q.entityId === e.coveredBy)?.name ?? "declared prop"}` : ""}`,
    ),
    reviewRequired: !scene || scene.reviewRequired || negated,
  };
}
export function similarVisualIntents(
  a: VisualIntent,
  b: VisualIntent,
): boolean {
  return (
    comparable(a.pageAction) === comparable(b.pageAction) ||
    (comparable(a.focus) === comparable(b.focus) &&
      a.cameraFraming === b.cameraFraming &&
      JSON.stringify(a.continuity) === JSON.stringify(b.continuity) &&
      b.stateChange.length === 0)
  );
}
export const rectanglesOverlap = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  gap = 0,
) =>
  a.x < b.x + b.width + gap &&
  a.x + a.width + gap > b.x &&
  a.y < b.y + b.height + gap &&
  a.y + a.height + gap > b.y;
export function estimateRegion(
  text: string,
  fontPt: number,
  width: number,
  settings: BookSettings,
  cloud = false,
) {
  // Conservative initial Arabic estimate; Chromium actual font measurement is the approval authority.
  const contentMm = cloud
    ? width * settings.widthMm * 0.72 - 2
    : width * settings.widthMm - 8;
  const glyphMm = fontPt * 0.352778 * 0.62;
  const chars = Math.max(1, Math.floor(contentMm / glyphMm));
  const lines = text
    .split("\n")
    .reduce(
      (sum, line) => sum + Math.max(1, Math.ceil([...line].length / chars)),
      0,
    );
  return Math.max(
    0.09,
    (cloud
      ? (lines * fontPt * 0.352778 * 1.65 + 2) / 0.68
      : lines * fontPt * 0.352778 * 1.65 + 12) / settings.heightMm,
  );
}
export function planComposition(input: {
  page: StoryPageText;
  visual: VisualIntent;
  settings: BookSettings;
  revisionId: string;
  mode: CompositionPlan["mode"];
  createdAt: string;
  imageId?: string;
  prior?: CompositionPlan;
}): CompositionPlan {
  const { page, visual, settings } = input,
    sx = (settings.safeMm + settings.gutterMm) / settings.widthMm,
    sy = settings.safeMm / settings.heightMm;
  const protectedRegions = input.prior?.protectedRegions ?? [],
    anchors =
      input.prior && input.prior.imageId === input.imageId
        ? input.prior.anchors
        : [];
  const placed: CompositionPlan["regions"] = [],
    fontPt = 20;
  const bottom = 1 - sy - (settings.pageNumbers ? 14 / settings.heightMm : 0);
  const items = [
    ...(page.narration
      ? [{ kind: "NARRATION" as const, sourceIndex: 0, text: page.narration }]
      : []),
    ...page.dialogue.map((d, i) => ({
      kind: "DIALOGUE" as const,
      sourceIndex: i,
      text: d.text,
      speakerId: d.speakerId,
    })),
  ];
  let failed = false;
  for (const item of items) {
    const anchor =
      "speakerId" in item
        ? anchors.find((a) => a.speakerId === item.speakerId)
        : undefined;
    const widths =
      item.kind === "NARRATION"
        ? [0.64, 0.8, 1 - 2 * sx]
        : [0.38, 0.48, 0.62, 0.8];
    const candidates: {
      x: number;
      y: number;
      width: number;
      height: number;
      score: number;
    }[] = [];
    for (const width0 of widths) {
      const width = Math.min(width0, 1 - 2 * sx),
        height = estimateRegion(
          item.text,
          fontPt,
          width,
          settings,
          item.kind === "DIALOGUE",
        );
      if (height > bottom - sy) continue;
      for (let y = sy; y + height <= bottom + 0.000001; y += 0.035)
        for (let x = sx; x + width <= 1 - sx + 0.000001; x += 0.035) {
          const r = { x, y, width, height };
          if (
            [
              ...placed.map((p) => p.rect),
              ...protectedRegions,
              ...anchors.map((a) => ({
                x: Math.max(0, a.x - 0.04),
                y: Math.max(0, a.y - 0.04),
                width: 0.08,
                height: 0.08,
              })),
            ].some((p) => rectanglesOverlap(r, p, 0.015))
          )
            continue;
          const rightFirst =
            visual.speakers.length > 1 && item.kind === "DIALOGUE"
              ? item.sourceIndex % 2 === 0
                ? 1 - x - width / 2
                : x + width / 2
              : 0;
          candidates.push({
            ...r,
            score: anchor
              ? Math.hypot(x + width / 2 - anchor.x, y + height / 2 - anchor.y)
              : y * 2 + rightFirst + width * 0.12,
          });
        }
    }
    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];
    if (!best) {
      failed = true;
      continue;
    }
    const { score, ...rect } = best;
    placed.push({
      kind: item.kind,
      sourceIndex: item.sourceIndex,
      ...("speakerId" in item ? { speakerId: item.speakerId } : {}),
      rect,
      fontPt,
    });
  }
  return {
    revisionId: input.revisionId,
    pageId: page.pageId,
    draftId: visual.draftId,
    storyRevision: visual.storyRevision,
    mode: input.mode,
    imageId: input.imageId ?? null,
    settings,
    visual,
    regions: placed,
    protectedRegions,
    anchors,
    notes:
      input.prior?.notes ??
      "مواضع مقترحة فقط؛ حدد وجوه الشخصيات والفعل المهم وراجع المساحة بعد استيراد الرسم.",
    repetitionOverride: input.prior?.repetitionOverride ?? false,
    layoutReviewRequired:
      failed ||
      visual.reviewRequired ||
      (!anchors.length && visual.speakers.length > 0),
    createdAt: input.createdAt,
  };
}
export function compositionBoxes(
  plan: CompositionPlan,
  page: StoryPageText,
  id: () => string,
): TextBox[] {
  if (plan.regions.length !== (page.narration ? 1 : 0) + page.dialogue.length)
    throw new AppError(
      "BOOK_TEXT_FIT",
      "الكلام طويل على المساحة الحالية. كبّر مساحة الكلام أو عدّل النص.",
      { section: "images", pageId: page.pageId, control: "composition" },
    );
  return plan.regions.map((r) => ({
    boxId: id(),
    kind: r.kind,
    sourceIndex: r.sourceIndex,
    ...(r.speakerId ? { speakerId: r.speakerId } : {}),
    ...r.rect,
    fontPt: r.fontPt,
    style: r.kind === "DIALOGUE" ? "BUBBLE" : "PAPER",
    ...(r.kind === "DIALOGUE" ? { bubbleShape: "CLOUD" as const } : {}),
    tail:
      r.kind === "DIALOGUE"
        ? plan.anchors.some((a) => a.speakerId === r.speakerId)
          ? "ANCHOR"
          : "NONE"
        : "NONE",
    text:
      r.kind === "NARRATION"
        ? page.narration
        : page.dialogue[r.sourceIndex]!.text,
  }));
}
export function layoutGeometryIssues(
  page: PageLayout,
): { boxId: string; reason: string }[] {
  const errors: { boxId: string; reason: string }[] = [];
  for (const [i, b] of page.boxes.entries()) {
    if (page.boxes.slice(i + 1).some((q) => rectanglesOverlap(b, q)))
      errors.push({ boxId: b.boxId, reason: "TEXT_COLLISION" });
    if (page.protectedRegions?.some((r) => rectanglesOverlap(b, r)))
      errors.push({ boxId: b.boxId, reason: "PROTECTED_REGION" });
    if (b.kind === "DIALOGUE" && b.tail === "ANCHOR") {
      const a = page.anchors.find((a) => a.speakerId === b.speakerId);
      if (
        !a ||
        (a.x >= b.x &&
          a.x <= b.x + b.width &&
          a.y >= b.y &&
          a.y <= b.y + b.height)
      )
        errors.push({ boxId: b.boxId, reason: "SPEAKER_ANCHOR" });
    }
  }
  return errors;
}
