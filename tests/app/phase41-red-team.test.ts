import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import {
  type LibraryRecord,
  StoryDnaSchema,
  LibraryRecordSchema,
} from "@hekayti/contracts/library";
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
  StoryLibraryService,
  prepareGenerationPackage,
  validateGenerationEnvelope,
} from "@hekayti/core/library";
import {
  emptyStoryDna,
  narrativePattern,
  storyDnaAdvisories,
  patternFeedback,
} from "@hekayti/core/dna";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { project } from "./fixtures";
import { type StoryRequest } from "@hekayti/contracts";

function seed(id = "qa41-seed"): LibraryRecord {
  return {
    schemaVersion: "library-record/1.0",
    recordId: id,
    version: 1,
    title: "Synthetic public seed",
    payload: {
      type: "IDEA_SEED",
      idea: "Fictional helpers notice a familiar object.",
    },
    status: "GENERATED",
    metadata: {
      sourceType: "SYNTHETIC_HEKAYTI",
      sourceProvider: "MANUAL",
      providerNote: "SYNTHETIC-PRIVATE-PROVIDER-CANARY",
      modelNote: "SYNTHETIC-MODEL-CANARY",
    },
    tags: {
      ageBands: ["36-59m"],
      storyTypes: ["everyday-life"],
      themes: ["help"],
      objectives: ["connection"],
      mechanism: "reciprocal-help",
    },
    family: null,
    variantId: null,
    variantNumber: null,
    derivedFrom: null,
    scores: null,
    editorialNote: null,
    origin: { transport: "human-authored", importId: null, packageId: null },
  };
}
function family(id = "qa41-family"): LibraryRecord {
  return {
    ...seed(id),
    payload: {
      type: "STORY_FAMILY",
      structure: {
        narrativePattern: "Reciprocal help",
        mechanism: "helping",
        conflictPattern: "Familiar bounded problem",
        resolutionPattern: "Return help",
        emotionalArc: "Reassurance",
        reusableConstraints: [],
      },
    },
  };
}
const corpus = () =>
  parseLibraryBatch(
    readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
  );
function archive(rows: LibraryRecord[]) {
  const repo = new SqliteProjectRepository(":memory:");
  importLibraryBatch(repo, rows, 0, "source", "now");
  const bytes = createCreativeArchive(repo, true);
  repo.close();
  return bytes;
}
function restore(
  repo: SqliteProjectRepository,
  bytes: Buffer,
  choices: Record<string, "KEEP_EXISTING" | "COPY_WITH_NEW_IDS"> = {},
) {
  const p = previewCreativeRestore(repo, bytes);
  return restoreCreativeArchive(repo, bytes, { ...p, choices }, "now");
}
function file() {
  mkdirSync("temp/phase41-red-team", { recursive: true });
  return join(mkdtempSync("temp/phase41-red-team/run-"), "qa.sqlite");
}

test("P41-RT-001: re-export must retain restored historical review attribution", () => {
  const source = new SqliteProjectRepository(":memory:");
  importLibraryBatch(source, [seed()], 0, "source", "now");
  const service = new StoryLibraryService(source, {
    id: () => "unused",
    now: () => "now",
  });
  for (const action of ["REVIEW", "APPROVE", "PROMOTE"] as const)
    service.action(
      "qa41-seed",
      source.loadLibrary().recordVersion,
      action,
      action,
      "synthetic-reviewer",
    );
  const first = createCreativeArchive(source, true),
    prior =
      readCreativeArchive(first).bundle.records[0]!.creative!
        .historicalAttribution!;
  assert.equal(prior.originalStatus, "PROMOTED_TO_LIBRARY");
  const target = new SqliteProjectRepository(":memory:");
  restore(target, first);
  assert.equal(target.loadLibrary().records[0]!.status, "GENERATED");
  try {
    assert.deepEqual(
      readCreativeArchive(createCreativeArchive(target, true)).bundle
        .records[0]!.creative!.historicalAttribution,
      prior,
      "A second backup must not erase the previous source review attribution",
    );
  } finally {
    source.close();
    target.close();
  }
});

