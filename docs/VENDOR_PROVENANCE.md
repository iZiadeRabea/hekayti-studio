# Portable writing-skill provenance

These are instruction/resource snapshots, not Hekayti application implementation. No vendor workflow was executed for product generation during foundation.

| Source | Snapshot | License evidence | Recovery |
|---|---|---|---|
| https://github.com/danjdewhurst/story-skills | Plugin 0.21.0; installed cache manifest confirmed; source marketplace HEAD 860124118becdb3c72e40985ada4b929e359da78 | Upstream LICENSE included unchanged | 23 skill directories plus Node fallback and upstream plugin metadata |
| https://github.com/kangqiang1996-bot/picture-book-generator | Installed unversioned copy; exact file SHA-256 in skills-inventory.json | Upstream LICENSE included unchanged | Root skill, references and agent metadata |
| https://github.com/lensetek/Fiction-book-agent-skills | 18 installed directories; original computed source hashes retained in fiction-skills-source-lock.json | README declares MIT; upstream LICENSE file was absent (HTTP 404) at inspection | All installed skill files copied unchanged; no helper scripts outside those original installed directories were present |

No authentication/configuration secrets or global caches were copied. Exact snapshot contents are recoverable offline. Public upstream URLs may later change; archived snapshots and hashes are the stable evidence.

The lensetek layout/update skills refer to external repository helpers outside their skill directories. Those helpers were not in the existing skills installation and are not claimed available. Before using such a workflow, inspect dependencies; do not invent scripts or activate update schedules. Foundation infrastructure needs none of those helpers.

64 skills were explicitly exposed in the initial Codex runtime catalog; the other 21 disk-only instructions (system review and artifact-template entries) are documented without claiming active availability. 20 plugins were confirmed installed/enabled through Codex JSON output. A provider bundle can have cached default templates that are not individually installed in that output.
