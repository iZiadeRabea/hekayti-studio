# Page Layout System
One PagePlan, edition-specific LayoutProfile and approved output variants; words never rasterized by image provider.

## Geometry / semantic roles

Profile: trimWidthMm/HeightMm; orientation; binding direction; bleed per edge; top/bottom/outer/inner safe zones; gutter; colour/output standard; effective PPI; typography; text region; numbering policy; page-role sequencing; provider version.

Provisional demo square trim 200×200mm, bleed3mm, safe inset10mm and larger inner margin if binding needs it; values D prototypes only, not selected printer specs. An illustration covering trim+bleed must cover 206×206mm in that example. Effective PPI = pixels ÷ physical inches at placement scale; around300PPI candidate. Full bleed then needs roughly2433px per side, round up to2434; do not claim 1024px becomes print quality by upscaling. Minimum depends on actual printer.

Roles: cover separate; title/credits/copyright; story; optional parent page; back matter; optional blank pages required by binding. Page count includes every printed side; cover treatment and endpapers depend on provider. Infant board-book binding/manufacturing needs different profile; standard paper proof is not infant-safe product certification.

## Placement / Arabic

Text remains selectable shaped Unicode, on dedicated quiet area/background panel; no face/action obscured, no text over texture that harms contrast. Separate text/illustration crop per page. Font size a prototype variable (e.g. 20–28pt Arabic adult-read), not research norm. Diacritics need line-height and clipping tests; never shrink to hide overflowing wording.

Arabic RTL paragraph and book opening/page progression; determine spread physical sides from right-bound profile, not Western recto defaults. Use reading-order array independent of x coordinate. English profile LTR; no blind image mirroring. Mixed strings tested with bidi isolation. Optional page numbers discrete, unobtrusive; infant concept books can omit.

## Constraints / variants

Trim, Bleed and safe rectangles explicit, image crop anchor, focal exclusion zones, maximum text block height; report overflow as FAIL with pageId. Prompt text-safe intent must survive actual crop. Single-page large-object, quiet-action, scene and echo layouts available; repeated style not repeated accidental art.

Print: provider-compatible geometry/colour and proof.
Digital: screen-readable size, no bleed/crop marks, compact licensed fonts/images, same ordered meanings.
Video: shot framing derivative, not a recycled low-res print page.

O: printer, binding/page increments, bleed/gutter, font candidate/licence, PDF standard/ICC. Freeze profiles only after preflight and physical proof; page/layout variants keep source revision hashes.
