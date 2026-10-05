"""Read-only synthetic proof checks; not a production prepress/PDF-X validator."""
import json
import sys
from hashlib import sha256
from pathlib import Path
from pypdf import PdfReader

reports = []
for argument, expected_mm in zip(sys.argv[1:], [206, 200], strict=True):
    path = Path(argument)
    reader = PdfReader(path)
    assert len(reader.pages) == 6 and not reader.is_encrypted
    fonts = {}
    dimensions = []
    for page in reader.pages:
        size = [float(page.mediabox.width) * 25.4 / 72, float(page.mediabox.height) * 25.4 / 72]
        assert all(abs(value - expected_mm) < 0.1 for value in size), size
        dimensions.append(size)
        assert page.extract_text().strip(), "Missing selectable text"
        for ref in page['/Resources'].get('/Font', {}).values():
            font = ref.get_object()
            name = str(font['/BaseFont'])
            assert 'NotoSansArabic' in name, f"Unexpected fallback: {name}"
            descendant = font.get('/DescendantFonts', [ref])[0].get_object()
            descriptor = descendant['/FontDescriptor'].get_object()
            assert any(key in descriptor for key in ('/FontFile', '/FontFile2', '/FontFile3'))
            fonts[name] = 'EMBEDDED'
    reports.append(dict(file=path.name, bytes=path.stat().st_size, sha256=sha256(path.read_bytes()).hexdigest(), pages=6, dimensions_mm=dimensions, fonts=fonts, structure='PASS', visual_qa='SEPARATE - render every page'))
print(json.dumps(reports, ensure_ascii=False, indent=2))
