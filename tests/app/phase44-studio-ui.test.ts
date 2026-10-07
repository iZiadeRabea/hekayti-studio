import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookPageCss } from "@hekayti/export/book";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UiLanguageProvider } from "../../apps/desktop/renderer/src/UiLanguage";
import { BookPageCanvas } from "../../apps/desktop/renderer/src/BookPageCanvas";
import { canvasLayers } from "../../apps/desktop/renderer/src/BookComposer";
import { BookCreateFlow } from "../../apps/desktop/renderer/src/BookCreateFlow";
import type { SimpleDefaults } from "@hekayti/contracts/creator";
import {
  constrainCanvasRect,
  movePathStep,
} from "../../apps/desktop/renderer/src/studio-ui";
import type { PageLayout } from "@hekayti/contracts/book";

test("live page-number fit uses the same line height as trusted PDF rendering", () => {
  const liveCss = readFileSync("apps/desktop/renderer/src/style.css", "utf8");
  const live =
    /\.book-text-layer\.page-number\s*\{[^}]*line-height:\s*([\d.]+)/.exec(
      liveCss,
    )?.[1];
  const print = /\.book-box\.PAGE_NUMBER\{[^}]*line-height:([\d.]+)/.exec(
    bookPageCss,
  )?.[1];
  assert.ok(live);
  assert.equal(live, print);
});

test("creator custom path reorders without replacing or mutating its Arabic intent", () => {
  const source = [
    "تولين تشوف اللعبة تحت القماشة.",
    "تولين تقرب.",
    "تولين ترفع القماشة.",
    "تولين تحضنها.",
  ];
  const moved = movePathStep(source, 2, -1);
  assert.deepEqual(moved, [source[0], source[2], source[1], source[3]]);
  assert.equal(source[1], "تولين تقرب.");
  assert.equal(movePathStep(source, 0, -1), source);
});
test("canvas movement and resize are bounded within the requested safe region", () => {
  const constrained = constrainCanvasRect(
    { x: -0.2, y: 0.98, width: 0.5, height: 0.8 },
    0.06,
  );
  assert.equal(constrained.x, 0.06);
  assert.ok(constrained.y + constrained.height <= 0.94);
  const oversized = constrainCanvasRect(
    { x: 1, y: 1, width: 4, height: 4 },
    0.08,
  );
  assert.ok(oversized.x + oversized.width <= 0.92);
  assert.ok(oversized.y + oversized.height <= 0.92);
});
const page: PageLayout = {
  pageId: "page-two-speakers",
  pageNumber: 1,
  imageId: "synthetic-art",
  anchors: [
    { speakerId: "نور", x: 0.1, y: 0.5 },
    { speakerId: "سلمى", x: 0.9, y: 0.5 },
  ],
  boxes: [
    {
      boxId: "narration",
      kind: "NARRATION",
      sourceIndex: 0,
      x: 0.1,
      y: 0.75,
      width: 0.8,
      height: 0.15,
      fontPt: 24,
      style: "PAPER",
      tail: "NONE",
      text: "نور وسلمى بيلعبوا سوا.",
    },
    {
      boxId: "bubble-nour",
      kind: "DIALOGUE",
      sourceIndex: 0,
      speakerId: "نور",
      x: 0.2,
      y: 0.2,
      width: 0.3,
      height: 0.2,
      fontPt: 20,
      style: "BUBBLE",
      tail: "ANCHOR",
      text: "اتفضلي يا سلمى.",
    },
    {
      boxId: "bubble-salma",
      kind: "DIALOGUE",
      sourceIndex: 1,
      speakerId: "سلمى",
      x: 0.5,
      y: 0.2,
      width: 0.3,
      height: 0.2,
      fontPt: 20,
      style: "BUBBLE",
      tail: "ANCHOR",
      text: "شكرًا يا نور.",
    },
  ],
};
test("two speaker bubbles retain exact canonical source indices and speaker IDs", () => {
  const layers = canvasLayers(page, { نور: "نور", سلمى: "سلمى" });
  assert.equal(layers[1]!.speakerId, "نور");
  assert.equal(layers[1]!.text, "اتفضلي يا سلمى.");
  assert.equal(layers[2]!.speakerId, "سلمى");
  assert.equal(layers[2]!.text, "شكرًا يا نور.");
  assert.equal(layers[1]!.tail, "left");
  assert.equal(layers[2]!.tail, "right");
  assert.equal(page.boxes[1]!.sourceIndex, 0);
});
test("page canvas renders Arabic as live wrapping text with separate bound bubble layers", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      UiLanguageProvider,
      null,
      React.createElement(BookPageCanvas, {
        layers: canvasLayers(page, { نور: "نور", سلمى: "سلمى" }),
        aspectRatio: 1,
      }),
    ),
  );
  assert.match(html, /data-speaker-id="نور"/);
  assert.match(html, /data-speaker-id="سلمى"/);
  assert.match(html, /dir="auto"/);
  assert.match(html, /اتفضلي يا سلمى/);
  assert.match(html, /شكرًا يا نور/);
  assert.match(html, /book-layer-text/);
  assert.match(html, /cqw/);
  assert.doesNotMatch(html, /&lt;svg/);
});
test("new book starts with visible exact months and progressively disclosed authoring controls", () => {
  const simple: SimpleDefaults = {
    agePresets: [
      {
        key: "THREE_FIVE",
        ageMonths: 42,
        label: {
          "ar-EG": "٣–٥ سنوات",
          "ar-MSA-simple": "٣–٥ سنوات",
          en: "3–5 years",
        },
        note: { "ar-EG": "", "ar-MSA-simple": "", en: "" },
      },
    ],
    goalPresets: [],
    defaults: {},
    library: {
      recordVersion: 0,
      total: 791,
      promoted: 0,
      provisional: 791,
      needsInitialization: false,
    },
  };
  const html = renderToStaticMarkup(
    React.createElement(
      UiLanguageProvider,
      null,
      React.createElement(BookCreateFlow, {
        simple,
        choices: null,
        busy: false,
        onChoices: () => {},
        onCreate: () => {},
      }),
    ),
  );
  assert.match(html, /العمر بالشهور/);
  assert.match(html, /type="number"/);
  assert.doesNotMatch(html, /textarea/);
  assert.doesNotMatch(html, /type="checkbox"/);
  assert.doesNotMatch(html, /PlanningRequest|Story DNA|UUID/);
});
