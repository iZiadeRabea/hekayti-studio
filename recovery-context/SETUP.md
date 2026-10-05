# Setup / new computer

1. Install Git for Windows, PowerShell 7 and GitHub CLI from their official distributors. Install/sign in to Codex using the official product installer. Do not copy authentication files from old machines.
2. `gh auth login --hostname github.com --git-protocol https --web` then `gh auth setup-git`. Credentials remain in the OS credential store.
3. `gh repo clone iZiadeRabea/hekayti-studio C:\Users\Ziad\Documents\Hekayti-Studio`. Another Windows user may choose a permanent Documents folder.
4. Open the cloned folder in Codex as the project. Read START_HERE.md.
5. `pwsh -File scripts/bootstrap.ps1`. It sets repo-local hooks, creates ignored local folders and an empty-key .env example if missing, checks skills and runs health. It does not install a product stack.
6. For offline or new-account recovery: `pwsh -File scripts/bootstrap.ps1 -RestoreSkills`. Missing writing skills are copied from versioned snapshots into repo .agents/skills without overwriting existing skills. Use the inventory for online plugin reinstall when desired; do not reinstall working skills.
7. Connect Google Drive in Codex Plugins → Google Drive → authorize the intended account; verify the backup folder in docs/backup-config.json. Or set a local-only Drive Desktop root in private/backup.local.json using docs/backup-config.example.json.
8. Run `pwsh -File tests/foundation.tests.ps1` and `pwsh -File scripts/health-check.ps1`.

No real secrets are included. No API keys are required for foundation. .env.example has blank future key placeholders; no provider chosen.
Git hooks are local configuration, restored by bootstrap. CI performs the foundation tests and security/health checks without external authentication.

Skills documentation sources (checked 2026-10-05):
- https://learn.chatgpt.com/docs/build-skills
- https://developers.openai.com/plugins/build/plugins

Backups and the source skill snapshots work without a Codex account. Service accounts/permissions must be reauthorized after account changes. Account passwords, recovery codes and hardware MFA recovery belong in an independent password manager, never in Git or these packages.

## Phase1 design handoff

Read docs/PHASE_1_INDEX.md for design rationale. Bootstrap restores foundation/skills only and does not install dependencies. Phase 2 later received owner approval; its actual selected toolchain and recovery commands follow below. Later product features still need separate approval.

## Approved Phase 2 prototype

Owner approved core/feasibility implementation on 2026-10-06. Follow docs/implementation/development-setup.md: install supported Node, npm ci, npm run build/desktop. No API keys required. Run scripts/test.ps1 for all suites. Portable Windows package is unsigned/local-test only; app data outside binaries, synthetic-only.

## Phase 3 synthetic Story Creator — 0.4.0 preparation

Install pinned dependencies with `npm ci --ignore-scripts`; for actual desktop/package checks run the pinned Electron hook `node node_modules/electron/install.js`. Use `npm run build` then `npm run desktop`. Story Creator supports synthetic request → concepts → explicit selection → immutable blueprint → paired draft editions → advisory QA → explicit approval, with SQLite restart/reopen. No API key/network generation or real-child input is enabled. Existing desktop name and app-data path retain Phase 2 naming for compatible additive migration.

Full gates: `pwsh -File scripts/test.ps1`, online `pwsh -File scripts/health-check.ps1`, production build, `node scripts/phase3-ui-smoke.mjs`, legacy `node scripts/ui-smoke.mjs` and `node scripts/desktop-smoke.mjs`. Windows packaging uses the existing pinned electron-builder configuration. `node scripts/phase3-ui-smoke.mjs --packaged` and `node scripts/desktop-smoke.mjs --packaged` use fresh isolated storage; they do not overwrite normal app data. Native editorial/physical print/private-order controls remain future gates. Stable release authorization is pending Astra review.
