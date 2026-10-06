import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  SqliteProjectRepository,
  createCreativeArchive,
  readCreativeArchive,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
import {
  importLibraryBatch,
  parseLibraryBatch,
  screenCulture,
  projectCreativeLibrary,
} from "@hekayti/core/creative";
import {
  emptyStoryDna,
  narrativePattern,
  storyDnaAdvisories,
  patternFeedback,
} from "@hekayti/core/dna";
import {
  prepareGenerationPackage,
  validateGenerationEnvelope,
  StoryLibraryService,
} from "@hekayti/core/library";
import { type LibraryRecord, StoryDnaSchema } from "@hekayti/contracts/library";
const seed = (id = "creative-one"): LibraryRecord => ({
  schemaVersion: "library-record/1.0",
  recordId: id,
  version: 1,
  title: "A public fictional seed",
  payload: {
    type: "IDEA_SEED",
    idea: "Two fictional friends share a quiet discovery.",
  },
  status: "GENERATED",
  metadata: {
    sourceType: "CURATED",
    sourceProvider: "MANUAL",
    providerNote: "PRIVATE-PROVIDER-CANARY",
    modelNote: null,
  },
  tags: {
    ageBands: ["36-59m"],
    storyTypes: ["values"],
    themes: ["sharing"],
    objectives: ["connection"],
    mechanism: "reciprocity",
  },
  family: null,
  variantId: null,
  variantNumber: null,
  derivedFrom: null,
  scores: null,
  editorialNote: null,
  origin: { transport: "human-authored", importId: null, packageId: null },
});
test("historical non-null approval hash, counts and later local review survive portability without authority", () => {
  const prior = {
    originalType: "APPROVED_STORY_REFERENCE",
    originalStatus: "PROMOTED_TO_LIBRARY",
    originalVersion: 9,
    approvalHash: "a".repeat(64),
    authority: "HISTORICAL_ONLY_NOT_CURRENT_APPROVAL" as const,
  };
  const r = {
    ...seed(),
    creative: {
      schemaVersion: "creative-metadata/1.0" as const,
      source: null,
      culture: screenCulture("Source", "Ordinary fictional scene"),
      historicalAttribution: prior,
      usageSummary: {
        timesUsed: 7,
        approvedCount: 2,
        rejectedCount: 1,
        variantsCreated: 3,
      },
    },
  };
  const first = new SqliteProjectRepository(":memory:"),
    second = new SqliteProjectRepository(":memory:"),
    third = new SqliteProjectRepository(":memory:");
  importLibraryBatch(first, [r], 0, "history", "now");
  let bytes = createCreativeArchive(first, true),
    p = previewCreativeRestore(second, bytes);
  restoreCreativeArchive(second, bytes, { ...p, choices: {} }, "now");
  const service = new StoryLibraryService(second, {
    id: () => "unused",
    now: () => "now",
  });
  for (const action of ["REVIEW", "APPROVE", "PROMOTE"] as const)
    service.action(
      r.recordId,
      second.loadLibrary().recordVersion,
      `local-${action}`,
      action,
      "owner",
    );
  const projected = readCreativeArchive(createCreativeArchive(second, true))
    .bundle.records[0]!;
  assert.deepEqual(projected.creative!.historicalAttribution, prior);
  assert.equal(
    projected.creative!.latestLocalAttribution!.originalStatus,
    "PROMOTED_TO_LIBRARY",
  );
  assert.equal(projected.creative!.latestLocalAttribution!.originalVersion, 4);
  assert.deepEqual(projected.creative!.usageSummary, r.creative.usageSummary);
  bytes = createCreativeArchive(second, true);
  p = previewCreativeRestore(third, bytes);
  restoreCreativeArchive(third, bytes, { ...p, choices: {} }, "now");
  const again = readCreativeArchive(createCreativeArchive(third, true)).bundle
    .records[0]!;
  assert.deepEqual(again.creative, projected.creative);
  assert.equal(third.loadLibrary().records[0]!.status, "GENERATED");
  assert.deepEqual(third.loadLibrary().usage, []);
  first.close();
  second.close();
  third.close();
});
test("restore operation identities include canonical choices and replay later COPY without duplicate audits", () => {
  const source = new SqliteProjectRepository(":memory:"),
    target = new SqliteProjectRepository(":memory:");
  importLibraryBatch(
    source,
    [seed("one"), seed("two"), seed("three")],
    0,
    "source",
    "now",
  );
  importLibraryBatch(
    target,
    [
      { ...seed("one"), title: "Old one" },
      { ...seed("three"), title: "Old three" },
    ],
    0,
    "target",
    "now",
  );
  const bytes = createCreativeArchive(source, true);
  const restore = (
    choices: Record<string, "KEEP_EXISTING" | "COPY_WITH_NEW_IDS">,
  ) => {
    const p = previewCreativeRestore(target, bytes);
    return restoreCreativeArchive(target, bytes, { ...p, choices }, "now");
  };
  assert.equal(
    restore({ one: "KEEP_EXISTING", three: "KEEP_EXISTING" }).added,
    1,
  );
  assert.equal(
    restore({ one: "COPY_WITH_NEW_IDS", three: "COPY_WITH_NEW_IDS" }).added,
    2,
  );
  const before = target.loadLibrary();
  assert.equal(
    restore({ three: "COPY_WITH_NEW_IDS", one: "COPY_WITH_NEW_IDS" }).added,
    0,
  );
  assert.deepEqual(target.loadLibrary(), before);
  source.close();
  target.close();
});
test("kept conflicting derived lineage rejects atomically, not just structural family refs", () => {
  const source = new SqliteProjectRepository(":memory:"),
    target = new SqliteProjectRepository(":memory:"),
    parent = seed("parent"),
    child = {
      ...seed("child"),
      derivedFrom: { recordId: "parent", version: 1 },
    };
  importLibraryBatch(source, [parent, child], 0, "source", "now");
  importLibraryBatch(
    target,
    [{ ...parent, title: "Different meaning" }],
    0,
    "target",
    "now",
  );
  const bytes = createCreativeArchive(source, true),
    p = previewCreativeRestore(target, bytes),
    before = target.loadLibrary();
  assert.throws(
    () =>
      restoreCreativeArchive(
        target,
        bytes,
        { ...p, choices: { parent: "KEEP_EXISTING" } },
        "now",
      ),
    /depends on conflicting kept/,
  );
  assert.deepEqual(target.loadLibrary(), before);
  source.close();
  target.close();
});
test("all corpus seed and DNA observations are decoded narrative text, not HTML tags", () => {
  const rows = parseLibraryBatch(
    readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
  );
  for (const r of rows) {
    const values = [
      r.payload.type === "IDEA_SEED" ? r.payload.idea : "",
      r.creative?.source?.evidence ?? "",
      ...Object.values(r.creative?.dna?.fields ?? {}).map((f) => f.value ?? ""),
    ];
    for (const value of values)
      assert.doesNotMatch(value, /<\/?[a-z][^>]*>/i, r.recordId);
  }
  assert.equal(
    rows.filter((r) => r.creative?.source?.collectionId === "nigeria").length,
    40,
  );
});
test("cultural acknowledgment is enforced at portable generation and persisted-envelope boundaries", () => {
  const repo = new SqliteProjectRepository(":memory:"),
    r = {
      ...seed(),
      creative: {
        schemaVersion: "creative-metadata/1.0" as const,
        source: null,
        culture: screenCulture("Historical legend", "A god threatens death"),
        historicalAttribution: null,
        usageSummary: null,
      },
    };
  importLibraryBatch(repo, [r], 0, "cultural", "now");
  const service = new StoryLibraryService(repo, {
    id: () => "id",
    now: () => "now",
  });
  for (const action of ["SAVE", "REVIEW", "APPROVE", "PROMOTE"] as const)
    service.action(
      r.recordId,
      repo.loadLibrary().recordVersion,
      `explicit-${action}`,
      action,
      "owner",
    );
  const state = repo.loadLibrary(),
    current = state.records.at(-1)!;
  const request = {
    schemaVersion: "story-request/1.0" as const,
    requestId: "request",
    revisionId: "r1",
    projectId: "project",
    storyId: "story",
    ageMonths: 42,
    languageModes: ["ar-MSA-simple", "ar-EG"] as ("ar-MSA-simple" | "ar-EG")[],
    primaryLanguageMode: "ar-MSA-simple" as const,
    primaryCategory: "everyday-life" as const,
    objective: {
      kind: "connection" as const,
      description: "Supported discovery",
      successScenario: "Notice and reconnect",
    },
    theme: "Fictional garden",
    readingMode: "adult-read" as const,
    personalization: {
      origin: "synthetic" as const,
      profileId: "synthetic-demo",
      level: 0 as const,
      preferences: [],
      heroMode: "none" as const,
    },
    sourceStrategy: "hybrid" as const,
    trustedFacts: [],
    outputIntents: ["print", "digital"] as ("print" | "digital")[],
  };
  const input = {
    packageId: "pkg",
    createdAt: "now",
    request,
    strategy: "HYBRID" as const,
    variation: "FreshConcept" as const,
    candidateCount: 3,
    selected: [{ recordId: current.recordId, version: current.version }],
    generation: 1,
  };
  assert.throws(() => prepareGenerationPackage(input, state), /acknowledgment/);
  const pkg = prepareGenerationPackage(
    { ...input, culturalAcknowledged: true },
    state,
  );
  assert.equal(pkg.context[0]!.creative!.culture.reviewedBy, null);
  const { culturalAcknowledged, ...tampered } = pkg;
  assert.throws(() => validateGenerationEnvelope(tampered), /acknowledgment/);
  repo.close();
});
test("real corpus counts, truthful DNA/unknowns and same-family structural variants", () => {
  const rows = parseLibraryBatch(
      readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
    ),
    registry = JSON.parse(
      readFileSync("docs/story-library/source-registry.json", "utf8"),
    );
  assert.equal(rows.length, 791);
  assert.equal(
    rows.filter((r) => r.creative?.source?.kind === "SOURCE_DERIVED").length,
    765,
  );
  assert.equal(
    rows.filter(
      (r) => r.creative?.source?.extractionMethod === "ORIGINAL_ABSTRACT",
    ).length,
    121,
  );
  assert.equal(registry.counts.structuralPatterns, 20);
  assert.equal(registry.counts.representativeRichDna, 25);
  assert.equal(rows.filter((r) => r.family).length, 22);
  const get = (id: string) => rows.find((r) => r.recordId === `source-${id}`)!;
  assert.equal(
    get("aesop-1").family!.recordId,
    get("aesop-133").family!.recordId,
  );
  assert.equal(
    get("aesop-133").family!.recordId,
    get("aesop-155").family!.recordId,
  );
  assert.notEqual(
    get("aesop-1").family!.recordId,
    get("aesop-4").family!.recordId,
  );
  assert.equal(
    get("egypt-modern-1").creative!.source!.summaryScope,
    "OPENING_OBSERVATION",
  );
  assert.equal(
    get("egypt-modern-1").creative!.dna!.fields.ending.confidence,
    "UNKNOWN",
  );
  assert.equal(
    get("egypt2-2").creative!.dna!.fields.resolution.confidence,
    "NOT_AVAILABLE",
  );
  assert.equal(
    get("kalila-2").creative!.source!.evidence.includes("mw-parser-output"),
    false,
  );
  assert.equal(
    get("nasreddin-1").creative!.source!.sourceCulture.includes("NOT Egyptian"),
    true,
  );
  assert.ok(rows.every((r) => r.status === "GENERATED" && r.scores === null));
  const repo = new SqliteProjectRepository(":memory:");
  assert.equal(
    importLibraryBatch(repo, rows, 0, "real-corpus", "now").added,
    791,
  );
  assert.equal(
    repo.pageLibrary({
      patternId: get("aesop-1").creative!.dna!.pattern!.patternId,
      type: "IDEA_SEED",
    }).total,
    3,
  );
  repo.close();
});
test("max-length record IDs use bounded batch audits and exact replay", () => {
  const repo = new SqliteProjectRepository(":memory:"),
    r = seed("a".repeat(120));
  assert.equal(
    importLibraryBatch(repo, [r], 0, "b".repeat(80), "now").added,
    1,
  );
  assert.equal(importLibraryBatch(repo, [r], 1, "retry", "now").replayed, 1);
  repo.close();
});
test("forged filter fields cannot hide authoritative data; corruption is not repaired", () => {
  const path = file(),
    repo = new SqliteProjectRepository(path);
  importLibraryBatch(repo, [seed()], 0, "index", "now");
  repo.close();
  const db = new DatabaseSync(path);
  db.exec("UPDATE library_index SET title='Forged hidden title'");
  db.close();
  const opened = new SqliteProjectRepository(path);
  assert.throws(
    () => opened.pageLibrary({ search: "A public" }),
    /index differs/,
  );
  opened.close();
  const raw = new DatabaseSync(path);
  assert.equal(
    raw.prepare("SELECT title FROM library_index").get()!.title,
    "Forged hidden title",
  );
  raw.close();
});
test("restore detects variant-number collision, COPY preserves lineage under a new family", () => {
  const family = {
    ...seed("family"),
    payload: {
      type: "STORY_FAMILY" as const,
      structure: {
        narrativePattern: "Bounded problem",
        mechanism: "Try and notice",
        conflictPattern: "Misunderstanding",
        resolutionPattern: "Reconnect",
        emotionalArc: "Concern then relief",
        reusableConstraints: ["No operational approval"],
      },
    },
  };
  const variant = {
    ...seed("incoming"),
    family: { recordId: "family", version: 1 },
    variantId: "shared-variant",
    variantNumber: 1,
  };
  const source = new SqliteProjectRepository(":memory:"),
    target = new SqliteProjectRepository(":memory:");
  importLibraryBatch(source, [family, variant], 0, "source", "now");
  const bytes = createCreativeArchive(source, true);
  const archivedFamily = readCreativeArchive(bytes).bundle.records[0]!;
  importLibraryBatch(
    target,
    [archivedFamily, { ...variant, recordId: "existing" }],
    0,
    "existing",
    "now",
  );
  let p = previewCreativeRestore(target, bytes);
  assert.equal(p.conflicts.length, 1);
  assert.equal(p.conflicts[0]!.recordId, "incoming");
  const result = restoreCreativeArchive(
    target,
    bytes,
    { ...p, choices: { incoming: "COPY_WITH_NEW_IDS" } },
    "now",
  );
  assert.equal(result.added, 2);
  const copied = target
    .loadLibrary()
    .records.find((r) => r.recordId.startsWith("incoming-restored"))!;
  assert.notEqual(copied.family!.recordId, "family");
  assert.equal(copied.variantNumber, 1);
  assert.equal(
    target.loadLibrary().records.find((r) => r.recordId === "existing")!
      .variantNumber,
    1,
  );
  source.close();
  target.close();
});
test("DNA accepts infant recognition, preschool causality and complex partial forms without invented ranges", () => {
  for (const depth of ["RECOGNITION", "SIMPLE_CAUSAL", "COMPLEX"] as const) {
    const d = emptyStoryDna();
    d.dimensions.plotDepth = depth;
    d.dimensions.ageFit =
      "Synthetic unit-test editorial suggestion, not approved native/age review";
    assert.doesNotThrow(() => StoryDnaSchema.parse(d));
    assert.equal(d.fields.climax.confidence, "UNKNOWN");
  }
  const d = emptyStoryDna();
  d.dimensions.locations = [3, 1];
  assert.throws(() => StoryDnaSchema.parse(d));
  d.dimensions.locations = null;
  d.pattern = narrativePattern({
    goalCategory: "notice",
    conflictCategory: "none",
    mechanism: "recognize",
    attemptSequence: "look-repeat",
    turn: "familiar",
    resolutionCategory: "reconnect",
  });
  d.pattern.signature = "forged";
  assert.throws(() => StoryDnaSchema.parse(d));
});
test("seeded/imported scores are attribution, not actual pattern-feedback ratings", () => {
  const repo = new SqliteProjectRepository(":memory:"),
    dna = emptyStoryDna();
  dna.pattern = narrativePattern({
    goalCategory: "notice",
    conflictCategory: "none",
    mechanism: "recognition",
    attemptSequence: "repeat",
    turn: "familiar",
    resolutionCategory: "reconnect",
  });
  const r = {
    ...seed(),
    scores: { StoryQuality: 5 },
    editorialNote: "Imported opinion, not an app user rating",
    creative: {
      schemaVersion: "creative-metadata/1.0" as const,
      source: null,
      culture: screenCulture("Source", "Ordinary"),
      historicalAttribution: null,
      usageSummary: null,
      dna,
    },
  };
  importLibraryBatch(repo, [r], 0, "opinion", "now");
  const feedback = patternFeedback(repo.loadLibrary(), dna.pattern.patternId);
  assert.deepEqual(feedback.averageRatings, {});
  assert.deepEqual(feedback.notes, []);
  repo.close();
});
function file() {
  mkdirSync("temp/phase41-tests", { recursive: true });
  return join(mkdtempSync("temp/phase41-tests/run-"), "creative.sqlite");
}
test("restore rolls back canonical aggregate and first index insert when a later write fails", () => {
  const source = new SqliteProjectRepository(":memory:"),
    path = file(),
    target = new SqliteProjectRepository(path);
  importLibraryBatch(source, [seed("one"), seed("two")], 0, "source", "now");
  importLibraryBatch(target, [seed("keep")], 0, "target", "now");
  const bytes = createCreativeArchive(source, true),
    p = previewCreativeRestore(target, bytes),
    before = target.loadLibrary();
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TRIGGER fail_late BEFORE INSERT ON library_index WHEN NEW.id='two' BEGIN SELECT RAISE(ABORT,'Synthetic forced later write failure'); END;",
  );
  db.close();
  assert.throws(
    () => restoreCreativeArchive(target, bytes, { ...p, choices: {} }, "now"),
    /forced later write failure/,
  );
  assert.deepEqual(target.loadLibrary(), before);
  assert.equal(target.pageLibrary({}).total, 1);
  source.close();
  target.close();
});
test("Phase4.1 dotted checkpoint remains safely constrained by regex and Git ref validation", () => {
  const source = readFileSync("scripts/checkpoint.ps1", "utf8"),
    pattern = source.match(/\$Name -notmatch '([^']+)'/)![1]!,
    allowed = new RegExp(pattern);
  assert.equal(
    allowed.test("checkpoint/phase4.1-starter-library-complete"),
    true,
  );
  assert.equal(allowed.test("checkpoint/unsafe space"), false);
  assert.equal(allowed.test("other/phase4.1"), false);
  assert.equal(
    spawnSync("git", [
      "check-ref-format",
      "refs/tags/checkpoint/phase4.1-starter-library-complete",
    ]).status,
    0,
  );
  for (const name of [
    "checkpoint/a..b",
    "checkpoint/a.lock",
    "checkpoint/a//b",
  ])
    assert.notEqual(
      spawnSync("git", ["check-ref-format", `refs/tags/${name}`]).status,
      0,
    );
});
test("JSON/JSONL batch is atomic, strict, Unicode-aware, replayable, conflict-safe and CAS", () => {
  const repo = new SqliteProjectRepository(":memory:");
  const rows = [seed("one"), seed("two")];
  assert.equal(
    parseLibraryBatch(rows.map((x) => JSON.stringify(x)).join("\n")).length,
    2,
  );
  let s = importLibraryBatch(repo, rows, 0, "batch", "now");
  assert.equal(s.added, 2);
  assert.equal(importLibraryBatch(repo, rows, 1, "retry", "now").replayed, 2);
  assert.throws(() =>
    importLibraryBatch(
      repo,
      [{ ...seed("one"), title: "conflict" }],
      1,
      "conflict",
      "now",
    ),
  );
  assert.equal(repo.loadLibrary().records.length, 2);
  assert.throws(() =>
    importLibraryBatch(repo, [seed("three")], 0, "stale", "now"),
  );
  assert.throws(() => parseLibraryBatch('{"bad":true}\n'));
  assert.throws(() =>
    parseLibraryBatch(JSON.stringify([{ ...seed(), title: "bad\u202e" }])),
  );
  repo.close();
});
test("indexed bounded paging filters fields and survives reopen without touching normal database", () => {
  const path = file(),
    repo = new SqliteProjectRepository(path);
  importLibraryBatch(
    repo,
    Array.from({ length: 120 }, (_, i) => ({
      ...seed(`row-${String(i).padStart(3, "0")}`),
      title: `Source ${i}`,
    })),
    0,
    "page",
    "now",
  );
  assert.equal(
    repo.pageLibrary({
      offset: 100,
      limit: 10,
      type: "IDEA_SEED",
      theme: "sharing",
      age: "36-59m",
    }).records.length,
    10,
  );
  assert.equal(repo.pageLibrary({ search: "Source 11", limit: 30 }).total, 11);
  assert.throws(() => repo.pageLibrary({ limit: 1000 }));
  repo.close();
  const reopened = new SqliteProjectRepository(path);
  assert.equal(reopened.pageLibrary({ limit: 7 }).total, 120);
  reopened.close();
  const db = new DatabaseSync(path);
  db.exec("DELETE FROM library_index WHERE id='row-000'");
  db.close();
  const corrupt = new SqliteProjectRepository(path);
  assert.throws(() => corrupt.pageLibrary({}));
  corrupt.close();
});
test("allowlisted ZIP excludes mixed tables, operational aliases and provider canaries; explicit declaration", () => {
  const path = file(),
    repo = new SqliteProjectRepository(path);
  importLibraryBatch(repo, [seed()], 0, "privacy", "PRIVATE-AUDIT-ALIAS");
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE private_customer(id TEXT,payload TEXT); INSERT INTO private_customer VALUES('SECRET-CHILD-ID','PRIVATE-PHOTO-CANARY');",
  );
  db.close();
  assert.throws(() => createCreativeArchive(repo, false));
  const bytes = createCreativeArchive(repo, true),
    text = bytes.toString();
  for (const canary of [
    "SECRET-CHILD-ID",
    "PRIVATE-PHOTO-CANARY",
    "PRIVATE-PROVIDER-CANARY",
    "PRIVATE-AUDIT-ALIAS",
    "private_customer",
  ])
    assert.equal(text.includes(canary), false);
  const archive = readCreativeArchive(bytes);
  assert.equal(archive.bundle.records.length, 1);
  assert.equal(
    archive.bundle.records[0]!.creative!.historicalAttribution!.authority,
    "HISTORICAL_ONLY_NOT_CURRENT_APPROVAL",
  );
  assert.equal(archive.bundle.records[0]!.status, "GENERATED");
  assert.ok(archive.bundle.exclusions.length > 0);
  repo.close();
});
test("independent empty/merge restore, preview conflicts, idempotency, no overwrite and rollback", () => {
  const source = new SqliteProjectRepository(":memory:"),
    target = new SqliteProjectRepository(":memory:");
  importLibraryBatch(source, [seed("one"), seed("two")], 0, "source", "now");
  const bytes = createCreativeArchive(source, true);
  let p = previewCreativeRestore(target, bytes);
  assert.equal(p.add, 2);
  assert.equal(
    restoreCreativeArchive(target, bytes, { ...p, choices: {} }, "now").added,
    2,
  );
  p = previewCreativeRestore(target, bytes);
  assert.equal(p.replay, 2);
  assert.equal(
    restoreCreativeArchive(target, bytes, { ...p, choices: {} }, "now")
      .replayed,
    2,
  );
  const merge = new SqliteProjectRepository(":memory:");
  importLibraryBatch(
    merge,
    [{ ...seed("one"), title: "Different existing identity" }],
    0,
    "existing",
    "now",
  );
  p = previewCreativeRestore(merge, bytes);
  assert.equal(p.conflicts.length, 1);
  assert.throws(() =>
    restoreCreativeArchive(merge, bytes, { ...p, choices: {} }, "now"),
  );
  assert.equal(merge.loadLibrary().records.length, 1);
  const result = restoreCreativeArchive(
    merge,
    bytes,
    { ...p, choices: { one: "COPY_WITH_NEW_IDS" } },
    "now",
  );
  assert.equal(result.added, 2);
  assert.equal(merge.loadLibrary().records.length, 3);
  assert.equal(
    merge.loadLibrary().records[0]!.title,
    "Different existing identity",
  );
  assert.throws(() =>
    restoreCreativeArchive(
      merge,
      bytes,
      { ...p, choices: { one: "KEEP_EXISTING" } },
      "now",
    ),
  );
  source.close();
  target.close();
  merge.close();
});
test("bad ZIP/hash/traversal/unknown fields are rejected before mutation", () => {
  const repo = new SqliteProjectRepository(":memory:");
  importLibraryBatch(repo, [seed()], 0, "zip", "now");
  const bytes = createCreativeArchive(repo, true);
  const tampered = Buffer.from(bytes);
  tampered[60] = tampered[60]! ^ 1;
  assert.throws(() => readCreativeArchive(tampered));
  assert.throws(() => readCreativeArchive(Buffer.from("../private.sqlite")));
  const target = new SqliteProjectRepository(":memory:");
  assert.throws(() =>
    restoreCreativeArchive(
      target,
      tampered,
      { digest: "bad", expectedVersion: 0, choices: {} },
      "now",
    ),
  );
  assert.equal(target.loadLibrary().records.length, 0);
  repo.close();
  target.close();
});
test("cultural screening is provisional and separates source origin, fit, religious and rights", () => {
  const c = screenCulture(
    "Ancient legend",
    "A god demands a sacrifice and a king is killed.",
  );
  assert.equal(c.fit, "SENSITIVE_REVIEW");
  assert.equal(c.religiousReview, "RELIGIOUS_ACCURACY_REVIEW_REQUIRED");
  assert.equal(c.reviewedBy, null);
  assert.ok(c.factors.some((x) => x.dimension === "language"));
  assert.equal(
    screenCulture("Ordinary family", "A friend shares bread").fit,
    "NEEDS_ADAPTATION",
  );
  assert.equal(
    screenCulture("Old stereotype", "The savage was called ugly").fit,
    "NOT_DEFAULT",
  );
});
test("Story DNA explicit unknowns, incomplete causal advisories and structural signatures not names/themes", () => {
  const d = emptyStoryDna();
  assert.doesNotThrow(() => StoryDnaSchema.parse(d));
  assert.equal(d.fields.need.confidence, "UNKNOWN");
  d.fields.problem = {
    value: "Lost toy",
    evidence: "Opening observation",
    confidence: "SOURCE_EXTRACTED",
  };
  assert.ok(
    storyDnaAdvisories(d).some((x) => x.code === "MISSING_RESOLUTION_LINK"),
  );
  d.causalLinks = [
    {
      cause: "A",
      effect: "B",
      evidence: "Source1",
      confidence: "SOURCE_EXTRACTED",
    },
    {
      cause: "C",
      effect: "D",
      evidence: "Source2",
      confidence: "EDITORIAL_INFERENCE",
    },
  ];
  assert.ok(storyDnaAdvisories(d).some((x) => x.code === "CAUSAL_JUMP"));
  assert.throws(() =>
    StoryDnaSchema.parse({
      ...d,
      fields: {
        ...d.fields,
        goal: {
          value: "Invented goal",
          evidence: null,
          confidence: "SOURCE_EXTRACTED",
        },
      },
    }),
  );
  const structure = {
    goalCategory: "retrieve",
    conflictCategory: "misunderstanding",
    mechanism: "perspective",
    attemptSequence: "ask-observe",
    turn: "recognize",
    resolutionCategory: "correct assumption",
  };
  assert.deepEqual(
    narrativePattern(structure),
    narrativePattern({ ...structure }),
  );
  assert.notEqual(
    narrativePattern(structure).signature,
    narrativePattern({ ...structure, resolutionCategory: "cooperate" })
      .signature,
  );
  assert.throws(() =>
    narrativePattern({ ...structure, goalCategory: "UNKNOWN" }),
  );
});
test("DNA/feedback metadata survives creative projection without seeding actual ratings or approvals", () => {
  const repo = new SqliteProjectRepository(":memory:"),
    d = emptyStoryDna();
  d.dimensions.plotDepth = "RECOGNITION";
  d.pattern = narrativePattern({
    goalCategory: "notice",
    conflictCategory: "none",
    mechanism: "recognition",
    attemptSequence: "repeat",
    turn: "familiar",
    resolutionCategory: "reconnect",
  });
  const r = {
    ...seed(),
    creative: {
      schemaVersion: "creative-metadata/1.0" as const,
      source: null,
      culture: screenCulture(
        "A familiar face",
        "A baby looks and caregiver responds",
      ),
      historicalAttribution: null,
      usageSummary: null,
      dna: d,
    },
  };
  importLibraryBatch(repo, [r], 0, "dna", "now");
  assert.equal(
    patternFeedback(repo.loadLibrary(), d.pattern.patternId).approvedCount,
    0,
  );
  assert.deepEqual(
    patternFeedback(repo.loadLibrary(), d.pattern.patternId).averageRatings,
    {},
  );
  const library = new StoryLibraryService(repo, {
    id: () => "id",
    now: () => "now",
  });
  library.action(r.recordId, 1, "real-score", "SCORE", "owner", {
    scores: { StoryQuality: 4, AgeFit: 3 },
    editorialNote: "Actual synthetic test opinion",
  });
  const f = patternFeedback(repo.loadLibrary(), d.pattern.patternId);
  assert.deepEqual(f.averageRatings.StoryQuality, { count: 1, average: 4 });
  const projected = projectCreativeLibrary(repo.loadLibrary(), true);
  assert.equal(
    projected.records[0]!.creative!.dna!.pattern!.signature,
    d.pattern.signature,
  );
  assert.equal(projected.records[0]!.creative!.usageSummary!.approvedCount, 0);
  repo.close();
});
