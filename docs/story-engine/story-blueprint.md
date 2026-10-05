# Canonical Story Blueprint
Design contract blueprint/0.1. One canonical meaning layer feeds print, digital and video. No separate AI-generated unrelated stories per medium. Logical model in ../architecture/data-model.md; example specifications in ../../examples/test-stories/.

## Required (R), conditional (C), optional (O)

| Field / kind | Requirement / semantics |
|---|---|
| schemaVersion, storyId, projectId, revisionId / IDs | R; stable ASCII identifiers, immutable approved revisions; display text Unicode |
| workingTitle / text | R; not publication metadata |
| ageMonths, ageBandId, ageProfileVersion / profile | R at approval; no DOB required |
| languageModes, primaryLanguageMode / enum | R; msa-simple, ar-eg, en; each edition linked below |
| primaryCategory, secondaryCategories / taxonomy | R primary, O tags; personalized overlays separate |
| objective / object | R one primary observable intent; kind educational/behavioral/emotional/connection/entertainment; success scenario, no outcome guarantee |
| educationalObjective, behavioralObjective, emotionalObjective / text | O, C when selected kind; no contradictory goals |
| theme, tone, readingMode / enums/text | R; theme concrete, adult-read default |
| protagonistId / reference | C for narrative; null acceptable infant object book |
| supportingCharacterIds, characterBibleRefs / references | R arrays, may empty; exact character bible versions if characters present |
| personalization / object | R default level0; heroMode independent; privateProfileRef C when needed, never real raw data in source |
| setting, environmentBibleRef / object | R; setting can be isolated paper field; stable prop anchors |
| meaningBeats / array | R; ID, sequence, purpose, action/discovery, emotion, visible facts, before/after state, next link; tiny recognition units allowed |
| pagePlan / array | R; pageId, order, beatIds, page/spread grouping, text-safe region, artBrief, mustShow/mustNotShow, prop/character states |
| languageVersions / array | R primary working edition; per-page narration, dialogue, alt text, glossary refs, diacritics policy, review and sourceRevision |
| illustrationBrief, styleProfileRef / object | R for visual outputs; no raw child image; text-free, composition, asset status |
| videoAdaptationNotes / object | O at initial concept, C before video; shot↔page/beat mapping, narration refs, suitability decision |
| outputIntents / array | R print/digital/video intended, not all automatically eligible |
| safetyQualityChecks, approvalRecords / arrays | R even when pending; reviewers, findings, blockers, exact revision hashes |
| learningNotes, parentParticipation, accessibility / objects | O guidance; parent text clearly separated |
| lineage, dependencyHashes / metadata | R at release; inherited sources and invalidations |
| generatedAssets, exportRefs / arrays | O until production; immutable approved asset versions |

## Meaning versus wording

MeaningBeat stores the event/intent/visible state independently of phrasing. LanguageVersion stores actual prose and pronunciation; an event may map to several short sentences. Page IDs remain stable across editions; content changes require recorded reconciliation. Canonical meaning is not an English master manuscript or a bag of prompts.

Each page's art reflects its visible facts; metaphors are marked nonliteral. Book covers/matter and video shots are derivatives referencing this revision. Adaptation can omit a noncritical flourish only with explicit owner-reviewed change record; objective, safety and core causal chain remain equivalent.

## Lifecycle / invalidation

Draft → concept-approved → text-approved → plan-approved → character-approved → art-approved → layout-approved → export-approved. Approvals are attached to specific revisions and output type, not a global Boolean. Rejected revisions remain recoverable.

Change beat/text: mark affected localization/narration/art/layout/video exports stale using dependency links, not delete them.
Change clothing/reference/style: invalidate dependent pages, retain unaffected approved asset versions.
Change printer profile: re-render layout/export only, unless page plan cannot fit.
Approved canonical revision immutable; edits create descendant revision with reason. Regeneration creates candidate asset, never silently replaces final asset.

## Invariants / later acceptance tests

Unique IDs; all refs resolve; contiguous ordered pages; profile matches age; before→after states continuous; language page set reconciled; objective single/coherent; no private identifiers in synthetic exports; output provenance reproducible; actual totals calculated; hard privacy/screen gates satisfied. Long art notes never counted or spoken as child prose.

Example JSON is a contract fixture, not a schema validator or database. Implementation will add JSON Schema/runtime validation, migrations and deterministic tests after approval.
