# Phase 4.4 independent QA — engineering findings closed

Current status: all nine original engineering findings and both scoped residual countercases are CLOSED. The unchanged expanded independent assertions13 plus shared renderer assertions2 pass15/15 in `temp/phase44-qa-closure-focused.log` (67.1s, no skips); final typecheck PASS. Native/PDF visual and consolidated release/recovery gates remain pending and are not certified by this audit. The initial findings and countercase history below are retained for traceability.

Audited integrated production snapshot `c3edcd6` against the complete 146-section owner specification, read once in bounded chunks. This is one focused independent audit of changed contracts/core/persistence/private asset adapter/Electron/export/renderer and direct dependencies. Trusted `344fe2e8` / 0.6.0 history was not re-reviewed. No production modifications, full suites, package, release, owner data, network, or photo capture.

## Reproduced findings

| ID | Severity | Reproduction and effect | Required correction |
| --- | --- | --- | --- |
| Q44-01 | HIGH | Seven-month cloth idea + GUIDED RECOGNITION retains the selected key but silently replaces all recognition events with cloth reveal/hug/sleep. `guided-story.ts:327` chooses cloth before the chosen path. Independent test 1 fails. | Preserve the selected path events; any incompatible idea/path needs visible review or correction, not replacement. |
| Q44-02 | HIGH | Approve/layout/approve book, then import and approve new artwork in the same page slot. The old layout remains `approved:true`; `exportModel` succeeds with the former image. Independent test 3 fails. | Make active image selection part of current layout/book authority and require review when the selected version changes. |
| Q44-03 | MEDIUM | Approve newer page artwork, USE an older approved version, then AUTO_LAYOUT. USE changes old status to IMPORTED and AUTO_LAYOUT still selects the newest-created image. Independent test 4 fails. | Separate human approval history from active slot selection; USE must select the requested accepted version. |
| Q44-04 | MEDIUM | Change visual STYLE, then send IMAGE_DECISION USE for the stale artwork directly to service. It succeeds. Independent test 5 fails. | Enforce current authority for USE as well as APPROVE at service boundary. |
| Q44-05 | HIGH | A synthetic Windows ancestor junction `alias -> source` with asset root `alias/media` passes forbidden-root checks and stores PHOTO bytes physically inside `source/media`. Junction creation succeeded on this host; independent test 6 fails, no skip. | Validate canonical root and all ancestor authority against forbidden roots before creating/writing private directories. Apply the same rule to render-temp/export locations. |
| Q44-06 | MEDIUM | Enter identity creator notes specifying green shirt/red shoes, approve identity, prepare character reference prompt. Exact notes are stored but completely absent from the prompt; normal creator has no other ordinary clothing controls. Independent test 9 fails. | Include creator notes as clearly delimited data in character/page/cover identity prompts. |
| Q44-07 | HIGH | Custom Egyptian step `تولين ما رفعتش القماشة.` is interpreted as lifting: toy becomes VISIBLE, coveredBy cleared, reviewRequired false. Negation probe fails. | Recognize this ordinary negation or preserve covered state and mark uncertain interpretation for review. Do not assert an action that was negated. |

## Additional required source findings

- Q44-08 MEDIUM: `book-runtime.ts:196` preflight checks identity photo files only. Approved Character Sheet files are not verified when preparing/copying a dependent prompt or approving/exporting its book. Delete the controlled sheet file after approval: page/cover prompt remains usable despite the missing exact design authority. Resolve the bound sheet asset through main-process verified reads; reject missing/corrupt sources. Native closure evidence belongs to UI/Ops.
- Q44-09 MEDIUM: `export/book.ts:72` expands the print sheet by bleed but confines artwork to the trim rectangle. With 3mm bleed, there is a 3mm flat background band outside the image; no artwork extends into bleed. Support actual aspect-preserving artwork bleed or explicitly bound artwork-background extension. Inspect the rendered print PDF during native closure; dimensions alone do not establish usable bleed.

## Focused evidence

`tests/app/phase44-independent-qa.test.ts` owns 11 independent assertions. Initial focused nine: 3 PASS / 6 reproduced FAIL, ~45s, `temp/phase44-independent-qa.log`. Additional negation: FAIL; legacy read-only history: PASS after correcting the QA fixture's project locator, `temp/phase44-independent-qa-extra.log` and `temp/phase44-independent-qa-legacy.log`. Combined distinct probes: 4 PASS / 7 FAIL. A prior focused eight invocation reproduced five failures before the identity-note/negation probes were added; no broad test repetition.

PASS: canonical SHORT/LONG automatic page counts differ; injected append transaction failure restores exact prior book history and Library version; malicious renderer narration substitution fails without changing retained book; legacy creator load preserves exact canonical workflow/planner/creator/book JSON and creates no photo/intent histories. Existing raw migration/hash assertions remain untouched.

Native decoder/PDF rendering, Arabic visual shaping/wrapping/fonts, drag/resize usability, final page order/dimensions, failed PDF publication preserving prior bytes, packaged restart, privacy archive scans, consolidated regressions and source/791 recovery are pending separate required evidence. Controlled dimensions/render fingerprints in unit probes are not native or literary certification.

