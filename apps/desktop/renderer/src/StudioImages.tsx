import { useEffect, useState } from "react";
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
}: {
  projectId: string;
  assetId: string;
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
  }, [projectId, assetId]);
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

export function StudioImages({
  snapshot,
  busy,
  onCommand,
  onImport,
  onRelink,
  onCopy,
}: {
  snapshot: BookStudioSnapshot;
  busy: boolean;
  onCommand: (input: BookCommand) => Promise<boolean>;
  onImport: (input: SelectBookAssets) => void;
  onRelink: (assetId: string) => void;
  onCopy: (promptId: string) => void;
}) {
  const { say } = useStudioUi();
  const characters = studioCharacters(snapshot);
  const [selected, setSelected] = useState("characters");
  const [editIdentity, setEditIdentity] = useState<IdentityPack | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [style, setStyle] = useState("");
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
  const selectedImages = snapshot.images.filter((image) =>
    selected === "characters"
      ? image.kind === "CHARACTER_SHEET"
      : selected === "cover"
        ? image.kind === "COVER"
        : image.pageId === selected,
  );
  const selectedPrompts = snapshot.prompts.filter((prompt) =>
    selected === "characters"
      ? prompt.kind === "CHARACTER_REFERENCE"
      : selected === "cover"
        ? prompt.kind === "COVER"
        : prompt.slot.includes(selected),
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
      <h2>{say("الصور", "Pictures")}</h2>
      <p>
        {say(
          "جهّز البرومبت، وأرفق المراجع يدويًا في ChatGPT أو Gemini أو خدمة أخرى، ثم استورد الصورة الناتجة هنا. نص القصة والعنوان يضافان داخل حكايتي.",
          "Prepare a prompt, manually attach references in ChatGPT, Gemini or another service, then import the artwork here. Hekayti adds story and title text.",
        )}
      </p>
      <nav className="studio-project-nav">
        <button
          aria-pressed={selected === "characters"}
          onClick={() => setSelected("characters")}
        >
          {say("الشخصيات", "Characters")}
        </button>
        <button
          aria-pressed={selected === "cover"}
          onClick={() => setSelected("cover")}
        >
          {say("الغلاف", "Cover")}
        </button>
        {edition?.pages.map((page) => (
          <button
            key={page.pageId}
            aria-pressed={selected === page.pageId}
            onClick={() => setSelected(page.pageId)}
          >
            {say("صفحة", "Page")} {page.pageNumber}
          </button>
        ))}
      </nav>
      {selected === "characters" &&
        characters.map((character) => {
          const identity = identityFor(character.characterId);
          return (
            <article className="studio-panel" key={character.characterId}>
              <h3>{character.displayName}</h3>
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
                      projectId={snapshot.book.projectId}
                      assetId={assetId}
                    />
                    <button disabled={busy} onClick={() => onRelink(assetId)}>
                      {say("إعادة ربط الصورة", "Relink image")}
                    </button>
                  </article>
                ))}
              </div>
            </article>
          );
        })}
      {editIdentity && (
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
                    setEditIdentity({ ...editIdentity, [key]: e.target.value })
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
        </section>
      )}
      {selected !== "characters" && (
        <>
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
          <p>
            {say(
              "أرفق الصور المرجعية المعتمدة ولوحة الشخصية يدويًا مع البرومبت. لا تُنقل الصور تلقائيًا.",
              "Manually attach approved reference photos and character sheets. Images are not transferred automatically.",
            )}
          </p>
          <details>
            <summary>{say("عرض البرومبت", "Show prompt")}</summary>
            <textarea readOnly rows={10} dir="auto" value={prompt.text} />
          </details>
          <button disabled={busy} onClick={() => onCopy(prompt.promptId)}>
            {say("نسخ البرومبت", "Copy prompt")}
          </button>
        </article>
      ))}
      {selectedImages.length === 0 && (
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
