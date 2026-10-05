# Hekayti Studio

Target milestone: v0.2.0-product-design (foundation tags preserved). Status: research/design complete; application implementation has not started. Read CURRENT_STATE.md and live Git tags for stable state.

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
pwsh -File tests/foundation.tests.ps1
```

Phase1 design entrypoint: [Product intelligence index](docs/PHASE_1_INDEX.md), [MVP scope](docs/product/mvp-scope.md), [roadmap](docs/ROADMAP.md), [architecture recommendation](docs/architecture/technical-architecture.md).

Electron/React/TypeScript + SQLite is a planning recommendation with feasibility gates. No application/database/UI/generator or product dependencies implemented/installed. The owner must approve Phase2 before coding. Three synthetic demo blueprints and documentation tests are not final customer stories or validated educational products.
