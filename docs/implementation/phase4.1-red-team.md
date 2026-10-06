# Phase 4.1 independent red-team audit

Base: `1a351e62c9ff799d35c699c1031078cf44afed9b`. Independent QA authored no Phase 4.1 implementation. Only this report and `tests/app/phase41-red-team.test.ts` are owned changes. No implementation fixes, external research/refetch, production data, new agents, build, full-suite, Drive, push or tag operations.

Result: **four open findings**, represented by five desired-behavior failing assertions. Existing focused regressions remain green. This is not release approval.

## Findings

### P41-RT-001 — HIGH: successive backups erase historical review and usage attribution

Reproduction: import one synthetic seed; explicitly REVIEW, APPROVE and PROMOTE it; export, restore into an empty library, then export again. The first portable attribution records `PROMOTED_TO_LIBRARY`, version 4; the second replaces it with `GENERATED`, version 1. Separately create a real synthetic workflow request and a valid USED library event; export/restore/export/restore. Historical `timesUsed: 1` becomes zero, while both restored operational usage arrays correctly remain empty.

Expected: preserve prior historical type/status/version/hash and usage attribution across repeated portability cycles without granting any current approval or recreating operational usage. Actual: `projectCreativeLibrary` unconditionally creates attribution from the restored latest record and overwrites usage with current empty statistics. The review reproduction uses an IDEA_SEED, so its hash is null; an approved-reference non-null hash is not separately exercised here. The same unconditional assignment also replaces that field.

Recommended fix: preserve existing portable historical attribution and historical usage distinctly from current/local statistics; define deterministic behavior for subsequent local activity. Never turn historical status/hash/usage into present approval. Tests cover both review and usage loss. Source remains unchanged; this is metadata loss in the new backup, not corruption of the original DB.

### P41-RT-002 — MEDIUM: later COPY after KEEP cannot complete a valid merge

Reproduction: archive records `one` and `two`; target already contains a different `one`. Restore with KEEP_EXISTING for `one`, adding `two`. Re-preview the same archive and choose COPY_WITH_NEW_IDS for `one`.

Expected: add one deterministic copy and retain existing records; repeated identical choices should replay. Actual: rejects with `Event identities must be unique`. The restore digest-derived batch ID is unchanged, and event suffixes enumerate only newly added rows: the later copy reuses the first restore's `.0` event ID. Transactional rejection retains the target; no partial-write loss observed.

Recommended fix: bind import event identities to stable record/action identity or the explicit decision set, not the index within a changing added subset. Preserve append-only history, replay semantics, CAS and rollback guarantees.

### P41-RT-003 — HIGH: KEEP silently changes an incoming variant's structural family

Reproduction: archive structural family F and variant V referencing F/version 1. Target contains the same F ID/version with a fundamentally different mechanism. Preview identifies the family conflict; choose KEEP_EXISTING for F, leaving non-conflicting V as ADD.

Expected: reject the unresolved dependent import or explicitly require dependency-closure decisions/copying; never silently attach V to a different structural identity. Actual: restore succeeds and V references the kept target F/version 1. Referential shape is valid but semantic lineage is changed. This is not the already-tested explicit COPY-variant/KEEP-family rejection: it is the default incoming ADD variant dependency.

Recommended fix: propagate changed/kept dependency conflicts to incoming variants and derived references. Require explicit safe closure, preserve source family structure, and do not repair this by weakening reference validation or approval rules.

### P41-RT-004 — MEDIUM: all 40 Nigerian seed observations retain HTML instead of clean narrative text

Reproduction: read committed Nigeria collection rows. All 40 ideas contain raw paragraph markup; all 40 DNA ending observations contain closing markup. `source-nigeria-1` says `Opening observation: <p>There was once a king who was very powerful.. Closing observation: </p>.` Its closing observation is not narrative evidence.

Expected: extract source narrative text before selecting sentence observations; missing or unobserved content remains UNKNOWN/NOT_AVAILABLE. Actual: collection processing keeps HTML paragraph boundaries and selects a closing tag as an observed ending. Cached raw source does contain the actual narrative, so this is extraction quality/evidence labeling, not an invented source or false digest.

Recommended fix: sanitize/decode the appropriate narrative container, preserve the documented cached-evidence hash definition and locator, regenerate only justified observations/DNA, and validate all affected rows. Do not invent absent endings, expand opening-only samples into complete stories, or relabel editorial inference as source fact.

## Focused results and commands

