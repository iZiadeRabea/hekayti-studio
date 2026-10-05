# Phase 2 verification strategy

Run scripts/test.ps1: preserved foundation suite (100 assertions), design suite (329 assertions), TypeScript compile and application Node test runner. Application tests currently 35 covering versioned strict schemas/migration, references/order/counts, advisory ages and boundary/unsupported inputs, all language modes/marks, canonical hashes, dependency approvals/transitive staleness, SQLite CRUD/reopen/future/corrupt data/rollback, nested atomic seeding, immutable records, asset traversal/tamper/private blocks, no-clobber export, metadata determinism and import boundaries.

Run npm run build: real bundled production main/preload/renderer. Run scripts/ui-smoke.mjs: actual Electron/React interaction, four-language selection/edit/Enter, SQLite host bridge, host file I/O with explicitly mocked dialogs, error/security preferences; this is not manual appearance certification. Run npm run smoke and packaged smoke: actual runtime/core/SQLite/PDF on this Windows host with unique test data roots.

Manual QA: Windows Computer Use native UI/caret/selection/multiline + all language blocks; Poppler full rendered print/digital page sets for shaping/marks/flow/quiet margins; PDF font/geometry structure checks separately. Synthetic test content is not an age-appropriateness clinical validation or guardian/customer/physical printer approval.

Security: tracked/staged/history private-path/token checks, renderer sandbox/isolation/no Node, restrictive CSP/custom local protocol, deny navigation/new windows/permissions and exact sender/main-frame IPC check. npm audit at inspection returned zero advisories; transitive deprecated build tools remain a maintenance risk, not a security guarantee. No telemetry/real data/API credentials.

CI installs lockfile dependencies with scripts disabled, executes foundation/design/core checks and offline health on Windows. GUI/PDF visual/package gates are local separate evidence; hosted green must not imply visual checks. A missing dependency is FAIL, never skipped as if tests passed.

Recovery acceptance: keep current work; package clean committed HEAD plus full Git bundle, private Drive metadata and downloaded SHA256 readback, restore new folder; install locked dependencies and rerun suites. Source backup excludes live runtime data; synthetic proof PDFs can be tracked because manually inspected and demonstrably synthetic. Future private operational backup remains blocked until separately designed/approved.
