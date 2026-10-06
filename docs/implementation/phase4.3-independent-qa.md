# Phase 4.3 independent QA — batch and closure

Snapshot: `d5f5cb2cec4eb002694f3394761658961cc14b6b` on
`feature/phase4.3-simple-creator` (UI parent `9c419f3`). One independent,
local synthetic review; no production changes, provider calls, owner data,
full suite, build, or visual acceptance.

## Closure verification

**All six findings closed in the bounded code/regression review; zero
unresolved relevant findings.** Verified UI `1d88530` plus historical-heading
follow-up `b34eb3b`, and the backend owner batch awaiting consolidated commit.
This is not native visual or release acceptance.

- Original independent 12 + fixed UI 15: **27/27 PASS**, zero skips/failures.
- Two added closure countercases: **2/2 PASS**. Exact positive owner intent
  remains confident sharing; unchanged cast/setting reuses its bible; saved
  unapproved prose is labeled honestly; cross-edition retained-plan load fails
  precisely. A diacritized denied goal with positive explicit success rejects
  before any project/Library mutation.
- Changed-cast/history probe: **1/1 PASS** after adding a byte-equivalent
  persisted-old-plan assertion. The first added assertion mistakenly compared
  snapshot history summaries with full plans; it was corrected to read the
  repository's full retained plan, without weakening immutability.
- Latest UI including historical reference-heading regression: **16/16 PASS**,
  zero skips/failures. All **14 distinct owned QA cases** pass across these
  scoped runs; no original assertion was weakened.

H1 now reconciles exact cast/name/setting and enforces bible/cast identity in
storage while retaining history. H2 no longer invents positive success for
denied/uncertain custom intent. M1 uses independently authored MSA clauses.
H3 binds every returned plan to the exact Reader draft/edition, fails closed
for unavailable/wrong sources, and displays immutable plan-bible character
headings. M2 labels saved draft prose and exact source approval honestly. M3
groups advisory reasons with counts/pages and retained detailed locations;
HIGH/BLOCKER stay visible. No schema/version change was required.

Additional scoped verification commands:

```text
node --import tsx --test tests/app/phase43-independent-qa.test.ts tests/app/phase43-simple-ui.test.ts
node --import tsx --test --test-name-pattern="closure|new accepted cast" tests/app/phase43-independent-qa.test.ts
node --import tsx --test --test-name-pattern="new accepted cast" tests/app/phase43-independent-qa.test.ts
node --import tsx --test tests/app/phase43-simple-ui.test.ts
```

Native H3 history/current-PREPARE interaction remains scheduled in the separate
MEDIUM visual gate. No real provider retrial or publication-quality claim.

## Initial status and tests (retained evidence)

At the initial snapshot: **changes required**. No BLOCKER found; three HIGH
and three MEDIUM findings, all subsequently closed above.

- Supplied focused creator/UI/writer-bridge run: **36/36 PASS**, zero skips.
- Owned `tests/app/phase43-independent-qa.test.ts`: **9 PASS / 3 FAIL**,
  12 tests including nested cases, zero skips. The failures intentionally
  expose H1, H2 and M1 below; assertions must not be weakened to obtain green.
- Atomic annotation-failure and prepared-QA-commit-failure injection both
  preserve byte-equivalent workflow, planner, creator and Library snapshots.
- Five alternate exposed goal/category combinations pass, including colors,
  sleep, helping, numbers and feelings: no sharing-only test coverage.

Commands used:

```text
node --import tsx --test tests/app/phase43-creator.test.ts tests/app/phase43-simple-ui.test.ts tests/app/phase422-writer-bridge.test.ts
node --import tsx --test tests/app/phase43-independent-qa.test.ts
```

## Initial consolidated findings (closed above)

### HIGH H1 — prior visual bible can become current for a different cast

`packages/core/src/illustration.ts:299` unconditionally reuses the latest
bible. Repro in owned test: import draft A, PREPARE illustrations, explicitly
replan with a new primary character/name, ACCEPT, prepare/import draft B,
PREPARE illustrations again. The new snapshot says `stale=false`, but its
bible defines A's character IDs while page participants use B's IDs. Example
actual IDs `qa43-8-actor-0/1` versus expected `qa43-22`, `qa43-25-actor-1`.
Thus current prompts may omit the actual cast's visual definitions.