- `npm ci --ignore-scripts`: dependency installation completed. Install reported 8 moderate vulnerabilities; no audit-fix or dependency changes performed. These were not independently severity-triaged.
- New adversarial suite: 13 cases in total; 8 pass, 5 desired-behavior failures for the four IDs above. Initial draft had a QA counting error (synthetic families included in collection counts), corrected to count SOURCE_DERIVED only, and an invalid synthetic usage fixture, corrected to a real workflow request/USED event. Neither is an implementation finding.
- Final non-benchmark confirmation: `node --import tsx --test --test-name-pattern="P41-RT|registry collection|declared private|allowlisted export|ZIP truncation|DNA unknowns|restored opinions|non-default/religious" tests/app/phase41-red-team.test.ts`: 12 tests, 7 pass, 5 fail, zero skipped.
- `node --import tsx --test tests/app/phase41-creative.test.ts tests/app/phase4-library.test.ts tests/app/phase4-red-team.test.ts tests/app/story-workflow.test.ts tests/app/persistence.test.ts`: **80/80 PASS**, zero skipped. Includes Phase 4 hybrid/manual approval authenticity, envelopes, rollback, canonical corruption, migration and workflow regressions; not the full project suite.
- `npm run typecheck`: PASS after final QA edits. Prettier applied only to the owned new test.
- Independent 5,000 disposable rows: import/search/filter/export/empty restore/replay counts PASS; archive 8,561,571 bytes, SHA256 `f5efd7b28f85c4e06dc55192f36844cb2317245f88bc56420a16d10146b17ea1`. Initial timings ms: 784/253/263/985/4308/4857 respectively. A negative test-name filter inadvertently also matched the benchmark, so a second focused run occurred: 935/268/326/1066/4730/5320 ms. Both runs passed; no benchmark added to the real corpus. In-memory SQLite timings are observations, not hardware-independent SLAs or 5,000 sourced-story claims.

Passing new checks: explicit private-field/origin rejection; declared-public free-text limits; exclusion of customer/photo/project/package/provider/model/audit canaries; ZIP CRC/truncation/path/trailing-byte rejection; digest/version stale previews and no writes; DNA unknown/value consistency, ranges, causal advisories and structural signatures; actual SCORE-only feedback; no historical usage/current approval conflation; non-default/religious acknowledgment enforced at package service and persistence envelope boundaries.

## Corpus, source and cultural truthfulness

Independently verified committed JSONL/registry counts: **791 records = 765 sourced IDEA_SEED + 26 synthetic structural families**, **zero executable STORY_CONCEPT**; 121 ORIGINAL_ABSTRACT and 644 EXTRACTIVE_SEED; 25 richly inferred DNA rows, 20 structural pattern IDs, 22 mapped variants. Collection counts match registry when counting sourced rows only. All imported corpus records are GENERATED, scores null. These counts must not be presented as 791 complete executable concepts or 5,000 original stories.

Manual agent inspection of cached actual narrative samples, not human/native certification: Egypt ancient `egypt1-3` (Shipwrecked Sailor), `egypt2-2` (unfinished Doomed Prince); modern Spitta `egypt-modern-1/4`; Arabian `arabian-1`; West Africa `westafrica-2/8`; Nigeria `nigeria-1`; Turkish Nasreddin `nasreddin-8`; Kalila `kalila-2`; Aesop `aesop-133`; Grimm `grimm-1`. Cached `temp/phase4.1-source-cache/sections.json` in canonical root was used; selected extracted-section SHA256 values all matched committed evidence digests. No full texts were dumped or refetched.

Egyptian ancient return/gift observations, West African causal problem-solving, Nasreddin's contaminated Ramadan stone counting and reciprocal-help Aesop sample are supported at their stated editorial/extractive levels. Spitta's 12 entries are opening observations only, Kalila's two entries are frames, Arabian frame is opening-only. The broken papyrus retains NOT_AVAILABLE resolution and UNKNOWN ending. Its COMPLETE_NARRATIVE scope label should be read as the available narrative unit, not proof of a finished ending. Scope limits are not fabricated completeness findings. Enriched mechanisms/attempts are explicitly EDITORIAL_INFERENCE, not a certified recovered source structure. Pattern hashing is structural, not a guarantee of literary equivalence; arbitrary supplied categories still need editorial review.

Cultural origin is not quality, age suitability or religious certification. EGYPTIAN_ARAB_MUSLIM_FAMILY is an explicit selectable target preference, not a claim all Arabs are Muslim. GENERAL_FAMILY remains separate; religion remains an explicit review flag. Keyword screening is conservative/provisional and principally English, not qualified multilingual religious/cultural review. Evidence supports these limitations; no screening promise should be expanded. Human review/promotion stays mandatory and independent of culture acknowledgment.

## Existing GUI evidence and limits

Read canonical `temp/phase41-ui/source-zOCXXB/evidence.json` and manually inspected `starter-dna.png`. Receipt lists seven PASS gates: explicit 791-row import/no auto approval/30-row rendering, Egyptian opening/DNA/religious provenance, explicit lifecycle, isolated ZIP export, read-only preview, empty restore/demotion and restart persistence. Screenshot visibly distinguishes source summaries/inference/provisional culture, shows explicit lifecycle controls and the cultural-profile selector. This is review of existing isolated GUI evidence, not a fresh UI launch, independent human certification, paid-provider validation or a unit-test-derived visual claim.

Allowlisting prevents table/declared-field leakage, but public/synthetic declaration does not detect personal information pasted into allowed idea/title/editorial/DNA strings. The free-text canary intentionally survives when declared public; this documented scope limit is not a bypass of a PII detector. Backup is latest-creative-only, not an operational DB backup. Legacy/corruption and rollback checks are focused existing regressions; this audit does not claim exhaustive failure injection or certified rights/sensitivity review.

## Integration handoff

Batch engineering fixes for P41-RT-001 through 004; preserve the five desired-behavior assertions. No shared-contract changes are implemented by QA. If preserving multiple attribution generations/local-vs-historical usage requires a contract extension, propose it explicitly and migrate without manufacturing current approval. Family dependency handling and stable event identities should remain canonical service/persistence behavior. Corpus text cleanup must stay source-grounded. Integrate only owned QA paths, then provide one fix SHA for independent focused confirmation before the final release gate.
