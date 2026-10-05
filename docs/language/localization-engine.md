# Localization Engine specification
One canonical meaning graph, multiple approved language editions. See ../story-engine/story-blueprint.md.

## Contract

Input: immutable blueprint revision, target mode/locale, age profile, language style version, glossary, name policy, reading mode.
Output: LanguageVersion ID/source revision; localized working title and child prose by pageId; dialogue speaker IDs; narration/pronunciation notes; alt text; caregiver text separately; word/clause totals; QA findings and human approval.

Modes: msa-simple (BCP47 ar), ar-eg (ar-EG with internal dialect flag), en (chosen English locale). Internal editorial mode and language tag are distinct. Don't change an ID when its display name is translated.

Meaning invariants: causal events, named roles/identities, quantities, emotion, learning goal, safety boundaries, page/beat order. Wording may vary in syntax, refrain, idiom and rhythm. Literal translation or automatic MSA word replacement is prohibited as final approval.

## Workflow / failure handling

Canonical concept approved → native drafting → page-level semantic comparison → read aloud → glossary reconciliation → RTL/layout check → human approval.
Provider outputs treated as untrusted drafts; no “translation confidence” substitutes for a reviewer.

Each edition references same sourceRevision and page IDs. New beat invalidates corresponding editions. Track semantic differences explicitly; no unrelated per-language AI stories. Fixed beat IDs can map to multiple layout pages when approved, using EditionPageMapping rather than silently deleting content. Revised layout invalidates print/video derivatives.

## Acceptance matrix

Three synthetic specs eventually rendered in Arabic both modes; test hamza/diacritics, parentheses, punctuation, mixed “A-12”, numbers ١٢/12, left-to-right English edition, glyph shaping, line clipping, speaker attribution and caption line breaks. Test same object count/action/emotion across languages, not text identity.

O: Egyptian orthography/editor, English locale, full-tashkeel reading editions and bilingual-density policy. No translation API/provider chosen.
