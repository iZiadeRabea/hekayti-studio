import { useEffect, useRef, useState, type PointerEvent } from "react";
import { constrainCanvasRect, useStudioUi, type CanvasRect } from "./studio-ui";
import {
  bookArtworkGeometry,
  bookPageMarkup,
  bookPageCss,
} from "@hekayti/export/book";
import type {
  BookSettings,
  BookLayout,
  PageLayout,
} from "@hekayti/contracts/book";
const previewPageCss = bookPageCss
  .replace("*{", ".shared-book-render *{")
  .replace("html,body{", ".shared-book-render{");

export interface CanvasTextLayer {
  key: string;
  kind: "narration" | "dialogue" | "title" | "page-number";
  text: string;
  speakerId?: string;
  speakerName?: string;
  rect: CanvasRect;
  fontPt: number;
  style: "paper" | "plain" | "caption";
  tail?: "left" | "right" | "up" | "down" | "none";
}
export function BookPageCanvas({
  layers,
  artwork,
  aspectRatio,
  editable = false,
  selected,
  anchorSpeaker,
  anchors = {},
  margin = 0.04,
  pageWidthMm = 200,
  bookSettings,
  onSelect,
  onChange,
  onAnchor,
  onOverflow,
  renderLayout,
  renderPage,
}: {
  layers: CanvasTextLayer[];
  artwork?: string;
  aspectRatio: number;
  editable?: boolean;
  selected?: string;
  anchorSpeaker?: string;
  anchors?: Record<string, { x: number; y: number }>;
  margin?: number;
  pageWidthMm?: number;
  bookSettings?: BookSettings;
  onSelect?: (key: string) => void;
  onChange?: (key: string, rect: CanvasRect) => void;
  onAnchor?: (speakerId: string, point: { x: number; y: number }) => void;
  onOverflow?: (keys: string[]) => void;
  renderLayout?: BookLayout;
  renderPage?: PageLayout;
}) {
  const { say } = useStudioUi();
  const art = bookSettings
    ? bookArtworkGeometry(bookSettings, "digital")
    : null;
  const canvas = useRef<HTMLDivElement>(null);
  const [renderScale, setRenderScale] = useState(1);
  useEffect(() => {
    const el = canvas.current;
    if (!el || !renderLayout) return;
    const update = () =>
      setRenderScale(
        el.clientWidth / ((renderLayout.settings.widthMm * 96) / 25.4),
      );
    const o = new ResizeObserver(update);
    o.observe(el);
    update();
    return () => o.disconnect();
  }, [renderLayout?.settings.widthMm]);
  const drag = useRef<{
    key: string;
    startX: number;
    startY: number;
    rect: CanvasRect;
    resize: boolean;
  } | null>(null);
  const [working, setWorking] = useState<{
    key: string;
    rect: CanvasRect;
  } | null>(null);
  useEffect(() => {
    if (!canvas.current || !onOverflow) return;
    const element = canvas.current;
    const check = () => {
      const keys: string[] = [];
      element
        .querySelectorAll<HTMLElement>(
          renderPage ? ".shared-book-render .book-box" : ".book-text-layer",
        )
        .forEach((layer) => {
          const text = layer.querySelector<HTMLElement>(
            renderPage ? ".book-text" : ".book-layer-text",
          );
          const css = getComputedStyle(layer),
            innerH =
              layer.clientHeight -
              parseFloat(css.paddingTop) -
              parseFloat(css.paddingBottom),
            innerW =
              layer.clientWidth -
              parseFloat(css.paddingLeft) -
              parseFloat(css.paddingRight);
          if (
            text &&
            (text.scrollHeight >
              (getComputedStyle(text).position === "absolute"
                ? text.clientHeight
                : innerH) +
                2 ||
              text.scrollWidth >
                (getComputedStyle(text).position === "absolute"
                  ? text.clientWidth
                  : innerW) +
                  2)
          )
            keys.push(
              (renderPage ? layer.dataset.box : layer.dataset.layerKey)!,
            );
        });
      onOverflow(keys);
    };
    const observer = new ResizeObserver(check);
    observer.observe(element);
    void document.fonts.ready.then(check);
    check();
    return () => observer.disconnect();
  }, [layers, pageWidthMm, onOverflow]);
  function start(event: PointerEvent, layer: CanvasTextLayer, resize = false) {
    if (!editable || anchorSpeaker) return;
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect?.(layer.key);
    drag.current = {
      key: layer.key,
      startX: event.clientX,
      startY: event.clientY,
      rect: layer.rect,
      resize,
    };
  }
  function move(event: PointerEvent) {
    const current = drag.current,
      bounds = canvas.current?.getBoundingClientRect();
    if (!current || !bounds) return;
    const dx = (event.clientX - current.startX) / bounds.width;
    const dy = (event.clientY - current.startY) / bounds.height;
    const rect = constrainCanvasRect(
      current.resize
        ? {
            ...current.rect,
            width: current.rect.width + dx,
            height: current.rect.height + dy,
          }
        : { ...current.rect, x: current.rect.x + dx, y: current.rect.y + dy },
      margin,
    );
    setWorking({ key: current.key, rect });
  }
  function finish() {
    if (drag.current && working) onChange?.(working.key, working.rect);
    drag.current = null;
    setWorking(null);
  }
  return (
    <div
      ref={canvas}
      className={`book-page-canvas ${editable ? "editable" : ""} ${anchorSpeaker ? "anchor-mode" : ""}`}
      data-testid="book-page-canvas"
      style={{ aspectRatio }}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={() => {
        drag.current = null;
        setWorking(null);
      }}
      onClick={(event) => {
        if (!anchorSpeaker || !onAnchor || !canvas.current) return;
        const bounds = canvas.current.getBoundingClientRect();
        onAnchor(anchorSpeaker, {
          x: Math.min(
            1,
            Math.max(0, (event.clientX - bounds.left) / bounds.width),
          ),
          y: Math.min(
            1,
            Math.max(0, (event.clientY - bounds.top) / bounds.height),
          ),
        });
      }}
    >
      {renderLayout && renderPage && artwork && (
        <div
          className="shared-book-render"
          dir={renderLayout.mode === "en" ? "ltr" : "rtl"}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            transform: `scale(${renderScale})`,
            transformOrigin: "top left",
            width: (renderLayout.settings.widthMm * 96) / 25.4,
          }}
          dangerouslySetInnerHTML={{
            __html: `<style>${previewPageCss}</style>${bookPageMarkup(renderLayout, working ? { ...renderPage, boxes: renderPage.boxes.map((b) => (b.boxId === working.key ? { ...b, ...working.rect } : b)) } : renderPage, artwork, "digital")}`,
          }}
        />
      )}
      {artwork && !renderPage ? (
        <img
          className="book-artwork"
          style={
            art && bookSettings
              ? {
                  left: (art.xMm / bookSettings.widthMm) * 100 + "%",
                  top: (art.yMm / bookSettings.heightMm) * 100 + "%",
                  width: (art.widthMm / bookSettings.widthMm) * 100 + "%",
                  height: (art.heightMm / bookSettings.heightMm) * 100 + "%",
                  objectFit: "cover",
                }
              : undefined
          }
          src={artwork}
          alt={say("رسم الصفحة", "Page artwork")}
        />
      ) : !artwork ? (
        <div className="book-art-placeholder">
          {say(
            "استورد صورة الصفحة من تبويب الصور",
            "Import artwork from Pictures",
          )}
        </div>
      ) : null}
      {editable && (
        <div
          className="book-safe-guide"
          style={{ inset: `${margin * 100}%` }}
          aria-hidden="true"
        />
      )}
      {layers.map((layer) => {
        const rect = working?.key === layer.key ? working.rect : layer.rect;
        return (
          <div
            key={layer.key}
            className={`book-text-layer ${renderPage ? "shared-hitbox" : ""} ${layer.kind} ${layer.style} tail-${layer.tail ?? "none"} ${selected === layer.key ? "selected" : ""}`}
            data-layer-key={layer.key}
            data-speaker-id={layer.speakerId}
            dir="auto"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
              fontSize: `${((layer.fontPt * 0.352778) / pageWidthMm) * 100}cqw`,
              padding:
                layer.kind === "page-number"
                  ? 0
                  : `${(2.5 / pageWidthMm) * 100}cqw`,
            }}
            onPointerDown={(event) => start(event, layer)}
            onClick={(event) => {
              if (!anchorSpeaker) {
                event.stopPropagation();
                onSelect?.(layer.key);
              }
            }}
          >
            {layer.kind === "dialogue" && editable && (
              <small className="bubble-speaker">{layer.speakerName}</small>
            )}
            {!renderPage && <div className="book-layer-text">{layer.text}</div>}
            {editable && selected === layer.key && (
              <button
                type="button"
                className="book-resize-handle"
                aria-label={say("تغيير مساحة النص", "Resize text area")}
                onPointerDown={(event) => start(event, layer, true)}
              >
                ↘
              </button>
            )}
          </div>
        );
      })}
      {editable &&
        Object.entries(anchors).map(([key, point]) => (
          <span
            key={key}
            className="speaker-anchor"
            title={key}
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            aria-hidden="true"
          >
            ⊕
          </span>
        ))}
    </div>
  );
}
