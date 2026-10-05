import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BlueprintSchema,
  type StoryRequest,
  type StoryStructureProfile,
} from "@hekayti/contracts";
import {
  StoryRequestSchema,
  StoryStructureProfileSchema,
  StoryConceptSchema,
  ConceptSetSchema,
  TrustedFactSchema,
  StoryDraftSchema,
  StoryQaReportSchema,
} from "@hekayti/contracts/story";
import {
  createConceptSet,
  evaluateConcepts,
  buildStoryBlueprint,
  reviewStoryBlueprint,
  ideaComponents,
  MockStoryConceptProvider,
} from "../../packages/core/src/story-system";
const request = (level: 0 | 1 | 2 | 3 = 0): StoryRequest => ({
  schemaVersion: "story-request/1.0",
  requestId: "request-demo",
  revisionId: "request-r1",
  projectId: "project-demo",
  storyId: "story-demo",
  ageMonths: 42,
  languageModes: ["ar-MSA-simple", "ar-EG"],
  primaryLanguageMode: "ar-MSA-simple",
  primaryCategory: "everyday-life",
  objective: {
    kind: "connection",
    description: "Warm supported exploration",
    successScenario: "Notice and reconnect",
  },
  theme: "Familiar garden",
  readingMode: "adult-read",
  personalization: {
    origin: "synthetic",
    profileId: "synthetic-demo",
    level,
    ...(level ? { displayName: "ليلى" } : {}),
    preferences: level === 2 ? ["ball"] : [],
    heroMode: level === 3 ? "child-protagonist" : "none",
  },
  sourceStrategy: "ai",
  trustedFacts: [],
  outputIntents: ["print", "digital"],
});
const structure = (): StoryStructureProfile => ({
  ageBandId: "36-59m",
  authority: "editorial-D/H",
  narrativeForm: "short-plot",
  conventionalPlot: true,
  beatRange: [3, 6],
  activeCharacterRange: [1, 3],
  pageRange: [6, 10],
  wordsPerPage: [8, 30],
  sentenceWords: [3, 10],
  allowedMechanisms: ["supported-practice", "comparison", "cooperation"],
  conflict: "bounded-problem",
  repetition: "gentle",
  vocabulary: "concrete",
  dialogue: "short",
  emotionalComplexity: "supported",
  adventure: "bounded",
  educationalComplexity: "one idea",
  parentParticipation: "Read together",
  durationGuidance: "advisory",
  warnings: [],
});
test("independent components cover all dimensions and concepts differ structurally", () => {
  assert.equal(new Set(ideaComponents.map((c) => c.kind)).size, 11);
  const r = request(),
    s = structure(),
    set = createConceptSet(r, s);
  assert.equal(set.concepts.length, 3);
  assert.equal(
    new Set(evaluateConcepts(r, s, set).map((e) => e.structuralSignature)).size,
    3,
  );
  assert.notDeepEqual(createConceptSet(r, s, 1), set);
  assert.deepEqual(createConceptSet(r, s), set);
  assert.equal(set.concepts[0]!.provenance.kind, "mock");
});
test("synthetic levels 0–3 produce 1.1; old1.0 cannot acquire personalization", () => {
  for (const level of [0, 1, 2, 3] as const) {
    const r = request(level),
      s = structure(),
      c = createConceptSet(r, s).concepts[0]!,
      b = buildStoryBlueprint(r, s, c, "blueprint-r1");
    assert.equal(BlueprintSchema.safeParse(b).success, true);
    assert.equal(b.languageVersions[0]!.totalWords, 0);
    assert.equal(b.languageVersions[0]!.status, "draft");
    assert.match(b.languageVersions[0]!.review, /not drafted or approved/);
    assert.equal(b.approvalRecords.length, 0);
    assert.equal(
      new Set(b.pagePlan.flatMap((p) => p.beatIds)).size,
      b.meaningBeats.length,
    );
    if (level > 0)
      assert.equal(
        BlueprintSchema.safeParse({ ...b, schemaVersion: "blueprint/1.0" })
          .success,
        false,
      );
    if (level === 1)
      assert.notEqual(
        c.characters[0]!.displayName,
        r.personalization.displayName,
      );
    if (level === 3)
      assert.equal(c.characters[0]!.displayName, r.personalization.displayName);
    assert.equal(
      BlueprintSchema.safeParse({
        ...b,
        personalization: { ...b.personalization, level: 4 },
      }).success,
      false,
    );
    assert.equal(
      BlueprintSchema.safeParse({
        ...b,
        personalization: {
          ...b.personalization,
          privateProfileRef: "private-demo",
        },
      }).success,
      false,
    );
  }
});
test("request schemas reject extra private fields, bad ranges, duplicate modes, false fact review", () => {
  const r = request();
  assert.equal(
    StoryRequestSchema.safeParse({ ...r, privateData: true }).success,
    false,
  );
  assert.equal(
    StoryRequestSchema.safeParse({ ...r, languageModes: ["ar-EG", "ar-EG"] })
      .success,
    false,
  );
  assert.equal(
    StoryRequestSchema.safeParse({
      ...r,
      personalization: { ...r.personalization, level: 4 },
    }).success,
    false,
  );
  assert.equal(
    StoryStructureProfileSchema.safeParse({ ...structure(), beatRange: [6, 2] })
      .success,
    false,
  );
  assert.equal(
    TrustedFactSchema.safeParse({
      factId: "f",
      statement: "fact",
      sourceReference: "source",
      reviewStatus: "human-reviewed",
      reviewerAlias: null,
    }).success,
    false,
  );
});
test("foreign selection and broken semantic refs fail without changing input", () => {
  const r = request(),
    s = structure(),
    set = createConceptSet(r, s),
    c = set.concepts[0]!,
    snapshot = structuredClone(c);
  assert.throws(() =>
    buildStoryBlueprint({ ...r, revisionId: "other" }, s, c, "b"),
  );
  assert.throws(() =>
    buildStoryBlueprint(
      r,
      s,
      { ...c, objective: { ...c.objective, description: "changed" } },
      "b",
    ),
  );
  const broken = structuredClone(c);
  broken.outline[1]!.beforeState = "broken";
  assert.equal(StoryConceptSchema.safeParse(broken).success, false);
  assert.equal(
    ConceptSetSchema.safeParse({ ...set, concepts: [c, c] }).success,
    false,
  );
  assert.deepEqual(c, snapshot);
});
test("near duplicates compare mechanisms/actions rather than titles", () => {
  const r = request(),
    s = structure(),
    set = createConceptSet(r, s),
    c = set.concepts[0]!;
  set.concepts[1] = {
    ...structuredClone(c),
    conceptId: "different-id",
    title: "Different title",
  };
  assert.ok(
    evaluateConcepts(r, s, set)[1]!.findings.some(
      (f) => f.category === "diversity",
    ),
  );
});
test("infants retain recognition units without conflict or quest", () => {
  const r = { ...request(), ageMonths: 6 },
    s: StoryStructureProfile = {
      ...structure(),
      ageBandId: "0-11m",
      narrativeForm: "recognition",
      conventionalPlot: false,
      conflict: "none",
      activeCharacterRange: [0, 1],
      beatRange: [2, 4],
      allowedMechanisms: ["recognition", "reveal", "recurrence"],
    };
  for (const c of createConceptSet(r, s).concepts) {
    assert.equal(c.mainCharacterId, null);
    assert.ok(
      c.outline.every((b) =>
        ["recognize", "reveal", "repeat", "notice", "settle"].includes(
          b.action,
        ),
      ),
    );
    assert.equal(
      BlueprintSchema.safeParse(buildStoryBlueprint(r, s, c, "b")).success,
      true,
    );
  }
  assert.throws(() =>
    createConceptSet({ ...r, primaryCategory: "adventure" }, s),
  );
});
test("QA detects canonical tampering and reports human limits without approval", () => {
  const r = request(),
    s = structure(),
    c = createConceptSet(r, s).concepts[0]!,
    b = buildStoryBlueprint(r, s, c, "b");
  b.meaningBeats[1]!.beforeState = "broken";
  b.pagePlan = b.pagePlan.map((p) => ({
    ...p,
    beatIds: p.beatIds.map((id) =>
      id === b.meaningBeats.at(-1)!.beatId ? b.meaningBeats[0]!.beatId : id,
    ),
  }));
  const f = reviewStoryBlueprint(r, c, b);
  assert.ok(
    f.some((x) => x.category === "continuity" && x.severity === "blocker"),
  );
  assert.ok(f.some((x) => x.category === "pages"));
  assert.ok(f.some((x) => x.category === "human-review"));
  assert.ok(f.some((x) => x.category === "draft"));
  assert.equal(b.approvalRecords.length, 0);
});
test("draft/report schemas enforce measured words and no fabricated approvals", () => {
  const r = request(),
    s = structure(),
    c = createConceptSet(r, s).concepts[0]!,
    b = buildStoryBlueprint(r, s, c, "b"),
    draft = {
      schemaVersion: "story-draft/1.0",
      draftId: "d",
      sourceRevision: "b",
      conceptId: c.conceptId,
      editions: b.languageVersions,
      provenance: c.provenance,
      status: "draft",
    };
  assert.equal(StoryDraftSchema.safeParse(draft).success, true);
  assert.equal(
    StoryDraftSchema.safeParse({
      ...draft,
      editions: [{ ...b.languageVersions[0], status: "approved" }],
    }).success,
    false,
  );
  assert.equal(
    StoryDraftSchema.safeParse({
      ...draft,
      editions: [{ ...b.languageVersions[0], totalWords: 1 }],
    }).success,
    false,
  );
  assert.equal(
    StoryQaReportSchema.safeParse({
      reportId: "qa",
      sourceRevision: "b",
      contentHash: "a".repeat(64),
      findings: [],
      humanReviewRequired: false,
      method: "deterministic-advisory",
    }).success,
    false,
  );
});
test("async mock adapter uses same deterministic pure behavior", async () => {
  const r = request(),
    s = structure();
  assert.deepEqual(
    await new MockStoryConceptProvider().createConcepts(r, s, 2),
    createConceptSet(r, s, 2),
  );
});
test("category, objective and preferences affect eligible concrete composition", () => {
  const r = request(),
    s = {
      ...structure(),
      allowedMechanisms: ["discovery", "helping", "journey", "cooperation"],
    };
  const plain = createConceptSet(r, s).concepts[0]!;
  const behavioral = createConceptSet(
    { ...r, objective: { ...r.objective, kind: "behavioral" } },
    s,
  ).concepts[0]!;
  const adventure = createConceptSet({ ...r, primaryCategory: "adventure" }, s)
    .concepts[0]!;
  assert.notDeepEqual(
    plain.outline.map((b) => b.action),
    behavioral.outline.map((b) => b.action),
  );
  assert.equal(adventure.mechanism, "journey");
  assert.ok(adventure.outline.some((b) => b.action === "return"));
  const preferred = request(2);
  preferred.personalization.preferences = ["ribbon"];
  assert.equal(
    createConceptSet(preferred, s).concepts[0]!.outline[0]!.focus.en,
    "the ribbon",
  );
  assert.deepEqual(
    createConceptSet(preferred, s).concepts[0]!.objective,
    r.objective,
  );
  assert.ok(
    plain.outline.every(
      (b) =>
        b.afterState.startsWith(b.focus.en + ": ") &&
        !/state\d/.test(b.afterState),
    ),
  );
  assert.ok(
    evaluateConcepts(r, s, createConceptSet(r, s))[0]!.findings.some(
      (f) => f.category === "objective",
    ),
  );
});
test("all five supplied structures preserve active actors, events and infant hero recognition", () => {
  const matrix = [
    {
      age: 6,
      band: "0-11m",
      form: "recognition",
      beats: [3, 5],
      cast: [0, 1],
      mechanisms: ["recognition", "reveal", "sound-play"],
    },
    {
      age: 18,
      band: "12-23m",
      form: "routine",
      beats: [1, 3],
      cast: [1, 2],
      mechanisms: ["routine", "helping", "discovery"],
    },
    {
      age: 30,
      band: "24-35m",
      form: "simple-causal",
      beats: [2, 4],
      cast: [2, 3],
      mechanisms: ["discovery", "problem-solving", "helping", "building"],
    },
    {
      age: 42,
      band: "36-59m",
      form: "short-plot",
      beats: [3, 6],
      cast: [2, 4],
      mechanisms: [
        "discovery",
        "problem-solving",
        "cooperation",
        "journey",
        "mystery",
        "treasure-hunt",
        "building",
        "helping",
      ],
    },
    {
      age: 72,
      band: "60-95m",
      form: "extended-plot",
      beats: [5, 8],
      cast: [3, 5],
      mechanisms: [
        "discovery",
        "problem-solving",
        "cooperation",
        "journey",
        "mystery",
        "treasure-hunt",
        "building",
        "helping",
      ],
    },
  ] as const;
  for (const row of matrix) {
    const r = { ...request(), ageMonths: row.age };
    const s: StoryStructureProfile = {
      ...structure(),
      ageBandId: row.band,
      narrativeForm: row.form,
      beatRange: [...row.beats],
      activeCharacterRange: [...row.cast],
      allowedMechanisms: [...row.mechanisms],
      conventionalPlot: row.age >= 24,
      conflict:
        row.age < 12
          ? "none"
          : row.age < 24
            ? "supported-friction"
            : "bounded-problem",
    };
    for (let g = 0; g < 4; g++)
      for (const c of createConceptSet(r, s, g).concepts) {
        assert.equal(
          new Set(c.outline.map((b) => b.actorId).filter(Boolean)).size,
          row.cast[0],
        );
        if (s.conventionalPlot)
          assert.ok(
            c.outline.filter((b) => !["repeat", "settle"].includes(b.action))
              .length >= s.beatRange[0],
          );
        assert.ok(
          !evaluateConcepts(r, s, createConceptSet(r, s, g))
            .find((e) => e.conceptId === c.conceptId)!
            .findings.some((f) => f.severity === "blocker"),
        );
        buildStoryBlueprint(r, s, c, "b");
      }
    if (row.age === 6) {
      const hero = { ...request(3), ageMonths: 6 };
      const c = createConceptSet(hero, s).concepts[0]!;
      assert.equal(c.characters.length, 1);
      assert.equal(
        c.characters[0]!.displayName,
        hero.personalization.displayName,
      );
      buildStoryBlueprint(hero, s, c, "hero-b");
    }
  }
});
test("realized components agree with conflict, mechanism and ending; unsupported preference is explicit", () => {
  const r = request(2);
  r.personalization.preferences = ["dragons"];
  const s = structure(),
    set = createConceptSet(r, s);
  for (const c of set.concepts) {
    assert.equal(
      c.components.find((x) => x.kind === "mechanism")!.description,
      c.mechanism,
    );
    assert.equal(
      c.components.find((x) => x.kind === "conflict")!.description,
      s.conflict,
    );
    assert.equal(
      c.components.find((x) => x.kind === "resolution")!.description,
      c.outline.at(-1)!.afterState,
    );
    assert.equal(
      new Set(c.characters.map((x) => x.displayName)).size,
      c.characters.length,
    );
  }
  assert.ok(
    evaluateConcepts(r, s, set)[0]!.findings.some(
      (x) =>
        x.category === "personalization" && /not been honored/.test(x.message),
    ),
  );
});
test("trusted facts are traceable and factual QA never invents review", () => {
  const r = request();
  r.trustedFacts = [
    {
      factId: "fact-demo",
      statement: "An illustrative factual claim",
      sourceReference: "curated-source-demo",
      reviewStatus: "unreviewed",
      reviewerAlias: null,
    },
  ];
  const s = structure(),
    c = createConceptSet(r, s).concepts[0]!;
  c.outline[0]!.factIds = ["fact-demo"];
  const b = buildStoryBlueprint(r, s, c, "b");
  assert.ok(
    reviewStoryBlueprint(r, c, b).some(
      (f) => f.category === "facts" && f.severity === "blocker",
    ),
  );
  const reviewed = structuredClone(r);
  reviewed.trustedFacts[0]!.reviewStatus = "human-reviewed";
  reviewed.trustedFacts[0]!.reviewerAlias = "synthetic-reviewer";
  assert.ok(
    !reviewStoryBlueprint(reviewed, c, b).some((f) => f.category === "facts"),
  );
  assert.equal(b.approvalRecords.length, 0);
  c.outline[0]!.factIds = ["unknown-fact"];
  assert.throws(() => buildStoryBlueprint(r, s, c, "b2"));
});
test("QA returns safe findings for malformed canonical shape", () => {
  const r = request(),
    s = structure(),
    c = createConceptSet(r, s).concepts[0]!;
  const f = reviewStoryBlueprint(r, c, {} as never);
  assert.ok(f.length > 0);
  assert.ok(
    f.every((x) => x.category === "validation" && x.severity === "blocker"),
  );
});
