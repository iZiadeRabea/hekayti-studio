import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import {
  SqliteProjectRepository,
  LocalAssetStore,
  writeNewFile,
} from "@hekayti/persistence";
import { countWords } from "@hekayti/contracts";
import { fixture, project, names } from "./fixtures";
mkdirSync("temp/app-tests", { recursive: true });
test("nested project+blueprint unit of work rolls back all rows on failure", () => {
  const r = new SqliteProjectRepository(":memory:");
  assert.throws(() =>
    r.transaction(() => {
      r.createProject(project());
      r.saveBlueprint(fixture());
      throw new Error("synthetic failure after complete bundle");
    }),
  );
  assert.equal(r.loadProject(project().projectId), null);
  assert.equal(r.loadBlueprint(fixture().revisionId), null);
  r.transaction(() => {
    r.createProject(project());
    r.saveBlueprint(fixture());
  });
  assert.equal(r.listProjects().length, 1);
  r.close();
});
const dir = () => mkdtempSync("temp/app-tests/run-");
test("SQLite migration, CRUD, all synthetic fixture roundtrips, reopen persistence", () => {
  const path = join(dir(), "demo.sqlite");
  let r = new SqliteProjectRepository(path);
  assert.equal(r.diagnostics().schemaVersion, 1);
  r.createProject(project());
  for (const name of names) {
    const b = fixture(name);
    r.saveBlueprint(b);
    assert.deepEqual(r.loadBlueprint(b.revisionId), b);
  }
  assert.equal(r.listProjects().length, 1);
  const p = r.updateProject(
    { ...project(), title: "تم الحفظ Synthetic A-12" },
    0,
  );
  assert.equal(p.recordVersion, 1);
  assert.throws(() => r.updateProject(project(), 0), /reload/);
  r.close();
  r = new SqliteProjectRepository(path);
  assert.equal(
    r.loadProject(project().projectId)!.title,
    "تم الحفظ Synthetic A-12",
  );
  assert.equal(
    r.loadBlueprint(fixture().revisionId)!.languageVersions[0]!.pages[0]!
      .narration,
    fixture().languageVersions[0]!.pages[0]!.narration,
  );
  r.close();
});
test("edition and character metadata services preserve multilingual data", () => {
  const r = new SqliteProjectRepository(":memory:");
  r.createProject(project());
  const b = fixture();
  r.saveBlueprint(b);
  const e = structuredClone(b.languageVersions[0]!);
  e.mode = "ar-EG";
  e.languageVersionId += "-egyptian";
  e.pages[0]!.narration = "يلا نجرّب تاني! A-12 رقم ١٢.";
  e.pages[0]!.wordCount = countWords(e.pages[0]!.narration);
  e.totalWords = e.pages.reduce((s, p) => s + p.wordCount, 0);
  r.saveEdition(e);
  assert.deepEqual(r.loadEdition(e.languageVersionId), e);
  const c = b.characterBibles[0]!;
  assert.deepEqual(
    r.loadCharacter(b.projectId, c.characterId, c.bibleVersion),
    c,
  );
  assert.throws(
    () => r.saveCharacter(b.projectId, { ...c, clothing: "different" }),
    /version/,
  );
  r.close();
});
test("immutable canonical revisions and transaction rollback retain previous data", () => {
  const r = new SqliteProjectRepository(":memory:");
  r.createProject(project());
  const b = fixture();
  r.saveBlueprint(b);
  assert.throws(
    () => r.saveBlueprint({ ...b, workingTitle: "Changed" }),
    /new revision/,
  );
  assert.throws(() =>
    r.transaction(() => {
      r.createProject(project("rollback-demo"));
      throw new Error("synthetic failure");
    }),
  );
  assert.equal(r.loadProject("rollback-demo"), null);
  const bad = structuredClone(b);
  bad.revisionId = "new-revision";
  bad.languageVersions[0]!.sourceRevision = bad.revisionId;
  bad.languageVersions[0]!.languageVersionId += "-new";
  bad.characterBibles[0]!.clothing = "different";
  assert.throws(() => r.saveBlueprint(bad));
  assert.equal(r.loadBlueprint("new-revision"), null);
  assert.deepEqual(r.loadBlueprint(b.revisionId), b);
  r.close();
});
test("newer database and corrupted persisted payload fail safely", () => {
  const path = join(dir(), "newer.sqlite");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA user_version=99");
  db.close();
  assert.throws(() => new SqliteProjectRepository(path), /newer/);
  const p = join(dir(), "corrupt.sqlite");
  const repo = new SqliteProjectRepository(p);
  repo.createProject(project());
  repo.close();
  const corrupt = new DatabaseSync(p);
  corrupt.prepare("UPDATE projects SET payload=?").run("{bad");
  corrupt.close();
  const reader = new SqliteProjectRepository(p);
  assert.throws(() => reader.loadProject(project().projectId));
  reader.close();
  assert.ok(existsSync(p));
});
test("asset references are portable/content-addressed and tamper checked", async () => {
  const root = dir();
  const store = new LocalAssetStore(root);
  const bytes = new TextEncoder().encode("Synthetic paper-cut placeholder");
  const ref = await store.put("demo", "source", bytes, "txt");
  assert.match(ref.uri, /^asset:demo:source:/);
  assert.deepEqual(await store.get(ref), bytes);
  assert.deepEqual(await store.put("demo", "source", bytes, "txt"), ref);
  await assert.rejects(() => store.put("../escape", "source", bytes, "txt"));
  await assert.rejects(() => store.put("demo", "private" as any, bytes, "txt"));
  await assert.rejects(() =>
    store.get({ ...ref, uri: "asset:../escape:source:bad" }),
  );
  writeFileSync(join(root, "demo", "source", ref.hash + ".txt"), "changed");
  await assert.rejects(() => store.get(ref), /changed/);
});
test("failed export cannot overwrite previous complete output", async () => {
  const path = join(dir(), "existing.pdf");
  await writeNewFile(
    path,
    new TextEncoder().encode("previous valid synthetic export"),
  );
  await assert.rejects(() =>
    writeNewFile(path, new TextEncoder().encode("new candidate")),
  );
  assert.equal(readFileSync(path, "utf8"), "previous valid synthetic export");
});
