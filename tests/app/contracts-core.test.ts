import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BlueprintSchema,
  validate,
  loadBlueprint,
  parseBlueprintJson,
  countWords,
  languageInfo,
  type Approval,
} from "@hekayti/contracts";
import {
  ageGuidance,
  contentHash,
  canonicalJson,
  approvalState,
  invalidateDependents,
  adviseBlueprint,
} from "@hekayti/core";
import { fixture, legacy, names } from "./fixtures";

for (const name of names)
  test(`legacy migration and serialization preserve meaning/prose: ${name}`, () => {
    const old = legacy(name);
    const r = loadBlueprint(old);
    assert.equal(r.migrations.length, 1);
    assert.equal(old.schemaVersion, "blueprint/0.1");
    assert.deepEqual(r.blueprint.meaningBeats, old.meaningBeats);
    assert.deepEqual(
      r.blueprint.languageVersions[0]!.pages,
      old.languageVersions[0].pages,
    );
    assert.deepEqual(
      loadBlueprint(JSON.parse(JSON.stringify(r.blueprint))).blueprint,
      r.blueprint,
    );
    assert.equal(r.blueprint.approvalRecords.length, 0);
    assert.deepEqual(adviseBlueprint(r.blueprint), []);
  });
test("corrupt JSON / unsupported future schema fail without modifying input", () => {
  assert.throws(() => parseBlueprintJson("{bad"));
  assert.throws(() =>
    loadBlueprint({ ...fixture(), schemaVersion: "blueprint/99" }),
  );
  assert.throws(() => parseBlueprintJson(" ".repeat(2_000_001)));
});
test("readable errors show field path, not invalid content", () => {
  assert.throws(
    () => validate(BlueprintSchema, { ...fixture(), ageMonths: -1 }),
    /ageMonths/,
  );
});
test("cross-reference, duplicate, order and age mismatches rejected", () => {
  const b = fixture();
  assert.throws(() => validate(BlueprintSchema, { ...b, ageBandId: "0-11m" }));
  assert.throws(() =>
    validate(BlueprintSchema, {
      ...b,
      pagePlan: [b.pagePlan[0], ...b.pagePlan],
    }),
  );
  assert.throws(() =>
    validate(BlueprintSchema, { ...b, protagonistId: "missing" }),
  );
  const changed = structuredClone(b);
  changed.pagePlan[0]!.beatIds = ["missing"];
  assert.throws(() => validate(BlueprintSchema, changed));
});
test("synthetic-only privacy boundary and under-two video block", () => {
  assert.throws(() =>
    validate(BlueprintSchema, { ...fixture(), profileOrigin: "customer" }),
  );
  assert.throws(() =>
    validate(BlueprintSchema, {
      ...fixture(),
      personalization: {
        level: 1,
        heroMode: "none",
        privateProfileRef: "private",
      },
    }),
  );
  const b = fixture();
  b.videoAdaptationNotes.childViewingEligibility = "eligible-co-viewing";
  assert.throws(() => validate(BlueprintSchema, b));
});
test("word count convention excludes punctuation and includes spoken dialogue", () => {
  assert.equal(countWords("كرة، ١٢ ؟ Ball!"), 3);
  const b = fixture();
  b.languageVersions[0]!.pages[0]!.wordCount = 999;
  assert.throws(() => validate(BlueprintSchema, b), /word totals/);
});
test("Arabic / Egyptian / English and diacritics round-trip independently", () => {
  const b = fixture();
  for (const [mode, text] of [
    ["ar-EG", "بصّ هنا! هنجرّب تاني. A-12 رقم ١٢."],
    ["en", "Look here! We can try again."],
  ] as const) {
    const e = structuredClone(b.languageVersions[0]!);
    e.mode = mode;
    e.languageVersionId += "-" + mode;
    e.pages[0]!.narration = text;
    e.pages[0]!.wordCount = countWords(text);
    e.totalWords = e.pages.reduce((s, p) => s + p.wordCount, 0);
    b.languageModes.push(mode);
    b.languageVersions.push(e);
  }
  assert.deepEqual(loadBlueprint(JSON.parse(JSON.stringify(b))).blueprint, b);
  assert.equal(languageInfo["ar-EG"].dir, "rtl");
  assert.equal(languageInfo.en.dir, "ltr");
});
for (const [age, band] of [
  [0, "0-11m"],
  [11, "0-11m"],
  [12, "12-23m"],
  [23, "12-23m"],
  [24, "24-35m"],
  [35, "24-35m"],
  [36, "36-59m"],
  [59, "36-59m"],
  [60, "60-95m"],
  [95, "60-95m"],
] as const)
  test(`age boundary ${age}`, () => {
    const input = {
      ageMonths: age,
      mode: "ar-MSA-simple" as const,
      category: "early-learning",
    };
    const g = ageGuidance(input);
    assert.equal(g.profile.id, band);
    assert.equal(g.video.eligible, age >= 24);
    assert.deepEqual(g, ageGuidance(input));
    assert.equal(g.profile.authority, "editorial-D/H");
  });
