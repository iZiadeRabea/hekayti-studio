# Application modules and phased scope
Logical modules can be combined as tabs/panels; no requirement for 15 distinct large applications.

| Module | MVP required | Later | Customer website role |
|---|---|---|---|
| Dashboard / Projects | Combined local list, state/blockers, order alias | richer filtering | tenant-scoped jobs/orders, not direct creator internals |
| Story Wizard | age/language/type/objective/optional personalization | template browsing | constrained request intake only |
| Story Editor | canonical beats and language text, manual changes | compare editions | none initially; guardian review subset |
| Age Engine | versioned profiles, eligibility/warnings | expanded ages/reviewed settings | same shared rules |
| Language Engine | MSA/Egyptian modes and glossary | English/bilingual | select edition mode |
| Character Library / Builder | combined bible/reference approval, optional role | photo gate, catalogue | consent-bound request/review |
| Style Library | single paper-cut profile | approved variants | select approved style, not raw prompts |
| Page Planner | page IDs, visual contract/text-safe region | advanced spread templates | internal |
| Illustration Studio | import, candidate/approved states, one adapter | multiple providers/editing | progress/approval subset |
| Book Preview | full RTL edition preview/overflow | more bindings/formats | guarded preview/download |
| Video Storyboard | basic approved-asset motion/narration | generative shots | eligible product request |
| Export Center | print/digital/basic video and QA | bulk/provider presets | authorization-protected delivery |
| Settings | local paths, host-side keys, profiles/cost ceiling | multi-user roles | server admin only |

MVP modules deliver sequential vertical slices per ROADMAP.md, not parallel giant scaffolding. Domain/use-case rules independent of React/Electron; preview UI does not own story state or approval truth.

Human approval is an application use case with auditable persisted records, not a button that sets every version approved. Private data never flows into browser logging or telemetry by default.
