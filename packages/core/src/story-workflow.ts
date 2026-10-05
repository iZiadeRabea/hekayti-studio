import { z } from "zod";
import {
  Id,
  BlueprintSchema,
  ApprovalSchema,
  AppError,
  validate,
  type StoryRequest,
  type StoryConceptProvider,
  type StoryDraftProvider,
  type StoryBlueprint,
} from "@hekayti/contracts";
import {
  StoryRequestSchema,
  ConceptSetSchema,
  StoryDraftSchema,
  StoryQaReportSchema,
} from "@hekayti/contracts/story";
import { canonicalJson, contentHash } from "./index";
import { storyStructureFor, reviewStoryAge } from "./story-age";
import {
  buildStoryBlueprint,
  evaluateConcepts,
  reviewStoryBlueprint,
} from "./story-system";
import { reviewStoryLanguage } from "./story-language";

const nullableId = Id.nullable();
const ApprovalRecordSchema = z
  .object({
    approval: ApprovalSchema,
    reportId: Id,
    draftId: Id,
    advisoryAcknowledged: z.literal(true),
  })
  .strict();
export const WorkflowSnapshotSchema = z
  .object({
    schemaVersion: z.literal("workflow/1.0"),
    projectId: Id,
    storyId: Id,
    recordVersion: z.number().int().nonnegative(),
    requests: z.array(StoryRequestSchema).min(1).max(1000),
    conceptSets: z.array(ConceptSetSchema).max(1000),
    blueprints: z.array(BlueprintSchema).max(1000),
    drafts: z.array(StoryDraftSchema).max(1000),
    blueprintLinks: z
      .array(
        z
          .object({ revisionId: Id, conceptId: Id, requestRevisionId: Id })
          .strict(),
      )
      .max(1000),
    reports: z.array(StoryQaReportSchema).max(1000),
    approvals: z.array(ApprovalRecordSchema).max(1000),
    reportLinks: z
      .array(
        z
          .object({
            reportId: Id,
            draftId: Id,
            requestRevisionId: Id,
            conceptId: Id,
          })
          .strict(),
      )
      .max(1000),
    current: z
      .object({
        requestRevisionId: Id,
        conceptSetId: nullableId,
        conceptId: nullableId,
        blueprintRevisionId: nullableId,
        draftId: nullableId,
        reportId: nullableId,
        approvalId: nullableId,
      })
      .strict(),
  })
  .strict()
  .superRefine((s, c) => {
    const fail = (message: string) => c.addIssue({ code: "custom", message });
    const unique = (ids: string[]) => {
      if (new Set(ids).size !== ids.length)
        fail("Duplicate workflow artifact identity.");
    };
    unique(s.requests.map((x) => x.revisionId));
    unique(s.conceptSets.map((x) => x.conceptSetId));
    unique(s.blueprints.map((x) => x.revisionId));
    unique(s.drafts.map((x) => x.draftId));
    unique(s.blueprintLinks.map((x) => x.revisionId));
    if (s.blueprintLinks.length !== s.blueprints.length)
      fail("Blueprint source links incomplete.");
    unique(s.reports.map((x) => x.reportId));
    unique(s.approvals.map((x) => x.approval.approvalId));
    unique(s.reportLinks.map((x) => x.reportId));
    if (s.reportLinks.length !== s.reports.length)
      fail("QA source links incomplete.");
    unique(s.drafts.flatMap((x) => x.editions.map((e) => e.languageVersionId)));
    for (const r of s.requests)
      if (
        r.projectId !== s.projectId ||
        r.storyId !== s.storyId ||
        r.requestId !== s.requests[0]!.requestId
      )
        fail("Request owner mismatch.");
    for (const set of s.conceptSets) {
      const r = s.requests.find((x) => x.revisionId === set.requestRevisionId);
      if (!r || r.requestId !== set.requestId) fail("Concept request missing.");
      if (set.concepts.some((x) => x.provenance.kind !== "mock"))
        fail("Only actual mock provenance is enabled.");
      if (r) {
        if (
          set.concepts.some(
            (concept) =>
              canonicalJson(concept.objective) !== canonicalJson(r.objective) ||
              concept.outline.some((beat) =>
                beat.factIds.some(
                  (id) => !r.trustedFacts.some((fact) => fact.factId === id),
                ),
              ),
          )
        )
          fail("Concept objective or fact ownership mismatch.");
        try {
          const structure = storyStructureFor(r);
          if (
            evaluateConcepts(r, structure, set)
              .flatMap((x) => x.findings)
              .concat(set.concepts.flatMap((x) => reviewStoryAge(r, x)))
              .some((x) => x.severity === "high" || x.severity === "blocker")
          )
            fail("Concept semantic mismatch.");
        } catch {
          fail("Invalid concept structure.");
        }
      }
    }
    if (s.conceptSets.some((x, i) => x.generation !== i))
      fail("Concept generations must increase monotonically from zero.");
    unique(s.conceptSets.flatMap((x) => x.concepts.map((y) => y.conceptId)));
    const concepts = s.conceptSets.flatMap((x) => x.concepts);
    for (const b of s.blueprints) {
      if (
        b.projectId !== s.projectId ||
        b.storyId !== s.storyId ||
        b.approvalRecords.length
      )
        fail("Blueprint owner/approval mismatch.");
      const link = s.blueprintLinks.find((x) => x.revisionId === b.revisionId),
        concept = concepts.find((x) => x.conceptId === link?.conceptId),
        request = s.requests.find(
          (x) => x.revisionId === link?.requestRevisionId,
        );
      if (
        !concept ||
        !request ||
        concept.requestRevisionId !== request.revisionId
      )
        fail("Blueprint concept missing.");
      else if (
        reviewStoryBlueprint(request, concept, b).some(
          (x) =>
            (x.severity === "high" || x.severity === "blocker") &&
            !placeholderFinding(x),
        )
      )
        fail("Blueprint semantic source mismatch.");
    }
    for (const d of s.drafts) {
      const b = s.blueprints.find((x) => x.revisionId === d.sourceRevision);
      if (
        !b ||
        s.blueprintLinks.find((x) => x.revisionId === b.revisionId)
          ?.conceptId !== d.conceptId ||
        d.provenance.kind !== "mock"
      ) {
        fail("Draft source mismatch.");
        continue;
      }
      try {
        const assembled = validate(BlueprintSchema, {
            ...b,
            languageVersions: d.editions,
          }),
          link = s.blueprintLinks.find((x) => x.revisionId === b.revisionId)!,
          r = s.requests.find((x) => x.revisionId === link.requestRevisionId)!,
          concept = concepts.find((x) => x.conceptId === d.conceptId)!;
        if (
          reviewStoryLanguage(r, concept, assembled, d.editions)
            .concat(
              reviewStoryAge(r, concept, assembled),
              reviewStoryBlueprint(r, concept, assembled),
            )
            .some((x) => x.severity === "high" || x.severity === "blocker")
        )
          fail("Draft semantic mismatch.");
      } catch {
        fail("Draft canonical coverage mismatch.");
      }
      if (
        d.editions.some((e) =>
          b.languageVersions.some(
            (p) => p.languageVersionId === e.languageVersionId,
          ),
        )
      )
        fail("Draft must not overwrite placeholder edition identity.");
    }
    for (const r of s.reports) {
      const link = s.reportLinks.find((x) => x.reportId === r.reportId),
        d = s.drafts.find((x) => x.draftId === link?.draftId),
        b = s.blueprintLinks.find((x) => x.revisionId === d?.sourceRevision);
      if (
        !d ||
        d.sourceRevision !== r.sourceRevision ||
        b?.conceptId !== link?.conceptId ||
        b?.requestRevisionId !== link?.requestRevisionId
      )
        fail("QA source missing.");
      else if (
        canonicalJson(r.findings) !==
        canonicalJson(workflowFindings(s, link!.draftId))
      )
        fail("Stored QA differs from structured deterministic review.");
    }
    for (const a of s.approvals) {
      const r = s.reports.find((x) => x.reportId === a.reportId),
        d = s.drafts.find((x) => x.draftId === a.draftId);
      if (
        !r ||
        !d ||
        d.sourceRevision !== a.approval.revisionId ||
        r.sourceRevision !== d.sourceRevision ||
        r.contentHash !== a.approval.hash ||
        a.approval.targetId !== s.storyId ||
        a.approval.scope !== "text" ||
        a.approval.dependencies.length
      )
        fail("Approval binding mismatch.");
      if (
        r?.findings.some(
          (x) => x.severity === "high" || x.severity === "blocker",
        )
      )
        fail("Blocking QA cannot be approved.");
    }
    const p = s.current,
      r = s.requests.find((x) => x.revisionId === p.requestRevisionId);
    const set = s.conceptSets.find((x) => x.conceptSetId === p.conceptSetId);
    const concept = set?.concepts.find((x) => x.conceptId === p.conceptId);
    const b = s.blueprints.find((x) => x.revisionId === p.blueprintRevisionId);
    const d = s.drafts.find((x) => x.draftId === p.draftId),
      report = s.reports.find((x) => x.reportId === p.reportId);
    const approval = s.approvals.find(
      (x) => x.approval.approvalId === p.approvalId,
    );
    if (!r || r !== s.requests.at(-1)) fail("Current request must be latest.");
    if (p.conceptSetId && (!set || set.requestRevisionId !== r?.revisionId))
      fail("Current set mismatch.");
    if (p.conceptSetId && p.conceptSetId !== s.conceptSets.at(-1)?.conceptSetId)
      fail("Current set must be latest generation.");
    if (p.conceptId && !concept) fail("Current selection mismatch.");
    if (
      p.blueprintRevisionId &&
      (!b ||
        !concept ||
        s.blueprintLinks.find((x) => x.revisionId === b.revisionId)
          ?.conceptId !== concept.conceptId)
    )
      fail("Current blueprint mismatch.");
    if (p.draftId && (!d || !b || d.sourceRevision !== b.revisionId))
      fail("Current draft mismatch.");
    if (
      p.reportId &&
      (!report ||
        !d ||
        report.sourceRevision !== d.sourceRevision ||
        s.reportLinks.find((x) => x.reportId === report.reportId)?.draftId !==
          d.draftId)
    )
      fail("Current QA mismatch.");
    if (
      p.approvalId &&
      (!approval ||
        !report ||
        approval.reportId !== report.reportId ||
        approval.draftId !== d?.draftId)
    )
      fail("Current approval mismatch.");
  });
