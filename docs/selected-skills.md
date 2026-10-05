# Selected skills for Hekayti
Verified against the complete inventory on 2026-10-05: 85 files, 64 session-visible skills, 20 enabled plugins. See SKILLS_INVENTORY.md and skills-inventory.json for exact paths, versions and hashes. No reinstall or plugin mutation performed.

## Applied in Phase 1

| Skill / provenance | Contribution | Limits / deliberate adaptation |
|---|---|---|
| story-skills:research / 0.21.0 | Question-led primary-source research, confidence, source ledger, human-review risks | No story.md exists; use research docs rather than initialize an unrelated CLI story project |
| children-story-creator / lensetek pinned snapshot | Read-aloud rhythm, repetition, simple page-level action | Its age labels are craft defaults, not evidence; not applied to infants, not used to assume 3–5-year-olds read independently |
| picture-book-generator / pinned snapshot | Text–image contract, page/prop/character anchors, one-page repair, approval-first flow | Paper-cut overrides watercolor/Chinese/pinyin defaults; no images generated; plot requirement exempt for infant concept books |
| story-skills:character-management / 0.21.0 | Stable IDs, opening state and explicit progression, references | No adult fatal-flaw/death framework forced on children's character bibles; no CLI required |
| story-skills:adaptation / 0.21.0 | Source-to-adaptation traceability, stable page IDs, term base and separate language wording | Shared meaning model rather than unrelated story folders; 32 pages/14 spreads not mandatory; caregiver assistance allowed |
| story-skills:publishing / 0.21.0 | Printer profiles, font embedding, actual PDF page count, physical proof | Egypt market, no automatic KDP/US legal assumptions; no publishing upload or vendor chosen |
| google-drive:google-drive / 0.1.16 | Independent disaster package upload/readback | Only project-source backup; never a customer publication or private-data backup |

Read full SKILL.md files and relevant research-practice, picture-book, translation, print-interior, story-structure, character-continuity, visual-styles and qa-checklist references. Selected guidance shaped this specification; repository facts/user scope override upstream defaults. Skill availability is not app/provider availability.

## Later task-specific routing (not executed in this phase)

| Workflow | Preferred owner / optional reviewer | Why |
|---|---|---|
| Concept / plot | premise-workshop; plot-structure or plot-narrative-architect when genuinely useful | One age-sized goal, avoid novel structure for infant books |
| Age adaptation / children's text | children-story-creator + researched Age Engine | Concrete wording, shared reading; expert review still needed |
| Editing / language voice | line-editing or prose-dialogue-polisher; voice-style | Native register/read-aloud consistency, not literal dialect substitutions |
| Continuity / QA | revision-continuity or plot-hole-continuity-checker | Page states, causality, props; child-safe exceptions |
| Character / reference approval | character-management + picture-book-generator | Visual locks and explicit changes; no face identification |
| Illustrations | picture-book-generator + imagegen when images actually requested | Reference-led generation and page-local repairs |
| Layout / export | pdf; documents if DOCX needed; publishing | Render and visual QA; provider specifications |
| Simulated reader feedback | reader-panel or beta-reader-critique-simulator | Advisory pre-review only; not real child testing |

No fiction-market-trend-analyst: this is developmental/system research, not bestseller research. No comic, Wattpad, Braille transcription, pet, slide or website tools in the default workflow. Accessible editions remain a future specialist task, never promised automatic Braille correctness. Do not auto-run update managers, missing upstream helpers or all skills at once.
