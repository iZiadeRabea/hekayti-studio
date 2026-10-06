import { useUi, UiStatus } from "./UiLanguage";
import React, { useEffect, useState } from "react";
import type { Project } from "@hekayti/contracts";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";
import type {
  LibraryState,
  LibraryRecord,
  GenerationPackage,
} from "@hekayti/contracts/library";
import {
  latestLibraryRecords,
  libraryStatistics,
  repairInstructions,
} from "@hekayti/core/library";
import type { Result } from "../../src/api";

export function StoryLibrary() {
  const { t, label } = useUi();
  const [state, setState] = useState<LibraryState | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [story, setStory] = useState<WorkflowSnapshot | null>(null),
    [projectId, setProjectId] = useState(""),
    [view, setView] = useState("Inbox"),
    [status, setStatus] = useState(
      "Synthetic-only manual bridge. Nothing is sent to a provider by this app.",
    ),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [chosen, setChosen] = useState<string[]>([]),
    [detail, setDetail] = useState<string>(""),
    [reviewer, setReviewer] = useState("owner"),
    [strategy, setStrategy] = useState<GenerationPackage["strategy"]>("HYBRID"),
    [variation, setVariation] =
      useState<GenerationPackage["variation"]>("FreshConcept"),
    [count, setCount] = useState(3),
    [target, setTarget] = useState<"CHATGPT" | "GEMINI" | "GENERIC">("CHATGPT"),
    [pkg, setPkg] = useState<GenerationPackage | null>(null),
    [instructions, setInstructions] = useState(""),
    [reviewed, setReviewed] = useState(false),
    [culturalAcknowledged, setCulturalAcknowledged] = useState(false),
    [json, setJson] = useState(""),
    [repair, setRepair] = useState(""),
    [repairError, setRepairError] = useState(""),
    [provider, setProvider] = useState<
      "CHATGPT" | "GEMINI" | "OTHER" | "MANUAL"
    >("CHATGPT"),
    [sourceType, setSourceType] = useState<
      "AI" | "HYBRID" | "CURATED" | "HUMAN"
    >("HYBRID"),
    [providerNote, setProviderNote] = useState(""),
    [modelNote, setModelNote] = useState(""),
    [familyId, setFamilyId] = useState(""),
    [scores, setScores] = useState<Record<string, string>>({}),
    [reopenPackage, setReopenPackage] = useState(""),
    [editorial, setEditorial] = useState("Human editorial opinion only"),
    [seedText, setSeedText] = useState(
      "A fictional friend discovers a familiar garden together.",
    ),
    [draftText, setDraftText] = useState(""),
    [draftJson, setDraftJson] = useState(""),
    [familyFields, setFamilyFields] = useState({
      narrativePattern: "Notice → explore together → reconnect",
      mechanism: "discovery",
      conflictPattern: "A supported familiar question",
      resolutionPattern: "Discover together and settle",
      emotionalArc: "Curiosity to reassurance",
    });
  const latest = state ? latestLibraryRecords(state) : [],
    families = latest.filter(
      (r) => r.payload.type === "STORY_FAMILY" && r.status !== "ARCHIVED",
    ),
    selected = latest.find((r) => r.recordId === detail);
  async function unwrap<T>(promise: Promise<Result<T>>) {
    const result = await promise;
    if (!result.ok) {
      setStatus(`${result.error.code}: ${result.error.message}`);
      return undefined;
    }
    return result.value;
  }
  async function reload() {
    const s = await unwrap(window.hekayti.libraryLoad());
    if (s) setState(s);
    const p = await unwrap(window.hekayti.listProjects());
    if (p) setProjects(p.filter((x) => !x.projectId.startsWith("phase2-")));
    if (projectId) {
      const w = await unwrap(window.hekayti.loadStory(projectId));
      if (w) setStory(w);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  async function selectProject(id: string) {
    setProjectId(id);
    setPkg(null);
    setInstructions("");
    setReviewed(false);
    setStory(null);
    setDraftText("");
    if (id) {
      const w = await unwrap(window.hekayti.loadStory(id));
      if (w) setStory(w);
    }
  }
  async function action(
    action: string,
    recordId: string,
    extras: Record<string, unknown> = {},
  ) {
    if (!state) return;
    const s = await unwrap(
      window.hekayti.libraryCommand({
        action,
        recordId,
        expectedVersion: state.recordVersion,
        eventId: crypto.randomUUID(),
        reviewerAlias: reviewer,
        ...extras,
      }),
    );
    if (s) {
      setState(s);
      setStatus(
        `${action} recorded; no automatic promotion or commercial-quality claim.`,
      );
    }
  }
  async function copy(text: string) {
    const input =
      text === draftText
        ? { kind: "draft", projectId, syntheticReviewed: reviewed }
        : text === repair
          ? {
              kind: "repair",
              packageId: pkg?.packageId,
              error: repairError,
              syntheticReviewed: reviewed,
            }
          : {
              kind: "package",
              packageId: pkg?.packageId,
              target,
              syntheticReviewed: reviewed,
            };
    const result = await unwrap(window.hekayti.bridgeCopy(input));
    if (result) {
      setStatus(
        "Copied after explicit synthetic-only review. Paste manually into your chosen service.",
      );
    } else {
      setStatus(
        "Clipboard unavailable. Select the read-only instructions and copy manually (Ctrl+A, Ctrl+C).",
      );
    }
  }
  const displayed = latest.filter(
    (r) =>
      (view === "Library"
        ? r.status === "PROMOTED_TO_LIBRARY"
        : view === "Inbox"
          ? r.status !== "PROMOTED_TO_LIBRARY"
          : true) &&
      Object.entries(filters).every(
        ([key, value]) =>
          !value ||
          (key === "type"
            ? r.payload.type === value
            : key === "status"
              ? r.status === value
              : key === "source"
                ? r.metadata.sourceType === value
                : key === "provider"
                  ? r.metadata.sourceProvider === value
                  : key === "age"
                    ? r.tags.ageBands.includes(value as never)
                    : key === "storyType"
                      ? r.tags.storyTypes.includes(value as never)
                      : key === "objective"
                        ? r.tags.objectives.includes(value as never)
                        : r.tags.themes.some((t) =>
                            t.toLowerCase().includes(value.toLowerCase()),
                          )),
      ),
  );
  return (
    <section data-testid="phase4-library">
      <h2>{t("Reusable Library · Inbox · Manual AI Bridge")}</h2>
      <p>
        {t(
          "No API keys or automated service calls. Use fictional synthetic content only. Imported text is untrusted data, not instructions, facts, approval or verified provider identity.",
        )}
      </p>
      <p role="status" data-testid="library-status">
        <UiStatus raw={status} />
      </p>
      <button onClick={() => void reload()}>{t("Reload Library")}</button>
      <button
        onClick={async () => {
          const s = await unwrap(window.hekayti.librarySeed());
          if (s) setState(s);
        }}
      >
        {t("Add synthetic starter")}
      </button>
      <label>
        {t("Human reviewer alias")}
        <input
          aria-label="Library reviewer"
          value={reviewer}
          maxLength={80}
          onChange={(e) => setReviewer(e.target.value)}
        />
      </label>
      <label>
        {t("Current story")}
        <select
          aria-label="Bridge current story"
          value={projectId}
          onChange={(e) => void selectProject(e.target.value)}
        >
          <option value="">{t("Choose saved story request")}</option>
          {projects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.title} · {p.projectId}
            </option>
          ))}
        </select>
      </label>
      <p>
        {story
          ? `Request ${story.current.requestRevisionId}; workflow version ${story.recordVersion}. Use Story Creator to create/revise the request or continue Blueprint/QA/approval.`
          : "Create a synthetic request in Story Creator first, then reload here."}
      </p>
      <div>
        {["Library", "Inbox", "All history", "Bridge"].map((x) => (
          <button key={x} aria-pressed={view === x} onClick={() => setView(x)}>
            {x}
          </button>
        ))}
      </div>
      {view !== "Bridge" && (
        <>
          <fieldset>
            <legend>{t("Filter records")}</legend>
            {[
              {
                key: "type",
                values: [
                  "IDEA_SEED",
                  "STORY_CONCEPT",
                  "STORY_FAMILY",
                  "BUILDING_BLOCK",
                  "APPROVED_STORY_REFERENCE",
                ],
              },
              {
                key: "status",
                values: [
                  "GENERATED",
                  "SAVED",
                  "REVIEWED",
                  "APPROVED",
                  "PROMOTED_TO_LIBRARY",
                  "ARCHIVED",
                ],
              },
              {
                key: "age",
                values: ["0-11m", "12-23m", "24-35m", "36-59m", "60-95m"],
              },
              {
                key: "storyType",
                values: [
                  "educational",
                  "behavioral",
                  "values",
                  "everyday-life",
                  "bedtime",
                  "emotional-learning",
                  "adventure",
                  "discovery",
                  "early-learning",
                ],
              },
              {
                key: "objective",
                values: [
                  "educational",
                  "behavioral",
                  "emotional",
                  "connection",
                  "entertainment",
                ],
              },
              { key: "source", values: ["CURATED", "AI", "HYBRID", "HUMAN"] },
              {
                key: "provider",
                values: ["CHATGPT", "GEMINI", "OTHER", "MANUAL"],
              },
            ].map((f) => (
              <label key={f.key}>
                {label(f.key)}
                <select
                  aria-label={`Library filter ${f.key}`}
                  value={filters[f.key] ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, [f.key]: e.target.value })
                  }
                >
                  <option value="">{t("All")}</option>
                  {f.values.map((v) => (
                    <option key={v} value={v}>
                      {label(v)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <label>
              {t("Theme")}
              <input
                aria-label="Library theme filter"
                value={filters.theme ?? ""}
                onChange={(e) =>
                  setFilters({ ...filters, theme: e.target.value })
                }
              />
            </label>
          </fieldset>
          <p data-testid="library-count">
            {displayed.length}{" "}
            {t(
              "records. Archived records are retained; there is no hard delete.",
            )}
          </p>
          <ul>
            {displayed.slice(0, 100).map((r) => (
              <li key={r.recordId} data-testid={`library-record-${r.recordId}`}>
                <button onClick={() => setDetail(r.recordId)}>{r.title}</button>{" "}
                · {r.payload.type} · {r.status} · v{r.version}
                <p>
                  {r.metadata.sourceType}/{r.metadata.sourceProvider} (operator
                  note) ·{" "}
                  {JSON.stringify(libraryStatistics(state!, r.recordId))}
                </p>
                {r.status === "PROMOTED_TO_LIBRARY" && (
                  <label>
                    <input
                      type="checkbox"
                      aria-label={`Use context ${r.recordId}`}
                      checked={chosen.includes(r.recordId)}
                      onChange={(e) =>
                        setChosen(
                          e.target.checked
                            ? [...chosen, r.recordId]
                            : chosen.filter((id) => id !== r.recordId),
                        )
                      }
                    />
                    {t("Include frozen context in next package")}
                  </label>
                )}
              </li>
            ))}
          </ul>
          {selected && (
            <article data-testid="library-detail">
              <h3>{selected.title}</h3>
              <pre>{JSON.stringify(selected, null, 2)}</pre>
              {selected.status !== "ARCHIVED" && (
                <div>
                  {(
                    ["SAVE", "REVIEW", "APPROVE", "PROMOTE", "ARCHIVE"] as const
                  ).map((a) => (
                    <button
                      key={a}
                      onClick={() => void action(a, selected.recordId)}
                    >
                      {a === "PROMOTE" ? "PROMOTE to Library" : a}
                    </button>
                  ))}
                  {selected.payload.type === "STORY_CONCEPT" &&
                    selected.origin.importId && (
                      <button
                        disabled={!story}
                        onClick={async () => {
                          if (!state || !story) return;
                          const w = await unwrap(
                            window.hekayti.bridgeUse({
                              recordId: selected.recordId,
                              projectId,
                              expectedWorkflow: story.recordVersion,
                              expectedLibrary: state.recordVersion,
                              eventId: crypto.randomUUID(),
                            }),
                          );
                          if (w) {
                            setStory(w);
                            await reload();
                            setStatus(
                              "USE_NOW selected imported meaning. Continue in Story Creator (reopen current story), build Blueprint, then use manual draft bridge here.",
                            );
                          }
                        }}
                      >
                        USE_NOW
                      </button>
                    )}
                </div>
              )}
              <fieldset>
                <legend>
                  {t("Human editorial scores (1–5, opinion not science)")}
                </legend>
                {[
                  "StoryQuality",
                  "AgeFit",
                  "LanguageQuality",
                  "Creativity",
                  "ObjectiveFit",
                  "ReusePotential",
                ].map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      aria-label={`Editorial ${key}`}
                      type="number"
                      min={1}
                      max={5}
                      value={scores[key] ?? ""}
                      onChange={(e) =>
                        setScores({ ...scores, [key]: e.target.value })
                      }
                    />
                  </label>
                ))}
                <label>
                  {t("Editorial note")}
                  <input
                    aria-label={t("Editorial note")}
                    value={editorial}
                    maxLength={2000}
                    onChange={(e) => setEditorial(e.target.value)}
                  />
                </label>
                <button
                  onClick={() =>
                    void action("SCORE", selected.recordId, {
                      scores: Object.fromEntries(
                        Object.entries(scores)
                          .filter(([, v]) => v !== "")
                          .map(([k, v]) => [k, Number(v)]),
                      ),
                      editorialNote: editorial,
                    })
                  }
                >
                  {t("Record editorial scores")}
                </button>
              </fieldset>
              <fieldset>
                <legend>
                  {t(
                    "Create structural story family — human-authored, not complete content",
                  )}
                </legend>
                {Object.entries(familyFields).map(([key, value]) => (
                  <label key={key}>
                    {key}
                    <input
                      aria-label={`Family ${key}`}
                      value={value}
                      onChange={(e) =>
                        setFamilyFields({
                          ...familyFields,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
                <button
                  onClick={() =>
                    void action("CREATE_STORY_FAMILY", selected.recordId, {
                      structure: {
                        ...familyFields,
                        reusableConstraints: [
                          "Synthetic-only; age/language/native review required",
                        ],
                      },
                    })
                  }
                >
                  CREATE_STORY_FAMILY
                </button>
              </fieldset>
              <label>
                {t("Family for this variant")}
                <select
                  aria-label="Variant family"
                  value={familyId}
                  onChange={(e) => setFamilyId(e.target.value)}
                >
                  <option value="">{t("Choose structural family")}</option>
                  {families.map((f) => (
                    <option key={f.recordId} value={f.recordId}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={!familyId}
                onClick={() => {
                  const f = families.find((f) => f.recordId === familyId);
                  if (f)
                    void action("LINK_VARIANT", selected.recordId, {
                      family: { recordId: f.recordId, version: f.version },
                      variantId: crypto.randomUUID(),
                      variantNumber:
                        Math.max(
                          0,
                          ...latest
                            .filter((r) => r.family?.recordId === familyId)
                            .map((r) => r.variantNumber!),
                        ) + 1,
                    });
                }}
              >
                {t("Link next numbered variant")}
              </button>
              {selected.payload.type === "STORY_FAMILY" && (
                <div>
                  <h4>{t("Related variants")}</h4>
                  {latest
                    .filter((r) => r.family?.recordId === selected.recordId)
                    .map((r) => (
                      <p key={r.recordId}>
                        #{r.variantNumber} · {r.variantId} ·{" "}
                        <button onClick={() => setDetail(r.recordId)}>
                          {r.title}
                        </button>{" "}
                        ·{" "}
                        {JSON.stringify(libraryStatistics(state!, r.recordId))}
                      </p>
                    ))}
                </div>
              )}
              {story && (
                <div>
                  {(["APPROVED", "REJECTED"] as const).map((outcome) => (
                    <button
                      key={outcome}
                      onClick={() =>
                        void action("LOG_OUTCOME", selected.recordId, {
                          record: {
                            recordId: selected.recordId,
                            version: selected.version,
                          },
                          projectId,
                          requestRevisionId: story.current.requestRevisionId,
                          outcome,
                        })
                      }
                    >
                      {t("Log")} {outcome.toLowerCase()} {t("usage outcome")}
                    </button>
                  ))}
                </div>
              )}
            </article>
          )}
          <fieldset>
            <legend>{t("Save human-authored idea seed")}</legend>
            <textarea
              aria-label="Idea seed"
              value={seedText}
              maxLength={2000}
              onChange={(e) => setSeedText(e.target.value)}
            />
            <button
              onClick={async () => {
                if (!state) return;
                const record: LibraryRecord = {
                  schemaVersion: "library-record/1.0",
                  recordId: crypto.randomUUID(),
                  version: 1,
                  title: seedText.slice(0, 80),
                  payload: { type: "IDEA_SEED", idea: seedText },
                  status: "GENERATED",
                  metadata: {
                    sourceType: "HUMAN",
                    sourceProvider: "MANUAL",
                    providerNote: null,
                    modelNote: null,
                  },
                  tags: {
                    ageBands: [],
                    storyTypes: [],
                    themes: [],
                    objectives: [],
                    mechanism: "human idea seed",
                  },
                  family: null,
                  variantId: null,
                  variantNumber: null,
                  derivedFrom: null,
                  scores: null,
                  editorialNote: null,
                  origin: {
                    transport: "human-authored",
                    importId: null,
                    packageId: null,
                  },
                };
                const s = await unwrap(
                  window.hekayti.libraryCommand({
                    action: "CREATE",
                    record,
                    expectedVersion: state.recordVersion,
                    eventId: crypto.randomUUID(),
                    reviewerAlias: reviewer,
                  }),
                );
                if (s) setState(s);
              }}
            >
              {t("Save seed to Inbox")}
            </button>
          </fieldset>
          {story?.current.approvalId && (
            <fieldset>
              <legend>
                {t("Explicit extraction from currently approved story")}
              </legend>
              {["STORY_CONCEPT", "APPROVED_STORY_REFERENCE"].map((type) => (
                <button
                  key={type}
                  onClick={async () => {
                    if (!state) return;
                    const s = await unwrap(
                      window.hekayti.libraryCommand({
                        action: "EXTRACT_APPROVED",
                        projectId,
                        type,
                        expectedVersion: state.recordVersion,
                        eventId: crypto.randomUUID(),
                        reviewerAlias: reviewer,
                      }),
                    );
                    if (s) setState(s);
                  }}
                >
                  {t("Save")} {type}
                </button>
              ))}
              {story.conceptSets
                .flatMap((s) => s.concepts)
                .find((c) => c.conceptId === story.current.conceptId)
                ?.components.map((c) => (
                  <button
                    key={c.componentId}
                    onClick={async () => {
                      if (!state) return;
                      const s = await unwrap(
                        window.hekayti.libraryCommand({
                          action: "EXTRACT_APPROVED",
                          projectId,
                          type: "BUILDING_BLOCK",
                          componentId: c.componentId,
                          expectedVersion: state.recordVersion,
                          eventId: crypto.randomUUID(),
                          reviewerAlias: reviewer,
                        }),
                      );
                      if (s) setState(s);
                    }}
                  >
                    {t("Save authored")} {c.kind} {t("block")}
                  </button>
                ))}
            </fieldset>
          )}
        </>
      )}
      {view === "Bridge" && (
        <>
          <label>
            {t("Reopen retained package ID")}
            <input
              aria-label="Reopen bridge package"
              value={reopenPackage}
              onChange={(e) => setReopenPackage(e.target.value)}
            />
          </label>
          <button
            onClick={async () => {
              const p = await unwrap(window.hekayti.bridgeLoad(reopenPackage));
              if (p) {
                await selectProject(p.request.projectId);
                setPkg(p);
                const text = await unwrap(
                  window.hekayti.bridgeText({ packageId: p.packageId, target }),
                );
                if (text) setInstructions(text);
                setReviewed(false);
              }
            }}
          >
            {t("Reopen frozen package")}
          </button>
          <label>
            {t("Source strategy")}
            <select
              aria-label="Bridge source strategy"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as typeof strategy)}
            >
              {["HYBRID", "CURATED", "AI_LED"].map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Variation")}
            <select
              aria-label="Bridge variation"
              value={variation}
              onChange={(e) => setVariation(e.target.value as typeof variation)}
            >
              {[
                "SimilarVersion",
                "NewVariant",
                "FreshConcept",
                "CompletelyNew",
              ].map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("Candidates")}
            <input
              aria-label="Bridge candidate count"
              type="number"
              min={3}
              max={5}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </label>
          <p>
            {chosen.length}{" "}
            {t(
              "promoted library records selected; context is frozen when package is created.",
            )}
          </p>
          <label>
            {t(
              "Context record IDs (comma-separated, max30; browse paged starter separately)",
            )}
            <input
              aria-label="Context record IDs"
              value={chosen.join(",")}
              onChange={(e) =>
                setChosen(
                  e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                )
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={culturalAcknowledged}
              onChange={(e) => setCulturalAcknowledged(e.target.checked)}
            />
            {t(
              "Explicitly acknowledge selected non-default/religious source flags; this is not qualified cultural/religious clearance.",
            )}
          </label>
          <button
            disabled={!story}
            onClick={async () => {
              if (!story) return;
              if (
                chosen.length > 30 ||
                new Set(chosen).size !== chosen.length ||
                chosen.some((id) => !latest.some((r) => r.recordId === id))
              ) {
                setStatus(
                  "Select at most30 distinct existing context IDs; unknown IDs cannot be silently omitted.",
                );
                return;
              }
              const p = await unwrap(
                window.hekayti.bridgePrepare({
                  projectId,
                  expectedWorkflow: story.recordVersion,
                  strategy,
                  variation,
                  candidateCount: count,
                  ...(culturalAcknowledged
                    ? { culturalAcknowledged: true }
                    : {}),
                  selected: latest
                    .filter((r) => chosen.includes(r.recordId))
                    .map((r) => ({ recordId: r.recordId, version: r.version })),
                }),
              );
              if (p) {
                setPkg(p);
                setReviewed(false);
                setRepair("");
                setInstructions("");
                const text = await unwrap(
                  window.hekayti.bridgeText({ packageId: p.packageId, target }),
                );
                if (text) setInstructions(text);
              }
            }}
          >
            {t("Prepare immutable package")}
          </button>
          <label>
            {t("Consumer target")}
            <select
              aria-label="Bridge consumer target"
              value={target}
              onChange={async (e) => {
                const t = e.target.value as typeof target;
                setTarget(t);
                if (pkg) {
                  const text = await unwrap(
                    window.hekayti.bridgeText({
                      packageId: pkg.packageId,
                      target: t,
                    }),
                  );
                  if (text) {
                    setInstructions(text);
                    setReviewed(false);
                  }
                }
              }}
            >
              {["CHATGPT", "GEMINI", "GENERIC"].map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <p>
            {pkg
              ? `Frozen package ${pkg.packageId} · request ${pkg.request.revisionId}`
              : "No package prepared."}
          </p>
          <textarea
            aria-label="Generation package instructions"
            readOnly
            value={instructions}
            rows={12}
          />
          <label>
            <input
              type="checkbox"
              aria-label="Synthetic package reviewed"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            {t(
              "I reviewed this package; all content is fictional/synthetic and safe to copy externally.",
            )}
          </label>
          <button
            disabled={!instructions || !reviewed}
            onClick={() => void copy(instructions)}
          >
            {t("Copy package instructions")}
          </button>
          <fieldset>
            <legend>
              {t(
                "Operator source notes — not verified provider/model identity",
              )}
            </legend>
            <label>
              {t("Source type")}
              <select
                aria-label="Import source type"
                value={sourceType}
                onChange={(e) =>
                  setSourceType(e.target.value as typeof sourceType)
                }
              >
                {["HYBRID", "AI", "CURATED", "HUMAN"].map((x) => (
                  <option key={x} value={x}>
                    {label(x)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Source provider")}
              <select
                aria-label="Import source provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as typeof provider)}
              >
                {["CHATGPT", "GEMINI", "OTHER", "MANUAL"].map((x) => (
                  <option key={x} value={x}>
                    {label(x)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("Provider note")}
              <input
                aria-label={t("Provider note")}
                value={providerNote}
                maxLength={2000}
                onChange={(e) => setProviderNote(e.target.value)}
              />
            </label>
            <label>
              {t("Model note (optional, unknown is fine)")}
              <input
                aria-label="Model note"
                value={modelNote}
                maxLength={2000}
                onChange={(e) => setModelNote(e.target.value)}
              />
            </label>
          </fieldset>
          <textarea
            aria-label="Paste concept response JSON"
            value={json}
            maxLength={500000}
            rows={10}
            onChange={(e) => setJson(e.target.value)}
          />
          <button
            disabled={!pkg || !story || !state}
            onClick={async () => {
              if (!pkg || !story || !state) return;
              const result = await window.hekayti.bridgeImport({
                packageId: pkg.packageId,
                json,
                metadata: {
                  sourceType,
                  sourceProvider: provider,
                  providerNote: providerNote || null,
                  modelNote: modelNote || null,
                },
                importId: crypto.randomUUID(),
                expectedWorkflow: story.recordVersion,
                expectedLibrary: state.recordVersion,
              });
              if (!result.ok) {
                setStatus(`${result.error.code}: ${result.error.message}`);
                setRepair(repairInstructions(pkg, result.error.message));
                setRepairError(result.error.message);
              } else {
                setState(result.value.library);
                setView("Inbox");
                setRepair("");
                setDetail(result.value.imported.recordIds[0]!);
                setStatus(
                  "Valid JSON imported into unreviewed Inbox. Explicit USE_NOW or review/approval/promotion remains required.",
                );
              }
            }}
          >
            {t("Validate and import to Inbox")}
          </button>
          {repair && (
            <>
              <textarea
                aria-label="Copy-ready repair instructions"
                readOnly
                value={repair}
                rows={5}
              />
              <button disabled={!reviewed} onClick={() => void copy(repair)}>
                {t("Copy repair instructions")}
              </button>
            </>
          )}
          <fieldset>
            <legend>
              {t(
                "Manual draft handoff (after USE_NOW and canonical Blueprint build)",
              )}
            </legend>
            <button
              disabled={!story?.current.blueprintRevisionId}
              onClick={async () => {
                const t = await unwrap(
                  window.hekayti.manualDraftText(projectId),
                );
                if (t) {
                  setDraftText(t);
                  setReviewed(false);
                }
              }}
            >
              {t("Prepare manual draft instructions")}
            </button>
            <textarea
              aria-label="Manual draft instructions"
              readOnly
              value={draftText}
              rows={8}
            />
            <button
              disabled={!draftText || !reviewed}
              onClick={() => void copy(draftText)}
            >
              {t("Copy manual draft instructions")}
            </button>
            <textarea
              aria-label="Paste manual draft JSON"
              value={draftJson}
              maxLength={500000}
              rows={8}
              onChange={(e) => setDraftJson(e.target.value)}
            />
            <button
              disabled={!story || !draftJson}
              onClick={async () => {
                if (!story) return;
                const w = await unwrap(
                  window.hekayti.manualDraftImport({
                    projectId,
                    expectedVersion: story.recordVersion,
                    json: draftJson,
                  }),
                );
                if (w) {
                  setStory(w);
                  setStatus(
                    "Manual prose retained. Reopen in Story Creator and run QA, then acknowledge current human-review findings before approval.",
                  );
                }
              }}
            >
              {t("Validate and import manual draft")}
            </button>
          </fieldset>
        </>
      )}
    </section>
  );
}