test("P41-RT-001: historical usage remains attribution through two export/restore cycles", () => {
  const source = new SqliteProjectRepository(":memory:"),
    firstTarget = new SqliteProjectRepository(":memory:"),
    secondTarget = new SqliteProjectRepository(":memory:");
  importLibraryBatch(source, [seed()], 0, "source", "now");
  source.createProject(project());
  new StoryWorkflowService(
    source,
    new MockStoryConceptProvider(),
    new MockStoryDraftProvider(),
    { id: () => "unused", now: () => "now" },
  ).create({
    schemaVersion: "story-request/1.0",
    requestId: "usage-request",
    revisionId: "synthetic-revision",
    projectId: project().projectId,
    storyId: "usage-story",
    ageMonths: 42,
    languageModes: ["ar-MSA-simple", "ar-EG"],
    primaryLanguageMode: "ar-MSA-simple",
    primaryCategory: "everyday-life",
    objective: {
      kind: "connection",
      description: "Synthetic supported discovery",
      successScenario: "Notice and reconnect",
    },
    theme: "Synthetic garden",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "synthetic-profile",
      level: 0,
      preferences: [],
      heroMode: "none",
    },
    sourceStrategy: "hybrid",
    trustedFacts: [],
    outputIntents: ["print", "digital"],
  });
  const state = source.loadLibrary();
  source.saveLibrary(
    {
      ...state,
      usage: [
        {
          eventId: "synthetic-used",
          record: { recordId: "qa41-seed", version: 1 },
          projectId: project().projectId,
          requestRevisionId: "synthetic-revision",
          outcome: "USED",
          timestamp: "now",
        },
      ],
    },
    state.recordVersion,
  );
  const first = createCreativeArchive(source, true),
    usage =
      readCreativeArchive(first).bundle.records[0]!.creative!.usageSummary;
  try {
    restore(firstTarget, first);
    const second = createCreativeArchive(firstTarget, true);
    restore(secondTarget, second);
    assert.equal(firstTarget.loadLibrary().usage.length, 0);
    assert.equal(secondTarget.loadLibrary().usage.length, 0);
    assert.deepEqual(
      secondTarget.loadLibrary().records[0]!.creative!.usageSummary,
      usage,
      "Historical usage must survive without becoming current operational usage",
    );
    assert.deepEqual(
      readCreativeArchive(createCreativeArchive(secondTarget, true)).bundle
        .records[0]!.creative!.usageSummary,
      usage,
    );
  } finally {
    source.close();
    firstTarget.close();
    secondTarget.close();
  }
});

test("P41-RT-002: later COPY decision must work after an earlier KEEP merge", () => {
  const bytes = archive([seed("one"), seed("two")]),
    target = new SqliteProjectRepository(":memory:");
  importLibraryBatch(
    target,
    [{ ...seed("one"), title: "Different existing identity" }],
    0,
    "target",
    "now",
  );
  assert.equal(restore(target, bytes, { one: "KEEP_EXISTING" }).added, 1);
  const before = target.loadLibrary();
  try {
    const result = restore(target, bytes, { one: "COPY_WITH_NEW_IDS" });
    assert.equal(result.added, 1);
    assert.equal(
      target.loadLibrary().records.length,
      before.records.length + 1,
    );
  } finally {
    target.close();
  }
});

test("P41-RT-003: KEEP of a different structural family must not silently relink incoming variants", () => {
  const incoming = family(),
    variant = {
      ...seed("variant"),
      family: { recordId: incoming.recordId, version: 1 },
      variantId: "variant-ref",
      variantNumber: 1,
    },
    bytes = archive([incoming, variant]),
    target = new SqliteProjectRepository(":memory:");
  const other = family();
  if (other.payload.type === "STORY_FAMILY")
    other.payload.structure.mechanism = "a fundamentally different mechanism";
  importLibraryBatch(target, [other], 0, "target", "now");
  try {
    assert.throws(
      () => restore(target, bytes, { "qa41-family": "KEEP_EXISTING" }),
      "Dependent variants need an explicit conflict decision rather than attaching to a different kept structure",
    );
  } finally {
    target.close();
  }
});

test("P41-RT-004: Nigerian extractive observations must contain narrative text rather than HTML artifacts", () => {
  const rows = corpus().filter(
    (r) => r.creative?.source?.collectionId === "nigeria",
  );
  assert.equal(rows.length, 40);
  for (const r of rows) {
    assert.equal(r.payload.type, "IDEA_SEED");
    if (r.payload.type === "IDEA_SEED")
      assert.doesNotMatch(
        r.payload.idea,
        /<\/?(?:p|span|a|div)\b/i,
        `${r.recordId} contains raw markup rather than a clean observation`,
      );
    assert.notEqual(r.creative?.dna?.fields.ending.value?.trim(), "</p>");
  }
});

