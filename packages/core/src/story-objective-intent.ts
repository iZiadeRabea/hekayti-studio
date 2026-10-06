import {
  ObjectiveIntentSchema,
  type ObjectiveIntent,
  type StructuralCompatibility,
} from "@hekayti/contracts/planner";
import type { StoryRequest } from "@hekayti/contracts";
import type { LibraryRecord } from "@hekayti/contracts/library";

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[\u064b-\u065f\u0670]/g, "");
const rules: [ObjectiveIntent["primaryIntent"], RegExp, string[], string[]][] =
  [
    [
      "SHARING_TURN_TAKING",
      /\b(?:shar(?:e|es|ing) (?:a |the )?(?:toy|ball|game|object)|tak(?:e|es|ing) turns?|turn[- ]taking|alternat(?:e|ing) turns?)\b|(?:مشاركة|يشارك|نشارك|شارك)\s+(?:في\s+)?(?:ال)?(?:لعبة|كرة|ألعاب|العاب|شيء)|تبادل الأدوار|تبادل الادوار|يتناوب|نتناوب/,
      ["reciprocity", "exchange", "turn-taking"],
      [
        "two active participants where age permits",
        "shared object or activity",
        "visible reciprocal success",
      ],
    ],
    [
      "CONNECTION_REPAIR",
      /\b(?:apolog\w*|repair (?:a |the )?friendship|make amends|reconcil\w*)\b|اعتذار|تصالح/,
      ["repair", "listening"],
      ["hurt relationship", "acknowledgment", "visible repair"],
    ],
    [
      "EMOTIONAL_REGULATION",
      /\b(?:calm|anger|angry|frustrat\w*|worried|anxious|fear|sad(?:ness)?|feelings?|emotions?)\b|مشاعر|غضب|خوف|حزن|يهدأ|اهدأ/,
      [],
      ["recognizable feeling", "supported coping action", "visible settling"],
    ],
    [
      "COOPERATION_HELPING",
      /\b(?:cooperat\w*|teamwork|help(?:ing)? (?:a |the |each |one )?(?:friend|other|another)|work(?:ing)? together)\b|تعاون|يساعد|مساعدة/,
      ["cooperation", "helping"],
      ["shared task", "complementary actions", "joint outcome"],
    ],
    [
      "ROUTINE_HABIT",
      /\b(?:bedtime|sleep|brush\w*|wash\w*|tidy\w*|routine|habit)\b|نوم|غسل|تنظيف|روتين|ترتيب/,
      [],
      [
        "familiar materials",
        "supported sequence",
        "repeatable calm completion",
      ],
    ],
    [
      "LEARNING_DISCOVERY",
      /\b(?:count\w*|numbers?|colou?rs?|shapes?|float\w*|sink\w*|sort\w*|observe\w*|discover\w*|compar\w*)\b|عد الأ|اعداد|ألوان|الوان|اشكال|أشكال|يطفو|يغرق|يلاحظ/,
      [],
      ["concrete objects", "observable contrast", "demonstrated discovery"],
    ],
  ];
export function detectObjectiveIntent(
  objective: StoryRequest["objective"],
): ObjectiveIntent {
  // Bounded local polarity, not a general language parser. Keep numeric/object
  // evidence intact; suppress only a match preceded by a nearby explicit denial.
  const denied = (text: string, index: number) =>
    /(?:\b(?:not|never|without|avoid|avoiding|cannot|can't|don't|doesn't|isn't|no)|(?:^|\s)(?:لا|ليس|بدون|دون|لن|عدم))\s+(?:[\p{L}]+\s+){0,4}$/u.test(
      text
        .slice(0, index)
        .split(/[.;!?،؛]/u)
        .at(-1) ?? "",
    );
  const candidates: {
    primaryIntent: ObjectiveIntent["primaryIntent"];
    evidence: ObjectiveIntent["evidence"];
    socialMechanisms: string[];
    storyNeeds: string[];
  }[] = [];
  for (const [primaryIntent, rule, socialMechanisms, storyNeeds] of rules) {
    if (
      primaryIntent === "LEARNING_DISCOVERY" &&
      objective.kind !== "educational"
    )
      continue;
    let hasDenial = false;
    const evidence = (["description", "successScenario"] as const).flatMap(
      (field) => {
        const text = normalize(objective[field]);
        const matches = [...text.matchAll(new RegExp(rule.source, "gu"))];
        const positive = matches.filter((match) => {
          if (!denied(text, match.index)) return true;
          hasDenial = true;
          return false;
        });
        // Retain the original first evidence per field for unchanged positives.
        return positive[0] ? [{ field, matched: positive[0][0] }] : [];
      },
    );
    // Contradictory positive/negative wording for the same operation is outside
    // this small classifier. Do not turn it into a confident positive objective.
    if (evidence.length && !hasDenial)
      candidates.push({
        primaryIntent,
        evidence,
        socialMechanisms,
        storyNeeds,
      });
  }
  const successes = candidates.filter((c) =>
    c.evidence.some((e) => e.field === "successScenario"),
  );
  const kindIntent =
    objective.kind === "educational"
      ? "LEARNING_DISCOVERY"
      : objective.kind === "emotional"
        ? "EMOTIONAL_REGULATION"
        : null;
  // The observable positive success operation outranks incidental description
  // words; kind resolves supported emotional/educational competing evidence.
  const selected =
    successes.find((c) => c.primaryIntent === kindIntent) ??
    (successes.length === 1 ? successes[0] : undefined) ??
    (successes.length === 0
      ? candidates.find((c) => c.primaryIntent === kindIntent)
      : undefined) ??
    (successes.length === 0 && candidates.length === 1
      ? candidates[0]
      : undefined);
  if (selected)
    return ObjectiveIntentSchema.parse({
      schemaVersion: "objective-intent/1.0",
      ...selected,
      limited: false,
    });
  const primaryIntent =
    objective.kind === "educational"
      ? "GENERAL_EDUCATIONAL"
      : objective.kind === "emotional"
        ? "GENERAL_EMOTIONAL"
        : objective.kind === "entertainment"
          ? "GENERAL_ENTERTAINMENT"
          : "GENERAL_BEHAVIORAL";
  return ObjectiveIntentSchema.parse({
    schemaVersion: "objective-intent/1.0",
    primaryIntent,
    evidence: [{ field: "kind", matched: objective.kind }],
    socialMechanisms: [],
    storyNeeds: [
      "limited rule coverage; creator must review objective delivery",
    ],
    limited: true,
  });
}

