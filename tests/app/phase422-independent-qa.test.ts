import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PlanningRequestSchema, type WriterResponse } from "@hekayti/contracts/planner";
import {
  StoryPlannerService, composeWriterStoryPlan, previewWriterResponse,
  validatePlanQualitySource, validateStoryPlan,
} from "@hekayti/core/planner";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
import { project } from "./fixtures";
import { writerDiagnosticReason } from "../../apps/desktop/renderer/src/WriterResponseFeedback";

const records = parseLibraryBatch(readFileSync("examples/starter-library/starter-library.jsonl", "utf8"));
function planning() {
  return PlanningRequestSchema.parse({
    schemaVersion: "planning-request/1.0", planningRevisionId: "independent-planning",
    request: {
      schemaVersion: "story-request/1.0", requestId: "independent-request",
      revisionId: "independent-request-1", projectId: "demo-product-design", storyId: "independent-story",
      ageMonths: 42, languageModes: ["ar-MSA-simple", "ar-EG"], primaryLanguageMode: "ar-EG",
      primaryCategory: "adventure",
      objective: { kind: "behavioral", description: "Learn to share and take turns with others",
        successScenario: "The child shares a toy and takes turns with a friend" },
      theme: "A playground game", readingMode: "adult-read",
      personalization: { origin: "synthetic", profileId: "synthetic", level: 0,
        preferences: [], heroMode: "none" },
      sourceStrategy: "hybrid", trustedFacts: [], outputIntents: ["print", "digital"],
    },
    profile: "EGYPTIAN_ARAB_MUSLIM_FAMILY", variation: "FreshConcept", generation: 0,
    selectedFamily: null, selectedCharacter: null,
    selectedSetting: "A familiar Egyptian neighborhood playground", constraints: [],
    inspirationReviewed: true, adaptationAcknowledged: true, sensitiveOptIn: false, religiousOptIn: false,
  });
}
function harness() {
  const repo = new SqliteProjectRepository(":memory:");
  repo.createProject(project());
  let n = 0;
  const seam = { id: () => `independent-${++n}`, now: () => "2026-10-06T12:00:00Z" };
  const workflow = new StoryWorkflowService(repo, new MockStoryConceptProvider(), new MockStoryDraftProvider(), seam);
  const planner = new StoryPlannerService(repo, workflow, seam, "planner-quality/1.1");
  importLibraryBatch(repo, records, 0, "synthetic", "now");
  return { repo, workflow, planner };
}
async function accepted() {
  const h = harness(), p = planning();
  let w = h.workflow.create(p.request);
  const s = await h.planner.plan(p, 0, w.recordVersion, h.repo.loadLibrary().recordVersion);
  w = h.workflow.load(w.projectId)!;
  const a = await h.planner.accept(w.projectId, s.recordVersion, w.recordVersion, "synthetic-reviewer", true);
  const prepared = await h.planner.prepare(w.projectId, a.planner.recordVersion, a.workflow.recordVersion);
  return { ...h, w: a.workflow, pkg: prepared.package };
}
function response(h: Awaited<ReturnType<typeof accepted>>): WriterResponse {
  return { schemaVersion: "writer-response/1.0", editions: h.pkg.plan.planning.request.languageModes.map(mode => ({
    mode, pages: h.w.blueprints.at(-1)!.pagePlan.map((_, i) => ({
      pageNumber: i + 1, narration: "نور مدت الكورة لسلمى. سلمى خدت دورها ورجعت الكورة لنور.",
      dialogue: [], altText: "طفلتان تتبادلان الكرة.",
    })),
  })) };
}

test("independent QA: harmless depictions and negated new cast do not become major cast failures", async (t) => {
  const h = await accepted();
  for (const narration of [
    "ظهر وحش مرسوم على الكرة. مدت نور الكرة لسلمى فأخذت دورها وأعادتها لنور.",
    "No dragon appeared. The children shared the ball and took turns.",
    "ظهر وحش مرسوم على الكرة، ثم أخذت سلمى دورها وأعادت الكرة لنور.",
  ]) {
    await t.test(narration, () => {
      const input = response(h);
      input.editions[0]!.pages.at(-1)!.narration = narration;
      const out = previewWriterResponse(JSON.stringify(input), h.pkg, h.w);
      assert.notEqual(out.status, "FAIL", JSON.stringify(out.diagnostics));
    });
  }
  for (const narration of [
    "A new hero arrived.",
    "ظهر وحش وأخذ الكرة من الأطفال.",
    "No dragon appeared. A monster arrived and grabbed the ball.",
    "A drawing of a dragon appeared on the ball. A monster arrived and took it.",
    "ظهر وحش مرسوم على الكرة. ثم ظهر وحش وأخذ الكرة من الأطفال.",
  ]) {
    const input = response(h);
    input.editions[0]!.pages.at(-1)!.narration = narration;
    assert.equal(previewWriterResponse(JSON.stringify(input), h.pkg, h.w).diagnostics[0]!.code, "WRITER_CAST_DRIFT");
  }
});

