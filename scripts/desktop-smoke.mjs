import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
const packaged = process.argv.includes("--packaged");
const data = await mkdtemp(join(tmpdir(), "hekayti-phase2-smoke-"));
const exe = packaged
  ? resolve("dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe")
  : resolve("node_modules/electron/dist/electron.exe");
const args = [
  ...(packaged ? [] : [resolve("apps/desktop")]),
  "--phase2-smoke",
  "--smoke-root=" + data,
];
const code = await new Promise((done, reject) => {
  const p = spawn(exe, args, { stdio: "inherit", windowsHide: true });
  const timer = setTimeout(() => {
    p.kill();
    reject(
      new Error(
        "Desktop smoke timed out; test process stopped, data retained.",
      ),
    );
  }, 60000);
  p.on("error", reject);
  p.on("exit", (c) => {
    clearTimeout(timer);
    done(c);
  });
});
assert.equal(code, 0, "Electron smoke exit");
const result = JSON.parse(
  await readFile(join(data, "smoke-result.json"), "utf8"),
);
assert.equal(result.status, "PASS");
assert.equal(result.packaged, packaged);
assert.equal(result.projects, 3);
assert.equal(result.staleness, "stale");
assert.equal(result.export.pageCount, 6);
assert.equal(result.dataPath, data);
console.log(
  JSON.stringify({ status: "PASS", packaged, data, result }, null, 2),
);
