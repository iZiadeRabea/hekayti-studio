import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
test("reusable core/contracts/export have no desktop/Node/database/provider SDK imports", () => {
  for (const pkg of ["core", "contracts", "export"])
    for (const file of readdirSync(`packages/${pkg}/src`).filter((f) =>
      f.endsWith(".ts"),
    )) {
      const text = readFileSync(join("packages", pkg, "src", file), "utf8");
      assert.doesNotMatch(
        text,
        /from\s+["'](?:electron|node:|react|@hekayti\/persistence|sqlite|openai|@google)/,
      );
    }
});
test("desktop bridge exposes methods, not generic IPC or filesystem", () => {
  const text = readFileSync("apps/desktop/src/preload.ts", "utf8");
  assert.doesNotMatch(
    text,
    /exposeInMainWorld\(["'](?:ipcRenderer|require|fs|process)/,
  );
  assert.match(text, /projects:list/);
  assert.match(
    readFileSync("apps/desktop/src/main.ts", "utf8"),
    /event\.senderFrame/,
  );
});
