# Phase 4.2 independent adversarial QA

Reviewed implementation: `d3640b716892835b78af2b169887bab1c40300fa`, feature/phase4.2-story-planner; stable baseline `1d9ade078114112f05dc62aaafc3d7a055e2f651` unchanged. One independent GPT-6.1 Sol HIGH review, no implementation authorship or additional agents. Synthetic in-memory/disposable SQLite only. Owned changes: this report and tests/app/phase42-red-team.test.ts.

Current recommendation: **proceed to consolidated verification/final acceptance**. Independent closure of fix `8cc4b6076ac2b066e6bf861137e9b21d652baad9` confirms all four finding groups CLOSED. Remaining BLOCKER/HIGH/MEDIUM/LOW findings: **0/0/0/0** within this review scope. No major architecture incompatibility found. The original reproductions and initial evidence below are retained as historical QA evidence; they no longer describe the fixed implementation.

## HIGH — P42-QA-A: stale planner approval still authorizes a new approved-workflow reference

Reproduce `QA-06`: accept a plan, import synthetic draft, run canonical QA and explicitly approve; then SCORE its selected source, creating a new Library revision. `validateCurrentPlannerSource(currentWorkflow)` correctly throws PLANNER_STALE. Calling `StoryLibraryService.saveApproved(currentWorkflow, "APPROVED_STORY_REFERENCE", ...)` nevertheless succeeds and creates a fresh reference carrying that stale approval/report/hash. The new reusable row remains GENERATED; this is not an automatic promotion. The defect is fresh approval-based extraction after the planner's current-source authority has expired.

Location: packages/core/src/story-library.ts:289 verifies equality with the stored current workflow but does not enforce its current planner source. packages/persistence/src/index.ts:896 already defines the source check used by fresh approval. Require the same current-source boundary before fresh planner-based extraction, preserving retained historical approval data and legacy extraction behavior. Rejected extraction must leave Library unchanged.

## MEDIUM — P42-QA-B: explicit causal fields can contradict chronology/location without a finding

Reproduce `QA-01`–`QA-03` against the committed preschool trial plan:

- Move beat 2 to another location with a valid fromLocationId; let beat 3 return to the default setting with no transition. No high location finding: packages/core/src/story-planner.ts:730 exempts every arrival at the default setting.
- Point incitingBeatId, turningBeatId or climaxBeatId to the final ENDING after resolution. No high finding: line 812 checks only existence. The declared structural anchors can be chronologically impossible while StructuralCompleteness remains STRONG.
- Clear every pre-resolution addressesProblemId, leaving the original problem referenced only in RESOLUTION and its later ENDING. No high problem finding: line 793 accepts any non-resolution reference, including one after resolution.

These are contradictions in structured fields, not demands to interpret arbitrary prose. Validate transitions whenever adjacent locations differ, and anchor/problem chronology appropriate to the selected age form. Preserve simple infant/routine forms and their optional anchors.

## MEDIUM — P42-QA-C: CompletelyNew fallback silently reuses a selected family through a member

Reproduce `QA-04` with two unchanged real starter records: `structure-pattern-981b90da` and its linked `source-aesop-2`. Select the family with CompletelyNew and explicit provisional/adaptation acknowledgments. With no alternative pattern available, ranking falls back to the IDEA_SEED. The resulting plan still declares the same selectedStoryFamilyId/pattern, but includes no reuse limitation and returns VariationCompliance=ACCEPTABLE.

Location: packages/core/src/story-planner.ts:538–547 detects reuse by selected *record* identity/record usage rather than resolved family/pattern identity. Disclose same-family/pattern fallback regardless of which member supplied DNA; set the advisory signal to REVIEW. Preserve disclosed fallback when alternatives are unavailable. Also retain a focused test that genuine available alternatives are preferred.

## MEDIUM — P42-QA-D: family member plans lose family lineage and real outcome counts

Reproduce `QA-05` with the same real family/member pair, FreshConcept generation=1. The chosen source is source-aesop-2, and the plan declares its known family. Accept/import/QA/approve it and submit actual current APPROVED feedback with no ratings. The family remains at one existing seed variant instead of adding a second planner variant; timesUsed and approvedCount remain 0 instead of 1. The generated planner concept has no family link. Only the member receives use/outcome events.

