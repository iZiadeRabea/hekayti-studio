# Permanent product context

## Identity and market
Project: Hekayti Studio. Initial market: Egypt only.

## Language and ages
Primary modes: simplified Modern Standard Arabic; Egyptian Arabic. English is additional/later support.
Initial public child age groups: under 1 year; 1–2 years; 3+ years. Keep ranges extensible. Phase1 design refines internal bands to 0–11,12–23,24–35,36–59,60–95 months; explicitly include two-year-olds rather than leave a gap. 5+ initial profile covers only5–8 provisionally; older ranges require new research. See docs/age-engine.md.

## Stories and personalization
Educational, behavioral, values-based and learning stories for older children. Adventure stories for children older than approximately two years.
The customer's child is not always the protagonist. Personalization and making the child the hero are optional.
Future reference photos supplied by a parent/guardian may support a consistent illustrated child character. Consent, retention, access controls and secure storage must be decided before processing real photos.

## Visual direction
Colorful layered paper-cut art, paper collage, cut-paper shapes, soft layered depth and playful child-friendly design.
A reusable design Style Bible now lives in docs/art/paper-cut-style-bible.md. No final art generated or owner-approved yet; production consistency must be tested.

## Outputs
Printed Book; Digital Book; Video Story.

## Delivery phases
Phase 1: manual/local creator studio operated by the owner. Customers do not operate the software. The owner receives an order and produces the story using the studio.
Phase 2: only after the workflow proves reliable and high quality, consider a customer-facing website with story type, age, language, optional child-photo upload, personalization, and digital/printed/video orders.

## Architecture principle
Core logic is reusable without Electron. Phase 1 recommended Electron + React/TypeScript with local SQLite and asset-store adapters; Phase 2 implemented and tested that baseline through separate npm workspaces and scoped Arabic/print/Windows feasibility gates. Exact dependencies are pinned in package-lock.json and docs/implementation/phase2-overview.md. AI/image provider, final printer/font and real-data retention remain unselected. Phase 1 architecture specifications remain historical design rationale; implementation evidence takes precedence for actual runtime state.

## Current authorization
Historical foundation/design sessions authorized infrastructure and specifications only. Owner approved Phase 1 and authorized engineering Phase 2 on 2026-10-06: reusable executable contracts/core, deterministic Age Engine, synthetic SQLite/assets, minimal secure Electron/React test shell, Arabic/font/PDF and Windows packaging feasibility. Phase 2 scoped gates are now verified; see docs/implementation/phase2-acceptance.md. No paid AI, real child/customer data, production story generator, final editor or website. STOP after Phase 2 recovery delivery; later phases require approval.

Phase 3 is now explicitly authorized: reusable Story Engine using deterministic synthetic/mock sources, Astra architecture/review and GPT-6.1 Sol implementation workers. This supersedes the Phase 2 stop boundary only for the approved Story Engine scope. No paid AI, real personal data, production illustration/video or polished editor. See docs/implementation/phase3-agent-execution.md; stop after Phase 3 delivery.

Phase 3 implementation and independent QA fixes are complete within the synthetic scope; 0.4.0 release preparation is authorized. Final Astra review, stable release publication and final verified source recovery remain separate pending gates. The owner lean-execution override delegates routine implementation/integration/testing and batched fixes to Sol. Manual paired Arabic inspection documented prototype limitations; it does not certify literary/native/developmental quality.

Final Astra review approved preparation bce41c657c371cbb0cf6bd14ab12a21d71ce8948 for v0.4.0-story-engine, finding no unresolved blocking/high issue in the approved Phase 3 scope. Mechanical main/checkpoint/release publication and private verified source recovery are authorized. Exact final delivery identity belongs in the external receipt; no subsequent product phase is authorized by this release.

## Canonical production design
One versioned Story Blueprint meaning layer with linked natural-language editions feeds Printed Book, Digital Book and eligible Video Story. Personalization levels0–4 are optional; photo-reference level4 does not automatically make a child protagonist. Age word/page limits are provisional editorial guidance, not clinical facts. Human approvals bind revisions/hashes and downstream changes mark artifacts stale.
Under-two child-facing video disabled by conservative product policy; caregiver shared reading primary. Current2026 AAP guidance and WHO2019 advice are documented separately. Children's photos/names/illustrated likeness and operational orders remain private and excluded from source recovery backups. Private operational backup/consent/retention controls required before real orders.

Business Phase1 (owner studio) is distinct from engineering Phase1 (this design milestone). Complete internal V1 includes basic approved-illustration video assembly, not whole-video AI generation. Public website/accounts/payments deferred. docs/PHASE_1_INDEX.md routes all design documents; docs/ROADMAP.md describes future approval-gated steps.
