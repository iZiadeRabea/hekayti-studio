# Phase4.3 validation evidence

Candidate0.6.0, baseline c52922d; stable main ad581cbc/v0.5.4 untouched. Local evidence is ignored under `temp/phase43-validation` and `temp/phase43-ui`. Release/cloud recovery remains pending approval.

## One consolidated run

`pwsh scripts/test.ps1` → `consolidated-test.log`: foundation100 PASS, design329 PASS, typecheck PASS; application **337/342 PASS, five FAIL, zero SKIP**,158.66s. No optional broad repeat. Five old migration fixtures incorrectly retained v4 creator tables when claiming v1/v2, or asserted the obsolete current version3. Same independent QA maintained genuine historical preconditions/version boundaries without production changes or weakening original bytes/hash/rollback assertions. Affected three files **51/51 PASS**,6.46s; QA report records commands and countercases. This is not a claim that the original invocation passed.

Native discovery: Simple writer advisory list expanded to ~19000px. Narrow Simple-only grouping now retains precise errors/all original locators, reason/count/page summaries and always-visible HIGH/BLOCKER; Advanced behavior unchanged. Reader canonical page-index locators are mapped only by exact known schema pattern, safe integer/bounds/edition. Same QA latest UI18/18 PASS plus seven direct bounded countercases; prior Simple17+legacywriter10=27/27. These are targeted follow-ups, not another consolidated total.

## Build/package and actual Windows

`node scripts/build.mjs`, unsigned Windows electron-builder config `apps/desktop/electron-builder.phase2.json` (see existing package script) PASS. Necessary rebuild/package after the native UX fixes recorded in `build-writer-grouping-retry.log`, `build-reader-location-retry.log`, `package-ui-fix-retry.log`; final executable contains final UI0.6.0. Unsigned, SQLite experimental and Vite >500KB chunk warnings remain.

`node scripts/phase43-ui-smoke.mjs` and `--packaged`: PASS, respectively `run-t9oqBJ` / `run-W8fSqX`, each14 screenshots+evidence.json. Fresh Arabic/RTL/Simple, explicit empty Library791 initialization, exact42/place/customgoal/constraint storage, no visible English/IDs in human plan, no hidden acceptance/package, both manual copy paths, malformed readonly preview, reversed editions valid import/no approval,12page EG/MSA Reader/all-pages, actual retained two-draft comparison, NEEDS_EDIT/noapproval, local language/mode preferences and exact authored reopen after actual process restart. Illustrations: fictional references+cover+12page prompts, paper-cut default, edited style stale blocks copy/generate, historical A/current PREPARE B exact source/edition/immutable heading. No provider/image calls.

`node scripts/phase43-review-visual-smoke.mjs <isolated PASS directory> [--packaged]`: both PASS, review-visual-evidence.json+three additional screenshots each. Actual reviewed reference/cover clipboard path contains paper-cut and no-text-even-cover rules. Explicit synthetic LIKED/rating/notes produces canonical approval only then; not real human quality certification. Two harness retries corrected an English regex for an actual Arabic no-text rule and exact select-label matching; no source/QA changes.

Inspected actual packaged screenshots: Arabic first-time home/form/preview, MSA Reader, grouped20occurrences/10affectedpages and24/12, both real comparison columns, historical/currentBpage12 and immutable character references, reviewed cover copy and explicit synthetic approval. Normal narrative remains Arabic; product names allowed, IDs/technical prompt hidden in disclosures. SSR alone is not the visual evidence.

## Preserved regressions

All existing English harnesses explicitly select Advanced; fresh Simple/Arabic assertions remain separate. PASS dev+packaged: `scripts/desktop-smoke.mjs` (three projects, six-page print/digital/font/bundle/runtime), `phase3-ui-smoke.mjs`, `node --import tsx scripts/phase4-ui-smoke.mjs`, `phase41-ui-smoke.mjs` (independent empty creative restore791/replay/reopen), `phase421-localization-smoke.mjs` (Arabic infant REPEAT/UI-storylanguage/restart), `phase42-ui-smoke.mjs --writer-live` (actual791/manualwriter/immutable history/explicitapproval/planner-derived creative projection excluding operational history). `ui-smoke.mjs` dev PASS (SQLite/RTL/security/no-clobber). Readonly `phase422-visual-smoke.mjs` against both isolated planner receipts PASS with unchanged canonical state. Logs named `desktop-*`, `phase3-*`, `phase4-*`, `library-*`, `localization-*`, `planner-writer-*`, `writer-visual-*` under validation directory.

Online `scripts/health-check.ps1` PASS0warnings; `scripts/security-check.ps1 -History` PASS. Mandatory checkpoint/source backup/fresh-restored-code tests are separate postapproval recovery proof; not performed or claimed here. Normal owner DB/settings/trials and unchanged public corpus untouched. All synthetic prose/approval fixtures remain ignored, excluded from production source/Library archives.