test("independent QA: human register diagnostics preserve the affected edition and page", async () => {
  const h = await accepted(), input = response(h);
  input.editions[0]!.pages[1]!.narration = "نور عايزة تشارك الكرة. أخذت سلمى دورها وأعادت الكرة لنور.";
  const out = previewWriterResponse(JSON.stringify(input), h.pkg, h.w);
  const diagnostic = out.diagnostics.find(d => d.code === "WRITER_REVIEW_LANGUAGE_REGISTER");
  assert.ok(diagnostic);
  assert.equal(diagnostic.mode, "ar-MSA-simple");
  assert.equal(diagnostic.pageNumber, 2);
  for (const warning of out.diagnostics.filter(d => d.code === "WRITER_REVIEW_LANGUAGE_SEMANTIC_REVIEW")) {
    assert.ok(warning.mode);
    assert.ok(warning.pageNumber);
  }
  assert.notEqual(writerDiagnosticReason(diagnostic.code), "Human story review is required for this page.");
});

test("independent QA: category metadata is verified against the retained request", async () => {
  const h = harness(), plan = await composeWriterStoryPlan(planning(), h.repo.loadLibrary(),
    { planId: "category-source", revisionId: "category-source-1" });
  assert.equal(validateStoryPlan(plan).findings.filter(f => ["high", "blocker"].includes(f.severity)).length, 0);
  for (const field of ["category", "signature", "storyNeeds"] as const) {
    const tampered = structuredClone(plan);
    if (field === "category") tampered.quality.categoryIntent.category = "bedtime";
    if (field === "signature") tampered.quality.categoryIntent.signature = "Untrusted new signature";
    if (field === "storyNeeds") tampered.quality.categoryIntent.storyNeeds = ["Untrusted operation"];
    assert.throws(() => validatePlanQualitySource(tampered, h.repo.loadLibrary().records),
      (e: any) => e.code === "PLANNER_QUALITY_SOURCE");
  }
});

test("independent QA: malformed JSON fails safely and dialogue-only prose follows canonical allowances", async () => {
  const h = await accepted();
  for (const raw of ["null", "[]", "{\"editions\":null}", "{\"editions\":[null]}", "{\"editions\":[{\"pages\":null}]}"])
    assert.equal(previewWriterResponse(raw, h.pkg, h.w).status, "FAIL");
  const input = response(h);
  input.editions[0]!.pages[0]!.dialogue = [{ speaker: h.pkg.plan.characters[0]!.displayName,
    text: "يلا نتبادل الكرة." }];
  input.editions[0]!.pages[0]!.narration = "";
  assert.notEqual(previewWriterResponse(JSON.stringify(input), h.pkg, h.w).status, "FAIL");
});

test("independent QA: adventure composition preserves concrete float and wash operations without an unrelated rolling obstacle", async (t) => {
  const h = harness();
  for (const objective of [
    { kind: "educational" as const, description: "Discover which objects float",
      successScenario: "The child observes a cork float and a pebble sink in a supervised bowl" },
    { kind: "behavioral" as const, description: "Learn to wash hands",
      successScenario: "The child washes with soap and dries with a towel at the basin" },
  ]) {
    await t.test(objective.description, async () => {
      const p = planning();
      p.request.objective = objective;
      p.selectedSetting = "A familiar supervised play corner";
      const plan = await composeWriterStoryPlan(p, h.repo.loadLibrary(),
        { planId: objective.kind, revisionId: `${objective.kind}-adventure` });
      assert.match(plan.quality.situation.resolutionMethod, /cork|soap/);
      assert.ok(plan.beats[1]!.summary.includes(plan.quality.situation.initialFriction!));
      assert.doesNotMatch(plan.beats.map(b => b.summary).join(" "),
        /folded play mat corner stops the rolling toy/,
        "The mini-mission obstacle must involve the actual objective materials, not inject the sharing game's rolling toy");
    });
  }
});

test("independent QA: actual service stale/CAS codes explain reload or preparation, not response format", () => {
  for (const code of ["PLANNER_STALE", "PLANNER_CONFLICT"]) {
    assert.equal(writerDiagnosticReason(code), "The plan or request changed; prepare a current prompt.");
  }
});
