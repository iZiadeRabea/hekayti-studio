import {
  AppError,
  BlueprintSchema,
  countWords,
  languageInfo,
  validate,
  ValidationError,
  Id,
  type BeatAction,
  type LanguageEdition,
  type LanguageMode,
  type QaFinding,
  type StoryBlueprint,
  type StoryConcept,
  type StoryDraft,
  type StoryDraftProvider,
  type StoryRequest,
} from "@hekayti/contracts";
import { ageGuidance } from "./index";

const provenance = {
  kind: "mock",
  providerId: "hekayti-semantic-language-mock",
  version: "1.0",
  deterministic: true,
} as const;
const bidiControls = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const actions: readonly BeatAction[] = [
  "recognize",
  "reveal",
  "repeat",
  "notice",
  "try",
  "compare",
  "ask-help",
  "cooperate",
  "discover",
  "solve",
  "return",
  "settle",
];
const infantActions: readonly BeatAction[] = [
  "recognize",
  "reveal",
  "repeat",
  "notice",
  "settle",
];
const outcomes: Record<BeatAction, string> = {
  recognize: "object recognized",
  reveal: "object uncovered",
  repeat: "object recognized again",
  notice: "object noticed",
  try: "object explored with support",
  compare: "object features compared",
  "ask-help": "help requested with object",
  cooperate: "object explored together",
  discover: "object location discovered",
  solve: "object task completed with support",
  return: "object returned to familiar place",
  settle: "object rests in familiar place",
};
// Vetted noun agreement, not a prose translation dictionary. Unlisted lexical
// objects require authored grammar before this deterministic writer can use them.
const objectGrammar: Record<string, "masculine" | "feminine"> = {
  "the ball": "feminine",
  "the basket": "feminine",
  "the ribbon": "masculine",
  "the leaf": "feminine",
  "three blocks": "feminine",
};
const objectLabels: Record<string, Record<LanguageMode, string>> = {
  "the ball": { "ar-MSA-simple": "الكرة", "ar-EG": "الكورة", en: "the ball" },
  "the basket": {
    "ar-MSA-simple": "السلة",
    "ar-EG": "السلة",
    en: "the basket",
  },
  "the ribbon": {
    "ar-MSA-simple": "الشريط",
    "ar-EG": "الشريط",
    en: "the ribbon",
  },
  "the leaf": { "ar-MSA-simple": "الورقة", "ar-EG": "الورقة", en: "the leaf" },
  "three blocks": {
    "ar-MSA-simple": "المكعبات الثلاثة",
    "ar-EG": "٣ مكعبات",
    en: "three blocks",
  },
};
const unmarked = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "");
const locations: readonly Record<LanguageMode, string>[] = [
  { "ar-MSA-simple": "في الحديقة", "ar-EG": "في الجنينة", en: "in the garden" },
  { "ar-MSA-simple": "في الغرفة", "ar-EG": "في الأوضة", en: "in the room" },
  {
    "ar-MSA-simple": "بجانب النافذة",
    "ar-EG": "جنب الشباك",
    en: "beside the window",
  },
];
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const fail = (message: string): never => {
  throw new AppError("LANGUAGE_INPUT", message);
};

