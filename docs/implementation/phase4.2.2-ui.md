# Phase4.2.2 writer bridge UI handoff

Renderer-only integration preserves Arabic default, persisted English switch, RTL and story-language independence. Canonical schema/enum/character values and authored prompt/story text are not translated by the UI.

- Prepared packages show the exact pure `planGenerationInstructions(..., "GENERIC")` text in a readonly, direction-aware preview. No clipboard or provider action occurs during preview; a stale package asks for preparation rather than inventing current instructions.
- `writer-response/1.0` packages get a validate-without-saving action. Import first requests readonly PREVIEW and stops on FAIL; the service still revalidates during IMPORT. Legacy `plan-response/1.0` imports retain their existing path.
- Feedback stays near the response textarea. Safe localized reasons include edition/page/speaker when supplied, with original codes expandable and LTR. Backend message/exception stacks are never rendered here. REVIEW is not human approval; preview discloses that nothing was saved. Text edits invalidate displayed preview feedback.
- PREPARE, ChatGPT/Gemini COPY and successful IMPORT use the owner's exact Arabic success wording. StoryPlan1.2 category intent is visible alongside existing objective/situation detail; original category/signature/story-needs values remain unchanged.

Focused command: `node --import tsx --test tests/app/phase422-writer-ui.test.ts` — 8/8 PASS. Covers Arabic/English reasons and locations, code/stack boundaries, action wording, readonly unchanged prompt text and stale preview. One initial test assertion was adjusted for React SSR's `readOnly` attribute casing; no product failure was found.

These are presentation/SSR checks, not interactive desktop or literary certification. Integrated typecheck, actual Arabic/English preview/import workflow, failed-import database immutability, restart and packaged checks remain pending the coordinated final gate. No build, full suite, provider call, owner database or release/cloud operation was performed for this handoff.

Final smoke selectors must expect action-specific planner statuses (`Prompt prepared.`, `ChatGPT prompt copied.`, `Gemini prompt copied.`, `Draft imported successfully.`), rather than the older generic saved/copied message. Keep fresh Arabic-default acceptance separate from explicitly English legacy harnesses.

QA M4 fix: actual `PLANNER_STALE` and `PLANNER_CONFLICT` service codes now explain source changes and instruct reloading the story/planner, preparing and copying the current package before retrying. Raw service messages remain hidden; technical codes stay expandable and LTR. Focused UI tests now cover both codes in Arabic and English; the unchanged independent QA stale/CAS assertion is included in the targeted rerun.

QA M2 presentation: `WRITER_REVIEW_LANGUAGE_REGISTER` has a specific Arabic/English explanation to review wording against the requested edition's register, rather than generic human-review advice. Supplied edition/page coordinates remain exact and visible. Backend location derivation remains Engineering-owned. Own UI suite: 10/10 PASS; unchanged independent QA M4 assertion: 1/1 PASS.
