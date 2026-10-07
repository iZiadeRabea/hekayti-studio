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
test("actual version-1 to current v5 migration preserves legacy row bytes and is transactional", () => {
  const path = join(dir(), "v1.sqlite"),
    original = new SqliteProjectRepository(path);
  original.createProject(project());
  original.saveBlueprint(fixture());
  original.close();
  const db = new DatabaseSync(path);
  const legacyTables = ["projects", "blueprints", "editions", "characters"];
  const legacyRows = legacyTables.map((table) =>
    db.prepare(`SELECT * FROM ${table}`).all(),
  );
  // Reconstruct real v1, not a current-v5 database with only its pragma lowered.
  db.exec(
    "DROP TABLE illustrated_books; DROP TABLE story_creator; DROP TABLE story_planners; DROP TABLE story_planner_meta; DROP TABLE library_index; DROP TABLE library_index_meta; DROP TABLE generation_package_seals; DROP TABLE manual_imports; DROP TABLE generation_packages; DROP TABLE story_library; DROP TABLE story_workflows; PRAGMA application_id=0; PRAGMA user_version=1",
  );
  assert.deepEqual(
    db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all()
      .map((row) => row.name),
    [...legacyTables].sort(),
  );
  assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 1);
  db.close();
  const migrated = new SqliteProjectRepository(path);
  assert.equal(migrated.diagnostics().schemaVersion, 5);
  assert.deepEqual(migrated.loadProject(project().projectId), project());
  assert.deepEqual(migrated.loadBlueprint(fixture().revisionId), fixture());
  assert.deepEqual(
    migrated.loadEdition(fixture().languageVersions[0]!.languageVersionId),
    fixture().languageVersions[0],
  );
  migrated.close();
  const current = new DatabaseSync(path);
  assert.deepEqual(
    legacyTables.map((table) =>
      current.prepare(`SELECT * FROM ${table}`).all(),
    ),
    legacyRows,
  );
  assert.deepEqual(
    current
      .prepare("PRAGMA table_info(story_creator)")
      .all()
      .map((row) => row.name),
    ["project_id", "payload", "version", "digest"],
  );
  assert.equal(
    current.prepare("SELECT count(*) n FROM story_creator").get()!.n,
    0,
  );
  assert.equal(
    current.prepare("SELECT count(*) n FROM illustrated_books").get()!.n,
    0,
  );
  assert.equal(current.prepare("PRAGMA user_version").get()!.user_version, 5);
  current.close();
  const broken = join(dir(), "broken-v1.sqlite"),
    corrupt = new DatabaseSync(broken);
  corrupt.exec(
    "CREATE TABLE projects(id TEXT PRIMARY KEY,payload TEXT,version INTEGER); PRAGMA user_version=1",
  );
  corrupt.close();
  assert.throws(() => new SqliteProjectRepository(broken));
  const retained = new DatabaseSync(broken);
  assert.equal(retained.prepare("PRAGMA user_version").get()!.user_version, 1);
  assert.equal(
    retained
      .prepare(
        "SELECT count(*) AS n FROM sqlite_master WHERE name='story_workflows'",
      )
      .get()!.n,
    0,
  );
  assert.equal(
    retained
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE name='story_creator'",
      )
      .get()!.n,
    0,
  );
  retained.close();
});
test("SQLite migration, CRUD, all synthetic fixture roundtrips, reopen persistence", () => {
  const path = join(dir(), "demo.sqlite");
  let r = new SqliteProjectRepository(path);
  assert.equal(r.diagnostics().schemaVersion, 5);
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

test("initialized v4 creator storage is never silently repaired or downgraded", () => {
  const path = join(dir(), "missing-v4-creator.sqlite"),
    repository = new SqliteProjectRepository(path);
  repository.createProject(project());
  repository.saveBlueprint(fixture());
  repository.close();
  const db = new DatabaseSync(path),
    before = db.prepare("SELECT payload FROM blueprints").get()!.payload;
  // Genuine initialized v4: the additive v5 book table must not exist yet.
  db.exec("DROP TABLE illustrated_books; PRAGMA user_version=4");
  assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 4);
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE name='illustrated_books'",
      )
      .get()!.n,
    0,
  );
  assert.equal(
    db
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE name='story_creator'",
      )
      .get()!.n,
    1,
  );
  db.exec("DROP TABLE story_creator");
  db.close();
  assert.throws(() => new SqliteProjectRepository(path), /story_creator/);
  const retained = new DatabaseSync(path);
  assert.equal(retained.prepare("PRAGMA user_version").get()!.user_version, 4);
  assert.equal(
    retained.prepare("SELECT payload FROM blueprints").get()!.payload,
    before,
  );
  assert.equal(
    retained
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE name='story_creator'",
      )
      .get()!.n,
    0,
  );
  assert.equal(
    retained
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE name='illustrated_books'",
      )
      .get()!.n,
    0,
  );
  retained.close();
});

test("actual initialized v4 to v5 adds only empty book storage and preserves all historical rows", () => {
  const path = join(dir(), "v4.sqlite"),
    repository = new SqliteProjectRepository(path);
  repository.createProject(project());
  repository.saveBlueprint(fixture());
  repository.close();
  const db = new DatabaseSync(path);
  db.exec("DROP TABLE illustrated_books; PRAGMA user_version=4");
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => String(row.name));
  assert.ok(tables.includes("story_creator"));
  assert.equal(tables.includes("illustrated_books"), false);
  assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 4);
  const before = tables.map((table) =>
    db.prepare(`SELECT * FROM ${table}`).all(),
  );
  db.close();
  const migrated = new SqliteProjectRepository(path);
  assert.equal(migrated.diagnostics().schemaVersion, 5);
  assert.equal(migrated.loadBook(project().projectId).recordVersion, 0);
  assert.equal(migrated.loadBook(project().projectId).assets.length, 0);
  migrated.close();
  const after = new DatabaseSync(path);
  assert.deepEqual(
    tables.map((table) => after.prepare(`SELECT * FROM ${table}`).all()),
    before,
  );
  assert.deepEqual(
    after
      .prepare("PRAGMA table_info(illustrated_books)")
      .all()
      .map((row) => row.name),
    ["project_id", "payload", "version", "digest"],
  );
  assert.equal(
    after.prepare("SELECT count(*) n FROM illustrated_books").get()!.n,
    0,
  );
  assert.equal(after.prepare("PRAGMA user_version").get()!.user_version, 5);
  after.close();
});

test("initialized v5 missing book storage fails closed without restoring the table or changing historical bytes", () => {
  const path = join(dir(), "missing-v5-books.sqlite"),
    repository = new SqliteProjectRepository(path);
  repository.createProject(project());
  repository.saveBlueprint(fixture());
  repository.close();
  const db = new DatabaseSync(path),
    before = db.prepare("SELECT payload FROM blueprints").get()!.payload;
  assert.equal(db.prepare("PRAGMA user_version").get()!.user_version, 5);
  db.exec("DROP TABLE illustrated_books");
  db.close();
  assert.throws(() => new SqliteProjectRepository(path), /illustrated_books/);
  const retained = new DatabaseSync(path);
  assert.equal(retained.prepare("PRAGMA user_version").get()!.user_version, 5);
  assert.equal(
    retained.prepare("SELECT payload FROM blueprints").get()!.payload,
    before,
  );
  assert.equal(
    retained
      .prepare(
        "SELECT count(*) n FROM sqlite_master WHERE name='illustrated_books'",
      )
      .get()!.n,
    0,
  );
  retained.close();
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
