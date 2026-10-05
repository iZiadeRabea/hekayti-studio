import assert from "node:assert/strict";
import test from "node:test";
import { ageGuidance } from "@hekayti/core";
import { storyStructureFor, reviewStoryAge } from "@hekayti/core/age";
import {
  BlueprintSchema,
  type StoryRequest,
  type StoryConcept,
  type BeatAction,
} from "@hekayti/contracts";
import { fixture } from "./fixtures";

function request(ageMonths = 8): StoryRequest {
  return {
    schemaVersion: "story-request/1.0",
    requestId: "req",
    revisionId: "req-r1",
    projectId: "demo-product-design",
    storyId: "story",
    ageMonths,
    languageModes: ["ar-MSA-simple"],
    primaryLanguageMode: "ar-MSA-simple",
    primaryCategory: "everyday-life",
    objective: {
      kind: "connection",
      description: "Share a familiar moment",
      successScenario: "Optional shared looking",
    },
    theme: "Familiar things",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "fictional",
      level: 0,
      heroMode: "none",
      preferences: [],
    },
    sourceStrategy: "manual",
    trustedFacts: [],
    outputIntents: ["print"],
  };
}
function concept(
  r: StoryRequest,
  sequence: BeatAction[] = ["recognize", "reveal", "repeat"],
): StoryConcept {
  return {
    conceptId: "concept",
    requestId: r.requestId,
    requestRevisionId: r.revisionId,
    title: "Synthetic recognition",
    premise: "A familiar object appears",
    primaryCategory: r.primaryCategory,
    objective: r.objective,
    setting: { "ar-MSA-simple": "بيت", "ar-EG": "بيت", en: "Home" },
    mainCharacterId: null,
    characters: [],
    coreChallenge: "Familiar noticing",
    resolutionDirection: "Warm closing",
    ageFitSummary: "Editorial only",
    mechanism: "recognition",
    components: [],
    outline: sequence.map((action, i) => ({
      beatId: `beat-${i}`,
      sequence: i + 1,
      action,
      actorId: null,
      focus: { "ar-MSA-simple": "كرة", "ar-EG": "كورة", en: "ball" },
      detail: { "ar-MSA-simple": "هنا", "ar-EG": "هنا", en: "here" },
      emotion: "warm",
      beforeState: "visible",
      afterState: "visible",
      visibleFacts: [],
      factIds: [],
    })),
    provenance: {
      kind: "mock",
      providerId: "synthetic-age-test",
      version: "1",
      deterministic: true,
    },
  };
}
const actor = (id: string) => ({
  characterId: id,
  bibleVersion: "v1",
  origin: "synthetic" as const,
  displayName: id,
  approvedReferenceImages: [],
  consistencyNotes: "Invented actor",
});

