import {
  AppError,
  ageBandFor,
  BlueprintSchema,
  validate,
  type StoryRequest,
  type StoryStructureProfile,
  type StoryConcept,
  type ConceptSet,
  type ConceptEvaluation,
  type StoryBlueprint,
  type StoryBeat,
  type Page,
  type QaFinding,
  type IdeaComponent,
  type IdeaComponentKind,
  type LocalizedText,
  type BeatAction,
  type StoryConceptProvider,
} from "@hekayti/contracts";
import {
  StoryRequestSchema,
  StoryStructureProfileSchema,
  StoryConceptSchema,
  ConceptSetSchema,
} from "@hekayti/contracts/story";
import { PlannedConceptSetSchema } from "@hekayti/contracts/planner";

const loc = (msa: string, eg: string, en: string): LocalizedText => ({
  "ar-MSA-simple": msa,
  "ar-EG": eg,
  en,
});
const objects = [
  loc("الكرة", "الكورة", "the ball"),
  loc("السلة", "السلة", "the basket"),
  loc("الشريط", "الشريط", "the ribbon"),
  loc("الورقة", "الورقة", "the leaf"),
];
const places = [
  loc("في الحديقة", "في الجنينة", "in the garden"),
  loc("في الغرفة", "في الأوضة", "in the room"),
  loc("بجانب النافذة", "جنب الشباك", "beside the window"),
];
const kinds: IdeaComponentKind[] = [
  "theme",
  "objective",
  "setting",
  "character-archetype",
  "mechanism",
  "challenge",
  "conflict",
  "discovery",
  "resolution",
  "emotional-goal",
  "educational-goal",
];
/** Independent reusable choices; these entries contain no complete story. */
const choices: Record<IdeaComponentKind, readonly string[]> = {
  theme: ["familiar objects", "gentle change", "shared exploration"],
  objective: [
    "recognize one object",
    "practice a supported action",
    "notice a visible difference",
  ],
  setting: ["garden corner", "quiet room", "window nook"],
  "character-archetype": [
    "curious observer",
    "supported learner",
    "warm companion",
  ],
  mechanism: ["recurrence", "comparison", "cooperation"],
  challenge: ["notice a variation", "attempt a small task", "request support"],
  conflict: ["no conflict", "supported friction", "bounded problem"],
  discovery: ["familiar shape", "new position", "shared possibility"],
  resolution: ["settle together", "recognize again", "return reassured"],
  "emotional-goal": ["connection", "supported curiosity", "reassurance"],
  "educational-goal": [
    "object recognition",
    "visible comparison",
    "supported practice",
  ],
};
export const ideaComponents: readonly IdeaComponent[] = kinds.flatMap((kind) =>
  choices[kind].map((choice, i) => ({
    componentId: `component-${kind}-${i}`,
    kind,
    label: loc(choice, choice, choice),
    description: choice,
  })),
);
export const mockStoryProvenance = {
  kind: "mock",
  providerId: "mock-story-components",
  version: "1.0",
  deterministic: true,
} as const;
function id(base: string, suffix: string): string {
  // bounded IDs retain identity even for long imported IDs
  let hash = 2166136261;
  for (const c of base) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `${base.slice(0, 65)}-${(hash >>> 0).toString(16)}-${suffix}`;
}
function check(request: StoryRequest, structure: StoryStructureProfile) {
  validate(StoryRequestSchema, request);
  validate(StoryStructureProfileSchema, structure);
  if (ageBandFor(request.ageMonths) !== structure.ageBandId)
    throw new AppError(
      "STORY_STRUCTURE",
      "Structure age band does not match request.",
    );
  if (request.ageMonths < 24 && request.primaryCategory === "adventure")
    throw new AppError(
      "STORY_AGE_ELIGIBILITY",
      "Adventure requires a reviewed older-child structure.",
    );
}
function ownership(r: StoryRequest, c: StoryConcept) {
  validate(StoryConceptSchema, c);
  if (
    c.requestId !== r.requestId ||
    c.requestRevisionId !== r.revisionId ||
    c.primaryCategory !== r.primaryCategory ||
    JSON.stringify(c.objective) !== JSON.stringify(r.objective)
  )
    throw new AppError(
      "STORY_SELECTION",
      "Selected concept must belong to this request revision and preserve its objective/category.",
    );
  const facts = new Set(r.trustedFacts.map((f) => f.factId));
  if (c.outline.some((b) => b.factIds.some((f) => !facts.has(f))))
    throw new AppError(
      "STORY_FACT_REFERENCE",
      "Concept references an unknown trusted fact.",
    );
}
const mechanismActions: Record<string, BeatAction[]> = {
  recognition: ["recognize", "repeat", "notice", "repeat", "settle"],
  reveal: ["notice", "reveal", "recognize", "repeat", "settle"],
  "sound-play": ["notice", "repeat", "recognize", "repeat", "settle"],
  routine: ["notice", "try", "repeat"],
  helping: ["notice", "ask-help", "try", "repeat", "settle"],
  discovery: ["notice", "compare", "discover", "repeat", "settle"],
  "problem-solving": ["notice", "try", "ask-help", "solve", "settle"],
  cooperation: ["notice", "ask-help", "cooperate", "discover", "settle"],
  journey: ["notice", "try", "discover", "return", "settle"],
  mystery: ["notice", "compare", "try", "discover", "settle"],
  "treasure-hunt": ["notice", "try", "compare", "discover", "return", "settle"],
  building: ["notice", "try", "ask-help", "cooperate", "solve", "settle"],
  "supported-practice": ["notice", "try", "ask-help", "solve", "settle"],
  comparison: ["notice", "compare", "discover", "settle"],
};
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
export function createConceptSet(
  request: StoryRequest,
  structure: StoryStructureProfile,
  generation = 0,
): ConceptSet {
  check(request, structure);
  if (!Number.isInteger(generation) || generation < 0 || generation > 1000000)
    throw new AppError(
      "STORY_GENERATION",
      "Generation must be a nonnegative bounded integer.",
    );
  const namespace = id(
    `${request.requestId}-${request.revisionId}`,
    `g${generation}`,
  );
  const concepts = Array.from({ length: 3 }, (_, index): StoryConcept => {
    const variant = generation + index,
      conceptId = id(namespace, `c${index}`),
      preference = request.personalization.preferences.join(" ").toLowerCase();
    const preferenceOffset = /ball|كرة|كورة/.test(preference)
      ? 0
      : /basket|سلة/.test(preference)
        ? 1
        : /ribbon|شريط/.test(preference)
          ? 2
          : /leaf|ورقة/.test(preference)
            ? 3
            : 0;
    const focus = objects[(variant + preferenceOffset) % objects.length]!,
      setting = places[(generation + index) % places.length]!;
    const hero = request.personalization.heroMode === "child-protagonist",
      support = request.personalization.heroMode === "supporting";
    const count = Math.max(
      structure.activeCharacterRange[0],
      hero ? 1 : support ? 2 : 0,
    );
    if (count > structure.activeCharacterRange[1])
      throw new AppError(
        "STORY_ROLE_INCOMPATIBLE",
        "Requested story role exceeds supplied structure's cast.",
      );
    const fictionalNames = [
      "نور",
      "سلمى",
      "هدى",
      "مريم",
      "فريدة",
      "رحمة",
    ].filter((n) => n !== request.personalization.displayName);
    const characters = Array.from({ length: count }, (_, i) => ({
      characterId: id(conceptId, `char${i}`),
      bibleVersion: id(conceptId, `bible${i}`),
      origin: "synthetic" as const,
      ...(!((hero && i === 0) || (support && i === 1))
        ? { grammaticalGender: "feminine" as const }
        : request.personalization.grammaticalGender !== undefined
          ? { grammaticalGender: request.personalization.grammaticalGender }
          : {}),
      displayName:
        (hero && i === 0) || (support && i === 1)
          ? request.personalization.displayName!
          : fictionalNames[i]!,
      species: "human",
      clothing: "plain paper-cut clothing",
      approvedReferenceImages: [],
      consistencyNotes:
        "Keep clothing, proportions and identity stable across pages.",
    }));
    const mainCharacterId = characters[0]?.characterId ?? null;
    const eligible = structure.allowedMechanisms.filter(
      (m) => mechanismActions[m],
    );
    if (!eligible.length)
      throw new AppError(
        "STORY_MECHANISM_UNSUPPORTED",
        "No supported authored mechanism in supplied structure.",
      );
    const categoryMechanism =
      request.primaryCategory === "bedtime"
        ? "recognition"
        : request.primaryCategory === "behavioral"
          ? "helping"
          : request.primaryCategory === "values"
            ? "cooperation"
            : request.primaryCategory === "adventure"
              ? "journey"
              : request.primaryCategory === "educational"
                ? "discovery"
                : null;
    const preferredIndex = categoryMechanism
      ? Math.max(0, eligible.indexOf(categoryMechanism))
      : request.objective.kind === "behavioral"
        ? Math.max(0, eligible.indexOf("helping"))
        : 0;
    const mechanism = eligible[(variant + preferredIndex) % eligible.length]!;
    let actions = [...mechanismActions[mechanism]!];
    if (structure.narrativeForm === "routine")
      actions = actions.filter(
        (a) => !["cooperate", "solve", "return", "compare"].includes(a),
      );
    const length = Math.max(
      Math.min(
        structure.beatRange[1],
        structure.beatRange[0] + (structure.conventionalPlot ? 1 : 0),
      ),
      Math.min(structure.beatRange[1], actions.length),
    );
    if (length < actions.length) actions = actions.slice(0, length);
    while (actions.length < length)
      actions.splice(
        Math.max(0, actions.length - 1),
        0,
        structure.narrativeForm === "recognition" ? "repeat" : "try",
      );
    if (structure.conventionalPlot) {
      let events = actions.filter(
        (a) => a !== "repeat" && a !== "settle",
      ).length;
      while (events < structure.beatRange[0]) {
        const repeat = actions.indexOf("repeat");
        if (repeat >= 0) actions[repeat] = "try";
        else if (actions.length < structure.beatRange[1])
          actions.splice(Math.max(0, actions.length - 1), 0, "try");
        else
          throw new AppError(
            "STORY_STRUCTURE",
            "Supplied structure cannot fit required conventional events and closure.",
          );
        events++;
      }
    }
    const outline: StoryBeat[] = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i]!,
        state = `${focus.en}: ${outcomes[action]}`;
      outline.push({
        beatId: id(conceptId, `beat${i + 1}`),
        sequence: i + 1,
        action,
        actorId:
          characters[i % Math.max(1, characters.length)]?.characterId ?? null,
        focus,
        detail: setting,
        emotion: i === actions.length - 1 ? "reassured" : "curious",
        beforeState:
          outline.at(-1)?.afterState ??
          `${focus.en}: object awaits shared attention`,
        afterState: state,
        visibleFacts: [
          `${action}: ${focus[request.primaryLanguageMode]} ${setting[request.primaryLanguageMode]}`,
          state,
        ],
        factIds: [],
      });
    }
    const coreChallenge =
      structure.conflict === "none"
        ? `Attend to ${focus.en} through ${mechanism}`
        : `Explore ${focus.en} through ${mechanism} with support`;
    const realized: Record<IdeaComponentKind, string> = {
      theme: request.theme,
      objective: request.objective.description,
      setting: setting.en,
      "character-archetype": characters.length
        ? "supported curious observer"
        : "familiar recognition subject",
      mechanism,
      challenge: coreChallenge,
      conflict: structure.conflict,
      discovery: outline.some((b) => b.action === "discover")
        ? `${focus.en}: location discovered`
        : `${focus.en}: familiar features noticed`,
      resolution: outline.at(-1)!.afterState,
      "emotional-goal": "supported curiosity and reassurance",
      "educational-goal":
        structure.narrativeForm === "recognition"
          ? "familiar object recognition"
          : "observable supported exploration",
    };
    const components = kinds.map((kind): IdeaComponent => ({
      componentId: id(conceptId, `component-${kind}`),
      kind,
      label:
        kind === "setting"
          ? { ...setting }
          : loc(realized[kind], realized[kind], realized[kind]),
      description: realized[kind],
    }));
    return {
      conceptId,
      requestId: request.requestId,
      requestRevisionId: request.revisionId,
      title: `${focus[request.primaryLanguageMode]} — ${index + 1}`,
      premise: `${request.theme}: ${outline.map((b) => b.action).join(" → ")}`,
      primaryCategory: request.primaryCategory,
      objective: structuredClone(request.objective),
      setting,
      mainCharacterId,
      characters,
      coreChallenge,
      resolutionDirection: outline.at(-1)!.afterState,
      ageFitSummary: `${structure.narrativeForm}; editorial guidance requires human review`,
      mechanism,
      components,
      outline,
      provenance: { ...mockStoryProvenance },
    };
  });
  return validate(ConceptSetSchema, {
    schemaVersion: "concept-set/1.0",
    conceptSetId: id(namespace, "set"),
    requestId: request.requestId,
    requestRevisionId: request.revisionId,
    generation,
    concepts,
  });
}
function signature(c: StoryConcept) {
  const normalize = (value: string) =>
    c.outline
      .reduce((v, b) => v.replaceAll(b.focus.en, "[object]"), value)
      .toLowerCase();
  return `${c.mechanism}|${c.outline.map((b) => b.action).join(",")}|${normalize(c.coreChallenge)}|${normalize(c.resolutionDirection)}`;
}
const finding = (
  n: number,
  severity: QaFinding["severity"],
  category: string,
  location: string,
  message: string,
  suggestedAction: string,
): QaFinding => ({
  findingId: `story-finding-${n}`,
  severity,
  category,
  location,
  message,
  suggestedAction,
});
export function evaluateConcepts(
  request: StoryRequest,
  structure: StoryStructureProfile,
  set: ConceptSet | import("zod").infer<typeof PlannedConceptSetSchema>,
  manualCreative = false,
): ConceptEvaluation[] {
  check(request, structure);
  if (set.schemaVersion === "planned-concept-set/1.0")
    validate(PlannedConceptSetSchema, set);
  else validate(ConceptSetSchema, set);
  if (
    set.requestId !== request.requestId ||
    set.requestRevisionId !== request.revisionId
  )
    throw new AppError(
      "STORY_SELECTION",
      "Concept set belongs to another request revision.",
    );
  const seen = new Set<string>();
  return set.concepts.map((c) => {
    ownership(request, c);
    const sig = signature(c),
      findings: QaFinding[] = [];
    if (seen.has(sig))
      findings.push(
        finding(
          1,
          manualCreative ? "medium" : "high",
          "diversity",
          c.conceptId,
          "Near-duplicate actions, mechanism, challenge and resolution.",
          "Choose a materially different causal or recognition sequence.",
        ),
      );
    seen.add(sig);
    if (!structure.allowedMechanisms.includes(c.mechanism))
      findings.push(
        finding(
          2,
          "blocker",
          "structure",
          c.conceptId,
          "Mechanism is outside supplied structure.",
          "Select an allowed mechanism.",
        ),
      );
    if (
      c.outline.length < structure.beatRange[0] ||
      c.outline.length > structure.beatRange[1]
    )
      findings.push(
        finding(
          3,
          "high",
          "structure",
          c.conceptId,
          "Meaning units exceed structure range.",
          "Review the outline against supplied structure.",
        ),
      );
    const actors = new Set(
      c.outline.map((b) => b.actorId).filter((x): x is string => x !== null),
    );
    if (
      actors.size < structure.activeCharacterRange[0] ||
      actors.size > structure.activeCharacterRange[1]
    )
      findings.push(
        finding(
          5,
          "high",
          "characters",
          c.conceptId,
          "Active cast is outside supplied structure.",
          "Review distinct acting characters against the supplied cast range.",
        ),
      );
    if (
      structure.narrativeForm === "recognition" &&
      c.outline.some(
        (b) =>
          !["recognize", "reveal", "repeat", "notice", "settle"].includes(
            b.action,
          ),
      )
    )
      findings.push(
        finding(
          6,
          "blocker",
          "structure",
          c.conceptId,
          "Recognition units contain conventional conflict/quest actions.",
          "Use familiar recognition actions.",
        ),
      );
    if (
      structure.narrativeForm === "routine" &&
      c.outline.some((b) => ["cooperate", "solve", "return"].includes(b.action))
    )
      findings.push(
        finding(
          7,
          "high",
          "structure",
          c.conceptId,
          "Routine contains unsupported plot actions.",
          "Keep a familiar supported routine.",
        ),
      );
    findings.push(
      finding(
        8,
        "medium",
        "objective",
        c.conceptId,
        manualCreative
          ? "Imported concepts preserve the requested objective, but its delivery by these actions remains human-reviewed."
          : "Mock components preserve the requested objective but cannot establish that an arbitrary objective is delivered by these actions.",
        "Human reviewer must verify the concrete success scenario, or revise the request.",
      ),
    );
    if (
      request.personalization.preferences.some(
        (p) => !/ball|كرة|كورة|basket|سلة|ribbon|شريط|leaf|ورقة/i.test(p),
      )
    )
      findings.push(
        finding(
          9,
          "medium",
          "personalization",
          c.conceptId,
          "A synthetic preference has no supported authored object component; it has not been honored.",
          "Choose a supported object preference or add reviewed components.",
        ),
      );
    if (
      !manualCreative &&
      c.outline.some(
        (b, i) =>
          b.afterState !== `${b.focus.en}: ${outcomes[b.action]}` ||
          (i === 0 &&
            b.beforeState !== `${b.focus.en}: object awaits shared attention`),
      )
    )
      findings.push(
        finding(
          10,
          "high",
          "continuity",
          c.conceptId,
          "Action outcome is outside the supported authored semantic vocabulary.",
          "Supply a supported action/state pair or review an explicit extension.",
        ),
      );
    findings.push(
      finding(
        4,
        "low",
        "human-review",
        c.conceptId,
        "Deterministic comparison cannot certify literary or developmental quality.",
        "Owner and qualified native reviewer select and review the concept.",
      ),
    );
    return {
      conceptId: c.conceptId,
      structuralSignature: sig,
      findings,
      humanSelectionRequired: true,
    };
  });
}
export function planStoryPages(
  outline: StoryBeat[],
  structure: StoryStructureProfile,
): Page[] {
  if (!outline.length)
    throw new AppError("STORY_EMPTY_OUTLINE", "Cannot plan empty outline.");
  validate(StoryStructureProfileSchema, structure);
  const count = Math.max(
    structure.pageRange[0],
    Math.min(structure.pageRange[1], outline.length),
  );
  return Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i * outline.length) / count),
      to = Math.max(from + 1, Math.floor(((i + 1) * outline.length) / count));
    const beats = outline.slice(from, to),
      first = beats[0]!;
    return {
      pageId: id(outline[0]!.beatId, `page${i + 1}`),
      order: i + 1,
      beatIds: beats.map((b) => b.beatId),
      spreadGroup: null,
      textSafeRegion: "Reserve clear upper area for RTL/LTR text.",
      artBrief: beats
        .map((b) => `${b.action}: ${b.focus.en} ${b.detail.en}`)
        .join("; "),
      mustShow: beats.flatMap((b) => b.visibleFacts),
      mustNotShow: [
        "private photos",
        "unsafe copyable actions",
        "embedded text",
      ],
      characterStates: beats
        .map(
          (b) =>
            `${b.actorId ?? "object"}: ${b.beforeState} -> ${b.afterState}`,
        )
        .join("; "),
      propStates: `${first.beforeState} -> ${beats.at(-1)!.afterState}`,
    };
  });
}
export function buildStoryBlueprint(
  request: StoryRequest,
  structure: StoryStructureProfile,
  concept: StoryConcept,
  revisionId: string,
  manualCreative = false,
): StoryBlueprint {
  check(request, structure);
  ownership(request, concept);
  const evaluation = evaluateConcepts(
    request,
    structure,
    {
      schemaVersion: "concept-set/1.0",
      conceptSetId: "selection-check",
      requestId: request.requestId,
      requestRevisionId: request.revisionId,
      generation: 0,
      concepts: [
        concept,
        { ...concept, conceptId: id(concept.conceptId, "check") },
      ],
    },
    manualCreative,
  )[0]!;
  if (
    evaluation.findings.some(
      (f) => f.severity === "blocker" || f.severity === "high",
    )
  )
    throw new AppError(
      "STORY_STRUCTURE",
      "Selected concept violates supplied structure.",
    );
  const pagePlan = planStoryPages(concept.outline, structure);
  const b: StoryBlueprint = {
    schemaVersion: "blueprint/1.1",
    profileOrigin: "synthetic",
    specificationOnly: false,
    storyId: request.storyId,
    projectId: request.projectId,
    revisionId,
    workingTitle: concept.title,
    ageMonths: request.ageMonths,
    ageBandId: structure.ageBandId,
    ageProfileVersion: "age-profiles/0.1",
    languageModes: [...request.languageModes],
    primaryLanguageMode: request.primaryLanguageMode,
    primaryCategory: request.primaryCategory,
    secondaryCategories: [],
    objective: structuredClone(request.objective),
    educationalObjective:
      request.objective.kind === "educational"
        ? request.objective.description
        : null,
    behavioralObjective:
      request.objective.kind === "behavioral"
        ? request.objective.description
        : null,
    emotionalObjective:
      request.objective.kind === "emotional"
        ? request.objective.description
        : null,
    theme: request.theme,
    tone: "warm and concrete",
    readingMode: request.readingMode,
    protagonistId: concept.mainCharacterId,
    supportingCharacterIds: concept.characters
      .map((c) => c.characterId)
      .filter((c) => c !== concept.mainCharacterId),
    characterBibleRefs: concept.characters.map((c) => ({
      characterId: c.characterId,
      bibleVersion: c.bibleVersion,
    })),
    characterBibles: structuredClone(concept.characters),
    personalization: {
      level: request.personalization.level,
      heroMode: request.personalization.heroMode,
      privateProfileRef: null,
    },
    syntheticPersonalization: structuredClone(request.personalization),
    setting: concept.setting[request.primaryLanguageMode],
    environmentBibleRef: id(concept.conceptId, "environment"),
    meaningBeats: concept.outline.map((b, i) => ({
      beatId: b.beatId,
      sequence: b.sequence,
      purpose: request.objective.description,
      actionOrDiscovery: `${b.action}: ${b.focus[request.primaryLanguageMode]} ${b.detail[request.primaryLanguageMode]}`,
      emotion: b.emotion,
      visibleFacts: [...b.visibleFacts],
      beforeState: b.beforeState,
      afterState: b.afterState,
      nextBeatId: concept.outline[i + 1]?.beatId ?? null,
    })),
    pagePlan,
    languageVersions: request.languageModes.map((mode) => ({
      languageVersionId: id(
        `${request.requestId}-${revisionId}`,
        mode.replace(/[^a-zA-Z0-9-]/g, "-"),
      ),
      mode,
      sourceRevision: revisionId,
      status: "draft",
      diacriticsPolicy: "Pending native language review",
      pages: pagePlan.map((p) => ({
        pageId: p.pageId,
        narration: "",
        dialogue: [],
        altText: "",
        wordCount: 0,
      })),
      totalWords: 0,
      glossaryRefs: [],
      review: "Placeholder only: prose not drafted or approved.",
    })),
    illustrationBrief:
      "Layered paper-cut; visible actions and stable character references; no generated art.",
    styleProfileRef: "paper-cut-style-bible",
    videoAdaptationNotes: {
      childViewingEligibility:
        request.ageMonths < 24
          ? "ineligible-child-viewing"
          : "eligible-co-viewing",
      reason:
        request.ageMonths < 24
          ? "Under-two product policy"
          : "Finite caregiver co-viewing requires review",
      shotPlanStatus: "not planned",
    },
    outputIntents: [...request.outputIntents],
    safetyQualityChecks: [
      {
        check: "Human literary, age and native-language review",
        status: "pending; not approved",
      },
    ],
    approvalRecords: [],
    lineage: { parentRevisionId: null },
    dependencyHashes: {},
    generatedAssets: [],
    exportRefs: [],
    parentParticipation: structure.parentParticipation,
  };
  return validate(BlueprintSchema, b);
}
export function reviewStoryBlueprint(
  request: StoryRequest,
  concept: StoryConcept,
  blueprint: StoryBlueprint,
): QaFinding[] {
  const findings: QaFinding[] = [];
  const add = (
    severity: QaFinding["severity"],
    category: string,
    location: string,
    message: string,
    action: string,
  ) =>
    findings.push(
      finding(
        findings.length + 1,
        severity,
        category,
        location,
        message,
        action,
      ),
    );
  const result = BlueprintSchema.safeParse(blueprint);
  if (!result.success) {
    for (const issue of result.error.issues)
      add(
        "blocker",
        "validation",
        issue.path.join(".") || "blueprint",
        issue.message,
        "Repair the invalid canonical field.",
      );
    return findings;
  }
  try {
    ownership(request, concept);
  } catch {
    add(
      "blocker",
      "ownership",
      "concept",
      "Concept does not belong to this request revision.",
      "Select the matching concept.",
    );
  }
  if (JSON.stringify(blueprint.objective) !== JSON.stringify(request.objective))
    add(
      "blocker",
      "objective",
      "objective",
      "Canonical objective changed.",
      "Restore the selected objective or create a new request revision.",
    );
  const covered = new Set(blueprint.pagePlan.flatMap((p) => p.beatIds));
  for (const b of blueprint.meaningBeats)
    if (!covered.has(b.beatId))
      add(
        "high",
        "pages",
        b.beatId,
        "Meaning beat has no page.",
        "Map every beat to a page.",
      );
  blueprint.meaningBeats.forEach((b, i) => {
    const source = concept.outline[i];
    if (
      !source ||
      b.beatId !== source.beatId ||
      b.beforeState !== source.beforeState ||
      b.afterState !== source.afterState ||
      b.actionOrDiscovery !==
        `${source.action}: ${source.focus[request.primaryLanguageMode]} ${source.detail[request.primaryLanguageMode]}`
    )
      add(
        "blocker",
        "continuity",
        b.beatId,
        "Meaning differs from selected concept.",
        "Reconcile canonical semantics with the selected concept.",
      );
    if (i && b.beforeState !== blueprint.meaningBeats[i - 1]!.afterState)
      add(
        "blocker",
        "continuity",
        b.beatId,
        "Visible state chain breaks.",
        "Explain or repair the state transition.",
      );
  });
  if (blueprint.meaningBeats.length !== concept.outline.length)
    add(
      "blocker",
      "continuity",
      "meaningBeats",
      "Canonical beat count changed.",
      "Preserve selected concept coverage.",
    );
  if (
    JSON.stringify(blueprint.characterBibles) !==
    JSON.stringify(concept.characters)
  )
    add(
      "high",
      "characters",
      "characterBibles",
      "Character bibles differ from selected concept.",
      "Review and reconcile identity and appearance.",
    );
  for (const p of blueprint.pagePlan)
    if (!p.artBrief.trim() || !p.mustShow.length)
      add(
        "high",
        "illustratability",
        p.pageId,
        "Page lacks concrete art requirements.",
        "Describe visible action, objects and states.",
      );
  for (const factId of new Set(concept.outline.flatMap((b) => b.factIds))) {
    const fact = request.trustedFacts.find((f) => f.factId === factId);
    if (!fact || fact.reviewStatus !== "human-reviewed")
      add(
        "blocker",
        "facts",
        factId,
        "Factual claim lacks reviewed traceable source.",
        "Obtain human factual review; a creative provider cannot approve facts.",
      );
  }
  if (blueprint.languageVersions.every((e) => e.totalWords === 0))
    add(
      "high",
      "draft",
      "languageVersions",
      "Prose is not drafted.",
      "Create language editions before text approval.",
    );
  add(
    "medium",
    "preaching",
    "story",
    "Moral tone and supported emotions require a human read; keyword checks cannot establish quality.",
    "Read aloud for shame, lectures and unsupported emotional claims.",
  );
  add(
    "medium",
    "endings",
    blueprint.meaningBeats.at(-1)?.beatId ?? "story",
    "Ending payoff and reassurance require human review.",
    "Check that the ending follows the meaning chain and objective.",
  );
  add(
    "medium",
    "human-review",
    "story",
    "Deterministic advisory QA grants no human approval.",
    "Complete age, native-language, literary and factual review bound to this revision/hash.",
  );
  return findings;
}
export class MockStoryConceptProvider implements StoryConceptProvider {
  readonly provenance = mockStoryProvenance;
  async createConcepts(
    request: StoryRequest,
    structure: StoryStructureProfile,
    generation: number,
  ): Promise<ConceptSet> {
    return createConceptSet(request, structure, generation);
  }
}
