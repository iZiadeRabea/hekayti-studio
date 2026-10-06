# Simple creator mode

Phase 4.3 renderer integration is in progress; these are implementation notes, not a release receipt.

The local `hekayti.creatorMode` preference defaults to Simple. Advanced remains available through a small mode switch; UI language is stored independently. The compact form uses the service's age and goal presets and preserves authored strings exactly. Additional choices are collapsed, including exact months, place, detailed objective, success scenario, constraints, variation and cultural profile. Personalization accepts only a fictional name.

The service owns request construction, planning, QA and persistence. The human preview consumes `PlanPresentation`; it does not synthesize a second plan. Continuing requires an explicit review acknowledgment. High and blocker notices remain visible and disable continuation. Advisory notes are grouped separately, with original technical codes behind disclosures.

Focused renderer checks: `node --import tsx --test tests/app/phase43-simple-ui.test.ts`. Actual isolated Windows visual/restart/workflow validation remains pending integration.