/** Validates ownership and meaning before prose exists. It never rewrites the source. */
function assertSourceData(
  request: StoryRequest,
  concept: StoryConcept,
  blueprint: StoryBlueprint,
): void {
  validate(BlueprintSchema, blueprint);
  ageGuidance({
    ageMonths: request.ageMonths,
    mode: request.primaryLanguageMode,
    category: request.primaryCategory,
  });
  if (
    request.schemaVersion !== "story-request/1.0" ||
    concept.requestId !== request.requestId ||
    concept.requestRevisionId !== request.revisionId
  )
    fail("The concept does not belong to this request revision.");
  if (
    blueprint.projectId !== request.projectId ||
    blueprint.storyId !== request.storyId ||
    blueprint.ageMonths !== request.ageMonths ||
    blueprint.primaryCategory !== request.primaryCategory ||
    concept.primaryCategory !== request.primaryCategory ||
    !same(concept.objective, request.objective) ||
    !same(blueprint.objective, request.objective)
  )
    fail(
      "Request, concept and canonical blueprint identity/objective disagree.",
    );
  if (
    !same(blueprint.languageModes, request.languageModes) ||
    blueprint.primaryLanguageMode !== request.primaryLanguageMode ||
    new Set(request.languageModes).size !== request.languageModes.length ||
    request.languageModes.some((mode) => !Object.hasOwn(languageInfo, mode))
  )
    fail("Declared language modes or primary edition disagree.");
  if (
    request.personalization.origin !== "synthetic" ||
    request.personalization.level > 3 ||
    blueprint.profileOrigin !== "synthetic" ||
    blueprint.personalization.privateProfileRef !== null
  )
    fail("Only synthetic personalization levels 0–3 are supported.");
  if (
    request.personalization.level !== blueprint.personalization.level ||
    request.personalization.heroMode !== blueprint.personalization.heroMode ||
    (blueprint.syntheticPersonalization &&
      !same(request.personalization, blueprint.syntheticPersonalization))
  )
    fail("Canonical personalization and requested role disagree.");
  if (
    concept.characters.some((c) => c.origin !== "synthetic") ||
    !same(concept.characters, blueprint.characterBibles) ||
    concept.mainCharacterId !== blueprint.protagonistId
  )
    fail("Canonical character identity differs from the selected concept.");
  if (
    !concept.outline.length ||
    concept.outline.length !== blueprint.meaningBeats.length ||
    new Set(concept.outline.map((b) => b.beatId)).size !==
      concept.outline.length
  )
    fail("Every semantic beat needs one unique canonical meaning reference.");
  const charIds = new Set(concept.characters.map((c) => c.characterId));
  for (const [i, beat] of concept.outline.entries()) {
    const canonical = blueprint.meaningBeats[i]!;
    if (
      beat.sequence !== i + 1 ||
      beat.beatId !== canonical.beatId ||
      beat.emotion !== canonical.emotion ||
      beat.beforeState !== canonical.beforeState ||
      beat.afterState !== canonical.afterState ||
      !same(beat.visibleFacts, canonical.visibleFacts)
    )
      fail(
        "Semantic beat order, emotion, visible facts or state differs from the canonical blueprint.",
      );
    if (
      canonical.actionOrDiscovery !==
      `${beat.action}: ${beat.focus[request.primaryLanguageMode]} ${beat.detail[request.primaryLanguageMode]}`
    )
      fail(
        "The canonical action or focal semantics differ from the selected concept.",
      );
    if (
      !actions.includes(beat.action) ||
      (request.ageMonths < 12 && !infantActions.includes(beat.action))
    )
      fail("Unsupported semantic action for this drafting profile.");
    if (!Object.hasOwn(objectGrammar, beat.focus.en))
      fail(
        "This mock has no authored object grammar for the focal label; manual drafting is required.",
      );
    if (
      beat.afterState !== `${beat.focus.en}: ${outcomes[beat.action]}` ||
      beat.beforeState !==
        (concept.outline[i - 1]?.afterState ??
          `${beat.focus.en}: object awaits shared attention`)
    )
      fail(
        "Unsupported semantic state/action combination; this mock requires the vetted action outcome and chained before-state.",
      );
    if (!["warm", "curious", "reassured"].includes(beat.emotion))
      fail("Unsupported authored emotion; manual drafting is required.");
    if (beat.actorId !== null && !charIds.has(beat.actorId))
      fail("A semantic actor does not resolve to its canonical character.");
    if (beat.actorId === null && !infantActions.includes(beat.action))
      fail("An action requires an explicit canonical actor.");
    if (
      !locations.some((location) =>
        request.languageModes.every(
          (mode) => unmarked(beat.detail[mode]) === unmarked(location[mode]),
        ),
      )
    )
      fail(
        "Unvetted or inconsistent localized location; manual drafting is required.",
      );
    for (const mode of request.languageModes) {
      if (
        typeof beat.focus?.[mode] !== "string" ||
        !beat.focus[mode].trim() ||
        typeof beat.detail?.[mode] !== "string" ||
        !beat.detail[mode].trim()
      )
        fail("Each selected edition needs a localized focal label and detail.");
      if (
        unmarked(beat.focus[mode]) !==
        unmarked(objectLabels[beat.focus.en]![mode])
      )
        fail(
          "Unvetted localized object identity or quantity; manual drafting is required.",
        );
      if (bidiControls.test(beat.focus[mode] + beat.detail[mode]))
        fail("Use logical Unicode labels without embedded direction controls.");
      // The frozen semantic contract supplies lexical noun and locative slots,
      // not provider instructions or arbitrary full-sentence continuations.
      if (/[.!?؟\n\r]/u.test(beat.focus[mode] + beat.detail[mode]))
        fail(
          "The mock writer supports noun labels and locative details, not full-sentence semantic slots.",
        );
      if (
        beat.detail[mode] &&
        !(
          mode === "en"
            ? /^(?:in|beside|at|under|on|near) /u
            : mode === "ar-EG"
              ? /^(?:في|جنب|عند|تحت|على|قرب) /u
              : /^(?:في|بجانب|عند|تحت|على|قرب) /u
        ).test(beat.detail[mode])
      )
        fail("The localized detail must be a supported locative adjunct.");
    }
    for (const id of beat.factIds) {
      const fact = request.trustedFacts.find((f) => f.factId === id);
      if (
        !fact ||
        fact.reviewStatus !== "human-reviewed" ||
        !fact.sourceReference.trim() ||
        !fact.reviewerAlias?.trim()
      )
        fail(
          "A factual beat needs an explicitly sourced human-reviewed fact boundary.",
        );
    }
  }
  const flattened = blueprint.pagePlan.flatMap((p) => p.beatIds);
  const distinct = flattened.filter(
    (id, i) => i === 0 || id !== flattened[i - 1],
  );
  if (
    !same(
      distinct,
      concept.outline.map((b) => b.beatId),
    ) ||
    blueprint.pagePlan.some((p) => new Set(p.beatIds).size !== p.beatIds.length)
  )
    fail(
      "Page mappings must cover ordered beats with only contiguous subdivisions.",
    );
}

