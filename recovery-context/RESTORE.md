# Safe restoration

Never reset/clean the current project, force push or rewrite history. Recovery scripts restore into new folders/worktrees. Current work remains available.

```powershell
pwsh -File scripts/restore.ps1 -Action List
pwsh -File scripts/restore.ps1 -Action View -Ref v0.1.0-foundation
pwsh -File scripts/restore.ps1 -Action Recover -Ref checkpoint/project-foundation -Destination C:\Users\Ziad\Documents\Hekayti-Recovered
pwsh -File scripts/restore.ps1 -Action ReturnMain
pwsh -File scripts/restore.ps1 -Action GitHub -Destination C:\Users\Ziad\Documents\Hekayti-Recovered
pwsh -File scripts/restore.ps1 -Action Archive -ArchivePath C:\path\backup.zip -Destination C:\Users\Ziad\Documents\Hekayti-Recovered
```

List/View are read-only. Recover adds a detached worktree at the requested ref without touching the current checkout. ReturnMain refuses dirty current work; use -SafetyCheckpoint to preserve eligible source changes in a commit first, or manually preserve current changes. Private ignored files are never committed as part of safety checkpoints and remain in the original folder.
GitHub/Archive require a destination that does not exist; no merge into or overwrite of existing directories. Archive verifies ZIP traversal, per-file SHA-256, bundle integrity and clones history into a sibling git-history/ directory while extracted source remains under project/. It never executes downloaded scripts before verifying them. Review the recovered files, then open git-history/ and run bootstrap. Restore does not copy arbitrary global Git config.
A corrupt/failed restore is left in its new folder for inspection; delete only after explicit target review.

## 1. Code broken, GitHub works
Preserve dirty work. Run health/tests; list tags. Create a new recovery worktree at the stable tag. Compare, copy reviewed fixes into a feature branch and commit normally. Never move main backwards by force.

## 2. Computer lost, GitHub works
Install Git/PowerShell 7/gh/Codex. Authenticate GitHub via browser. Clone private repository into Documents; read START_HERE, run bootstrap and health. Redo service authorization independently.

## 3. GitHub unavailable, Drive exists
Download ZIP, .sha256 and manifest from Drive Recovery/Checkpoints/Releases. Check `Get-FileHash -Algorithm SHA256`. Restore -Action Archive to a new directory. Use git-history/; tags/history are in the bundle. GitHub pushes wait until service returns.

## 4. New computer + new Codex account
Use GitHub clone or Drive recovery, install prerequisites, read context pack/root files, run bootstrap -RestoreSkills for missing writing skills, reconnect service plugins and authenticate GitHub. Account changes do not delete repo files. Password/MFA recovery is separate.

## 5. Old stable release
List tags; View it, then Recover to a new detached worktree. Use a feature branch for fixes. ReturnMain only after preserving dirty work. Stable tags are immutable.

## 6. All previous chats lost
Provide recovery-context/ to a new assistant, or open the repository and tell it to read START_HERE.md. Then read product context, state, decisions, skills and live Git. No earlier conversation is required.

## Sensitive history incident
Stop pushes and backups; revoke exposed credentials through the provider; restrict repository/archive access and contact the owner. This setup does not automatically rewrite history. Any history removal or old-backup destruction needs explicit owner approval with exact targets.

