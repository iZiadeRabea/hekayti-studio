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
import { canonicalJson } from "@hekayti/core";
import type { AssetManifest, BookCommand } from "@hekayti/contracts/book";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BookComposer } from "../../apps/desktop/renderer/src/BookComposer";
import { UiLanguageProvider } from "../../apps/desktop/renderer/src/UiLanguage";
import { transformSync } from "esbuild";

// Canonical/service authority only: asset manifests and render fingerprint are
// controlled ports, not real media availability or native Chromium evidence.
async function fixture() {
  const repo = new SqliteProjectRepository(":memory:");
  let n = 0;
  const seam = { id: () => `independent-${++n}`, now: () => "2026-10-12T12:00:00Z" };
  const workflow = new StoryWorkflowService(repo, new MockStoryConceptProvider(), new MockStoryDraftProvider(), seam);
  const planner = new StoryPlannerService(repo, workflow, seam, "planner-quality/1.1");
  const creator = new SimpleCreatorService(repo, workflow, planner, seam);
  const studio = new BookStudioService(repo, creator, workflow, planner, seam, async () => "f".repeat(64));
  importLibraryBatch(repo, parseLibraryBatch(readFileSync("examples/starter-library/starter-library.jsonl", "utf8").split(/\r?\n/).filter(Boolean).slice(0, 26).join("\n")), 0, "synthetic", "now");
  const steps = ["نور يشوف الكتاب.", "نور يقلب صفحة.", "نور يحط الكتاب جنب الدبدوب.", "نور يغمض عينيه بهدوء."];
  let s = await studio.create({ agePreset: "THREE_FIVE", exactAgeMonths: 42, category: "bedtime", goalPreset: "SLEEP", fictionalName: "نور", primaryLanguageMode: "ar-EG", provisionalAcknowledged: true, expectedLibrary: repo.loadLibrary().recordVersion, bookIntent: { idea: { source: "CUSTOM", text: "نور يستعد للنوم مع كتابه والدبدوب." }, path: { mode: "CUSTOM", steps }, length: "AUTO" } });
  const run = async (input: Record<string, unknown>) => { s = await studio.command({ ...input, projectId: s.book.projectId, expectedBook: s.book.recordVersion } as BookCommand); return s; };
  await run({ action: "PREPARE_WRITER" });
  await creator.command({ action: "IMPORT", projectId: s.book.projectId, packageId: s.session.package!.packageId, expectedPlanner: s.session.planner.recordVersion, expectedWorkflow: s.session.workflow.recordVersion, json: JSON.stringify({ schemaVersion: "writer-response/1.0", editions: [{ mode: "ar-EG", pages: steps.map((text, i) => ({ pageNumber: i + 1, narration: text, dialogue: i === 2 ? [{ speaker: "نور", text: "تصبح على خير." }] : [], altText: text })) }] }) });
  s = studio.load(s.book.projectId);
  await run({ action: "APPROVE_STORY", draftId: s.session.workflow.current.draftId });
  for (const identity of s.identities) {
    await run({ action: "IDENTITY", identity: { ...identity, approvedProfile: true } });
    const asset: AssetManifest = { assetId: `qa-asset-${++n}`, projectId: s.book.projectId, sha256: "a".repeat(64), mime: "image/png", bytes: 100, width: 2400, height: 2400, classification: "PUBLIC_SYNTHETIC", purpose: "CHARACTER_SHEET", createdAt: "now" };
    s = await studio.addSelectedAssets({ projectId: s.book.projectId, expectedBook: s.book.recordVersion, kind: "CHARACTER_SHEET", characterId: identity.characterId }, [asset]);
    await run({ action: "IMAGE_DECISION", imageId: s.images.at(-1)!.imageId, choice: "APPROVE" });
  }
  const pages = s.session.workflow.drafts.at(-1)!.editions[0]!.pages;
  for (const pageId of [undefined, ...pages.map((p) => p.pageId)]) {
    const kind = pageId ? "PAGE" : "COVER";
    const asset: AssetManifest = { assetId: `qa-asset-${++n}`, projectId: s.book.projectId, sha256: "b".repeat(64), mime: "image/png", bytes: 100, width: 2400, height: 2400, classification: "PUBLIC_SYNTHETIC", purpose: kind, createdAt: "now" };
    s = await studio.addSelectedAssets({ projectId: s.book.projectId, expectedBook: s.book.recordVersion, kind, ...(pageId ? { pageId } : {}) }, [asset]);
    await run({ action: "IMAGE_DECISION", imageId: s.images.at(-1)!.imageId, choice: "APPROVE" });
  }
  await run({ action: "AUTO_LAYOUT", mode: "ar-EG" });
  const layout = structuredClone(s.layout!);
  for (const page of layout.pages) for (const box of page.boxes.filter((b) => b.kind === "DIALOGUE")) {
    page.anchors.push({ speakerId: box.speakerId!, x: .8, y: .7 }); box.tail = "ANCHOR";
  }
  await run({ action: "SAVE_LAYOUT", layout });
  await run({ action: "APPROVE_BOOK" });
  return { repo, studio, s, run };
}

