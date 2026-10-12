import {
  AppError,
  type StoryRequest,
  type StoryStructureProfile,
  type QaFinding,
} from "@hekayti/contracts";
import {
  BookIntentSchema,
  type BookIntent,
  type ScenePage,
  type BookDefaults,
} from "@hekayti/contracts/book";
import { StoryPlanSchema, type StoryPlan } from "@hekayti/contracts/planner";
import { storyStructureFor } from "./story-age";
import { canonicalJson } from "./index";
import { presentPlan } from "./creator-presentation";
export const defaultBookSettings: BookDefaults["settings"] = {
  preset: "SQUARE",
  widthMm: 200,
  heightMm: 200,
  safeMm: 10,
  gutterMm: 0,
  bleedMm: 3,
  pageNumbers: true,
};
export const infantCoveredProgression = [
  "يلحظ الطفل جزءًا مدورًا وناعمًا ظاهرًا من تحت قماشة مألوفة.",
  "يقترب من الشيء بهدوء وبدعم مألوف.",
  "يرفع شخص مألوف القماشة قليلًا فيظهر جزء أكبر من الشيء الناعم.",
  "ينتبه الطفل إلى الجزء الظاهر ويتعرف عليه بدعم مألوف.",
  "يتفاعل الطفل بلطف مع الجزء الظاهر بدعم مألوف.",
  "يستقر بهدوء بينما يقرأ له شخص مألوف، ثم ينام.",
];
const paths: BookDefaults["paths"] = [
  {
    key: "QUIET_DISCOVERY",
    title: "اكتشاف هادئ",
    steps: [
      "يلاحظ شيئًا مألوفًا",
      "يقترب بدعم مألوف",
      "يكشف ما يغطيه",
      "يتعرف عليه",
      "يتفاعل بلطف",
      "يهدأ",
    ],
    ageMin: 0,
    ageMax: 95,
  },
  {
    key: "BEDTIME",
    title: "استعداد للنوم",
    steps: [
      "يلحظ شيئًا مألوفًا",
      "يقترب",
      "يلمس بلطف",
      "يتعرف على الشيء",
      "يحتضنه",
      "يهدأ ويستقر للنوم",
    ],
    ageMin: 0,
    ageMax: 95,
  },
  {
    key: "RECOGNITION",
    title: "تعرف على شيء",
    steps: [
      "يرى شيئًا مألوفًا",
      "ينتبه إلى لونه",
      "يلمس ملمسه بدعم",
      "يسمع صوتًا لطيفًا",
      "يتعرف عليه",
      "يرتاح",
    ],
    ageMin: 0,
    ageMax: 23,
  },
  {
    key: "FEELINGS",
    title: "مشاعر وتهدئة",
    steps: [
      "يشعر بضيق بسيط",
      "يلحظ دعمًا مألوفًا",
      "يأخذ وقفة",
      "يجرب خطوة هادئة",
      "يهدأ",
      "يعود إلى نشاط مألوف",
    ],
    ageMin: 12,
    ageMax: 95,
  },
  {
    key: "DAILY_ROUTINE",
    title: "رحلة يومية",
    steps: [
      "يبدأ في البيت",
      "يستعد بمساعدة",
      "يمر بخطوات مألوفة",
      "يجرب خطوة صغيرة",
      "يكمل الروتين",
      "يرتاح",
    ],
    ageMin: 12,
    ageMax: 95,
  },
  {
    key: "SMALL_PROBLEM",
    title: "مشكلة صغيرة وحل",
    steps: [
      "يريد شيئًا واضحًا",
      "يلاحظ عائقًا صغيرًا",
      "يجرب",
      "يلحظ نتيجة المحاولة",
      "يغير الطريقة",
      "يصل إلى حل",
      "يستقر",
    ],
    ageMin: 24,
    ageMax: 95,
  },
  {
    key: "SHARING",
    title: "مشاركة وتبادل أدوار",
    steps: [
      "يبدأ اللعب مع صديق",
      "يريدان نفس اللعبة",
      "يسميان الدور",
      "يجرب الأول",
      "ينتظر ثم يجرب الآخر",
      "يكملان معًا",
      "يفرحان بما صنعاه",
    ],
    ageMin: 24,
    ageMax: 95,
  },
  {
    key: "ADVENTURE",
    title: "مغامرة قصيرة",
    steps: [
      "يريد الوصول إلى شيء",
      "يجد إشارة",
      "يبدأ رحلة قصيرة",
      "يواجه عائقًا آمنًا",
      "يجرب طريقًا آخر",
      "يتعاون",
      "يصل",
      "يعود",
    ],
    ageMin: 24,
    ageMax: 95,
  },
];
export function bookDefaults(
  ageMonths = 42,
  category = "adventure",
  goalPreset = "SHARING",
  mode = "ar-EG",
): BookDefaults {
  const infant = ageMonths < 12;
  const choices = paths.filter(
    (p) => ageMonths >= p.ageMin && ageMonths <= p.ageMax,
  );
  const ideas: BookDefaults["ideas"] = infant
    ? [
        {
          key: "cloth",
          title: "إيه تحت القماشة؟",
          description:
            "طرف شيء ناعم ومدور ظاهر تحت قماشة مألوفة؛ يلحظه الطفل، ويرفع شخص مألوف القماشة قليلًا فيظهر جزء أكبر، ثم يستريح الطفل بدعم مألوف.",
          ageMin: 0,
          ageMax: 11,
          category: "bedtime",
        },
        {
          key: "sound",
          title: "صوت مألوف",
          description:
            "صوت لطيف يتكرر، ويلحظ الطفل مصدره بمساعدة شخص مألوف ثم يرتاح.",
          ageMin: 0,
          ageMax: 11,
          category: "educational",
        },
        {
          key: "color",
          title: "لون جنب لون",
          description:
            "ينتبه الطفل إلى شيء مألوف ولونه وملمسه، خطوة صغيرة كل مرة.",
          ageMin: 0,
          ageMax: 11,
          category: "everyday-life",
        },
      ]
    : [
        {
          key: "turns",
          title: "دوري ودورك",
          description:
            "طفلان يريدان نفس اللعبة؛ يجربان علامة للدور ويتبادلان اللعب حتى يكملا معًا.",
          ageMin: 24,
          ageMax: 95,
          category: "behavioral",
        },
        {
          key: "routine",
          title: "خطوة قبل النوم",
          description:
            "روتين مألوف بمساعدة، وترتيب لعبة وكتاب ثم الاستقرار للنوم.",
          ageMin: 12,
          ageMax: 95,
          category: "bedtime",
        },
        {
          key: "route",
          title: "الطريق الصغير",
          description:
            "رحلة قريبة وآمنة، وإشارة واضحة وعائق بسيط ومحاولة جديدة للوصول.",
          ageMin: 24,
          ageMax: 95,
          category: "adventure",
        },
        {
          key: "feelings",
          title: "وقفة هادئة",
          description:
            "موقف صغير يسبب ضيقًا؛ يسمي الطفل شعوره ويتلقى دعمًا ثم يجرب مرة أخرى.",
          ageMin: 12,
          ageMax: 95,
          category: "emotional-learning",
        },
      ].filter((i) => ageMonths >= i.ageMin);
  if (mode === "en")
    return {
      ideas: ideas.map((i) => ({
        ...i,
        title: i.key,
        description: i.description,
      })),
      paths: choices,
      settings: defaultBookSettings,
    };
  return {
    ideas,
    paths: choices.sort(
      (a, b) =>
        Number(
          b.key ===
            (goalPreset === "SLEEP"
              ? "BEDTIME"
              : category === "adventure"
                ? "ADVENTURE"
                : "SHARING"),
        ) -
        Number(
          a.key ===
            (goalPreset === "SLEEP"
              ? "BEDTIME"
              : category === "adventure"
                ? "ADVENTURE"
                : "SHARING"),
        ),
    ),
    settings: defaultBookSettings,
  };
}
export function guidedAgeStructure(
  r: StoryRequest,
  intent: BookIntent,
): StoryStructureProfile {
  const base = storyStructureFor(r),
    age = r.ageMonths;
  const pages: [number, number] =
    age < 12
      ? [4, 6]
      : age < 24
        ? [6, 8]
        : age < 36
          ? [8, 10]
          : age < 60
            ? [10, 12]
            : [10, 16];
  return {
    ...base,
    beatRange: [2, 32],
    pageRange:
      intent.path.mode === "CUSTOM"
        ? [intent.path.steps.length, intent.path.steps.length]
        : intent.length === "SHORT"
          ? [pages[0], pages[0]]
          : intent.length === "LONG"
            ? [pages[1], pages[1]]
            : [pages[1], pages[1]],
    activeCharacterRange: age < 12 ? [0, 1] : [1, base.activeCharacterRange[1]],
  };
}
const normalize = (s: string) =>
  s.normalize("NFKC").replace(/[\u064b-\u065f\u0670]/g, "");