test("red team Phase41: registry collection counts, exact locators and DNA scope match committed rows", () => {
  const rows = corpus(),
    registry = JSON.parse(
      readFileSync("docs/story-library/source-registry.json", "utf8"),
    );
  assert.equal(rows.length, 791);
  assert.equal(
    rows.filter((r) => r.payload.type === "STORY_CONCEPT").length,
    0,
  );
  assert.equal(
    rows.filter((r) => r.creative?.source?.kind === "SOURCE_DERIVED").length,
    765,
  );
  assert.equal(
    rows.filter((r) => r.payload.type === "STORY_FAMILY").length,
    26,
  );
  assert.equal(
    rows.filter(
      (r) => r.creative?.source?.extractionMethod === "ORIGINAL_ABSTRACT",
    ).length,
    121,
  );
  assert.equal(
    rows.filter(
      (r) => r.creative?.source?.extractionMethod === "EXTRACTIVE_SEED",
    ).length,
    644,
  );
  for (const c of registry.collections)
    assert.equal(
      rows.filter(
        (r) =>
          r.creative?.source?.kind === "SOURCE_DERIVED" &&
          r.creative.source.collectionId === c.collectionId,
      ).length,
      c.count,
      c.collectionId,
    );
  const rich = rows.filter(
    (r) =>
      r.creative?.dna &&
      Object.entries(r.creative.dna.fields).some(
        ([k, v]) =>
          !["opening", "ending"].includes(k) &&
          v.confidence === "EDITORIAL_INFERENCE",
      ),
  );
  assert.equal(rich.length, 25);
  assert.equal(
    new Set(
      rows.flatMap((r) =>
        r.creative?.dna?.pattern ? [r.creative.dna.pattern.patternId] : [],
      ),
    ).size,
    20,
  );
  assert.equal(rows.filter((r) => r.family).length, 22);
  const modern = rows.filter(
    (r) => r.creative?.source?.collectionId === "egypt-modern",
  );
  assert.equal(modern.length, 12);
  assert.ok(
    modern.every(
      (r) =>
        r.creative!.source!.summaryScope === "OPENING_OBSERVATION" &&
        r.creative!.dna!.fields.ending.confidence === "UNKNOWN",
    ),
  );
  const unfinished = rows.find((r) => r.recordId === "source-egypt2-2")!;
  assert.equal(
    unfinished.creative!.dna!.fields.resolution.confidence,
    "NOT_AVAILABLE",
  );
  assert.equal(unfinished.creative!.dna!.fields.ending.confidence, "UNKNOWN");
  assert.equal(
    rows.filter((r) => r.creative?.source?.collectionId === "kalila").length,
    2,
  );
  assert.ok(rows.every((r) => r.status === "GENERATED" && r.scores === null));
});

test("red team Phase41: declared private fields/origins rejected while free-text declaration limits remain explicit", () => {
  for (const mutate of [
    (r: any) => (r.customerData = { name: "synthetic-private" }),
    (r: any) => (r.privateProfileRef = "synthetic-private"),
    (r: any) => (r.origin.transport = "private-customer"),
  ]) {
    const r = seed();
    mutate(r);
    assert.throws(() => parseLibraryBatch(JSON.stringify([r])));
  }
  const repo = new SqliteProjectRepository(":memory:"),
    r = { ...seed(), editorialNote: "SYNTHETIC-FREE-TEXT-PRIVACY-CANARY" };
  importLibraryBatch(repo, [r], 0, "privacy", "now");
  assert.throws(() => createCreativeArchive(repo, false));
  assert.ok(
    createCreativeArchive(repo, true)
      .toString()
      .includes("SYNTHETIC-FREE-TEXT-PRIVACY-CANARY"),
    "Allowlisted declared creative text is not automatic PII detection",
  );
  repo.close();
});

