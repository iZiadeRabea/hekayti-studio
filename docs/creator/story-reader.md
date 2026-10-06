# Story Reader

Phase 4.3 integration is in progress; no completed visual gate is claimed here.

The Reader consumes `StoryReaderModel`, showing narration and dialogue with display names, never internal page or character identities. It supports page-by-page or whole-story reading, language selection and retained draft selection. Comparison uses `StoryCompareModel`'s actual aligned pages, without generated differences or invented quality judgments.

Provider provenance labeled `USER_REPORTED` is explicitly attributed to the creator, not treated as proof of provider origin. Older drafts are labeled historical. Reviews collect a choice, optional rating and exact notes; the service remains responsible for current-draft authority, QA and Library feedback. A like is not automatic publication or promotion.
