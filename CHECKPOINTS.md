# Checkpoints

| Checkpoint | Stable tag | Version | Meaning | Verification |
|---|---|---|---|---|
| checkpoint/project-foundation | v0.1.0-foundation | v0.1.0-foundation | Recovery infrastructure; no application | Initial verification recorded in docs/VERIFICATION.md |
| checkpoint/project-foundation-verified | v0.1.1-foundation | v0.1.1-foundation | Corrected source archive option; original history preserved | 99 assertions; ZIP/bundle and offline restore verified |
| checkpoint/project-foundation-complete | Latest semantic tag remains v0.1.1-foundation | v0.1.1-foundation | Completion receipts/context; no product development | GitHub + Drive readback; final archive identifies exact HEAD |

Resolve exact SHAs from Git instead of embedding a commit's own future SHA:
`git rev-parse checkpoint/project-foundation^{commit}`
`git rev-parse v0.1.0-foundation^{commit}`

Checkpoint names are immutable Git tags. main may receive later backup-receipt documentation commits without moving the stable release tag. Backup manifests specify the archive's actual HEAD, which can be newer than its latest stable tag.

Create named checkpoints with scripts/checkpoint.ps1. Commit the ledger before creating a tag; never move existing tags. A failed push or upload is recorded as pending, not successful.


- 2026-10-05 23:01:28 +03:00 — checkpoint/project-foundation; branch main; stable tag: v0.1.0-foundation. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-05 23:03:35 +03:00 — checkpoint/project-foundation-verified; branch main; stable tag: v0.1.1-foundation. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-05 23:08:26 +03:00 — checkpoint/project-foundation-complete; branch main; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-05 23:38:59 +03:00 — checkpoint/product-design; branch main; stable tag: v0.2.0-product-design. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-05 23:46:53 +03:00 — checkpoint/product-design-complete; branch main; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 00:10:25 +03:00 — checkpoint/core-contracts; branch feature/phase2-core; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 00:27:48 +03:00 — checkpoint/rtl-sqlite-spikes; branch feature/phase2-core; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 00:35:36 +03:00 — checkpoint/pdf-windows-spikes; branch feature/phase2-core; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 00:41:21 +03:00 — checkpoint/phase2-complete; branch main; stable tag: v0.3.0-core. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 01:41:17 +03:00 — checkpoint/phase3-wave1; branch feature/phase3-story-engine; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 02:08:21 +03:00 — checkpoint/phase3-engine-integration; branch feature/phase3-story-engine; stable tag: not marked stable. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 02:33:38 +03:00 — checkpoint/phase3-story-engine-complete; branch main; stable tag: v0.4.0-story-engine. Resolve SHA from immutable Git tag. Tests/health passed before commit.

- 2026-10-06 04:10:07 +03:00 — checkpoint/phase4-hybrid-library-complete; branch main; stable tag: v0.5.0-hybrid-library. Resolve SHA from immutable Git tag. Tests/health passed before commit.