test("red team Phase41: allowlisted export excludes operational/customer/photo/package canaries", () => {
  const path = file(),
    repo = new SqliteProjectRepository(path);
  importLibraryBatch(repo, [seed()], 0, "source", "SYNTHETIC-AUDIT-CANARY");
  repo.close();
  const db = new DatabaseSync(path);
  db.exec(
    "CREATE TABLE private_customer(payload TEXT); INSERT INTO private_customer VALUES('SYNTHETIC-PHOTO-CANARY');",
  );
  db.prepare("INSERT INTO projects VALUES(?,?,?)").run(
    "synthetic-project-canary",
    JSON.stringify({
      ...project("synthetic-project-canary"),
      title: "SYNTHETIC-PROJECT-CANARY",
    }),
    0,
  );
  db.prepare("INSERT INTO generation_packages VALUES(?,?,?)").run(
    "synthetic-package",
    "synthetic-project-canary",
    "SYNTHETIC-REQUEST-CANARY",
  );
  db.close();
  const reader = new SqliteProjectRepository(path),
    bytes = createCreativeArchive(reader, true);
  for (const text of [
    "SYNTHETIC-PHOTO-CANARY",
    "SYNTHETIC-PROJECT-CANARY",
    "SYNTHETIC-REQUEST-CANARY",
    "SYNTHETIC-AUDIT-CANARY",
    "SYNTHETIC-PRIVATE-PROVIDER-CANARY",
    "SYNTHETIC-MODEL-CANARY",
  ])
    assert.equal(bytes.toString().includes(text), false, text);
  reader.close();
});

test("red team Phase41: ZIP truncation/CRC/directory/paths and stale preview reject before writes", () => {
  const bytes = archive([seed()]),
    target = new SqliteProjectRepository(":memory:"),
    before = target.loadLibrary();
  const tampered = Buffer.from(bytes);
  tampered[50] = tampered[50]! ^ 1;
  const path = Buffer.from(bytes);
  const name = Buffer.from("manifest.json"),
    at = path.indexOf(name);
  Buffer.from("../evil.jsonl").copy(path, at);
  for (const b of [
    tampered,
    path,
    bytes.subarray(0, bytes.length - 1),
    Buffer.concat([bytes, Buffer.from("extra")]),
  ])
    assert.throws(() => readCreativeArchive(b));
  const p = previewCreativeRestore(target, bytes);
  assert.deepEqual(target.loadLibrary(), before);
  assert.throws(() =>
    restoreCreativeArchive(
      target,
      bytes,
      { ...p, digest: "bad", choices: {} },
      "now",
    ),
  );
  importLibraryBatch(target, [seed("other")], 0, "change", "now");
  const changed = target.loadLibrary();
  assert.throws(() =>
    restoreCreativeArchive(target, bytes, { ...p, choices: {} }, "now"),
  );
  assert.deepEqual(target.loadLibrary(), changed);
  target.close();
});

test("red team Phase41: DNA unknowns/signatures/ranges and causal advisories stay evidence-bound", () => {
  const d = emptyStoryDna();
  assert.equal(StoryDnaSchema.safeParse(d).success, true);
  d.fields.goal = {
    value: "fabricated",
    evidence: null,
    confidence: "UNKNOWN",
  };
  assert.equal(StoryDnaSchema.safeParse(d).success, false);
  const partial = emptyStoryDna();
  partial.fields.problem = {
    value: "An observed problem",
    evidence: "Synthetic source observation",
    confidence: "EDITORIAL_INFERENCE",
  };
  assert.ok(
    storyDnaAdvisories(partial).some(
      (f) => f.code === "MISSING_RESOLUTION_LINK",
    ),
  );
  partial.dimensions.majorCharacters = [4, 1];
  assert.equal(StoryDnaSchema.safeParse(partial).success, false);
  const pattern = narrativePattern({
    goalCategory: "help",
    conflictCategory: "restraint",
    mechanism: "reciprocity",
    attemptSequence: "help-return-help",
    turn: "helper-returns",
    resolutionCategory: "release",
  });
  const altered = emptyStoryDna();
  altered.pattern = { ...pattern, signature: "theme=help" };
  assert.equal(StoryDnaSchema.safeParse(altered).success, false);
  assert.throws(() =>
    narrativePattern({
      goalCategory: "UNKNOWN",
      conflictCategory: "none",
      mechanism: "x",
      attemptSequence: "x",
      turn: "x",
      resolutionCategory: "x",
    }),
  );
});

