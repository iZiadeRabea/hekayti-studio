# Phase 3 execution plan and model audit

Date: 2026-10-06 Africa/Cairo. Lead: GPT-6 Astra. All implementation, specialist analysis, fixtures/tests and Red Team delegated to explicitly selected GPT-6.1 Sol workers. This is an execution strategy within the existing roadmap, not a replacement roadmap.

## Routing evidence (before source changes)

Root platform turn_context: turn 01a10e0d-2e95-7781-9cec-cc07df7cc4ad, timestamp 2026-10-05T21:51:47.452Z, model gpt-6-astra. No-write probe spawned with explicit model=gpt-6.1-sol and fork_turns=none. Platform child session 01a10e0e-23a9-7b13-9e9e-cfa5887e75d3, agent path /root/phase3_model_probe, turn_context timestamp 2026-10-05T21:52:53.331Z identifies model gpt-6.1-sol. Parent relationship confirmed in session metadata. Probe read no project files and changed nothing. Evidence is selected execution metadata, not a worker self-report. No prompts, reasoning traces, credentials or complete session logs copied here.

Baseline: clean main 9a068c284b0f9b460c80579561c6a84bfe83c87a; v0.3.0-core/checkpoint/phase2-complete match. Online health PASS zero warnings; 100 foundation + 329 design assertions and 35 application tests/typecheck PASS. Published safety tag checkpoint/pre-phase3-story-engine preserves that commit. Development branch feature/phase3-story-engine.

## Minimum shared decisions

- Keep existing packages and canonical Blueprint. New blueprint/1.1 explicitly permits only synthetic personalization levels 0-3; 1.0 keeps its level-0 restriction and old 0.1 migration remains unchanged. Private/photo level4 remains blocked. No new dependencies chosen.
- Astra owns packages/contracts/src/story-engine.ts and existing shared contracts, entrypoints, workspace configuration, root continuity and this audit. Story worker is explicitly delegated ONLY runtime schema implementation in story-engine-schemas.ts matching the frozen types. It must propose shared type changes before editing them.
- SourceStrategy manual/curated/ai/hybrid expresses preference, while provider provenance identifies actual mock/manual execution. No paid provider, key or network required. Idea components are distinct from complete story content.
- A concept has a semantic outline (action, actor, focal object/details, visible state, facts); the chosen concept becomes the canonical meaning/page blueprint. Language drafts independently express these semantics in natural MSA/Egyptian. Original canonical IDs/objective/character/state/page mappings stay authoritative.
- TrustedFact records human review/source separately from creative providers. Providers cannot make unsupported prose into trusted knowledge. QA exposes findings and human-review requirements, not quality certification.

## Dependency graph and ownership

Shared contracts → parallel Story / Age / Language → Astra handoff and contract review → Engineering integration → Astra integration review → independent QA/Red Team → scoped Sol fixes → regression → Astra release decision → GitHub/verified Drive recovery.

| Worker (GPT-6.1 Sol) | Owned paths | Required handoff |
| --- | --- | --- |
| Story System | packages/core/src/story-system.ts; packages/contracts/src/story-engine-schemas.ts; tests/app/story-system.test.ts; docs/story-engine/idea-system.md, concept-generation.md, concept-evaluation.md, story-generation-pipeline.md, story-qa-pipeline.md | Runtime validation, component diversity, concept selection, canonical blueprint/page planning, structured QA; deterministic provider; test results |
| Age & Development | packages/core/src/story-age.ts; tests/app/story-age.test.ts; examples/phase3/age-structure.json; docs/implementation/phase3-age-notes.md | Existing Age Engine integration and materially different structures for all five bands, particularly 0 conventional infant events; advisory limits; test results |
| Arabic & Language | packages/core/src/story-language.ts; tests/app/story-language.test.ts; examples/phase3/language-pairs.json; docs/implementation/phase3-language-notes.md | Independent MSA/Egyptian semantic drafting, language QA, paired fixtures and English-compatible contract; test results |
| Engineering (after Wave 1 acceptance) | Later explicit packet: service/repository/migration/desktop/IPC/UI integration and integration tests | Accepted contracts used end to end, transaction/error/failure/version handling, minimal creator workflow, representative matrix |
| QA / Red Team (after integration) | Later explicit packet: separate regression tests and findings report | Reproductions/severity for attacks on age/diversity/language/approval/staleness/provider/persistence and Phase 2 regressions |

Each implementation worker gets fork_turns=none, a focused task packet and an isolated worktree/branch under Documents/Hekayti-Studio-Worktrees. Never two workers on the same file. Three Wave 1 workers run concurrently; dependent waves run sequentially. Worktrees retain their changes until reviewed. Only Astra integrates reviewed commits; no blind merges or destructive cleanup.

## Frozen function boundaries

