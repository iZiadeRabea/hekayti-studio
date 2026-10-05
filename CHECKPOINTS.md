# Checkpoints

| Checkpoint | Stable tag | Version | Meaning | Verification |
|---|---|---|---|---|
| checkpoint/project-foundation | v0.1.0-foundation | v0.1.0-foundation | Recovery infrastructure; no application | Initial verification recorded in docs/VERIFICATION.md |

Resolve exact SHAs from Git instead of embedding a commit's own future SHA:
`git rev-parse checkpoint/project-foundation^{commit}`
`git rev-parse v0.1.0-foundation^{commit}`

Checkpoint names are immutable Git tags. main may receive later backup-receipt documentation commits without moving the stable release tag. Backup manifests specify the archive's actual HEAD, which can be newer than its latest stable tag.

Create named checkpoints with scripts/checkpoint.ps1. Commit the ledger before creating a tag; never move existing tags. A failed push or upload is recorded as pending, not successful.


- 2026-10-05 23:01:28 +03:00 — checkpoint/project-foundation; branch main; stable tag: v0.1.0-foundation. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-05 23:03:35 +03:00 — checkpoint/project-foundation-verified; branch main; stable tag: v0.1.1-foundation. Resolve SHA from immutable Git tag. Tests/health passed before commit.