test("red team Phase41: restored opinions and historical usage do not become SCORE feedback or current approvals", () => {
  const dna = emptyStoryDna();
  dna.pattern = narrativePattern({
    goalCategory: "help",
    conflictCategory: "none",
    mechanism: "recognition",
    attemptSequence: "repeat",
    turn: "familiar",
    resolutionCategory: "reconnect",
  });
  const r = {
    ...seed(),
    scores: { StoryQuality: 5 },
    editorialNote: "Historical opinion",
    creative: {
      schemaVersion: "creative-metadata/1.0" as const,
      source: null,
      culture: screenCulture("seed", "ordinary"),
      dna,
      historicalAttribution: null,
      usageSummary: {
        timesUsed: 9,
        variantsCreated: 3,
        approvedCount: 8,
        rejectedCount: 1,
      },
    },
  };
  const repo = new SqliteProjectRepository(":memory:");
  importLibraryBatch(repo, [r], 0, "opinions", "now");
  assert.deepEqual(
    patternFeedback(repo.loadLibrary(), dna.pattern.patternId).averageRatings,
    {},
  );
  assert.equal(
    patternFeedback(repo.loadLibrary(), dna.pattern.patternId).approvedCount,
    0,
  );
  const service = new StoryLibraryService(repo, {
    id: () => "unused",
    now: () => "now",
  });
  service.action(r.recordId, 1, "actual-score", "SCORE", "synthetic-owner", {
    scores: { StoryQuality: 3 },
    editorialNote: "Actual event",
  });
  assert.deepEqual(
    patternFeedback(repo.loadLibrary(), dna.pattern.patternId).averageRatings,
    { StoryQuality: { count: 1, average: 3 } },
  );
  assert.equal(repo.loadLibrary().records.at(-1)!.status, "GENERATED");
  repo.close();
});

test("red team Phase41: non-default/religious context needs acknowledgment at service and envelope boundaries", () => {
  const repo = new SqliteProjectRepository(":memory:"),
    r = {
      ...seed(),
      creative: {
        schemaVersion: "creative-metadata/1.0" as const,
        source: null,
        culture: screenCulture("Historical figure", "A god demands death"),
        historicalAttribution: null,
        usageSummary: null,
      },
    };
  importLibraryBatch(repo, [r], 0, "culture", "now");
  const service = new StoryLibraryService(repo, {
    id: () => "unused",
    now: () => "now",
  });
  for (const action of ["REVIEW", "APPROVE", "PROMOTE"] as const)
    service.action(
      r.recordId,
      repo.loadLibrary().recordVersion,
      action,
      action,
      "synthetic-owner",
    );
  const request: StoryRequest = {
    schemaVersion: "story-request/1.0",
    requestId: "qa41-request",
    revisionId: "qa41-r1",
    projectId: project().projectId,
    storyId: "qa41-story",
    ageMonths: 42,
    languageModes: ["ar-MSA-simple", "ar-EG"],
    primaryLanguageMode: "ar-MSA-simple",
    primaryCategory: "everyday-life",
    objective: {
      kind: "connection",
      description: "Synthetic supported discovery",
      successScenario: "Notice and reconnect",
    },
    theme: "Synthetic garden",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "synthetic-profile",
      level: 0,
      preferences: [],
      heroMode: "none",
    },
    sourceStrategy: "hybrid",
    trustedFacts: [],
    outputIntents: ["print", "digital"],
  };
  repo.createProject(project());
  const workflow = new StoryWorkflowService(
    repo,
    new MockStoryConceptProvider(),
    new MockStoryDraftProvider(),
    { id: () => "unused", now: () => "now" },
  );
  workflow.create(request);
  const input = {
    packageId: "qa41-package",
    createdAt: "now",
    request,
    strategy: "HYBRID" as const,
    variation: "FreshConcept" as const,
    candidateCount: 3,
    selected: [{ recordId: r.recordId, version: 4 }],
    generation: 0,
  };
  assert.throws(
    () => prepareGenerationPackage(input, repo.loadLibrary()),
    /acknowledgment/,
  );
  const p = prepareGenerationPackage(
    { ...input, culturalAcknowledged: true },
    repo.loadLibrary(),
  );
  repo.saveGenerationPackage(p);
  const { culturalAcknowledged, ...bad } = p;
  assert.throws(() => validateGenerationEnvelope(bad), /acknowledgment/);
  assert.throws(() => repo.saveGenerationPackage(bad), /acknowledgment/);
  assert.equal(p.context[0]!.creative!.culture.reviewedBy, null);
  repo.close();
});

