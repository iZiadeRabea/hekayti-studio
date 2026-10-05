# Backup verification receipts

Verified 2026-10-05 (Africa/Cairo):

- GitHub: https://github.com/iZiadeRabea/hekayti-studio ; visibility PRIVATE.
- Remote main readback: 9c6c88e328a8002881d4c24c589991b0aeaf3da0, matching local HEAD at inspection.
- v0.1.0-foundation and checkpoint/project-foundation resolve to initial commit 2e142d0cedecfb5f1acc23f53953816c5445a1cf locally and remotely.
- v0.1.1-foundation and checkpoint/project-foundation-verified resolve to 9c6c88e328a8002881d4c24c589991b0aeaf3da0 locally and remotely.
- ZIP: hekayti-studio-backup-2026-10-05-230418-9c6c88e3.zip.
- Local copies: backups/local/ and Documents/Hekayti-Studio-Recovery/.
- Archive size: 1,327,240 bytes.
- SHA-256: E57D569B02646F703EE59872CB2FCA8360BB85D7351D0DDDBD62EBD37BD33E96.
- Cloud archive: https://drive.google.com/file/d/10mZ_PkCKlqb8ck7HJexNnrxgh8yVCiYN/view ; parent Releases verified. Metadata readback confirms size and not_shared.
- Strong cloud verification: archive downloaded via authenticated Drive file reference; its SHA-256 exactly matches the local ZIP.
- Checkpoints copy: https://drive.google.com/file/d/120mJXrTsQEj3CcY12YEKcq6UV3X5Dxfn/view.
- Manifest: https://drive.google.com/file/d/1oZYoCphHRywOfCdvufoFwwElbWvmJ-Lx/view.
- ZIP checksum: https://drive.google.com/file/d/138WLeUWJOTipee-wvOVtlTW6nbo3tBKr/view.
- Per-file hash list: https://drive.google.com/file/d/1nyaoQa9TJ7leeJx7WFqI6mBhKVZeDFvC/view.
- All three sidecars were confirmed by listing Manifests.
- Restore rehearsals: full source + Git history recovered in separate Documents/Hekayti-Studio-Recovery/rehearsal-20261005-2304 and offline-rehearsal-20261005-2307 directories. The second invocation used extracted scripts without an existing Git repository.
- Restored Git checkout passed all 99 assertions; skill bytes/context/history/tags survived recovery. Original working project unchanged by rehearsals.
- Hosted CI: runs remain queued at inspection; no claim of hosted CI success. Local Windows PowerShell tests are PASS.

This completion record is committed after the verified archive; a final clean-HEAD archive will include these receipts. Its exact SHA, size and SHA-256 are in its own manifest/checksum, and its cloud upload receipt is stored outside the committed snapshot under backups/receipts/ and Drive Manifests. This avoids endlessly changing a commit to describe its own future hash/upload.

A receipt can refer to a preceding commit/package. The final package's own exact identity is in its BACKUP_MANIFEST.md and checksum sidecar; no commit can truthfully include its own future SHA.