function assertSources(
  request: StoryRequest,
  concept: StoryConcept,
  blueprint: StoryBlueprint,
): void {
  try {
    assertSourceData(request, concept, blueprint);
  } catch (error) {
    if (error instanceof AppError || error instanceof ValidationError)
      throw error;
    fail(
      "Malformed language source; supply a validated request, concept and canonical blueprint.",
    );
  }
}

type Phrase = (name: string, focus: string, detail: string) => string;
// Each register is authored directly; no MSA text is passed to an Egyptian
// substitution dictionary. Nominal action clauses avoid guessing actor gender.
const msa: Record<BeatAction, Phrase> = {
  recognize: (_n, f, d) => `هنا ${f}${d}.`,
  reveal: (_n, f, d) => `ها هو المشهد: ${f}${d}.`,
  repeat: (_n, f, d) => `مرة أخرى: ${f}${d}.`,
  notice: (n, f, d) => (n ? `كان انتباه ${n} إلى ${f}${d}.` : `هنا ${f}${d}.`),
  try: (n, f, d) => `كانت تجربة ${n} مع ${f}${d} بمساعدة.`,
  compare: (n, f, d) => `شملت مقارنة ${n} صفات ${f}${d}.`,
  "ask-help": (n, f, d) => `جاء طلب المساعدة من ${n} مع ${f}${d}.`,
  cooperate: (n, f, d) => `كان استكشاف ${n} مع ${f}${d} بالمشاركة.`,
  discover: (n, f, d) => `صار مكان ${f}${d} معروفًا لدى ${n}.`,
  solve: (n, f, d) => `اكتملت مهمة ${n} مع ${f}${d} بمساعدة.`,
  return: (n, f, d) => `إعادة ${f} إلى مكانها${d}، مع ${n}.`,
  settle: (n, f, d) => (n ? `هدوء ${n} مع ${f}${d}.` : `${f}${d}. بهدوء.`),
};
const egyptian: Record<BeatAction, Phrase> = {
  recognize: (_n, f, d) => `${f}${d}، هنا.`,
  reveal: (_n, f, d) => `أهو المنظر: ${f}${d}.`,
  repeat: (_n, f, d) => `تاني: ${f}${d}.`,
  notice: (n, f, d) => (n ? `انتباه ${n} كان لـ${f}${d}.` : `${f}${d}، هنا.`),
  try: (n, f, d) => `تجربة ${n} مع ${f}${d} كانت بمساعدة.`,
  compare: (n, f, d) => `مقارنة ${n} كانت بين تفاصيل ${f}${d}.`,
  "ask-help": (n, f, d) => `طلب المساعدة جه من ${n} مع ${f}${d}.`,
  cooperate: (n, f, d) => `تجربة ${n} مع ${f}${d} كانت بالمشاركة.`,
  discover: (n, f, d) => `مكان ${f}${d} بقى معروف عند ${n}.`,
  solve: (n, f, d) => `مهمة ${n} مع ${f}${d} خلصت بمساعدة.`,
  return: (n, f, d) => `رجوع ${f} لمكانها${d}، مع ${n}.`,
  settle: (n, f, d) => (n ? `${n} في هدوء مع ${f}${d}.` : `${f}${d}. بالراحة.`),
};
const english: Record<BeatAction, Phrase> = {
  recognize: (_n, f, d) => `Here is ${f}${d}.`,
  reveal: (_n, f, d) => `In view: ${f}${d}.`,
  repeat: (_n, f, d) => `Again: ${f}${d}.`,
  notice: (n, f, d) => (n ? `${n} notices ${f}${d}.` : `Here is ${f}${d}.`),
  try: (n, f, d) => `${n} explores ${f}${d} with help.`,
  compare: (n, f, d) => `${n} compares features of ${f}${d}.`,
  "ask-help": (n, f, d) => `${n} asks for help with ${f}${d}.`,
  cooperate: (n, f, d) => `${n} joins in exploring ${f}${d}.`,
  discover: (n, f, d) => `${n} finds where ${f} is${d}.`,
  solve: (n, f, d) => `${n} finishes the task with ${f}${d}, with help.`,
  return: (n, f, d) => `${n} returns ${f} to its familiar place${d}.`,
  settle: (n, f, d) => (n ? `${n} rests with ${f}${d}.` : `${f}${d}. Quietly.`),
};