Location: packages/core/src/story-planner.ts:1100 derives familySource only from sources whose recordId equals the family ID; a selected IDEA_SEED has just its own retained source. Capture the exact retained family revision when family membership contributes to a plan; create GENERATED variants with that lineage and update appropriate source/family outcomes idempotently. Preserve exact revision checks and transaction rollback; do not infer/promote a family from theme alone.

## Verification and scope

- `node --import tsx --test tests/app/phase42-red-team.test.ts`: **14 tests, 8 PASS, 6 FAIL**. Failing QA-01 through QA-06 are normal desired-behavior assertions, deliberately retained for Engineering; no skip/TODO/expected-failure masking.
- `node --import tsx --test tests/app/phase42-planner.test.ts tests/app/story-workflow.test.ts tests/app/phase4-library.test.ts`: **52 PASS**.
- Selected story-language/phase41-creative cases: **5 PASS** (Arabic register/bidi, unrelated canonical speaker, historical portability without authority, DNA grouping not names/themes, feedback projection without real ratings/approval).
- `npm run typecheck`: **PASS**, including the independent regression file.

Independent passing checks cover canonical envelope side-path denial, declared hash/objective/beat/resolution/speaker drift with unchanged stored state, age boundaries 0/11/12/23/24/35/36/59/60/95 months, explicit cultural/not-default/religious consent, real feedback idempotency and rejection of a historical approval for a newly reviewed draft, injected write failure rolling back planner/workflow/Library together, immutable accepted history/reload/re-sealed frozen-package corruption, and all eight actual local manual trial kits/hash/schema/page IDs/blank evaluations/static-versus-live guidance. Existing focused planner tests cover four modes, actual structure-dependent actions, repeated attempts, stale packages, missing storage tables and GENERATED creative recovery.

No full historical suite/build/health/security scan/package GUI gate, external research, provider call, consumer login, private data, main merge/tag/push or Drive operation was performed. Those expensive consolidated gates remain deferred. Native Arabic, literary quality, child appeal, cultural/religious accuracy and provider comparison still require real manual review; schema success does not establish them. Trial files are unreviewed templates, not fabricated human/provider successes.

The independent QA commit contains only the two owned files. Disposable synthetic test databases remain under ignored temp/; no cleanup or normal runtime data access was performed.

## Independent closure — 2026-10-06

Reviewed only the compact fix diff, original findings and targeted boundary tests on clean feature HEAD `8cc4b6076ac2b066e6bf861137e9b21d652baad9`. No implementation edits. The original fourteen tests, including all six desired-behavior assertions, are unchanged; two independent closure countercases were appended.

| Finding | Closure evidence | Status |
| --- | --- | --- |
| P42-QA-A, HIGH | Fresh extraction checks current planner/source authority in the service and direct new-approved-reference persistence. Missing-validator adapters fail closed for planner extraction. Stale service/direct creates preserve Library, workflow and retained historical references. | CLOSED |
| P42-QA-B, MEDIUM | Return-to-default requires an actual transition; causal anchors cannot point after resolution or precede their prerequisite anchor; pre-resolution problem continuity is checked. Original infant/routine boundary cases remain valid. | CLOSED |
| P42-QA-C, MEDIUM | Same-family member fallback is explicitly disclosed as REVIEW. An independent real-used-family countercase confirms CompletelyNew without selectedFamily prefers a genuine unused available alternative. | CLOSED |
| P42-QA-D, MEDIUM | Exact eligible family revision is retained with member provenance. The original actual approval/feedback case now creates/counts the family variant and one real use/approved outcome. Family revisions stale the package; members never silently rebind obsolete lineage. Independent NotDefault/religious countercase requires both separate opt-ins even when member metadata is otherwise eligible. | CLOSED |

Closure commands/results:

- `node --import tsx --test tests/app/phase42-red-team.test.ts`: **16/16 PASS**, no failures/skips/TODO; fourteen unchanged original tests plus two independent countercases.
- `node --import tsx --test --test-name-pattern='member lineage freezes|member inspiration cannot|stale planner extraction' tests/app/phase42-planner.test.ts`: **3/3 PASS**, directly verifies family source staleness/consent and fresh-extraction service/persistence boundaries.
- `npm run typecheck`: **PASS**; `git diff --check`: **PASS**. Original test-file diff contains additions only.

Engineering's reported focused92/92 result was inspected as supporting evidence, not independently rerun wholesale. Full suite/build/health/security/dev+packaged and final architecture acceptance remain the next consolidated gate. No API/provider/human-quality claims, release operations or normal runtime data access. Only the two existing QA-owned files changed in closure.