// Only actual structural fields: never titles, source names, family IDs or themes.
export function structuralFields(
  record: LibraryRecord,
): { field: string; value: string }[] {
  const fields: { field: string; value: string }[] = [];
  if (record.payload.type === "STORY_FAMILY")
    for (const key of [
      "mechanism",
      "conflictPattern",
      "narrativePattern",
      "resolutionPattern",
    ] as const)
      fields.push({
        field: `payload.structure.${key}`,
        value: record.payload.structure[key],
      });
  const dna = record.creative?.dna;
  if (dna?.pattern)
    for (const key of [
      "mechanism",
      "conflictCategory",
      "attemptSequence",
      "turn",
      "resolutionCategory",
    ] as const)
      fields.push({
        field: `creative.dna.pattern.${key}`,
        value: dna.pattern[key],
      });
  if (dna)
    for (const key of [
      "conflictType",
      "attemptSequence",
      "resolution",
    ] as const) {
      const value = dna.fields[key]?.value;
      if (value) fields.push({ field: `creative.dna.fields.${key}`, value });
    }
  return fields;
}
const compatibilityRules: Partial<
  Record<ObjectiveIntent["primaryIntent"], RegExp>
> = {
  SHARING_TURN_TAKING:
    /reciproc|cooperat|collective|exchang|taking turns|turn-taking|shared activity|mutual/,
  COOPERATION_HELPING:
    /cooperat|collective|reciproc|help|assist|together|mutual/,
  CONNECTION_REPAIR: /repair|apolog|reconcil|reciproc|trust|restitut/,
  EMOTIONAL_REGULATION:
    /emotion|reassur|calm|settle|regulat|support|fear|recognition/,
  ROUTINE_HABIT: /routine|repeat|sequence|calm|settle|familiar|habit/,
  LEARNING_DISCOVERY:
    /discover|observ|compar|contrast|test|reveal|recogn|learning/,
};
export function objectiveStructureCompatibility(
  intent: ObjectiveIntent,
  records: LibraryRecord[],
): StructuralCompatibility {
  const rule = compatibilityRules[intent.primaryIntent];
  if (!records.length)
    return {
      level: "REVIEW",
      evidence: [],
      reasons: [
        "No Library evidence; concrete editorial fallback is not a source match.",
      ],
    };
  if (!rule)
    return {
      level: "REVIEW",
      evidence: [],
      reasons: [
        "General intent has limited semantic coverage; no specific structure fit claimed.",
      ],
    };
  const evidence = records
    .flatMap(structuralFields)
    .flatMap(({ field, value }) => {
      const matched = normalize(value).match(rule)?.[0];
      return matched ? [{ field, matched }] : [];
    })
    .slice(0, 30);
  const groups = new Set(
    evidence.map((e) =>
      e.field.includes("mechanism")
        ? "mechanism"
        : e.field.includes("resolution")
          ? "resolution"
          : e.field.includes("attempt") || e.field.includes("narrative")
            ? "attempt"
            : "conflict/turn",
    ),
  );
  const level =
    groups.size >= 2 ? "STRONG" : evidence.length ? "ACCEPTABLE" : "MISMATCH";
  return {
    level,
    evidence,
    reasons: [
      evidence.length
        ? `Explicit ${intent.primaryIntent} signals in ${[...groups].join(", ")}; editorial adaptation still needs review.`
        : `No explicit structural evidence for ${intent.primaryIntent}; do not infer fit from title/theme.`,
    ],
  };
}
export const compatibilityPriority = (c: StructuralCompatibility) =>
  ({ STRONG: 3, ACCEPTABLE: 2, REVIEW: 1, MISMATCH: 0 })[c.level];