// Agreement belongs to explicitly authored character metadata. Each row is a
// complete action phrase, not a translator; focal labels remain lexical slots.
const authoredArabic = {
  "ar-MSA-simple": {
    masculine: {
      recognize: (n, f, d) => `تعرّف ${n} على ${f}${d}.`,
      reveal: (n, f, d) => `كشف ${n} ${f}${d}.`,
      repeat: (n, f, d) => `تعرّف ${n} على ${f}${d} من جديد.`,
      notice: (n, f, d) => `لاحظ ${n} ${f}${d}.`,
      try: (n, f, d) => `جرّب ${n} ${f}${d} بمساعدة.`,
      compare: (n, f, d) => `قارن ${n} صفات ${f}${d}.`,
      "ask-help": (n, f, d) => `طلب ${n} المساعدة مع ${f}${d}.`,
      cooperate: (n, f, d) => `شارك ${n} في استكشاف ${f}${d}.`,
      discover: (n, f, d) => `اكتشف ${n} مكان ${f}${d}.`,
      solve: (n, f, d) => `أكمل ${n} المهمة مع ${f}${d} بمساعدة.`,
      return: (n, f, d) => `أعاد ${n} ${f} إلى المكان المألوف${d}.`,
      settle: (n, f, d) => `هدأ ${n} مع ${f}${d}.`,
    },
    feminine: {
      recognize: (n, f, d) => `تعرّفت ${n} على ${f}${d}.`,
      reveal: (n, f, d) => `كشفت ${n} ${f}${d}.`,
      repeat: (n, f, d) => `تعرّفت ${n} على ${f}${d} من جديد.`,
      notice: (n, f, d) => `لاحظت ${n} ${f}${d}.`,
      try: (n, f, d) => `جرّبت ${n} ${f}${d} بمساعدة.`,
      compare: (n, f, d) => `قارنت ${n} صفات ${f}${d}.`,
      "ask-help": (n, f, d) => `طلبت ${n} المساعدة مع ${f}${d}.`,
      cooperate: (n, f, d) => `شاركت ${n} في استكشاف ${f}${d}.`,
      discover: (n, f, d) => `اكتشفت ${n} مكان ${f}${d}.`,
      solve: (n, f, d) => `أكملت ${n} المهمة مع ${f}${d} بمساعدة.`,
      return: (n, f, d) => `أعادت ${n} ${f} إلى المكان المألوف${d}.`,
      settle: (n, f, d) => `هدأت ${n} مع ${f}${d}.`,
    },
  },
  "ar-EG": {
    masculine: {
      recognize: (n, f, d) => `${n} اتعرّف على ${f}${d}.`,
      reveal: (n, f, d) => `${n} كشف ${f}${d}.`,
      repeat: (n, f, d) => `${n} اتعرّف على ${f}${d} تاني.`,
      notice: (n, f, d) => `${n} خد باله من ${f}${d}.`,
      try: (n, f, d) => `${n} جرّب ${f}${d} بمساعدة.`,
      compare: (n, f, d) => `${n} قارن تفاصيل ${f}${d}.`,
      "ask-help": (n, f, d) => `${n} طلب مساعدة مع ${f}${d}.`,
      cooperate: (n, f, d) => `${n} شارك في استكشاف ${f}${d}.`,
      discover: (n, f, d) => `${n} اكتشف مكان ${f}${d}.`,
      solve: (n, f, d) => `${n} خلّص المهمة مع ${f}${d} بمساعدة.`,
      return: (n, f, d) => `${n} رجّع ${f} للمكان المألوف${d}.`,
      settle: (n, f, d) => `${n} هدي مع ${f}${d}.`,
    },
    feminine: {
      recognize: (n, f, d) => `${n} اتعرّفت على ${f}${d}.`,
      reveal: (n, f, d) => `${n} كشفت ${f}${d}.`,
      repeat: (n, f, d) => `${n} اتعرّفت على ${f}${d} تاني.`,
      notice: (n, f, d) => `${n} خدت بالها من ${f}${d}.`,
      try: (n, f, d) => `${n} جرّبت ${f}${d} بمساعدة.`,
      compare: (n, f, d) => `${n} قارنت تفاصيل ${f}${d}.`,
      "ask-help": (n, f, d) => `${n} طلبت مساعدة مع ${f}${d}.`,
      cooperate: (n, f, d) => `${n} شاركت في استكشاف ${f}${d}.`,
      discover: (n, f, d) => `${n} اكتشفت مكان ${f}${d}.`,
      solve: (n, f, d) => `${n} خلّصت المهمة مع ${f}${d} بمساعدة.`,
      return: (n, f, d) => `${n} رجّعت ${f} للمكان المألوف${d}.`,
      settle: (n, f, d) => `${n} هديت مع ${f}${d}.`,
    },
  },
} satisfies Record<
  "ar-MSA-simple" | "ar-EG",
  Record<"masculine" | "feminine", Partial<Record<BeatAction, Phrase>>>
