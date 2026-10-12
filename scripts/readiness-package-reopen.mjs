// Actual retained old synthetic project; strict dedicated OS-temp allowlist.
import { _electron } from "playwright";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const legacy = join(tmpdir(), "hekayti-phase44-ui-hx7HDv");
await readFile(join(legacy, "native-results.json")).catch(() => {});
const app = await _electron.launch({ executablePath: resolve("dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe"), args: ["--phase2-data=" + legacy], timeout: 30000 });
try {
  assert.equal(await app.evaluate(({ app }) => app.getVersion()), "0.7.2");
  const page = await app.firstWindow();
  const call = async (method, input) => { const r = await page.evaluate(({ method, input }) => window.hekayti[method](input), { method, input }); assert.equal(r.ok, true, r.error?.code); return r.value; };
  const list = await call("simpleList", { query: "", offset: 0, limit: 20 });
  assert.ok(list.stories.length > 0, "Actual old synthetic projects must exist");
  const digest = (s) => createHash("sha256").update(JSON.stringify({ drafts: s.session.workflow.drafts, approvals: s.session.workflow.approvals, book: s.book })).digest("hex");
  for (const row of list.stories) {
    const first = await call("studioLoad", { projectId: row.projectId });
    const second = await call("studioLoad", { projectId: row.projectId });
    assert.equal(digest(first), digest(second));
    assert.equal((first.book.compositionPlans ?? []).length, 0);
    assert.equal(first.book.creatorProgress, undefined);
  }
  const out = { version: "0.7.2", legacy, projects: list.stories.length, gate: "Actual0.7.0 synthetic legacy project associations/history reopen without rewritten approvals or optional fields" };
  await writeFile(join(legacy, "readiness-package-reopen-results.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
} finally { await app.close(); }
