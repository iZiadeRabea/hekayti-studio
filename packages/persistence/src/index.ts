import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
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
import {
  WorkflowSnapshotSchema,
  validateWorkflowAppend,
  historicalWorkflowHashInput,
  type WorkflowSnapshot,
  type StoryWorkflowRepository,
} from "@hekayti/core/workflow";
import {
  LibraryStateSchema,
  GenerationPackageSchema,
  ManualImportSchema,
  type LibraryState,
  type GenerationPackage,
  type ManualImport,
} from "@hekayti/contracts/library";
import {
  emptyLibrary,
  validateLibraryAppend,
  parseBridgeResponse,
  validateGenerationEnvelope,
  type LibraryRepository,
} from "@hekayti/core/library";
import { storyStructureFor } from "@hekayti/core/age";
export { LocalAssetStore, writeNewFile } from "./assets";
export * from "./creative-archive";
import {
  LibraryQuerySchema,
  type LibraryQuery,
} from "@hekayti/contracts/library";
import { latestLibraryRecords } from "@hekayti/core/library";
import {
  PlannerSnapshotSchema,
  type PlannerSnapshot,
} from "@hekayti/contracts/planner";
import {
  emptyPlanner,
  validatePlannerAppend,
  validateStoryPlan,
  planToConcept,
} from "@hekayti/core/planner";