test("invalid ages and ambiguous band inputs do not silently default", () => {
  for (const age of [-1, 96, 1.5, NaN, Infinity])
    assert.throws(() =>
      ageGuidance({ ageMonths: age, mode: "en", category: "adventure" }),
    );
  assert.throws(() => ageGuidance({ mode: "en", category: "adventure" }));
  assert.throws(() =>
    ageGuidance({
      ageMonths: 20,
      ageBandId: "36-59m",
      mode: "en",
      category: "adventure",
    }),
  );
  assert.match(
    ageGuidance({
      ageBandId: "12-23m",
      mode: "ar-EG",
      category: "adventure",
    }).warnings.join(" "),
    /Band-only.*Adventure/,
  );
});
test("soft budget overrun warns but does not truncate/reject prose", () => {
  const b = fixture();
  const e = b.languageVersions[0]!;
  e.pages[0]!.narration = "كرة ".repeat(150).trim();
  e.pages[0]!.wordCount = 150;
  e.totalWords = e.pages.reduce((s, p) => s + p.wordCount, 0);
  validate(BlueprintSchema, b);
  assert.match(adviseBlueprint(b).join(" "), /advisory/);
  assert.equal(e.pages[0]!.wordCount, 150);
});
test("canonical hash independent of property order; actual wording edits change hash", async () => {
  assert.equal(
    await contentHash({ a: 1, b: 2 }),
    await contentHash({ b: 2, a: 1 }),
  );
  assert.notEqual(await contentHash("كرة"), await contentHash("بيت"));
  assert.throws(() => canonicalJson({ a: undefined }));
});
test("approvals bind exact target revision/hash and input dependencies", async () => {
  const hash = await contentHash("approved synthetic text");
  const art = await contentHash("placeholder");
  const a: Approval = {
    approvalId: "approval-1",
    targetId: "art-1",
    scope: "art",
    revisionId: "art-r1",
    hash: art,
    dependencies: [{ id: "text", revisionId: "text-r1", hash }],
    reviewerAlias: "synthetic-reviewer",
    approvedAt: "2026-10-06T00:00:00Z",
  };
  const deps = [
    { id: "art-1", revisionId: "art-r1", hash: art },
    ...a.dependencies,
  ];
  assert.equal(approvalState(a, deps), "approved");
  assert.equal(
    approvalState(a, [
      deps[0]!,
      { ...deps[1]!, hash: await contentHash("edited") },
    ]),
    "stale",
  );
  assert.equal(approvalState(a, []), "stale");
});
test("text change propagates stale transitively, preserving unrelated art and source objects", () => {
  const original = [
    { id: "plan", dependencies: ["text"], state: "approved" as const },
    { id: "art", dependencies: ["plan"], state: "approved" as const },
    { id: "export", dependencies: ["art"], state: "approved" as const },
    {
      id: "other-page",
      dependencies: ["other-text"],
      state: "approved" as const,
    },
  ];
  assert.deepEqual(
    invalidateDependents(["text"], original).map((a) => a.state),
    ["stale", "stale", "stale", "approved"],
  );
  assert.equal(original[0]!.state, "approved");
  assert.throws(() => invalidateDependents([], [original[0]!, original[0]!]));
});
