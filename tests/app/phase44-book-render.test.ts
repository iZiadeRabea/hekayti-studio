import { test } from "node:test";
import assert from "node:assert/strict";
import type { BookLayout } from "@hekayti/contracts/book";
import {
  bookArtworkGeometry,
  bookPageMarkup,
  bookHtml,
  bookPageCss,
} from "@hekayti/export/book";
const layout: BookLayout = {
  revisionId: "layout",
  draftId: "draft",
  mode: "ar-EG",
  title: "تولين",
  subtitle: "",
  brand: "",
  font: "Noto Sans Arabic",
  createdAt: "now",
  settings: {
    preset: "SQUARE",
    widthMm: 200,
    heightMm: 200,
    safeMm: 10,
    gutterMm: 0,
    bleedMm: 3,
    pageNumbers: false,
  },
  pages: [
    {
      pageId: "cover",
      pageNumber: 0,
      imageId: "cover-image",
      anchors: [],
      boxes: [
        {
          boxId: "title",
          kind: "TITLE",
          sourceIndex: 0,
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.2,
          fontPt: 30,
          style: "PAPER",
          tail: "NONE",
          text: "تولين",
        },
      ],
    },
    {
      pageId: "page",
      pageNumber: 1,
      imageId: "page-image",
      anchors: [],
      boxes: [
        {
          boxId: "narration",
          kind: "NARRATION",
          sourceIndex: 0,
          x: 0.1,
          y: 0.1,
          width: 0.8,
          height: 0.3,
          fontPt: 26,
          style: "PAPER",
          tail: "NONE",
          text: "تولين تشوف حاجة ناعمة.",
        },
      ],
    },
  ],
};
const image = "data:image/png;base64,YQ==";
test("real artwork fills print bleed and digital clips the identical trim composition", () => {
  const print = bookArtworkGeometry(layout.settings, "print"),
    digital = bookArtworkGeometry(layout.settings, "digital");
  assert.deepEqual(print, { xMm: 0, yMm: 0, widthMm: 206, heightMm: 206 });
  assert.deepEqual(digital, { xMm: -3, yMm: -3, widthMm: 206, heightMm: 206 });
  assert.equal(print.xMm - layout.settings.bleedMm, digital.xMm);
  assert.equal(print.yMm - layout.settings.bleedMm, digital.yMm);
  const html = bookPageMarkup(layout, layout.pages[1]!, image, "print");
  assert.ok(
    html.indexOf('class="book-art"') < html.indexOf('class="book-trim"'),
  );
  assert.match(html, /left:0mm;top:0mm;width:206mm;height:206mm/);
  assert.match(bookPageCss, /object-fit:cover/);
  assert.match(
    bookPageMarkup(layout, layout.pages[1]!, image, "digital"),
    /left:-3mm;top:-3mm;width:206mm;height:206mm/,
  );
});
test("print and digital retain safe live text while rejecting remote artwork", () => {
  for (const kind of ["print", "digital"] as const) {
    const html = bookHtml(
      layout,
      kind,
      { arabic: "YQ==", latin: "Yg==" },
      { "cover-image": image, "page-image": image },
    );
    assert.match(html, /font-src data:/);
    assert.match(html, /dir="rtl"/);
    assert.match(
      html,
      /left:20mm;top:20mm;width:160mm;height:60mm;font-size:26pt/,
    );
  }
  assert.throws(
    () =>
      bookPageMarkup(layout, layout.pages[1]!, "file:///private.png", "print"),
    /verified local/,
  );
});