test("all five age structures reuse existing numeric profiles and half-open boundaries", () => {
  for (const [age, form] of [
    [0, "recognition"],
    [11, "recognition"],
    [12, "routine"],
    [23, "routine"],
    [24, "simple-causal"],
    [35, "simple-causal"],
    [36, "short-plot"],
    [59, "short-plot"],
    [60, "extended-plot"],
    [95, "extended-plot"],
  ] as const) {
    const r = request(age),
      s = storyStructureFor(r),
      p = ageGuidance({
        ageMonths: age,
        mode: r.primaryLanguageMode,
        category: r.primaryCategory,
      }).profile;
    assert.equal(s.narrativeForm, form);
    assert.deepEqual(s.pageRange, p.pages);
    assert.deepEqual(s.activeCharacterRange, p.cast);
    assert.deepEqual(s.wordsPerPage, p.wordsPerPage);
    assert.deepEqual(s.sentenceWords, p.sentenceWords);
    assert.deepEqual(s.beatRange, age < 12 ? [3, 5] : p.events);
    assert.match(s.durationGuidance, /no universal minutes-per-year/);
    assert.ok(s.parentParticipation.length);
  }
});
test("infants have recognition units and zero conventional events, not a shortened preschool plot", () => {
  const r = request(),
    s = storyStructureFor(r);
  assert.equal(s.conventionalPlot, false);
  assert.equal(s.conflict, "none");
  assert.deepEqual(
    ageGuidance({ ageMonths: 8, mode: "en", category: "everyday-life" }).profile
      .events,
    [0, 0],
  );
  assert.deepEqual(s.allowedMechanisms, [
    "recognition",
    "reveal",
    "sound-play",
  ]);
  assert.equal(
    reviewStoryAge(r, concept(r)).some(
      (f) => f.severity === "high" || f.severity === "blocker",
    ),
    false,
  );
  assert.ok(
    reviewStoryAge(r, concept(r, ["notice", "try", "solve"])).some(
      (f) => f.category === "age-conflict",
    ),
  );
});
test("invalid ages, unsupported/private inputs and hard gates fail safely", () => {
  for (const age of [-1, 96, 120, 0.5, NaN, Infinity]) {
    assert.throws(() => storyStructureFor(request(age)));
    assert.equal(reviewStoryAge(request(age))[0]?.severity, "blocker");
  }
  for (const age of [0, 11, 12, 23]) {
    const r = request(age);
    r.primaryCategory = "adventure";
    assert.throws(() => storyStructureFor(r), /familiar recognition|routine/);
    assert.equal(reviewStoryAge(r)[0]?.severity, "blocker");
    r.primaryCategory = "everyday-life";
    r.outputIntents = ["video"];
    assert.throws(() => storyStructureFor(r), /video is disabled/);
  }
  const privateRequest = request();
  (privateRequest.personalization as unknown as { origin: string }).origin =
    "private";
  assert.throws(() => storyStructureFor(privateRequest));
  assert.equal(
    reviewStoryAge(null as unknown as StoryRequest)[0]?.severity,
    "blocker",
  );
  const unsupported = request();
  unsupported.primaryCategory = "unknown" as StoryRequest["primaryCategory"];
  assert.throws(() => storyStructureFor(unsupported));
});
test("supported older adventure and video remain available without literacy or capability guarantees", () => {
  for (const age of [24, 35, 36, 60, 95]) {
    const r = request(age);
    r.primaryCategory = "adventure";
    r.outputIntents = ["video"];
    r.readingMode = "emerging-reader";
    assert.ok(
      storyStructureFor(r).warnings.some((w) =>
        /not evidence of independent literacy/.test(w),
      ),
    );
  }
  assert.equal(
    storyStructureFor(request(24)).allowedMechanisms.includes("journey"),
    false,
  );
  assert.equal(
    storyStructureFor(request(36)).allowedMechanisms.includes("journey"),
    true,
  );
});
test("synthetic personalization levels 0–3 never increase structural maturity", () => {
  const baseline = storyStructureFor(request());
  for (const level of [0, 1, 2, 3] as const) {
    const r = request();
    r.personalization = {
      origin: "synthetic",
      profileId: "fictional",
      level,
      ...(level ? { displayName: "Invented Mira" } : {}),
      preferences: level >= 2 ? ["fictional ball"] : [],
      heroMode: level === 3 ? "child-protagonist" : "none",
    };
    assert.deepEqual(storyStructureFor(r), baseline);
  }
});
test("distinct active actors and events are separate from unused cast, repetitions and page subdivision", () => {
  const r = request(24),
    c = concept(r, ["notice", "try", "repeat", "settle"]);
  c.mechanism = "building";
  c.characters = [actor("a"), actor("b"), actor("unused"), actor("unused2")];
  c.outline[0]!.actorId = "a";
  c.outline[1]!.actorId = "b";
  c.outline[2]!.actorId = "a";
  assert.equal(
    reviewStoryAge(r, c).some((f) => f.category === "age-budget"),
    false,
  );
  c.characters.push(actor("c"), actor("d"));
  c.outline[2]!.actorId = "c";
  c.outline[3]!.actorId = "d";
  assert.ok(
    reviewStoryAge(r, c).some(
      (f) => f.location === "concept.characters" && f.severity === "medium",
    ),
  );
  c.outline.push(...concept(r, ["try", "compare", "discover"]).outline);
  assert.ok(reviewStoryAge(r, c).some((f) => f.location === "concept.outline"));
});
test("mechanism, toddler conflict and ownership mismatch are structured findings", () => {
  const r = request(20),
    c = concept(r, ["notice", "solve"]);
  c.mechanism = "journey";
  c.requestRevisionId = "wrong";
  const findings = reviewStoryAge(r, c);
  assert.ok(findings.some((f) => f.category === "age-mechanism"));
  assert.ok(findings.some((f) => f.category === "age-conflict"));
  assert.ok(
    findings.some(
      (f) => f.category === "age-mismatch" && f.severity === "blocker",
    ),
  );
  assert.equal(new Set(findings.map((f) => f.findingId)).size, findings.length);
});
test("legitimate low-word infant blueprint is accepted without imposing plot or dialogue", () => {
  const b = fixture("test-a-under-1"),
    r = request(b.ageMonths);
  // Historical specification declares all future output intents; this test is
  // the eligible print/digital infant reading case, not a video request.
  b.outputIntents = ["print", "digital"];
  r.storyId = b.storyId;
  r.primaryCategory = b.primaryCategory as StoryRequest["primaryCategory"];
  assert.ok(BlueprintSchema.safeParse(b).success);
  const findings = reviewStoryAge(r, undefined, b);
  assert.equal(
    findings.some(
      (f) => f.category === "age-budget" && /words/.test(f.message),
    ),
    false,
  );
  assert.equal(
    findings.some((f) => f.severity === "blocker"),
    false,
  );
  assert.ok(findings.some((f) => f.category === "age-semantic-review"));
});
test("page/word guidance remains advisory and malformed blueprints/actors are blockers", () => {
  const b = fixture("test-c-3-plus"),
    r = request(b.ageMonths);
  r.storyId = b.storyId;
  r.primaryCategory = b.primaryCategory as StoryRequest["primaryCategory"];
  b.parentParticipation = "";
  for (const e of b.languageVersions) {
    for (const p of e.pages) {
      p.narration = "";
      p.dialogue = [];
      p.wordCount = 0;
    }
    e.totalWords = 0;
  }
  const findings = reviewStoryAge(r, undefined, b);
  assert.ok(
    findings.some(
      (f) => f.category === "age-budget" && f.severity === "medium",
    ),
  );
  assert.ok(findings.some((f) => f.category === "age-adult-involvement"));
  assert.equal(
    findings.some((f) => f.severity === "blocker"),
    false,
  );
  b.ageBandId = "0-11m";
  assert.equal(
    reviewStoryAge(r, undefined, b).find((f) => f.category === "age-input")
      ?.severity,
    "blocker",
  );
  const c = concept(request());
  c.characters = [null] as unknown as StoryConcept["characters"];
  assert.equal(
    reviewStoryAge(request(), c).find((f) => f.category === "age-input")
      ?.severity,
    "blocker",
  );
});
test("structures and reviews do not mutate caller-owned input or shared profiles", () => {
  const r = request(),
    c = concept(r),
    before = structuredClone({ r, c });
  const s = storyStructureFor(r);
  s.pageRange[0] = 999;
  s.allowedMechanisms.length = 0;
  reviewStoryAge(r, c);
  assert.deepEqual({ r, c }, before);
  assert.equal(storyStructureFor(r).pageRange[0], 6);
});

test("older bounded adventure can pass semantic age review with an appropriate active cast", () => {
  const r = request(72);
  r.primaryCategory = "adventure";
  const c = concept(r, [
    "notice",
    "try",
    "compare",
    "cooperate",
    "discover",
    "return",
    "settle",
  ]);
  c.mechanism = "journey";
  c.coreChallenge = "Find a familiar garden sound with a helper";
  c.characters = [actor("a"), actor("b"), actor("c")];
  c.outline.forEach((beat, i) => {
    beat.actorId = c.characters[i % 3]!.characterId;
  });
  assert.equal(
    reviewStoryAge(r, c).some((f) => f.severity !== "low"),
    false,
  );
});

test("under-two blueprint video cannot bypass a print-only request", () => {
  const b = fixture("test-a-under-1");
  const r = request(b.ageMonths);
  r.storyId = b.storyId;
  r.primaryCategory = b.primaryCategory as StoryRequest["primaryCategory"];
  b.outputIntents = ["video"];
  assert.ok(
    reviewStoryAge(r, undefined, b).some(
      (f) =>
        f.location === "blueprint.outputIntents" && f.severity === "blocker",
    ),
  );
});