test("approved canonical authority is insufficient to claim native measured readiness", async () => {
  const h = await fixture();
  try {
    assert.equal(h.s.approved, true);
    await h.studio.exportModel(h.s.book.projectId, h.s.book.recordVersion);
    const r = inspectBookReadiness(h.s);
    assert.deepEqual(r.findings.filter((f) => f.severity === "BLOCKER"), []);
    assert.equal(r.measured, false); assert.equal(r.digitalReady, false); assert.equal(r.printReady, false);
    assert.ok(r.findings.some((f) => f.code === "HUMAN_ART_REVIEW" && f.severity === "INFO"));
  } finally { h.repo.close(); }
});

test("page3 wrong speaker and page4 changed canonical narration aggregate exact targets and clear", async () => {
  const h = await fixture();
  try {
    const s = structuredClone(h.s);
    s.layout!.pages[3]!.boxes.find((b) => b.kind === "DIALOGUE")!.speakerId = "wrong-speaker";
    s.layout!.pages[4]!.boxes.find((b) => b.kind === "NARRATION")!.text = "نص غير معتمد.";
    const issues = inspectBookReadiness(s).findings.filter((f) => f.code === "BOOK_LAYOUT_SOURCE");
    assert.deepEqual(issues.map((f) => f.target.pageId), [s.layout!.pages[3]!.pageId, s.layout!.pages[4]!.pageId]);
    assert.ok(issues.every((f) => f.target.section === "book" && f.target.control === "layout" && f.severity === "BLOCKER"));
    assert.equal(inspectBookReadiness(h.s).findings.some((f) => f.code === "BOOK_LAYOUT_SOURCE"), false);
  } finally { h.repo.close(); }
});

test("saved progress changes CAS version while retaining approvals, layout and immutable histories", async () => {
  const h = await fixture();
  try {
    const before = canonicalJson({ approvals: h.s.book.approvals, layouts: h.s.book.layouts, decisions: h.s.book.decisions, images: h.s.book.images });
    const progress = { section: "book" as const, pageId: h.s.layout!.pages[3]!.pageId, control: "layout" as const, autoAdvance: false };
    const s = await h.run({ action: "SAVE_PROGRESS", progress });
    assert.equal(s.book.recordVersion, h.s.book.recordVersion + 1);
    assert.deepEqual(h.studio.load(s.book.projectId).book.creatorProgress, progress);
    assert.equal(canonicalJson({ approvals: s.book.approvals, layouts: s.book.layouts, decisions: s.book.decisions, images: s.book.images }), before);
    assert.equal(s.approved, true);
    const composer = renderToStaticMarkup(React.createElement(UiLanguageProvider, null, React.createElement(BookComposer, { snapshot: s, busy: false, onCommand: () => {}, onExport: () => {}, onEditStory: () => {}, onPreview: () => {} })));
    assert.match(composer, /<option value="3" selected="">/);
    const cover = await h.run({ action: "SAVE_PROGRESS", progress: { section: "book", control: "cover", autoAdvance: false } });
    const coverComposer = renderToStaticMarkup(React.createElement(UiLanguageProvider, null, React.createElement(BookComposer, { snapshot: cover, busy: true, onCommand: () => {}, onExport: () => {}, onEditStory: () => {}, onPreview: () => {} })));
    assert.match(coverComposer, /<option value="0" selected="">/);
    assert.match(coverComposer, /<select disabled="">/);
    await h.studio.exportModel(cover.book.projectId, cover.book.recordVersion);
    await assert.rejects(h.studio.exportModel(s.book.projectId, h.s.book.recordVersion), (e: unknown) => (e as { code: string }).code === "BOOK_CONFLICT");
  } finally { h.repo.close(); }
});

