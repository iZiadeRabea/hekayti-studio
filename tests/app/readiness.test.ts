import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SqliteProjectRepository } from "@hekayti/persistence";
import { StoryWorkflowService } from "@hekayti/core/workflow";
import { StoryPlannerService } from "@hekayti/core/planner";
import { SimpleCreatorService } from "@hekayti/core/creator";
import { BookStudioService, inspectBookReadiness, readinessSourceKey } from "@hekayti/core/book";
import { MockStoryConceptProvider } from "@hekayti/core/story";
import { MockStoryDraftProvider } from "@hekayti/core/language";
import { importLibraryBatch, parseLibraryBatch } from "@hekayti/core/creative";
import { BookStateSchema, type BookStudioSnapshot } from "@hekayti/contracts/book";
import { storyboardSlots, nextUnfinishedArt, confirmedArtApproval } from "../../apps/desktop/renderer/src/studio-readiness";

async function fixture() {
  const repo = new SqliteProjectRepository(":memory:");
  let n = 0;
  const seam = { id: () => `readiness-${++n}`, now: () => "2026-10-12T10:00:00Z" };
  const workflow = new StoryWorkflowService(repo, new MockStoryConceptProvider(), new MockStoryDraftProvider(), seam);
  const planner = new StoryPlannerService(repo, workflow, seam, "planner-quality/1.1");
  const creator = new SimpleCreatorService(repo, workflow, planner, seam);
  const studio = new BookStudioService(repo, creator, workflow, planner, seam, async () => "f".repeat(64));
  importLibraryBatch(repo, parseLibraryBatch(readFileSync("examples/starter-library/starter-library.jsonl", "utf8").split(/\r?\n/).filter(Boolean).slice(0, 26).join("\n")), 0, "synthetic", "now");
  const steps = Array.from({ length: 16 }, (_, i) => `نور يقلب صفحة الكتاب ${i + 1} جنب الدبدوب.`);
  let s = await studio.create({ agePreset: "THREE_FIVE", exactAgeMonths: 42, category: "bedtime", goalPreset: "SLEEP", fictionalName: "نور", primaryLanguageMode: "ar-EG", provisionalAcknowledged: true, expectedLibrary: repo.loadLibrary().recordVersion, bookIntent: { idea: { source: "CUSTOM", text: "سرير مريح: نور والكتاب والدبدوب." }, path: { mode: "CUSTOM", steps }, length: "AUTO" } });
  s = await studio.command({ projectId: s.book.projectId, expectedBook: s.book.recordVersion, action: "PREPARE_WRITER" });
  await creator.command({ action: "IMPORT", projectId: s.book.projectId, packageId: s.session.package!.packageId, expectedPlanner: s.session.planner.recordVersion, expectedWorkflow: s.session.workflow.recordVersion, json: JSON.stringify({ schemaVersion: "writer-response/1.0", editions: [{ mode: "ar-EG", pages: steps.map((text, i) => ({ pageNumber: i + 1, narration: text, dialogue: [], altText: text })) }] }) });
  s = studio.load(s.book.projectId);
  return { repo, studio, s };
}
function pageImages(s: BookStudioSnapshot) {
  const draft = s.session.workflow.drafts.find((d) => d.draftId === s.session.workflow.current.draftId)!;
  return draft.editions[0]!.pages;
}
function art(s: BookStudioSnapshot, key: string, approved = true) {
  return { imageId: `art-${key}`, slot: key === "cover" ? key : `page:${key}`, kind: key === "cover" ? "COVER" : "PAGE", pageId: key === "cover" ? undefined : key, assetId: `asset-${key}`, binding: {} as never, createdAt: "now", selected: true, stale: false, status: approved ? "APPROVED" : "IMPORTED", reasons: [] } as BookStudioSnapshot["images"][number];
}
test("storyboard preserves cover-first canonical IDs for 16 pages independent of import order", async () => {
  const h = await fixture(); const pages = pageImages(h.s);
  h.s.images = [art(h.s, pages[15]!.pageId), art(h.s, "cover")];
  const slots = storyboardSlots(h.s);
  assert.equal(slots.length, 17); assert.equal(slots[0]!.key, "cover");
  assert.deepEqual(slots.slice(1).map((p) => p.pageId), pages.map((p) => p.pageId));
  assert.equal(slots[1]!.state, "MISSING"); assert.equal(slots[16]!.state, "APPROVED"); h.repo.close();
});
test("advance selects canonical next unfinished only after exact current successful approval", async () => {
  const h = await fixture(); const pages = pageImages(h.s);
  h.s.images = [art(h.s, "cover"), ...pages.map((p) => art(h.s, p.pageId))];
  h.s.images[3]!.status = "IMPORTED";
  assert.equal(confirmedArtApproval(h.s, h.s.images[3]!.imageId), false);
  assert.equal(nextUnfinishedArt(h.s)?.pageId, pages[2]!.pageId);
  h.s.images[3]!.status = "APPROVED";
  assert.equal(confirmedArtApproval(h.s, h.s.images[3]!.imageId), true);
  assert.equal(nextUnfinishedArt(h.s), undefined);
  h.s.images[3]!.selected = false; assert.equal(confirmedArtApproval(h.s, h.s.images[3]!.imageId), false); h.repo.close();
});
test("missing page3, stale artwork and unapproved image have exact independent fix targets", async () => {
  const h = await fixture(); const pages = pageImages(h.s);
  h.s.images = [art(h.s, "cover"), ...pages.filter((_, i) => i !== 2).map((p) => art(h.s, p.pageId))];
  h.s.images.find((p) => p.pageId === pages[4]!.pageId)!.stale = true;
  h.s.images.find((p) => p.pageId === pages[6]!.pageId)!.status = "IMPORTED";
  const report = inspectBookReadiness(h.s);
  assert.deepEqual(report.findings.filter((f) => f.code === "BOOK_IMAGE").map((f) => f.target.pageId), [pages[2]!.pageId, pages[4]!.pageId, pages[6]!.pageId]);
  assert.equal(report.digitalReady, false); assert.equal(report.measured, false);
  h.s.images = [art(h.s, "cover"), ...pages.map((p) => art(h.s, p.pageId))];
  assert.equal(inspectBookReadiness(h.s).findings.some((f) => f.code === "BOOK_IMAGE"), false); h.repo.close();
});
test("saved exact page preference survives reload without approval or history reset; rejects foreign page", async () => {
  const h = await fixture(); const pageId = pageImages(h.s)[2]!.pageId;
  const before = structuredClone(h.s.book);
  const s = await h.studio.command({ action: "SAVE_PROGRESS", projectId: h.s.book.projectId, expectedBook: h.s.book.recordVersion, progress: { section: "images", pageId, control: "image", autoAdvance: false } });
  assert.deepEqual(h.studio.load(s.book.projectId).book.creatorProgress, { section: "images", pageId, control: "image", autoAdvance: false });
  assert.deepEqual(s.book.approvals, before.approvals); assert.deepEqual(s.book.decisions, before.decisions);
  await assert.rejects(h.studio.command({ action: "SAVE_PROGRESS", projectId: s.book.projectId, expectedBook: s.book.recordVersion, progress: { section: "images", pageId: "foreign-page", autoAdvance: true } }), /اختر صفحة/);
  h.repo.close();
});
test("legacy book has no forced progress rewrite and readiness keys include workflow and language", async () => {
  const h = await fixture(); assert.equal(BookStateSchema.parse(h.s.book).creatorProgress, undefined);
  const key = readinessSourceKey(h.s); const next = structuredClone(h.s);
  next.session.workflow.recordVersion++; assert.notEqual(readinessSourceKey(next), key);
  next.session.workflow.recordVersion--; next.mode = "ar-MSA-simple"; assert.notEqual(readinessSourceKey(next), key);
  h.repo.close();
});
