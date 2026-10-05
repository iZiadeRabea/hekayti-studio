# Phase 3 independent QA / Red Team

Date: 2026-10-06. Reviewed base: `67180ab70f2b76da386476f04602ec498fab355e`, branch `agent/phase3-red-team`, exclusive worktree `C:/Users/Ziad/Documents/Hekayti-Studio-Worktrees/red-team`.

Independent worker: the reused routing-probe worker authored no Engineering implementation. Platform routing evidence is recorded in [phase3-agent-execution.md](phase3-agent-execution.md). This audit changes only its new test and report; no implementation fixes, subagents, releases or external writes. The lean override limits this pass to focused regression and existing GUI evidence; full integration/build/health/backup gates are not repeated.

Result: **changes required**. Two independently reproduced integrity defects; one HIGH and one MEDIUM. No BLOCKER established. The new suite intentionally retains two failing assertions of desired behavior.

## Findings

### RT-001 — HIGH — historical approval can reference a different draft from its QA report

Component: `packages/core/src/story-workflow.ts:227`, approval validation in `WorkflowSnapshotSchema`; repository `saveWorkflow`/`loadWorkflow` inherit this validation.

Minimal reproduction: complete draft D1 and report R1; generate another draft D2 from the same blueprint and complete R2/approval A2. Clone A2 as a new historical record with a new approval ID, change its report ID/hash to R1's ID/hash, retain its D2 draft ID, append it and clear the current approval pointer. `repo.saveWorkflow` accepts this snapshot. Exact executable reproduction: `tests/app/phase3-red-team.test.ts`, test `RT-001: historical approval must bind its report's exact draft`.

Expected: reject unless the approval's `draftId` equals the draft ID in the source link of its `reportId`. Hash, report, request, concept and draft must describe one reviewed artifact.

Actual: validation checks that both the report and draft share a blueprint revision and that the approval hash equals the report hash. It never compares the approval draft with `reportLinks[reportId].draftId`. Independent report-hash verification consequently does not detect the false historical association. The test fails with `Missing expected exception: Wrong-draft historical approval must be rejected`.

Impact and bounds: the append-only audit history accepts a false human approval association between distinct draft identities/content hashes. This reproduction uses the repository API; the normal service does not construct it. Current pointer validation separately checks report-to-draft links, so this is not an established bypass of current UI approval or stale-approval replay. HIGH reflects corruption of the human attestation boundary, not a demonstrated public exploit.

Recommended fix: enforce the exact report-link/draft equality for **every** historical approval, alongside existing revision/hash/owner checks. Add explicit tests for two drafts sharing a source revision, direct repository save and tampered persisted history on reopen. No new shared contract is required.

### RT-002 — MEDIUM — missing canonical character rows are invisible to workflow validation

Component: `packages/persistence/src/index.ts:143`, canonical cross-table checks in `loadWorkflow`.

Minimal reproduction: generate a workflow/blueprint with a character; confirm `loadCharacter(projectId, characterId, bibleVersion)` returns that character. Close the repository, delete that exact canonical row in the synthetic SQLite database, reopen, then load the workflow. Exact executable reproduction: test `RT-002: missing canonical character rows must be detected on workflow reopen`.

Expected: fail with the existing retained-original-data corruption error if any historical blueprint's canonical character row is absent or differs from the embedded character bible.

Actual: `loadCharacter` returns null while `loadWorkflow` successfully returns the valid snapshot. Blueprint and edition rows are cross-checked; character rows are omitted. The test fails with `Missing expected exception`.

Impact and bounds: independent canonical character reads and workflow reads disagree, and persisted corruption escapes the advertised canonical validation. Embedded snapshot/blueprint character data remains recoverable; no loss of those embedded records or current approval bypass was established.

Recommended fix: compare all retained blueprint character bibles with canonical rows keyed by project/character/version during workflow loading; handle missing, malformed and changed payloads with the same corruption boundary, preserving originals. Cover historical as well as current characters. Do not silently repair or overwrite rows. No contract change is required.

## Focused verification

Dependencies: `npm ci --ignore-scripts` completed, 319 packages installed and zero audit vulnerabilities reported. No Electron installation or UI launch was needed.

- New test file: 19 independent tests; **17 PASS, 2 FAIL**, no skips. Both failures are RT-001/RT-002.
- Focused command: `node --import tsx --test tests/app/phase3-red-team.test.ts tests/app/story-workflow.test.ts tests/app/story-system.test.ts tests/app/story-age.test.ts tests/app/story-language.test.ts tests/app/persistence.test.ts`: **82 total, 80 PASS, 2 FAIL**, zero skipped/cancelled. All 63 existing focused tests pass.
- `npm run typecheck`: PASS with the new test file.
- Owned test formatted with pinned Prettier; `git diff --check`: PASS.
- Full repository suites, build, packaged launch, backup and foundation/health were intentionally not rerun; their accepted integration results are in [phase3-testing.md](phase3-testing.md).

Adversarial coverage includes all ten age boundary values from 0 to 95 months; infant complex plot, under-two adventure/video and unsupported age rejection; title/object-renamed causal duplicates; arbitrary educational objective and unsupported preferences; private/photo personalization rejection; false fact-review metadata and unknown factual IDs; state/cast inconsistency; page reordering, changed quantities/actors, bidi controls, word counts and foreign revisions; foreign/empty/stale concept selection; async provider rejection and invalid results; competing provider saves/CAS; request edit approval invalidation, immutable history, stale approval replay; report hash tampering; future database preservation and failed additive migration rollback. Existing focused regression additionally confirms v1 migration preserves legacy rows, reopen equality, tampered canonical editions/blueprints/reports, cross-connection CAS, injected facts and provenance rejection.

## Mock limits, separate from defects

The arbitrary-objective test requests orbital mechanics/escape velocity. Mock actions still produce supported object exploration, and the objective mismatch appears as a MEDIUM human-review advisory. Unsupported synthetic telescope preferences also receive an advisory. These are documented finite mock limits; no arbitrary learning-success claim was verified.

An additional adversarial test appends `الشمس تدور حول الأرض. ضاع الشيء للأبد.` to otherwise unchanged MSA narration and recalculates counts. Object/actor labels remain present, so language review emits MEDIUM `language-semantic-review` and no HIGH/BLOCKER. This demonstrates that lexical checks do not establish factual/event equivalence. The API already describes that review as unverified and requires human review/acknowledgment. It is a material production limitation, not an additional undisclosed Phase 3 defect. Acknowledgment cannot be interpreted as evidence that a native/qualified reviewer actually read the text. No production semantic approval is granted here.

Trusted facts are supplied records, not independently authenticated sources. A reviewer alias/source-reference string does not prove truth or authority; paid/provider factual verification is outside this audit.

## Manual paired Arabic reading

Manually read MSA first, Egyptian separately, then compared canonical actions/objects/quantities. Read all pages of fresh integrated compositions at 8, 18 and 48 months via a read-only Node composition command, in addition to all first-occurrence passages of `examples/phase3/language-pairs.json`. These observations are human inspection of text; passing lint is not the basis of literary acceptance.

- **Infant, 8 months:** six pages in each edition. MSA `الكرة في الحديقة.` and `مرة أخرى` pair with Egyptian `الكورة في الجنينة.` and `تاني`. Repeated recognition labels remain one ball/setting, with no quest, danger, solution or invented actor. The generated experience is sparse and depends on illustration/caregiver interaction, which was not assessed.
- **Toddler, 18 months:** eight pages, feminine نور. MSA `لاحظت نور الكرة في الحديقة.` / `جرّبت نور ... بمساعدة.` / `نور مطمئنة` correspond to Egyptian `نور خدت بالها ...` / `نور جرّبت ... بمساعدة.` / `نور مطمّنة`. Held pages repeat only focal labels rather than a second trial. The action remains generic; neither edition explains concretely what trying the ball means. The fixed 20-month pair similarly preserves one ball/help/reassurance.
- **Older, 48 months:** twelve pages, alternating نور and سلمى in canonical actor order. Both editions preserve notice → comparison → discovery → repeated recognition → settled object/reassurance. MSA `ثم الكرة مستقرة في مكانها في الحديقة` and Egyptian `وبعد كده، الكورة ثابتة في مكانها في الجنينة` are understandable but repetitive and schematic. Discovering an already repeatedly named object's location is a weak literary payoff. In the separate three-block pair, both keep three blocks throughout; ask/help/cooperate/solve/return direction is consistent, feminine forms remain intentional, and Egyptian `لمكانهم` preserves the plural object reference.

No new HIGH language/quantity/actor mismatch was observed in these representative reads. Neither natural storytelling quality, developmental suitability, diacritics, font shaping nor native read-aloud acceptance is certified. Longer/categorical coverage remains represented by focused tests, not a claimed complete editorial read.

## Existing GUI and IPC evidence

Read Engineering's exact `temp/phase3-ui/run-8S4SHy/phase3-ui-result.json` and manually inspected its `creator-approved.png` and `creator-stale.png` in the Engineering worktree. The receipt reports eight workflow/security/restart checks PASS. The approved screenshot visibly contains paired editions, advisory findings, explicit acknowledgment and approved status; the stale screenshot visibly shows changed 18-month request, version 13, stale status, two historical approvals and a requirement for current QA. These are existing captured states, not a new live UI test.

The creator's prototype English/Arabic mixed labels, long repeated advisories and exposed canonical IDs make it a laboratory surface; no final usability claim is supported. Reviewed main/preload source: sandbox/context isolation/web security enabled, Node integration disabled, navigation/window creation denied, explicit preload methods, strict discriminated action schemas and literal true acknowledgment. Existing receipt/Phase 2 regressions provide launch evidence. This pass neither repeats those smoke runs nor substitutes source/unit assertions for rendered/native acceptance.

## Handoff

STATUS: independent audit complete; batch Engineering fixes required for RT-001/RT-002 before Phase 3 release review.

FILES: `tests/app/phase3-red-team.test.ts`, `docs/implementation/phase3-red-team.md` only. Synthetic reproduction databases are ignored under `temp/red-team`; no customer/child data used.

TESTS/RESULT: focused 80/82 PASS; failures deliberately assert required integrity behavior. Typecheck PASS. Existing focused regression 63/63 PASS.

RISKS: two persisted-history/canonical-integrity gaps; finite semantic/factual/editorial review remains human; existing GUI evidence is historical. No new packaged or production certification.

SHARED-CONTRACT PROPOSALS: none. Both fixes fit existing approval/report links and canonical character keys.

INTEGRATION NOTES: cherry-pick the scoped audit commit into the Engineering fix base; preserve the failing assertions. Batch both fixes in one owned implementation task, then rerun the focused red-team/workflow/persistence cases once against the reviewed result. Lead owns continuity/release/full final gates. No implementation source or root continuity was changed by this audit.
