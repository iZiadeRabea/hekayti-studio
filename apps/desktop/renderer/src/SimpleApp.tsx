import { useEffect, useState } from "react";
import type {
  SimpleDefaults,
  SimpleCommand,
  SimpleStoryList,
  StoryReaderModel,
  StoryCompareModel,
} from "@hekayti/contracts/creator";
import type { SimpleSession } from "@hekayti/core/creator";
import type {
  IllustrationSnapshot,
  IllustrationCommand,
} from "@hekayti/contracts/illustration";
import type { Result } from "../../src/api";
import { UiLanguageSwitch } from "./UiLanguage";
import { useCreatorUi } from "./creator-ui";
import {
  SimpleStoryForm,
  simpleFormInput,
  type SimpleFormValues,
} from "./SimpleStoryForm";
import { SimplePlanPreview } from "./SimplePlanPreview";
import { SimpleReader, SimpleCompare } from "./SimpleReader";
import { SimpleWriter } from "./SimpleWriter";
import { SimpleIllustrations } from "./SimpleIllustrations";
import { resolveIllustrationReader } from "./illustration-source";
import { VisualBibleEditor, VisualStyleEditor } from "./VisualEditors";
import { SimpleError } from "./SimpleFeedback";

export function SimpleApp() {
  const { c, t, label } = useCreatorUi();
  const [tab, setTab] = useState<
    "New story" | "My stories" | "Library" | "Settings"
  >("New story");
  const [defaults, setDefaults] = useState<SimpleDefaults | null>(null);
  const [form, setForm] = useState<SimpleFormValues | null>(null);
  const [session, setSession] = useState<SimpleSession | null>(null);
  const [stories, setStories] = useState<SimpleStoryList | null>(null);
  const [query, setQuery] = useState("");
  const [reader, setReader] = useState<StoryReaderModel | null>(null);
  const [compare, setCompare] = useState<StoryCompareModel | null>(null);
  const [illustrations, setIllustrations] =
    useState<IllustrationSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [provisionalAck, setProvisionalAck] = useState(false);
  const [writer, setWriter] = useState(false);
  const [visualEditor, setVisualEditor] = useState<"BIBLE" | "STYLE" | null>(
    null,
  );
  async function unwrap<T>(
    promise: Promise<Result<T>>,
  ): Promise<T | undefined> {
    const result = await promise;
    if (!result.ok) {
      setError(result.error.code);
      return;
    }
    return result.value;
  }
  async function run(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setStatus("");
    try {
      await action();
    } catch {
      setError("CREATOR_ACTION");
    } finally {
      setBusy(false);
    }
  }
  async function refreshDefaults() {
    const value = await unwrap(window.hekayti.simpleDefaults());
    if (!value) return;
    setDefaults(value);
    setForm(
      (old) =>
        old ?? {
          agePreset: value.defaults.agePreset ?? value.agePresets[0]!.key,
          exactAge: "",
          language: value.defaults.primaryLanguageMode ?? "ar-EG",
          bothLanguages: value.defaults.bothArabicEditions ?? false,
          category: value.defaults.category ?? "adventure",
          goalPreset: value.defaults.goalPreset ?? value.goalPresets[0]!.key,
          customGoal: "",
          successScenario: "",
          fictionalName: "",
          personalize: false,
          setting: "",
          constraints: "",
          variation: value.defaults.variation ?? "FreshConcept",
          profile: value.defaults.profile ?? "EGYPTIAN_ARAB_MUSLIM_FAMILY",
        },
    );
  }
  useEffect(() => {
    void run(refreshDefaults);
  }, []);
  const bindings = () => {
    if (!session) throw new Error("No current session");
    return {
      projectId: session.workflow.projectId,
      expectedPlanner: session.planner.recordVersion,
      expectedWorkflow: session.workflow.recordVersion,
    };
  };
  async function command(input: SimpleCommand) {
    if (input.action === "PREVIEW")
      setSession((old) => (old ? { ...old, preview: undefined } : old));
    const next = await unwrap(window.hekayti.simpleCommand(input));
    if (next)
      setSession(
        input.action === "PREVIEW"
          ? { ...next, package: session?.package, text: session?.text }
          : next,
      );
    return next;
  }
  async function list(offset = 0) {
    const next = await unwrap(
      window.hekayti.simpleList({ query, offset, limit: 20 }),
    );
    if (next) setStories(next);
  }
  async function open(projectId: string) {
    const next = await unwrap(window.hekayti.simpleLoad({ projectId }));
    if (next) {
      setSession(next);
      setReader(null);
      setCompare(null);
      setIllustrations(null);
      setWriter(false);
      setTab("New story");
    }
  }
  async function read(
    mode = session?.presentation.mode ?? "ar-EG",
    draftId?: string,
  ) {
    if (!session) return;
    const next = await unwrap(
      window.hekayti.simpleReader({
        projectId: session.workflow.projectId,
        mode,
        ...(draftId ? { draftId } : {}),
      }),
    );
    if (next) {
      setReader(next);
      setCompare(null);
      setIllustrations(null);
    }
  }
  async function illustrationCommand(input: IllustrationCommand) {
    const next = await unwrap(window.hekayti.illustrationCommand(input));
    if (next && !(await applyIllustrationSnapshot(next))) return;
    if (next && input.action === "COPY") setStatus(c("Image prompt copied."));
    return next;
  }
  async function applyIllustrationSnapshot(next: IllustrationSnapshot) {
    if (!reader) {
      setIllustrations(null);
      setError("CREATOR_ILLUSTRATION_SOURCE");
      return false;
    }
    try {
      const exact = await resolveIllustrationReader(next, reader, (input) =>
        unwrap(window.hekayti.simpleReader(input)),
      );
      setReader(exact);
      setIllustrations(next);
      return true;
    } catch {
      setIllustrations(null);
      setError("CREATOR_ILLUSTRATION_SOURCE");
      return false;
    }
  }
  const illustrateBindings = () => ({
    ...bindings(),
    expectedCreator: illustrations!.recordVersion,
  });
  async function starter() {
    if (
      defaults &&
      (await unwrap(
        window.hekayti.simpleStarter({
          expectedLibrary: defaults.library.recordVersion,
          publicCreativeReviewed: true,
        }),
      ))
    )
      await refreshDefaults();
  }
  return (
    <>
      <header>
        <UiLanguageSwitch />
        <h1>{c("Create, write, read and prepare pictures")}</h1>
        <p>
          {c(
            "Fictional stories only; image prompts are manual, no images are generated here.",
          )}
        </p>
      </header>
      <nav>
        {(["New story", "My stories", "Library", "Settings"] as const).map(
          (key) => (
            <button
              key={key}
              disabled={busy}
              aria-pressed={tab === key}
              onClick={() =>
                void run(async () => {
                  setTab(key);
                  if (key === "My stories") await list();
                })
              }
            >
              {c(key)}
            </button>
          ),
        )}
      </nav>
      <main>
        {error && <SimpleError code={error} />}
        {status && <p role="status">{status}</p>}
        {tab === "New story" && (
          <>
            {!session &&
              defaults &&
              form &&
              !defaults.library.needsInitialization && (
                <>
                  {defaults.library.provisional > 0 && (
                    <>
                      <p>
                        {c(
                          "Starter material is provisional inspiration, not approved stories.",
                        )}
                      </p>
                      <label>
                        <input
                          type="checkbox"
                          checked={provisionalAck}
                          onChange={(e) => setProvisionalAck(e.target.checked)}
                        />
                        {c("I reviewed the inspiration notice.")}
                      </label>
                    </>
                  )}
                  <SimpleStoryForm
                    choices={defaults}
                    value={form}
                    onChange={setForm}
                    busy={busy}
                    disabledCreation={
                      defaults.library.provisional > 0 && !provisionalAck
                    }
                    onCreate={() =>
                      void run(async () => {
                        const next = await command({
                          action: "CREATE",
                          input: simpleFormInput(
                            form,
                            defaults.library.recordVersion,
                            provisionalAck,
                          ),
                        });
                        if (next) setWriter(false);
                      })
                    }
                  />
                </>
              )}
            {defaults?.library.needsInitialization && (
              <section>
                <p>{c("The Library is empty.")}</p>
                <p>
                  {c(
                    "Starter material is provisional inspiration, not approved stories.",
                  )}
                </p>
                <button disabled={busy} onClick={() => void run(starter)}>
                  {c("Prepare starter inspiration")}
                </button>
              </section>
            )}
            {session && !reader && !writer && (
              <>
                <SimplePlanPreview
                  key={session.planner.currentPlanRevisionId}
                  plan={session.presentation}
                  busy={busy}
                  onContinue={() =>
                    void run(async () => {
                      if (session.planner.currentAcceptanceId) {
                        setWriter(true);
                        return;
                      }
                      const next = await command({
                        ...bindings(),
                        action: "ACCEPT",
                        reviewerAlias: "Local creator",
                        advisoryAcknowledged: true,
                      });
                      if (next) setWriter(true);
                    })
                  }
                />
                <button onClick={() => void run(() => read())} disabled={busy}>
                  {c("Read story")}
                </button>
                <button
                  onClick={() => {
                    setSession(null);
                    setWriter(false);
                  }}
                >
                  {c("New story")}
                </button>
              </>
            )}
            {session && writer && !reader && (
              <>
                <button onClick={() => setWriter(false)}>{c("Back")}</button>
                <SimpleWriter
                  key={session.workflow.projectId}
                  busy={busy}
                  prepared={!!session.package}
                  text={session.text ?? ""}
                  presentation={session.presentation}
                  preview={session.preview ?? null}
                  onPrepare={() =>
                    void run(async () => {
                      if (await command({ ...bindings(), action: "PREPARE" }))
                        setStatus(t("Prompt prepared."));
                    })
                  }
                  onCopy={(target) =>
                    void run(async () => {
                      if (
                        session.package &&
                        (await command({
                          ...bindings(),
                          action: "COPY",
                          packageId: session.package.packageId,
                          target,
                          syntheticReviewed: true,
                        }))
                      )
                        setStatus(
                          t(
                            target === "CHATGPT"
                              ? "ChatGPT prompt copied."
                              : "Gemini prompt copied.",
                          ),
                        );
                    })
                  }
                  onPreview={(json) =>
                    void run(async () => {
                      if (session.package)
                        await command({
                          ...bindings(),
                          action: "PREVIEW",
                          packageId: session.package.packageId,
                          json,
                        });
                    })
                  }
                  onImport={(json, providerLabel) =>
                    void run(async () => {
                      if (
                        session.package &&
                        (await command({
                          ...bindings(),
                          action: "IMPORT",
                          packageId: session.package.packageId,
                          json,
                          providerLabel,
                        }))
                      ) {
                        setStatus(c("Story imported successfully."));
                        const next = await unwrap(
                          window.hekayti.simpleReader({
                            projectId: session.workflow.projectId,
                            mode: session.presentation.mode,
                          }),
                        );
                        if (next) setReader(next);
                      }
                    })
                  }
                />
              </>
            )}
            {reader && !compare && !illustrations && (
              <SimpleReader
                key={`${reader.draftId}:${reader.mode}`}
                model={reader}
                busy={busy}
                onBack={() => setReader(null)}
                onMode={(mode) => void run(() => read(mode, reader.draftId))}
                onDraft={(draftId) =>
                  void run(() => read(reader.mode, draftId))
                }
                onCompare={() =>
                  void run(async () => {
                    const draft = reader.drafts.find(
                      (x) =>
                        x.draftId !== reader.draftId &&
                        x.modes.includes(reader.mode),
                    );
                    if (session && draft) {
                      const next = await unwrap(
                        window.hekayti.simpleCompare({
                          projectId: session.workflow.projectId,
                          leftDraftId: reader.draftId,
                          rightDraftId: draft.draftId,
                          mode: reader.mode,
                        }),
                      );
                      if (next) setCompare(next);
                    }
                  })
                }
                onIllustrate={() =>
                  void run(async () => {
                    if (session) {
                      const next = await unwrap(
                        window.hekayti.illustrationLoad({
                          projectId: session.workflow.projectId,
                          mode: reader.mode,
                        }),
                      );
                      if (next) await applyIllustrationSnapshot(next);
                    }
                  })
                }
                onReview={(choice, notes, rating) =>
                  void run(async () => {
                    const latest = await unwrap(
                      window.hekayti.simpleDefaults(),
                    );
                    if (
                      latest &&
                      (await command({
                        ...bindings(),
                        action: "REVIEW",
                        draftId: reader.draftId,
                        choice,
                        notes,
                        ...(rating ? { rating } : {}),
                        reviewerAlias: "Local creator",
                        advisoryAcknowledged: true,
                        expectedLibrary: latest.library.recordVersion,
                      }))
                    )
                      await read(reader.mode, reader.draftId);
                  })
                }
              />
            )}
            {compare && (
              <SimpleCompare
                model={compare}
                onBack={() => setCompare(null)}
                onRightDraft={(rightDraftId) =>
                  void run(async () => {
                    const next = await unwrap(
                      window.hekayti.simpleCompare({
                        projectId: compare.left.projectId,
                        leftDraftId: compare.left.draftId,
                        rightDraftId,
                        mode: compare.mode,
                      }),
                    );
                    if (next) setCompare(next);
                  })
                }
              />
            )}
            {reader && illustrations && !visualEditor && (
              <SimpleIllustrations
                snapshot={illustrations}
                source={reader}
                busy={busy}
                onBack={() => setIllustrations(null)}
                onPrepare={() =>
                  void run(() =>
                    illustrationCommand({
                      ...illustrateBindings(),
                      action: "PREPARE",
                      mode: reader.mode,
                    }),
                  )
                }
                onGenerate={() =>
                  void run(async () => {
                    if (illustrations.plan)
                      await illustrationCommand({
                        ...illustrateBindings(),
                        action: "GENERATE",
                        planId: illustrations.plan.planId,
                      });
                  })
                }
                onCopy={(promptId) =>
                  void run(() =>
                    illustrationCommand({
                      ...illustrateBindings(),
                      action: "COPY",
                      promptId,
                      syntheticReviewed: true,
                    }),
                  )
                }
                onEditBible={() => setVisualEditor("BIBLE")}
                onEditStyle={() => setVisualEditor("STYLE")}
                onPlan={(planId) =>
                  void run(async () => {
                    const next = await unwrap(
                      window.hekayti.illustrationLoad({
                        projectId: reader.projectId,
                        mode: reader.mode,
                        planId,
                      }),
                    );
                    if (next) await applyIllustrationSnapshot(next);
                  })
                }
              />
            )}
            {visualEditor === "BIBLE" && illustrations?.bible && (
              <VisualBibleEditor
                key={illustrations.bible.revisionId}
                initial={illustrations.bible}
                busy={busy}
                onCancel={() => setVisualEditor(null)}
                onSave={(bible) =>
                  void run(async () => {
                    if (
                      await illustrationCommand({
                        ...illustrateBindings(),
                        action: "EDIT_BIBLE",
                        bible,
                      })
                    )
                      setVisualEditor(null);
                  })
                }
              />
            )}
            {visualEditor === "STYLE" && illustrations?.style && (
              <VisualStyleEditor
                key={illustrations.style.revisionId}
                initial={illustrations.style}
                busy={busy}
                onCancel={() => setVisualEditor(null)}
                onSave={(style) =>
                  void run(async () => {
                    if (
                      await illustrationCommand({
                        ...illustrateBindings(),
                        action: "EDIT_STYLE",
                        style,
                      })
                    )
                      setVisualEditor(null);
                  })
                }
              />
            )}
          </>
        )}
        {tab === "My stories" && (
          <section>
            <h2>{c("My stories")}</h2>
            <label>
              {c("Search my stories")}
              <input
                dir="auto"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <button disabled={busy} onClick={() => void run(() => list())}>
              {c("Search")}
            </button>
            {stories?.stories.map((story) => (
              <article key={story.projectId}>
                <h3 dir="auto">{story.title}</h3>
                <p>
                  {story.ageMonths} — {label(story.category)}
                </p>
                <button
                  disabled={busy}
                  onClick={() => void run(() => open(story.projectId))}
                >
                  {c("Open")}
                </button>
              </article>
            ))}
            {stories?.total === 0 && (
              <p>{c("No stories match your search.")}</p>
            )}
            {stories && stories.offset + stories.limit < stories.total && (
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => list(stories.offset + stories.limit))
                }
              >
                {c("Next stories")}
              </button>
            )}
          </section>
        )}
        {tab === "Library" && (
          <section>
            <h2>{c("Library")}</h2>
            <p>
              {c(
                "Starter material is provisional inspiration, not approved stories.",
              )}
            </p>
            <p>{defaults?.library.total ?? 0}</p>
            {defaults?.library.needsInitialization && (
              <button disabled={busy} onClick={() => void run(starter)}>
                {c("Prepare starter inspiration")}
              </button>
            )}
          </section>
        )}
        {tab === "Settings" && (
          <section>
            <h2>{c("Settings")}</h2>
            <UiLanguageSwitch />
            <p>{t("No API keys or cloud diagnostics transmission.")}</p>
          </section>
        )}
      </main>
    </>
  );
}