>;

function edition(
  request: StoryRequest,
  concept: StoryConcept,
  blueprint: StoryBlueprint,
  mode: LanguageMode,
  draftId: string,
): LanguageEdition {
  const phrases =
    mode === "ar-MSA-simple" ? msa : mode === "ar-EG" ? egyptian : english;
  const seen = new Set<string>();
  const pages = blueprint.pagePlan.map((page) => {
    const narration = page.beatIds
      .map((id) => {
        const beat = concept.outline.find((b) => b.beatId === id)!;
        const focus = beat.focus[mode];
        const detail = beat.detail[mode] ? ` ${beat.detail[mode]}` : "";
        // A repeated page is a held view of the same beat, never a second attempt,
        // solution, return or new object. All supplied lexical content survives.
        if (seen.has(id)) return `${focus}${detail}.`;
        seen.add(id);
        if (request.ageMonths < 12) {
          // Infant pages are recognition/reveal/refrain units, not miniature plots.
          if (beat.action === "repeat")
            return mode === "ar-MSA-simple"
              ? `${focus}${detail}. مرة أخرى.`
              : mode === "ar-EG"
                ? `${focus}${detail}. تاني.`
                : `${focus}${detail}. Again.`;
          return `${focus}${detail}.`;
        }
        const actor = concept.characters.find(
          (c) => c.characterId === beat.actorId,
        );
        const name = actor?.displayName ?? "";
        const authored =
          mode !== "en" && actor?.grammaticalGender
            ? (
                authoredArabic[mode][actor.grammaticalGender] as Partial<
                  Record<BeatAction, Phrase>
                >
              )[beat.action]
            : undefined;
        const feminineObject = objectGrammar[beat.focus.en] === "feminine";
        const pluralObject = beat.focus.en === "three blocks";
        const possession =
          mode === "ar-EG" && pluralObject ? "هم" : feminineObject ? "ها" : "ه";
        let text = (authored ?? phrases[beat.action])(name, focus, detail);
        if (name && !actor?.grammaticalGender && mode !== "en") {
          if (beat.action === "recognize")
            text =
              mode === "ar-EG"
                ? `التعرّف على ${focus}${detail} كان من ${name}.`
                : `اكتمل تعرّف ${name} على ${focus}${detail}.`;
          if (beat.action === "reveal")
            text =
              mode === "ar-EG"
                ? `كشف ${focus}${detail} كان من ${name}.`
                : `اكتمل كشف ${name} عن ${focus}${detail}.`;
          if (beat.action === "repeat")
            text =
              mode === "ar-EG"
                ? `التعرّف على ${focus}${detail} كان تاني من ${name}.`
                : `اكتمل تعرّف ${name} على ${focus}${detail} مرة أخرى.`;
        }
        if (name && mode === "en") {
          if (beat.action === "recognize")
            text = `${name} recognises ${focus}${detail}.`;
          if (beat.action === "reveal")
            text = `${name} uncovers ${focus}${detail}.`;
          if (beat.action === "repeat")
            text = `${name} recognises ${focus}${detail} again.`;
        }
        if (
          beat.action === "notice" &&
          name &&
          mode !== "en" &&
          !actor?.grammaticalGender
        )
          text =
            mode === "ar-EG"
              ? `${focus} ${pluralObject ? "شدّوا" : feminineObject ? "لفتت" : "لفت"} انتباه ${name}${detail}.`
              : `${feminineObject ? "لفتت" : "لفت"} ${focus} انتباه ${name}${detail}.`;
        if (beat.action === "return" && mode !== "en") {
          const verb =
            actor?.grammaticalGender === "feminine"
              ? mode === "ar-EG"
                ? "رجّعت"
                : "أعادت"
              : mode === "ar-EG"
                ? "رجّع"
                : "أعاد";
          text = actor?.grammaticalGender
            ? mode === "ar-EG"
              ? `${name} ${verb} ${focus} لمكان${possession}${detail}.`
              : `${verb} ${name} ${focus} إلى مكان${possession}${detail}.`
            : mode === "ar-EG"
              ? `${focus} ${feminineObject ? "رجعت" : "رجع"} لمكان${possession}${detail} بفضل ${name}.`
              : `${feminineObject ? "عادت" : "عاد"} ${focus} إلى مكان${possession}${detail} بفضل ${name}.`;
        }
        if (mode === "en" && pluralObject) {
          if (
            beat.action === "recognize" ||
            (beat.action === "notice" && !name)
          )
            text = `Here are ${focus}${detail}.`;
          if (beat.action === "discover")
            text = `${name} finds where ${focus} are${detail}.`;
          if (beat.action === "return")
            text = `${name} returns ${focus} to their familiar place${detail}.`;
        }
        if (beat.action === "settle") {
          const withActor =
            name && beat.emotion === "warm"
              ? mode === "en"
                ? `With ${name}, `
                : `مع ${name}، `
              : "";
          text =
            mode === "en"
              ? `${withActor}${focus} ${pluralObject ? "rest in their" : "rests in its"} familiar place${detail}.`
              : mode === "ar-EG"
                ? `${withActor}${focus} ${pluralObject ? "ثابتين" : feminineObject ? "ثابتة" : "ثابت"} في مكان${possession}${detail}.`
                : `${withActor}${focus} ${feminineObject ? "مستقرة" : "مستقر"} في مكان${possession}${detail}.`;
        }
        // Labels alone do not invent a second object or an emotional transition.
        // The selected canonical emotion is independently expressed per register.
        if (
          name &&
          (beat.emotion === "reassured" ||
            (beat.emotion === "curious" &&
              request.ageMonths >= 24 &&
              beat.sequence === 1))
        ) {
          const female = actor?.grammaticalGender === "feminine";
          const feeling = beat.emotion === "curious";
          text +=
            mode === "en"
              ? ` ${name} ${feeling ? "is curious" : "feels reassured"}.`
              : !actor?.grammaticalGender
                ? mode === "ar-EG"
                  ? ` ${feeling ? `عند ${name} فضول` : `${name} في هدوء واطمئنان`}.`
                  : ` ${feeling ? `عند ${name} فضول` : `في قلب ${name} طمأنينة`}.`
                : mode === "ar-EG"
                  ? ` ${name} ${feeling ? (female ? "نفسها تعرف أكتر" : "نفسه يعرف أكتر") : female ? "مطمّنة" : "مطمّن"}.`
                  : ` ${name} ${feeling ? (female ? "فضولية" : "فضولي") : female ? "مطمئنة" : "مطمئن"}.`;
        }
        if (request.ageMonths >= 24 && beat.sequence > 1)
          text =
            mode === "en"
              ? `Then, ${text}`
              : mode === "ar-EG"
                ? `وبعد كده، ${text}`
                : `ثم ${text}`;
        return text;
      })
      .join(" ");
    return {
      pageId: page.pageId,
      narration,
      dialogue: [],
      altText: narration,
      wordCount: countWords(narration),
    };
  });
  return {
    languageVersionId: validate(Id, `${draftId}-${mode}`),
    mode,
    sourceRevision: blueprint.revisionId,
    status: "draft",
    diacriticsPolicy:
      "selective; preserve supplied marks; human review required",
    pages,
    totalWords: pages.reduce((total, page) => total + page.wordCount, 0),
    glossaryRefs: [`${mode}/house-style/0.1`],
    review: `Deterministic mock draft; ${languageInfo[mode].lang}/${languageInfo[mode].dir}. Full-story native read-aloud and canonical semantic review required. Caregiver cues remain in blueprint.parentParticipation.`,
  };
}

