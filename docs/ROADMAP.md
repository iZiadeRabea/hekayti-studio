# Practical roadmap
Phase1 below = research/design, distinct from business Phase1 (owner tool) and business Phase2 (future customer website). No following phase authorized merely by this file.

| Phase | Goal / deliverables | Dependencies | Checkpoint | Acceptance criteria |
|---|---|---|---|---|
| 1 Product intelligence | researched profiles, canonical contracts, paper-cut/localization/pipeline/QA specs, 3 synthetic fixtures, stack comparison | recovered foundation | checkpoint/product-design; v0.2.0-product-design | required docs complete, sources traced, heuristics labelled, tests/health/push/backup verified; no app built |
| 2 Core contracts + feasibility (verified 2026-10-06) | versioned Zod contracts, pure deterministic core, SQLite/assets/approval logic, provider contracts only; small secure RTL/PDF/portable-package lab | owner-approved Phase 2 | checkpoint/phase2-complete; v0.3.0-core | 35 app tests; native Arabic review; both six-page proofs reviewed; packaged Windows smoke; independent source/history recovery; docs/implementation/phase2-acceptance.md |
| 3 Story Engine vertical slice | project/blueprint/age rules/category templates/manual editor, one short synthetic story | phase2 contracts/profiles | checkpoint/story-engine-v1 | A/B/C budgets/ref integrity, hard/soft gate distinction, no infant plot imposed |
| 4 Arabic/localization | MSA/Egyptian glossary/edition/read-aloud approvals/RTL tests | canonical story | checkpoint/arabic-engine-v1 | native editor accepts modes; beats aligned, all glyph/bidi tests pass; English optional later |
| 5 Characters/personalization | stock bibles, level0–3 optional modes, consent/private/redacted store | phase2, approved privacy policy | checkpoint/character-system-v1 | hero explicitly chosen; profile deletion/retention tested; level4 stays blocked until special gate |
| 6 Illustration pipeline | import/one reviewed provider adapter, style pilot, page-level regen/jobs | phases3–5, provider/rights/cost decision | checkpoint/illustration-engine-v1 | owner approves pilot/full sequence; rerender one page preserves others; budget/retry/safety tested |
| 7 Books | page layout/print+digital profiles/preview/export/preflight | approved art/text, printer specification | checkpoint/book-generator-v1 | full Arabic PDFs, safe zones/effective PPI/fonts; actual physical proof accepted |
| 8 Basic video | shots from same illustrations, narration import, motion/captions/assembly | approved source/art, eligible ages/licences | checkpoint/video-pipeline-v1 | complete finite video reviewed, RTL captions/timing correct; under-two gate tested |
| 9 Creator workflow integration | unify wizard/editor/art/export/settings and packaging | sequential slices; thin UI begins in phase2/3 | checkpoint/creator-studio-v1 | restart/resume, approval/staleness/blockers and owner end-to-end order rehearsal |
| 10 Hardening / controlled pilot | packaging/update/migration/private backups, failure drills, actual owner pilot | all V1, native/child-development/privacy/print reviewers | checkpoint/production-ready; v1.0.0 only on acceptance | restore operational orders; leak/security checks; representative guardian-reviewed feedback; no unvalidated outcome claims |
| 11 Website feasibility | server adapters/tenancy/consent/customer intake/delivery, accounts/payment only if approved | proven owner workflow and new authorization | checkpoint/web-platform-plan | threat/privacy/product reviews, domain tests reused; separate hosting/commerce decision |

Phases3–9 use small vertical slices: manual short story → imported art → single output → repeated pipeline. UI is not postponed until everything is finished, yet a broad Dashboard is not first milestone. Video basic composition required for complete owner V1; generative animation later. No dates/cost estimates fabricated.

## Current status — 2026-10-06

Phase 2 core/feasibility is stable at v0.3.0-core. Phase 3 synthetic Story Engine implementation and independent QA fixes are complete; package 0.4.0 release preparation and consolidated gates are authorized, final Astra release review pending. Existing later-phase roadmap above remains unchanged. No paid AI, later production features or full UI is implicitly authorized. Confirm private-order backup/consent boundaries before any real data.
