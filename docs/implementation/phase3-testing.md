# Phase 3 engineering verification

Focused tests: `node --import tsx --test tests/app/story-workflow.test.ts tests/app/persistence.test.ts`. Full integration handoff: `npm run typecheck`, `npm test`, `npm run build`, `node scripts/phase3-ui-smoke.mjs`, `node scripts/ui-smoke.mjs`, `node scripts/desktop-smoke.mjs`.

Pinned dependencies install via `npm ci --ignore-scripts`. For actual Electron UI smoke only, run `node node_modules/electron/install.js`; this installs the pinned runtime. No paid or network AI is used.

The workflow suite covers real assembled Story/Age/Language compositions across five age bands, two Arabic editions, eligible categories and levels0–3; distinct placeholder/draft identity; persisted human approval and staleness; retained history and immutable prefix rejection; request ownership; current pointers/schema versions; mutating concept/draft adapters; provider failure/provenance rejection; stale async CAS; reopen; report/hash/findings/canonical-table corruption; and two-connection CAS. Persistence regression includes a real v1-to-v2 migration retaining original project/blueprint/edition rows and a failed migration whose user_version/table creation rolls back. Original Phase 2 assertions are retained with supported database version updated to 2.

`scripts/phase3-ui-smoke.mjs` launches Electron using fresh isolated storage under ignored temp/phase3-ui, performs request/cards/select/build/draft/QA/explicit acknowledgment/approval, verifies actual mock provenance and strict IPC/security preferences, restarts the process, reopens identical persisted state, replaces the concept, approves another draft and revises the request. It preserves screenshots and a JSON receipt locally. `scripts/ui-smoke.mjs` separately exercises all seven original Phase 2 UI workflows; desktop smoke separately verifies the six-page export proof. Automated screenshots are not a manual/native typography or literary review.

Exact final commands/results and limitations are included in the engineering worker handoff. No hosted CI, public release, private data, paid provider, full Cartesian quality matrix, new packaged acceptance or production quality is inferred from these checks.

## Engineering handoff results — 2026-10-06

- `npm run typecheck`: PASS (also invoked by final build).
- `npm test`: 91/91 PASS, zero failures/skips; 11 new workflow tests and one added migration test, retaining the 79 accepted application tests.
- `npm run build`: PASS main/preload/renderer/fixtures/fonts/licence production bundle.
- `node scripts/phase3-ui-smoke.mjs`: PASS eight workflow/security/restart/history checks; final isolated receipt `temp/phase3-ui/run-8S4SHy/phase3-ui-result.json`, screenshots `creator-approved.png` and `creator-stale.png`.
- `node scripts/ui-smoke.mjs`: PASS all seven legacy workflow groups; isolated storage `temp/phase2-ui/run-zW6HU8`.
- `node scripts/desktop-smoke.mjs`: PASS secure development Electron launch, SQLite user_version2, three fixtures, roundtrip, stale dependency and six-page print/digital proof; receipt `temp/phase2-smoke/run-ijWPkM/smoke-result.json`.
- `git diff --check`: PASS.

Screenshots were inspected for the minimal creator layout; no final visual/native-language acceptance or packaged Phase 3 validation is claimed. Node22 SQLite experimental warnings remain the accepted Phase 2 adapter limitation. Root foundation/health/checkpoint and independent Red Team follow the lead's integrated milestone workflow.
