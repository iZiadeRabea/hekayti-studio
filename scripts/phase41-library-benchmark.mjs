// Disposable synthetic performance rows NEVER count toward the sourced corpus.
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { cpus, totalmem, platform, release } from "node:os";
import { performance } from "node:perf_hooks";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  SqliteProjectRepository,
  createCreativeArchive,
  readCreativeArchive,
  previewCreativeRestore,
  restoreCreativeArchive,
} from "@hekayti/persistence";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
mkdirSync("temp/phase41-benchmark", { recursive: true });
const dir = mkdtempSync(resolve("temp/phase41-benchmark/run-")),
  timings = {};
const measure = (name, fn) => {
  const start = performance.now(),
    value = fn();
  timings[name] = Math.round((performance.now() - start) * 100) / 100;
  return value;
};
const originals = parseLibraryBatch(
  readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
);
const sourcePath = join(dir, "sourced-creative.sqlite"),
  source = new SqliteProjectRepository(sourcePath);
measure("realCorpusImportMs", () =>
  assert.equal(
    importLibraryBatch(source, originals, 0, "corpus", "2026-10-06").added,
    originals.length,
  ),
);
const realZip = measure("realCorpusExportMs", () =>
  createCreativeArchive(source, true),
);
writeFileSync(join(dir, "sourced-creative-library.zip"), realZip, {
  flag: "wx",
});
source.close();
// Full-suite independent QA already measures 5000 rows. This mode verifies the
// actual corpus recovery separately without repeating that expensive benchmark.
if (process.argv.includes("--corpus-only")) {
  const targetPath = join(dir, "actual-restored.sqlite");
  const target = new SqliteProjectRepository(targetPath);
  const p = measure("realCorpusPreviewMs", () => previewCreativeRestore(target, realZip));
  measure("realCorpusEmptyRestoreMs", () => assert.equal(
    restoreCreativeArchive(target, realZip, { ...p, choices: {} }, "2026-10-06").added,
    originals.length,
  ));
  const second = createCreativeArchive(target, true);
  assert.deepEqual(readCreativeArchive(second).bundle.records, readCreativeArchive(realZip).bundle.records);
  measure("realCorpusMergeMs", () => {
    const preview = previewCreativeRestore(target, realZip);
    assert.equal(restoreCreativeArchive(target, realZip, { ...preview, choices: {} }, "2026-10-06").replayed, originals.length);
  });
  target.close();
  const reopened = new SqliteProjectRepository(targetPath);
  assert.equal(reopened.pageLibrary({ limit: 30 }).total, originals.length);
  reopened.close();
  const receipt = { status: "PASS", actualStarterRows: originals.length, timings,
    metadataRoundtrip: "Exact projected records equal after empty restore, repeated export and merge; reopened independently without cached fulltext/project database",
    realArchive: { path: join(dir, "sourced-creative-library.zip"), bytes: realZip.length,
      sha256: createHash("sha256").update(realZip).digest("hex") }, dir };
  writeFileSync(join(dir, "evidence.json"), JSON.stringify(receipt, null, 2), { flag: "wx" });
  console.log(JSON.stringify(receipt, null, 2));
  process.exit(0);
}
const path = join(dir, "performance-only.sqlite"),
  repo = new SqliteProjectRepository(path),
  base = originals.find((r) => r.payload.type === "IDEA_SEED");
const rows = Array.from({ length: 5000 }, (_, i) => ({
  ...base,
  recordId: `perf-${String(i).padStart(5, "0")}`,
  title: `Disposable benchmark ${i}`,
  payload: {
    type: "IDEA_SEED",
    idea: "Synthetic performance fixture, not collected folklore or an age-approved concept.",
  },
  family: null,
  variantId: null,
  variantNumber: null,
  creative: undefined,
  metadata: {
    sourceType: "SYNTHETIC_HEKAYTI",
    sourceProvider: "MANUAL",
    modelNote: null,
    providerNote: null,
  },
  tags: { ...base.tags, themes: [i % 2 ? "odd" : "even"] },
}));
measure("performanceImportMs", () =>
  assert.equal(
    importLibraryBatch(repo, rows, 0, "performance", "2026-10-06").added,
    5000,
  ),
);
measure("titleSearchMs", () =>
  assert.equal(repo.pageLibrary({ search: "benchmark 4999" }).total, 1),
);
measure("filterPageMs", () => {
  const page = repo.pageLibrary({ theme: "even", offset: 2400, limit: 30 });
  assert.equal(page.total, 2500);
  assert.equal(page.records.length, 30);
});
measure("lastPageMs", () =>
  assert.equal(
    repo.pageLibrary({ offset: 4980, limit: 30 }).records.length,
    20,
  ),
);
const zip = measure("export5000Ms", () => createCreativeArchive(repo, true));
writeFileSync(join(dir, "performance-only.zip"), zip, { flag: "wx" });
repo.close();
const targetPath = join(dir, "restored-empty.sqlite"),
  target = new SqliteProjectRepository(targetPath);
const preview = measure("emptyPreviewMs", () =>
  previewCreativeRestore(target, zip),
);
measure("emptyRestoreMs", () =>
  assert.equal(
    restoreCreativeArchive(
      target,
      zip,
      { ...preview, choices: {} },
      "2026-10-06",
    ).added,
    5000,
  ),
);
measure("idempotentMergeMs", () => {
  const p = previewCreativeRestore(target, zip);
  assert.equal(
    restoreCreativeArchive(target, zip, { ...p, choices: {} }, "2026-10-06")
      .replayed,
    5000,
  );
});
target.close();
const reopened = new SqliteProjectRepository(targetPath);
assert.equal(reopened.pageLibrary({ limit: 30 }).total, 5000);
reopened.close();
const receipt = {
  status: "PASS",
  scope:
    "Atomic synthetic scale test + separately sourced isolated creative DB, not normal userdata",
  environment: {
    node: process.version,
    platform: platform(),
    release: release(),
    cpu: cpus()[0]?.model,
    logicalProcessors: cpus().length,
    memoryBytes: totalmem(),
  },
  actualStarterRows: originals.length,
  actualSourceDerivedRows: originals.filter(
    (r) => r.creative?.source?.kind === "SOURCE_DERIVED",
  ).length,
  performanceRows: 5000,
  timings,
  databaseBytes: statSync(path).size,
  archiveBytes: zip.length,
  realArchive: {
    path: join(dir, "sourced-creative-library.zip"),
    bytes: realZip.length,
    sha256: createHash("sha256").update(realZip).digest("hex"),
  },
  dir,
};
writeFileSync(join(dir, "evidence.json"), JSON.stringify(receipt, null, 2), {
  flag: "wx",
});
console.log(JSON.stringify(receipt, null, 2));
