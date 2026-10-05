# Arabic font feasibility

Development candidate: Noto Sans Arabic Regular 400, @fontsource/noto-sans-arabic 5.3.0, metadata upstream v33 (2025-09-17). Full SIL OFL 1.1 read before use; permits bundling/embedding with required attribution/licence. [Upstream](https://github.com/notofonts/arabic/blob/main/OFL.txt). Exact npm integrity in package-lock. No font binary committed; build takes licensed files from dependency and bundles dist/fonts/OFL.txt.

Windows Chromium 152.0.7977.130 / Electron 44.5.1 renders connected Arabic, hamza/shadda/tanwin, Arabic punctuation and Latin runs. Native UI selection/multiline editing manually inspected. This does not establish children's brand readability or literacy outcomes; native editorial/print-proof approval still required.

PDF inspection discovered automatic Segoe UI fallback ONLY for U+2026 ellipsis: the export Latin font range was too narrow. Fixed by using Fontsource's full Latin Unicode range including U+2000-206F. Required release verification: only embedded Noto font subsets in both final proofs; verify-pdf.py checks this. Earlier failing candidates remain under ignored temp and are not delivered.

Noto glyph ink exceeded the auto-height text box by 2px despite 2x line-height. Added 2mm vertical padding rather than removing marks/shrinking type. Layout overflow guard checks actual ink box and safe lower boundary. Every PDF page must still be rendered and inspected; font embedding alone is not visual QA.

Final commercial brand face, fully vocalized reading policy, weights and physical print quality remain undecided. OFL licence does not certify the application's security or printer compatibility. No local Windows font installed or Windows settings changed.
