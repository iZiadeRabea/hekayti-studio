import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BlueprintSchema,
  ageBandFor,
  countWords,
  languageInfo,
  validate,
  Id,
  type BeatAction,
  type LocalizedText,
  type StoryRequest,
  type StoryConcept,
  type StoryBeat,
  type StoryBlueprint,
  type LanguageEdition,
} from "@hekayti/contracts";
import {
  createStoryDraft,
  reviewStoryLanguage,
  MockStoryDraftProvider,
} from "@hekayti/core/language";
import { fixture } from "./fixtures";

interface PairCase {
  id: string;
  ageMonths: number;
  actor: null | { name: string; grammaticalGender: "feminine" | "masculine" };
  focus: LocalizedText;
  detail: LocalizedText;
  actions: BeatAction[];
  pagesPerBeat: number[];
  firstPages: Record<keyof LocalizedText, string[]>;
}
const pairs = JSON.parse(
  readFileSync(
    new URL("../../examples/phase3/language-pairs.json", import.meta.url),
    "utf8",
  ),
).cases as PairCase[];
const states: Record<BeatAction, string> = {
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
export function input(pair = pairs[1]!) {
  const blueprint = fixture();
  blueprint.schemaVersion = "blueprint/1.1";
  blueprint.revisionId = `${pair.id}-revision`;
  blueprint.ageMonths = pair.ageMonths;
  blueprint.ageBandId = ageBandFor(pair.ageMonths);
  blueprint.languageModes = ["ar-MSA-simple", "ar-EG", "en"];
  blueprint.primaryLanguageMode = "ar-MSA-simple";
  blueprint.primaryCategory = "everyday-life";
  blueprint.videoAdaptationNotes.childViewingEligibility =
    pair.ageMonths < 24 ? "ineligible-child-viewing" : "eligible-co-viewing";
  const characters = pair.actor
    ? [
        {
          ...blueprint.characterBibles[0]!,
          characterId: "actor-demo",
          displayName: pair.actor.name,
          grammaticalGender: pair.actor.grammaticalGender,
        },
      ]
    : [];
  blueprint.characterBibles = characters;
  blueprint.characterBibleRefs = characters.map((c) => ({
    characterId: c.characterId,
    bibleVersion: c.bibleVersion,
  }));
  blueprint.protagonistId = pair.actor ? "actor-demo" : null;
  blueprint.supportingCharacterIds = [];
  blueprint.parentParticipation = "Caregiver may point and name; stop freely.";
  const request: StoryRequest = {
    schemaVersion: "story-request/1.0",
    requestId: `${pair.id}-request`,
    revisionId: "request-r1",
    projectId: blueprint.projectId,
    storyId: blueprint.storyId,
    ageMonths: pair.ageMonths,
    languageModes: [...blueprint.languageModes],
    primaryLanguageMode: blueprint.primaryLanguageMode,
    primaryCategory: blueprint.primaryCategory,
    objective: structuredClone(blueprint.objective),
    theme: "Familiar supported exploration",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "synthetic-demo",
      level: 0,
      preferences: [],
      heroMode: "none",
    },
    sourceStrategy: "ai",
    trustedFacts: [],
    outputIntents: ["print", "digital"],
  };
  const outline: StoryBeat[] = [];
  pair.actions.forEach((action, i) =>
    outline.push({
      beatId: `beat-${i + 1}`,
      sequence: i + 1,
      action,
      actorId: blueprint.protagonistId,
      focus: { ...pair.focus },
      detail: { ...pair.detail },
      emotion: pair.actor
        ? i === pair.actions.length - 1
          ? "reassured"
          : "curious"
        : "warm",
      beforeState:
        outline.at(-1)?.afterState ??
        `${pair.focus.en}: object awaits shared attention`,
      afterState: `${pair.focus.en}: ${states[action]}`,
      visibleFacts: [pair.focus.en, pair.detail.en],
      factIds: [],
    }),
  );
  const concept: StoryConcept = {
    conceptId: `${pair.id}-concept`,
    requestId: request.requestId,
    requestRevisionId: request.revisionId,
    title: pair.id,
    premise: "Synthetic shared exploration",
    primaryCategory: request.primaryCategory,
    objective: structuredClone(request.objective),
    setting: { ...pair.detail },
    mainCharacterId: blueprint.protagonistId,
    characters,
    coreChallenge: "Supported exploration",
    resolutionDirection: "Rest in familiar place",
    ageFitSummary: "Editorial fixture",
    mechanism: "supported-exploration",
    components: [
      {
        componentId: "component-familiar-object",
        kind: "theme",
        label: { ...pair.focus },
        description: "One familiar focal object with a stable quantity",
      },
    ],
    outline,
    provenance: {
      kind: "mock",
      providerId: "test-authored-semantic",
      version: "1",
      deterministic: true,
    },
  };
  syncMeaning(concept, blueprint);
  blueprint.pagePlan = outline
    .flatMap((beat, i) =>
      Array.from({ length: pair.pagesPerBeat[i]! }, (_, j) => ({
        ...blueprint.pagePlan[0]!,
        pageId: `page-${i + 1}-${j + 1}`,
        order: 0,
        beatIds: [beat.beatId],
      })),
    )
    .map((page, i) => ({ ...page, order: i + 1 }));
  blueprint.languageVersions = request.languageModes.map((mode) => ({
    ...blueprint.languageVersions[0]!,
    languageVersionId: `placeholder-${mode}`,
    mode,
    sourceRevision: blueprint.revisionId,
    status: "draft",
    pages: blueprint.pagePlan.map((p) => ({
      pageId: p.pageId,
      narration: "",
      dialogue: [],
      altText: "",
      wordCount: 0,
    })),
    totalWords: 0,
  }));
  validate(BlueprintSchema, blueprint);
  return { request, concept, blueprint };
}
function syncMeaning(concept: StoryConcept, blueprint: StoryBlueprint) {
  blueprint.meaningBeats = concept.outline.map((b, i) => ({
    beatId: b.beatId,
    sequence: b.sequence,
    purpose: b.action,
    actionOrDiscovery: `${b.action}: ${b.focus[blueprint.primaryLanguageMode]} ${b.detail[blueprint.primaryLanguageMode]}`,
    emotion: b.emotion,
    visibleFacts: [...b.visibleFacts],
    beforeState: b.beforeState,
    afterState: b.afterState,
    nextBeatId: concept.outline[i + 1]?.beatId ?? null,
  }));
}
const draft = (i: ReturnType<typeof input>) =>
  createStoryDraft(i.request, i.concept, i.blueprint, "draft-demo");
