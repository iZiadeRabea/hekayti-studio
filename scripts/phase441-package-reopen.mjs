// Read-only packaged reopen against explicitly guarded synthetic native evidence.
import { _electron } from "playwright";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { writeFile, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const native = resolve(process.argv[2] ?? "");
assert.ok(
  native
    .toLowerCase()
    .startsWith(join(tmpdir(), "hekayti-phase44-ui-441-native-").toLowerCase()),
);
const paths = [native, join(tmpdir(), "hekayti-phase44-ui-hx7HDv")],
  gates = [];
for (const data of paths) {
  let app = await _electron.launch({
    executablePath: resolve(
      "dist/phase2-package/win-unpacked/Hekayti Studio Phase 2.exe",
    ),
    args: ["--phase2-data=" + data],
    timeout: 30000,
  });
  try {
    assert.equal(await app.evaluate(({ app }) => app.getVersion()), "0.7.1");
    const page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");
    const call = async (method, input) => {
      const r = await page.evaluate(
        ({ method, input }) => window.hekayti[method](input),
        { method, input },
      );
      assert.equal(r.ok, true, r.error?.code);
      return r.value;
    };
    const list = await call("simpleList", { query: "", offset: 0, limit: 20 });
    assert.ok(list.stories.length > 0);
    for (const row of list.stories) {
      const first = await call("studioLoad", { projectId: row.projectId });
      const digest = (s) =>
        createHash("sha256")
          .update(
            JSON.stringify({
              drafts: s.session.workflow.drafts,
              approvals: s.session.workflow.approvals,
              book: s.book,
            }),
          )
          .digest("hex");
      const second = await call("studioLoad", { projectId: row.projectId });
      assert.equal(digest(first), digest(second));
      if (data === native) {
        assert.equal(first.approved, true);
        assert.equal(first.layout.pages.length, 17);
        assert.ok(
          first.book.compositionPlans.some((p) => p.repetitionOverride),
        );
      } else assert.equal((first.book.compositionPlans ?? []).length, 0);
    }
    gates.push(
      data === native
        ? "Packaged0.7.1 new composition plans/art/layout/approval reopen without mutation"
        : "Packaged0.7.1 actual0.7.0 synthetic legacy projects/history reopen without adding composition plans",
    );
  } finally {
    await app.close();
  }
}
await writeFile(
  join(native, "package-reopen-results.json"),
  JSON.stringify({ gates, version: "0.7.1", legacy: paths[1] }, null, 2),
);
console.log(JSON.stringify({ gates }, null, 2));
