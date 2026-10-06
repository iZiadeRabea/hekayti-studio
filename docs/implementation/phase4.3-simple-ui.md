# Phase 4.3 Simple UI focused handoff

Routine UI work uses the reused GPT-6.1 Sol MEDIUM worker. Backend/contracts/persistence are owned by the existing HIGH implementation worker; renderer code does not recreate plan composition or import authority.

Implemented: persisted Simple default with unchanged Advanced app available; compact Arabic form with exact authored strings; deterministic human preview and explicit acceptance; separate manual writer prepare/copy/preview/import; Reader edition/draft selection and actual same-language comparison; explicit review outcome/notes/rating; grouped localized QA with visible high/blocker findings; guided empty Library initialization; illustration reference/cover/page prompts, retained plans, current-story text, fresh visual-bible/style revisions and stale-copy protection. No images, paid calls or consumer-service automation.

Validation so far: `node --import tsx --test tests/app/phase43-simple-ui.test.ts` — 12 passed, zero failed/skipped. Integrated `npm run typecheck` passed. These are focused render/pure checks, not actual desktop visual/restart evidence. Production build, consolidated historical validation, packaged Windows smoke, independent QA and release/recovery gates are pending.

UI boundaries: readonly PREVIEW may omit display package/text, so the renderer retains its already prepared display binding only across that preview; IMPORT always invokes canonical service validation. Earlier drafts cannot be reviewed or used to prepare new images through the current-draft action. Retained illustration plan selection reloads its exact source draft for the page text. Provider provenance remains explicitly user-reported or technical synthetic provenance; no provider quality is certified. Authored strings are never trimmed or translated by UI mapping.

## Independent QA UI fix batch

H3: one source resolver now binds every returned illustration snapshot (initial load, retained selection and all command results including current PREPARE) to its exact `plan.projectId`, `plan.draftId` and `plan.mode`. Missing/wrong edition or draft fails closed. The view independently suppresses mismatched prompts/text and disables generation/copy; it does not pair solely by page number. A focused asynchronous interaction regression covers historical A → current PREPARE B, plus unavailable/wrong sources. The native version of that sequence remains part of the later visual gate.

M2: the normal illustration view explicitly labels the exact source draft as approved after human review or not approved, based on that retained Reader's canonical status. The original false backend summary wording is corrected by the core owner; no renderer string replacement disguises generated text.

M3: advisory notices are grouped by code, localized reason and severity. Each group shows occurrence count and distinct known affected-page count (preview uses distinct locations before pagination), with human locations and all original technical locators retained in detail. HIGH/BLOCKER entries stay separate and visible. Preview and Reader share this grouping.

Focused batch result: 15/15 renderer checks pass, zero failures/skips. This remains render/pure interaction coverage, not a claim of completed Windows visual acceptance.

Actual visual smoke should use an isolated database and the exact Arabic fixture in `docs/creator/full-arabic-experience.md`, including restart/preferences, English UI independence, all Reader pages, a second same-language draft and stale illustration behavior. Existing English Advanced harnesses must explicitly select Advanced; they must not mask the actual fresh Simple/Arabic default.
