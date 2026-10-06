# Reusable story library

Phase 4 is an offline, synthetic owner-studio prototype. Library is reusable editorial data, not a catalogue of commercially certified books. Strict `library-record/1.0` supports IDEA_SEED, STORY_CONCEPT (the existing canonical concept), STORY_FAMILY (structure only), BUILDING_BLOCK (the existing component), and APPROVED_STORY_REFERENCE (exact retained workflow approval/report/hash).

Records carry immutable numbered revisions, source type CURATED/AI/HYBRID/HUMAN, operator-reported provider CHATGPT/GEMINI/OTHER/MANUAL and optional provider/model notes. Actual transport is separate: human-authored, manual-paste, synthetic-starter or approved-workflow. These notes never prove a model identity or quality. Tags support type/status/age/theme/objective/story type/source/provider filtering. A small explicitly added synthetic starter remains unreviewed until human actions.

The UI shows Inbox separately from promoted Library, with an all-records view including archived ideas. Selecting an approved workflow allows explicit concept/reference/component extraction. Family creation uses human-authored structural fields; there is no AI extraction or implicit approval. Six optional 1–5 scores (StoryQuality, AgeFit, LanguageQuality, Creativity, ObjectiveFit, ReusePotential) and notes are internal human editorial opinion, not science.

SQLite v3 adds the aggregate library, immutable generation packages and immutable manual imports transactionally to v2. Existing canonical project/blueprint/edition/character/workflow rows remain untouched. Repository CAS, append-only history and read/write validation reject incompatible/corrupt state without auto-repair. Usage counts come from explicit record/request events; repeated outcomes do not double-count. A package merely prepared but never used does not count as story usage. Context usage is logged atomically when a candidate is explicitly used.

Limits: bounded aggregate local storage, no search service or production scaling claim, no private child data, paid AI, service automation, image/video/photo/customer-site work. Human review, consent/retention decisions and production recovery remain separate gates.
