# Manual Story Planner trials

Eight reproducible synthetic cases span 8–72 months, both Arabic registers, recognition, bedtime, everyday routines, education, sharing and supervised preschool adventure. Each folder has request.json, plan.json, logic-qa.json, blueprint.json, chatgpt-package.txt, gemini-package.txt and a blank evaluation.json. manifest.json contains exact reproducible hashes.

These are **unreviewed trial templates**, not operational acceptances, human approvals or provider results. No prose is supplied as a successful AI result. Every evaluation is NOT_RUN and the provider comparison is blank.

1. Inspect a case's plan, age guidance, sources and cultural adaptation. Record any changes before copying externally; generated plans use acknowledged provisional inspiration, not promoted canonical sources.
2. Copy the entire ChatGPT package into ChatGPT manually. Save its one JSON response in an ignored temp/private location using synthetic data only. Repeat independently with the Gemini package and unchanged fixed plan.
3. Run `node --import tsx scripts/evaluate-story-planner-trial.ts CASE_ID RESPONSE.json`. This read-only local checker validates declared anchors/schema/Blueprint/counts/register advisories; it never imports, approves or contacts a provider.
4. Compare actual prose page by page with the fixed plan. Complete evaluation.json in a separate ignored results location and the blank comparison form. Do not infer provider superiority from schema compliance.
5. For live application use, create/reopen the synthetic request, plan and accept it after review, prepare its current package, then copy that package and import its response in Story Creator. Static trial package IDs cannot replay authority into a live workflow.

Rebuild this kit with `node --import tsx scripts/generate-story-planner-trials.ts`. The generator does not touch an operational database, create approvals/ratings or call an AI service. The generated files are deterministic bulk artifacts. Manual results may differ between provider/model/version/date; record those details without claiming verified provider identity.