const review = (i: ReturnType<typeof input>, e: LanguageEdition[]) =>
  reviewStoryLanguage(i.request, i.concept, i.blueprint, e);

for (const pair of pairs)
  test(`independently authored paired microstory: ${pair.id}`, () => {
    const i = input(pair);
    const before = JSON.stringify(i);
    const d = draft(i);
    assert.equal(JSON.stringify(i), before);
    assert.equal(d.status, "draft");
    assert.equal(d.provenance.kind, "mock");
    for (const e of d.editions) {
      assert.equal(e.status, "draft");
      assert.equal(e.sourceRevision, i.blueprint.revisionId);
      assert.deepEqual(
        e.pages.map((p) => p.pageId),
        i.blueprint.pagePlan.map((p) => p.pageId),
      );
      assert.deepEqual(
        i.concept.outline.map(
          (b) =>
            e.pages.find(
              (p) =>
                p.pageId ===
                i.blueprint.pagePlan.find((p) => p.beatIds.includes(b.beatId))!
                  .pageId,
            )!.narration,
        ),
        pair.firstPages[e.mode],
      );
      assert.equal(
        e.totalWords,
        e.pages.reduce((sum, p) => sum + countWords(p.narration), 0),
      );
      assert.equal(
        e.pages.some((p) => p.narration.includes("Caregiver")),
        false,
      );
      assert.equal(
        e.review.includes(
          `${languageInfo[e.mode].lang}/${languageInfo[e.mode].dir}`,
        ),
        true,
      );
    }
    validate(BlueprintSchema, { ...i.blueprint, languageVersions: d.editions });
    assert.deepEqual(
      review(i, d.editions).map((f) => f.category),
      ["language-human-review"],
    );
    assert.deepEqual(draft(i), d);
  });

test("subdivided pages hold the same object without replaying an attempt or solution", () => {
  const i = input(pairs[2]!);
  const d = draft(i);
  for (const e of d.editions) {
    for (const [index, p] of e.pages.entries())
      if (index % 2)
        assert.equal(
          p.narration,
          `${pairs[2]!.focus[e.mode]} ${pairs[2]!.detail[e.mode]}.`,
        );
    assert.equal(
      e.pages.filter((p) => /أكملت|خلّصت|finishes/u.test(p.narration)).length,
      1,
    );
  }
});

