# Practical technical architecture — recommendation
D / ADR D016: adopt Electron + React + TypeScript as the planning baseline for a single-owner Windows local-first studio. No application scaffold/dependencies installed. Implementation approval and technical spikes still required; do not confuse recommendation with a tested product.

## Compared sensible routes

| Route | Fit / tradeoff (engineering judgement, no invented benchmark) | Result |
|---|---|---|
| Electron + React/TypeScript + SQLite | Bundled Chromium/Node, one language across UI/use cases, desktop files/media; larger distribution and regular security updates | Recommended for owner-friendly installation and known rendering route |
| Tauri + React/TypeScript + SQLite | OS webview/Rust integration; attractive constrained desktop host but Rust/Windows prerequisites and Node sidecar complexity if TS services need it | Reconsider if installer/runtime size proves problematic |
| Local browser + backend service | Web-like boundary, desktop shell optional; separate service lifecycle/port/file/security packaging for owner | Useful development alternative, not first deployment baseline |
| Native .NET desktop + shared backend | Strong Windows route, but UI not reused on web; second UI/toolchain alongside publishing logic | Not chosen for current reuse goal |

Official grounding: [Electron intro](https://www.electronjs.org/docs/latest/), [process model](https://www.electronjs.org/docs/latest/tutorial/process-model), [Tauri architecture/prerequisites](https://v2.tauri.app/concept/architecture/). Judgements about engineering effort/size are qualitative, to measure on owner's computer.

## Recommended components / choices

React UI + TypeScript pure domain/use cases; Vite build candidate; supported Node LTS compatible with chosen Electron for tooling (Electron supplies its runtime). Versions pinned only when implementation begins; no “latest forever” dependencies.
SQLite local operational storage behind repository port, migrations and immutable approved snapshots; licensed asset files outside source repo with checksums/manifests. [SQLite appropriate uses](https://www.sqlite.org/whentouse.html).
Chromium HTML/CSS layout prototype via Electron printing or Playwright worker; actual printer-standard prepress adapter if required. FFmpeg worker later for controlled video; no bundled licence assumptions. Test tools later: unit tests for domain, contract fixtures, Playwright RTL visual/E2E, migration/backup drills. No Redis/Docker/cloud needed for owner MVP.

## Reuse boundary

UI → transport adapter (typed narrow IPC now, authenticated HTTP later) → application use cases → pure domain policy → ports.
Ports: ProjectRepository, AssetStore, SecretStore, AITextProvider, ImageProvider, NarrationProvider, VideoRenderer, BookRenderer, JobRunner, Clock.
Adapters: local SQLite/files/OS secrets/worker binaries; later PostgreSQL/object storage/server queues. Core rules (age/localization/canonical beats/approvals/dependency invalidation) must not import Electron, DOM, local paths, SQLite SQL or vendor SDKs.

Website migration changes hosting, authentication/authorization, tenancy, database/assets and workers. It is not zero work, but domain/use cases and contract tests reused rather than rewritten. Domain inputs carry tenant/project scope even though V1 uses single owner; actual multi-tenant safeguards require later implementation.

## Security / reliability

Sandboxed renderer, context isolation, no Node integration in UI; narrow preload and validated IPC sender/arguments, restrictive CSP and navigation, no remote executable content. [Electron security](https://www.electronjs.org/docs/latest/tutorial/security). Treat generated text as plain data; never execute provider HTML/scripts/prompts. File handles mapped to permitted project paths; deny traversal and shell-string injection.
API keys in OS-protected host-side secrets, no renderer/localStorage/.env export. Loopback service optional but not exposed to LAN; transport still validates callers.
Image/video jobs separate workers, persisted queue, bounded retries/cost, cancellation and progress; UI crash must not lose approval or promote candidate.
Local-first != offline AI: editing/import/preview should work offline; external generation requires network, credentials and provider-approved terms.

SQLite database local same host; do not sync a live database with Drive. WAL same-host requirements and safe snapshot API matter. [WAL](https://www.sqlite.org/wal.html), [backup API](https://www.sqlite.org/backup.html). Transaction + staged asset write then atomic promotion and reconciliation prevents approved pointers to partial files.

## Operational recovery boundary

Git/GitHub/Drive FOUNDATION archives recover code/design only. Future operational library (including personalized stories, originals/illustrated likeness and orders) is private and excluded. Before real customer work, design encrypted app-data backups, key recovery, atomic DB snapshots and asset completeness manifests with restore test. Synthetic project backup can pilot this safely. No automatic copying private DB into source recovery ZIP.

Before migration/update snapshot operational database/assets to approved destination; migrations reversible via restoring a new copy (not editing old migration history), schemas versioned. Source tag alone cannot recover missing illustrations; AI regeneration is nondeterministic.

## Required Phase2 spikes / acceptance

Arabic mixed-script text/marks roundtrip with local fonts; same complete sample in UI/print/digital.
Correct square trim/bleed/embedded font/effective PPI and printer PDF profile.
Restart/cancellation/idempotency and snapshot+asset recovery in fresh directory.
Windows packaged install/start without developer terminal; measure memory/disk/media performance.
Mock provider contract and redacted errors/no secret leakage.
These are future acceptance gates, not work authorized in Phase1. Exact SQLite binding, packaging/signing, renderer and font chosen after spikes; provider/printer not chosen.
