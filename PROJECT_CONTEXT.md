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
Design core logic for reuse by a web application without rewriting the whole product. Planning baseline: Electron + React/TypeScript, pure domain/application boundaries, local SQLite and asset-store adapters. Arabic/print/Windows feasibility gates remain before implementation; AI/image provider, printer, exact dependencies and real-data retention are unselected. See docs/architecture/technical-architecture.md.

## Current authorization
Historical foundation/design sessions authorized infrastructure and specifications only. Owner approved Phase 1 and authorized engineering Phase 2 on 2026-10-06: reusable executable contracts/core, deterministic Age Engine, synthetic SQLite/assets, minimal secure Electron/React test shell, Arabic/font/PDF and Windows packaging feasibility. No paid AI, real child/customer data, production story generator, final editor or website. Stop after Phase 2 gates and recovery verification; later phases require approval.

## Canonical production design
One versioned Story Blueprint meaning layer with linked natural-language editions feeds Printed Book, Digital Book and eligible Video Story. Personalization levels0–4 are optional; photo-reference level4 does not automatically make a child protagonist. Age word/page limits are provisional editorial guidance, not clinical facts. Human approvals bind revisions/hashes and downstream changes mark artifacts stale.
Under-two child-facing video disabled by conservative product policy; caregiver shared reading primary. Current2026 AAP guidance and WHO2019 advice are documented separately. Children's photos/names/illustrated likeness and operational orders remain private and excluded from source recovery backups. Private operational backup/consent/retention controls required before real orders.

Business Phase1 (owner studio) is distinct from engineering Phase1 (this design milestone). Complete internal V1 includes basic approved-illustration video assembly, not whole-video AI generation. Public website/accounts/payments deferred. docs/PHASE_1_INDEX.md routes all design documents; docs/ROADMAP.md describes future approval-gated steps.