test("feminine grammar is authored; masculine metadata and missing metadata never infer from names", () => {
  const i = input();
  assert.match(draft(i).editions[0]!.pages[0]!.narration, /^لاحظت نور/u);
  i.concept.characters[0]!.grammaticalGender = "masculine";
  assert.match(draft(i).editions[1]!.pages[0]!.narration, /^نور خد باله/u);
  delete i.concept.characters[0]!.grammaticalGender;
  const d = draft(i);
  assert.match(d.editions[0]!.pages[0]!.narration, /^لفتت الكرة انتباه نور/u);
  assert.equal(
    review(i, d.editions).some((f) => f.category === "language-agreement"),
    true,
  );
});

test("request/revision/objective/character drift fails readably without rewriting sources", () => {
  for (const mutate of [
    (i: ReturnType<typeof input>) =>
      (i.concept.requestRevisionId = "different"),
    (i: ReturnType<typeof input>) =>
      (i.request.objective.description += " altered"),
    (i: ReturnType<typeof input>) =>
      (i.blueprint.characterBibles = i.blueprint.characterBibles.map((c) => ({
        ...c,
        displayName: "someone else",
      }))),
    (i: ReturnType<typeof input>) =>
      (i.concept.outline[0]!.actorId = "missing"),
    (i: ReturnType<typeof input>) => (i.concept.outline[0]!.action = "solve"),
  ]) {
    const i = input();
    mutate(i);
    const before = JSON.stringify(i);
    assert.throws(
      () => draft(i),
      /concept|objective|character|actor|canonical|semantic/iu,
    );
    assert.equal(JSON.stringify(i), before);
    assert.equal(
      review(i, []).some((f) => f.severity === "blocker"),
      true,
    );
  }
});

test("unknown actions, states, emotions, lexical identities and locations cannot invent a replacement story", () => {
  for (const mutate of [
    (b: StoryBeat) => (b.afterState = "the ball disappears forever"),
    (b: StoryBeat) => (b.emotion = "terrified"),
    (b: StoryBeat) => (b.focus["ar-EG"] = "كورتين"),
    (b: StoryBeat) => (b.detail["ar-EG"] = "في البحر"),
    (b: StoryBeat) => (b.focus.en = "a new scientific fact"),
  ]) {
    const i = input();
    mutate(i.concept.outline[0]!);
    syncMeaning(i.concept, i.blueprint);
    assert.throws(() => draft(i), /Unsupported|Unvetted|authored/iu);
  }
});

test("an infant conventional plot action is rejected even with a matching canonical blueprint", () => {
  const i = input(pairs[0]!);
  i.concept.outline[0]!.action = "try";
  syncMeaning(i.concept, i.blueprint);
  assert.throws(() => draft(i), /Unsupported semantic action/u);
});

test("source revision, page order, counts and actor/speaker drift have separate QA evidence", () => {
  const i = input();
  const d = draft(i);
  d.editions[0]!.sourceRevision = "stale";
  d.editions[0]!.pages.reverse();
  d.editions[1]!.pages[0]!.narration = "شخص آخر مع كورتين.";
  d.editions[1]!.pages[0]!.dialogue.push({
    speakerId: "missing",
    text: "«أين الكرة؟»",
  });
  const categories = new Set(review(i, d.editions).map((f) => f.category));
  for (const category of [
    "language-source",
    "language-pages",
    "language-count",
    "language-character",
    "language-speaker",
    "language-semantic-label",
    "language-semantic-review",
  ])
    assert.equal(categories.has(category), true, category);
});

test("valid but unrelated canonical dialogue speaker is flagged", () => {
  const i = input();
  const helper = {
    ...i.concept.characters[0]!,
    characterId: "helper",
    displayName: "رفيق",
  };
  i.concept.characters.push(helper);
  i.blueprint.characterBibleRefs.push({
    characterId: helper.characterId,
    bibleVersion: helper.bibleVersion,
  });
  i.blueprint.supportingCharacterIds.push(helper.characterId);
  const d = draft(i);
  d.editions[0]!.pages[0]!.dialogue.push({
    speakerId: helper.characterId,
    text: "«هنا!»",
  });
  assert.equal(
    review(i, d.editions).some(
      (f) => f.category === "language-speaker" && /differs/u.test(f.message),
    ),
    true,
  );
});

test("logical Unicode and selective diacritics survive JSON/TextEncoder round trips untouched", () => {
  const i = input();
  i.concept.outline.forEach((b) => (b.focus["ar-MSA-simple"] = "الْكُرَة"));
  syncMeaning(i.concept, i.blueprint);
  const d = draft(i);
  assert.match(d.editions[0]!.pages[0]!.narration, /الْكُرَة/u);
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
  assert.equal(
    new TextDecoder().decode(new TextEncoder().encode(JSON.stringify(d))),
    JSON.stringify(d),
  );
  assert.equal(
    review(i, d.editions).some((f) => f.category === "language-bidi"),
    false,
  );
});

