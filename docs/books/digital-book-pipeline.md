# Digital Book pipeline
Same approved blueprint/PagePlan/edition/assets as print; separate DigitalProfile, never a separately generated story.

V1 output: lightweight readable PDF, matching approved language edition. Remove print bleed/crop marks; usable page size and logical order, embedded licensed fonts, selectable Unicode text, bookmarks/matter links where useful, descriptive document title/lang and character-safe file name. Add alt text/accessibility semantics where renderer supports them and explicitly report limitations; do not claim PDF/UA compliance without verification.

Compress illustrations for screen use from approved masters; never replace print masters with compressed files. Provisional file-size target 5–20MB for a small picture book, D/hardware-dependent; optimize without unreadable marks. Target mobile/tablet readability at100%, Arabic shaping and mixed text, bookmarks and full page sequence tested on at least two actual readers. No current output claims.

Accessible HTML/EPUB3/interactive read-along later, with separate reading-system/accessibility QA. Do not force dual/trilingual crowded page layouts in first version. Parent-only infant digital file is a caregiver reading aid; age/screen eligibility warning carried in order and delivery notes.

Digital Export provenance hashes original blueprint/LanguageVersion, PagePlan, assets, profile and font versions. Corrections rebuild and revoke previous “current” pointer while retaining audit history. Delivery is manual by owner; no public hosting, customer accounts or tracking pixels in V1.