## Complete owner gate routing

Every numbered section is accounted for below; ranges are inclusive and nonoverlapping. This map identifies evidence ownership, not a claim that every gate passed.

| Sections | Audit/evidence route |
| --- | --- |
| 0–9 | Authority, priorities, scope, baseline and lean one-audit policy: followed; no new agents/full repo review. |
| 10–23 | Creator UI/idea/path/custom revision authority: source reviewed; Q44-01; required native UI flow pending. |
| 24–44 | Natural writer/infant/physical states/age/register/editor/canonical response: architecture and direct tests reviewed; Q44-07; controlled length/legacy assertions pass; human quality/native scenarios pending. |
| 45–60 | Photo private storage/relink/identity/profile/sheet/fictional authority: source reviewed and synthetic junction probe; Q44-05/06/08; native decoder/restart required. |
| 61–72 | Scene prompts/image history/review/resolution: source reviewed; Q44-02/03/04/08; focused implementation resolution/continuity evidence retained. |
| 73–94 | Composer live Arabic/speakers/anchors/geometry/staleness/title/settings/preview/PDF/approval: source reviewed and adversarial canonical/layout checks; Q44-02/09; actual native/PDF visual proof pending. |
| 95–100 | Resume/privacy/no auto Library/old projects/Advanced/normal labels: storage/source reviewed; legacy exact histories and Library nonmutation pass; native restart/Advanced regressions pending. |
| 101–112 | Required owner/Toleen/photo/continuity/composer/two-speaker/staleness/DPI/first-use flows: implementation-focused evidence + independent probes; native execution remains required. |
| 113–118 | Compact docs/skills/focused/consolidated/one independent QA/severity: this report; fixes required before release. |
| 119–128 | Performance/size/backup/source/Library/private-media recovery: no new dependencies observed; release/Ops verification pending. |
| 129–135 | Compact packet/final approval/release/budget/product quality: not certified; block final approval until batch and required gates close. |
| 136–142 | Aggregated acceptance/cost/honest limitations: pending closure and native/consolidated/recovery evidence; no literary/likeness/universal printer claims. |
| 143–146 | Final report/capability/future scope/stop: root/Ops after actual release/recovery; no future work started. |

Recommendation: do not release this snapshot. Fix HIGH and meaningful MEDIUM in one batch, then run the affected independent probes and the already-required native/consolidated release gates.

## Same-QA closure countercases

The unchanged original 11 assertions passed in the implementation worker's combined 19/19 focused run; shared bleed/render invariants passed 2/2. Reviewing only the fix diff found two residual cases within the original findings, reproduced by two additional owned assertions:

- Q44-02 remains HIGH: approve different page artwork (old layout becomes unapproved), then USE the former layout artwork. `load().approved` returns true again and the former final approval can export. The former approval must remain stale after a changed selection until an explicit final book approval; exact current-image comparison alone is insufficient to prevent approval revival. Countercase log: `temp/phase44-independent-closure-countercases.log`.
- Q44-08 remains MEDIUM: the actual `studio:command` handler source, executed with controlled Electron/asset ports, correctly rejects missing exact sheet authority for COPY_PROMPT and APPROVE_BOOK. However, after approving a replacement sheet, preparing a fresh PAGE prompt still rejects because PROMPT preflight unions current selected sheets with obsolete layout-bound sheets. Fresh prompt preparation must check its intended current binding; retained old layout dependencies should gate old layout/book approval/export. Countercase log: `temp/phase44-independent-closure-sheets.log`. The initial harness attempt used the installed TypeScript package's unavailable transpile API; corrected to the existing esbuild runtime before reproduction. This is handler-source execution, not native rendering evidence.

Q44-01/03/04/05/06/07 fix paths and original assertions are satisfied. Q44-09 shared geometry now fills the bleed and preserves digital trim; actual native bleed-edge visual verification remains a mandatory pending release gate, not an automated PASS claim. No broad second audit or full-suite/package run occurred. Closure waits for these two scoped residual adjustments and affected probes.

## Final scoped closure

The final fix diff records relevant page/cover/character-sheet selection-decision IDs in each sealed final approval. Both `load().approved` and `exportModel` require these exact current events, so a changed-and-restored image selection cannot revive the former approval. Persistence retains optional older approval histories but validates the new digest and retained event IDs; old approvals require an explicit current reapproval. The original failing switch-back assertion now passes.

Fresh PROMPT preflight verifies current selected sheets. COPY_PROMPT verifies the exact sheet IDs in the copied prompt; APPROVE_BOOK/EXPORT verify their exact layout image bindings. The executed main-handler test now proves missing-sheet COPY/APPROVE rejection and successful preparation after an explicitly approved replacement, without reviving stale artwork. These are controlled-port checks, not native image decoding.

Final confirmation used only this narrowed fix diff, unchanged owned test source, and the actual 15/15 result log. No production changes by QA, additional agents, broad review, full suite or package. All required engineering corrections from this independent audit are closed; proceed to the already-required native/PDF/consolidated/recovery validation. Actual bleed-edge visuals remain pending MEDIUM release evidence, not an unresolved source finding.