test("bidi controls and accidental register are flagged without stripping approved text", () => {
  const i = input();
  const d = draft(i);
  d.editions[0]!.pages[0]!.narration += " مش دلوقتي \u202eA-12\u202c رقم ١٢.";
  d.editions[1]!.pages[0]!.narration += " سوف نرى ذلك.";
  const before = JSON.stringify(d);
  const findings = review(i, d.editions);
  assert.equal(JSON.stringify(d), before);
  assert.equal(
    findings.filter((f) => f.category === "language-register").length,
    2,
  );
  assert.equal(
    findings.some((f) => f.category === "language-bidi"),
    true,
  );
  assert.equal(
    findings.some((f) => f.category === "language-mixed-script"),
    true,
  );
});

test("factual beats require sourced human review and never manufacture a scientific claim", () => {
  const i = input();
  i.concept.outline[0]!.factIds = ["fact-demo"];
  assert.throws(() => draft(i), /fact boundary/u);
  i.request.trustedFacts.push({
    factId: "fact-demo",
    statement: "Synthetic reviewed boundary",
    sourceReference: "synthetic-test-source",
    reviewStatus: "unreviewed",
    reviewerAlias: null,
  });
  assert.throws(() => draft(i), /fact boundary/u);
  i.request.trustedFacts[0]!.reviewStatus = "human-reviewed";
  i.request.trustedFacts[0]!.reviewerAlias = "test-reviewer";
  assert.equal(
    JSON.stringify(draft(i)).includes("Synthetic reviewed boundary"),
    false,
  );
});

test("noncontiguous beat subdivisions are rejected rather than repeat an event", () => {
  const i = input();
  i.blueprint.pagePlan[1]!.beatIds = ["beat-2"];
  assert.throws(() => draft(i), /Page mappings/u);
});

test("mock provider fulfils async boundary and reports actual mock provenance", async () => {
  const i = input();
  const provider = new MockStoryDraftProvider();
  assert.deepEqual(
    await provider.createDraft(i.request, i.concept, i.blueprint, "draft-demo"),
    draft(i),
  );
  assert.equal(provider.provenance.kind, "mock");
  assert.equal(languageInfo.en.dir, "ltr");
  assert.equal(languageInfo["ar-EG"].dir, "rtl");
});

test("draft and derived edition identifiers satisfy canonical character and length boundaries", () => {
  const i = input();
  for (const id of ["draft.safe_id-1", "a".repeat(106)]) {
    const d = createStoryDraft(i.request, i.concept, i.blueprint, id);
    validate(Id, d.draftId);
    for (const e of d.editions) validate(Id, e.languageVersionId);
  }
  for (const id of [
    "",
    "draft:colon",
    "a".repeat(107),
    "a".repeat(120),
    "a".repeat(128),
  ])
    assert.throws(
      () => createStoryDraft(i.request, i.concept, i.blueprint, id),
      /identifier/u,
    );
});

test("unknown-gender level-3 hero has proper event sentences and remains the asker, never inferred as the helper", () => {
  const i = input(pairs[2]!);
  delete i.concept.characters[0]!.grammaticalGender;
  i.concept.characters[0]!.displayName = "ليلى";
  i.request.personalization = {
    origin: "synthetic",
    profileId: "synthetic-hero",
    level: 3,
    displayName: "ليلى",
    preferences: [],
    heroMode: "child-protagonist",
  };
  i.blueprint.personalization = {
    level: 3,
    heroMode: "child-protagonist",
    privateProfileRef: null,
  };
  i.blueprint.syntheticPersonalization = { ...i.request.personalization };
  const d = draft(i);
  const msa = d.editions[0]!.pages.map((p) => p.narration).join(" ");
  const eg = d.editions[1]!.pages.map((p) => p.narration).join(" ");
  assert.match(msa, /جاء طلب المساعدة من ليلى/u);
  assert.match(eg, /طلب المساعدة جه من ليلى/u);
  assert.match(msa, /اكتملت مهمة ليلى.*بمساعدة/u);
  assert.match(eg, /مهمة ليلى.*خلصت بمساعدة/u);
  assert.doesNotMatch(
    msa + eg,
    /بمساعدة مع|في انتباه|في طلب مساعدة|طلب مساعدة من ليلى/u,
  );
  assert.equal(
    review(i, d.editions).some((f) => f.category === "language-agreement"),
    true,
  );
  assert.equal(
    review(i, d.editions).some(
      (f) => f.severity === "high" || f.severity === "blocker",
    ),
    false,
  );
  i.blueprint.syntheticPersonalization!.grammaticalGender = "feminine";
  assert.throws(() => draft(i), /personalization/u);
});
