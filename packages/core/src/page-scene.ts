import type { ScenePage, VisualIntent } from "@hekayti/contracts/book";
import type { StoryPageText } from "./book-composition";

const normalized = (text: string) => text.normalize("NFKC").replace(/[\u064b-\u065f\u0670]/g, "");
const negated = (text: string) => /(?:^|[^\p{L}])(?:لا|لم|لن|مش|ليس|ما|not|never|without)(?=$|[^\p{L}])/iu.test(normalized(text));
const uncovering = (text: string) => /(?:رفع|يرفع|ترفع|رفعت|تكشف|يكشف|كشف|lift|uncover|reveal)/iu.test(normalized(text));
export const hasPageCoverage = (text: string) => /قماش|غطاء|مغط|تحت|cloth|covered|beneath|under/iu.test(normalized(text));
const coverage = hasPageCoverage;
const partial = (text: string) => /طرف|جزء|جزئي|شوية|قليلا|edge|partly|partial|portion/iu.test(normalized(text));
const complete = (text: string) => /بالكامل|كامل[اة]?|كله|كلها|fully|entire|completely/iu.test(normalized(text));
const visible = (text: string) => /ظاهر|باين|يظهر|ظهر|مكشوف|visible|exposed|revealed/iu.test(normalized(text));
const exactDescription = (page: StoryPageText) => page.altText.trim() || [page.narration, ...page.dialogue.map(d => d.text)].filter(Boolean).join(" ");

/** Bounded literal evidence, not an Arabic semantic model or visual recognition.
 * Descriptions remain exact authored text; unspecified visibility is never promoted.
 * Adjacent events are negative locks only, never current-page scene authority. */
export function reviewPageScene(page: StoryPageText, scene?: ScenePage, previous?: StoryPageText, next?: StoryPageText): NonNullable<VisualIntent["sceneReview"]> {
  const description = exactDescription(page);
  const action = [page.narration, ...page.dialogue.map(d => d.text)].filter(Boolean).join(" ");
  const current = `${description} ${action}`;
  const constrained = coverage(current);
  // A nearby covered prop does not establish the visible subject's reveal state.
  // This literal parser cannot resolve mixed subjects or a negated clause safely.
  // Full reveal requires a narrow explicit prop-led clause, not words merely
  // co-occurring somewhere in a sentence about a person and another object.
  const fullPropClause = /^(?:الشيء|الشكل|اللعبة|الكرة|the (?:object|shape|toy|ball))\s+(?:ظاهر|مكشوف|باين|(?:is )?(?:visible|exposed))\s+(?:بالكامل|كله|كلها|fully|completely)\s+(?:من\s+)?(?:تحت|بعد رفع|under|after lifting)\s+[^.!؟،؛]+[.!؟]?$/iu.test(normalized(description).trim());
  const ambiguous = constrained && (/بجانب|بجوار|جنب|beside|next to/iu.test(normalized(description)) || (complete(description) && visible(description) && !fullPropClause));
  const uncertain = negated(current) || ambiguous;
  const isPartial = constrained && partial(description) && !uncertain;
  const isComplete = constrained && complete(description) && visible(description) && !uncertain && !isPartial;
  const isHidden = /(?:مخفي تماما|مغطى بالكامل|fully hidden|completely covered)/iu.test(normalized(description)) && !uncertain;
  const visibility = isPartial ? "PARTIAL" : isHidden ? "COVERED" : isComplete ? "VISIBLE" : "UNKNOWN";
  const mustNotShow = ["لا تضف فعلًا غير مذكور في هذه الصفحة، ولا تعيد حالة الأشياء أو ملكيتها دون حدث."];
  if (isPartial) mustNotShow.push("لا تعرض الشيء كاملًا أو ترفع الغطاء بالكامل؛ المسموح فقط الجزء الظاهر الموصوف في هذه الصفحة.");
  if (isHidden) mustNotShow.push("لا تعرض الشيء المخفي؛ أبقِ الغطاء كما يصف النص.");
  const nextEvidence = next ? `${exactDescription(next)} ${next.narration} ${next.dialogue.map(d=>d.text).join(" ")}` : "";
  if (next && uncovering(nextEvidence) && !negated(nextEvidence) && !uncovering(current))
    mustNotShow.push(`لا تنفذ الكشف المحجوز للصفحة التالية: ${exactDescription(next)}`);
  const warnings: string[] = [];
  if (!page.altText.trim()) warnings.push("وصف الصورة غير موجود؛ راجع حالة الأشياء قبل تجهيز الرسم.");
  if (negated(current)) warnings.push("النص يتضمن نفيًا؛ راجع نطاق النفي ولا تفترض أن الفعل حدث.");
  if (ambiguous) warnings.push("الوصف يجمع أشخاصًا وأشياء مجاورة؛ راجع أي شيء يخصه مقدار الظهور.");
  if (constrained && visibility === "UNKNOWN") warnings.push("مقدار ظهور الشيء غير محدد؛ لا تفترض أنه مكشوف بالكامل، راجع وصف الصفحة.");
  if (previous && coverage(exactDescription(previous)) && coverage(description) && !uncovering(current) && partial(exactDescription(previous)) && isComplete)
    warnings.push("احتمال كشف مبكر: ظهور كامل بعد جزء ظاهر دون فعل كشف معلن؛ راجع النص والوصف.");
  const signature = (s: string) => normalized(s).replace(/[\p{P}\p{Z}]/gu, "");
  if (previous && signature(exactDescription(previous)) === signature(description)) warnings.push("الوصف البصري مكرر دون تغيير واضح؛ راجع غرض هذه الصفحة بدل إضافة حشو.");
  if (scene?.reviewRequired) warnings.push("سجل المشهد يحتاج مراجعة؛ لا تستخدم نهاية حدث عام بدل لحظة هذه الصفحة.");
  return {
    before: previous ? exactDescription(previous) : "لا توجد حالة سابقة معتمدة؛ استخدم وصف الصفحة فقط ولا تخترع بداية.",
    after: description || "الحالة غير محددة؛ تحتاج مراجعة.",
    visibility,
    mustShow: [description || action || "حدد حدث الصفحة قبل الرسم"],
    mustNotShow,
    locks: (scene?.before ?? []).filter(e => !constrained || e.kind !== "PROP").map(e => `${e.name}: ${e.state}؛ ${e.location}؛ ${e.visibility}`),
    warnings,
  };
}
