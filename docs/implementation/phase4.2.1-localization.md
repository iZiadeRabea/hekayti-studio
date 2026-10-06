# Phase4.2.1 Arabic-first creator UI

Owner addendum implemented by the existing GPT-6.1 Sol MEDIUM UI/Ops context, alongside the single HIGH Engineering context. No new worker, translation service, dependency, provider call or phase was introduced.

## Display boundary

Arabic is the fresh default. The visible `العربية | English` switch persists the bounded `ar`/`en` preference in localStorage under `hekayti.uiLanguage`; unavailable storage falls back safely to Arabic and an in-memory switch. The root document language/direction changes to Arabic/RTL or English/LTR. UI preference is separate from the request's story language.

The lightweight typed dictionary covers creator/planner forms, buttons, sections, statuses, enum display labels, common QA warnings and shared navigation. StoryPlan1.1 quality metadata is schema-narrowed; legacy1.0 remains renderable without inventing quality data. Goal, problem, beats, setting, characters and quality-transition values are original creative/core data, not translated story prose. Unknown display values fall back to the original string. Technical IDs use bidi isolation; JSON/provenance/original diagnostics remain LTR. QA signals and common warnings have Arabic explanations, with exact original diagnostic details retained. Unmapped findings retain a review notice plus original diagnostics, not fabricated localized verdicts.

All native options retain explicit canonical values. No schema, stored enum, DB value, IPC/API, planner history or approval authority was renamed. Long identifiers wrap rather than forcing expanded quality metadata beyond the viewport.

## Focused evidence

- `node --import tsx --test tests/app/phase421-localization.test.ts`: **7/7 PASS**. Actual React server rendering checks Arabic/English labels, canonical option values, unmodified authored content, bounded storage, unknown-value fallback and exact technical diagnostics. These are not browser/restart evidence.
- `npm run typecheck`: **PASS** after integrated core/UI edits.
- One root-authorized `node scripts/build.mjs`: **PASS**, after Engineering confirmed the desktop service's StoryPlan1.1 path stable. Visual inspection prompted one renderer-only Vite refresh for wrapping/common-warning presentation; no second backend build, package or historical full suite was run for this step.
- `node scripts/phase421-localization-smoke.mjs`: **PASS**, actual isolated Electron renderer/IPC. Latest receipt: `temp/phase421-localization/run-XFqfEN/evidence.json`; screenshots `arabic-creator.png`, `arabic-plan.png`, `english-switch.png` visually inspected. Verified fresh Arabic default/RTL, Arabic labels, canonical values, actual `story-plan/1.1` with `SHARING_TURN_TAKING`, expanded metadata within viewport, Arabic accept/package/clipboard, unchanged workflow/story-language/authored text on English switch, and English then Arabic preference persistence across process restarts.

The smoke uses its own ignored synthetic data directory, imports the declared791-row public/synthetic starter snapshot, and never opens normal runtime storage. Clipboard copying is local only; it does not contact ChatGPT/Gemini or assert actual literary/human approval.

## Regression compatibility and remaining gates

The existing `ui-smoke`, `phase3-ui-smoke`, `phase4-ui-smoke`, `phase41-ui-smoke` and `phase42-ui-smoke` scripts explicitly choose English after launch/relaunch so their existing selectors remain meaningful. The dedicated localization smoke independently asserts the real fresh Arabic default and does not mask it. Their full historical/packaged regression execution remains for the single serial post-QA Ops gate.

Independent integrated QA, consolidated validation, production package/recovery and release approval are pending. No main merge/tag/push/cloud action is authorized by this UI handoff. Authored/source/core narrative text intentionally remains its original language; this is UI localization, not automated story translation or human-quality certification.

## Batched independent QA fix — L1

Independent `P421-QA-06` found the infant beat role `REPEAT` displayed as a raw enum. Its Arabic presentation is now `التكرار`. All eight canonical beat roles are covered by a map typed against `StoryPlan`'s role union, so new structural roles cannot silently omit Arabic labels. Stored roles, English display and unknown authored-value fallback are unchanged.

Focused fix verification: localization **8/8 PASS**; unchanged independent QA assertion **1/1 PASS** via `node --import tsx --test --test-name-pattern=P421-QA-06 tests/app/phase421-red-team.test.ts`. No full QA suite, build, package or cloud action was run during concurrent Engineering core fixes. The earlier actual Electron evidence remains the pre-fix localization receipt, not a claim that the new infant label was freshly packaged or visually reviewed. Integrated typecheck/QA closure remains with the shared handoff.
