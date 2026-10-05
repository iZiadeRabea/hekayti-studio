# Age Engine specification
Specification only, profile version age-profiles/0.1. See research/child-development.md and research/age-appropriateness.md for E findings. Everything numeric here is a D/H editorial starting range requiring human testing, not medical guidance.

## Input / output / boundaries

Input: exact age in months (not DOB), selected reading mode (adult-read / emerging-reader), language, primary category, one objective, accessibility preferences, product intent. Do not require age if a broad enquiry is still a concept; require it before blueprint approval.

Bands are half-open: [0,12), [12,24), [24,36), [36,60), [60,96). At 12,24,36,60 choose the next band; 96+ requires a reviewed new profile, not silent reuse. Public groups under1, 1–2, 3+ remain marketing labels; explicitly route two-year-olds to 24–35 months rather than leave a gap. Under1 may use optional 0–5/6–11-month detail, not new mandatory data.

Output: profile ID/version, suggested budgets, permitted structures, guidance, product eligibility, evidence refs, warning reasons and recorded human override. Hard gates: valid age; no disallowed safety content; photo consent/storage gate; under-two child-facing video excluded. Soft ranges: words/pages/characters/events; excess warns with explanation rather than truncating prose.

## Text budgets (D/H)

Story pages exclude cover/front/parent matter. Page = one printed side, not spread. A spread can contain two pages but one beat.

| Band | Total story words | Story pages | Words/page | Sentence guidance | Vocabulary / repetition |
|---|---:|---:|---:|---|---|
| 0–11m | 0–40 | 6–10 | 0–5 | Labels or one tiny phrase, roughly 1–4 words | Familiar noun/sound; high exact refrain |
| 12–23m | 20–100 | 8–12 | 2–10 | One concrete clause, roughly 2–6 words | Everyday nouns/actions; high repeat with one change |
| 24–35m | 60–180 | 8–14 | 4–15 | One short sentence; occasionally two linked clauses, roughly 3–9 words | Concrete sequencing words; recurring refrain |
| 36–59m | 120–400 | 12–20 | 8–25 | 1–3 short sentences, roughly 4–12 words each | Explain one unfamiliar word in context; moderate repetition |
| 60–95m | 250–700 | 16–28 | 12–35 | Simple varied sentences, roughly 5–16 words | Limited inference/metaphor with support; refrain optional |

Ranges are not simultaneously guaranteed (total must equal actual page sums). Arabic count uses documented whitespace-token convention, excludes punctuation-only tokens; compare clause count and spoken duration too. Art briefs/parent matter not included. Each localization has its own measured budgets; retain canonical beats, revise layout if needed, never shrink type just to satisfy a count.

## Narrative and visual budgets (D/H)

| Band | Named active cast | Visible plot events | Illustration complexity | Feelings / learning | Plot, adventure, dialogue / narration |
|---|---|---|---|---|---|
| 0–11m | 0–1 focal figure, caregiver optional | 0 conventional events; 3–5 recognition/reveal units | One subject, uncluttered high separation; colour not relied on alone | Warm faces/familiar objects/sounds, not moral reasoning | No plot needed, no adventure; caregiver labels/sound imitation; virtually no dialogue |
| 12–23m | 1 + at most1 helper | 1–3 familiar actions | One action, few large objects | Hello/goodbye, in/out, naming, gentle routines | Optional routine mini-story; no peril/quest; warm slow narration, tiny dialogue |
| 24–35m | 1 + 1–2 helpers | 2–4 linked events | One key change/page, stable setting | Simple cause/result, feelings, adult-modeled turn-taking | Small familiar exploration, no villain/subplot; short exchanges |
| 36–59m | 1 + 1–3 supports | 3–6 beats | Clear foreground, limited scene anchors | Friendship, choices, comparison, supported problem-solving | Short plot appropriate; bounded reassuring adventure; narration plus brief dialogue |
| 60–95m | 1 + 2–4 supports | 5–8 beats | More clues but explicit hierarchy | Simple viewpoints, practical concepts, sequences | One main plot + small subproblem; no sprawling lore; balanced dialogue/narration |

No universal anatomical count forced on disabled characters; Character Bible defines intended anatomy. No demand that children solve unsafe situations alone.

## Interaction / parent participation (D)

0–11m: name/point/imitate, respond to looks/sounds, stop freely.
12–23m: invite gesture or one word; child may revisit any page.
24–35m: choose between two familiar options; caregiver models desired action.
36–59m: ask one optional prediction/feeling question, support rather than quiz.
60–95m: invite retelling/why/how and a safe off-screen activity; independent literacy not assumed.

Use natural rhythmic narration, silence for response, avoid mandatory speed. Record caregiver cues separately from child text so they do not enter narration accidentally.

## Acceptance examples

A/B/C in examples/test-stories exercise the same blueprint contract at 8,20,48 months. Boundary tests later: 11→12,23→24,35→36,59→60,95→96; invalid/negative/unknown ages; no under-two child-facing video; personalized level != automatic hero. Overrides store reason/reviewer/profile; safety gates cannot be waived by a word-count override.

O: educator/native-editor evaluation, accessible-format guidance and expansion beyond8. No executable Age Engine created.
