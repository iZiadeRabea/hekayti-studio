# Simplified Modern Standard Arabic
D: house style msa-simple/0.1; native Egyptian children's editor approval required. See localization-engine.md, age-engine.md and [W3C Arabic layout](https://www.w3.org/TR/alreq/). “Simplified” describes editorial register, not a separate language.

## Wording and voice

Prefer concrete familiar words: كرة، بيت، يد، شجرة، يلعب، يرى، يساعد. One idea/clause for youngest readers; older prose can connect actions with ثم، لأن، عندما. Explain unfamiliar words through visible context; no formal bureaucratic phrasing or adult moral sermons. Formal grammar should remain correct without vocabulary chosen only to sound literary.

Examples of register (editorial, not final story):
- Dense: شرع الصغير في استكشاف محيطه بكل حماس.
- Simpler: نظر الصغير حوله. ماذا يرى؟
Do not assume Arabic whitespace counts equal English difficulty; review aloud, clause structure, referents and letter/diacritic density.

## Sentence, dialogue and punctuation

Use age guidance as soft budgets; clear subject references, short exchanges with identifiable speaker. Arabic comma ، question mark ؟ and standard full stop. Avoid long ellipses, clusters of exclamation marks and double punctuation. Choose «…» for quoted speech consistently; speech belongs in text layer, never model-rendered art.

Narrator uses MSA throughout; deliberate dialect dialogue must be explicitly a mixed-register edition, not an accidental drift. Avoid gendered/degrading judgments and rigid family assumptions. Pronouns/verbs/names must agree. Rhyme optional; clarity takes priority over forced rhyme.

## Diacritics (D, test with editor)

Under3 adult-read: selective disambiguating marks plus approved pronunciation notes; no need to cover every glyph merely because reader is young.
3–5 adult-read: selective marks on new/ambiguous words.
5+ emerging-reader edition: optional fully vocalized text reviewed by a competent Arabic editor, including endings policy. No automatic tashkeel approval or claims it guarantees literacy.

Diacritics are versioned editorial content, not decoration. Keep enough line height; test shadda/tanwin/hamza combining marks and PDF clipping. Preserve originals; NFC normalization where safe, never strip approved marks to “fix” display.

## RTL and rendering

Store logical Unicode text; set lang=ar and dir=rtl at text-block level, isolate Latin IDs/numbers. Never reverse letters manually or flip illustrations to solve bidi. Typography, marks, neutral punctuation and embedded English require actual render checks. [W3C RTL markup](https://www.w3.org/International/questions/qa-html-dir).
Number style (١٢٣ or123) belongs to edition profile, consistent across labels/pages. No manual spaces/kashida to force justification. Modest line lengths, ragged alignment rather than stretched letterforms; self-host licensed font, test ligatures and selection/search. Visual order and accessible reading order must agree.

Age adaptations preserve objectives and concrete meaning, not grammar quotas. Read aloud plus native review and parent-facing notes are approval gates.
