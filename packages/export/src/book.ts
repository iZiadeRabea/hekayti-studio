import type {
  BookLayout,
  PageLayout,
  TextBox,
  AssetManifest,
} from "@hekayti/contracts/book";
import { AppError, languageInfo } from "@hekayti/contracts";
export const BOOK_RENDERER_VERSION = "book-renderer/1.1";
export const escapeBookText = (s: string) =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
export const bookPageCss = `*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:HekaytiBook,'Noto Sans Arabic',sans-serif;font-weight:400}.book-page{position:relative;break-after:page;overflow:hidden;background:#fff9ed}.book-page:last-child{break-after:auto}.book-trim{position:absolute}.book-art{position:absolute;object-fit:cover;pointer-events:none}.book-box{position:absolute;line-height:1.65;padding:2.5mm;white-space:pre-wrap;overflow-wrap:anywhere;text-align:start;unicode-bidi:plaintext;color:#282a2b}.book-box.PAPER{background:rgba(255,250,235,.94);border-radius:3mm;box-shadow:.4mm .7mm 1mm #0002}.book-box.CAPTION{background:#fff9edcc;border-bottom:.3mm solid #dcbea1}.book-box.BUBBLE{background:#fffef8;border:.4mm solid #403c35;border-radius:5mm;z-index:2}.book-box.PAGE_NUMBER{padding:0;line-height:1.25;text-align:center}.bubble-tail{position:absolute;pointer-events:none;z-index:1;overflow:visible}.book-text{display:block;min-width:0;white-space:pre-wrap;overflow-wrap:anywhere}`;
// Digital clips off the same bleed that print includes: identical art inside trim, never stretched.
export function bookArtworkGeometry(
  settings: BookLayout["settings"],
  kind: "digital" | "print",
) {
  const offset = kind === "digital" ? -settings.bleedMm : 0;
  return {
    xMm: offset,
    yMm: offset,
    widthMm: settings.widthMm + 2 * settings.bleedMm,
    heightMm: settings.heightMm + 2 * settings.bleedMm,
  };
}
function tailSvg(
  box: TextBox,
  page: PageLayout,
  width: number,
  height: number,
): string {
  if (box.kind !== "DIALOGUE" || box.tail === "NONE") return "";
  const anchor = page.anchors.find((a) => a.speakerId === box.speakerId);
  const cx = (box.x + box.width / 2) * width,
    cy = (box.y + box.height / 2) * height;
  let direction = box.tail;
  if (direction === "ANCHOR") {
    if (!anchor) return "";
    const dx = anchor.x * width - cx,
      dy = anchor.y * height - cy;
    direction =
      Math.abs(dx) > Math.abs(dy)
        ? dx < 0
          ? "LEFT"
          : "RIGHT"
        : dy < 0
          ? "TOP"
          : "BOTTOM";
  }
  const horizontal = direction === "LEFT" || direction === "RIGHT",
    sign = direction === "LEFT" || direction === "TOP" ? -1 : 1;
  const sx = horizontal ? cx + (sign * box.width * width) / 2 : cx,
    sy = horizontal ? cy : cy + (sign * box.height * height) / 2;
  const target =
    box.tail === "ANCHOR" && anchor
      ? { x: anchor.x * width, y: anchor.y * height }
      : {
          x: sx + (horizontal ? sign * 7 : 0),
          y: sy + (horizontal ? 0 : sign * 7),
        };
  const ax = sx + (horizontal ? 0 : -3),
    ay = sy + (horizontal ? -3 : 0),
    bx = sx + (horizontal ? 0 : 3),
    by = sy + (horizontal ? 3 : 0);
  return `<svg class="bubble-tail" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" style="left:0;top:0"><path d="M${ax},${ay} L${target.x},${target.y} L${bx},${by}" fill="#fffef8" stroke="#403c35" stroke-width=".4"/></svg>`;
}
export function bookPageMarkup(
  layout: BookLayout,
  page: PageLayout,
  imageData: string,
  kind: "digital" | "print",
) {
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageData))
    throw new AppError(
      "BOOK_IMAGE_SOURCE",
      "Only verified local image data may render.",
    );
  const bleed = kind === "print" ? layout.settings.bleedMm : 0,
    width = layout.settings.widthMm,
    height = layout.settings.heightMm,
    art = bookArtworkGeometry(layout.settings, kind);
  return `<section class="book-page" data-page="${page.pageNumber}" style="width:${width + 2 * bleed}mm;height:${height + 2 * bleed}mm"><img class="book-art" src="${imageData}" alt="" style="left:${art.xMm}mm;top:${art.yMm}mm;width:${art.widthMm}mm;height:${art.heightMm}mm"><div class="book-trim" style="left:${bleed}mm;top:${bleed}mm;width:${width}mm;height:${height}mm">${page.boxes.map((box) => `${tailSvg(box, page, width, height)}<div data-box="${escapeBookText(box.boxId)}" class="book-box ${box.style} ${box.kind}" style="left:${box.x * width}mm;top:${box.y * height}mm;width:${box.width * width}mm;height:${box.height * height}mm;font-size:${box.fontPt}pt"><span class="book-text">${escapeBookText(box.text)}</span></div>`).join("")}</div></section>`;
}
export function bookHtml(
  layout: BookLayout,
  kind: "digital" | "print",
  fonts: { arabic: string; latin: string },
  images: Record<string, string>,
): string {
  const bleed = kind === "print" ? layout.settings.bleedMm : 0,
    width = layout.settings.widthMm + 2 * bleed,
    height = layout.settings.heightMm + 2 * bleed;
  if (
    !/^[A-Za-z0-9+/=]+$/.test(fonts.arabic) ||
    !/^[A-Za-z0-9+/=]+$/.test(fonts.latin)
  )
    throw new AppError("BOOK_FONT", "Invalid embedded fonts.");
  return `<!doctype html><html lang="${languageInfo[layout.mode].lang}" dir="${languageInfo[layout.mode].dir}"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'"><title>${escapeBookText(layout.title)}</title><style>@font-face{font-family:HekaytiBook;src:url(data:font/woff2;base64,${fonts.arabic}) format('woff2');font-weight:400}@font-face{font-family:HekaytiBook;src:url(data:font/woff2;base64,${fonts.latin}) format('woff2');font-weight:400;unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@page{size:${width}mm ${height}mm;margin:0}${bookPageCss}</style></head><body>${layout.pages.map((page) => bookPageMarkup(layout, page, images[page.imageId] ?? "", kind)).join("")}</body></html>`;
}
export const measureBookScript = `(async()=>{await document.fonts.ready;const images=[...document.images];await Promise.all(images.map(i=>i.complete?Promise.resolve():new Promise((resolve,reject)=>{i.onload=resolve;i.onerror=reject})));if(images.some(i=>!i.naturalWidth))throw Error('Image decode failed');const errors=[];for(const box of document.querySelectorAll('[data-box]')){const text=box.querySelector('.book-text'),css=getComputedStyle(box),rect=box.getBoundingClientRect();const innerW=rect.width-parseFloat(css.paddingLeft)-parseFloat(css.paddingRight),innerH=rect.height-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);if(text.scrollWidth>innerW+1||text.scrollHeight>innerH+1)errors.push({boxId:box.dataset.box,page:box.closest('[data-page]').dataset.page,reason:'TEXT_OVERFLOW'});}return {errors,pages:document.querySelectorAll('.book-page').length,fontReady:document.fonts.check('20px HekaytiBook')};})()`;
export function printResolution(
  asset: Pick<AssetManifest, "width" | "height">,
  settings: BookLayout["settings"],
) {
  const dpi = Math.min(
    asset.width / ((settings.widthMm + 2 * settings.bleedMm) / 25.4),
    asset.height / ((settings.heightMm + 2 * settings.bleedMm) / 25.4),
  );
  return { dpi: Math.round(dpi), low: dpi < 200, recommendedDpi: 300 };
}
