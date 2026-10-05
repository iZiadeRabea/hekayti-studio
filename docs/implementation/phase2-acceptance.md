# Phase 2 acceptance evidence

Reviewed 2026-10-06 on this Windows 11 x64 machine. Owner authorized Phase 2; these are implementation/feasibility gates, not production/customer launch approval.

| Gate | Status | Evidence |
| --- | --- | --- |
| A Core | PASS | TypeScript strict compile; Zod strict schemas, explicit blueprint/0.1 migration and invalid/future version refusal; application tests |
| B Age | PASS | Deterministic advisory age profiles, boundaries and three preserved synthetic fixtures; no AI/medical certainty |
| C Arabic | PASS | Actual native Electron Windows selection/editing, marks, multiline and four language cases manually visually reviewed; rtl-feasibility.md |
| D Persistence | PASS | SQLite create/load/update/list, immutable blueprints/editions/character metadata, reopen, Unicode round-trip, transaction rollback and migrations tested; actual packaged runtime SQLite 3.53.4 |
| E Approvals | PASS | Exact revision/hash approval validity and transitive dependency staleness tested without deletion |
| F PDF | PASS | Packaged app generated two six-page proofs; twelve rendered pages visually inspected, all Noto fonts embedded, measured dimensions within stated 0.1mm tolerance; assets/feasibility/phase2/evidence.json |
| G Windows | PASS | Clean production build, actual unsigned win-unpacked executable launched; React/preload/Node-disabled renderer, SQLite, fixtures and PDF smoke PASS |
| H Security | PASS | Tracked/history credential/private-path scans, ignored local data, renderer boundary tests; no real customer/child data or paid AI SDK |
| I Recovery | PASS (existing local foundation) | Foundation/design tests and health PASS; original stable history preserved. Final source+Git-bundle cloud verification/rehearsal must also be completed before delivery; exact external receipt avoids self-referential commit SHA |

Automated evidence: 35 application tests, 100 foundation assertions, 329 design/fixture assertions; seven browser-in-Electron UI workflows. Manual visual evidence is separately scoped above and never inferred from unit tests. Open/save tests mock native dialogs; they validate host file safety, not native picker appearance. File saving refuses overwrites, exports use new output directories, failed writes do not replace earlier exports.

Repeat commands: npm run typecheck; npm test; pwsh -NoProfile -File scripts/test.ps1; pwsh -NoProfile -File scripts/health-check.ps1; npm run package:win; node scripts/desktop-smoke.mjs --packaged; node scripts/ui-smoke.mjs; Python+pypdf scripts/verify-pdf.py on both generated proofs, then full-page Poppler rendering/inspection. Health/tests and secret checks run before checkpoints. Hosted foundation CI is separate evidence; do not assume local success establishes a hosted run result.

Known non-blocking prototype limits: unsigned portable folder (not installed/public release); node:sqlite experimental on development Node 22; no signing/auto-update; only this device/font/sample set checked; no commercial printer/CMYK/PDF-X/physical binding certification; no real private data or operational backup. These limitations require future approval, not hidden completion claims.

Recovery identities: immutable checkpoint/pdf-windows-spikes and, when released, checkpoint/phase2-complete with v0.3.0-core. CURRENT_STATE tracks the last known verified backup; ignored backups/receipts and Drive Manifests contain the exact final commit, archive/hash/upload/readback and independent restore-test evidence. Source backups exclude databases/private orders by design. No backups are silently deleted.

STOP after Phase 2. Next recommendation is a small manual/synthetic Story Engine vertical slice using this core, only after owner approval. Do not start paid story AI, full editor or customer services from this acceptance record.