const negatedAction = (s: string) =>
  /(?:^|\s)(?:لا|ولا|لن|ليس|ليست|بدون|دون|عدم|مش)\s|(?:^|\s)ما\s+\p{L}+ش(?=\s|[.!؟،]|$)|\b(?:not|never|without|cannot|can't|don't|doesn't|no)\b/iu.test(
    normalize(s),
  );
const familiarAdultAction = (s: string) => /(?:ال)?شخص\s+(?:ال)?مألوف|familiar person/iu.test(normalize(s));
export function composeGuidedStoryPlan(
  base: StoryPlan,
  input: BookIntent,
): StoryPlan {
  const intent = BookIntentSchema.parse(input),
    r = base.planning.request,
    infant = r.ageMonths < 12;
  const key =
    intent.path.key ??
    (r.ageMonths < 24
      ? r.primaryCategory === "bedtime"
        ? "BEDTIME"
        : infant
          ? "QUIET_DISCOVERY"
          : "DAILY_ROUTINE"
      : r.primaryCategory === "adventure"
        ? "ADVENTURE"
        : r.primaryCategory === "bedtime"
          ? "BEDTIME"
          : "SMALL_PROBLEM");
  const path = paths.find((p) => p.key === key)!;
  if (r.ageMonths < path.ageMin)
    throw new AppError(
      "BOOK_PATH_AGE",
      "هذا المسار يحتاج عمرًا أكبر؛ اختر اكتشافًا هادئًا أو روتينًا بدعم.",
    );
  const original = normalize(intent.idea.text),
    cloth =
      /قماش|غطاء|cloth|fabric/i.test(original) &&
      /ناعم|لعب|مدور|toy|soft/i.test(original);
  // Preserve the existing richer preschool adventure when the creator asks for automatic structure.
  const compatibleIdea =
    /(?:مشارك|تبادل|دورك|دوري|أدوار|ادوار|sharing|taking turns)/iu.test(
      original,
    ) &&
    "quality" in base &&
    base.quality.objectiveIntent.primaryIntent === "SHARING_TURN_TAKING";
  const preserve = !infant && intent.path.mode === "AUTO" && compatibleIdea;
  const presentation = presentPlan(base, r.primaryLanguageMode);
  const steps =
    intent.path.mode === "CUSTOM"
      ? intent.path.steps
      : preserve
        ? presentation.events.map((event) => event.action)
        : cloth && intent.path.mode === "AUTO"
          ? infant ? infantCoveredProgression : [
              "يلحظ الطفل جزءًا مدورًا وناعمًا ظاهرًا من تحت قماشة مألوفة.",
              "يقترب من الشيء بهدوء وبدعم مألوف.",
              "يرفع القماشة فيكشف الشيء الناعم.",
              "يظهر الشيء كاملًا ويتعرف عليه.",
              "يحمل الشيء ويحتضنه.",
              "يستقر بهدوء بينما يقرأ له شخص مألوف، ثم ينام.",
            ]
          : path.steps.map((step) =>
              intent.path.mode === "AUTO"
                ? `${step} — ضمن فكرة صاحب القصة: ${intent.idea.text}`
                : step,
            );
  const chars = infant ? base.characters.slice(0, 1) : base.characters;
  const actor = chars[0]?.characterId ?? null;
  const entityIds = {
    child: actor ?? `${base.revisionId}-observer`,
    object: `${base.revisionId}-object`,
    cloth: `${base.revisionId}-cloth`,
  };
  let states: ScenePage["before"] = chars.map((c) => ({
    entityId: c.characterId,
    kind: "CHARACTER",
    name: c.displayName,
    location: base.setting.description,
    visibility: "VISIBLE",
    heldBy: null,
    coveredBy: null,
    state: "موجود في مكان مألوف",
  }));
  if (cloth)
    states.push(
      {
        entityId: entityIds.object,
        kind: "PROP",
        name: "الشيء الناعم المدور",
        location: base.setting.description,
        visibility: "PARTIAL",
        heldBy: null,
        coveredBy: entityIds.cloth,
        state: "جزء منه ظاهر تحت القماشة",
      },
      {
        entityId: entityIds.cloth,
        kind: "PROP",
        name: "القماشة المألوفة",
        location: base.setting.description,
        visibility: "VISIBLE",
        heldBy: null,
        coveredBy: null,
        state: "تغطي جزءًا من الشيء",
      },
    );
  // This is bounded interpretation of actual authored events, not a generic prop reset.
  const propPatterns: [string, RegExp][] = [
    ["الكرة الناعمة", /soft ball|\bball\b|كرة/iu],
    ["السيارة اللعبة", /toy car|سيارة/iu],
    ["اللعبة", /\btoy\b|لعبة/iu],
    ["السلة", /\bbasket\b|سلة/iu],
    ["البساط", /\bmat\b|بساط|حصير/iu],
    ["شريط الكرتون", /cardboard (?:strip|ramp)|شريط كرتون/iu],
    ["بطاقة الدور", /turn card|بطاقة الدور/iu],
    ["الكتاب", /\bbook\b|كتاب/iu],
  ];
  const allEvents = preserve
      ? base.beats.map((b) => b.summary).join(" ")
      : steps.join(" "),
    opening = preserve ? base.openingState : "";
  const props = preserve
    ? propPatterns.filter(
        ([name, pattern]) =>
          pattern.test(allEvents) &&
          !(name === "اللعبة" && /soft ball|toy car/i.test(allEvents)),
      )
    : [];
  props.forEach(([name, pattern], index) =>
    states.push({
      entityId: `${base.revisionId.slice(0, 65)}-prop-${index}`,
      kind: "PROP",
      name,
      location: base.setting.description,
      visibility: pattern.test(opening) ? "VISIBLE" : "OUT_OF_SCENE",
      heldBy: null,
      coveredBy: null,
      state: pattern.test(opening)
        ? "ظاهر في افتتاح المشهد"
        : "لم يظهر بعد في أحداث القصة",
    }),
  );
  const scenes: ScenePage[] = steps.map((step, i) => {
    const before = structuredClone(states),
      s = normalize(preserve ? base.beats[i]!.summary : step),
      after = structuredClone(states);
    let known = preserve;
    const denied = negatedAction(s);
    if (preserve) {
      props.forEach(([name, pattern]) => {
        const e = after.find((e) => e.name === name)!;
        if (pattern.test(s) && !denied) {
          e.visibility = "VISIBLE";
          e.state = step;
        }
      });
      const movable = after.find((e) =>
        ["الكرة الناعمة", "السيارة اللعبة", "اللعبة"].includes(e.name),
      );
      if (movable && !denied) {
        const holder = chars.find((c) => s.includes(`${c.displayName} holds`));
        if (holder) movable.heldBy = holder.characterId;
        if (/\brolls?\b|\brolling\b|يدحرج|تدحرج/iu.test(s))
          movable.heldBy = null;
        if (
          /toy reaches.*basket|leaves the toy resting inside|اللعبة.*(?:داخل|في).*السلة/iu.test(
            s,
          )
        ) {
          movable.location = "داخل السلة";
          movable.heldBy = null;
        }
        if (/pass|swap|returned.*partner/iu.test(s)) {
          movable.heldBy = null;
          movable.state = step + " — راجع اليد التي تحمل اللعبة في هذه اللحظة";
          known = false;
        }
      }
      if (denied) known = false;
    }
    if (cloth && !denied) {
      const toy = after.find((e) => e.entityId === entityIds.object)!,
        fabric = after.find((e) => e.entityId === entityIds.cloth)!;
      if (/يرفع|ترفع|رفع|تكشف|يكشف|كشف|lift|uncover/i.test(s)) {
        const partly = /قليلا|شوية|جزء|جزئي|partial|portion/iu.test(s);
        toy.visibility = partly ? "PARTIAL" : "VISIBLE";
        toy.coveredBy = partly ? entityIds.cloth : null;
        toy.state = partly ? step : "ظهر بعد رفع القماشة";
        fabric.state = partly ? "مرفوعة قليلًا وتبقى تغطي بقية الشيء" : "مرفوعة بعيدًا عن الشيء";
        known = true;
      }
      if (/تحضن|يحضن|يحتضن|تحتضن|يحمل|تحمل|hug|hold/i.test(s)) {
        if (toy.coveredBy)
          throw new AppError(
            "BOOK_PHYSICAL_STATE",
            "اكشف الشيء قبل حمله أو احتضانه.",
          );
        toy.heldBy = actor;
        toy.state = "محمول ومحتضن";
        known = true;
      }
      if (
        /يظهر|تظهر|ظاهر|يشوف|تشوف|تلاحظ|يلحظ|ينتبه|تقرب|يقترب|قرب|ينام|تنام|يهدأ|تهدأ|يستقر|settle|sleep/i.test(
          s,
        )
      )
        known = true;
    }
    const child = after.find((e) => e.entityId === actor);
    if (child && !(infant && familiarAdultAction(s))) child.state = step;
    states = after;
    return {
      pageNumber: i + 1,
      beatId: preserve
        ? base.beats[i]!.beatId
        : `${base.revisionId.slice(0, 70)}-guided-${i + 1}`,
      creatorStep: i,
      intent: step,
      action: step,
      before,
      after,
      reviewRequired: !known,
    };
  });
  const beats = preserve
    ? base.beats
    : scenes.map((scene, i) => ({
        beatId: scene.beatId,
        sequence: i + 1,
        role:
          i === steps.length - 1
            ? ("ENDING" as const)
            : i === 0
              ? ("OPENING" as const)
              : i === steps.length - 2
                ? ("RESOLUTION" as const)
                : ("RECOGNITION" as const),
        action:
          i === steps.length - 1
            ? ("settle" as const)
            : !negatedAction(scene.intent) && /كشف|يرفع|ترفع/.test(scene.intent)
              ? ("reveal" as const)
              : ("notice" as const),
        // Familiar support is not a fabricated, approved character identity.
        // Leave its actor unresolved instead of assigning an adult action to the infant.
        actorId: infant && familiarAdultAction(scene.intent) ? null : actor,
        locationId: base.setting.locationId,
        fromLocationId: null,
        beforeState: i ? scenes[i - 1]!.intent : base.openingState,
        afterState: scene.intent,
        summary: scene.intent,
        emotion: infant ? "طمأنينة وفضول هادئ" : "اهتمام وتقدم",
        causes: i ? [scenes[i - 1]!.beatId] : [],
        setupRefs: i ? [scenes[0]!.beatId] : [],
        introduces: i ? [] : chars.map((c) => c.characterId),
        requires: [],
        establishes: [],
        addressesProblemId: null,
        achievesGoalId: i === steps.length - 2 ? base.goal.goalId : null,
        progress: scene.intent,
      }));
  if (!("quality" in base))
    throw new AppError("BOOK_PLAN_VERSION", "Current writer plan is required.");
  const common = base;
  return StoryPlanSchema.parse({
    ...common,
    quality: {
      ...base.quality,
      situation: {
        ...base.quality.situation,
        focus: intent.idea.text,
        initialFriction: preserve
          ? base.quality.situation.initialFriction
          : null,
        resolutionMethod: scenes.at(-1)!.intent,
      },
      transitions: scenes.map((scene) => ({
        beatId: scene.beatId,
        participantIds: chars.map((c) => c.characterId),
        strategy: scene.intent,
        informationChange: scene.intent,
        relationshipChange: infant
          ? "دعم مألوف وطمأنينة"
          : "تقدم في المسار المختار",
        consequence: scene.intent,
        resolutionMethod:
          scene.pageNumber === scenes.length - 1 ? scene.intent : null,
      })),
    },
    schemaVersion: "story-plan/1.3",
    characters: chars,
    protagonistId: actor,
    recognitionSubject: actor ? null : intent.idea.text,
    title: base.title,
    guidance: guidedAgeStructure(r, intent),
    problem: preserve ? base.problem : null,
    stakes: preserve ? base.stakes : null,
    incitingBeatId: preserve ? base.incitingBeatId : null,
    turningBeatId: preserve ? base.turningBeatId : null,
    climaxBeatId: preserve ? base.climaxBeatId : null,
    beats,
    resolutionBeatId: preserve ? base.resolutionBeatId : beats.at(-2)!.beatId,
    endingBeatId: beats.at(-1)!.beatId,
    provenance: {
      ...base.provenance,
      mechanism: infant
        ? cloth
          ? "reveal"
          : "recognition"
        : base.provenance.mechanism,
      limitations: [
        ...base.provenance.limitations,
        "Creator idea/path remains authoritative; scene interpretation is bounded and requires human review.",
      ],
    },
    guided: {
      schemaVersion: "guided-story/1.0",
      intent,
      scenes,
      reviewRequired: scenes.some((s) => s.reviewRequired),
    },
  });
}
export function validateGuidedPlan(
  p: Extract<StoryPlan, { schemaVersion: "story-plan/1.3" }>,
): QaFinding[] {
  const result: QaFinding[] = [];
  const add = (
    category: string,
    message: string,
    severity: QaFinding["severity"] = "medium",
  ) =>
    result.push({
      findingId: `guided-${result.length + 1}`,
      category,
      message,
      severity,
      location: "guided",
      suggestedAction:
        "راجع الفكرة وتسلسل المشهد؛ الفحص المحلي ليس حكمًا أدبيًا.",
    });
  if (
    p.guided.intent.path.mode === "CUSTOM" &&
    canonicalJson(p.guided.scenes.map((s) => s.intent)) !==
      canonicalJson(p.guided.intent.path.steps)
  )
    add("CREATOR_PATH_AUTHORITY", "Creator event order was changed.", "high");
  for (const [i, scene] of p.guided.scenes.entries())
    if (
      i &&
      canonicalJson(scene.before) !==
        canonicalJson(p.guided.scenes[i - 1]!.after)
    )
      add(
        "PHYSICAL_STATE_CONFLICT",
        "Scene state changed without an event.",
        "high",
      );
  if (p.guided.reviewRequired)
    add(
      "NATURAL_LANGUAGE_REVIEW",
      "بعض الخطوات الحرة محفوظة كما كتبتها وتحتاج مراجعة لمعناها وحالة الأشياء.",
    );
  if (
    p.planning.request.ageMonths < 12 &&
    /شرير|قتال|عنف|مغامرة|يفاوض|negotiat|villain|fight/i.test(
      p.guided.intent.path.steps.join(" "),
    )
  )
    add(
      "AGE_COMPLEXITY",
      "Infant path contains an unsuitable conflict or negotiation.",
      "high",
    );
  return result;
}
export function naturalWriterContext(p: StoryPlan): string {
  if (p.schemaVersion !== "story-plan/1.3") return "";
  return [
    "نية صاحب القصة — المرجع الأساسي",
    p.guided.intent.idea.text,
    "المسار المختار وخطواته الأصلية",
    p.guided.scenes.map((s, i) => `${i + 1}. ${s.intent}`).join("\n"),
    "طبقة السرد الطبيعي",
    "الحدث الداخلي ليس جملة نهائية. احك اللحظة بدافع بسيط وانتقال ملموس ورد فعل، لا تعيد صياغة بيانات الحالة كسرد. تجنب الوعظ والحشو والتكرار بلا تغيير. حافظ على الفكرة حتى إن كانت غير مألوفة؛ لا تستبدلها بقالب عام.",
    p.planning.request.ageMonths < 12
      ? "للرضيع: خطوة حسية واحدة في الصفحة، تغيير صغير وتكرار دافئ للقراءة من شخص مألوف. لا مشكلة مصطنعة ولا استقلال أو تفاوض. نهاية هادئة؛ هذا اختيار تحريري وليس ضمانًا نمائيًا أو طبيًا."
      : "راعي تعقيد العمر ودافع الشخصية وسبب كل محاولة ونتيجتها.",
    "حالة المشهد قبل وبعد — حقائق بصرية وليست نصًا يُنسخ",
    canonicalJson(p.guided.scenes),
    "عندما تكون حالة عنصر غير معروفة لا تخترع انتقالًا؛ اتبع الخطوة الأصلية وبيّن الحاجة لمراجعة بشرية.",
  ].join("\n");
}
