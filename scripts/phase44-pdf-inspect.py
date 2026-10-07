"""Read-only synthetic PDF QA: dimensions/fonts and complete page render sheets."""
import json
import subprocess
import sys
from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageDraw

root = Path(sys.argv[1]).resolve()
if not root.name.startswith("hekayti-phase44-ui-"):
    raise ValueError("Only isolated synthetic evidence is in scope")
reports = []
for source in sorted(root.glob("synthetic-*.pdf")):
    reader = PdfReader(source)
    fonts = set()
    pages = []
    for page in reader.pages:
        resources = page.get("/Resources", {}).get_object()
        font_map = resources.get("/Font")
        for font in (font_map.get_object() if font_map else {}).values():
            font = font.get_object()
            descendant = (font.get("/DescendantFonts") or [font])[0].get_object()
            descriptor = descendant.get("/FontDescriptor")
            descriptor = descriptor.get_object() if descriptor else {}
            embedded = any(descriptor.get(key) for key in ("/FontFile", "/FontFile2", "/FontFile3"))
            fonts.add((str(font.get("/BaseFont")), embedded))
        pages.append({"widthMm": round(float(page.mediabox.width) * 25.4 / 72, 3), "heightMm": round(float(page.mediabox.height) * 25.4 / 72, 3), "textChars": len(page.extract_text())})
    prefix = root / source.stem
    subprocess.run(["pdftoppm", "-png", "-scale-to", "1100", str(source), str(prefix)], check=True, capture_output=True)
    renders = sorted(root.glob(source.stem + "-*.png"))
    assert len(renders) == len(pages)
    sheets = []
    for start in range(0, len(renders), 3):
        batch = renders[start:start + 3]
        canvas = Image.new("RGB", (1100 * len(batch), 1140), "white")
        draw = ImageDraw.Draw(canvas)
        for i, path in enumerate(batch):
            image = Image.open(path).convert("RGB")
            canvas.paste(image, (i * 1100, 40))
            draw.text((i * 1100 + 12, 12), f"{source.stem} / page {start + i + 1}", fill="black")
        sheet = root / f"qa-{source.stem}-{start + 1}.png"
        canvas.save(sheet)
        sheets.append(str(sheet))
    reports.append({"file": source.name, "pages": pages, "fonts": sorted(fonts), "visualSheets": sheets})
(root / "pdf-inspection.json").write_text(json.dumps(reports, indent=2), encoding="utf-8")
print(json.dumps(reports))
