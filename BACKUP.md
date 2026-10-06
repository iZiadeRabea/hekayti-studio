# Independent backup system

Layer 1: permanent working tree and local Git history.
Layer 2: private GitHub repo with main, checkpoint tags and stable release tags.
Layer 3: Google Drive archives with committed source, project documentation, prompts/templates, examples/tests, writing-skill snapshots, configuration examples, recovery instructions and a verified full-history Git bundle.

Drive structure: Hekayti Studio Backups/{Latest,Checkpoints,Releases,Recovery,Manifests}. IDs in docs/backup-config.json. The active repository is not on Drive.

```powershell
pwsh -File scripts/backup.ps1
pwsh -File scripts/backup.ps1 -DriveDestination 'G:\My Drive\Hekayti Studio Backups'
```

The package is built from a CLEAN committed HEAD. It never scoops up ignored/untracked local files. It refuses dirty/untracked eligible work rather than silently omitting it. Inspect changes and create a checkpoint first.
All reachable Git history is scanned before a bundle is produced. A bundle preserves commits, branches and tags but not OS credentials, GitHub account access, issues/settings, reflogs, ignored data or uncommitted work.
Obvious credential patterns and forbidden paths are checked; automated detection cannot establish whether an arbitrary image or text contains personal data. Review all new assets manually and use synthetic fixtures only.

Archive: backups/local/hekayti-studio-backup-YYYY-MM-DD-HHMMSS-<sha>.zip, plus manifest, file-level hash list and .sha256 sidecars. An extra local safety copy is stored in Documents/Hekayti-Studio-Recovery by default. Local copies on the same disk protect against working-folder damage, not disk loss.
backups/ is ignored except its README. No automatic retention deletion.

The script validates archive entries, hashes and Git bundle before success. With Drive Desktop it copies to timestamped Recovery, Checkpoints or Releases, adds an immutable dated copy to Latest, copies manifests to Manifests, then verifies hashes. A Desktop copy is LOCAL_SYNC_PENDING until connector/browser confirms cloud existence; filesystem copy alone is not cloud verification.
Without Desktop it reports CONNECTOR_UPLOAD_REQUIRED and leaves upload-ready files. In Codex, use the connected Drive upload action, target the configured folder IDs, upload ZIP plus manifest/checksum/context, read metadata back, then record the file ID, URL, MD5/size and corresponding local SHA-256 in docs/BACKUP_STATUS.md. Never embed credentials or emulate a connector with invented tokens.
Offline operation succeeds locally and reports remote status separately. Availability and receipts are in docs/BACKUP_STATUS.md and ignored backups/receipts/.

Exact final release/upload/readback/restore identity belongs in ignored backups/receipts/ and a private Drive Manifests receipt. Do not create a post-backup source commit that makes an archive appear to match a newer HEAD. A new authorized release gets its own final clean-HEAD source package; no automatic retention deletion.

Phase4.1 adds a SEPARATE portable creative Library ZIP: docs/story-library/library-backup.md. It is a declared public/synthetic latest creative allowlist, never a mixed SQLite/customer/project/workflow dump. Local export/preview/empty+merge restore are implemented; private Drive Library upload/readback remains pending final approval. Source/Git/context backups still exclude runtime Library and private operational orders/photos; encrypted operational backup requires future security decisions.