export class SqliteProjectRepository
  implements ProjectRepository, StoryWorkflowRepository, LibraryRepository
{
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
      if (version > 3)
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
      if (version <= 1) {
        // Additive migration. SQLite rolls back DDL and user_version together.
        this.transaction(() => {
          for (const table of [
            "projects",
            "blueprints",
            "editions",
            "characters",
          ])
            this.db.prepare(`SELECT * FROM ${table} LIMIT 0`).all();
          this.listProjects();
          for (const row of this.db
            .prepare("SELECT payload FROM blueprints")
            .all())
            validate(BlueprintSchema, JSON.parse(String(row.payload)));
          for (const row of this.db
            .prepare("SELECT payload FROM editions")
            .all())
            validate(LanguageEditionSchema, JSON.parse(String(row.payload)));
          for (const row of this.db
            .prepare("SELECT payload FROM characters")
            .all())
            validate(CharacterBibleSchema, JSON.parse(String(row.payload)));
          this.db.exec(
            "CREATE TABLE story_workflows(project_id TEXT PRIMARY KEY REFERENCES projects(id),payload TEXT NOT NULL,version INTEGER NOT NULL); PRAGMA user_version=2;",
          );
        });
      }
      this.db
        .prepare(
          "SELECT project_id,payload,version FROM story_workflows LIMIT 0",
        )
        .all();
      if (version <= 2)
        this.transaction(() => {
          this.db.exec(
            "CREATE TABLE story_library(id TEXT PRIMARY KEY CHECK(id='library'),payload TEXT NOT NULL,version INTEGER NOT NULL); CREATE TABLE generation_packages(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),payload TEXT NOT NULL); CREATE TABLE manual_imports(id TEXT PRIMARY KEY,package_id TEXT NOT NULL REFERENCES generation_packages(id),payload TEXT NOT NULL); PRAGMA user_version=3;",
          );
          this.db
            .prepare("INSERT INTO story_library VALUES('library',?,0)")
            .run(canonicalJson(emptyLibrary()));
        });
      for (const table of [
        "story_library",
        "generation_packages",
        "manual_imports",
      ])
        this.db.prepare(`SELECT * FROM ${table} LIMIT 0`).all();
      // Compatible v3 storage hardening: seal the entire frozen envelope separately.
      // Backfill only when upgrading a genuinely unsealed database; never repair
      // a missing seal in an already sealed database.
      const packageSealApplicationId = 0x484b3401;
      if (
        !this.db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='generation_package_seals'",
          )
          .get()
      )
        this.transaction(() => {
          if (
            Number(
              this.db.prepare("PRAGMA application_id").get()!.application_id,
            ) === packageSealApplicationId
          )
            throw new AppError(
              "BRIDGE_CORRUPT",
              "Previously initialized package seals are missing; original data retained.",
            );
          this.db.exec(
            "CREATE TABLE generation_package_seals(id TEXT PRIMARY KEY REFERENCES generation_packages(id),digest TEXT NOT NULL);",
          );
          for (const row of this.db
            .prepare("SELECT id,payload FROM generation_packages")
            .all()) {
            const p = validateGenerationEnvelope(
              JSON.parse(String(row.payload)),
            );
            if (p.packageId !== row.id)
              throw new AppError(
                "BRIDGE_CORRUPT",
                "Unsealed package identity is invalid; original data retained.",
              );
            this.validatePackageSource(p);
            this.db
              .prepare("INSERT INTO generation_package_seals VALUES(?,?)")
              .run(p.packageId, this.packageDigest(p));
          }
          this.db.exec(`PRAGMA application_id=${packageSealApplicationId}`);
        });
      this.db
        .prepare("SELECT id,digest FROM generation_package_seals LIMIT 0")
        .all();
      const hasIndex = !!this.db
        .prepare("SELECT name FROM sqlite_master WHERE name='library_index'")
        .get();
      const hasIndexMarker = !!this.db
        .prepare(
          "SELECT name FROM sqlite_master WHERE name='library_index_meta'",
        )
        .get();
      if (hasIndex !== hasIndexMarker)
        throw new AppError(
          "LIBRARY_CORRUPT",
          "Creative index initialization is incomplete/missing; original retained.",
        );
      if (!hasIndex)
        this.transaction(() => {
          this.db.exec(
            "CREATE TABLE library_index(id TEXT PRIMARY KEY,version INTEGER NOT NULL,title TEXT NOT NULL,type TEXT NOT NULL,status TEXT NOT NULL,culture TEXT NOT NULL,fit TEXT NOT NULL,payload TEXT NOT NULL); CREATE INDEX library_index_type_status ON library_index(type,status); CREATE INDEX library_index_culture_fit ON library_index(culture,fit); CREATE TABLE library_index_meta(id INTEGER PRIMARY KEY CHECK(id=1),schema_version TEXT NOT NULL); INSERT INTO library_index_meta VALUES(1,'library-index/1.0');",
          );
          for (const record of latestLibraryRecords(this.loadLibrary()))
            this.indexLibraryRecord(record);
        });
      this.db
        .prepare(
          "SELECT id,version,title,type,status,culture,fit,payload FROM library_index LIMIT 0",
        )
        .all();
      this.db.exec("PRAGMA journal_mode=WAL;");
      // Additive v3 planner extension: no legacy payload/hash/schema rewrites.
      const plannerTables = ["story_planners", "story_planner_meta"];
      const plannerPresent = plannerTables.map((name) =>
        Boolean(
          this.db
            .prepare("SELECT name FROM sqlite_master WHERE name=?")
            .get(name),
        ),
      );
      const hasPlannerMarkerColumn = this.db
        .prepare("PRAGMA table_info(library_index_meta)")
        .all()
        .some((row) => row.name === "planner_initialized");
      if (
        hasPlannerMarkerColumn &&
        Number(
          this.db
            .prepare(
              "SELECT planner_initialized FROM library_index_meta WHERE id=1",
            )
            .get()?.planner_initialized,
        ) === 1 &&
        !plannerPresent.every(Boolean)
      )
        throw new AppError(
          "PLANNER_CORRUPT",
          "Previously initialized planner extension is missing; original retained.",
        );
      if (plannerPresent.some(Boolean) && !plannerPresent.every(Boolean))
        throw new AppError(
          "PLANNER_CORRUPT",
          "Planner extension tables are incomplete; original retained.",
        );
      if (!plannerPresent.some(Boolean))
        this.transaction(() =>
          this.db.exec(
            "CREATE TABLE story_planners(project_id TEXT PRIMARY KEY REFERENCES projects(id),payload TEXT NOT NULL,version INTEGER NOT NULL,digest TEXT NOT NULL); CREATE TABLE story_planner_meta(id INTEGER PRIMARY KEY CHECK(id=1),schema_version TEXT NOT NULL); INSERT INTO story_planner_meta VALUES(1,'planner-storage/1.0');",
          ),
        );
      if (!hasPlannerMarkerColumn)
        this.transaction(() =>
          this.db.exec(
            "ALTER TABLE library_index_meta ADD COLUMN planner_initialized INTEGER NOT NULL DEFAULT 0; UPDATE library_index_meta SET planner_initialized=1 WHERE id=1;",
          ),
        );
      const plannerMarker = this.db
        .prepare("SELECT * FROM story_planner_meta")
        .all();
      if (
        plannerMarker.length !== 1 ||
        plannerMarker[0]!.schema_version !== "planner-storage/1.0"
      )
        throw new AppError(
          "PLANNER_CORRUPT",
          "Planner storage marker differs.",
        );
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
      if (value && typeof (value as { then?: unknown }).then === "function")
        throw new AppError(
          "TRANSACTION_ASYNC",
          "Async work must finish before a SQLite transaction.",
        );
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
  loadLibrary(): LibraryState {
    // The aggregate remains authoritative; indexed paging checks it, not a second canon.
    try {
      const row = this.db
        .prepare("SELECT payload,version FROM story_library WHERE id='library'")
        .get();
      if (!row) throw new Error("missing");
      const state = validate(
        LibraryStateSchema,
        JSON.parse(String(row.payload)),
      );
      if (state.recordVersion !== Number(row.version))
        throw new Error("version");
      validateLibraryAppend(emptyLibrary(), state);
      for (const event of state.usage) {
        const workflow = this.loadWorkflow(event.projectId);
        const record = state.records.find(
          (r) =>
            r.recordId === event.record.recordId &&
            r.version === event.record.version,
        )!;
        if (
          !workflow?.requests.some(
            (r) => r.revisionId === event.requestRevisionId,
          )
        )
          throw new Error("usage request");
        if (
          event.outcome === "APPROVED" &&
          (!state.usage.some(
            (e) =>
              e.outcome === "USED" &&
              e.record.recordId === event.record.recordId &&
              e.projectId === event.projectId &&
              e.requestRevisionId === event.requestRevisionId,
          ) ||
            !workflow.approvals.some((a) =>
              workflow.reportLinks.some(
                (l) =>
                  l.reportId === a.reportId &&
                  l.requestRevisionId === event.requestRevisionId &&
                  this.approvalUsesRecord(
                    workflow,
                    l.conceptId,
                    l.requestRevisionId,
                    record,
                  ),
              ),
            ))
        )
          throw new Error("approved usage source");
      }
      for (const r of state.records) {
        if (r.origin.transport === "planner-derived") {
          if (r.payload.type !== "STORY_CONCEPT")
            throw new Error("planner payload");
          const concept = r.payload.concept;
          const rows = this.db
            .prepare("SELECT payload FROM story_planners")
            .all();
          if (
            !rows.some((row) => {
              const s = validate(
                PlannerSnapshotSchema,
                JSON.parse(String(row.payload)),
              );
              return s.plans.some(
                (p) =>
                  s.acceptances.some(
                    (a) => a.planRevisionId === p.revisionId,
                  ) &&
                  canonicalJson(planToConcept(p)) === canonicalJson(concept),
              );
            })
          )
            throw new Error("planner source");
        }
        if (r.origin.transport === "manual-paste") {
          const source = r.origin.importId
            ? this.loadManualImport(r.origin.importId)
            : null;
          if (
            !source ||
            source.packageId !== r.origin.packageId ||
            !source.recordIds.includes(r.recordId) ||
            r.payload.type !== "STORY_CONCEPT" ||
            canonicalJson(
              source.candidates[source.recordIds.indexOf(r.recordId)],
            ) !== canonicalJson(r.payload.concept) ||
            canonicalJson(source.metadata) !== canonicalJson(r.metadata)
          )
            throw new Error("import source");
        }
        if (r.payload.type === "APPROVED_STORY_REFERENCE") {
          const workflow = this.loadWorkflow(r.payload.projectId);
          const reference = r.payload;
          const a = workflow?.approvals.find(
              (a) => a.approval.approvalId === reference.approvalId,
            ),
            link = workflow?.reportLinks.find(
              (l) => l.reportId === reference.reportId,
            );
          if (
            !a ||
            a.reportId !== reference.reportId ||
            a.approval.hash !== reference.contentHash ||
            !workflow?.conceptSets.some((set) =>
              set.concepts.some(
                (c) =>
                  c.conceptId === link?.conceptId &&
                  canonicalJson(c) === canonicalJson(reference.concept),
              ),
            )
          )
            throw new Error("approval source");
        }
      }
      return state;
    } catch {
      throw new AppError(
        "LIBRARY_CORRUPT",
        "Stored library failed validation; original data retained.",
      );
    }
  }
  saveLibrary(input: LibraryState, expectedVersion: number): LibraryState {
    return this.transaction(() => {
      const previous = this.loadLibrary();
      if (previous.recordVersion !== expectedVersion)
        throw new AppError("LIBRARY_CONFLICT", "Library changed; reload.");
      const next = validate(LibraryStateSchema, {
        ...input,
        recordVersion: expectedVersion + 1,
      });
      validateLibraryAppend(previous, next);
      for (const record of next.records.slice(previous.records.length))
        if (
          record.version === 1 &&
          record.payload.type === "APPROVED_STORY_REFERENCE"
        ) {
          const reference = record.payload,
            workflow = this.loadWorkflow(reference.projectId);
          const concept = workflow?.conceptSets
            .flatMap((s) => s.concepts)
            .find((c) => c.conceptId === workflow.current.conceptId);
          if (
            !workflow?.current.approvalId ||
            workflow.current.approvalId !== reference.approvalId ||
            workflow.current.reportId !== reference.reportId ||
            canonicalJson(concept) !== canonicalJson(reference.concept)
          )
            throw new AppError(
              "LIBRARY_APPROVAL_STALE",
              "New approved references require the exact currently approved canonical story; reload before extracting.",
            );
          this.validateCurrentPlannerSource(workflow);
        }
      if (
        this.db
          .prepare(
            "UPDATE story_library SET payload=?,version=? WHERE id='library' AND version=?",
          )
          .run(canonicalJson(next), next.recordVersion, expectedVersion)
          .changes !== 1
      )
        throw new AppError("LIBRARY_CONFLICT", "Library changed; reload.");
      for (const record of next.records.slice(previous.records.length))
        this.indexLibraryRecord(record);
      return this.loadLibrary();
    });
  }
  private indexLibraryRecord(
    record: import("@hekayti/contracts/library").LibraryRecord,
  ) {
    this.db
      .prepare(
        "INSERT INTO library_index VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version,title=excluded.title,type=excluded.type,status=excluded.status,culture=excluded.culture,fit=excluded.fit,payload=excluded.payload",
      )
      .run(
        record.recordId,
        record.version,
        record.title,
        record.payload.type,
        record.status,
        record.creative?.source?.sourceCulture ?? "unknown",
        record.creative?.culture.fit ?? "UNSCREENED",
        canonicalJson(record),
      );
  }
  pageLibrary(input: unknown) {
    const q = validate(LibraryQuerySchema, input),
      state = this.loadLibrary(),
      latest = latestLibraryRecords(state),
      canon = new Map(latest.map((r) => [r.recordId, r]));
    const indexRows = this.db.prepare("SELECT * FROM library_index").all();
    const marker = this.db.prepare("SELECT * FROM library_index_meta").all();
    if (
      marker.length !== 1 ||
      marker[0]!.schema_version !== "library-index/1.0" ||
      Number(marker[0]!.id) !== 1 ||
      indexRows.length !== latest.length
    )
      throw new AppError(
        "LIBRARY_CORRUPT",
        "Library index/marker missing or unexpected; original retained.",
      );
    // Check the entire mirror BEFORE filtering: a forged fit/title must not hide
    // an authoritative record from query results. Linear, never per-record saves.
    for (const row of indexRows) {
      const r = canon.get(String(row.id));
      if (
        !r ||
        String(row.payload) !== canonicalJson(r) ||
        row.title !== r.title ||
        row.type !== r.payload.type ||
        row.status !== r.status ||
        Number(row.version) !== r.version ||
        row.culture !== (r.creative?.source?.sourceCulture ?? "unknown") ||
        row.fit !== (r.creative?.culture.fit ?? "UNSCREENED")
      )
        throw new AppError(
          "LIBRARY_CORRUPT",
          "Library index differs from authoritative creative records; original retained.",
        );
    }
    const where: string[] = [],
      args: (string | number)[] = [];
    for (const [field, column] of [
      ["type", "type"],
      ["status", "status"],
      ["fit", "fit"],
    ] as const)
      if (q[field]) {
        where.push(`${column}=?`);
        args.push(q[field]!);
      }
    if (q.culture) {
      where.push("culture LIKE ? ESCAPE '\\'");
      args.push("%" + q.culture.replace(/[\\%_]/g, "\\$&") + "%");
    }
    if (q.search) {
      where.push("title LIKE ? ESCAPE '\\'");
      args.push("%" + q.search.replace(/[\\%_]/g, "\\$&") + "%");
    }
    for (const [field, path] of [
      ["age", "$.tags.ageBands"],
      ["theme", "$.tags.themes"],
      ["objective", "$.tags.objectives"],
      ["storyType", "$.tags.storyTypes"],
    ] as const)
      if (q[field]) {
        where.push("EXISTS (SELECT 1 FROM json_each(payload,?) WHERE value=?)");
        args.push(path, q[field]!);
      }
    for (const [field, path] of [
      ["source", "$.metadata.sourceType"],
      ["provider", "$.metadata.sourceProvider"],
      ["religious", "$.creative.culture.religiousReview"],
      ["familyId", "$.family.recordId"],
      ["patternId", "$.creative.dna.pattern.patternId"],
      ["profile", "$.creative.culture.profile"],
      ["plotDepth", "$.creative.dna.dimensions.plotDepth"],
    ] as const)
      if (q[field]) {
        where.push("json_extract(payload,?)=?");
        args.push(path, q[field]!);
      }
    const filter = where.length ? " WHERE " + where.join(" AND ") : "";
    const total = Number(
      this.db
        .prepare("SELECT count(*) n FROM library_index" + filter)
        .get(...args)!.n,
    );
    const rows = this.db
      .prepare(
        "SELECT * FROM library_index" +
          filter +
          " ORDER BY id LIMIT ? OFFSET ?",
      )
      .all(...args, q.limit, q.offset);
    const records = rows.map((row) => {
      const record = canon.get(String(row.id));
      if (
        !record ||
        String(row.payload) !== canonicalJson(record) ||
        row.title !== record.title ||
        row.type !== record.payload.type ||
        row.status !== record.status ||
        Number(row.version) !== record.version ||
        row.culture !== (record.creative?.source?.sourceCulture ?? "unknown") ||
        row.fit !== (record.creative?.culture.fit ?? "UNSCREENED")
      )
        throw new AppError(
          "LIBRARY_CORRUPT",
          "Library index differs from authoritative creative records; original retained.",
        );
      return record;
    });
    return {
      recordVersion: state.recordVersion,
      total,
      offset: q.offset,
      limit: q.limit,
      records,
    };
  }
  saveGenerationPackage(input: GenerationPackage) {
    this.transaction(() => {
      const p = validateGenerationEnvelope(input);
      this.validatePackageSource(p);
      const old = this.loadGenerationPackage(p.packageId);
      this.immutableBridgeRow(
        "generation_packages",
        p.packageId,
        p.request.projectId,
        p,
      );
      if (!old)
        this.db
          .prepare("INSERT INTO generation_package_seals VALUES(?,?)")
          .run(p.packageId, this.packageDigest(p));
    });
  }
  private packageDigest(p: GenerationPackage) {
    return createHash("sha256").update(canonicalJson(p)).digest("hex");
  }
  private approvalUsesRecord(
    workflow: WorkflowSnapshot,
    conceptId: string,
    requestRevisionId: string,
    record: LibraryState["records"][number],
  ) {
    const concept = workflow.conceptSets
      .flatMap((s) => s.concepts)
      .find((c) => c.conceptId === conceptId);
    if (!concept) return false;
    const planned = workflow.plannerImports?.find(
      (source) =>
        source.concept.conceptId === conceptId &&
        source.plan.planning.request.revisionId === requestRevisionId,
    );
    if (
      planned?.plan.provenance.sources.some(
        (source) =>
          source.ref.recordId === record.recordId &&
          source.ref.version === record.version &&
          source.digest ===
            createHash("sha256").update(canonicalJson(record)).digest("hex"),
      )
    )
      return true;
    if (
      "concept" in record.payload &&
      canonicalJson(record.payload.concept) === canonicalJson(concept)
    )
      return true;
    // Context contributes only through the actual approved candidate's retained
    // import/package, not through another candidate merely sharing its request.
    const source = workflow.bridgeImports?.find(
      (i) =>
        i.requestRevisionId === requestRevisionId &&
        i.candidates.some((c) => canonicalJson(c) === canonicalJson(concept)),
    );
    const pkg = source ? this.loadGenerationPackage(source.packageId) : null;
    return Boolean(
      pkg?.context.some(
        (r) =>
          r.recordId === record.recordId &&
          canonicalJson(r.payload) === canonicalJson(record.payload),
      ),
    );
  }
  private validatePackageSource(p: GenerationPackage) {
    const row = this.db
      .prepare("SELECT payload FROM story_workflows WHERE project_id=?")
      .get(p.request.projectId);
    if (
      !row ||
      !JSON.parse(String(row.payload)).requests.some(
        (r: unknown) => canonicalJson(r) === canonicalJson(p.request),
      ) ||
      canonicalJson(p.guidance) !== canonicalJson(storyStructureFor(p.request))
    )
      throw new AppError(
        "BRIDGE_SOURCE",
        "Package request/guidance must match retained canonical source.",
      );
    const libraryRow = this.db
      .prepare("SELECT payload FROM story_library WHERE id='library'")
      .get();
    const state = validate(
      LibraryStateSchema,
      JSON.parse(String(libraryRow!.payload)),
    );
    if (
      p.context.some(
        (r) =>
          r.status !== "PROMOTED_TO_LIBRARY" ||
          !state.records.some((x) => canonicalJson(x) === canonicalJson(r)),
      )
    )
      throw new AppError(
        "BRIDGE_SOURCE",
        "Frozen context must match exact retained promoted records.",
      );
  }
  loadGenerationPackage(id: string): GenerationPackage | null {
    const row = this.db
      .prepare("SELECT payload,project_id FROM generation_packages WHERE id=?")
      .get(id);
    if (!row) return null;
    try {
      const p = validateGenerationEnvelope(JSON.parse(String(row.payload)));
      if (p.packageId !== id || p.request.projectId !== row.project_id)
        throw new Error("identity");
      this.validatePackageSource(p);
      const seal = this.db
        .prepare("SELECT digest FROM generation_package_seals WHERE id=?")
        .get(id);
      if (!seal || seal.digest !== this.packageDigest(p))
        throw new Error("frozen envelope digest");
      return p;
    } catch {
      throw new AppError(
        "BRIDGE_CORRUPT",
        "Frozen package failed validation; original retained.",
      );
    }
  }
  saveManualImport(input: ManualImport) {
    const i = validate(ManualImportSchema, input),
      p = this.loadGenerationPackage(i.packageId);
    if (!p || p.request.revisionId !== i.requestRevisionId)
      throw new AppError("BRIDGE_SOURCE", "Package request missing.");
    parseBridgeResponse(
      canonicalJson({
        schemaVersion: "bridge-response/1.0",
        packageId: i.packageId,
        requestRevisionId: i.requestRevisionId,
        candidates: i.candidates,
      }),
      p,
    );
    this.immutableBridgeRow("manual_imports", i.importId, i.packageId, i);
  }
  loadManualImport(id: string): ManualImport | null {
    const row = this.db
      .prepare("SELECT payload,package_id FROM manual_imports WHERE id=?")
      .get(id);
    if (!row) return null;
    try {
      const i = validate(ManualImportSchema, JSON.parse(String(row.payload)));
      const p = this.loadGenerationPackage(i.packageId);
      if (i.importId !== id || i.packageId !== row.package_id || !p)
        throw new Error("identity");
      parseBridgeResponse(
        canonicalJson({
          schemaVersion: "bridge-response/1.0",
          packageId: i.packageId,
          requestRevisionId: i.requestRevisionId,
          candidates: i.candidates,
        }),
        p!,
      );
      return i;
    } catch {
      throw new AppError(
        "BRIDGE_CORRUPT",
        "Import failed validation; original retained.",
      );
    }
  }
  private immutableBridgeRow(
    table: "generation_packages" | "manual_imports",
    id: string,
    parent: string,
    value: unknown,
  ) {
    const payload = canonicalJson(value),
      old = this.db.prepare(`SELECT payload FROM ${table} WHERE id=?`).get(id);
    if (old && old.payload !== payload)
      throw new AppError(
        "BRIDGE_IMMUTABLE",
        "Frozen package/import cannot be overwritten.",
      );
    this.db
      .prepare(`INSERT INTO ${table} VALUES(?,?,?) ON CONFLICT(id) DO NOTHING`)
      .run(id, parent, payload);
  }
  loadWorkflow(id: string): WorkflowSnapshot | null {
    const row = this.db
      .prepare("SELECT payload,version FROM story_workflows WHERE project_id=?")
      .get(id);
    if (!row) return null;
    try {
      const value = validate(
        WorkflowSnapshotSchema,
        JSON.parse(String(row.payload)),
      );
      if (value.projectId !== id || value.recordVersion !== Number(row.version))
        throw new Error("identity");
      this.validateWorkflowHashes(value);
      this.validatePlannerWorkflowSources(value);
      for (const imported of value.bridgeImports ?? [])
        if (
          canonicalJson(this.loadManualImport(imported.importId)) !==
          canonicalJson(imported)
        )
          throw new Error("canonical manual import");
      for (const b of value.blueprints)
        if (
          canonicalJson(this.loadBlueprint(b.revisionId)) !== canonicalJson(b)
        )
          throw new Error("canonical blueprint");
      for (const b of value.blueprints)
        for (const character of b.characterBibles)
          if (
            canonicalJson(
              this.loadCharacter(
                value.projectId,
                character.characterId,
                character.bibleVersion,
              ),
            ) !== canonicalJson(character)
          )
            throw new Error("canonical character");
      for (const b of value.blueprints)
        for (const e of b.languageVersions)
          if (
            canonicalJson(this.loadEdition(e.languageVersionId)) !==
            canonicalJson(e)
          )
            throw new Error("placeholder edition");
      for (const d of value.drafts)
        for (const e of d.editions)
          if (
            canonicalJson(this.loadEdition(e.languageVersionId)) !==
            canonicalJson(e)
          )
            throw new Error("canonical edition");
      return value;
    } catch {
      throw new AppError(
        "WORKFLOW_CORRUPT",
        "Stored story state failed validation; original data was retained.",
      );
    }
  }
  private validateWorkflowHashes(s: WorkflowSnapshot) {
    for (const report of s.reports)
      if (
        createHash("sha256")
          .update(
            canonicalJson(historicalWorkflowHashInput(s, report.reportId)),
          )
          .digest("hex") !== report.contentHash
      )
        throw new AppError(
          "WORKFLOW_HASH",
          "QA source hash no longer matches its exact reviewed content.",
        );
  }
  private validatePlannerWorkflowSources(s: WorkflowSnapshot) {
    const retained = s.plannerImports?.length
      ? this.loadPlanner(s.projectId)
      : null;
    for (const source of s.plannerImports ?? []) {
      if (!retained)
        throw new AppError(
          "PLANNER_SOURCE",
          "Retained accepted planner source missing.",
        );
      const planner = retained;
      if (
        !planner.plans.some(
          (p) => canonicalJson(p) === canonicalJson(source.plan),
        ) ||
        !planner.acceptances.some(
          (a) => canonicalJson(a) === canonicalJson(source.acceptance),
        ) ||
        source.acceptance.planHash !==
          createHash("sha256")
            .update(canonicalJson(source.plan))
            .digest("hex") ||
        canonicalJson(planToConcept(source.plan)) !==
          canonicalJson(source.concept)
      )
        throw new AppError(
          "PLANNER_SOURCE",
          "Planner canonical source differs.",
        );
    }
  }
  validateCurrentPlannerSource(s: WorkflowSnapshot) {
    const source = s.plannerImports?.find(
      (source) => source.concept.conceptId === s.current.conceptId,
    );
    if (!source) return;
    const planner = this.loadPlanner(s.projectId);
    if (
      planner?.currentPlanRevisionId !== source.plan.revisionId ||
      planner.currentAcceptanceId !== source.acceptance.acceptanceId
    )
      throw new AppError(
        "PLANNER_STALE",
        "Current planner acceptance changed; rebuild from the current plan.",
      );
    const row = this.db
      .prepare("SELECT payload FROM story_library WHERE id='library'")
      .get()!;
    const library = validate(
        LibraryStateSchema,
        JSON.parse(String(row.payload)),
      ),
      latest = latestLibraryRecords(library);
    if (
      source.plan.provenance.sources.some(
        (ref) =>
          !latest.some(
            (r) =>
              r.recordId === ref.ref.recordId &&
              r.version === ref.ref.version &&
              createHash("sha256").update(canonicalJson(r)).digest("hex") ===
                ref.digest,
          ),
      )
    )
      throw new AppError(
        "PLANNER_STALE",
        "Selected Library source changed; plan again before downstream review.",
      );
  }
  loadPlanner(projectId: string): PlannerSnapshot | null {
    const row = this.db
      .prepare("SELECT * FROM story_planners WHERE project_id=?")
      .get(projectId);
    if (!row) return null;
    try {
      const s = validate(
        PlannerSnapshotSchema,
        JSON.parse(String(row.payload)),
      );
      if (
        s.projectId !== projectId ||
        s.recordVersion !== Number(row.version) ||
        createHash("sha256").update(canonicalJson(s)).digest("hex") !==
          row.digest
      )
        throw new Error("seal");
      validatePlannerAppend(emptyPlanner(projectId), s);
      const workflowRow = this.db
        .prepare("SELECT payload FROM story_workflows WHERE project_id=?")
        .get(projectId);
      if (!workflowRow) throw new Error("workflow");
      const w = validate(
        WorkflowSnapshotSchema,
        JSON.parse(String(workflowRow.payload)),
      );
      const libraryRow = this.db
        .prepare("SELECT payload FROM story_library WHERE id='library'")
        .get();
      const library = validate(
        LibraryStateSchema,
        JSON.parse(String(libraryRow!.payload)),
      );
      for (const p of s.plans) {
        if (
          !w.requests.some(
            (r) => canonicalJson(r) === canonicalJson(p.planning.request),
          )
        )
          throw new Error("request");
        for (const source of p.provenance.sources) {
          const r = library.records.find(
            (r) =>
              r.recordId === source.ref.recordId &&
              r.version === source.ref.version,
          );
          if (
            !r ||
            source.digest !==
              createHash("sha256").update(canonicalJson(r)).digest("hex") ||
            source.lifecycle !== r.status ||
            source.fit !== (r.creative?.culture.fit ?? "UNSCREENED") ||
            source.provisional !== (r.status !== "PROMOTED_TO_LIBRARY")
          )
            throw new Error("retained source");
        }
      }
      for (const a of s.acceptances) {
        const p = s.plans.find((p) => p.revisionId === a.planRevisionId)!;
        if (
          a.planHash !==
            createHash("sha256").update(canonicalJson(p)).digest("hex") ||
          validateStoryPlan(p).findings.some((f) =>
            ["high", "blocker"].includes(f.severity),
          )
        )
          throw new Error("acceptance");
      }
      for (const f of s.feedback) {
        const l = w.reportLinks.find((l) => l.reportId === f.reportId),
          d = w.drafts.find((d) => d.draftId === f.draftId),
          p = s.plans.find((p) => p.revisionId === f.planRevisionId)!;
        if (
          !l ||
          !d ||
          l.draftId !== d.draftId ||
          l.conceptId !== planToConcept(p).conceptId ||
          l.requestRevisionId !== f.requestRevisionId
        )
          throw new Error("feedback");
        if (
          f.outcome !== "REJECTED" &&
          !w.approvals.some(
            (a) =>
              a.approval.approvalId === f.approvalId &&
              a.draftId === f.draftId &&
              a.reportId === f.reportId,
          )
        )
          throw new Error("approval");
      }
      return s;
    } catch {
      throw new AppError(
        "PLANNER_CORRUPT",
        "Stored planner failed validation; original retained.",
      );
    }
  }
  savePlanner(
    input: PlannerSnapshot,
    expectedVersion: number,
  ): PlannerSnapshot {
    return this.transaction(() => {
      const before =
        this.loadPlanner(input.projectId) ?? emptyPlanner(input.projectId);
      if (before.recordVersion !== expectedVersion)
        throw new AppError("PLANNER_CONFLICT", "Planner changed; reload.");
      const s = validate(PlannerSnapshotSchema, {
        ...input,
        recordVersion: expectedVersion + 1,
      });
      validatePlannerAppend(before, s);
      if (!this.loadProject(s.projectId))
        throw new AppError(
          "PROJECT_MISSING",
          "Create canonical project first.",
        );
      const digest = createHash("sha256")
        .update(canonicalJson(s))
        .digest("hex");
      if (
        !this.db
          .prepare("SELECT project_id FROM story_planners WHERE project_id=?")
          .get(s.projectId)
      )
        this.db
          .prepare("INSERT INTO story_planners VALUES(?,?,?,?)")
          .run(s.projectId, canonicalJson(s), s.recordVersion, digest);
      else if (
        this.db
          .prepare(
            "UPDATE story_planners SET payload=?,version=?,digest=? WHERE project_id=? AND version=?",
          )
          .run(
            canonicalJson(s),
            s.recordVersion,
            digest,
            s.projectId,
            expectedVersion,
          ).changes !== 1
      )
        throw new AppError("PLANNER_CONFLICT", "Planner changed; reload.");
      return this.loadPlanner(s.projectId)!;
    });
  }
  createWorkflow(input: WorkflowSnapshot) {
    const s = validate(WorkflowSnapshotSchema, input);
    if (s.recordVersion !== 0)
      throw new AppError(
        "WORKFLOW_VERSION",
        "New stories start at version zero.",
      );
    if (
      s.requests.length !== 1 ||
      s.conceptSets.length ||
      s.blueprints.length ||
      s.drafts.length ||
      s.reports.length ||
      s.approvals.length
    )
      throw new AppError(
        "WORKFLOW_INITIAL",
        "New stories start with one request and no generated or approved artifacts.",
      );
    this.transaction(() => {
      if (!this.loadProject(s.projectId))
        throw new AppError(
          "PROJECT_MISSING",
          "Create the synthetic project first.",
        );
      this.db
        .prepare("INSERT INTO story_workflows VALUES(?,?,?)")
        .run(s.projectId, canonicalJson(s), 0);
    });
  }
  saveWorkflow(
    input: WorkflowSnapshot,
    expectedVersion: number,
  ): WorkflowSnapshot {
    const s = validate(WorkflowSnapshotSchema, {
      ...input,
      recordVersion: expectedVersion + 1,
    });
    return this.transaction(() => {
      const previous = this.loadWorkflow(s.projectId);
      if (!previous || previous.recordVersion !== expectedVersion)
        throw new AppError(
          "WORKFLOW_CONFLICT",
          "Story changed or is missing; reload before continuing.",
        );
      validateWorkflowAppend(previous, s);
      for (const imported of s.bridgeImports ?? [])
        if (
          canonicalJson(this.loadManualImport(imported.importId)) !==
          canonicalJson(imported)
        )
          throw new AppError(
            "BRIDGE_SOURCE",
            "Workflow import must match retained manual import source.",
          );
      this.validateWorkflowHashes(s);
      this.validatePlannerWorkflowSources(s);
      for (const b of s.blueprints) this.saveBlueprint(b);
      for (const d of s.drafts) for (const e of d.editions) this.saveEdition(e);
      const result = this.db
        .prepare(
          "UPDATE story_workflows SET payload=?,version=? WHERE project_id=? AND version=?",
        )
        .run(canonicalJson(s), s.recordVersion, s.projectId, expectedVersion);
      if (result.changes !== 1)
        throw new AppError(
          "WORKFLOW_CONFLICT",
          "Story changed; reload before continuing.",
        );
      return s;
    });
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