test("missing/stale/unapproved current artwork cannot hide independent page findings", async () => {
  const h = await fixture();
  try {
    const s = structuredClone(h.s);
    const page3 = s.layout!.pages[3]!.pageId;
    s.images = s.images.filter((i) => i.pageId !== page3);
    const page2 = s.images.find((i) => i.pageId === s.layout!.pages[2]!.pageId)!;
    page2.stale = true;
    const cover = s.images.find((i) => i.kind === "COVER")!; cover.status = "IMPORTED";
    const r = inspectBookReadiness(s);
    assert.deepEqual(r.findings.filter((f) => f.code === "BOOK_IMAGE").map((f) => f.target.pageId), [undefined, page2.pageId, page3]);
    assert.ok(r.findings.filter((f) => f.code === "BOOK_IMAGE").every((f) => f.severity === "BLOCKER"));
    assert.equal(r.digitalReady, false);
  } finally { h.repo.close(); }
});

test("readiness identity rejects each project/book/workflow/planner/language change independently", async () => {
  const h = await fixture();
  try {
    const key = readinessSourceKey(h.s);
    for (const change of [
      (s: typeof h.s) => { s.book.projectId = "other-project"; },
      (s: typeof h.s) => { s.book.recordVersion++; },
      (s: typeof h.s) => { s.session.workflow.recordVersion++; },
      (s: typeof h.s) => { s.session.planner.recordVersion++; },
      (s: typeof h.s) => { s.mode = "ar-MSA-simple"; },
    ]) { const next = structuredClone(h.s); change(next); assert.notEqual(readinessSourceKey(next), key); }
  } finally { h.repo.close(); }
});

test("actual header navigation handler preserves dirty composer for every unmounting destination", async () => {
  // Execute the real extracted callback with controlled state/action ports. This
  // checks handler branches; it does not mount React or certify native UI timing.
  const source = readFileSync("apps/desktop/renderer/src/BookStudioApp.tsx", "utf8").replace(/\r\n/g, "\n");
  const header = source.slice(source.indexOf('<nav className="studio-home-nav">'), source.indexOf("</nav>", source.indexOf('<nav className="studio-home-nav">')));
  const callback = /onClick=\{([\s\S]*?)\n\s*\}\n\s*>/.exec(header)?.[1];
  assert.ok(callback, "extract the exact header callback rather than a copied guard");
  const js = transformSync(`const click = (${callback});`, { loader: "ts", target: "es2022" }).code + "\nreturn click;";
  const invoke = async (bookDirty: boolean, key: string) => {
    const original = { projectId: "pending-synthetic-project" };
    let current: object | null = original, home = "new", tab = "images", status = "", lists = 0, resets = 0;
    const pending: Promise<unknown>[] = [];
    const ports = {
      bookDirty, key, snapshot: original,
      run: (action: () => Promise<unknown>) => { const p = action(); pending.push(p); return p; },
      setHome: (value: string) => { home = value; },
      setTab: (value: string) => { tab = value; },
      setStatus: (value: string) => { status = value; },
      say: (_ar: string, en: string) => en,
      list: async () => { lists++; },
      setSnapshot: (value: object | null) => { current = value; resets++; },
      setReader: () => {}, setWriterText: () => {}, setPreview: () => {},
    };
    const click = new Function(...Object.keys(ports), js)(...Object.values(ports)) as () => void;
    click(); await Promise.all(pending);
    return { current, original, home, tab, status, lists, resets };
  };
  for (const key of ["new", "books", "library", "settings"]) {
    const state = await invoke(true, key);
    assert.equal(state.home, "new", key); assert.equal(state.current, state.original, key);
    assert.equal(state.resets, 0, key); assert.equal(state.lists, 0, key);
    assert.equal(state.tab, "book", key); assert.ok(state.status.length > 0, key);
  }
  const books = await invoke(false, "books"); assert.equal(books.home, "books"); assert.equal(books.lists, 1);
  const fresh = await invoke(false, "new"); assert.equal(fresh.current, null); assert.equal(fresh.resets, 1);
});

