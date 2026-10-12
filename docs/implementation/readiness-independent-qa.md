# Independent final readiness QA

Scope: baseline `3eb1bdc` to implementation checkpoint `60c0cc5`, branch
`feature/final-product-readiness`. Focused source/dependency review only; synthetic
in-memory repositories. Production files were not edited. No owner database,
private assets, provider, package, release, cloud, or whole-suite operation.

## Batched findings (all four closed by same QA at `115f2fc`)

| ID / severity | Exact location | Reproduction and consequence |
| --- | --- | --- |
| H1 / HIGH — CLOSED | `apps/desktop/renderer/src/BookStudioApp.tsx:239`, `:412`, `:473`; `BookComposer.tsx:172`, `:733` | Original: open an approved saved layout, move text or edit subtitle/brand without saving, then use top Final review/global Next to hide the warning and inspect/export the older saved layout. Closure: shared composer dirty state exposes a persistent warning/return action, blocks both stage entry and `checkBook`, clears older results, and makes `reportCurrent` false so preview/export actions are not rendered. Ordinary hidden stage panels retain local drafts; no automatic save or approval. |
| M1 / MEDIUM — CLOSED | `apps/desktop/renderer/src/BookComposer.tsx:457`; `BookStudioApp.tsx:239` | Original: page 3 selection changed only local index and reopened cover. Closure: dropdown callback persists exact canonical page through `SAVE_PROGRESS`; cover uses explicit control; initializer and target restore selected page. Same-QA follow-up caught the still-enabled dropdown during a pending save (page3→page4 could silently drop the second progress save). `115f2fc` disables layout select and image navigation during busy saves. SSR/service regression verifies page 3 reload, explicit cover and disabled pending selector, immutable authority and stale CAS rejection. |
| M2 / MEDIUM — CLOSED | `apps/desktop/renderer/src/BookStudioApp.tsx:544`, `:244` | Original: Story edition change updated visible snapshot alone, leaving final check's current ref in the old language and repeatedly hiding returned reports. Closure: this snapshot path updates the current ref, clears readiness and refreshes assets before updating the reader; requested historical reader draft selection is retained. Readiness key regression independently covers language. |
| M3 / MEDIUM — CLOSED | `apps/desktop/renderer/src/BookStoryboard.tsx:20`, `:22` | Original: an in-view thumbnail retained old data/missing state across snapshot refresh or same-ID relink. Closure: every applied snapshot advances explicit asset refresh, including same-version relink; parent→Images→Storyboard→Thumbnail passes this dependency along with record/content authority. Effect clears current display and invalidates old async work before re-requesting; runtime still reads/hash-checks originals before cache hits. Existing real synthetic-file unit regression verifies missing/exact-byte relink/alteration behavior. |

These UI findings are source-backed reproductions, not claims of an independently
run native UI journey. The main worker owns the real native/packaged journey and
should include the four cases in the final native journey. Closure is source/service/
SSR evidence, not independent native rendering or UI timing certification.

## Focused evidence

`node --import tsx --test tests/app/readiness-independent-qa.test.ts`:
5/5 PASS, zero skipped/cancelled, 53.28 seconds. SQLite emitted its existing
experimental warning. An earlier invocation yielded without retaining its session
identifier; its incomplete console output is not counted as an additional pass.

Closure at `115f2fc`: the same focused command is freshly 5/5 PASS, zero
skipped/cancelled, 42.09 seconds. Saved-progress case additionally renders the real
BookComposer with React SSR to verify exact page 3/cover selection and the busy
selector guard. Targeted existing regression
`node --import tsx --test --test-name-pattern 'private media copies' tests/app/phase44-book-assets.test.ts`
is 1/1 PASS, zero skipped/cancelled, 0.74 seconds, using actual synthetic file bytes
and the controlled decoder port. Thus closure execution is 6/6 focused tests, not
a whole-suite rerun. No unresolved findings remain in this batch.

Necessary H1 global-navigation extension: the implementation subsequently found
that header My books/Library/Settings unmounted the dirty composer, and New book
also cleared the project. Same-QA bounded audit confirms this header is the only
home/unmount/reset path in BookStudioApp; opening another project is reachable
only after My books, while ordinary project-stage panels remain mounted/hidden.
The header callback now returns to Book layout with a save status before any home
change or snapshot reset when dirty. This extension is CLOSED by source review and
the focused `--test-name-pattern 'actual header navigation handler'` case:
1/1 PASS, zero skipped/cancelled, 0.78 seconds. It evaluates the actual extracted
inline callback using the existing esbuild runtime and controlled state/action
ports: all four dirty destinations preserve project/home, return to the editor and
show save guidance; clean My books listing and New book reset remain functional.
This is handler behavior evidence, not a mounted/native UI timing claim. Two
initial test-harness setup errors (unsupported TypeScript7 compiler API and CRLF
extraction) were corrected; neither was a product failure. No dependencies added.
The old final application Run was stopped before this production edit and must
restart against the new source; implementation owns the real four-button native
regression and final source identity. No broad independent rerun was performed.

The independent cases verify:

- Fully approved canonical story/sheet/art/layout authority still cannot claim
  measured/native readiness from the pure snapshot inspector.
- Wrong speaker on page 3 and changed narration on page 4 aggregate independent
  exact book-layout fix targets; restored source clears both findings.
- Saved progress increments CAS version, preserves approval/layout/image/decision
  histories, survives reload, retains authoritative export approval, and rejects
  stale expected versions.
- Missing page 3, stale page 2 and unapproved cover produce independent blocking
  exact targets.
- Project, book, workflow, planner and language each independently invalidate the
  readiness source key.

Direct review confirms runtime readiness reads actual required originals, compares
the rendering fingerprint, invokes authoritative `exportModel`, and rejects a
changed source after async inspection. Thumbnail main-process cache keys include
project/asset/hash, original reads precede cache hits, decode operations serialize,
resizing is at most 240px, and only 24 small cached entries remain. No private file
paths were introduced into these responses. Digital and print currently merge
measurement failures and assign the same readiness boolean; this review does not
claim separate mode-specific native failure verification.

Remaining limits: no independent real Electron/Chromium/font/PDF or packaged UI
execution, real file missing/relink exercise, native memory measurement, literary,
visual likeness, external AI, or artistic quality certification. Controlled asset
manifests/fingerprint in the focused tests are explicit test ports. The complete
16-page, two-character native journey and final consolidated gates remain owned by
the implementation/root workflow.
