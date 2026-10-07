import { useEffect, useRef, useState } from "react";
import type {
  BookCommand,
  BookDefaults,
  BookStudioSnapshot,
  SelectBookAssets,
} from "@hekayti/contracts/book";
import type {
  SimpleCommand,
  SimpleCreateInput,
  SimpleDefaults,
  SimpleStoryList,
  StoryReaderModel,
} from "@hekayti/contracts/creator";
import type { WriterPreview } from "@hekayti/contracts/planner";
import type { Result } from "../../src/api";
import { UiLanguageSwitch } from "./UiLanguage";
import { BookCreateFlow } from "./BookCreateFlow";
import { StudioStory } from "./StudioStory";
import { StudioImages } from "./StudioImages";
import { BookComposer } from "./BookComposer";
import { useStudioUi } from "./studio-ui";

export function BookStudioApp() {
  const { say, label } = useStudioUi();
  const [home, setHome] = useState<"new" | "books" | "library" | "settings">(
    "new",
  );
  const [tab, setTab] = useState<"story" | "images" | "book">("story");
  const [simple, setSimple] = useState<SimpleDefaults | null>(null);
  const [choices, setChoices] = useState<BookDefaults | null>(null);
  const [snapshot, setSnapshot] = useState<BookStudioSnapshot | null>(null);
  const [reader, setReader] = useState<StoryReaderModel | null>(null);
  const [stories, setStories] = useState<SimpleStoryList | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [status, setStatus] = useState("");
  const [writerText, setWriterText] = useState("");
  const [preview, setPreview] = useState<WriterPreview | null>(null);
  const choiceSequence = useRef(0);
  const busyRef = useRef(false);
  async function unwrap<T>(
    promise: Promise<Result<T>>,
  ): Promise<T | undefined> {
    const result = await promise;
    if (!result.ok) {
      setError(result.error.code);
      setErrorMessage(
        /[\u0600-\u06ff]/.test(result.error.message)
          ? result.error.message
          : undefined,
      );
      return;
    }
    return result.value;
  }
  async function run<T>(action: () => Promise<T>): Promise<T | undefined> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    setErrorMessage(undefined);
    setStatus("");
    try {
      return await action();
    } catch {
      setError("BOOK_ACTION");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function loadChoices(
    ageMonths = 42,
    category = "adventure",
    goalPreset = "SHARING",
    mode: "ar-EG" | "ar-MSA-simple" = "ar-EG",
  ) {
    const sequence = ++choiceSequence.current;
    const result = await window.hekayti.studioDefaults({
      ageMonths,
      category,
      goalPreset,
      mode,
    });
    if (sequence !== choiceSequence.current) return;
    if (result.ok) setChoices(result.value);
    else setError(result.error.code);
  }
  useEffect(() => {
    void run(async () => {
      const defaults = await unwrap(window.hekayti.simpleDefaults());
      if (defaults) setSimple(defaults);
      await loadChoices();
    });
  }, []);
  async function loadReader(
    next: BookStudioSnapshot,
    draftId?: string,
    mode = next.mode,
  ) {
    if (!next.session.workflow.current.draftId) {
      setReader(null);
      return;
    }
    const model = await unwrap(
      window.hekayti.simpleReader({
        projectId: next.book.projectId,
        mode,
        ...(draftId ? { draftId } : {}),
      }),
    );
    if (model) setReader(model);
  }
  async function apply(next: BookStudioSnapshot) {
    setSnapshot(next);
    await loadReader(next);
  }
  async function load(projectId: string) {
    const next = await unwrap(window.hekayti.studioLoad({ projectId }));
    if (next) {
      setWriterText("");
      setPreview(null);
      await apply(next);
      setHome("new");
      setTab("story");
    }
  }
  async function command(input: BookCommand) {
    const next = await unwrap(window.hekayti.studioCommand(input));
    if (next) {
      if (input.action === "PREPARE_WRITER" && next.text)
        setWriterText(next.text);
      await apply(next);
    }
    return next;
  }
  async function selectAssets(input: SelectBookAssets) {
    const next = await unwrap(window.hekayti.studioSelectAssets(input));
    if (next) await apply(next);
  }
  async function simpleCommand(input: SimpleCommand) {
    const session = await unwrap(window.hekayti.simpleCommand(input));
    if (!session) return;
    if (session.text) setWriterText(session.text);
    if (input.action === "PREVIEW") {
      setPreview(session.preview ?? null);
      return;
    }
    const next = await unwrap(
      window.hekayti.studioLoad({
        projectId: session.workflow.projectId,
        mode: session.presentation.mode,
      }),
    );
    if (next) {
      await apply(next);
      if (session.package)
        setSnapshot((old) =>
          old
            ? {
                ...old,
                session: {
                  ...old.session,
                  package: session.package,
                  text: session.text,
                },
              }
            : old,
        );
    }
  }
  async function list(offset = 0) {
    const value = await unwrap(
      window.hekayti.simpleList({ query, offset, limit: 20 }),
    );
    if (value) setStories(value);
  }
  const bookBindings = () => ({
    projectId: snapshot!.book.projectId,
    expectedBook: snapshot!.book.recordVersion,
  });
  const writerBindings = () => ({
    projectId: snapshot!.book.projectId,
    expectedPlanner: snapshot!.session.planner.recordVersion,
    expectedWorkflow: snapshot!.session.workflow.recordVersion,
  });
  const failures: Record<string, string> = {
    BOOK_ACTION: say(
      "تعذر إتمام الخطوة. حاول مرة أخرى؛ إذا تغير الكتاب أعد فتحه.",
      "The action could not complete. Retry or reopen the book if it changed.",
    ),
    BOOK_STALE: say(
      "تغير مصدر الكتاب. أعد فتحه وراجع النسخة الحالية.",
      "The book source changed. Reopen and review the current revision.",
    ),
    BOOK_APPROVAL: say(
      "اعتمد القصة والصور، واحفظ تصميم الكتاب أولًا.",
      "Approve the story and images, then save the layout.",
    ),
    BOOK_IMAGE: say(
      "الصورة غير جاهزة. استورد صورة مناسبة وراجعها.",
      "The image is not ready. Import and review suitable artwork.",
    ),
    PRIVATE_ASSET_MISSING: say(
      "الصورة المحلية غير موجودة. أعد ربطها من تبويب الصور.",
      "The local image is missing. Relink it from Pictures.",
    ),
  };
  return (
    <div className="studio-shell">
      <header className="studio-header">
        <h1>
          {say(
            "حكايتي — استوديو كتب الأطفال",
            "Hekayti — Children's book studio",
          )}
        </h1>
        <p>
          {say(
            "فكرة صغيرة، قصة دافئة، وكتاب من صنعك.",
            "A small idea, a warm story, a book you create.",
          )}
        </p>
        <nav className="studio-home-nav">
          {(["new", "books", "library", "settings"] as const).map((key, i) => (
            <button
              key={key}
              disabled={busy}
              aria-pressed={home === key}
              onClick={() =>
                void run(async () => {
                  setHome(key);
                  if (key === "books") await list();
                  if (key === "new" && snapshot) {
                    setSnapshot(null);
                    setReader(null);
                    setWriterText("");
                    setPreview(null);
                  }
                })
              }
            >
              {
                [
                  say("كتاب جديد", "New book"),
                  say("كتبي", "My books"),
                  say("المكتبة", "Library"),
                  say("الإعدادات", "Settings"),
                ][i]
              }
            </button>
          ))}
        </nav>
      </header>
      <main>
        {error && (
          <div className="studio-error" role="alert">
            <p>
              {errorMessage ??
                failures[error] ??
                say(
                  "لم تكتمل الخطوة. راجع الاختيارات المطلوبة أو أعد فتح الكتاب، ثم حاول مرة أخرى.",
                  "The action did not complete. Check the required choices or reopen the book and retry.",
                )}
            </p>
            <details>
              <summary>{say("التفاصيل التقنية", "Technical details")}</summary>
              <code dir="ltr">{error}</code>
            </details>
            {snapshot && (
              <button
                disabled={busy}
                onClick={() => void run(() => load(snapshot.book.projectId))}
              >
                {say("إعادة فتح الكتاب", "Reopen book")}
              </button>
            )}
          </div>
        )}
        {status && <p role="status">{status}</p>}
        {home === "new" &&
          !snapshot &&
          simple &&
          !simple.library.needsInitialization && (
            <BookCreateFlow
              simple={simple}
              choices={choices}
              busy={busy}
              onChoices={(...args) => void loadChoices(...args)}
              onCreate={(input: SimpleCreateInput, photo) =>
                void run(async () => {
                  const next = await unwrap(window.hekayti.studioCreate(input));
                  if (next) {
                    await apply(next);
                    setTab(photo ? "images" : "story");
                    if (photo) {
                      const character =
                        next.identities[0]?.characterId ??
                        next.session.workflow.blueprints.at(-1)
                          ?.characterBibles[0]?.characterId;
                      if (character)
                        await selectAssets({
                          projectId: next.book.projectId,
                          expectedBook: next.book.recordVersion,
                          kind: "PHOTO",
                          characterId: character,
                        });
                    }
                  }
                })
              }
            />
          )}
        {home === "new" && !snapshot && simple?.library.needsInitialization && (
          <section className="studio-panel">
            <h2>{say("مرحبًا بك في حكايتي", "Welcome to Hekayti")}</h2>
            <p>
              {say(
                "جهّز مكتبة الإلهام للبدء. أفكار المكتبة مواد مبدئية تُراجع أثناء إعداد قصتك.",
                "Prepare the inspiration Library. Its ideas are provisional material to review while creating your story.",
              )}
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await unwrap(
                    window.hekayti.simpleStarter({
                      expectedLibrary: simple.library.recordVersion,
                      publicCreativeReviewed: true,
                    }),
                  );
                  const next = await unwrap(window.hekayti.simpleDefaults());
                  if (next) setSimple(next);
                })
              }
            >
              {say("تجهيز مكتبة الإلهام", "Prepare inspiration Library")}
            </button>
          </section>
        )}
        {home === "new" && snapshot && (
          <>
            <nav className="studio-project-nav">
              {(["story", "images", "book"] as const).map((key, i) => (
                <button
                  key={key}
                  disabled={busy}
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                >
                  {
                    [
                      say("القصة", "Story"),
                      say("الصور", "Pictures"),
                      say("الكتاب", "Book"),
                    ][i]
                  }
                </button>
              ))}
            </nav>
            {snapshot.book.classification === "PRIVATE_LOCAL_PROJECT" && (
              <p className="studio-muted">
                {say(
                  "كتاب خاص محفوظ على هذا الجهاز. الصور والمحتوى الشخصي لا يدخلان نسخ المصدر أو المكتبة الاحتياطية.",
                  "Private book saved on this device. Photos and personal content are excluded from source and Library backups.",
                )}
              </p>
            )}
            {tab === "story" && (
              <StudioStory
                key={snapshot.book.projectId}
                snapshot={snapshot}
                reader={reader}
                busy={busy}
                onCommand={(input) => run(() => command(input)).then(Boolean)}
                onRead={(draftId, mode) =>
                  void run(async () => {
                    if (mode && mode !== snapshot.mode) {
                      const next = await unwrap(
                        window.hekayti.studioLoad({
                          projectId: snapshot.book.projectId,
                          mode,
                        }),
                      );
                      if (next) {
                        setSnapshot(next);
                        await loadReader(next, draftId, mode);
                      }
                    } else
                      await loadReader(
                        snapshot,
                        draftId,
                        mode ?? snapshot.mode,
                      );
                  })
                }
                onPrepare={() =>
                  void run(() =>
                    command({ ...bookBindings(), action: "PREPARE_WRITER" }),
                  )
                }
                onCopy={(target) =>
                  void run(async () => {
                    const pkg = snapshot.session.package;
                    if (pkg)
                      await simpleCommand({
                        ...writerBindings(),
                        action: "COPY",
                        packageId: pkg.packageId,
                        target,
                        syntheticReviewed: true,
                      });
                    setStatus(
                      say(
                        "نُسخ البرومبت. استخدم الخدمة يدويًا.",
                        "Prompt copied. Use the service manually.",
                      ),
                    );
                  })
                }
                onPreview={(json) =>
                  void run(async () => {
                    const pkg = snapshot.session.package;
                    if (pkg)
                      await simpleCommand({
                        ...writerBindings(),
                        action: "PREVIEW",
                        packageId: pkg.packageId,
                        json,
                      });
                  })
                }
                onImport={(json, providerLabel) =>
                  void run(async () => {
                    const pkg = snapshot.session.package;
                    if (pkg)
                      await simpleCommand({
                        ...writerBindings(),
                        action: "IMPORT",
                        packageId: pkg.packageId,
                        json,
                        providerLabel,
                      });
                  })
                }
                preview={preview}
                writerText={writerText}
              />
            )}
            {tab === "images" && (
              <StudioImages
                key={snapshot.book.projectId}
                snapshot={snapshot}
                busy={busy}
                onCommand={(input) => run(() => command(input)).then(Boolean)}
                onImport={(input) => void run(() => selectAssets(input))}
                onRelink={(assetId) =>
                  void run(async () => {
                    const next = await unwrap(
                      window.hekayti.studioRelinkAsset({
                        ...bookBindings(),
                        assetId,
                      }),
                    );
                    if (next) await apply(next);
                  })
                }
                onCopy={(promptId) =>
                  void run(async () => {
                    const next = await unwrap(
                      window.hekayti.studioCommand({
                        ...bookBindings(),
                        action: "COPY_PROMPT",
                        promptId,
                      }),
                    );
                    if (!next?.text) return;
                    await navigator.clipboard.writeText(next.text);
                    setStatus(
                      say(
                        "نُسخ البرومبت. أرفق الصور المرجعية يدويًا.",
                        "Prompt copied. Attach reference images manually.",
                      ),
                    );
                  })
                }
              />
            )}
            {tab === "book" && (
              <BookComposer
                key={snapshot.book.projectId}
                snapshot={snapshot}
                busy={busy}
                onCommand={(input) => void run(() => command(input))}
                onEditStory={() => setTab("story")}
                onPreview={() =>
                  void run(async () => {
                    const next = await unwrap(
                      window.hekayti.studioShowPreview(bookBindings()),
                    );
                    if (next)
                      setStatus(
                        next.errors.length
                          ? say(
                              "النص طويل على بعض المساحات. كبّرها أو عدّل النص قبل اعتماد الكتاب.",
                              "Some text exceeds its area. Enlarge it or edit the text before approving.",
                            )
                          : say(
                              "المعاينة النهائية مفتوحة في نافذة الكتاب.",
                              "The final preview is open in the book window.",
                            ),
                      );
                  })
                }
                onExport={(kind) =>
                  void run(async () => {
                    const result = await unwrap(
                      window.hekayti.studioExport({ ...bookBindings(), kind }),
                    );
                    if (result)
                      setStatus(
                        say("تم تصدير الكتاب بنجاح — ", "Book exported — ") +
                          result.pages +
                          say(" صفحات.", " pages."),
                      );
                  })
                }
              />
            )}
          </>
        )}
        {home === "books" && (
          <section className="studio-panel">
            <h2>{say("كتبي", "My books")}</h2>
            <label>
              {say("ابحث في كتبك", "Search books")}
              <input
                dir="auto"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button disabled={busy} onClick={() => void run(() => list())}>
              {say("بحث", "Search")}
            </button>
            {stories?.stories.map((story) => (
              <article className="studio-panel" key={story.projectId}>
                <h3 dir="auto">{story.title}</h3>
                <p>
                  {story.ageMonths} {say("شهر", "months")} ·{" "}
                  {label(story.category)}
                </p>
                <button
                  disabled={busy}
                  onClick={() => void run(() => load(story.projectId))}
                >
                  {say("فتح الكتاب", "Open book")}
                </button>
              </article>
            ))}
            {stories?.total === 0 && (
              <p>{say("لا توجد كتب مطابقة.", "No matching books.")}</p>
            )}
            {stories && stories.offset + stories.limit < stories.total && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => list(stories.offset + stories.limit))
                }
              >
                {say("المزيد", "More")}
              </button>
            )}
          </section>
        )}
        {home === "library" && (
          <section className="studio-panel">
            <h2>{say("المكتبة", "Library")}</h2>
            <p>
              {say(
                "مواد إلهام عامة وخيالية تساعد على اختيار الأفكار. لا تُضاف صور الشخصيات الحقيقية أو قصصها الخاصة تلقائيًا.",
                "Public and synthetic inspiration helps choose ideas. Real character photos and private stories are never added automatically.",
              )}
            </p>
            <p>
              {simple?.library.total ?? 0}{" "}
              {say("مادة إلهام", "inspiration records")}
            </p>
            <div className="studio-choice-grid">
              {choices?.ideas.slice(0, 6).map((idea) => (
                <article key={idea.key}>
                  <h3>{idea.title}</h3>
                  <p>{idea.description}</p>
                  <small>{label(idea.category)}</small>
                </article>
              ))}
            </div>
          </section>
        )}
        {home === "settings" && (
          <section className="studio-panel">
            <h2>{say("الإعدادات", "Settings")}</h2>
            <UiLanguageSwitch />
            <p>
              {say(
                "لغة الواجهة مستقلة عن لغة القصة. كل العمل محفوظ محليًا؛ تُستخدم خدمات الكتابة والرسم يدويًا.",
                "Interface language is independent of story language. Work is saved locally; writer and image services are used manually.",
              )}
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
