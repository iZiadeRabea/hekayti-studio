import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { countWords } from "@hekayti/contracts";
import {
  PlanningRequestSchema,
  WriterResponseSchema,
  type WriterResponse,
} from "@hekayti/contracts/planner";
import {
  StoryPlannerService,
  composeWriterStoryPlan,
  composeQualityStoryPlan,
  validateStoryPlan,
  assembleWriterResponse,
  previewWriterResponse,
  planGenerationInstructions,
} from "@hekayti/core/planner";
import {
  StoryWorkflowService,
  manualBridgeProvenance,
} from "@hekayti/core/workflow";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { parseLibraryBatch, importLibraryBatch } from "@hekayti/core/creative";
import { project } from "./fixtures";
import { StoryLibraryService } from "@hekayti/core/library";
const records = parseLibraryBatch(
  readFileSync("examples/starter-library/starter-library.jsonl", "utf8"),
);
function planning() {
  return PlanningRequestSchema.parse({
    schemaVersion: "planning-request/1.0",
    planningRevisionId: "writer-planning",
    request: {
      schemaVersion: "story-request/1.0",
      requestId: "writer-request",
      revisionId: "writer-request-1",
      projectId: "demo-product-design",
      storyId: "writer-story",
      ageMonths: 42,
      languageModes: ["ar-MSA-simple", "ar-EG"],
      primaryLanguageMode: "ar-EG",
      primaryCategory: "adventure",
      objective: {
        kind: "behavioral",
        description: "Learn to share and take turns with others",
        successScenario: "The child shares a toy and takes turns with a friend",
      },
      theme: "A playground game",
      readingMode: "adult-read",
      personalization: {
        origin: "synthetic",
        profileId: "synthetic",
        level: 0,
        preferences: [],
        heroMode: "none",
      },
      sourceStrategy: "hybrid",
      trustedFacts: [],
      outputIntents: ["print", "digital"],
    },
    profile: "EGYPTIAN_ARAB_MUSLIM_FAMILY",
    variation: "FreshConcept",
    generation: 0,
    selectedFamily: null,
    selectedCharacter: null,
    selectedSetting: "A familiar Egyptian neighborhood playground",
    constraints: [],
    inspirationReviewed: true,
    adaptationAcknowledged: true,
    sensitiveOptIn: false,
    religiousOptIn: false,
  });
}
function harness() {
  const repo = new SqliteProjectRepository(":memory:");
  repo.createProject(project());
  let n = 0;
  const seam = { id: () => `writer-${++n}`, now: () => "2026-10-06T12:00:00Z" };
  const workflow = new StoryWorkflowService(
      repo,
      new MockStoryConceptProvider(),
      new MockStoryDraftProvider(),
      seam,
    ),
    planner = new StoryPlannerService(
      repo,
      workflow,
      seam,
      "planner-quality/1.1",
    );
  importLibraryBatch(repo, records, 0, "synthetic", "now");
  return { repo, workflow, planner, seam };
}
async function accepted() {
  const h = harness(),
    p = planning();
  let w = h.workflow.create(p.request);
  let s = await h.planner.plan(
    p,
    0,
    w.recordVersion,
    h.repo.loadLibrary().recordVersion,
  );
  w = h.workflow.load(w.projectId)!;
  const accepted = await h.planner.accept(
    w.projectId,
    s.recordVersion,
    w.recordVersion,
    "synthetic-human",
    true,
  );
  w = accepted.workflow;
  s = accepted.planner;
  const prepared = await h.planner.prepare(
    w.projectId,
    s.recordVersion,
    w.recordVersion,
  );
  return { ...h, w, s: prepared.planner, pkg: prepared.package };
}
function response(h: Awaited<ReturnType<typeof accepted>>): WriterResponse {
  return {
    schemaVersion: "writer-response/1.0",
    editions: h.pkg.plan.planning.request.languageModes.map((mode) => ({
      mode,
      pages: h.w.blueprints.at(-1)!.pagePlan.map((_, i) => ({
        pageNumber: i + 1,
        narration:
          mode === "ar-EG"
            ? "نور مدت الكورة لسلمى. سلمى ضحكت وخدت دورها. رجعوا جنب السلة بهدوء."
            : "مدت نور الكرة إلى سلمى. ضحكت سلمى وأخذت دورها. عادتا بجانب السلة بهدوء.",
        dialogue: [],
        altText: "طفلتان تلعبان بالكرة قرب السلة.",
      })),
    })),
  };
}
test("42-month owner reproduction composes adventure and sharing without altering 1.1", async () => {
  const h = harness(),
    p = planning(),
    before = await composeQualityStoryPlan(p, h.repo.loadLibrary(), {
      planId: "old",
      revisionId: "old-revision",
    }),
    hash = JSON.stringify(before);
  p.request.languageModes = ["ar-EG"];
  const after = await composeWriterStoryPlan(p, h.repo.loadLibrary(), {
    planId: "new",
    revisionId: "new-revision",
  });
  assert.equal(after.schemaVersion, "story-plan/1.2");
  assert.equal(
    after.quality.objectiveIntent.primaryIntent,
    "SHARING_TURN_TAKING",
  );
  assert.equal(after.provenance.selectedStoryFamilyId, "hekayti-family-2");
  assert.equal(after.provenance.selectedPatternId, null);
  assert.match(after.beats.map((b) => b.summary).join(" "), /ground marker/);
  assert.match(
    after.quality.situation.resolutionMethod,
    /swap roller and catcher/,
  );
  assert.match(after.quality.situation.resolutionMethod, /destination/);
  const qa = validateStoryPlan(after);
  assert.ok("CategoryPresence" in qa.signals);
  assert.equal(qa.signals.CategoryPresence, "REVIEW");
  assert.equal(
    validateStoryPlan(after).findings.filter((f) =>
      ["high", "blocker"].includes(f.severity),
    ).length,
    0,
  );
  assert.equal(JSON.stringify(before), hash);
});
test("category diversity preserves objective-specific operations, AgeEngine and advisory limits", async () => {
  const h = harness();
  for (const category of [
    "bedtime",
    "educational",
    "everyday-life",
    "emotional-learning",
    "values",
    "behavioral",
  ] as const) {
    const p = planning();
    p.request.primaryCategory = category;
    const plan = await composeWriterStoryPlan(p, h.repo.loadLibrary(), {
      planId: category,
      revisionId: `${category}-revision`,
    });
    assert.equal(plan.quality.categoryIntent.category, category);
    assert.equal(
      plan.quality.objectiveIntent.primaryIntent,
      "SHARING_TURN_TAKING",
    );
    assert.equal(
      validateStoryPlan(plan).findings.filter((f) =>
        ["high", "blocker"].includes(f.severity),
      ).length,
      0,
      `${category}: ${JSON.stringify(validateStoryPlan(plan).findings.filter((f) => ["high", "blocker"].includes(f.severity)))}`,
    );
    if (category === "bedtime") {
      assert.match(plan.quality.situation.resolutionMethod, /quiet turn/);
      assert.match(plan.beats.at(-1)!.summary, /quiet familiar place/);
    } else {
      const expected = {
        educational: /two turn counters.*compare who has had a complete turn/s,
        "everyday-life": /daily sequence.*known basket/s,
        "emotional-learning": /hands.*calmer feeling/s,
        values: /choice.*smiles/s,
        behavioral: /consequence.*complete a turn/s,
      };
      assert.match(
        plan.beats.map((b) => b.summary).join(" "),
        expected[category],
      );
    }
  }
  const p = planning();
  p.request.ageMonths = 18;
  await assert.rejects(
    composeWriterStoryPlan(p, h.repo.loadLibrary(), {
      planId: "young",
      revisionId: "young-1",
    }),
  );
});
test("bedtime and educational learning preserve the concrete requested operation", async () => {
  const h = harness();
  for (const category of ["bedtime", "educational"] as const) {
    const p = planning();
    p.request.primaryCategory = category;
    p.selectedSetting = null;
    p.request.objective = {
      kind: "educational",
      description: "Discover which objects float",
      successScenario:
        "The child compares a floating leaf with a sinking pebble",
    };
    const plan = await composeWriterStoryPlan(p, h.repo.loadLibrary(), {
      planId: `learn-${category}`,
      revisionId: `learn-${category}-1`,
    });
    assert.equal(
      plan.quality.objectiveIntent.primaryIntent,
      "LEARNING_DISCOVERY",
    );
    assert.match(plan.quality.situation.resolutionMethod, /float|leaf|pebble/);
    assert.equal(
      validateStoryPlan(plan).findings.filter((f) =>
        ["high", "blocker"].includes(f.severity),
      ).length,
      0,
    );
    if (category === "bedtime")
      assert.match(plan.beats.at(-1)!.summary, /quiet/);
  }
});
test("selected package and exact sources are revalidated after preview", async () => {
  const h = await accepted(),
    raw = JSON.stringify(response(h));
  const before = JSON.stringify({
    planner: h.planner.load(h.w.projectId),
    workflow: h.workflow.load(h.w.projectId),
    library: h.repo.loadLibrary(),
  });
  assert.equal(
    (
      await h.planner.preview(
        h.w.projectId,
        h.pkg.packageId,
        raw,
        h.s.recordVersion,
        h.w.recordVersion,
      )
    ).preview.status,
    "REVIEW",
  );
  assert.equal(
    JSON.stringify({
      planner: h.planner.load(h.w.projectId),
      workflow: h.workflow.load(h.w.projectId),
      library: h.repo.loadLibrary(),
    }),
    before,
  );
  await assert.rejects(
    h.planner.import(
      h.w.projectId,
      "wrong-package",
      raw,
      h.s.recordVersion,
      h.w.recordVersion,
    ),
  );
  const library = h.repo.loadLibrary(),
    source = h.pkg.plan.provenance.sources[0]!;
  new StoryLibraryService(h.repo, h.seam).action(
    source.ref.recordId,
    library.recordVersion,
    h.seam.id(),
    "SCORE",
    "synthetic-review",
    { scores: {}, editorialNote: "Synthetic source revision after preview" },
  );
  const stale = JSON.stringify(h.workflow.load(h.w.projectId));
  await assert.rejects(
    h.planner.import(
      h.w.projectId,
      h.pkg.packageId,
      raw,
      h.s.recordVersion,
      h.w.recordVersion,
    ),
  );
  assert.equal(JSON.stringify(h.workflow.load(h.w.projectId)), stale);
  await assert.rejects(
    h.planner.preview(
      h.w.projectId,
      h.pkg.packageId,
      raw,
      h.s.recordVersion,
      h.w.recordVersion,
    ),
  );
});
test("writer strict bridge: canonical assembly, actionable failure diagnostics and commit authority", async (t) => {
  const h = await accepted(),
    valid = response(h),
    before = JSON.stringify(h.repo.loadWorkflow(h.w.projectId));
  const preview = (input: unknown) =>
    previewWriterResponse(JSON.stringify(input), h.pkg, h.w);
  await t.test("new package and readable provider-neutral prompt", () => {
    assert.equal(h.pkg.schemaVersion, "plan-package/1.1");
    assert.equal(h.pkg.outputSchemaVersion, "writer-response/1.0");
    const generic = planGenerationInstructions(h.pkg, h.w, "GENERIC");
    for (const header of [
      "القصة المطلوبة",
      "العمر",
      "نوع القصة",
      "هدف القصة",
      "الشخصيات",
      "المكان",
      "تسلسل الأحداث",
      "ما يجب الحفاظ عليه",
      "ما يمكن للكاتب ابتكاره",
      "قواعد اللغة",
      "قواعد الجودة الأدبية",
      "صيغة الرد المطلوبة",
    ])
      assert.ok(generic.includes(header));
    for (const id of [
      h.pkg.packageId,
      h.pkg.acceptance.planHash,
      h.pkg.plan.revisionId,
      h.pkg.blueprintRevisionId,
    ])
      assert.ok(!generic.includes(id));
    assert.equal(
      planGenerationInstructions(h.pkg, h.w, "CHATGPT").replace(
        "CHATGPT",
        "GENERIC",
      ),
      generic,
    );
    assert.equal(
      planGenerationInstructions(h.pkg, h.w, "GEMINI").replace(
        "GEMINI",
        "GENERIC",
      ),
      generic,
    );
  });
  await t.test(
    "reversed editions and pages normalize; counts and canonical IDs belong to app",
    () => {
      const reversed = structuredClone(valid);
      reversed.editions.reverse();
      reversed.editions.forEach((e) => e.pages.reverse());
      let n = 0;
      const d = assembleWriterResponse(
        JSON.stringify(reversed),
        h.pkg,
        h.w,
        () => `assembled-${++n}`,
      );
      assert.deepEqual(
        d.editions.map((e) => e.mode),
        h.pkg.plan.planning.request.languageModes,
      );
      assert.deepEqual(
        d.editions[0]!.pages.map((p) => p.pageId),
        h.w.blueprints.at(-1)!.pagePlan.map((p) => p.pageId),
      );
      assert.deepEqual(d.provenance, manualBridgeProvenance);
      for (const e of d.editions) {
        assert.equal(
          e.totalWords,
          e.pages.reduce(
            (sum, p) =>
              sum +
              countWords(
                [p.narration, ...p.dialogue.map((l) => l.text)].join(" "),
              ),
            0,
          ),
        );
        assert.notEqual(
          e.languageVersionId,
          h.w.blueprints.at(-1)!.languageVersions[0]!.languageVersionId,
        );
      }
      assert.equal(preview(reversed).status, "REVIEW");
    },
  );
  await t.test(
    "missing, duplicate and unexpected language editions fail",
    () => {
      for (const kind of ["missing", "duplicate", "unexpected"]) {
        const x = structuredClone(valid);
        if (kind === "missing") x.editions.pop();
        if (kind === "duplicate")
          x.editions[1] = structuredClone(x.editions[0]!);
        if (kind === "unexpected") x.editions[1]!.mode = "en";
        assert.equal(preview(x).diagnostics[0]!.code, "WRITER_LANGUAGES");
      }
    },
  );
  await t.test("missing, duplicate, extra and wrong page numbers fail", () => {
    for (const kind of ["missing", "duplicate", "extra", "wrong"]) {
      const x = structuredClone(valid),
        pages = x.editions[0]!.pages;
      if (kind === "missing") pages.pop();
      if (kind === "duplicate") pages[1]!.pageNumber = pages[0]!.pageNumber;
      if (kind === "extra")
        pages.push({ ...pages[0]!, pageNumber: pages.length + 1 });
      if (kind === "wrong") pages[0]!.pageNumber = 199;
      assert.equal(preview(x).status, "FAIL");
      assert.equal(preview(x).diagnostics[0]!.mode, "ar-MSA-simple");
    }
  });
  await t.test(
    "AI technical metadata and counts are strictly disallowed",
    () => {
      for (const key of [
        "wordCount",
        "totalWords",
        "pageId",
        "beatId",
        "sourceRevision",
        "languageVersionId",
        "conceptId",
        "packageId",
        "provenance",
      ]) {
        const x = structuredClone(valid) as any;
        x.editions[0].pages[0][key] = 5;
        assert.equal(preview(x).diagnostics[0]!.code, "WRITER_SCHEMA");
      }
      assert.equal(
        WriterResponseSchema.safeParse({ ...valid, packageId: h.pkg.packageId })
          .success,
        false,
      );
    },
  );
  await t.test(
    "unknown, ambiguous and disallowed speakers are never guessed",
    () => {
      const x = structuredClone(valid);
      x.editions[0]!.pages[0]!.dialogue = [
        { speaker: "unknown", text: "تعالي نلعب." },
      ];
      assert.equal(preview(x).diagnostics[0]!.code, "WRITER_SPEAKER_UNKNOWN");
      const duplicated = structuredClone(h.pkg);
      duplicated.plan.characters[1]!.displayName =
        duplicated.plan.characters[0]!.displayName;
      x.editions[0]!.pages[0]!.dialogue[0]!.speaker =
        duplicated.plan.characters[0]!.displayName;
      assert.equal(
        previewWriterResponse(JSON.stringify(x), duplicated, h.w)
          .diagnostics[0]!.code,
        "WRITER_SPEAKER_AMBIGUOUS",
      );
      const page = h.w.blueprints.at(-1)!.pagePlan[0]!,
        allowed = new Set(
          h.pkg.plan.beats
            .filter((b) => page.beatIds.includes(b.beatId))
            .map((b) => b.actorId),
        );
      const bad = h.pkg.plan.characters.findIndex(
        (c) => !allowed.has(c.characterId),
      );
      assert.ok(bad >= 0);
      x.editions[0]!.pages[0]!.dialogue[0]!.speaker = `c${bad + 1}`;
      assert.equal(
        preview(x).diagnostics[0]!.code,
        "WRITER_SPEAKER_DISALLOWED",
      );
      const good = h.pkg.plan.characters.findIndex((c) =>
        allowed.has(c.characterId),
      );
      x.editions[0]!.pages[0]!.dialogue[0]!.speaker = `c${good + 1}`;
      assert.notEqual(preview(x).status, "FAIL");
    },
  );
  await t.test(
    "malformed, fenced and direction-controlled JSON get safe diagnostics",
    () => {
      for (const raw of ["{", "```json\n{}\n```", "null"]) {
        const out = previewWriterResponse(raw, h.pkg, h.w);
        assert.equal(out.status, "FAIL");
        assert.ok(!JSON.stringify(out).includes("stack"));
      }
      const x = structuredClone(valid);
      x.editions[0]!.pages[0]!.narration += "\u202e";
      assert.equal(preview(x).diagnostics[0]!.code, "WRITER_BIDI");
    },
  );
  await t.test(
    "bounded major cast, objective and resolution contradictions fail; benign details and first friction survive",
    () => {
      for (const text of [
        "A new hero arrived.",
        "The new goal was to win a race.",
        "She kept the toy forever.",
      ]) {
        const x = structuredClone(valid);
        x.editions[0]!.pages.at(-1)!.narration = text;
        assert.equal(preview(x).status, "FAIL");
      }
      const x = structuredClone(valid);
      x.editions[0]!.pages[0]!.narration =
        "She refused to share at first. A small ribbon fluttered beside the basket.";
      assert.notEqual(preview(x).status, "FAIL");
      for (const narration of [
        "No dragon appeared. A new hero arrived.",
        "ظهر وحش مرسوم على الكرة ثم قفز وأخذ الكرة.",
      ]) {
        const positive = structuredClone(valid);
        positive.editions[0]!.pages.at(-1)!.narration = narration;
        assert.equal(
          preview(positive).diagnostics[0]!.code,
          "WRITER_CAST_DRIFT",
        );
      }
      for (const narration of [
        "لم يظهر وحش. تبادلت الطفلتان الكرة.",
        "A monster appeared painted on the ball. The children took turns.",
      ]) {
        const harmless = structuredClone(valid);
        harmless.editions[0]!.pages.at(-1)!.narration = narration;
        assert.notEqual(preview(harmless).status, "FAIL");
      }
    },
  );
  await t.test(
    "preview and failed import do not mutate; wrong CAS fails; valid commit follows canonical QA",
    async () => {
      assert.equal(JSON.stringify(h.repo.loadWorkflow(h.w.projectId)), before);
      const x = structuredClone(valid);
      x.editions[0]!.pages[0]!.dialogue = [
        { speaker: "unknown", text: "hello" },
      ];
      await assert.rejects(
        h.planner.import(
          h.w.projectId,
          h.pkg.packageId,
          JSON.stringify(x),
          h.s.recordVersion,
          h.w.recordVersion,
        ),
      );
      assert.equal(JSON.stringify(h.repo.loadWorkflow(h.w.projectId)), before);
      await assert.rejects(
        h.planner.import(
          h.w.projectId,
          h.pkg.packageId,
          JSON.stringify(valid),
          h.s.recordVersion + 1,
          h.w.recordVersion,
        ),
      );
      const out = await h.planner.import(
        h.w.projectId,
        h.pkg.packageId,
        JSON.stringify(valid),
        h.s.recordVersion,
        h.w.recordVersion,
      );
      assert.equal(out.drafts.length, 1);
      assert.equal(out.drafts[0]!.sourceRevision, h.pkg.blueprintRevisionId);
      await assert.rejects(
        h.planner.preview(
          h.w.projectId,
          h.pkg.packageId,
          JSON.stringify(valid),
          h.s.recordVersion,
          h.w.recordVersion,
        ),
      );
      const qa = await h.workflow.qa(out.projectId, out.recordVersion);
      assert.ok(qa.current.reportId);
    },
  );
});
