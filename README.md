# Hekayti Studio

Current candidate0.7.0: Arabic-first illustrated Story Studio with manual image import, private local reference-photo feature, editable layered book pages and explicit approval before digital/print PDF. See [compact Phase4.4 packet](docs/implementation/phase4.4-release-packet.md) and CURRENT_STATE.md for validation/approval status; no release or cloud recovery is implied. The older feasibility paragraph below is historical.

Milestone: v0.3.0-core (foundation/design tags preserved). Phase 2 reusable core and scoped Windows/Arabic/persistence/export feasibility complete. This is a synthetic internal lab, not a production publishing product. Read CURRENT_STATE.md and live Git tags for stable state.

Hekayti Studio will be an owner-operated creator studio for children's stories in Egypt, initially in simplified Modern Standard Arabic and Egyptian Arabic. Read [START_HERE.md](START_HERE.md) before changing anything.

Recovery layers: permanent local repository → local Git history → private GitHub history → independent Google Drive archives with Git bundles. Neither chat history nor Codex caches are the source of truth.

- Canonical Windows folder: C:\Users\Ziad\Documents\Hekayti-Studio
- GitHub: https://github.com/iZiadeRabea/hekayti-studio (private).
- Product facts: PROJECT_CONTEXT.md. Decisions: DECISIONS.md.
- Operational status: CURRENT_STATE.md, CHECKPOINTS.md, docs/BACKUP_STATUS.md.
- Rebuild environment: SETUP.md, SKILLS.md, docs/SKILLS_INVENTORY.md.
- Recovery: RESTORE.md. Backups: BACKUP.md. Privacy: SECURITY.md.
- Agent entrypoint: AGENTS.md and CONTRIBUTING_AI.md.
- Portable context: recovery-context/. Source files at the root take precedence.

Run PowerShell 7 from this folder:
```powershell
pwsh -File scripts/bootstrap.ps1
pwsh -File scripts/health-check.ps1
npm ci
npm run build
pwsh -File scripts/test.ps1
```

Phase1 design entrypoint: [Product intelligence index](docs/PHASE_1_INDEX.md), [MVP scope](docs/product/mvp-scope.md), [roadmap](docs/ROADMAP.md), [architecture recommendation](docs/architecture/technical-architecture.md).

Implementation: [Phase 2 overview](docs/implementation/phase2-overview.md), [acceptance evidence](docs/implementation/phase2-acceptance.md), [development setup](docs/implementation/development-setup.md). npm workspaces separate reusable contracts/core/export from SQLite/files and secure Electron/React host. Three synthetic demo blueprints, lab UI and proof PDFs are not final customer stories or validated educational products. No paid AI/real private data; STOP and await later-phase approval.
