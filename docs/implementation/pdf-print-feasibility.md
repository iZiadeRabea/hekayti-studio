# Synthetic PDF / print feasibility

Scope: six-page proof, not full Book Generator. Cover, A/B/C fixture page samples, Egyptian+mixed page, English page. Same canonical fixture inputs for print/digital; no independent story generation. Approved final synthetic PDFs stored under assets/feasibility/phase2, with deterministic metadata and source hashes. There is no real illustration/master image or commercial print approval.

Print: 200x200mm nominal trim, 3mm each-edge bleed, 206x206mm page; dashed trim/quiet safe outline for inspection. Digital: 200x200mm, no bleed or visible print guides. 10mm safe region, 24pt body, 2x line-height with 2mm ink padding. Latin phrase bdi/no-wrap prevents a mixed-language phrase splitting confusingly. Cover and parenthetical punctuation inspected. Placeholders are vector paper-cut shapes, not generated illustrations.

Electron/Chromium printToPDF with background/CSS page size, embedded licensed Arabic/Latin font subsets and tagged PDF. Source escape prevents generated text being executable HTML. Font readiness and actual text bounds checked before writing. Both outputs written into unique proof directory; previous exports retained on failure. Deterministic input/provenance metadata, NOT deterministic PDF bytes (Chromium timestamps/subsetting may vary).

Verification: six pages each, correct page order, selectable text, all fonts embedded, no Segoe/system fallback in final proof, pypdf readable structure, every page rendered using Poppler and inspected for Arabic shaping/marks/order/mixed text/margins/clipping. Actual MediaBox may round CSS mm by under 0.1mm; verification tolerance 0.1mm stated, not silently called exact. Actual values/hash in evidence JSON.

No production PDF/X, ICC/CMYK workflow, certified accessible PDF/UA, separate PDF TrimBox/BleedBox or bound cover wrap is implemented. Bleed is explicit prototype geometry/visible trim guide only. Printer specs, physical proof and infant-safe binding remain future requirements. Digital is a small feasibility PDF, not two-device commercial QA. Standard Arabic PDF text extraction may insert bidi direction marks; visual order checked separately.

To verify regenerated files: bundled or installed Python+pypdf `python scripts/verify-pdf.py <print.pdf> <digital.pdf>` then render BOTH full page sets with pdftoppm and inspect them. Unit tests alone cannot pass gate F.
