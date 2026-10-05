# Synthetic local persistence and assets

SqliteProjectRepository implements the core ProjectRepository port. UI calls narrow preload IPC, never SQL. Node built-in node:sqlite selected to avoid Electron native ABI rebuilds; host Node 22 experimental warning documented, Electron runtime SQLite 3.53.4 verified. Replaceable adapter; no promise of production binding stability.

PRAGMA foreign_keys ON, busy_timeout 3000, WAL, user_version=1. Migration 0 creates schema transactionally; nonempty unversioned or newer database refused without wipe/downgrade. Prepared statements only. Tables: projects (mutable synthetic title/version CAS); blueprints (immutable canonical revision JSON); editions (immutable per-edition source revision rows); characters (project-scoped immutable bible version). No child/customer/photo table.

Canonical blueprint freezes meaning/page/primary edition snapshot. Edition rows preserve additional language candidates linked to that immutable revision; attaching an edition to a canonical export snapshot requires a new explicitly assembled revision, not hidden payload mutation. Character metadata rows are versioned. Story/StoryVersion identities derive from canonical story/revision IDs rather than a second conflicting writable story database.

Tests: create/list/load/update; CAS conflict; all three preserved fixtures; multilingual/marks roundtrip; close/reopen; future schema; corrupted payload; immutable revisions/editions/bibles; failed bundle rollback. Nested unit of work uses SAVEPOINT so project creation + blueprint/edition/character writes roll back together.

Default runtime root: %APPDATA%/Hekayti-Studio-Phase2-Synthetic; metadata/synthetic.sqlite, exports/<unique proof>, logs/diagnostics.log. Test roots under ignored temp with unique names. Never active DB in Drive, Git or application binaries. Source recovery does not back up this runtime database. Real operational encrypted DB/assets/key recovery remains a later gate; no real orders authorized.

LocalAssetStore conventions: project ID / source, generated, temp, exports; SHA256-addressed immutable files and portable asset: handles, verified on read. Private bucket disabled. Extension/size limits, IDs without path separators, no symlink project/bucket/file, tamper checks. Metadata not image BLOBs. Dependency references and stale states reside in core. Full hostile-filesystem/race resistance/encryption and private deletion workflows are not production-ready.

writeNewFile writes unique candidate and promotes via no-clobber hard link; existing export never replaced. Candidate files retained deliberately; no silent cleanup. Errors return safe code/message; local log contains timestamp/channel/code only, not prompts/payload/credentials. Corrupt data fails load; restore verified copy into fresh folder instead of resetting/deleting.
