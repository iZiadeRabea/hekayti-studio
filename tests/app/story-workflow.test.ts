import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SqliteProjectRepository } from "@hekayti/persistence";
import {
  StoryWorkflowService,
  WorkflowSnapshotSchema,
  workflowApprovalStatus,
  assembledBlueprint,
} from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import type {
  StoryRequest,
  StoryConceptProvider,
  StoryDraftProvider,
} from "@hekayti/contracts";
import { project } from "./fixtures";
export function request(
  ageMonths = 42,
  level: 0 | 1 | 2 | 3 = 0,
): StoryRequest {
  return {
    schemaVersion: "story-request/1.0",
    requestId: "request-demo",
    revisionId: "request-r1",
    projectId: "demo-product-design",
    storyId: "story-demo",
    ageMonths,
    languageModes: ["ar-MSA-simple", "ar-EG"],
    primaryLanguageMode: "ar-MSA-simple",
    primaryCategory: "everyday-life",
    objective: {
      kind: "connection",
      description: "Warm supported exploration",
      successScenario: "Notice and reconnect",
    },
    theme: "Familiar garden",
    readingMode: "adult-read",
    personalization: {
      origin: "synthetic",
      profileId: "synthetic-demo",
      level,
      ...(level
        ? { displayName: "ليلى", grammaticalGender: "feminine" as const }
        : {}),
      preferences: level === 2 ? ["ball"] : [],
      heroMode: level === 3 ? "child-protagonist" : "none",
    },
    sourceStrategy: "ai",
    trustedFacts: [],
    outputIntents: ["print", "digital"],
  };
}
function harness(
  concepts: StoryConceptProvider = new MockStoryConceptProvider(),
  drafts: StoryDraftProvider = new MockStoryDraftProvider(),
  path = ":memory:",
) {
  let n = 0;
  const repo = new SqliteProjectRepository(path);
  if (!repo.loadProject(project().projectId)) repo.createProject(project());
  const service = new StoryWorkflowService(repo, concepts, drafts, {
    id: () => `workflow-${++n}`,
    now: () => "2026-10-06T00:00:00Z",
  });
  return { repo, service };
}
async function complete(service: StoryWorkflowService, r = request()) {
  let s = service.create(r);
  s = await service.createMore(s.projectId, s.recordVersion);
  s = service.select(
    s.projectId,
    s.recordVersion,
    s.conceptSets.at(-1)!.concepts[0]!.conceptId,
  );
  s = service.build(s.projectId, s.recordVersion);
  s = await service.draft(s.projectId, s.recordVersion);
  s = await service.qa(s.projectId, s.recordVersion);
  return s;
}
test("complete workflow uses actual editions, explicit approval, immutable history and stale approval", async () => {
  const { repo, service } = harness();
  let s = await complete(service);
  assert.ok(
    !s.reports[0]!.findings.some(
      (x) => x.severity === "high" || x.severity === "blocker",
    ),
  );
  assert.ok(assembledBlueprint(s).languageVersions[0]!.totalWords > 0);
  assert.equal(s.blueprints[0]!.languageVersions[0]!.totalWords, 0);
  assert.notEqual(
    s.drafts[0]!.editions[0]!.languageVersionId,
    s.blueprints[0]!.languageVersions[0]!.languageVersionId,
  );
  await assert.rejects(() =>
    service.approve(s.projectId, s.recordVersion, "operator", false),
  );
  s = await service.approve(s.projectId, s.recordVersion, "operator", true);
  assert.equal(workflowApprovalStatus(s), "approved");
  const approved = structuredClone(s.approvals);
  s = await service.createMore(s.projectId, s.recordVersion);
  assert.equal(workflowApprovalStatus(s), "stale");
  assert.deepEqual(s.approvals, approved);
  assert.equal(s.conceptSets[1]!.generation, 1);
  assert.throws(() =>
    service.select(
      s.projectId,
      s.recordVersion,
      s.conceptSets[0]!.concepts[0]!.conceptId,
    ),
  );
  const changed = structuredClone(s);
  changed.requests[0]!.theme = "rewritten";
  assert.throws(
    () => repo.saveWorkflow(changed, s.recordVersion),
    /retained unchanged/,
  );
  repo.close();
});
test("representative age/language/category/personalization compositions pass real QA", async () => {
  for (const [age, level, category] of [
    [6, 0, "educational"],
    [18, 1, "behavioral"],
    [30, 2, "adventure"],
    [42, 3, "values"],
    [72, 0, "adventure"],
  ] as const) {
    const { repo, service } = harness();
    const r = request(age, level);
    r.primaryCategory = category;
    const s = await complete(service, r);
    assert.ok(
      s.drafts[0]!.editions.every(
        (e) => e.sourceRevision === s.blueprints[0]!.revisionId,
      ),
    );
    assert.ok(
      !s.reports[0]!.findings.some(
        (x) => x.severity === "blocker" || x.severity === "high",
      ),
      JSON.stringify(s.reports[0]!.findings),
    );
    repo.close();
  }
});
test("mutating adapters cannot rewrite persisted trusted inputs", async () => {
  const base = new MockStoryConceptProvider();
  const provider: StoryConceptProvider = {
    provenance: base.provenance,
    async createConcepts(r, structure, generation) {
      const set = await base.createConcepts(r, structure, generation);
      r.theme = "mutated";
      r.trustedFacts.push({
        factId: "injected",
        statement: "invented",
        sourceReference: "fake",
        reviewStatus: "human-reviewed",
        reviewerAlias: "fake",
      });
      structure.wordsPerPage = [999, 999];
      return set;
    },
  };
  const { repo, service } = harness(provider);
  let s = service.create(request());
  s = await service.createMore(s.projectId, 0);
  assert.deepEqual(s.requests, [request()]);
  assert.equal(
    repo.loadWorkflow(s.projectId)!.requests[0]!.trustedFacts.length,
    0,
  );
  repo.close();
});
test("provider rejection and stale asynchronous results preserve prior source", async () => {
  const base = new MockStoryConceptProvider();
  let release!: (v: any) => void;
  const provider: StoryConceptProvider = {
    provenance: base.provenance,
    createConcepts(r, p, g) {
      return new Promise((resolve) => {
        release = () => resolve(base.createConcepts(r, p, g));
      });
    },
  };
  const { repo, service } = harness(provider);
  const initial = service.create(request());
  const pending = service.createMore(initial.projectId, 0);
  service.reviseRequest(initial.projectId, 0, {
    ...request(),
    revisionId: "request-r2",
  });
  release(null);
  await assert.rejects(() => pending, /reload/);
  assert.equal(repo.loadWorkflow(initial.projectId)!.conceptSets.length, 0);
  repo.close();
});
test("reopen persistence keeps workflow and distinct draft artifacts", async () => {
  mkdirSync("temp/workflow-tests", { recursive: true });
  const path = join(mkdtempSync("temp/workflow-tests/run-"), "story.sqlite");
  const { repo, service } = harness(undefined, undefined, path);
  const s = await complete(service);
  repo.close();
  const reopened = new SqliteProjectRepository(path);
  assert.deepEqual(reopened.loadWorkflow(s.projectId), s);
  assert.deepEqual(
    reopened.loadEdition(s.drafts[0]!.editions[0]!.languageVersionId),
    s.drafts[0]!.editions[0],
  );
  reopened.close();
});
test("snapshot rejects malformed version, source pointers and cross project requests", () => {
  const { repo, service } = harness();
  const s = service.create(request());
  assert.equal(
    WorkflowSnapshotSchema.safeParse({ ...s, schemaVersion: "workflow/9" })
      .success,
    false,
  );
  assert.equal(
    WorkflowSnapshotSchema.safeParse({
      ...s,
      current: { ...s.current, draftId: "missing" },
    }).success,
    false,
  );
  assert.throws(() =>
    service.reviseRequest(s.projectId, 0, {
      ...request(),
      revisionId: "request-r2",
      projectId: "foreign",
    }),
  );
  assert.throws(() => repo.transaction(() => Promise.resolve()));
  repo.close();
});
test("approval requires current draft/QA and historical approval cannot be replayed", async () => {
  const { repo, service } = harness();
  let s = service.create(request());
  await assert.rejects(() => service.approve(s.projectId, 0, "operator", true));
  s = await service.createMore(s.projectId, 0);
  s = service.select(
    s.projectId,
    s.recordVersion,
    s.conceptSets[0]!.concepts[0]!.conceptId,
  );
  s = service.build(s.projectId, s.recordVersion);
  s = await service.draft(s.projectId, s.recordVersion);
  await assert.rejects(() =>
    service.approve(s.projectId, s.recordVersion, "operator", true),
  );
  s = await service.qa(s.projectId, s.recordVersion);
  s = await service.approve(s.projectId, s.recordVersion, "operator", true);
  const old = structuredClone(s);
  s = await service.qa(s.projectId, s.recordVersion);
  assert.throws(
    () => repo.saveWorkflow({ ...s, current: old.current }, s.recordVersion),
    /Stale approval cannot be revived/,
  );
  assert.equal(repo.loadWorkflow(s.projectId)!.current.approvalId, null);
  s = service.reviseRequest(s.projectId, s.recordVersion, {
    ...request(),
    revisionId: "request-r2",
  });
  assert.equal(workflowApprovalStatus(s), "stale");
  assert.throws(() =>
    repo.saveWorkflow({ ...s, current: old.current }, s.recordVersion),
  );
  repo.close();
});
test("adapter rejection, wrong provenance and draft mutation preserve immutable source", async () => {
  const base = new MockStoryDraftProvider();
  let kind = "mutation";
  const provider: StoryDraftProvider = {
    provenance: base.provenance,
    async createDraft(r, c, b, id) {
      if (kind === "failure") throw new Error("provider offline");
      const output = await base.createDraft(r, c, b, id);
      if (kind === "provenance")
        output.provenance = { ...output.provenance, kind: "ai" };
      r.theme = "provider mutated";
      c.characters.length = 0;
      b.workingTitle = "provider mutated";
      return output;
    },
  };
  const { repo, service } = harness(undefined, provider);
  let s = service.create(request());
  s = await service.createMore(s.projectId, 0);
  s = service.select(
    s.projectId,
    s.recordVersion,
    s.conceptSets[0]!.concepts[0]!.conceptId,
  );
  s = service.build(s.projectId, s.recordVersion);
  const source = structuredClone(s);
  s = await service.draft(s.projectId, s.recordVersion);
  assert.deepEqual(s.requests, source.requests);
  assert.deepEqual(s.blueprints, source.blueprints);
  assert.deepEqual(s.conceptSets, source.conceptSets);
  for (kind of ["failure", "provenance"]) {
    await assert.rejects(() => service.draft(s.projectId, s.recordVersion));
    assert.deepEqual(repo.loadWorkflow(s.projectId), s);
  }
  repo.close();
});
test("snapshot and canonical table corruption is detected on reopen, originals retained", async () => {
  mkdirSync("temp/workflow-tests", { recursive: true });
  for (const attack of ["hash", "findings", "blueprint", "edition"]) {
    const path = join(
        mkdtempSync("temp/workflow-tests/tamper-"),
        "story.sqlite",
      ),
      { repo, service } = harness(undefined, undefined, path);
    let s = await complete(service);
    s = await service.approve(s.projectId, s.recordVersion, "operator", true);
    repo.close();
    const db = new DatabaseSync(path);
    if (attack === "hash" || attack === "findings") {
      const tampered = structuredClone(s);
      if (attack === "hash") {
        tampered.reports[0]!.contentHash = "f".repeat(64);
        tampered.approvals[0]!.approval.hash = "f".repeat(64);
      } else tampered.reports[0]!.findings = [];
      db.prepare("UPDATE story_workflows SET payload=?").run(
        JSON.stringify(tampered),
      );
    } else if (attack === "blueprint")
      db.prepare("DELETE FROM editions WHERE revision_id=?").run(
        s.blueprints[0]!.revisionId,
      );
    else
      db.prepare("UPDATE editions SET payload=? WHERE id=?").run(
        "{}",
        s.drafts[0]!.editions[0]!.languageVersionId,
      );
    db.close();
    const reopened = new SqliteProjectRepository(path);
    assert.throws(() => reopened.loadWorkflow(s.projectId), /retained/);
    reopened.close();
  }
});
test("repository CAS across connections preserves successful commit", () => {
  mkdirSync("temp/workflow-tests", { recursive: true });
  const path = join(mkdtempSync("temp/workflow-tests/cas-"), "story.sqlite"),
    { repo, service } = harness(undefined, undefined, path);
  const s = service.create(request()),
    other = new SqliteProjectRepository(path);
  const saved = repo.saveWorkflow(s, 0);
  assert.throws(() => other.saveWorkflow(s, 0), /reload/);
  assert.deepEqual(other.loadWorkflow(s.projectId), saved);
  repo.close();
  other.close();
});
test("concept adapters cannot promote injected facts or change request ownership", async () => {
  const base = new MockStoryConceptProvider();
  for (const attack of ["fact", "owner", "objective", "provenance"]) {
    const provider: StoryConceptProvider = {
      provenance: base.provenance,
      async createConcepts(r, p, g) {
        const set = await base.createConcepts(r, p, g);
        if (attack === "fact") {
          r.trustedFacts.push({
            factId: "forged",
            statement: "invented",
            sourceReference: "fake",
            reviewStatus: "human-reviewed",
            reviewerAlias: "fake",
          });
          set.concepts[0]!.outline[0]!.factIds = ["forged"];
        }
        if (attack === "owner") {
          set.requestRevisionId = "foreign";
          set.concepts.forEach((c) => (c.requestRevisionId = "foreign"));
        }
        if (attack === "objective")
          set.concepts[0]!.objective.description = "rewritten";
        if (attack === "provenance") set.concepts[0]!.provenance.kind = "ai";
        return set;
      },
    };
    const { repo, service } = harness(provider),
      s = service.create(request());
    await assert.rejects(() => service.createMore(s.projectId, 0));
    assert.deepEqual(repo.loadWorkflow(s.projectId), s);
    repo.close();
  }
});
