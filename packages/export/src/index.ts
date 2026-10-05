import type { StoryBlueprint, LanguageMode } from "@hekayti/contracts";
import { languageInfo } from "@hekayti/contracts";
import { contentHash } from "@hekayti/core";

export interface PdfProofProfile {
  id: "phase2-print" | "phase2-digital";
  trimMm: 200;
  bleedMm: 0 | 3;
  safeMm: 10;
  pageMm: 200 | 206;
  productionReady: false;
}
export const profiles: Record<"print" | "digital", PdfProofProfile> = {
  print: {
    id: "phase2-print",
    trimMm: 200,
    bleedMm: 3,
    safeMm: 10,
    pageMm: 206,
    productionReady: false,
  },
  digital: {
    id: "phase2-digital",
    trimMm: 200,
    bleedMm: 0,
    safeMm: 10,
    pageMm: 200,
    productionReady: false,
  },
};
export const rtlSamples = {
  msa: "قَالَ نُنّو: «هَذِهِ كُرَةٌ حَمْرَاءُ». ثمّ ابتسم. هل نلعب معًا؟",
  egyptian: "بصّ هنا! دي سلّة اللعب. يلا نجرّب تاني، واحدة واحدة.",
  english: "Look here! The ball is red. We can try again.",
  mixed: "قال ننّو: «عندي ١٢ كرة». الرمز A-12، والاسم Paper Cut. (رقم 12)؟",
};
function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function proofText(text: string): string {
  // Bidi markup only; never translate/substitute wording. Keep the known Latin phrase together.
  return escape(text)
    .replaceAll("A-12", '<bdi dir="ltr">A-12</bdi>')
    .replaceAll(
      "Paper Cut",
      '<bdi dir="ltr" class="latin-phrase">Paper Cut</bdi>',
    );
}
export function proofPages(blueprints: readonly StoryBlueprint[]) {
  return [
    {
      id: "cover",
      mode: "ar-MSA-simple" as LanguageMode,
      title: "حكايتي - تجربة عربية",
      text: rtlSamples.msa,
    },
    ...blueprints.map((b) => ({
      id: b.storyId,
      mode: b.primaryLanguageMode,
      title: b.workingTitle,
      text: b.languageVersions[0]!.pages[0]!.narration,
    })),
    {
      id: "egyptian-mixed",
      mode: "ar-EG" as LanguageMode,
      title: "العامية والأرقام",
      text: rtlSamples.egyptian + "\n" + rtlSamples.mixed,
    },
    {
      id: "english",
      mode: "en" as LanguageMode,
      title: "English LTR proof",
      text: rtlSamples.english,
    },
  ];
}
export async function proofMetadata(
  blueprints: readonly StoryBlueprint[],
  kind: "print" | "digital",
) {
  return {
    schemaVersion: "export-proof/1.0",
    profile: profiles[kind],
    pageIds: proofPages(blueprints).map((p) => p.id),
    sourceRevisions: blueprints.map((b) => b.revisionId),
    sourceHash: await contentHash(blueprints),
    layoutVersion: "phase2-proof/1.0",
    font: "Noto Sans Arabic Fontsource 5.3.0 / OFL-1.1",
    syntheticOnly: true,
  };
}
export function proofHtml(
  blueprints: readonly StoryBlueprint[],
  kind: "print" | "digital",
  fonts: { arabic: string; latin: string },
): string {
  const profile = profiles[kind];
  const page = profile.pageMm;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>Hekayti Phase 2 ${kind} synthetic proof</title><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:"><style>
  @font-face{font-family:NotoProof;src:url(data:font/woff2;base64,${fonts.arabic}) format('woff2');font-weight:400}
  @font-face{font-family:NotoProof;src:url(data:font/woff2;base64,${fonts.latin}) format('woff2');font-weight:400;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
  @page{size:${page}mm ${page}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;font-family:NotoProof,sans-serif;font-weight:400}
  .page{position:relative;width:${page}mm;height:${page}mm;break-after:page;overflow:hidden;background:#fff9ed;padding:${profile.safeMm + profile.bleedMm}mm}
  .page:last-child{break-after:auto}.trim{position:absolute;inset:${profile.bleedMm}mm;border:${kind === "print" ? "0.3mm dashed #888" : "0"};pointer-events:none}
  .safe{position:absolute;inset:${profile.safeMm + profile.bleedMm}mm;border:${kind === "print" ? "0.2mm dotted #b4c0c0" : "0"};pointer-events:none}.latin-phrase{white-space:nowrap}h1{font-size:22pt;line-height:1.8;font-weight:400;margin:0 0 7mm;text-align:start}
  .art{height:45mm;background:#c4e5e4;border-radius:8mm;display:flex;align-items:center;justify-content:center;gap:9mm}.ball{width:36mm;height:36mm;background:#e57965;border-radius:50%;box-shadow:2mm 2mm #80aaaa}.leaf{width:27mm;height:39mm;background:#86b892;border-radius:70% 20%;transform:rotate(15deg);box-shadow:2mm 2mm #80aaaa}
  .text{font-size:24pt;line-height:2;padding-block:2mm;white-space:pre-wrap;margin-top:6mm;text-align:start;unicode-bidi:plaintext}.footer{position:absolute;bottom:8mm;left:12mm;right:12mm;font-size:9pt;text-align:center;color:#444}
  </style></head><body>${proofPages(blueprints)
    .map(
      (p, i) =>
        `<section class="page" lang="${languageInfo[p.mode].lang}" dir="${languageInfo[p.mode].dir}"><div class="trim"></div><div class="safe"></div><h1>${escape(p.title)}</h1><div class="art" aria-label="Synthetic illustration placeholder"><div class="ball"></div><div class="leaf"></div></div><div class="text">${proofText(p.text)}</div><div class="footer" dir="ltr">${i + 1} / ${proofPages(blueprints).length} | ${profile.id} | synthetic feasibility only</div></section>`,
    )
    .join("")}</body></html>`;
}