test("actual parent mode-switch handler honors dirty guard and clears it after save/unmount", () => {
  const shell = readFileSync("apps/desktop/renderer/src/CreatorMode.tsx", "utf8").replace(/\r\n/g, "\n");
  const app = readFileSync("apps/desktop/renderer/src/BookStudioApp.tsx", "utf8").replace(/\r\n/g, "\n");
  const callback = /onClick=\{([\s\S]*?)\}\n\s*>/.exec(shell)?.[1];
  const registration = /useEffect\(\(\) => \{\n    if \(!modeLeaveGuard\)([\s\S]*?)\n  \}, \[modeLeaveGuard, bookDirty, say\]\);/.exec(app);
  assert.ok(callback); assert.ok(registration, "dirty/save changes must refresh the registered guard");
  const effectBody = "if (!modeLeaveGuard)" + registration[1];
  const guard: { current: (() => boolean) | undefined } = { current: undefined };
  let tab = "images", status = "", stored = "SIMPLE", mode = "SIMPLE", saves = 0;
  const register = (bookDirty: boolean) => {
    const ports = { modeLeaveGuard: guard, bookDirty, setTab: (v: string) => { tab = v; }, setStatus: (v: string) => { status = v; }, say: (_ar: string, en: string) => en };
    const code = transformSync(`const effect = () => { ${effectBody} };`, { loader: "ts", target: "es2022" }).code + "\nreturn effect;";
    return (new Function(...Object.keys(ports), code)(...Object.values(ports)) as () => (() => void) | undefined)();
  };
  const click = (next: string) => {
    const ports = { leaveGuard: guard, next, saveCreatorMode: (v: string) => { stored = v; saves++; }, localStorageOrUndefined: () => undefined, setMode: (v: string) => { mode = v; } };
    const code = transformSync(`const click = (${callback});`, { loader: "ts", target: "es2022" }).code + "\nreturn click;";
    (new Function(...Object.keys(ports), code)(...Object.values(ports)) as () => void)();
  };
  const dirtyCleanup = register(true); assert.ok(dirtyCleanup);
  click("ADVANCED");
  assert.equal(mode, "SIMPLE"); assert.equal(stored, "SIMPLE"); assert.equal(saves, 0);
  assert.equal(tab, "book"); assert.ok(status.length > 0);
  dirtyCleanup(); assert.equal(guard.current, undefined);
  const cleanCleanup = register(false); assert.ok(cleanCleanup);
  click("ADVANCED"); assert.equal(mode, "ADVANCED"); assert.equal(stored, "ADVANCED"); assert.equal(saves, 1);
  cleanCleanup(); assert.equal(guard.current, undefined);
  click("SIMPLE"); assert.equal(mode, "SIMPLE"); assert.equal(stored, "SIMPLE"); assert.equal(saves, 2);
});
