import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = mkdtempSync(join(tmpdir(), "hekayti-evidence-test-"));
const invoke = (...args: string[]) =>
  spawnSync(
    "pwsh",
    [
      "-NoProfile",
      "-File",
      resolve("scripts/application-test-evidence.ps1"),
      ...args,
    ],
    { encoding: "utf8" },
  );
test("application reuse rejects missing and malformed evidence", () => {
  const evidence = join(root, "malformed.json");
  assert.notEqual(invoke("-Evidence", evidence).status, 0);
  writeFileSync(evidence, JSON.stringify({ status: "PASS" }));
  assert.notEqual(invoke("-Evidence", evidence).status, 0);
});
test("application evidence rejects failed or skipped summaries", () => {
  const log = join(root, "failed.log"),
    evidence = join(root, "failed.json");
  writeFileSync(
    log,
    "# tests 300\n# pass 299\n# fail 1\n# cancelled 0\n# skipped 0\n# todo 0\n",
  );
  // Neither retroactive recording nor running against an old log is permitted.
  assert.notEqual(
    invoke("-Mode", "Record", "-Evidence", evidence, "-Log", log).status,
    0,
  );
  assert.notEqual(
    invoke("-Mode", "Run", "-Evidence", evidence, "-Log", log).status,
    0,
  );
  const fixture = () => ({
    schema: "hekayti-application-evidence/2",
    status: "PASS",
    command: "npm test",
    exitCode: 0,
    inputHash: "0".repeat(64),
    afterHash: "0".repeat(64),
    logPath: log,
    logHash: createHash("sha256")
      .update(readFileSync(log))
      .digest("hex")
      .toUpperCase(),
    tests: 300,
    startedAt: "2026-10-07T00:00:00Z",
    completedAt: "2026-10-07T00:01:00Z",
  });
  writeFileSync(evidence, JSON.stringify(fixture()));
  const failed = invoke("-Evidence", evidence);
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /complete successful unskipped run/);
  writeFileSync(
    log,
    "# tests 300\n# pass 300\n# fail 0\n# cancelled 0\n# skipped 1\n# todo 0\n",
  );
  writeFileSync(evidence, JSON.stringify(fixture()));
  const skipped = invoke("-Evidence", evidence);
  assert.notEqual(skipped.status, 0);
  assert.match(skipped.stderr, /complete successful unskipped run/);
});
test("exact-content reuse rejects stale input and tampered log", () => {
  // Deliberate summary fixture tests only the integrity guard, never release proof.
  const log = join(root, "synthetic-summary.log"),
    evidence = join(root, "synthetic-evidence.json");
  writeFileSync(
    log,
    "# tests 300\n# pass 300\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n",
  );
  const record = {
    schema: "hekayti-application-evidence/2",
    status: "PASS",
    command: "npm test",
    exitCode: 0,
    inputHash: "0".repeat(64),
    afterHash: "0".repeat(64),
    logPath: log,
    logHash: createHash("sha256")
      .update(readFileSync(log))
      .digest("hex")
      .toUpperCase(),
    tests: 300,
    startedAt: "2026-10-07T00:00:00Z",
    completedAt: "2026-10-07T00:01:00Z",
  };
  writeFileSync(evidence, JSON.stringify(record));
  const stale = invoke("-Evidence", evidence);
  assert.notEqual(stale.status, 0);
  assert.match(stale.stderr, /tested inputs changed/);
  writeFileSync(log, readFileSync(log, "utf8") + "tampered\n");
  const tampered = invoke("-Evidence", evidence);
  assert.notEqual(tampered.status, 0);
  assert.match(tampered.stderr, /log no longer matches/);
});