export function createStoryDraft(
  request: StoryRequest,
  concept: StoryConcept,
  blueprint: StoryBlueprint,
  draftId: string,
): StoryDraft {
  assertSources(request, concept, blueprint);
  try {
    validate(Id, draftId);
  } catch {
    fail(
      "Choose a non-empty canonical draft identifier using letters, digits, dots, underscores or hyphens.",
    );
  }
  if (draftId.length > 106)
    fail(
      "Draft identifiers must be at most 106 characters so every derived edition ID fits the canonical 120-character bound.",
    );
  return {
    schemaVersion: "story-draft/1.0",
    draftId,
    sourceRevision: blueprint.revisionId,
    conceptId: concept.conceptId,
    editions: request.languageModes.map((mode) =>
      edition(request, concept, blueprint, mode, draftId),
    ),
    provenance: { ...provenance },
    status: "draft",
  };
}

/** Deterministic advisory lint, not a certification of language or meaning. */
export function reviewStoryLanguage(
  request: StoryRequest,
  concept: StoryConcept,
  blueprint: StoryBlueprint,
  editions: readonly LanguageEdition[],
): QaFinding[] {
  const findings: QaFinding[] = [];
  const add = (
    severity: QaFinding["severity"],
    category: string,
    location: string,
    message: string,
    suggestedAction: string,
  ) =>
    findings.push({
      findingId: `language-${findings.length + 1}`,
      severity,
      category,
      location,
      message,
      suggestedAction,
    });
  try {
    assertSources(request, concept, blueprint);
  } catch (error) {
    add(
      "blocker",
      "language-source",
      "source",
      error instanceof Error ? error.message : "Invalid semantic source.",
      "Repair source mappings before drafting.",
    );
    return findings;
  }
  if (
    !same(
      editions.map((e) => e.mode),
      request.languageModes,
    ) ||
    new Set(editions.map((e) => e.languageVersionId)).size !== editions.length
  )
    add(
      "high",
      "language-modes",
      "editions",
      "Edition modes/order or identifiers do not match the requested set.",
      "Provide one uniquely identified edition per requested mode.",
    );
  if (
    request.languageModes.some((mode) => mode !== "en") &&
    concept.outline.some(
      (b) =>
        b.actorId !== null &&
        !concept.characters.find((c) => c.characterId === b.actorId)
          ?.grammaticalGender,
    )
  )
    add(
      "medium",
      "language-agreement",
      "characters",
      "Missing authored grammatical gender uses neutral nominal wording; names never determine agreement.",
      "Have the editor author agreement metadata or rewrite the nominal phrases before approval.",
    );
  for (const e of editions) {
    const mode = e.mode;
    if (!Object.hasOwn(languageInfo, mode)) {
      add(
        "blocker",
        "language-mode",
        "edition",
        "Unsupported language mode.",
        "Use a declared supported mode.",
      );
      continue;
    }
    if (e.sourceRevision !== blueprint.revisionId)
      add(
        "blocker",
        "language-source",
        e.languageVersionId,
        "Edition references a different source revision.",
        "Redraft from the current canonical revision.",
      );
    if (
      !same(
        e.pages.map((p) => p.pageId),
        blueprint.pagePlan.map((p) => p.pageId),
      )
    )
      add(
        "high",
        "language-pages",
        e.languageVersionId,
        "Edition page IDs/order differ from the canonical page plan.",
        "Restore exact page coverage and order.",
      );
    const expected = edition(request, concept, blueprint, mode, "qa-reference");
    for (const p of e.pages) {
      const location = `${mode}/${p.pageId}`;
      const plan = blueprint.pagePlan.find((page) => page.pageId === p.pageId);
      const allText = [
        p.narration,
        ...p.dialogue.map((d) => d.text),
        p.altText,
      ].join(" ");
      const spoken = [p.narration, ...p.dialogue.map((d) => d.text)].join(" ");
      if (bidiControls.test(allText))
        add(
          "high",
          "language-bidi",
          location,
          "Embedded direction controls can hide or reorder logical text.",
          "Review the original Unicode; use renderer lang/dir and isolated mixed spans.",
        );
      if (p.wordCount !== countWords(spoken))
        add(
          "high",
          "language-count",
          location,
          "Recorded word count differs from narration plus dialogue.",
          "Recalculate spoken text counts.",
        );
      for (const d of p.dialogue) {
        if (!concept.characters.some((c) => c.characterId === d.speakerId))
          add(
            "high",
            "language-speaker",
            location,
            "Dialogue speaker does not resolve to a canonical character.",
            "Restore the correct canonical speaker ID.",
          );
        else if (
          plan &&
          !plan.beatIds.some(
            (id) =>
              concept.outline.find((b) => b.beatId === id)?.actorId ===
              d.speakerId,
          )
        )
          add(
            "high",
            "language-speaker",
            location,
            "Dialogue speaker differs from the page's semantic actors.",
            "Review attribution against the canonical page actors.",
          );
      }
      if (plan)
        for (const id of plan.beatIds) {
          const beat = concept.outline.find((b) => b.beatId === id)!;
          if (
            ![beat.focus[mode], beat.detail[mode]]
              .filter(Boolean)
              .every((label) => spoken.includes(label))
          )
            add(
              "high",
              "language-semantic-label",
              location,
              "A supplied focal object/detail is missing or changed.",
              "Compare object identity, quantity and location with the canonical beat.",
            );
          const actor = concept.characters.find(
            (c) => c.characterId === beat.actorId,
          );
          const isHeldPage =
            blueprint.pagePlan.findIndex((page) => page.pageId === p.pageId) !==
            blueprint.pagePlan.findIndex((page) => page.beatIds.includes(id));
          if (
            actor &&
            request.ageMonths >= 12 &&
            !isHeldPage &&
            !spoken.includes(actor.displayName)
          )
            add(
              "high",
              "language-character",
              location,
              "Canonical actor identity is missing or changed in prose.",
              "Restore the actor identity or submit an explicitly reviewed equivalent reference.",
            );
        }
      if (
        p.narration !==
          expected.pages.find((page) => page.pageId === p.pageId)?.narration ||
        p.dialogue.length
      )
        add(
          "medium",
          "language-semantic-review",
          location,
          "Prose differs from the deterministic semantic draft; event/emotion/quantity equivalence is unverified.",
          "Review the complete page against its referenced canonical beats; do not treat lexical lint as equivalence.",
        );
      const stripped = spoken.normalize("NFD").replace(/\p{M}/gu, ""); // comparison only; never changes returned text
      if (
        mode === "ar-MSA-simple" &&
        /(?:^|\s)(?:عايز|عايزة|مش|دلوقتي|ازاي|إزاي|كده|هنجرب|تاني)(?=$|[\s،.!؟])/u.test(
          stripped,
        )
      )
        add(
          "medium",
          "language-register",
          location,
          "Possible Egyptian register in an MSA edition.",
          "Ask the native editor to check intentional versus accidental register.",
        );
      if (
        mode === "ar-EG" &&
        /(?:^|\s)(?:سوف|ليس|ليست|هؤلاء|ذلك|ماذا)(?=$|[\s،.!؟])/u.test(stripped)
      )
        add(
          "medium",
          "language-register",
          location,
          "Possible formal register in an Egyptian edition.",
          "Check the passage against the Egyptian house style.",
        );
      if (mode !== "en" && /[A-Za-z]/u.test(spoken))
        add(
          "low",
          "language-mixed-script",
          location,
          "Arabic prose contains Latin text or an identifier.",
          "Inspect mixed spans with logical Unicode and renderer isolation; labels may be intentional.",
        );
      if (/[\u0640]/u.test(allText))
        add(
          "low",
          "language-typography",
          location,
          "Manual kashida found.",
          "Review intentional spelling; do not force justification with text characters.",
        );
    }
    if (
      e.totalWords !==
      e.pages.reduce(
        (sum, p) =>
          sum +
          countWords([p.narration, ...p.dialogue.map((d) => d.text)].join(" ")),
        0,
      )
    )
      add(
        "high",
        "language-count",
        e.languageVersionId,
        "Edition total does not equal measured spoken page totals.",
        "Recalculate the edition total.",
      );
  }
  add(
    "medium",
    "language-human-review",
    "editions",
    "Full-story native read-aloud, semantic state/emotion comparison and Arabic agreement review remain required; lint does not certify quality.",
    "Review both Arabic editions independently and compare every beat, object quantity and factual claim; inspect rendered marks separately.",
  );
  return findings;
}

export class MockStoryDraftProvider implements StoryDraftProvider {
  readonly provenance = { ...provenance };
  async createDraft(
    request: StoryRequest,
    concept: StoryConcept,
    blueprint: StoryBlueprint,
    draftId: string,
  ): Promise<StoryDraft> {
    return createStoryDraft(request, concept, blueprint, draftId);
  }
}