test("red team Phase41: portable baseline plus local outcomes is stable without approval authority", () => {
  const prior = {
    originalType: "APPROVED_STORY_REFERENCE",
    originalStatus: "PROMOTED_TO_LIBRARY",
    originalVersion: 9,
    approvalHash: "a".repeat(64),
    authority: "HISTORICAL_ONLY_NOT_CURRENT_APPROVAL" as const,
  };
  const repo = new SqliteProjectRepository(":memory:");
  importLibraryBatch(
    repo,
    [
      {
        ...seed(),
        creative: {
          schemaVersion: "creative-metadata/1.0",
          source: null,
          culture: screenCulture("Synthetic", "Ordinary fictional scene"),
          historicalAttribution: prior,
          usageSummary: {
            timesUsed: 7,
            approvedCount: 2,
            rejectedCount: 1,
            variantsCreated: 3,
          },
        },
      },
    ],
    0,
    "baseline",
    "now",
  );
  new StoryLibraryService(repo, {
    id: () => "unused",
    now: () => "now",
  }).action("qa41-seed", 1, "local-review", "REVIEW", "synthetic-owner");
  // Pure projection countercase; this synthetic shaped event is not saved as a
  // canonical approved outcome or claimed to be a provider/workflow execution.
  const state = repo.loadLibrary(),
    input = {
      ...state,
      usage: [
        {
          eventId: "local-used",
          record: { recordId: "qa41-seed", version: 2 },
          projectId: "synthetic-project",
          requestRevisionId: "synthetic-revision",
          outcome: "USED" as const,
          timestamp: "now",
        },
      ],
    };
  try {
    const one = projectCreativeLibrary(input, true),
      two = projectCreativeLibrary(input, true);
    assert.deepEqual(one, two);
    const r = one.records[0]!;
    assert.deepEqual(r.creative!.historicalAttribution, prior);
    assert.equal(
      r.creative!.latestLocalAttribution!.originalStatus,
      "REVIEWED",
    );
    assert.equal(
      r.creative!.latestLocalAttribution!.authority,
      "HISTORICAL_ONLY_NOT_CURRENT_APPROVAL",
    );
    assert.deepEqual(r.creative!.usageSummary, {
      timesUsed: 8,
      approvedCount: 2,
      rejectedCount: 1,
      variantsCreated: 3,
    });
    assert.equal(r.status, "GENERATED");
    assert.equal(repo.loadLibrary().usage.length, 0);
    assert.equal(
      repo.loadLibrary().records[0]!.creative!.usageSummary!.timesUsed,
      7,
    );
  } finally {
    repo.close();
  }
});

test("red team Phase41: independent 5000 disposable rows import/search/export/restore/replay", () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({
      ...seed(`independent-perf-${i}`),
      title: `Disposable QA performance ${i}`,
      tags: { ...seed().tags, themes: [i % 2 ? "odd" : "even"] },
    })),
    source = new SqliteProjectRepository(":memory:"),
    target = new SqliteProjectRepository(":memory:"),
    times: Record<string, number> = {};
  function timed<T>(name: string, fn: () => T): T {
    const start = performance.now(),
      value = fn();
    times[name] = Math.round(performance.now() - start);
    return value;
  }
  assert.equal(
    timed("importMs", () => importLibraryBatch(source, rows, 0, "perf", "now"))
      .added,
    5000,
  );
  assert.equal(
    timed("searchMs", () => source.pageLibrary({ search: "performance 4999" }))
      .total,
    1,
  );
  assert.equal(
    timed("filterMs", () =>
      source.pageLibrary({ theme: "even", offset: 2400, limit: 30 }),
    ).records.length,
    30,
  );
  const bytes = timed("exportMs", () => createCreativeArchive(source, true));
  assert.equal(readCreativeArchive(bytes).bundle.records.length, 5000);
  assert.equal(
    timed("emptyRestoreMs", () => restore(target, bytes)).added,
    5000,
  );
  assert.equal(timed("replayMs", () => restore(target, bytes)).replayed, 5000);
  console.log(
    "Independent synthetic performance evidence",
    JSON.stringify({
      count: 5000,
      ...times,
      zipBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      storage: "in-memory SQLite; disposable rows excluded from real corpus",
    }),
  );
  source.close();
  target.close();
});