- Age: storyStructureFor(request: StoryRequest): StoryStructureProfile; reviewStoryAge(request, concept?, blueprint?): QaFinding[]. Reuse ageGuidance, never independently re-encode numeric profile budgets. Derive recognition units separately from zero infant plot events. Validate unsupported adventure rather than disguising it as a preschool plot.
- Story: createConceptSet(request, structure, generation=0): ConceptSet; evaluateConcepts(request, structure, set): ConceptEvaluation[]; buildStoryBlueprint(request, structure, concept, revisionId): StoryBlueprint; reviewStoryBlueprint(request, concept, blueprint): QaFinding[]. MockStoryConceptProvider implements the provider interface. Builder creates blank draft language editions as placeholders, not fabricated approval; Language fills prose later. Page plan explicit through exported planStoryPages(outline, structure): Page[].
- Language: createStoryDraft(request, concept, blueprint, draftId): StoryDraft; reviewStoryLanguage(request, concept, blueprint, editions): QaFinding[]. MockStoryDraftProvider implements the interface. Uses typed action/actor/meaning/page mappings. Mode-specific complete phrasing, no MSA word substitution; no automatic semantic or native approval. Reject unsupported/mismatched input rather than silently replacing meaning.
- All new modules are pure TypeScript independent of Electron/Node/files/database. Root package export subpaths provide the public boundary; do not import other worker files in Wave 1. Standalone tests use minimal in-memory typed inputs and existing Phase 2 data. Cross-worker integration comes after review.

## Gates and likely conflicts

Tests: schemas/version rejection; immutable sources; request/concept ownership; diversity in actions/mechanisms, not names; age structural constraints; same IDs/meaning across editions; synthetic-only levels0-3; page coverage/continuity; human approval bound to exact hash; persistence migrations/CAS/rollback; provider failure leaves prior work; all Phase 2 tests. Native UI/story reading and actual persistence/build smoke remain separate checks.

Conflict zones: shared schema evolution, narrative action vocabulary, edition IDs/source revisions, approval hashing, SQLite user_version and migration tests, JSX/IPC entrypoints. Workers propose changes using PROPOSED_SHARED_CONTRACT_CHANGE; Astra records acceptance/rejection and resolves them before dependent work. Existing 1.0/0.1 fixtures remain valid and unchanged.

## Handoffs and review decisions

Wave 1 started concurrently from frozen-contract commit 2f304f3. Platform turn_context verification (UTC 2026-10-05): Story System session 01a10e1d-61f8-7401-868f-7fb95898c99e at 22:09:31; Age session 01a10e1d-8563-7a01-9987-f36bfa3d6fd6 at 22:09:40; Arabic session 01a10e1d-adbf-7022-81f6-4413af60a3d6 at 22:09:50. Each identifies gpt-6.1-sol and the root parent relationship. Branches agent/phase3-story-system, agent/phase3-age-development, agent/phase3-arabic-language have distinct worktrees; no shared writable files delegated concurrently.

Pending. Every worker returns AGENT, MODEL, MISSION, STATUS, BRANCH/WORKTREE, FILES CREATED/MODIFIED, TESTS ADDED/RUN/RESULTS, DECISIONS, ASSUMPTIONS, PROPOSED SHARED CONTRACT CHANGES, RISKS, OPEN QUESTIONS, INTEGRATION NOTES. Only factual engineering summaries recorded here.

Early language contract review: accepted optional CharacterBible.grammaticalGender (masculine/feminine), authored linguistic agreement metadata, never inferred from a name or treated as personal identity. Missing metadata uses neutral nominal phrasing and advisory human review. This additive optional field preserves existing fixtures. Language worker owns tests for explicit feminine agreement and missing metadata; Story worker may explicitly annotate fictional archetypes, not guess personalized profiles. No other interface change approved.

Age handoff reviewed and accepted pending combined Wave 1 integration: 9bc3efd + formatting 3d882818. Lead inspected implementation, all 12 tests and notes. Existing numeric profiles are reused; infant recognition units remain distinct from conventional events; hard eligibility and soft editorial findings are separate. Full suite reported 100 foundation/329 design/47 application PASS and health PASS. Explicit limitation accepted: blueprint free text alone cannot establish active actors/events; integration must supply selected concept. No age contract change required. No merge before remaining Wave 1 handoff reviews.

Story handoff reviewed after requested revisions: scoped commit 00fdd018; 14 new tests, final typecheck/49 application PASS, prior full foundation/design checks and health PASS. Lead inspected runtime schemas, component composition, page/blueprint construction and structured QA. Expected errors now use safe STORY_* codes; malformed canonical QA returns findings without dereferencing bad shape. Revised components accurately describe realized mechanism/conflict/outcome; concrete action-state mapping is bounded, not general story intelligence. Accepted with explicit prototype limits: four familiar objects, finite authored micro-actions, internal English component metadata, arbitrary objectives/unknown preferences require human review. No production literary/factual approval or paid source claimed. Language composition and integrated diversity/readability gates still pending.

Further lead contract decision from Arabic read-through: allow the same optional authored grammaticalGender on SyntheticPersonalization (levels1–3 only; level0 rejects it), so the creator can explicitly choose grammar for a fictional example without inferring it from a name. Story copies this metadata to the requested fictional role. Unknown agreement still uses neutral wording with advisory review. This is a linguistic setting, not collected real-child demographic data. Engineering must expose an optional synthetic grammar choice; Language must still test unknown-metadata fallback. Awkward neutral clauses and reversed helper/asker wording returned to Language for correction before acceptance.

Early Story review returned scaffolding for revision: generic component labels and mechanism labels independent of actions were insufficient semantic diversity. Required substantive reusable components, connected concrete challenges/outcomes and category/preference influence. Language/Story coordinate reusable vetted semantic action/state realizations; mock rejects unsupported combinations rather than inventing meaning. A complete-story catalogue with renamed characters is not accepted. Additional localized-state fields deferred because the finite mock can explicitly bound supported semantics without widening canonical contracts.