export type WorkflowSnapshot = z.infer<typeof WorkflowSnapshotSchema>;
export interface StoryWorkflowRepository {
  loadWorkflow(projectId: string): WorkflowSnapshot | null;
  createWorkflow(value: WorkflowSnapshot): void;
  saveWorkflow(
    value: WorkflowSnapshot,
    expectedVersion: number,
  ): WorkflowSnapshot;
}
const historyKeys = [
  "requests",
  "conceptSets",
  "blueprints",
  "blueprintLinks",
  "drafts",
  "reports",
  "reportLinks",
  "approvals",
] as const;
function placeholderFinding(x: {
  category: string;
  location: string;
  message: string;
}) {
  return (
    x.category === "draft" &&
    x.location === "languageVersions" &&
    x.message === "Prose is not drafted."
  );
}
export function validateWorkflowAppend(
  previous: WorkflowSnapshot,
  next: WorkflowSnapshot,
) {
  if (
    previous.projectId !== next.projectId ||
    previous.storyId !== next.storyId
  )
    throw new AppError("WORKFLOW_OWNER", "Workflow ownership cannot change.");
  for (const key of historyKeys)
    if (
      next[key].length < previous[key].length ||
      canonicalJson(next[key].slice(0, previous[key].length)) !==
        canonicalJson(previous[key])
    )
      throw new AppError(
        "WORKFLOW_IMMUTABLE",
        "Previous workflow artifacts must be retained unchanged.",
      );
  if (next.current.approvalId) {
    const old = previous.approvals.some(
      (x) => x.approval.approvalId === next.current.approvalId,
    );
    if (
      old &&
      (next.current.approvalId !== previous.current.approvalId ||
        canonicalJson(next.current) !== canonicalJson(previous.current))
    )
      throw new AppError(
        "WORKFLOW_APPROVAL_REPLAY",
        "Stale approval cannot be revived; explicitly review and approve again.",
      );
  }
}
export function workflowApprovalStatus(
  s: WorkflowSnapshot,
): "approved" | "stale" | "unreviewed" {
  return s.current.approvalId
    ? "approved"
    : s.approvals.length
      ? "stale"
      : "unreviewed";
}
export function assembledBlueprint(s: WorkflowSnapshot): StoryBlueprint {
  const b = s.blueprints.find(
      (x) => x.revisionId === s.current.blueprintRevisionId,
    ),
    d = s.drafts.find((x) => x.draftId === s.current.draftId);
  if (!b || !d)
    throw new AppError(
      "WORKFLOW_DRAFT_REQUIRED",
      "Build and draft the current concept first.",
    );
  return validate(BlueprintSchema, { ...b, languageVersions: d.editions });
}
export function workflowHashInput(s: WorkflowSnapshot) {
  return {
    request: s.requests.find(
      (x) => x.revisionId === s.current.requestRevisionId,
    ),
    concept: s.conceptSets
      .find((x) => x.conceptSetId === s.current.conceptSetId)
      ?.concepts.find((x) => x.conceptId === s.current.conceptId),
    blueprint: assembledBlueprint(s),
    draft: s.drafts.find((x) => x.draftId === s.current.draftId),
  };
}
export function historicalWorkflowHashInput(
  s: WorkflowSnapshot,
  reportId: string,
) {
  const link = s.reportLinks.find((x) => x.reportId === reportId)!;
  const draft = s.drafts.find((x) => x.draftId === link.draftId)!;
  const blueprint = s.blueprints.find(
    (x) => x.revisionId === draft.sourceRevision,
  )!;
  return {
    request: s.requests.find((x) => x.revisionId === link.requestRevisionId),
    concept: s.conceptSets
      .flatMap((x) => x.concepts)
      .find((x) => x.conceptId === link.conceptId),
    blueprint: validate(BlueprintSchema, {
      ...blueprint,
      languageVersions: draft.editions,
    }),
    draft,
  };
}
export function workflowFindings(s: WorkflowSnapshot, draftId: string) {
  const d = s.drafts.find((x) => x.draftId === draftId)!,
    b = s.blueprints.find((x) => x.revisionId === d.sourceRevision)!,
    link = s.blueprintLinks.find((x) => x.revisionId === b.revisionId)!,
    request = s.requests.find((x) => x.revisionId === link.requestRevisionId)!,
    set = s.conceptSets.find((x) =>
      x.concepts.some((c) => c.conceptId === d.conceptId),
    )!,
    concept = set.concepts.find((x) => x.conceptId === d.conceptId)!;
  const assembled = validate(BlueprintSchema, {
    ...b,
    languageVersions: d.editions,
  });
  const groups = {
    concept: evaluateConcepts(request, storyStructureFor(request), set).find(
      (x) => x.conceptId === concept.conceptId,
    )!.findings,
    age: reviewStoryAge(request, concept, assembled),
    story: reviewStoryBlueprint(request, concept, assembled),
    language: reviewStoryLanguage(request, concept, assembled, d.editions),
  };
  return Object.entries(groups).flatMap(([group, items]) =>
    items.map((x, i) => ({
      ...x,
      findingId: `${group}-${i}-${x.findingId}`.slice(0, 120),
    })),
  );
}
export class StoryWorkflowService {
  constructor(
    private readonly repository: StoryWorkflowRepository,
    private readonly concepts: StoryConceptProvider,
    private readonly drafts: StoryDraftProvider,
    private readonly seam: { id(): string; now(): string },
  ) {}
  load(projectId: string) {
    return this.repository.loadWorkflow(validate(Id, projectId));
  }
  create(input: StoryRequest) {
    const r = validate(StoryRequestSchema, input);
    const s = validate(WorkflowSnapshotSchema, {
      schemaVersion: "workflow/1.0",
      projectId: r.projectId,
      storyId: r.storyId,
      recordVersion: 0,
      requests: [r],
      conceptSets: [],
      blueprints: [],
      blueprintLinks: [],
      drafts: [],
      reports: [],
      reportLinks: [],
      approvals: [],
      current: {
        requestRevisionId: r.revisionId,
        conceptSetId: null,
        conceptId: null,
        blueprintRevisionId: null,
        draftId: null,
        reportId: null,
        approvalId: null,
      },
    });
    this.repository.createWorkflow(s);
    return s;
  }
  private baseline(id: string, expected: number) {
    const s = this.load(id);
    if (!s || s.recordVersion !== expected)
      throw new AppError(
        "WORKFLOW_CONFLICT",
        "Story changed or is missing; reload before continuing.",
      );
    return s;
  }
  private commit(before: WorkflowSnapshot, next: WorkflowSnapshot) {
    return this.repository.saveWorkflow(
      validate(WorkflowSnapshotSchema, next),
      before.recordVersion,
    );
  }
  private reset(
    s: WorkflowSnapshot,
    from: "concept" | "blueprint" | "draft" | "qa",
  ) {
    if (from === "concept") {
      s.current.conceptId = null;
      s.current.blueprintRevisionId = null;
    }
    if (from === "blueprint") s.current.blueprintRevisionId = null;
    if (from !== "qa") s.current.draftId = null;
    s.current.reportId = null;
    s.current.approvalId = null;
  }
  reviseRequest(id: string, expected: number, input: StoryRequest) {
    const s = this.baseline(id, expected),
      next = structuredClone(s),
      r = validate(StoryRequestSchema, input);
    next.requests.push(r);
    next.current.requestRevisionId = r.revisionId;
    next.current.conceptSetId = null;
    this.reset(next, "concept");
    return this.commit(s, next);
  }
  async createMore(id: string, expected: number) {
    const s = this.baseline(id, expected),
      next = structuredClone(s),
      r = s.requests.at(-1)!;
    const generation = s.conceptSets.reduce(
        (n, x) => Math.max(n, x.generation + 1),
        0,
      ),
      structure = storyStructureFor(r);
    const provenance = structuredClone(this.concepts.provenance);
    const set = validate(
      ConceptSetSchema,
      await this.concepts.createConcepts(
        structuredClone(r),
        structuredClone(structure),
        generation,
      ),
    );
    if (
      set.requestId !== r.requestId ||
      set.requestRevisionId !== r.revisionId ||
      set.generation !== generation ||
      provenance.kind !== "mock" ||
      set.concepts.some(
        (x) =>
          canonicalJson(x.provenance) !== canonicalJson(provenance) ||
          x.primaryCategory !== r.primaryCategory ||
          canonicalJson(x.objective) !== canonicalJson(r.objective) ||
          x.outline.some((beat) =>
            beat.factIds.some(
              (id) => !r.trustedFacts.some((fact) => fact.factId === id),
            ),
          ),
      )
    )
      throw new AppError(
        "WORKFLOW_PROVIDER",
        "Concept provider returned mismatched ownership or provenance.",
      );
    const findings = evaluateConcepts(r, structure, set)
      .flatMap((x) => x.findings)
      .concat(set.concepts.flatMap((x) => reviewStoryAge(r, x)));
    this.requireSafe(findings);
    next.conceptSets.push(set);
    next.current.conceptSetId = set.conceptSetId;
    this.reset(next, "concept");
    return this.commit(s, next);
  }
  select(id: string, expected: number, conceptId: string) {
    const s = this.baseline(id, expected),
      next = structuredClone(s);
    if (
      !s.conceptSets
        .find((x) => x.conceptSetId === s.current.conceptSetId)
        ?.concepts.some((x) => x.conceptId === conceptId)
    )
      throw new AppError(
        "WORKFLOW_SELECTION",
        "Select a concept from the current request's persisted set.",
      );
    this.reset(next, "blueprint");
    next.current.conceptId = validate(Id, conceptId);
    return this.commit(s, next);
  }
  private sources(s: WorkflowSnapshot) {
    const request = s.requests.at(-1)!,
      concept = s.conceptSets
        .find((x) => x.conceptSetId === s.current.conceptSetId)
        ?.concepts.find((x) => x.conceptId === s.current.conceptId);
    if (!concept)
      throw new AppError(
        "WORKFLOW_SELECTION",
        "Select a persisted current concept first.",
      );
    return { request, concept };
  }
  build(id: string, expected: number) {
    const s = this.baseline(id, expected),
      next = structuredClone(s),
      { request, concept } = this.sources(s);
    const b = buildStoryBlueprint(
      request,
      storyStructureFor(request),
      concept,
      this.seam.id(),
    );
    this.requireSafe(
      reviewStoryAge(request, concept, b).concat(
        reviewStoryBlueprint(request, concept, b).filter(
          (x) => !placeholderFinding(x),
        ),
      ),
    );
    this.reset(next, "draft");
    next.blueprints.push(b);
    next.blueprintLinks.push({
      revisionId: b.revisionId,
      conceptId: concept.conceptId,
      requestRevisionId: request.revisionId,
    });
    next.current.blueprintRevisionId = b.revisionId;
    return this.commit(s, next);
  }
  async draft(id: string, expected: number) {
    const s = this.baseline(id, expected),
      next = structuredClone(s),
      { request, concept } = this.sources(s),
      b = s.blueprints.find(
        (x) => x.revisionId === s.current.blueprintRevisionId,
      );
    if (!b)
      throw new AppError(
        "WORKFLOW_BLUEPRINT_REQUIRED",
        "Build the current blueprint first.",
      );
    const draftId = this.seam.id(),
      provenance = structuredClone(this.drafts.provenance);
    const d = validate(
      StoryDraftSchema,
      await this.drafts.createDraft(
        structuredClone(request),
        structuredClone(concept),
        structuredClone(b),
        draftId,
      ),
    );
    if (
      d.draftId !== draftId ||
      d.sourceRevision !== b.revisionId ||
      d.conceptId !== concept.conceptId ||
      provenance.kind !== "mock" ||
      canonicalJson(d.provenance) !== canonicalJson(provenance)
    )
      throw new AppError(
        "WORKFLOW_PROVIDER",
        "Draft provider returned mismatched ownership or provenance.",
      );
    const assembled = validate(BlueprintSchema, {
      ...b,
      languageVersions: d.editions,
    });
    this.requireSafe(
      reviewStoryLanguage(request, concept, assembled, d.editions).concat(
        reviewStoryAge(request, concept, assembled),
        reviewStoryBlueprint(request, concept, assembled),
      ),
    );
    this.reset(next, "qa");
    next.drafts.push(d);
    next.current.draftId = d.draftId;
    return this.commit(s, next);
  }
  private requireSafe(findings: { severity: string }[]) {
    if (findings.some((x) => x.severity === "high" || x.severity === "blocker"))
      throw new AppError(
        "WORKFLOW_QA_BLOCKED",
        "Provider or canonical artifact failed a blocking semantic review.",
      );
  }
  async qa(id: string, expected: number) {
    const s = this.baseline(id, expected),
      next = structuredClone(s),
      { request, concept } = this.sources(s),
      b = assembledBlueprint(s);
    const findings = workflowFindings(s, s.current.draftId!);
    const report = validate(StoryQaReportSchema, {
      reportId: this.seam.id(),
      sourceRevision: b.revisionId,
      contentHash: await contentHash(workflowHashInput(s)),
      findings,
      humanReviewRequired: true,
      method: "deterministic-advisory",
    });
    next.reports.push(report);
    next.reportLinks.push({
      reportId: report.reportId,
      draftId: s.current.draftId!,
      requestRevisionId: request.revisionId,
      conceptId: concept.conceptId,
    });
    next.current.reportId = report.reportId;
    next.current.approvalId = null;
    return this.commit(s, next);
  }
  async approve(
    id: string,
    expected: number,
    reviewerAlias: string,
    advisoryAcknowledged: boolean,
  ) {
    const s = this.baseline(id, expected),
      next = structuredClone(s),
      report = s.reports.find((x) => x.reportId === s.current.reportId);
    if (!report || !s.current.draftId || !advisoryAcknowledged)
      throw new AppError(
        "WORKFLOW_APPROVAL_REQUIRED",
        "Review the current draft and QA, then explicitly acknowledge advisory limits.",
      );
    this.requireSafe(report.findings);
    if ((await contentHash(workflowHashInput(s))) !== report.contentHash)
      throw new AppError(
        "WORKFLOW_QA_STALE",
        "Run QA again for the current source.",
      );
    const approval = validate(ApprovalSchema, {
      approvalId: this.seam.id(),
      targetId: s.storyId,
      scope: "text",
      revisionId: report.sourceRevision,
      hash: report.contentHash,
      dependencies: [],
      reviewerAlias,
      approvedAt: this.seam.now(),
    });
    next.approvals.push({
      approval,
      reportId: report.reportId,
      draftId: s.current.draftId,
      advisoryAcknowledged: true,
    });
    next.current.approvalId = approval.approvalId;
    return this.commit(s, next);
  }
}
