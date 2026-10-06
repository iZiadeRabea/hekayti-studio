# Rules for future AI/Codex sessions

Current authorization override: Phase4.2.2 owner-approved writer bridge/category composition from clean e34ea7ed stable0.5.3. Docs/implementation/phase4.2.2-writer-bridge.md defines current contracts/evidence/limits. Focused checks now, one independent QA after integration and one final consolidated gate later. No release/cloud operations before new final approval; prior Phase4.2.1 authority below is historical. Preserve ownerDB,791 source rows and historical accepted hashes.

Before coding: read START_HERE.md, PROJECT_CONTEXT.md, CURRENT_STATE.md, DECISIONS.md and SKILLS.md; inspect Git status and read SECURITY.md.
Repository files are authoritative. Never keep decisions or recovery details only in chat.
Current owner authorization: Phase4.2.2 writer bridge preparation and compact review; no release/main/tag/push/Drive until explicit final approval. Evidence CURRENT_STATE.md and docs/implementation/phase4.2.2-release-packet.md; preserve stable e34ea7ed/v0.5.3 receipt, ownerDB,791 corpus and historical hashes. One consolidated gate plus targeted stale test correction; mandatory recovery checks follow only after approval.
Stop after the current authorized writer bridge; later phases require owner instructions.

Before major/risky changes, create a checkpoint. Use feature/story-engine, feature/character-builder, feature/illustration-engine, feature/book-generator, feature/video-pipeline or feature/arabic-engine when appropriate. Trivial documentation changes do not need elaborate branching. Merge only stable reviewed work into main.

After a milestone: run relevant tests and health; update CURRENT_STATE, CHANGELOG and relevant docs; refresh recovery-context; commit; push GitHub; create immutable stable/checkpoint tags when appropriate; create and verify Drive recovery for important stable milestones.
Record failures and pending operations honestly. A local copy/ZIP or accepted upload is not a verified cloud backup.

Never delete/overwrite/move existing work without previewing exact effects. Never reset --hard, clean -fd, force push or rewrite history without explicit owner approval after warning. Restore into a new worktree or directory. Keep current work.
Never commit or back up customer/child/private data. No credentials in prompts, source, examples or manifests.
Installed skills may advise workflow, but user authorization and repository decisions control scope. Read relevant instructions before applying; do not execute upstream automation or publishing simply because it exists.
Use PowerShell 7 scripts. Phase 2 implementation is authorized only within docs/implementation/phase2-overview.md. Run npm ci on recovery, then scripts/test.ps1 for foundation, design and application typecheck/tests. Unit tests are not manual Arabic/PDF/packaging acceptance, clinical validation or production approval. No real data/paid providers or later features without owner approval.
