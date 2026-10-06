# Manual real-story trial readiness

The prepared kit is [examples/story-planner/manual-trials](../../examples/story-planner/manual-trials/README.md). Eight synthetic cases cover infant recognition/bedtime, toddler routine/education, two-year turn-taking, preschool sharing/adventure and older simple education across MSA/Egyptian Arabic. Each has a request, plan, logic QA, Blueprint, both copy-ready provider packages and a blank evaluation. No provider has been called or compared.

Run `node --import tsx scripts/generate-story-planner-trials.ts` for deterministic regeneration. All static trial packages are visibly unreviewed templates: no operational plan acceptance, text approval, ratings or fake model results are created. Inspect the package before manually pasting it into ChatGPT/Gemini. Save synthetic results in an ignored temp/results location. Run the read-only checker:

`node --import tsx scripts/evaluate-story-planner-trial.ts 06-preschool-msa-sharing temp/results/chatgpt.json`

The checker reports declared structure/schema/Blueprint/age/language advisories, with full-prose/native limits. Complete the blank evaluation and provider comparison based on actual returned prose and human review.

Static trial outputs are evaluated against their static Blueprint/request IDs and do not replay into live workflows. To import in the application, create/reopen the synthetic request, plan with current sources, review/accept it, prepare its live package and manually regenerate prose using that package's exact live IDs/hash. Paste that response in Story Planner, then run existing QA and human text approval. The live workflow rejects cross-request/static IDs. The kit's separate checker provides immediate portable external trials without fabricated acceptance authority.

No API key, browser automation or service account is required by Hekayti. Actual provider/model/version/date, editing effort and human findings remain manual. Literary quality, native language, cultural/qualified developmental quality, real child appeal and provider preference are unvalidated.
