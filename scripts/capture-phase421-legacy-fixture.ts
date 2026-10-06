import { DatabaseSync } from "node:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { PlannerSnapshotSchema } from "@hekayti/contracts/planner";
import { WorkflowSnapshotSchema } from "@hekayti/core/workflow";
import { LibraryStateSchema } from "@hekayti/contracts/library";
import { canonicalJson } from "@hekayti/core";

// One-time fixture capture from the release receipt's *isolated synthetic UI*
// run. Never accepts a normal app/customer database path; source is read-only.
const dir = "temp/phase42-ui/run-L3jyZK",
  evidence = JSON.parse(readFileSync(`${dir}/evidence.json`, "utf8"));
if (
  evidence.status !== "PASS" ||
  !evidence.scope.includes("Synthetic offline test actions; isolated userdata")
)
  throw new Error("Not declared synthetic release fixture");
const db = new DatabaseSync(`${dir}/metadata/synthetic.sqlite`, {
    readOnly: true,
  }),
  id = evidence.projectId;
const rawWorkflow = db
    .prepare("SELECT * FROM story_workflows WHERE project_id=?")
    .get(id)!,
  rawPlanner = db
    .prepare("SELECT * FROM story_planners WHERE project_id=?")
    .get(id)!,
  workflow = WorkflowSnapshotSchema.parse(
    JSON.parse(String(rawWorkflow.payload)),
  ),
  planner = PlannerSnapshotSchema.parse(JSON.parse(String(rawPlanner.payload)));
if (
  !planner.acceptances.length ||
  !planner.packages.length ||
  planner.plans.some((p) => p.schemaVersion !== "story-plan/1.0") ||
  !workflow.approvals.length
)
  throw new Error("Expected actual retained accepted1.0/reviewed fixture");
const ids = new Set(
  planner.plans.flatMap((p) => p.provenance.sources.map((s) => s.ref.recordId)),
);
const rawLibrary = db
    .prepare("SELECT * FROM story_library WHERE id='library'")
    .get()!,
  library = LibraryStateSchema.parse(JSON.parse(String(rawLibrary.payload)));
for (const r of library.records)
  if (r.origin.transport === "planner-derived") ids.add(r.recordId);
const projection = LibraryStateSchema.parse({
  ...library,
  records: library.records.filter((r) => ids.has(r.recordId)),
  events: library.events.filter((e) => ids.has(e.recordId)),
  usage: library.usage.filter((u) => ids.has(u.record.recordId)),
});
const blueprintIds = workflow.blueprints.map((b) => b.revisionId);
const rows: Record<string, unknown[]> = {
  projects: db.prepare("SELECT * FROM projects WHERE id=?").all(id),
  blueprints: db.prepare("SELECT * FROM blueprints WHERE project_id=?").all(id),
  editions: db
    .prepare("SELECT * FROM editions")
    .all()
    .filter((row) => blueprintIds.includes(String(row.revision_id))),
  characters: db.prepare("SELECT * FROM characters WHERE project_id=?").all(id),
  story_workflows: [rawWorkflow],
  story_library: [{ ...rawLibrary, payload: canonicalJson(projection) }],
  library_index: db
    .prepare("SELECT * FROM library_index")
    .all()
    .filter((row) => ids.has(String(row.id))),
  library_index_meta: db.prepare("SELECT * FROM library_index_meta").all(),
  story_planners: [rawPlanner],
  story_planner_meta: db.prepare("SELECT * FROM story_planner_meta").all(),
};
const digest = (s: string) => createHash("sha256").update(s).digest("hex");
const result = {
  fixtureVersion: "phase421-legacy-release/1.0",
  sourceRelease: "96e64925d9556981808f00ed323941c2e61ce2dd",
  sourceEvidence:
    "Phase4.2 final receipt's development UI run-L3jyZK; captured unchanged accepted planner/workflow payloads; Library trimmed only to referenced public/synthetic records.",
  notice:
    "Actual synthetic operator test approval/feedback; NOT a provider output, literary/human/native certification or private owner trial.",
  projectId: id,
  workflowPayloadHash: digest(String(rawWorkflow.payload)),
  plannerPayloadHash: digest(String(rawPlanner.payload)),
  planHashes: planner.plans.map((p) => digest(canonicalJson(p))),
  packageHashes: planner.packages.map((p) => digest(canonicalJson(p))),
  rows,
};
mkdirSync("tests/app/fixtures", { recursive: true });
writeFileSync(
  "tests/app/fixtures/phase421-legacy-release.json",
  JSON.stringify(result, null, 2) + "\n",
);
db.close();
console.log(
  `Captured ${planner.plans.length} real retained legacy plans/${planner.packages.length} packages; source DB read-only.`,
);
