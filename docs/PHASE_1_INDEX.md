# Phase 1 — product intelligence and system design
Version: v0.2.0-product-design. Prepared 2026-10-05. Status: design complete; implementation and production validation NOT performed.

This is a design specification, not a functioning application, clinical assessment or promise of educational outcomes. The owner requested research, specification, checkpoint and recovery backup only. Stop after this milestone; Phase 2 requires approval.

## Read in order

1. [Evidence register](research/source-register.md), [child development](research/child-development.md), [age suitability](research/age-appropriateness.md).
2. [Age engine](age-engine.md), [story types](story-engine/story-types.md), [canonical blueprint](story-engine/story-blueprint.md).
3. [Localization](language/localization-engine.md), [personalization](personalization/personalization-engine.md), [photo safety](personalization/photo-safety.md).
4. [Style bible](art/paper-cut-style-bible.md), [illustration pipeline](art/illustration-pipeline.md).
5. [Print](books/print-book-pipeline.md), [digital](books/digital-book-pipeline.md), [layout](books/page-layout-system.md), [video](video/video-pipeline.md).
6. [Creator workflow](product/creator-workflow.md), [MVP scope](product/mvp-scope.md).
7. [Modules](architecture/application-modules.md), [technical recommendation](architecture/technical-architecture.md), [logical model](architecture/data-model.md).
8. QA: [story](qa/story-qa.md), [illustration](qa/illustration-qa.md), [book](qa/book-qa.md).
9. [Selected skills](selected-skills.md), [roadmap](ROADMAP.md), [synthetic acceptance specifications](../examples/test-stories/README.md).

The language-specific sheets and character bible are linked from their engine specifications.

## Evidence and authority

E = externally supported finding, cited at point of use.
D = editorial/product decision or provisional numeric heuristic, not a developmental fact.
H = hypothesis to validate with Egyptian families/native editors; no testing claimed.
O = open decision/release gate requiring owner or qualified professional.

Chronological age is a starting profile, not a diagnostic judgement. Accessibility, language exposure and caregiver feedback can change editorial settings without labelling a child delayed. A product age group is not an internal developmental band. Printed leaf/page/spread counts must not be conflated.

## Major open gates

- Owner confirms MVP priorities, approximate time/budget and Windows hardware.
- Egyptian native-language editor and early-childhood reviewer validate content, pronunciation and numeric budgets.
- Printer/binding specification and physical proof required before selling a printed book.
- Provider handling/retention, guardian consent, secure private-data backup and local legal review required before real child data.
- Arabic rendering/export and Windows packaging spikes must pass before technology is operationally locked.
- No learning-effectiveness study, market-demand study or actual production story is represented as completed.

All requested deliverables are files, not chat-only knowledge. Check CURRENT_STATE.md and immutable Git tags for recovery; manifests/receipts identify the actual uploaded commit.
