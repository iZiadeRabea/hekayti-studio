# Full Arabic experience

Phase 4.3 integration is in progress. Focused render checks do not substitute for the later actual desktop visual gate.

Simple mode uses typed Arabic/English UI labels. Arabic is the existing default. Story language remains independent from UI language: authored and generated story text are not translated by the renderer. Human planning text comes from the core's story-language projection. Input fields use automatic direction and preserve exact Arabic text rather than trimming or rewriting it.

Technical codes, revision identities, JSON and English illustration prompts belong in explicit disclosures with isolated left-to-right presentation. Normal form, preview and Reader content uses human-facing labels. Blocking notices stay visible; advisory detail can be expanded. Illustration summaries are supplied by the core, not assembled by mixing Arabic names with English action templates.

The isolated regression fixture includes the exact place `ملعب صغير في الحي جنب البيت`, constraints `عايز القصة خفيفة ومضحكة، من غير خوف، وتحصل في مكان مصري طبيعي.` and custom goal `يتعلم الطفل يستنى دوره ويلعب مع صاحبه.`.