Fix: validate bible identity against the accepted current cast before reuse;
append a new clearly synthetic, review-required bible for changed cast (or
block with actionable guidance). Validate this relationship at persistence
as well. Preserve A's immutable bible/plan/prompt history.

### HIGH H2 — denied custom Arabic goal is confidently inverted

`packages/core/src/simple-creator.ts:418` recognizes sharing through
`دور/ينتظر` plus `صاحب/لعب` and then invents positive sharing success at
`:424`, without polarity handling. Owned repro custom goal:
`لا يشارك الطفل اللعبة ولا ينتظر دوره مع صاحبه.` It becomes
`SHARING_TURN_TAKING`, `limited=false`, `presentation.supported=true`.
Retaining the original input does not prevent this semantic inversion.

Fix: only synthesize a known success criterion for positively supported
custom intent; conflicting/negative/uncertain custom intent must remain
limited/actionably reviewed, not acquire a positive success scenario.
Keep the exact positive owner sentence working without translating storage.

### HIGH H3 — historical reader text can be paired with current image prompts

Code-trace reproducible path (native interaction not yet exercised): retain
draft/illustration A, import B with different prose, select illustration A,
then PREPARE the current illustration plan and GENERATE prompts. Historical
selection correctly loads reader A (`SimpleApp.tsx:517`), but generic
`illustrationCommand` only updates illustrations (`:156–159`). PREPARE uses
the backend current draft B while `pages={reader.pages}` (`:470`) remains A.
`SimpleIllustrations.tsx:48` pairs solely by page number. Opening illustrations
from an explicitly historical Reader can likewise load a current plan.

Fix: bind visible reader/pages to every returned plan's exact draft and mode,
including initial open and PREPARE, or prevent current actions until opening
the current Reader. Do not render/copy under a mixed source binding; show
missing/edition mismatch honestly. Add an interaction regression and verify
this sequence during the later native visual gate.

### MEDIUM M1 — supported simplified MSA still contains Egyptian morphology

Owned exact-owner test projects `ar-MSA-simple`. The result is marked
supported but includes `بيدحرج`, `ياخد`, `يشاوروا`, `يستخدموا` in controlled
action sentences. `creator-presentation.ts:164` performs a finite word
replacement over Egyptian clauses rather than a complete independent MSA
projection. This is a deterministic register error, not a claim about
publication/native literary quality.

Fix: explicit MSA controlled clauses/grammar for all supported patterns;
unknown clauses should request review instead of certifying register. Keep
story register independent of UI language and exact authored input unchanged.

### MEDIUM M2 — unapproved imported prose is described as approved

`illustration.ts:403` labels actual draft narration `نص الصفحة المعتمد` in
the normal Arabic action/summary. PREPARE is allowed for an imported draft
whose canonical approval is still null; the atomic fixtures use that state.
No backend approval is fabricated, but the user-facing description is false.

Fix: say saved/current draft text unless this exact draft has canonical
approval; do not imply automatic literary or user approval.

### MEDIUM M3 — repeated advisory QA is collapsed, not grouped by reason

`SimplePlanPreview.tsx:19–37,49–53` renders every advisory separately inside
one disclosure and counts findings, not reason groups/affected pages. Repeated
page findings still expand into the large repetitive list prohibited by
request section 27 / acceptance L. HIGH/BLOCKER entries do remain visible.

Fix: group advisory findings by safe localized reason/code and severity,
summarize affected page count, retain all individual locations in disclosure.
Do not bury or merge away blocking findings.

## Integration notes and limits

No new contract/version change proposed: enforce existing current-source,
semantic, register and truthful-authority contracts. Source binding for UI
pages should explicitly follow `plan.draftId` and `plan.mode`.

Only the new independent QA test and this report are owned changes. Core/UI
owners have supplied the consolidated fix batch and affected scoped tests
pass as documented above. Preserve legacy hash/version fixtures when committing.
Native visual acceptance, actual provider retrial/publication quality and
broad release/security gates are **not certified** by this review.
