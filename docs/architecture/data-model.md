# Logical data model
Design only; no database created. Schema planning version model/0.1. Stable IDs Unicode display fields, immutable version/hash references, no raw child identifiers in examples.

## Entities / ownership / cardinality

| Entity | Role / relationships | Classification |
|---|---|---|
| Project | order/work container, 1→many Story/Export/Approval/Job; alias not customer name | operational authority; possibly private |
| Story | identity/category/objective; 1→many StoryVersion | source-of-truth identity |
| StoryVersion | immutable candidate/approved revision, parentRevisionId | source-of-truth lineage |
| StoryBlueprint | canonical meaning payload for a StoryVersion; 1→many beats/pages | source-of-truth meaning |
| MeaningBeat | ordered intent/action/state; referenced by pages/shots | source-of-truth narrative |
| LanguageVersion | many per StoryVersion, unique mode/revision; text by pageId | source-of-truth wording |
| ChildProfile | optional per private order; display data/age/consent ref | PRIVATE; never required level0 |
| ConsentRecord | private purpose/authority/provider/retention scope | PRIVATE source-of-truth permission evidence |
| Character | reusable stock identity or scoped private character | source; private if identifiable |
| CharacterBible | many versions per Character; locked appearance/references/progressions | source; referenced assets may private |
| Page | ordered PagePlan unit, beat IDs, illustration contract and edition mappings | source plan, no pixel authority |
| Scene | shared environment and prop anchor/state context for beats | source continuity |
| Illustration | candidates + approved pointer; hash/provider/input dependencies | generated but approved asset NOT safely rebuildable |
| VideoShot | ordered approved-asset/beat refs, timed motion/narration/captions | source adaptation plan |
| StyleProfile | versioned paper-cut/material/palette rules | source configuration |
| LayoutProfile | binding/geometry/font/colour/edition constraints | source production configuration |
| Export | format/profile/dependency hashes, output hash, QA/delivery state | derivative; reproducibly rebuildable only if all inputs retained |
| Approval | reviewer role/time/scope/exact version+hash/findings | source-of-truth gate |
| Job | attempt/inputHash/provider/status/cost/error category | operational; redacted content |
| Checkpoint | app snapshot schema/asset manifest; separate Git code checkpoint | source recovery metadata |

Logical flow: StoryVersion → Blueprint/LanguageVersion/PagePlan → CharacterBible/StyleProfile + approved Illustration → Layout/VideoShot → Export. Approval gates each boundary; stale dependency prevents release.

## Storage and authority

One operational authority: SQLite transactions with immutable canonical payloads and typed query tables, validated on save. Frozen JSON snapshot exports are portable recovery artifacts, not a second independently writable canonical store. Derived thumbnails/search/QA caches rebuildable; indexes can be regenerated from payloads. Migration defines where each authoritative field lives, not duplicated conflicting tables.

Assets content-addressed files; relative asset IDs resolved by AssetStore, no machine-dependent C: paths in canonical records. Original illustration/reference master and approved image must be retained with hashes; generation cannot guarantee identical reconstruction. All asset promotions transactional/reconciled; orphan/partial candidates never automatically approved.

Privacy class inherits through dependency chain: child profile/photo → illustrated reference → illustration/narration/metadata → export. A cartoon likeness is not automatically anonymous. Private order metadata and prompts remain outside Git and foundation backups, even if no photo. Generic templates/age/style sources plus synthetic fixtures belong to code repo.

## Later constraints / operations

Unique IDs; foreign refs resolve; StoryVersion no destructive mutation after approval; language modes/age profile exact; contiguous page order; valid asset handles; no stale approved export; per-order consent adequate; approved retention actions propagating; job uncertain result reconciled before retry.

Snapshot consistent DB plus full referenced approved/master assets, schemaVersion, hashes and key policy; live-file copy unsafe. Test restore to new destination. Website adds tenant ownership, row/object authorization and schema migration while preserving IDs/payload meanings. No cloud SQL design or child profile schema implemented yet.
