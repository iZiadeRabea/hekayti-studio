# Architecture / product decision log

| ID / Date (Africa/Cairo) | Decision | Alternatives | Why | Consequences |
|---|---|---|---|---|
| D001 / 2026-10-05 | Permanent local project in Documents/Hekayti-Studio | Codex cache; Desktop/Story; cloud-synced working tree | Survive account and cache changes | Old Story installation remains preserved; work here |
| D002 / 2026-10-05 | Local Git + private GitHub + independent Drive packages | GitHub only; Drive as active repository | Independent history and disaster recovery | Package source plus verified Git bundle; no active Git tree in Drive |
| D003 / 2026-10-05 | Phase 1 owner-operated local studio; website later | Customer-facing website first | Validate workflow and quality first | Future core logic reusable across local/web interfaces |
| D004 / 2026-10-05 | Infrastructure only in this session | Start product development during setup | Explicit owner boundary | No stack/provider/database chosen |
| D005 / 2026-10-05 | Commit synthetic/demo data only; private data excluded from recovery packages | Back up all working-tree files | Protect customer/child data | Separate private-data backup design required |
| D006 / 2026-10-05 | Non-destructive recovery into a new worktree/new folder | Reset/clean/force current checkout | Preserve work | Dirty branch switches fail until safety checkpoint or manual preservation |
| D007 / 2026-10-05 | Archive reviewed writing skills in repository with provenance and hashes | Depend on original account's caches; reinstall every session | Offline/account-independent continuity | Vendored snapshots are inert until selected; installed plugins unchanged |
| D008 / 2026-10-05 | Drive connector upload now; optional Desktop copy later | Store passwords/tokens in backup script | Existing supported connector is authenticated | Script prepares upload-ready files; connector upload must be verified separately |
| D009 / 2026-10-05 | PowerShell 7 infrastructure, plain tests, no product dependencies | Framework/toolchain now | Windows portability without premature stack | Future app tests must be added to checkpoint health gate |

For each new significant decision append date, choice, alternatives, reason, consequences and superseded decision if any. Technology, database, AI, image, print, video and private-data decisions remain open.

