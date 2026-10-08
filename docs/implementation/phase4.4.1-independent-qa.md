# Phase4.4.1 independent QA — 2026-10-08

Scope: focused independent review of checkpoint15a17fa on feature/phase4.4.1-creator-workflow-fixes, trusted baseline471cec18/v0.7.0. Direct changed contracts/core/render/recovery/UI only; no full repository/history reread, research, full suite, build, cloud, owner runtime/corpus/private assets, production changes or extra workers. No PDF/computer skill used; native appearance evidence belongs to root's isolated acceptance run.

Initial focused test: `node --import tsx --test tests/app/phase441-independent-qa.test.ts`: **11 tests,4 PASS/7 FAIL**. All synthetic in-memory objects. Append-only history, three-character prerequisite isolation, punctuation/descriptive reflow compatibility and unknown-action/altText safeguards pass. Assertions intentionally express required behavior; none weakened.

## Consolidated findings sent to root and implementation

- **HIGH — physical scene edits retain approved artwork.** `packages/core/src/book-composition.ts:22` signature reduces recognized prose to sets of verbs/props/negation/alt text and ignores dialogue. `packages/core/src/book-studio.ts:551` treats matching signatures as compatible. Repro: change `نور حط الكتاب.` to `رامي حط الكتاب.`, `فوق السرير` to `تحت السرير`, dialogue `أنا حطيت الدبدوب على السرير.` to `أنا حطيت الدبدوب تحت السرير.`, or `نور يمسك الكتاب ويربط الشريط.` to `نور يمسك الكتاب ويفك الشريط.`. All four synthetic approved images wrongly remain APPROVED/current. Requires conservative handling of actor/relationship/unknown action changes while retaining compatible punctuation/reflow.
- **MEDIUM — character name falsely negates action.** `book-composition.ts:40,76` and `book-studio.ts:455` recognize `ما ` inside `ماما ` as negation. Repro: `نور بيقلب صفحة الكتاب مع ماما بهدوء.` loses page-turn framing and is flagged negated/review-required; the same rule can suppress literal prop continuity. Word boundaries must respect Arabic.
- **MEDIUM — saved different-composition choice is discarded.** `book-studio.ts:936–950` replaces saved VisualIntent with fresh derivation during prompt preparation. `PageCompositionPlan.tsx:110` changes framing/composition hint for the offered different-composition action, but its saved values disappear. Focused test proves the shared compose routine resets both fields.
- **MEDIUM — explicit rearrangement keeps obsolete packing.** `book-studio.ts:1143` PLAN_PAGE uses `composePage`, whose same-settings prior shortcut at936 retains old regions. Repro: mark existing narration rectangle as protected, save, request rearrangement; returned plan still overlaps the protected region. Preserve manual choices during prompt preparation but actually replan on explicit rearrangement.

Production freeze released for this batch. Implementation owns production fixes; this same QA owns test/doc closure.

## Risks and pending verification

Root is already performing isolated native navigation/unsaved-input/reopen/16-page/live-overflow and final appearance checks; these are not duplicated or claimed by this review. Source-only observations raised for that run were character identity portal-buffer recovery and cloud-tail bases at bounding-box edges. They were not counted as confirmed initial findings without native reproduction.

## Same-QA batch closure

Inspected the production fix diff and personally reran independent11 plus existing composition10: **21/21 PASS**, no skip/no weakened required assertions. The rearrangement fixture was strengthened to call the public PLAN_PAGE command with a minimal synthetic repository, so a separate explicit-rearrangement path can coexist with preservation during prompt preparation.

HIGH1 and MEDIUM2–4 are closed: complete structural narration/dialogue/speaker comparison conservatively detects actor, destination and unknown-action changes; only a bounded calm/ambient phrase allowlist preserves descriptive compatibility. Shared Unicode word-boundary negation avoids the Arabic-name false positive. Exact same-source saved framing/hint survive. PLAN_PAGE explicitly repacks and prior protected collisions also trigger packing.

Final narrow closure also reviewed the shared cloud-tail inset/stroke fix and same-character identity-buffer preservation. Added manual-placement preservation and four-direction cloud-tail target/base regressions: **independent13 + composition10 =23/23 PASS** in this QA's own run. The tail test checks coordinate invariants, not actual appearance.

Implementation reports native DOM5/5PASS (explicit mocked transport) including repeated exact-character recovery preserving an unsaved identity buffer at `C:\Users\Ziad\AppData\Local\Temp\hekayti-phase44-ui-441-recovery-qsdGDt`; regenerated six digital/six print pages with zero measured overflow/ready fonts and all12 Poppler pages visually inspected, attached tails, at `C:\Users\Ziad\AppData\Local\Temp\hekayti-phase44-ui-441-render-dck1uG`. This evidence is implementation/root-owned, not independent native/PDF inspection by this QA.

**Independent scoped QA: PASS. Open confirmed findings: BLOCKER0/HIGH0/MEDIUM0/LOW0.** Root's remaining consolidated/native/release/recovery gates remain separate; no full-suite/build result or release approval is claimed here. Conservative unknown semantics and manual art/anchor review remain explicit limitations. Only the owned test/doc were edited; no production edit or Git mutation by QA.

## Late native legacy reopen blocker — same-QA closure

Implementation/root reported an actual packaged reopen failure on the retained synthetic0.7.0 `hekayti-phase44-ui-hx7HDv` evidence: new `BOOK_LAYOUT_GEOMETRY` rules were applied to every historical layout during load. This was a genuine compatibility blocker, so the scoped QA was reopened for this narrow fix.

Reviewed only the bounded history-validation change: `validateBookSources` passes `enforceGeometry=false` for retained layouts; `validateLayoutSources` defaults to true. Existing canonical text/page/art/speaker checks and safe-margin checks remain enforced on load. SAVE_LAYOUT, AUTO_LAYOUT and requireExportSources (approval/export) retain new geometry enforcement. No stored legacy content is rewritten and no hash/approval check is bypassed.

Added one real SQLite close/reopen regression with a newly constructed synthetic v0.7.0-shaped colliding cover layout and valid historical approval/storage seal. It proves identical raw payload/version/digest plus unchanged workflow/planner JSON and current pointers after reopen; no composition field inserted; forged later approval hash rejected; fresh save/approval/export blocked by geometry without mutation; source text and safe-margin corruption still rejected; corrected layout and approval append successfully, export becomes available, and original layout/approval history remains exact. Its renderer callback is a synthetic fingerprint seam, not PDF appearance proof. Uses one built-in synthetic Library seed in an isolated temporary database, no corpus or owner data.

Own final focused run: `node --import tsx --test --test-reporter=dot tests/app/phase441-independent-qa.test.ts tests/app/phase441-composition.test.ts tests/app/phase44-book-core.test.ts` — **29/29 PASS** (independent14/composition10/core5). Required assertions retained. Late blocker closed at source/test level; actual rebuilt packaged legacy reopen evidence remains root/implementation-owned. Scoped QA remains PASS with zero open confirmed findings. QA-owned test/doc are final for the consolidated fingerprint gate.
