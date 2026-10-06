# Privacy and security model

Real child/customer photos, identifying names/details, customer databases, private production exports and secrets must never enter GitHub or project recovery archives, even though the repository is private.
Use synthetic/demo/test data only for tracked examples, tests and source assets.
Parent/guardian photo consent, legal/privacy compliance, retention/deletion, encryption, access control, provider handling and private-data backups need separate decisions before real data processing. Foundation does not implement or assert regulatory compliance.

Ignored local locations include .env variants, secrets/, private/, customer-data/, child-photos/, customer-uploads/, uploads/private/, local-db/, private-db/, temp/, cache/, generated/private/, exports/private/. .env.example is explicitly allowed and contains empty values only.
Credentials belong in the OS credential manager or approved secret storage. Never copy Codex auth.json, GitHub CLI credentials, certificates, passwords, access tokens or real .env into source/backups/context packs.

Security checks inspect tracked/current staged source and all reachable historical commits before backup. They detect forbidden paths, credential-file names and known token/private-key patterns without printing matching secrets. Git hooks and CI run the checks.
.gitignore is prevention, not encryption or retroactive removal. Check every asset for personal data manually. A private repo is not a private-customer-data store.
ZIP and Git bundle backups are not encrypted and contain source/metadata only; keep Drive private and do not create public links.
No background update manager or scheduled task is activated by setup. External service connections must be reauthorized on a new account.

## Phase4.1 creative Library boundary

Public historical source summaries/evidence are allowed tracked creative data; no full source texts or private customer/child identifiers. Source rights/profile/religious fields are provisional, not permission or certification. Strict batch/JSONL/DNA reject bidi controls. Indexed mirror corruption is checked against canonical data before filters and is not repaired silently.

Creative ZIP is separate from source/Git/context recovery: fixed three-entry JSONL allowlist, CRC/hash/directory/size validation before mutation, no arbitrary ZIP extraction or mixed SQLite. Explicit public/synthetic free-text declaration is required, not automatic privacy certification. Operational IDs/tables/provider notes/audit aliases/current approval authority are excluded; historical counts/approval hashes cannot replay operational events. Preview/CAS/conflict choices/transaction rollback preserve original data. Private operational DB encryption/backup remains outside current authorization.
