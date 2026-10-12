import { useEffect, useState } from "react";
import { deriveVisualIntent } from "@hekayti/core/book";
import { createPortal } from "react-dom";
import { PageCompositionPlan } from "./PageCompositionPlan";
import { BookStoryboard } from "./BookStoryboard";
import { targetElementId, type StudioTarget } from "./studio-recovery";
import { printResolution } from "@hekayti/export/book";
import type {
  BookCommand,
  BookStudioSnapshot,
  IdentityPack,
  SelectBookAssets,
} from "@hekayti/contracts/book";
import { studioCharacters, useStudioUi } from "./studio-ui";

export function PrivateAssetPreview({
  projectId,
  assetId,
  refreshToken,
}: {
  projectId: string;
  assetId: string;
  refreshToken?: object;
}) {
  const { say } = useStudioUi();
  const [preview, setPreview] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    setPreview(null);
    setMissing(false);
    void window.hekayti
      .studioAssetPreview({ projectId, assetId })
      .then((result) => {
        if (!active) return;
        if (result.ok && result.value) setPreview(result.value);
        else setMissing(true);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [projectId, assetId, refreshToken]);
  return missing ? (
    <p className="studio-warning">
      {say(
        "الصورة غير موجودة في مكانها. أعد ربط الصورة.",
        "The image is missing. Relink the image.",
      )}
    </p>
  ) : preview ? (
    <img
      className="studio-image-preview"
      src={preview}
      alt={say("معاينة الصورة المحلية", "Local image preview")}
    />
  ) : (
    <p>{say("جارٍ تحميل الصورة…", "Loading image…")}</p>
  );
}

function CharacterVisuals({
  snapshot,
  characterId,
  busy,
  onCommand,
  onCopy,
  onRelink,
}: {
  snapshot: BookStudioSnapshot;
  characterId: string;
  busy: boolean;
  onCommand: (c: BookCommand) => Promise<boolean>;
  onCopy: (id: string) => void;
  onRelink: (id: string) => void;
}) {
  const { say } = useStudioUi();
  const images = snapshot.images.filter(
      (i) => i.kind === "CHARACTER_SHEET" && i.characterId === characterId,
    ),
    current = images.find((i) => i.selected) ?? images.at(-1),
    prompts = snapshot.prompts.filter(
      (p) => p.slot === `character:${characterId}`,
    ),
    prompt = prompts.at(-1);
  const render = (image: (typeof images)[number]) => (
    <article key={image.imageId}>
      <p role="status">
        {image.stale
          ? say("قديمة بعد التعديل", "Stale after changes")
          : image.status === "APPROVED"
            ? say("✓ شكل الشخصية معتمد", "✓ Sheet approved")
            : say(
                "صورة مستوردة — تحتاج مراجعة",
                "Imported sheet — needs review",
              )}
      </p>
      <PrivateAssetPreview
        refreshToken={snapshot}
        projectId={snapshot.book.projectId}
        assetId={image.assetId}
      />
      <div className="studio-actions">
        {(["APPROVE", "USE", "REJECT", "ARCHIVE"] as const).map((choice, j) => (
          <button
            key={choice}
            disabled={
              busy ||
              (image.stale && (choice === "USE" || choice === "APPROVE"))
            }
            onClick={() =>
              onCommand({
                projectId: snapshot.book.projectId,
                expectedBook: snapshot.book.recordVersion,
                action: "IMAGE_DECISION",
                imageId: image.imageId,
                choice,
                notes: "",
              })
            }
          >
            {
              [
                say("اعتماد شكل الشخصية", "Approve sheet"),
                say("استخدام هذه النسخة", "Use version"),
                say("رفض", "Reject"),
                say("أرشفة", "Archive"),
              ][j]
            }
          </button>
        ))}
        <button disabled={busy} onClick={() => onRelink(image.assetId)}>
          {say("إعادة ربط الصورة", "Relink image")}
        </button>
      </div>
    </article>
  );
  return (
    <section
      id={targetElementId({ section: "images", characterId, control: "sheet" })}
      tabIndex={-1}
    >
      <h4>{say("شكل الشخصية", "Character sheet")}</h4>
      {current ? (
        render(current)
      ) : (
        <p>{say("لم تُستورد لوحة الشخصية", "No sheet imported")}</p>
      )}
      {prompt && (
        <details>
          <summary>
            {say("برومبت الشخصية الحالي", "Current character prompt")}
          </summary>
          <textarea readOnly value={prompt.text} rows={6} />
          <button disabled={busy} onClick={() => onCopy(prompt.promptId)}>
            {say("نسخ البرومبت", "Copy prompt")}
          </button>
        </details>
      )}
      <details>
        <summary>
          {say("نسخ الشخصية السابقة", "Character history")} (
          {Math.max(0, images.length - 1)})
        </summary>
        {images
          .filter((i) => i.imageId !== current?.imageId)
          .slice()
          .reverse()
          .map(render)}
      </details>
    </section>
  );
}
export function StudioImages({
  snapshot,
  busy,
  onCommand,
  onImport,
  onRelink,
  onCopy,
  target,
  onSelect,
  charactersOnly = false,
  assetRefresh = 0,
}: {
  snapshot: BookStudioSnapshot;
  busy: boolean;
  onCommand: (input: BookCommand) => Promise<boolean>;
  onImport: (input: SelectBookAssets) => void;
  onRelink: (assetId: string) => void;
  onCopy: (promptId: string) => void;
  target?: StudioTarget;
  onSelect?: (key: string) => void;
  charactersOnly?: boolean;
  assetRefresh?: number;
}) {
  const { say } = useStudioUi();
  const characters = studioCharacters(snapshot);
  const [selected, setSelected] = useState(snapshot.book.creatorProgress?.pageId ?? (snapshot.book.creatorProgress?.control === "cover" ? "cover" : "overview"));
  function select(key: string) { setSelected(key); onSelect?.(key); }
  useEffect(() => { if (charactersOnly) setSelected("characters"); else if (selected === "characters") setSelected("overview"); }, [charactersOnly]);
  const [editIdentity, setEditIdentity] = useState<IdentityPack | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [style, setStyle] = useState("");
  useEffect(() => {
    if (target?.section !== "images") return;
    setSelected(
      target.pageId ?? (target.control === "cover" ? "cover" : target.characterId ? "characters" : "overview"),
    );
    if (target.characterId && target.control === "identity") {
      const identity = snapshot.identities.find(
        (i) => i.characterId === target.characterId,
      );
      if (identity)
        setEditIdentity((current) =>
          current?.characterId === identity.characterId
            ? current
            : structuredClone(identity),
        );
    }
  }, [target]);
  const bindings = {
    projectId: snapshot.book.projectId,
    expectedBook: snapshot.book.recordVersion,
  };
  const draft = snapshot.session.workflow.drafts.find(
    (d) => d.draftId === snapshot.session.workflow.current.draftId,
  );
  const rawEdition = draft?.editions.find((e) => e.mode === snapshot.mode);
  const edition = rawEdition
    ? {
        ...rawEdition,
        pages: rawEdition.pages.map((page, index) => ({
          ...page,
          pageNumber: index + 1,
        })),
      }
    : undefined;
  const page = edition?.pages.find((p) => p.pageId === selected);
  const pageIndex = page ? edition!.pages.indexOf(page) : -1;
  const sceneReview = page ? deriveVisualIntent(page, pageIndex+1, draft!.draftId, snapshot.session.planner.currentPlanRevisionId!, snapshot.scenes.find(s=>s.pageNumber===pageIndex+1), edition!.pages[pageIndex-1], edition!.pages[pageIndex+1]).sceneReview : undefined;
  const selectedImages = snapshot.images.filter((image) =>
    selected === "characters"
      ? false
      : selected === "cover"
        ? image.kind === "COVER"
        : image.pageId === selected,
  );
  const selectedPrompts = snapshot.prompts.filter((prompt) =>
    selected === "characters"
      ? false
      : selected === "cover"
        ? prompt.kind === "COVER"
        : prompt.slot === `page:${selected}`,
  );
  function status(raw: string) {
    return (
      (
        {
          IMPORTED: say(
            "صورة مستوردة — تحتاج مراجعة",
            "Imported — review required",
          ),
          REVIEW_REQUIRED: say("تحتاج مراجعة", "Review required"),
          APPROVED: say("معتمدة", "Approved"),
          REJECTED: say("مرفوضة", "Rejected"),
          ARCHIVED: say("مؤرشفة", "Archived"),
        } as Record<string, string>
      )[raw] ?? raw
    );
  }
  function identityFor(characterId: string) {
    return snapshot.identities.find((i) => i.characterId === characterId);
  }
  return (
    <section className="studio-panel" data-testid="studio-images">
      <h2>{charactersOnly ? say("الشخصيات", "Characters") : say("الصور", "Pictures")}</h2>
      <p>
        {say(
          "جهّز البرومبت، وأرفق المراجع يدويًا في ChatGPT أو Gemini أو خدمة أخرى، ثم استورد الصورة الناتجة هنا. نص القصة والعنوان يضافان داخل حكايتي.",
          "Prepare a prompt, manually attach references in ChatGPT, Gemini or another service, then import the artwork here. Hekayti adds story and title text.",
        )}
      </p>
      <nav className="studio-project-nav">
        <button disabled={busy} aria-pressed={selected === "overview"} onClick={() => select("overview")}>{say("العودة إلى الكتاب كاملًا", "Full book overview")}</button>
        <button
          disabled={busy}
          aria-pressed={selected === "characters"}
          onClick={() => select("characters")}
        >
          {say("الشخصيات", "Characters")}
        </button>
        <button
          disabled={busy}
          aria-pressed={selected === "cover"}
          onClick={() => select("cover")}
        >
          {say("الغلاف", "Cover")}
        </button>
        {edition?.pages.map((page) => (
          <button
            disabled={busy}
            key={page.pageId}
            aria-pressed={selected === page.pageId}
            onClick={() => select(page.pageId)}
          >
            {say("صفحة", "Page")} {page.pageNumber}
          </button>
        ))}
      </nav>
      {!charactersOnly && <label><input type="checkbox" checked={snapshot.book.creatorProgress?.autoAdvance ?? true} disabled={busy} onChange={(e) => void onCommand({ ...bindings, action: "SAVE_PROGRESS", progress: { ...(snapshot.book.creatorProgress ?? { section: "images" }), autoAdvance: e.target.checked } })} />{say("انتقل تلقائيًا للصورة التالية بعد حفظ الاعتماد", "Advance after approval is saved")}</label>}
      {selected === "overview" && <BookStoryboard snapshot={snapshot} busy={busy} onSelect={select} refreshToken={assetRefresh} />}
      {selected === "characters" &&
        characters.map((character) => {
          const identity = identityFor(character.characterId);
          return (
            <article
              className="studio-panel"
              key={character.characterId}
              id={targetElementId({
                section: "images",
                characterId: character.characterId,
                control: "identity",
              })}
              tabIndex={-1}
            >
              <h3>{character.displayName}</h3>
              <p role="status">
                {say("تعريف الشخصية: ", "Definition: ")}
                {identity?.approvedProfile
                  ? say("✓ معتمد", "✓ Approved")
                  : say("يحتاج اعتماد", "Needs approval")}
              </p>
              <p>
                {say(
                  "اعتماد بيانات ومواصفات الشخصية، ثم اعتماد الصورة كمرجع ثابت لباقي صور القصة.",
                  "Approve identity rules, then approve the sheet as the visual reference for story artwork.",
                )}
              </p>
              <div id={`identity-editor-${character.characterId}`} />
              {identity && (
                <>
                  <p>
                    {identity.identityMode === "REAL_PHOTOS"
                      ? say(
                          "شخصية من صور حقيقية — مشروع خاص محلي",
                          "Photo character — private local project",
                        )
                      : say("شخصية خيالية", "Fictional character")}
                  </p>
                  <p>{identity.creatorNotes}</p>
                  <button
                    disabled={busy}
                    onClick={() => setEditIdentity(structuredClone(identity))}
                  >
                    {say("تعديل تعريف الشخصية", "Edit character definition")}
                  </button>
                </>
              )}
              <div className="studio-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    onImport({
                      ...bindings,
                      kind: "PHOTO",
                      characterId: character.characterId,
                    })
                  }
                >
                  {say("اختيار صور مرجعية", "Choose reference photos")}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    onCommand({
                      ...bindings,
                      action: "PROMPT",
                      kind: "CHARACTER_REFERENCE",
                      characterId: character.characterId,
                    })
                  }
                >
                  {say("جهّز برومبت الشخصية", "Prepare character prompt")}
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    onImport({
                      ...bindings,
                      kind: "CHARACTER_SHEET",
                      characterId: character.characterId,
                    })
                  }
                >
                  {say("استيراد لوحة الشخصية", "Import character sheet")}
                </button>
              </div>
              <p className="studio-muted">
                {say(
                  "صورة واحدة تكفي؛ يُفضّل ٣–٨ صور واضحة ومتنوعة. الصور تبقى على جهازك ولا تُرفع تلقائيًا. لا يمكن ضمان تطابق كامل.",
                  "One photo is enough; 3–8 clear varied photos are recommended. Photos remain local and are never uploaded automatically. Exact likeness cannot be guaranteed.",
                )}
              </p>
              <div className="studio-choice-grid">
                {identity?.referenceAssets.map((assetId) => (
                  <article key={assetId}>
                    <PrivateAssetPreview
                      refreshToken={snapshot}
                      projectId={snapshot.book.projectId}
                      assetId={assetId}
                    />
                    <button disabled={busy} onClick={() => onRelink(assetId)}>
                      {say("إعادة ربط الصورة", "Relink image")}
                    </button>
                  </article>
                ))}
              </div>
              <CharacterVisuals
                snapshot={snapshot}
                characterId={character.characterId}
                busy={busy}
                onCommand={onCommand}
                onCopy={onCopy}
                onRelink={onRelink}
              />
            </article>
          );
        })}
      {editIdentity &&
        typeof document !== "undefined" &&
        document.getElementById(
          `identity-editor-${editIdentity.characterId}`,
        ) &&
        createPortal(
          <section className="studio-panel">
            <h3>{say("تعريف الشخصية", "Character definition")}</h3>
            <p>
              {say(
                "تغيير التعريف ينشئ نسخة جديدة؛ راجع الصور المعتمدة التي تعتمد عليه.",
                "Changes create a new definition revision; review artwork that depends on it.",
              )}
            </p>
            <label>
              {say("الاسم", "Name")}
              <input
                dir="auto"
                value={editIdentity.name}
                onChange={(e) =>
                  setEditIdentity({ ...editIdentity, name: e.target.value })
                }
              />
            </label>
            <label>
              {say("درجة التشابه", "Likeness")}
              <select
                value={editIdentity.likeness}
                onChange={(e) =>
                  setEditIdentity({
                    ...editIdentity,
                    likeness: e.target.value as IdentityPack["likeness"],
                  })
                }
              >
                <option value="NATURAL">{say("تشابه طبيعي", "Natural")}</option>
                <option value="STRONG">{say("تشابه قوي", "Strong")}</option>
                <option value="CLOSEST">
                  {say("أقرب تطابق ممكن", "Closest possible")}
                </option>
              </select>
            </label>
            <label>
              {say("ملاحظاتك عن الشخصية", "Your character notes")}
              <textarea
                dir="auto"
                value={editIdentity.creatorNotes}
                maxLength={4000}
                onChange={(e) =>
                  setEditIdentity({
                    ...editIdentity,
                    creatorNotes: e.target.value,
                  })
                }
              />
            </label>
            <details>
              <summary>
                {say(
                  "التفاصيل التقنية لتعريف الشخصية",
                  "Technical character rules",
                )}
              </summary>
              {(
                [
                  "hairRule",
                  "appearanceRule",
                  "faceRule",
                  "clothingRule",
                  "proportionsRule",
                  "accessoryRule",
                  "styleAllowance",
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  {
                    [
                      say("الشعر", "Hair"),
                      say(
                        "المظهر الذي يجب الحفاظ عليه",
                        "Appearance preservation",
                      ),
                      say("ملامح الوجه", "Face"),
                      say("الملابس", "Clothing"),
                      say("نسب الجسم", "Body proportions"),
                      say("الإكسسوارات", "Accessories"),
                      say("التحويل إلى أسلوب الرسم", "Style transformation"),
                    ][i]
                  }
                  <textarea
                    dir="auto"
                    value={editIdentity[key]}
                    maxLength={4000}
                    onChange={(e) =>
                      setEditIdentity({
                        ...editIdentity,
                        [key]: e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </details>
            <div className="studio-actions">
              <button
                disabled={busy}
                onClick={async () => {
                  const saved = await onCommand({
                    ...bindings,
                    action: "IDENTITY",
                    identity: {
                      ...editIdentity,
                      revisionId: crypto.randomUUID(),
                      approvedProfile: true,
                    },
                  });
                  if (saved) setEditIdentity(null);
                }}
              >
                {say(
                  "حفظ واعتماد تعريف الشخصية",
                  "Save and approve character definition",
                )}
              </button>
              <button onClick={() => setEditIdentity(null)}>
                {say("إلغاء", "Cancel")}
              </button>
            </div>
          </section>,
          document.getElementById(
            `identity-editor-${editIdentity.characterId}`,
          )!,
        )}
      {selected !== "characters" && selected !== "overview" && (
        <>
          <div
            id={targetElementId({
              section: "images",
              pageId: page?.pageId,
              control: selected === "cover" ? "cover" : "image",
            })}
            tabIndex={-1}
          />
          {page && (
            <article>
              <h3>
                {say("صفحة", "Page")} {page.pageNumber}
              </h3>
              <p dir="auto">{page.narration}</p>
              {page.dialogue.map((dialogue, i) => (
                <p key={i} dir="auto">
                  {
                    characters.find((c) => c.characterId === dialogue.speakerId)
                      ?.displayName
                  }
                  : {dialogue.text}
                </p>
              ))}
              <details>
                <summary>
                  {say("ما يظهر في المشهد", "Scene continuity")}
                </summary>
                {snapshot.scenes
                  .find((s) => s.pageNumber === page.pageNumber)
                  ?.after.map((entity) => (
                    <p key={entity.entityId}>
                      {entity.name}: {entity.state} · {entity.location}
                    </p>
                  ))}
              </details>
            </article>
          )}
          {page && (
            <PageCompositionPlan
              snapshot={snapshot}
              pageId={page.pageId}
              onCommand={onCommand}
              busy={busy}
            />
          )}
          <div className="studio-actions">
            <button
              disabled={busy || !draft}
              onClick={() =>
                onCommand({
                  ...bindings,
                  action: "PROMPT",
                  kind: selected === "cover" ? "COVER" : "PAGE",
                  ...(selected === "cover" ? {} : { pageId: selected }),
                })
              }
            >
              {say("جهّز برومبت الصورة", "Prepare image prompt")}
            </button>
            <button
              disabled={busy || !draft}
              onClick={() =>
                onImport({
                  ...bindings,
                  kind: selected === "cover" ? "COVER" : "PAGE",
                  ...(selected === "cover" ? {} : { pageId: selected }),
                })
              }
            >
              {say("استيراد صورة جديدة", "Import new image")}
            </button>
          </div>
        </>
      )}
      {selectedPrompts.map((prompt) => (
        <article className="studio-panel" key={prompt.promptId}>
          <h3>{say("البرومبت جاهز", "Prompt ready")}</h3>
          <p dir="auto">{prompt.summary}</p>
          <p>{say("أرفق المراجع التالية يدويًا مع هذا البرومبت؛ لا تُنقل الصور تلقائيًا.", "Manually attach these exact prompt references; images are never transferred automatically.")}</p>
          <ul>{prompt.binding.identityRevisions.map((revisionId) => {
            const identity = snapshot.book.identities.find((i) => i.revisionId === revisionId);
            if (!identity) return null;
            const current = snapshot.identities.find((i) => i.characterId === identity.characterId);
            const sheet = snapshot.images.find((i) => prompt.binding.sheetVersions.includes(i.imageId) && i.characterId === identity.characterId);
            return <li key={revisionId}><strong>{identity.name}</strong>: {identity.identityMode === "REAL_PHOTOS" ? say(`مطلوب — صور الهوية المرجعية المعتمدة (${identity.referenceAssets.length})`, `Required — approved identity photos (${identity.referenceAssets.length})`) : say("غير مطلوب — صور هوية لشخصية خيالية", "Not needed — identity photos for a fictional character")}{prompt.kind !== "CHARACTER_REFERENCE" && <span> · {say("مطلوب — لوحة الشخصية المرتبطة بهذا البرومبت", "Required — character sheet bound to this prompt")}{!sheet || !sheet.selected || sheet.stale || sheet.status !== "APPROVED" ? say("؛ المرجع يحتاج تحديث البرومبت أو اعتمادًا", "; update prompt or approve its reference") : " ✓"}</span>}{current?.revisionId !== revisionId || !identity.approvedProfile ? <span className="studio-warning"> · {say("تعريف قديم أو غير معتمد؛ جهّز برومبتًا جديدًا", "Old or unapproved definition; prepare a new prompt")}</span> : null}</li>;
          })}</ul>
          <p>{say("غير مطلوب: مراجع الشخصيات التي لا تظهر في هذه الصفحة.", "Not needed: references for characters absent from this page.")}</p>
          {page && <p>{say("اختياري: صورة الصفحة السابقة المعتمدة لتوضيح استمرار المشهد، إذا كانت في المكان نفسه. لا تستبدل بها لوحة الشخصية.", "Optional: approved preceding page for continuity when it shares this setting. Keep the character sheet as design authority.")}</p>}
          <details>
            <summary>{say("عرض البرومبت", "Show prompt")}</summary>
            <textarea readOnly rows={10} dir="auto" value={prompt.text} />
          </details>
          <button disabled={busy} onClick={() => onCopy(prompt.promptId)}>
            {say("نسخ البرومبت", "Copy prompt")}
          </button>
        </article>
      ))}
      {selectedImages.length === 0 && selected !== "overview" && (
        <p>
          {say(
            "لم تُستورد صورة لهذا الموضع بعد.",
            "No image imported for this slot yet.",
          )}
        </p>
      )}
      <div className="studio-asset-history">
        {selectedImages
          .slice()
          .reverse()
          .map((image, i) => {
            const asset = snapshot.book.assets.find(
              (a) => a.assetId === image.assetId,
            );
            const size = snapshot.layout?.settings;
            const resolution =
              asset && size && image.kind !== "CHARACTER_SHEET"
                ? printResolution(asset, size)
                : null;
            return (
              <article key={image.imageId}>
                <h3>
                  {say("نسخة صورة", "Image version")}{" "}
                  {selectedImages.length - i} · {status(image.status)}
                </h3>
                {image.selected && (
                  <p className="studio-muted">
                    {say(
                      "الصورة المستخدمة حاليًا لهذا الموضع",
                      "Currently selected artwork for this slot",
                    )}
                  </p>
                )}
                {image.stale && (
                  <p className="studio-warning">
                    {say(
                      "قديمة بعد تعديل القصة أو الشخصية. راجعها واستورد نسخة مناسبة قبل الاعتماد.",
                      "Stale after story or character changes. Review and import a suitable revision before approval.",
                    )}
                  </p>
                )}
                <PrivateAssetPreview
                  refreshToken={snapshot}
                  projectId={snapshot.book.projectId}
                  assetId={image.assetId}
                />
                {asset && (
                  <p>
                    {asset.width} × {asset.height} {say("بكسل", "pixels")}
                  </p>
                )}
                {resolution !== null && (
                  <p
                    className={
                      resolution.low ? "studio-warning" : "studio-muted"
                    }
                  >
                    {say(
                      "دقة الطباعة التقريبية",
                      "Approximate print resolution",
                    )}
                    : {resolution.dpi} {say("نقطة/بوصة", "DPI")}
                    {resolution.low
                      ? " — " +
                        say(
                          "منخفضة للمقاس الحالي؛ يُفضّل استيراد صورة أعلى دقة قبل الطباعة.",
                          "Low for the current size; import higher-resolution artwork before printing.",
                        )
                      : ""}
                  </p>
                )}
                <p>
                  {say(
                    "راجع: تشابه الشخصية وثبات شكلها وملابسها، مطابقة المشهد والأدوات، وعدم وجود عناصر زائدة، ومناسبة العمر.",
                    "Review likeness, character consistency and clothing, scene and props, extra elements, and age suitability.",
                  )}
                </p>
                {image.kind === "PAGE" && sceneReview && <section data-testid="scene-image-checklist"><h4>{say("راجع الصورة قبل اعتمادها", "Review the image before approval")}</h4><ul><li>{say("هل الحدث الصحيح ظاهر؟ ", "Is the correct event shown? ")}{sceneReview.mustShow.join("؛ ")}</li><li>{say("هل حالة الأشياء مطابقة للصفحة؟ ", "Do object states match? ")}{sceneReview.after}</li><li>{say("هل حدث من صفحة تالية ظهر بدري؟ ", "Is a later event shown too early? ")}{sceneReview.mustNotShow.join("؛ ")}</li><li>{say("هل الشخصيات والأشياء ثابتة دون تغيير أو إعادة غير مبررة؟", "Are characters and props consistent without unexplained resets?")}</li><li>{say("هل مساحة النص مناسبة وبعيدة عن الفعل والوجوه؟", "Is text space clear of the action and faces?")}</li></ul>{sceneReview.warnings.map((w,j)=><p className="studio-warning" key={j}>{w}</p>)}<p>{say("أنت المسؤول عن المراجعة البصرية؛ التطبيق لا يتعرف على محتوى الصورة آليًا.", "You perform visual review; the app does not recognize image content.")}</p></section>}
                <label>
                  {say("ملاحظات المراجعة", "Review notes")}
                  <textarea
                    maxLength={2000}
                    dir="auto"
                    value={notes[image.imageId] ?? ""}
                    onChange={(e) =>
                      setNotes({ ...notes, [image.imageId]: e.target.value })
                    }
                  />
                </label>
                <div className="studio-actions">
                  {(["USE", "APPROVE", "REJECT", "ARCHIVE"] as const).map(
                    (choice, j) => (
                      <button
                        key={choice}
                        disabled={
                          busy ||
                          ((choice === "APPROVE" || choice === "USE") &&
                            image.stale)
                        }
                        onClick={() =>
                          onCommand({
                            ...bindings,
                            action: "IMAGE_DECISION",
                            imageId: image.imageId,
                            choice,
                            notes: notes[image.imageId] ?? "",
                          })
                        }
                      >
                        {
                          [
                            say("استخدام", "Use"),
                            say(
                              image.kind === "CHARACTER_SHEET"
                                ? "اعتماد شكل الشخصية"
                                : "اعتماد الصورة",
                              "Approve",
                            ),
                            say("رفض", "Reject"),
                            say("أرشفة", "Archive"),
                          ][j]
                        }
                      </button>
                    ),
                  )}
                  <button
                    disabled={busy}
                    onClick={() => onRelink(image.assetId)}
                  >
                    {say("إعادة ربط الصورة", "Relink image")}
                  </button>
                </div>
                <details>
                  <summary>
                    {say("التفاصيل التقنية", "Technical details")}
                  </summary>
                  <pre dir="ltr">
                    {JSON.stringify(
                      {
                        imageId: image.imageId,
                        binding: image.binding,
                        reasons: image.reasons,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </article>
            );
          })}
      </div>
      <details>
        <summary>{say("أسلوب الرسم", "Illustration style")}</summary>
        <label>
          {say("وصف الأسلوب", "Style description")}
          <textarea
            dir="auto"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          />
        </label>
        <details>
          <summary>
            {say(
              "التفاصيل التقنية للأسلوب الحالي",
              "Current style technical details",
            )}
          </summary>
          <p dir="auto">{snapshot.book.styles.at(-1)?.description}</p>
        </details>
        <button
          disabled={busy || !style.trim()}
          onClick={() =>
            onCommand({ ...bindings, action: "STYLE", description: style })
          }
        >
          {say("حفظ أسلوب جديد", "Save new style")}
        </button>
      </details>
    </section>
  );
}
