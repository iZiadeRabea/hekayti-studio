import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { deflateSync } from "node:zlib";
import { bookHtml, measureBookScript } from "../packages/export/src/book.ts";
import {
  deriveVisualIntent,
  planComposition,
  compositionBoxes,
} from "../packages/core/src/book-composition.ts";
const root = await mkdtemp(join(tmpdir(), "hekayti-phase44-ui-441-render-"));
const settings = {
  preset: "SQUARE",
  widthMm: 200,
  heightMm: 200,
  safeMm: 12,
  gutterMm: 0,
  bleedMm: 3,
  pageNumbers: false,
};
const textCases = [
  ["نور قعد جنب الكتاب المفتوح.", []],
  ["", [{ speakerId: "noor", text: "بصي على الصورة يا ماما." }]],
  [
    "",
    [
      { speakerId: "noor", text: "دي صورة جديدة." },
      { speakerId: "mother", text: "شايف فيها إيه؟" },
    ],
  ],
  ["نور قرب الكتاب بهدوء.", [{ speakerId: "noor", text: "بصي، الدبدوب هنا." }]],
  ["", [{ speakerId: "noor", text: "أنا شايف صورة لطيفة جنب الكتاب." }]],
  [
    "الكلام في مساحة هادئة، والفعل المهم واضح.",
    [{ speakerId: "noor", text: "نقلب الصفحة سوا؟" }],
  ],
];
function png() {
  const size = 1000,
    raw = Buffer.alloc((1 + size * 3) * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let c = [240, 226, 204];
      if (y > 630) c = [186, 204, 211];
      if (y > 720 && y < 860 && x > 300 && x < 720) c = [252, 244, 221];
      if ((x - 760) ** 2 + (y - 720) ** 2 < 100 ** 2) c = [164, 118, 72];
      if (y > 760 && y < 825 && x > 360 && x < 670) c = [122, 142, 160];
      if ((x - 750) ** 2 + (y - 610) ** 2 < 65 ** 2) c = [222, 183, 153];
      const o = y * (1 + size * 3) + 1 + x * 3;
      c.forEach((n, i) => (raw[o + i] = n));
    }
  const crc = (b) => {
    let c = 0xffffffff;
    for (const v of b) {
      c ^= v;
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, b) => {
    const t = Buffer.from(type),
      l = Buffer.alloc(4),
      c = Buffer.alloc(4);
    l.writeUInt32BE(b.length);
    c.writeUInt32BE(crc(Buffer.concat([t, b])));
    return Buffer.concat([l, t, b, c]);
  };
  const h = Buffer.alloc(13);
  h.writeUInt32BE(size);
  h.writeUInt32BE(size, 4);
  h[8] = 8;
  h[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", h),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
let next = 0;
const pages = textCases.map(([narration, dialogue], i) => {
  const page = { pageId: `case-${i + 1}`, narration, dialogue, altText: "" };
  const visual = deriveVisualIntent(page, i + 1, "draft", "story");
  const preliminary = planComposition({
    page,
    visual,
    settings,
    revisionId: `c-${i}`,
    mode: "ar-EG",
    createdAt: "now",
    imageId: `image-${i}`,
  });
  const plan = planComposition({
    page,
    visual,
    settings,
    revisionId: `c-${i}`,
    mode: "ar-EG",
    createdAt: "now",
    imageId: `image-${i}`,
    prior: {
      ...preliminary,
      anchors: dialogue.map((d, j) => ({
        speakerId: d.speakerId,
        x: j ? 0.25 : 0.75,
        y: 0.62,
      })),
      protectedRegions: [{ x: 0.33, y: 0.7, width: 0.36, height: 0.15 }],
    },
  });
  const boxes = compositionBoxes(plan, page, () => `box-${++next}`);
  if (i === 4) boxes.forEach((b) => (b.bubbleShape = "CLOUD"));
  return {
    pageId: page.pageId,
    pageNumber: i + 1,
    imageId: `image-${i}`,
    anchors: plan.anchors,
    boxes,
    protectedRegions: plan.protectedRegions,
  };
});
const layout = {
  revisionId: "native-layout",
  draftId: "draft",
  mode: "ar-EG",
  title: "اختبار تركيب الكلام",
  subtitle: "",
  brand: "",
  settings,
  pages,
  font: "Noto Sans Arabic",
  createdAt: "now",
};
const fonts = {};
for (const subset of ["arabic", "latin"])
  fonts[subset] = (
    await readFile(
      resolve(
        `node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-${subset}-400-normal.woff2`,
      ),
    )
  ).toString("base64");
const art = "data:image/png;base64," + png().toString("base64");
const images = Object.fromEntries(pages.map((p) => [p.imageId, art]));
for (const kind of ["digital", "print"])
  await writeFile(
    join(root, `synthetic-composition-${kind}.html`),
    bookHtml(layout, kind, fonts, images),
  );
await writeFile(
  join(root, "render-input.json"),
  JSON.stringify({ measure: measureBookScript }),
);
const executable = resolve("node_modules/electron/dist/electron.exe");
const child = spawn(
  executable,
  [resolve("scripts/phase441-render-window.cjs"), root],
  { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
);
let stderr = "";
child.stderr.on("data", (b) => (stderr += b));
const exit = await new Promise((r) => child.on("exit", r));
if (exit !== 0) throw Error(stderr);
console.log(
  JSON.stringify({
    root,
    results: JSON.parse(
      await readFile(join(root, "native-render-results.json"), "utf8"),
    ),
  }),
);
