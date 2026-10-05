import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  ProjectSchema,
  BlueprintSchema,
  LanguageEditionSchema,
  CharacterBibleSchema,
  validate,
  AppError,
  type Project,
  type StoryBlueprint,
  type LanguageEdition,
  type CharacterBible,
} from "@hekayti/contracts";
import { canonicalJson, type ProjectRepository } from "@hekayti/core";
export { LocalAssetStore, writeNewFile } from "./assets";

export class SqliteProjectRepository implements ProjectRepository {
  private readonly db: DatabaseSync;
  private transactionDepth = 0;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;");
    try {
      const version = Number(
        this.db.prepare("PRAGMA user_version").get()!.user_version,
      );
      if (version > 1)
        throw new AppError(
          "DATABASE_VERSION",
          "Database is newer than this prototype; it was not downgraded.",
        );
      if (version === 0) {
        if (
          Number(
            this.db
              .prepare(
                "SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'",
              )
              .get()!.n,
          ) > 0
        )
          throw new AppError(
            "DATABASE_UNKNOWN",
            "Unversioned existing database was preserved; manual recovery is required.",
          );
        this.transaction(() =>
          this.db.exec(`
          CREATE TABLE projects(id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL);
          CREATE TABLE blueprints(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL);
          CREATE TABLE editions(id TEXT PRIMARY KEY,revision_id TEXT NOT NULL REFERENCES blueprints(id),payload TEXT NOT NULL);
          CREATE TABLE characters(project_id TEXT NOT NULL REFERENCES projects(id),id TEXT NOT NULL,version TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(project_id,id,version));
          PRAGMA user_version=1;`),
        );
      }
      this.db.exec("PRAGMA journal_mode=WAL;");
    } catch (e) {
      this.db.close();
      throw e;
    }
  }
  transaction<T>(fn: () => T): T {
    const nested = this.transactionDepth > 0;
    const savepoint = "hekayti_" + this.transactionDepth;
    this.db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
    this.transactionDepth++;
    try {
      const value = fn();
      this.db.exec(nested ? `RELEASE ${savepoint}` : "COMMIT");
      return value;
    } catch (e) {
      this.db.exec(
        nested ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : "ROLLBACK",
      );
      throw e;
    } finally {
      this.transactionDepth--;
    }
  }
  createProject(value: Project) {
    const p = validate(ProjectSchema, value);
    this.db
      .prepare("INSERT INTO projects VALUES(?,?,?)")
      .run(p.projectId, canonicalJson(p), p.recordVersion);
  }
  loadProject(id: string): Project | null {
    const row = this.db
      .prepare("SELECT payload FROM projects WHERE id=?")
      .get(id);
    return row
      ? validate(ProjectSchema, JSON.parse(String(row.payload)))
      : null;
  }
  listProjects(): Project[] {
    return this.db
      .prepare("SELECT payload FROM projects ORDER BY id")
      .all()
      .map((r) => validate(ProjectSchema, JSON.parse(String(r.payload))));
  }
  updateProject(value: Project, expectedVersion: number): Project {
    const p = validate(ProjectSchema, {
      ...value,
      recordVersion: expectedVersion + 1,
    });
    const result = this.db
      .prepare(
        "UPDATE projects SET payload=?,version=? WHERE id=? AND version=?",
      )
      .run(canonicalJson(p), p.recordVersion, p.projectId, expectedVersion);
    if (result.changes !== 1)
      throw new AppError(
        "PROJECT_CONFLICT",
        "Project changed or is missing; reload before saving.",
      );
    return p;
  }
  saveBlueprint(value: StoryBlueprint) {
    const b = validate(BlueprintSchema, value);
    const payload = canonicalJson(b);
    const existing = this.db
      .prepare("SELECT payload FROM blueprints WHERE id=?")
      .get(b.revisionId);
    if (existing) {
      if (existing.payload !== payload)
        throw new AppError(
          "IMMUTABLE_REVISION",
          "Create a new revision instead of overwriting canonical history.",
        );
      return;
    }
    this.transaction(() => {
      this.db
        .prepare("INSERT INTO blueprints VALUES(?,?,?)")
        .run(b.revisionId, b.projectId, payload);
      for (const e of b.languageVersions) this.saveEdition(e);
      for (const c of b.characterBibles) this.saveCharacter(b.projectId, c);
    });
  }
  loadBlueprint(id: string): StoryBlueprint | null {
    const row = this.db
      .prepare("SELECT payload FROM blueprints WHERE id=?")
      .get(id);
    return row
      ? validate(BlueprintSchema, JSON.parse(String(row.payload)))
      : null;
  }
  saveEdition(value: LanguageEdition) {
    const e = validate(LanguageEditionSchema, value);
    const source = this.db
      .prepare("SELECT payload FROM blueprints WHERE id=?")
      .get(e.sourceRevision);
    if (!source)
      throw new AppError("SOURCE_MISSING", "Canonical revision is missing.");
    const b = validate(BlueprintSchema, JSON.parse(String(source.payload)));
    const updated = {
      ...b,
      languageModes: [...new Set([...b.languageModes, e.mode])],
      languageVersions: [
        ...b.languageVersions.filter((v) => v.mode !== e.mode),
        e,
      ],
    };
    validate(BlueprintSchema, updated);
    const payload = canonicalJson(e);
    const old = this.db
      .prepare("SELECT payload FROM editions WHERE id=?")
      .get(e.languageVersionId);
    if (old && old.payload !== payload)
      throw new AppError(
        "IMMUTABLE_EDITION",
        "Create a new edition revision; existing wording was retained.",
      );
    this.db
      .prepare("INSERT INTO editions VALUES(?,?,?) ON CONFLICT(id) DO NOTHING")
      .run(e.languageVersionId, e.sourceRevision, payload);
  }
  loadEdition(id: string): LanguageEdition | null {
    const row = this.db
      .prepare("SELECT payload FROM editions WHERE id=?")
      .get(id);
    return row
      ? validate(LanguageEditionSchema, JSON.parse(String(row.payload)))
      : null;
  }
  saveCharacter(projectId: string, value: CharacterBible) {
    const c = validate(CharacterBibleSchema, value);
    const payload = canonicalJson(c);
    const row = this.db
      .prepare(
        "SELECT payload FROM characters WHERE project_id=? AND id=? AND version=?",
      )
      .get(projectId, c.characterId, c.bibleVersion);
    if (row && row.payload !== payload)
      throw new AppError(
        "IMMUTABLE_CHARACTER",
        "Create a new character-bible version; existing metadata was retained.",
      );
    this.db
      .prepare("INSERT INTO characters VALUES(?,?,?,?) ON CONFLICT DO NOTHING")
      .run(projectId, c.characterId, c.bibleVersion, payload);
  }
  loadCharacter(
    projectId: string,
    id: string,
    version: string,
  ): CharacterBible | null {
    const row = this.db
      .prepare(
        "SELECT payload FROM characters WHERE project_id=? AND id=? AND version=?",
      )
      .get(projectId, id, version);
    return row
      ? validate(CharacterBibleSchema, JSON.parse(String(row.payload)))
      : null;
  }
  diagnostics() {
    return {
      schemaVersion: Number(
        this.db.prepare("PRAGMA user_version").get()!.user_version,
      ),
      sqliteVersion: String(
        this.db.prepare("SELECT sqlite_version() AS v").get()!.v,
      ),
    };
  }
  close() {
    this.db.close();
  }
}
