# Phase4.2.1 independent adversarial QA

Reviewed combined quality/Arabic-UI HEAD `0a7f409e05d8048b05e29225723eaf173bc46bbe` on `feature/phase4.2.1-planner-quality`, against stable `96e64925d9556981808f00ed323941c2e61ce2dd`. One independent HIGH QA context; no implementation authorship, extra reviewer, provider/network call, source-corpus change or normal owner database access. Status: **changes requested**; no architectural BLOCKER.

## Batched findings

### HIGH — H1: a positive lexical hit can invert or replace the objective

`P421-QA-01/02/03` exercise the **desktop-selected** `StoryPlannerService(..., "planner-quality/1.0")`, persisted StoryPlan1.1, and the complete 791-row Library, not legacy `composeStoryPlan`.

- Emotional Arabic `مشاركة المشاعر مع شخص موثوق` / `يتحدث الطفل عن حزنه مع أحد والديه` becomes `SHARING_TURN_TAKING`: the broad `مشارك` match wins before emotional evidence and composes toy/ball exchange instead of expressing feelings.
- Behavioral `Do not share a toy when it is broken` / `The child keeps the broken toy aside for repair` becomes positive `SHARING_TURN_TAKING`. Negation is discarded; the plan promotes the opposite action.
- Educational `Compare colors without fear` / `Sort each block by color` becomes `EMOTIONAL_REGULATION`, choosing the falling-tower coping episode rather than color comparison/sorting.

Cause: first matching rule across either objective field, without bounded negation/ambiguity or competing primary-operation handling (`packages/core/src/story-objective-intent.ts:17`, `:73`). These matches return `limited:false`; recomputing the same matcher cannot establish semantic fidelity. Desired behavior: distinguish sharing feelings from sharing objects, avoid claiming a negated social objective, and preserve the explicit observable educational operation. Unsupported/ambiguous cases may honestly use GENERAL/REVIEW rather than pretending unrestricted language understanding. These are small reproducible boundaries of the declared classifier, not a demand for ML or universal NLP.

### MEDIUM — M1: counter-only repeated attempts pass progression QA

`P421-QA-04` edits two adjacent attempts to keep rolling alone while the friend still waits, with unchanged strategy/information/relationship/consequence. Only `Attempt 1` versus `Attempt 2` changes across those fields and states; the state chain stays connected. No HIGH `NON_PROGRESSING_BEATS` is raised; BeatProgression remains acceptable. Exact string comparisons (`packages/core/src/story-planner-quality.ts:1017`) mistake counters for progress. Desired behavior: flag this counter-only padding, without rejecting meaningful infant/bedtime repetition or genuine new information/strategy. The positive infant/quiet test remains green.

### MEDIUM — M2: duplicate participant IDs impersonate a reciprocal resolution

`P421-QA-05` changes only the social resolution's participants to `[actorA, actorA]`, while two actors remain active elsewhere. No HIGH `SOCIAL_INTENT_CAST_MISMATCH` is raised. The resolution checks list length rather than distinct participants (`packages/core/src/story-planner-quality.ts:1038`); strict1.1 parsing also allows duplicates. Desired behavior: reciprocal resolution requires two distinct introduced participants where age permits; duplicate IDs must not satisfy it. This is a plan-quality validation gap, not evidence of bypassing a cryptographic seal.

### LOW — L1: known infant beat role leaks an untranslated enum

`P421-QA-06` generates an 8-month infant plan with role `REPEAT`. `label("REPEAT", "ar")` returns the raw uppercase enum, which `StoryPlanner.tsx:315` displays as the beat label. The typed UI dictionary lacks this known role. Desired behavior: provide an Arabic presentation label while preserving the canonical role, story language and authored text. Unknown source-authored values should still fall back exactly; they are not this finding.

## Reproduction and independent evidence

```powershell
node --import tsx --test tests/app/phase421-red-team.test.ts tests/app/phase421-quality.test.ts tests/app/phase421-localization.test.ts
npm run typecheck
```

Focused result: **24/30 PASS, 6 desired-behavior failures**, no skips. The new independent file is 5/11 PASS; the existing 12 quality and 7 localization tests independently ran 19/19 PASS. Typecheck PASS. Each failure has its own stable `P421-QA-01` through `06` assertion; originals and implementation were not modified.

Passing checks independently confirm:

- Exact 48-month Egyptian/adventure/behavioral owner request, FreshConcept, declared playground/warm constraints and acknowledgments, no sensitive/religious opt-in; actual new service produces 1.1/SHARING, family `hekayti-family-2`, honest null pattern, acknowledged provisional sources and two distinct resolution participants. Ball alone pauses play; visible role swap gives each child a turn; ending retains shared play. Library bytes remain unchanged at 791 records.
- Structural matching survives a renamed family ID/title; explicit irrelevant journey family is blocked. Multiple regeneration positions retain compatible concrete plans; existing focused tests cover all variations, changed observable strategies and safe no-Library fallback.
- Recognized paraphrases, emotional noncooperation, quiet bedtime and age8 repetition remain valid; unsupported empty-Library objectives disclose GENERAL/REVIEW with no invented source authority.
- Frozen manual-package plan hash and concrete HOW survive the current service, local synthetic response import, canonical draft QA/approval and real current feedback action. Wrong plan hash rejects before draft append; repeated feedback is idempotent. Creative recovery restores only GENERATED variants, not planner/workflow approval authority. Mock/synthetic prose is not provider or native literary evidence.
- Existing focused source-proof corruption test rejects re-sealed fabricated compatibility while preserving original bytes. Retained actual v0.5.2 accepted plan/package/workflow golden reload and subsequent append preserve original bytes/hashes. Legacy1.0 helper/default-service boundary remains intentional; desktop explicitly opts into quality1.0.
- Arabic/English server rendering, local preference bounds/failure fallback, bilingual visible switch, canonical request options and exact authored text/technical diagnostics. Independently inspected existing isolated Electron receipt `temp/phase421-localization/run-XFqfEN/evidence.json` and Arabic-plan/English-switch screenshots: useful actual renderer/IPC evidence, not a new packaged smoke or native-language certification.

## Limits and next gate

No main merge, tag, push, Drive action, full historical suite, build, packaging or owner runtime access. No claim of provider output quality, developmental/native review, child appeal, or comprehensive free-text semantics. Source/library authority and old accepted hashes were checked through focused local fixtures, not production private data. After the single batched fix, re-run unchanged six regressions and affected focused positives; consolidated release/package/recovery gates remain with Ops and final owner approval.
