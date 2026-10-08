import { useState } from "react";
import type {
  BookCommand,
  BookStudioSnapshot,
  BookIntent,
} from "@hekayti/contracts/book";
import type { StoryReaderModel } from "@hekayti/contracts/creator";
import type { WriterPreview } from "@hekayti/contracts/planner";
import { PlanNotices } from "./SimplePlanPreview";
import { ReaderPageText } from "./SimpleReader";
import { WriterResponseFeedback } from "./WriterResponseFeedback";
import { movePathStep, studioCharacters, useStudioUi } from "./studio-ui";

export type StudioAction = Omit<
  Extract<BookCommand, { action: "EDIT_STORY" }>,
  "projectId" | "expectedBook"
>;
export function StudioStory({
  snapshot,
  reader,
  busy,
  onCommand,
  onRead,
  onPrepare,
  onCopy,
  onPreview,
  onImport,
  preview,
  writerText,
}: {
  snapshot: BookStudioSnapshot;
  reader: StoryReaderModel | null;
  busy: boolean;
  onCommand: (command: BookCommand) => Promise<boolean>;
  onRead: (draftId?: string, mode?: StoryReaderModel["mode"]) => void;
  onPrepare: () => void;
  onCopy: (provider: "GEMINI" | "CHATGPT" | "GENERIC") => void;
  onPreview: (json: string) => void;
  onImport: (json: string, provider: "GEMINI" | "CHATGPT" | "OTHER") => void;
  preview: WriterPreview | null;
  writerText: string;
}) {
  const { say, label } = useStudioUi();
  const [edit, setEdit] = useState<StudioAction | null>(null);
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [raw, setRaw] = useState("");
  const [provider, setProvider] = useState<"GEMINI" | "CHATGPT" | "OTHER">(
    "GEMINI",
  );
  const [writerOpen, setWriterOpen] = useState(false);
  const [intent, setIntent] = useState<BookIntent | null>(null);
  const [ratings, setRatings] = useState({
    naturalness: 3,
    enjoyment: 3,
    logic: 3,
    ageFit: 3,
    rhythm: 3,
  });
  const bindings = {
    projectId: snapshot.book.projectId,
    expectedBook: snapshot.book.recordVersion,
  };
  const currentIntent = snapshot.book.intents.at(-1)?.intent;
  function startEdit() {
    const draft = snapshot.session.workflow.drafts.find(
      (x) => x.draftId === reader?.draftId,
    );
    const edition = draft?.editions.find((x) => x.mode === reader?.mode);
    if (!edition || !reader) return;
    setEdit({
      action: "EDIT_STORY",
      draftId: reader.draftId,
      title: reader.title,
      mode: reader.mode,
      pages: edition.pages.map((p, index) => ({
        pageNumber: index + 1,
        narration: p.narration,
        dialogue: p.dialogue.map((d) => ({
          speakerId: d.speakerId,
          text: d.text,
        })),
        altText: p.altText,
      })),
    });
  }
  const characters = studioCharacters(snapshot);
  return (
    <section className="studio-panel" data-testid="studio-story">
      {reader ? (
        <>
          <h2 dir="auto">{reader.title}</h2>
          <p>
            {reader.ageMonths} {say("شهر", "months")} · {label(reader.mode)} ·{" "}
            {say(
              reader.review.approved ? "القصة معتمدة" : "القصة تنتظر مراجعتك",
              reader.review.approved
                ? "Story approved"
                : "Awaiting your review",
            )}
          </p>
          <div className="studio-actions">
            <button disabled={busy || reader.historical} onClick={startEdit}>
              {say("تعديل القصة", "Edit story")}
            </button>
            <button
              disabled={
                busy || reader.historical || !!edit || !reader.review.qaReady
              }
              id="studio-target-approval-current"
              onClick={() =>
                onCommand({
                  ...bindings,
                  action: "APPROVE_STORY",
                  draftId: reader.draftId,
                })
              }
            >
              {say("اعتماد القصة", "Approve story")}
            </button>
            <button onClick={() => setAll(!all)}>
              {say(
                all ? "صفحة بصفحة" : "عرض القصة كاملة",
                all ? "Page by page" : "Whole story",
              )}
            </button>
            <button onClick={() => setWriterOpen(!writerOpen)}>
              {say("نسخة جديدة مع كاتب خارجي", "New external writer draft")}
            </button>
          </div>
          <label>
            {say("نسخ القصة", "Story revisions")}
            <select
              value={reader.draftId}
              disabled={busy || !!edit}
              onChange={(e) => {
                setIndex(0);
                onRead(e.target.value);
              }}
            >
              {reader.drafts
                .filter((d) => d.modes.includes(reader.mode))
                .map((d) => (
                  <option key={d.draftId} value={d.draftId}>
                    {say("نسخة", "Revision")} {d.number}
                    {d.current ? ` — ${say("الحالية", "current")}` : ""}
                  </option>
                ))}
            </select>
          </label>
          {reader.availableModes.length > 1 && (
            <div className="studio-actions">
              {reader.availableModes.map((mode) => (
                <button
                  disabled={busy || !!edit}
                  key={mode}
                  aria-pressed={reader.mode === mode}
                  onClick={() =>
                    onRead(reader.draftId, mode as StoryReaderModel["mode"])
                  }
                >
                  {label(mode)}
                </button>
              ))}
            </div>
          )}
          {edit ? (
            <>
              <label>
                {say("عنوان القصة", "Story title")}
                <input
                  dir="auto"
                  value={edit.title}
                  maxLength={200}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </label>
              {edit.pages.map((page, pageIndex) => (
                <article className="reader-page" key={page.pageNumber}>
                  <h3>
                    {say("صفحة", "Page")} {page.pageNumber}
                  </h3>
                  <label>
                    {say("السرد", "Narration")}
                    <textarea
                      dir="auto"
                      maxLength={8000}
                      value={page.narration}
                      onChange={(e) =>
                        setEdit({
                          ...edit,
                          pages: edit.pages.map((old, i) =>
                            i === pageIndex
                              ? { ...old, narration: e.target.value }
                              : old,
                          ),
                        })
                      }
                    />
                  </label>
                  {page.dialogue.map((dialogue, dialogueIndex) => (
                    <div key={dialogueIndex}>
                      <label>
                        {say("المتحدث", "Speaker")}
                        <select
                          value={dialogue.speakerId}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              pages: edit.pages.map((old, i) =>
                                i === pageIndex
                                  ? {
                                      ...old,
                                      dialogue: old.dialogue.map((d, j) =>
                                        j === dialogueIndex
                                          ? { ...d, speakerId: e.target.value }
                                          : d,
                                      ),
                                    }
                                  : old,
                              ),
                            })
                          }
                        >
                          {characters.map((character) => (
                            <option
                              key={character.characterId}
                              value={character.characterId}
                            >
                              {character.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        {say("الحوار", "Dialogue")}
                        <textarea
                          dir="auto"
                          maxLength={2000}
                          value={dialogue.text}
                          onChange={(e) =>
                            setEdit({
                              ...edit,
                              pages: edit.pages.map((old, i) =>
                                i === pageIndex
                                  ? {
                                      ...old,
                                      dialogue: old.dialogue.map((d, j) =>
                                        j === dialogueIndex
                                          ? { ...d, text: e.target.value }
                                          : d,
                                      ),
                                    }
                                  : old,
                              ),
                            })
                          }
                        />
                      </label>
                      <button
                        onClick={() =>
                          setEdit({
                            ...edit,
                            pages: edit.pages.map((old, i) =>
                              i === pageIndex
                                ? {
                                    ...old,
                                    dialogue: old.dialogue.filter(
                                      (_, j) => j !== dialogueIndex,
                                    ),
                                  }
                                : old,
                            ),
                          })
                        }
                      >
                        {say("حذف الحوار", "Remove dialogue")}
                      </button>
                    </div>
                  ))}
                  <button
                    disabled={!characters.length || page.dialogue.length >= 20}
                    onClick={() =>
                      setEdit({
                        ...edit,
                        pages: edit.pages.map((old, i) =>
                          i === pageIndex
                            ? {
                                ...old,
                                dialogue: [
                                  ...old.dialogue,
                                  {
                                    speakerId: characters[0]!.characterId,
                                    text: "",
                                  },
                                ],
                              }
                            : old,
                        ),
                      })
                    }
                  >
                    {say("إضافة حوار", "Add dialogue")}
                  </button>
                </article>
              ))}
              <p>
                {say(
                  "الحفظ ينشئ نسخة جديدة ويحتفظ بكل النسخ السابقة. راجع الصور والتصميم المتأثرين بالتعديل.",
                  "Saving creates a new revision and preserves history. Review affected artwork and layout.",
                )}
              </p>
              <div className="studio-actions">
                <button
                  disabled={busy || !edit.title.trim()}
                  onClick={async () => {
                    if (await onCommand({ ...bindings, ...edit }))
                      setEdit(null);
                  }}
                >
                  {say("حفظ نسخة جديدة", "Save new revision")}
                </button>
                <button onClick={() => setEdit(null)}>
                  {say("إلغاء", "Cancel")}
                </button>
              </div>
            </>
          ) : (
            <>
              {all
                ? reader.pages.map((page) => (
                    <ReaderPageText key={page.pageId} page={page} />
                  ))
                : reader.pages[index] && (
                    <ReaderPageText page={reader.pages[index]!} />
                  )}
              {!all && (
                <div className="studio-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => setIndex(index - 1)}
                  >
                    {say("السابق", "Previous")}
                  </button>
                  <span>
                    {index + 1} / {reader.pages.length}
                  </span>
                  <button
                    disabled={index >= reader.pages.length - 1}
                    onClick={() => setIndex(index + 1)}
                  >
                    {say("التالي", "Next")}
                  </button>
                </div>
              )}
            </>
          )}
          <PlanNotices notices={reader.notices} />
          <details>
            <summary>
              {say("تقييم اختياري للقصة", "Optional editorial ratings")}
            </summary>
            <div className="studio-choice-grid">
              {(
                [
                  "naturalness",
                  "enjoyment",
                  "logic",
                  "ageFit",
                  "rhythm",
                ] as const
              ).map((key, i) => (
                <label key={key}>
                  {
                    [
                      say("طبيعية اللغة", "Natural language"),
                      say("متعة القصة", "Enjoyment"),
                      say("منطق الأحداث", "Event logic"),
                      say("مناسبة العمر", "Age suitability"),
                      say("الإيقاع", "Rhythm"),
                    ][i]
                  }
                  <select
                    value={ratings[key]}
                    onChange={(e) =>
                      setRatings({ ...ratings, [key]: Number(e.target.value) })
                    }
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <button
              disabled={busy}
              onClick={() =>
                onCommand({
                  ...bindings,
                  action: "RATE",
                  ratings: { draftId: reader.draftId, ...ratings },
                })
              }
            >
              {say("حفظ التقييم", "Save ratings")}
            </button>
            <p className="studio-muted">
              {say(
                "رأيك للمراجعة المستقبلية؛ لا يدرب نموذجًا ولا ينشر القصة.",
                "Your editorial opinion is retained for future review; it does not train a model or publish the story.",
              )}
            </p>
          </details>
        </>
      ) : (
        <>
          <h2>{snapshot.session.presentation.title}</h2>
          <p>
            {say(
              "راجع المسار، ثم جهّز النص للكتابة اليدوية باستخدام خدمة خارجية.",
              "Review the path, then prepare the manual external writer prompt.",
            )}
          </p>
          <ol>
            {snapshot.scenes.map((scene) => (
              <li key={scene.beatId} dir="auto">
                {scene.intent}
              </li>
            ))}
          </ol>
        </>
      )}
      {currentIntent && (
        <details>
          <summary>
            {say("تعديل فكرة ومسار القصة", "Edit idea and path")}
          </summary>
          <button onClick={() => setIntent(structuredClone(currentIntent))}>
            {say("تعديل المسار", "Edit path")}
          </button>
          {intent && (
            <>
              <label>
                {say("الفكرة", "Idea")}
                <textarea
                  dir="auto"
                  value={intent.idea.text}
                  onChange={(e) =>
                    setIntent({
                      ...intent,
                      idea: { source: "CUSTOM", text: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                {say("طريقة المسار", "Path mode")}
                <select
                  value={intent.path.mode}
                  onChange={(e) =>
                    setIntent({
                      ...intent,
                      path: {
                        ...intent.path,
                        mode: e.target.value as BookIntent["path"]["mode"],
                      },
                    })
                  }
                >
                  <option value="AUTO">{say("تلقائي", "Automatic")}</option>
                  <option value="CUSTOM">
                    {say("أبني المسار بنفسي", "Custom")}
                  </option>
                  {intent.path.key && (
                    <option value="GUIDED">
                      {say("المسار المختار", "Selected path")}
                    </option>
                  )}
                </select>
              </label>
              {intent.path.mode === "CUSTOM" && (
                <>
                  {intent.path.steps.map((text, i) => (
                    <div className="studio-path-step" key={i}>
                      <textarea
                        dir="auto"
                        value={text}
                        onChange={(e) =>
                          setIntent({
                            ...intent,
                            path: {
                              ...intent.path,
                              steps: intent.path.steps.map((old, j) =>
                                i === j ? e.target.value : old,
                              ),
                            },
                          })
                        }
                      />
                      <div>
                        <button
                          disabled={i === 0}
                          onClick={() =>
                            setIntent({
                              ...intent,
                              path: {
                                ...intent.path,
                                steps: movePathStep(intent.path.steps, i, -1),
                              },
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          disabled={i === intent.path.steps.length - 1}
                          onClick={() =>
                            setIntent({
                              ...intent,
                              path: {
                                ...intent.path,
                                steps: movePathStep(intent.path.steps, i, 1),
                              },
                            })
                          }
                        >
                          ↓
                        </button>
                        <button
                          onClick={() =>
                            setIntent({
                              ...intent,
                              path: {
                                ...intent.path,
                                steps: intent.path.steps.filter(
                                  (_, j) => i !== j,
                                ),
                              },
                            })
                          }
                        >
                          {say("حذف", "Delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      setIntent({
                        ...intent,
                        path: {
                          ...intent.path,
                          steps: [...intent.path.steps, ""],
                        },
                      })
                    }
                  >
                    {say("إضافة خطوة", "Add step")}
                  </button>
                </>
              )}
              <p>
                {say(
                  "تغيير الأحداث ينشئ مسارًا ونسخة قصة جديدين؛ تبقى النسخ القديمة محفوظة.",
                  "Changing events creates a new path and story revision; older versions remain saved.",
                )}
              </p>
              <button
                disabled={
                  busy ||
                  !intent.idea.text.trim() ||
                  (intent.path.mode === "CUSTOM" &&
                    (intent.path.steps.length < 2 ||
                      intent.path.steps.some((x) => !x.trim())))
                }
                onClick={async () => {
                  if (
                    await onCommand({
                      ...bindings,
                      action: "EDIT_PATH",
                      intent,
                    })
                  )
                    setIntent(null);
                }}
              >
                {say("حفظ المسار الجديد", "Save new path")}
              </button>
            </>
          )}
        </details>
      )}
      {(!reader || writerOpen) && (
        <section className="studio-panel">
          <h3>{say("كتابة القصة", "Write story")}</h3>
          <p>
            {say(
              "جهّز النص وانسخه، ثم استخدم الخدمة يدويًا والصق الرد هنا. لا يوجد اتصال تلقائي أو اشتراك API.",
              "Prepare and copy the prompt, use the service manually, then paste its response. No automatic connection or API.",
            )}
          </p>
          <button disabled={busy} onClick={onPrepare}>
            {say("جهّز برومبت القصة", "Prepare writer prompt")}
          </button>
          {writerText && (
            <>
              <details>
                <summary>{say("نص البرومبت", "Writer prompt")}</summary>
                <textarea readOnly dir="auto" rows={10} value={writerText} />
              </details>
              <div className="studio-actions">
                <button disabled={busy} onClick={() => onCopy("GEMINI")}>
                  {say("نسخ لـ Gemini", "Copy for Gemini")}
                </button>
                <button disabled={busy} onClick={() => onCopy("CHATGPT")}>
                  {say("نسخ لـ ChatGPT", "Copy for ChatGPT")}
                </button>
                <button disabled={busy} onClick={() => onCopy("GENERIC")}>
                  {say("نسخ النص", "Copy prompt")}
                </button>
              </div>
              <label>
                {say("الصق رد الكاتب", "Paste writer response")}
                <textarea
                  dir="auto"
                  rows={8}
                  maxLength={500000}
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                />
              </label>
              <label>
                {say("الخدمة المستخدمة", "Writer service")}
                <select
                  value={provider}
                  onChange={(e) =>
                    setProvider(e.target.value as typeof provider)
                  }
                >
                  <option value="GEMINI">Gemini</option>
                  <option value="CHATGPT">ChatGPT</option>
                  <option value="OTHER">{say("خدمة أخرى", "Other")}</option>
                </select>
              </label>
              <div className="studio-actions">
                <button
                  disabled={busy || !raw.trim()}
                  onClick={() => onPreview(raw)}
                >
                  {say("معاينة الرد", "Preview response")}
                </button>
                <button
                  disabled={busy || !raw.trim()}
                  onClick={() => onImport(raw, provider)}
                >
                  {say("استيراد القصة", "Import story")}
                </button>
              </div>
              {preview && <WriterResponseFeedback preview={preview} />}
            </>
          )}
        </section>
      )}
    </section>
  );
}
