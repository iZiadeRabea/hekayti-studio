# Printed Book pipeline
Approved blueprint/text → PagePlan → approved character/art → LayoutProfile → layout preview → PDF render → preflight → human full-book review → physical proof → release. Printed output not produced in Phase1.

## Required production checks

Cover, title/credits/copyright, ordered story pages, optional caregiver page. ISBN/imprint/legal-deposit/credits only actual owner-supplied applicable values, never invented. Printer requirements recorded per profile, no KDP/vendor selection by default.

Separate cover-wrap geometry uses final page count, stock/binding and provider template; no arbitrary spine formula. Arabic right-bound front/back placement must be explicitly approved. Infant board books and accessible bindings require supplier material/safety evaluation separate from storytelling design.

Use licensed Arabic fonts with tested shaping/embedded marks. Candidate Noto Sans Arabic or a suitably licensed Arabic book face; obtain exact font release/licence before embedding. No font downloads/installation during design. Images must meet effective resolution at actual size, profile bleed/safe zones and gutter. RGB source masters retained; conversion to provider-required colour/ICC done in export adapter, not vague “CMYK is always best.”

Candidate HTML/CSS Chromium renderer needs Arabic/geometry test. It is NOT automatically PDF/X-compliant; add compatible prepress route when printer requires PDF/X/colour management. [Playwright PDF API](https://playwright.dev/docs/api/class-page#page-pdf). Provider-specific output standard remains open.

## Approval / version

Preflight page count, dimensions, font embedding, no missing/repeated pages, crop, text overflow, transparent layers, colour shifts, Arabic and mixed text, cover wrap and metadata. Render every page for visual check; full low-density books cannot rely on a random sample. Printed proof mandatory before selling that binding/profile; reproof after material/profile changes.

Record Export ID, canonical/language/art/layout versions, actual dimensions/pages/fonts/check results, hash and proof approval. Do not hand-edit final PDF as source of truth; revise source/profile and rebuild. Old export preserved, delivery pointer changed explicitly. Customer/person data in final exports private, outside Git/source recovery packages.
