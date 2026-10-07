# Phase4.4 illustrated Story Studio — integrated implementation, release pending

Baseline: owner-verified 344fe2e8084e52a8a82582b2fa629ef035de1c7b / 0.6.0. No historical story/Library migration or automatic promotion. Current source authority is the owner's complete 146-section Phase4.4 request; this concise routing checklist groups its requirements, rather than replacing them.

## Contracts and responsibility

`@hekayti/contracts/book` carries strict book intent, scene/entity states, identity packs, asset manifests, visual bindings, review history, normalized live-text layouts and commands. `@hekayti/core/book` composes the existing writer-plan/workflow into guided story-plan/1.3 and book-state/1.0; canonical manual prose remains writer-response/1.0. `@hekayti/persistence` adds sealed version5 book storage, append-only CAS and private local asset adapters. Desktop main owns native paths, decoded images, clipboard, actual font fitting and export publication. `@hekayti/export/book` supplies the same HTML/CSS/SVG rendering spec for preview/PDF and the shared print-resolution advisory.

## Acceptance groups from the 146-section specification

| Required group | Engineering implementation | Remaining release evidence |
| --- | --- | --- |
| Stable 0.6 reuse, old histories and 791 records | Additive dispatch/storage; no automatic book-to-Library feedback | Consolidated legacy suites and recovery |
| Age-first natural ideas/goal/length | Local Arabic choices, exact month age, soft page targets; no infant quest | Native infant/preschool flow and editorial human review |
| Suggested/Library/custom idea provenance | Genuine source/version, provisional inspiration notice, exact custom text | Native creator flow |
| AUTO/GUIDED/CUSTOM ordered path authority | Retained intent/scenes; unknown freeform explicitly reviewable, never substituted | QA adversarial path review |
| Canonical editable story/title/dialogue | New drafts, exact speakers/counts/QA, draft CAS, retained history | Native edit/restart |
| Seven-month Toleen six-step story | Partial cloth coverage → approach → uncover → visible → hold/hug → settle; state chain | Synthetic native manual prose fixture, not literary certification |
| Private identity photos | Native picker only; controlled opaque files/hash/MIME/decoded bounds; sticky private taint; no inferred attributes | Synthetic native decoder/photo-mode/restart |
| Missing/relink and asset safety | Exact-byte relink only; symlink/traversal rejection; corrupt bytes fail closed | Native selected-path proof; host cannot create test symlinks |
| Identity/profile/sheet/style authority | Explicit reviewed profile; versioned reference/sheet/image bindings; photo authority cannot silently become fictional | Native review sequence |
| Ledger/prompt continuity | Actual props before/after, no reset; unknown changed prose states flagged; manually attach exact photos/sheets; service-enforced stale copy/use | Independent QA prompt review |
| Image slots/reviews/history | Character/cover/page versions; use/approve/reject/archive; no overwrite; missing/stale approval fails | Native image review |
| Arabic layered book composer | Canonical narration and distinct speaker bubbles; optional anchors/tails; physical font sizes, bounded safe geometry | Native drag/fit and visual PDF QA |
| Preview/overflow/fonts | Isolated sandboxed local preview; measured Noto/Chromium fitting before approval/export; no renderer proof | Actual native rendered proof |
| Digital/print PDF | Correct physical dimensions/bleed; preserved image aspect; DPI warnings; validated temporary PDF then atomic publication; failed export preserves prior | Actual PDF dimensions/page order/shaping, failed-export proof |
| Privacy/backup boundaries | Private storage/export outside source; known cloud-folder rejection; no operational-private Library learning; no photos/logs in source recovery | Independent privacy audit and compact backup scan |
| Release/recovery/limits | No stable 0.7 tag or claim yet; optional polish cut, required gates retained | One QA, consolidated gate, final approval, package/checkpoint/push, source+separate791 upload/readback/fresh restore |

## Focused evidence

Affected tests are logged under ignored `temp/phase44-*.log`; never private assets. Final canonical infant/private-identity/image/layout/preschool-two-speaker/unknown-auto tests5 plus asset safety3 = 8/8 PASS (`phase44-focused-final.log`); final typecheck PASS (`phase44-typecheck.log`). Legacy creator11/11 passed earlier (`phase44-waveA-regression.log`). Actual symlink creation is unavailable on this Windows host, explicitly diagnosed. UI owns its separate focused evidence. These tests use synthetic controlled ports, not real photo likeness, arbitrary Arabic translation, child-development certainty, universal printer readiness or external provider success.

The picture-book and PDF skills informed continuity, no embedded illustration text, safe editable layout, and mandatory rendered output verification. The owner's Arabic/paper-cut/existing-stack requirements override their unrelated Chinese/trilingual/generation defaults. No images or books were generated outside the app.
