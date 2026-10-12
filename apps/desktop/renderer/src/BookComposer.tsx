import { useEffect, useState } from "react";
import type {
  BookCommand,
  BookLayout,
  BookSettings,
  BookStudioSnapshot,
  PageLayout,
  TextBox,
} from "@hekayti/contracts/book";
import { BookPageCanvas, type CanvasTextLayer } from "./BookPageCanvas";
import { targetElementId, type StudioTarget } from "./studio-recovery";
import {
  constrainCanvasRect,
  studioCharacters,
  useStudioUi,
} from "./studio-ui";

export function canvasLayers(
  page: PageLayout,
  names: Record<string, string>,
): CanvasTextLayer[] {
  const kinds = {
    TITLE: "title",
    SUBTITLE: "title",
    BRAND: "narration",
    NARRATION: "narration",
    DIALOGUE: "dialogue",
    PAGE_NUMBER: "page-number",
  } as const;
  const styles = {
    CLEAN: "plain",
    PAPER: "paper",
    CAPTION: "caption",
    BUBBLE: "paper",
  } as const;
  const tails = {
    NONE: "none",
    LEFT: "left",
    RIGHT: "right",
    TOP: "up",
    BOTTOM: "down",
    ANCHOR: "down",
  } as const;
  return page.boxes.map((box) => ({
    key: box.boxId,
    kind: kinds[box.kind],
    text: box.text,
    speakerId: box.speakerId,
    speakerName: box.speakerId ? names[box.speakerId] : undefined,
    rect: { x: box.x, y: box.y, width: box.width, height: box.height },
    fontPt: box.fontPt,
    style: styles[box.style],
    tail: box.tail === "ANCHOR" ? anchorTail(box, page) : tails[box.tail],
  }));
}
function anchorTail(box: TextBox, page: PageLayout): CanvasTextLayer["tail"] {
  const anchor = page.anchors.find(
    (anchor) => anchor.speakerId === box.speakerId,
  );
  if (!anchor) return "down";
  const dx = anchor.x - (box.x + box.width / 2),
    dy = anchor.y - (box.y + box.height / 2);
  return Math.abs(dx) > Math.abs(dy)
    ? dx < 0
      ? "left"
      : "right"
    : dy < 0
      ? "up"
      : "down";
}
function ComposedPage({
  snapshot,
  layout,
  page,
  editable,
  selected,
  anchorSpeaker,
  onSelect,
  onBox,
  onAnchor,
  onOverflow,
}: {
  snapshot: BookStudioSnapshot;
  layout: BookLayout;
  page: PageLayout;
  editable: boolean;
  selected?: string;
  anchorSpeaker?: string;
  onSelect?: (key: string) => void;
  onBox?: (
    key: string,
    rect: { x: number; y: number; width: number; height: number },
  ) => void;
  onAnchor?: (speakerId: string, point: { x: number; y: number }) => void;
  onOverflow?: (keys: string[]) => void;
}) {
  const [artwork, setArtwork] = useState<string>();
  const image = snapshot.book.images.find(
    (image) => image.imageId === page.imageId,
  );
  const names = Object.fromEntries(
    studioCharacters(snapshot).map((character) => [
      character.characterId,
      character.displayName,
    ]),
  );
  useEffect(() => {
    let active = true;
    setArtwork(undefined);
    if (image)
      void window.hekayti
        .studioAssetPreview({
          projectId: snapshot.book.projectId,
          assetId: image.assetId,
        })
        .then((result) => {
          if (active && result.ok && result.value) setArtwork(result.value);
        });
    return () => {
      active = false;
    };
  }, [image?.assetId, snapshot.book.projectId]);
  return (
    <BookPageCanvas
      layers={canvasLayers(page, names)}
      artwork={artwork}
      aspectRatio={layout.settings.widthMm / layout.settings.heightMm}
      pageWidthMm={layout.settings.widthMm}
      bookSettings={layout.settings}
      renderLayout={layout}
      renderPage={page}
      margin={
        layout.settings.safeMm /
        Math.min(layout.settings.widthMm, layout.settings.heightMm)
      }
      editable={editable}
      selected={selected}
      anchorSpeaker={anchorSpeaker}
      anchors={Object.fromEntries(
        page.anchors.map((anchor) => [
          anchor.speakerId,
          { x: anchor.x, y: anchor.y },
        ]),
      )}
      onSelect={onSelect}
      onChange={onBox}
      onAnchor={onAnchor}
      onOverflow={onOverflow}
    />
  );
}
export function BookComposer({
  snapshot,
  busy,
  onCommand,
  onExport,
  onEditStory,
  onPreview,
  target,
  onFinalReview,
  onDirtyChange,
  onPageSelect,
}: {
  snapshot: BookStudioSnapshot;
  busy: boolean;
  onCommand: (command: BookCommand) => void;
  onExport: (kind: "digital" | "print") => void;
  onEditStory: () => void;
  onPreview: () => void;
  target?: StudioTarget;
  onFinalReview?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onPageSelect?: (page: PageLayout) => void;
}) {
  const { say } = useStudioUi();
  const [layout, setLayout] = useState<BookLayout | null>(
    snapshot.layout ? structuredClone(snapshot.layout) : null,
  );
  const [settings, setSettings] = useState<BookSettings>(
    snapshot.layout?.settings ?? {
      preset: "SQUARE",
      widthMm: 200,
      heightMm: 200,
      safeMm: 12,
      gutterMm: 0,
      bleedMm: 3,
      pageNumbers: true,
    },
  );
  const [subtitle, setSubtitle] = useState(snapshot.layout?.subtitle ?? "");
  const [brand, setBrand] = useState(snapshot.layout?.brand ?? "");
  const [pageIndex, setPageIndex] = useState(() => Math.max(0, snapshot.layout?.pages.findIndex((p) => p.pageId === snapshot.book.creatorProgress?.pageId) ?? 0));
  const [selected, setSelected] = useState<string>();
  const [anchorSpeaker, setAnchorSpeaker] = useState<string>();
  const [overflow, setOverflow] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { onDirtyChange?.(dirty); }, [dirty, onDirtyChange]);
  const bindings = {
    projectId: snapshot.book.projectId,
    expectedBook: snapshot.book.recordVersion,
  };
  const characters = studioCharacters(snapshot);
  useEffect(() => {
    if (target?.section !== "book") return;
    if (target.control === "cover") { setPageIndex(0); return; }
    if (!target.pageId) return;
    const i = layout?.pages.findIndex((p) => p.pageId === target.pageId);
    if (i !== undefined && i >= 0) setPageIndex(i);
  }, [target]);
  useEffect(() => {
    setLayout(snapshot.layout ? structuredClone(snapshot.layout) : null);
    if (snapshot.layout) {
      setSettings(snapshot.layout.settings);
      setSubtitle(snapshot.layout.subtitle);
      setBrand(snapshot.layout.brand);
    }
    setDirty(false);
    setOverflow([]);
  }, [snapshot.layout?.revisionId]);
  const page =
    layout?.pages[Math.min(pageIndex, (layout?.pages.length ?? 1) - 1)];
  const box = page?.boxes.find((box) => box.boxId === selected);
  function updateBox(boxId: string, patch: Partial<TextBox>) {
    if (!layout || !page) return;
    setLayout({
      ...layout,
      pages: layout.pages.map((p) =>
        p.pageId === page.pageId
          ? {
              ...p,
              boxes: p.boxes.map((b) =>
                b.boxId === boxId ? { ...b, ...patch } : b,
              ),
            }
          : p,
      ),
    });
    setDirty(true);
  }
  function updateAnchor(speakerId: string, point: { x: number; y: number }) {
    if (!layout || !page) return;
    setLayout({
      ...layout,
      pages: layout.pages.map((p) =>
        p.pageId === page.pageId
          ? {
              ...p,
              anchors: [
                ...p.anchors.filter((a) => a.speakerId !== speakerId),
                { speakerId, ...point },
              ],
              boxes: p.boxes.map((b) =>
                b.speakerId === speakerId
                  ? { ...b, tail: "ANCHOR" as const }
                  : b,
              ),
            }
          : p,
      ),
    });
    setAnchorSpeaker(undefined);
    setDirty(true);
  }
  function settingsChange(patch: Partial<BookSettings>) {
    setSettings({ ...settings, ...patch });
    setDirty(true);
  }
  function save() {
    if (!layout) return;
    onCommand({
      ...bindings,
      action: "SAVE_LAYOUT",
      layout: {
        ...layout,
        settings,
        subtitle,
        brand,
        revisionId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      },
    });
  }
  return (
    <section
      className="studio-panel"
      data-testid="book-composer"
      id={targetElementId({
        section: "book",
        pageId: page?.pageId,
        control: "layout",
      })}
      tabIndex={-1}
    >
      <h2>{say("الكتاب", "Book")}</h2>
      <p>
        {say(
          "الكلام طبقة قابلة للتعديل فوق الرسم. يبقى الحوار مرتبطًا بالمتحدث الصحيح، ويُضاف العنوان داخل حكايتي.",
          "Text remains an editable layer over artwork. Dialogue stays bound to the correct speaker; Hekayti adds the cover title.",
        )}
      </p>
      <details open={!layout}>
        <summary>
          {say("مقاس الكتاب والطباعة", "Book size and print settings")}
        </summary>
        <label>
          {say("المقاس", "Size")}
          <select
            value={settings.preset}
            onChange={(e) => {
              const preset = e.target.value as BookSettings["preset"];
              settingsChange(
                preset === "SQUARE"
                  ? { preset, widthMm: 200, heightMm: 200 }
                  : preset === "A5"
                    ? { preset, widthMm: 148, heightMm: 210 }
                    : { preset },
              );
            }}
          >
            <option value="SQUARE">
              {say(
                "مربع للأطفال — ٢٠ × ٢٠ سم",
                "Children's square — 20 × 20 cm",
              )}
            </option>
            <option value="A5">{say("A5 رأسي", "A5 portrait")}</option>
            <option value="CUSTOM">{say("مقاس مخصص", "Custom size")}</option>
          </select>
        </label>
        <div className="studio-choice-grid">
          {(
            ["widthMm", "heightMm", "safeMm", "gutterMm", "bleedMm"] as const
          ).map((key, i) => (
            <label key={key}>
              {
                [
                  say("العرض (مم)", "Width (mm)"),
                  say("الارتفاع (مم)", "Height (mm)"),
                  say("هامش الأمان (مم)", "Safe margin (mm)"),
                  say("هامش التجليد (مم)", "Gutter (mm)"),
                  say("النزف (مم)", "Bleed (mm)"),
                ][i]
              }
              <input
                type="number"
                min={
                  key === "widthMm" || key === "heightMm"
                    ? 90
                    : key === "safeMm"
                      ? 5
                      : 0
                }
                max={
                  key === "widthMm" || key === "heightMm"
                    ? 420
                    : key === "safeMm"
                      ? 30
                      : key === "gutterMm"
                        ? 20
                        : 6
                }
                value={settings[key]}
                onChange={(e) =>
                  settingsChange({ [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
        </div>
        <button
          onClick={() =>
            settingsChange({
              widthMm: settings.heightMm,
              heightMm: settings.widthMm,
              preset: "CUSTOM",
            })
          }
        >
          {say("تبديل الاتجاه", "Switch orientation")}
        </button>
        <label>
          <input
            type="checkbox"
            checked={settings.pageNumbers}
            onChange={(e) => settingsChange({ pageNumbers: e.target.checked })}
          />
          {say("إظهار أرقام الصفحات", "Page numbers")}
        </label>
        <label>
          {say("عنوان فرعي للغلاف — اختياري", "Cover subtitle — optional")}
          <input
            dir="auto"
            maxLength={200}
            value={subtitle}
            onChange={(e) => {
              setSubtitle(e.target.value);
              setDirty(true);
            }}
          />
        </label>
        <label>
          {say(
            "سطر الكاتب أو العلامة — اختياري",
            "Creator or brand line — optional",
          )}
          <input
            dir="auto"
            maxLength={200}
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setDirty(true);
            }}
          />
        </label>
      </details>
      <div className="studio-actions">
        <button
          disabled={busy}
          onClick={() =>
            onCommand({
              ...bindings,
              action: "AUTO_LAYOUT",
              mode: snapshot.mode,
              settings,
              subtitle,
              brand,
            })
          }
        >
          {say("ترتيب تلقائي", "Automatic layout")}
        </button>
        <button disabled={busy || !layout || dirty} onClick={onPreview}>
          {say("معاينة الكتاب", "Preview book")}
        </button>
        <button
          disabled={busy || !layout || !dirty || overflow.length > 0}
          onClick={save}
        >
          {say("حفظ التصميم", "Save layout")}
        </button>
        <button
          disabled={busy || !layout || dirty || overflow.length > 0}
          onClick={() => onCommand({ ...bindings, action: "APPROVE_BOOK" })}
        >
          {say("اعتماد الكتاب", "Approve book")}
        </button>
      </div>
      {!layout && (
        <p className="studio-warning">
          {say(
            "اعتمد القصة والغلاف وصور كل الصفحات، ثم اضغط «ترتيب تلقائي» لإنشاء تصميم الكتاب.",
            "Approve the story, cover and every page image, then choose Automatic layout.",
          )}
        </p>
      )}
      {layout && page && (
        <>
          <label>
            {say("الصفحة", "Page")}
            <select
              value={pageIndex}
              onChange={(e) => {
                setPageIndex(Number(e.target.value));
                const nextPage = layout.pages[Number(e.target.value)];
                if (nextPage) onPageSelect?.(nextPage);
                setSelected(undefined);
                setOverflow([]);
                setAnchorSpeaker(undefined);
              }}
            >
              {layout.pages.map((page, i) => (
                <option key={page.pageId} value={i}>
                  {page.pageNumber === 0
                    ? say("الغلاف", "Cover")
                    : say("صفحة", "Page") + " " + page.pageNumber}
                </option>
              ))}
            </select>
          </label>
          <div className="studio-composer-grid">
            <ComposedPage
              snapshot={snapshot}
              layout={{ ...layout, settings }}
              page={page}
              editable
              selected={selected}
              anchorSpeaker={anchorSpeaker}
              onSelect={setSelected}
              onBox={(key, rect) => updateBox(key, rect)}
              onAnchor={updateAnchor}
              onOverflow={setOverflow}
            />
            <aside>
              <p>
                {say(
                  "اضغط على النص لاختياره، ثم اسحبه أو حرّك زاوية المساحة لتغيير حجمها.",
                  "Select text, then drag it or use the corner handle to resize.",
                )}
              </p>
              {page.boxes.filter((b) => b.kind === "DIALOGUE").length > 0 && (
                <>
                  <label>
                    {say(
                      "حدد مكان المتحدث على الصورة — اختياري",
                      "Mark speaker position — optional",
                    )}
                    <select
                      value={anchorSpeaker ?? ""}
                      onChange={(e) =>
                        setAnchorSpeaker(e.target.value || undefined)
                      }
                    >
                      <option value="">
                        {say(
                          "اختر المتحدث ثم اضغط مكانه",
                          "Choose speaker, then tap their position",
                        )}
                      </option>
                      {Array.from(
                        new Set(
                          page.boxes
                            .filter((b) => b.kind === "DIALOGUE")
                            .map((b) => b.speakerId),
                        ),
                      ).map((id) => (
                        <option key={id} value={id}>
                          {characters.find((c) => c.characterId === id)
                            ?.displayName ?? say("متحدث", "Speaker")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="studio-muted">
                    {say(
                      "الموضع تقريبي من اختيارك؛ لا يتعرف التطبيق على الوجوه.",
                      "This is your approximate position; the app does not recognize faces.",
                    )}
                  </p>
                </>
              )}
              {box && (
                <>
                  <h3>
                    {box.speakerId
                      ? characters.find((c) => c.characterId === box.speakerId)
                          ?.displayName
                      : say("النص المحدد", "Selected text")}
                  </h3>
                  {box.kind === "TITLE" ||
                  box.kind === "SUBTITLE" ||
                  box.kind === "BRAND" ? (
                    <label>
                      {say("نص الغلاف", "Cover text")}
                      <textarea
                        dir="auto"
                        value={box.text}
                        onChange={(e) => {
                          updateBox(box.boxId, { text: e.target.value });
                          if (box.kind === "TITLE")
                            setLayout((old) =>
                              old ? { ...old, title: e.target.value } : old,
                            );
                          if (box.kind === "SUBTITLE")
                            setSubtitle(e.target.value);
                          if (box.kind === "BRAND") setBrand(e.target.value);
                        }}
                      />
                    </label>
                  ) : (
                    <>
                      <p dir="auto">{box.text}</p>
                      <button onClick={onEditStory}>
                        {say("تعديل نص القصة", "Edit story text")}
                      </button>
                    </>
                  )}
                  <label>
                    {say("حجم الخط", "Font size")}
                    <input
                      type="number"
                      min={14}
                      max={60}
                      value={box.fontPt}
                      onChange={(e) =>
                        updateBox(box.boxId, {
                          fontPt: Math.max(
                            14,
                            Math.min(60, Number(e.target.value)),
                          ),
                        })
                      }
                    />
                  </label>
                  {box.kind !== "DIALOGUE" && (
                    <label>
                      {say("شكل السرد", "Narration style")}
                      <select
                        value={box.style}
                        onChange={(e) =>
                          updateBox(box.boxId, {
                            style: e.target.value as TextBox["style"],
                          })
                        }
                      >
                        <option value="CLEAN">
                          {say("نص نظيف", "Clean text")}
                        </option>
                        <option value="PAPER">
                          {say("بطاقة ورقية ناعمة", "Soft paper card")}
                        </option>
                        <option value="CAPTION">
                          {say("تعليق بسيط", "Caption")}
                        </option>
                      </select>
                    </label>
                  )}
                  {box.kind === "DIALOGUE" && (
                    <label>
                      {say("شكل فقاعة الحوار", "Speech bubble shape")}
                      <select
                        value={box.bubbleShape ?? "ROUNDED"}
                        onChange={(e) =>
                          updateBox(box.boxId, {
                            bubbleShape: e.target
                              .value as TextBox["bubbleShape"],
                          })
                        }
                      >
                        <option value="CLOUD">
                          {say("سحابة ناعمة", "Soft cloud")}
                        </option>
                        <option value="ROUNDED">
                          {say("مستديرة", "Rounded")}
                        </option>
                        <option value="PAPER">
                          {say("قصاصة ورق", "Layered paper")}
                        </option>
                      </select>
                    </label>
                  )}
                  {box.kind === "DIALOGUE" && (
                    <label>
                      {say("اتجاه ذيل الفقاعة", "Bubble tail direction")}
                      <select
                        value={box.tail}
                        onChange={(e) =>
                          updateBox(box.boxId, {
                            tail: e.target.value as TextBox["tail"],
                          })
                        }
                      >
                        {(
                          [
                            "NONE",
                            "LEFT",
                            "RIGHT",
                            "TOP",
                            "BOTTOM",
                            "ANCHOR",
                          ] as const
                        ).map((key, i) => (
                          <option key={key} value={key}>
                            {
                              [
                                say("بدون", "None"),
                                say("يسار", "Left"),
                                say("يمين", "Right"),
                                say("أعلى", "Up"),
                                say("أسفل", "Down"),
                                say("نحو المتحدث", "Toward speaker"),
                              ][i]
                            }
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="studio-choice-grid">
                    {(["x", "y", "width", "height"] as const).map((key, i) => (
                      <label key={key}>
                        {
                          [
                            say("الموضع الأفقي ٪", "Horizontal %"),
                            say("الموضع الرأسي ٪", "Vertical %"),
                            say("العرض ٪", "Width %"),
                            say("الارتفاع ٪", "Height %"),
                          ][i]
                        }
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={Math.round(box[key] * 100)}
                          onChange={(e) =>
                            updateBox(
                              box.boxId,
                              constrainCanvasRect(
                                { ...box, [key]: Number(e.target.value) / 100 },
                                settings.safeMm /
                                  Math.min(settings.widthMm, settings.heightMm),
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                </>
              )}
              {overflow.length > 0 && (
                <div className="studio-warning" role="alert">
                  <p>
                    {say(
                      "النص طويل على المساحة الحالية. اختر النص ثم كبّر المساحة أو قلل الخط ضمن الحد الآمن أو عدّل النص.",
                      "Text is too long for its current area. Select it, enlarge the area, reduce the font within the safe limit, or edit the text.",
                    )}
                  </p>
                  {overflow.map((key) => (
                    <button key={key} onClick={() => setSelected(key)}>
                      {say("حدد النص الطويل", "Select overflowing text")}
                    </button>
                  ))}
                  <button onClick={onEditStory}>
                    {say(
                      "تعديل النص وتقسيم الجمل",
                      "Edit text and split sentences",
                    )}
                  </button>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
      {dirty && (
        <p className="studio-warning">
          {say(
            "هناك تعديلات تصميم لم تُحفظ. احفظها وراجعها قبل اعتماد الكتاب.",
            "Layout changes are unsaved. Save and review before approving.",
          )}
        </p>
      )}
      <p>
        {snapshot.approved
          ? say(
              "الكتاب معتمد؛ افتح المراجعة النهائية للفحص والتصدير.",
              "Book approved; open final review to check and export.",
            )
          : say("الكتاب لم يعتمد بعد.", "Book is not approved yet.")}
      </p>
      <div className="studio-actions">
        {onFinalReview ? <button disabled={busy || dirty} onClick={onFinalReview}>{say("التالي: مراجعة نهائية", "Next: final review")}</button> : <>
        <button
          disabled={busy || dirty || !snapshot.approved}
          onClick={() => onExport("digital")}
        >
          {say("تصدير PDF رقمي", "Export digital PDF")}
        </button>
        <button
          disabled={busy || dirty || !snapshot.approved}
          onClick={() => onExport("print")}
        >
          {say("تصدير PDF للطباعة", "Export print PDF")}
        </button>
        </>}
      </div>
      {snapshot.notices.map((notice, i) => (
        <p className="studio-warning" key={i} dir="auto">
          {notice.text}
        </p>
      ))}
    </section>
  );
}
