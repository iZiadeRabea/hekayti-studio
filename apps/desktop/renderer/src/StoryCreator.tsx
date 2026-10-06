import { useEffect, useState } from "react";
import type { Project, StoryRequest } from "@hekayti/contracts";
import {
  workflowApprovalStatus,
  type WorkflowSnapshot,
} from "@hekayti/core/workflow";
import type { DesktopApi, Result } from "../../src/api";
import { StoryPlanner } from "./StoryPlanner";

export function StoryCreator() {
  const [snapshot, setSnapshot] = useState<WorkflowSnapshot | null>(null),
    [projects, setProjects] = useState<Project[]>([]),
    [status, setStatus] = useState(
      "Synthetic creator and manual Story Planner",
    ),
    [busy, setBusy] = useState(false);
  const [age, setAge] = useState(42),
    [mode, setMode] =
      useState<StoryRequest["primaryLanguageMode"]>("ar-MSA-simple"),
    [category, setCategory] =
      useState<StoryRequest["primaryCategory"]>("everyday-life"),
    [objective, setObjective] =
      useState<StoryRequest["objective"]["kind"]>("connection"),
    [level, setLevel] = useState<0 | 1 | 2 | 3>(0),
    [grammar, setGrammar] = useState("unknown"),
    [strategy, setStrategy] =
      useState<StoryRequest["sourceStrategy"]>("hybrid"),
    [acknowledged, setAcknowledged] = useState(false);
  const [description, setDescription] = useState("Warm supported exploration"),
    [success, setSuccess] = useState("Notice and reconnect");
  const refresh = async () => {
    const result = await window.hekayti.listProjects();
    if (result.ok) setProjects(result.value);
  };
  useEffect(() => {
    void refresh();
  }, []);
  useEffect(() => {
    const r = snapshot?.requests.at(-1);
    if (r) {
      setAge(r.ageMonths);
      setMode(r.primaryLanguageMode);
      setCategory(r.primaryCategory);
      setObjective(r.objective.kind);
      setDescription(r.objective.description);
      setSuccess(r.objective.successScenario);
      setLevel(r.personalization.level);
      setGrammar(r.personalization.grammaticalGender ?? "unknown");
      setStrategy(r.sourceStrategy);
    }
  }, [snapshot?.current.requestRevisionId]);
  async function perform(
    operation: () => Promise<Result<WorkflowSnapshot | null>>,
  ) {
    setBusy(true);
    try {
      const result = await operation();
      if (result.ok) {
        setSnapshot(result.value);
        setAcknowledged(false);
        setStatus("Story state saved and validated");
        await refresh();
      } else setStatus(`${result.error.code}: ${result.error.message}`);
    } catch {
      setStatus("Desktop connection failed; reload before continuing.");
    } finally {
      setBusy(false);
    }
  }
  function request(): StoryRequest {
    const old = snapshot?.requests.at(-1),
      id = () => crypto.randomUUID();
    return {
      schemaVersion: "story-request/1.0",
      projectId: old?.projectId ?? id(),
      storyId: old?.storyId ?? id(),
      requestId: old?.requestId ?? id(),
      revisionId: id(),
      ageMonths: age,
      languageModes: ["ar-MSA-simple", "ar-EG"],
      primaryLanguageMode: mode,
      primaryCategory: category,
      objective: { kind: objective, description, successScenario: success },
      theme: "Familiar garden",
      readingMode: "adult-read",
      sourceStrategy: strategy,
      trustedFacts: [],
      outputIntents: ["print", "digital"],
      personalization: {
        origin: "synthetic",
        profileId: "synthetic-creator",
        level,
        ...(level
          ? {
              displayName: "ليلى",
              ...(grammar !== "unknown"
                ? { grammaticalGender: grammar as "feminine" | "masculine" }
                : {}),
            }
          : {}),
        preferences: level === 2 ? ["ball"] : [],
        heroMode: level === 3 ? "child-protagonist" : "none",
      },
    };
  }
  function action(
    action: Parameters<DesktopApi["storyAction"]>[0]["action"],
    extra: Partial<Parameters<DesktopApi["storyAction"]>[0]> = {},
  ) {
    if (snapshot)
      void perform(() =>
        window.hekayti.storyAction({
          projectId: snapshot.projectId,
          expectedVersion: snapshot.recordVersion,
          action,
          ...extra,
        }),
      );
  }
  const set = snapshot?.conceptSets.find(
      (x) => x.conceptSetId === snapshot.current.conceptSetId,
    ),
    draft = snapshot?.drafts.find(
      (x) => x.draftId === snapshot.current.draftId,
    ),
    qa = snapshot?.reports.find(
      (x) => x.reportId === snapshot.current.reportId,
    );
  return (
    <section className="story-creator">
      <h2>New Story — synthetic creator</h2>
      <p>
        No real child details. Personalization uses the fixed invented example
        ليلى; grammatical agreement is authored explicitly. Plan before prose
        with acknowledged Library inspiration and manual AI copy/paste. The
        separate Create more concepts button retains the deterministic mock
        path.
      </p>
      <p role="status" data-testid="story-status">
        {status}
      </p>
      <fieldset disabled={busy}>
        <legend>Synthetic request</legend>
        <label>
          Age in months (0–95)
          <input
            aria-label="Story age months"
            type="number"
            min="0"
            max="95"
            value={age}
            onChange={(e) => setAge(Number(e.target.value))}
          />
        </label>
        <label>
          Primary language
          <select
            aria-label="Story language"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
          >
            <option value="ar-MSA-simple">Simplified MSA</option>
            <option value="ar-EG">Egyptian Arabic</option>
          </select>
        </label>
        <label>
          Category
          <select
            aria-label="Story category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
          >
            {[
              "everyday-life",
              "educational",
              "behavioral",
              "values",
              "adventure",
              "bedtime",
              "early-learning",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Objective
          <select
            aria-label="Story objective"
            value={objective}
            onChange={(e) => setObjective(e.target.value as typeof objective)}
          >
            {[
              "connection",
              "educational",
              "behavioral",
              "emotional",
              "entertainment",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Synthetic objective description
          <input
            aria-label="Objective description"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Synthetic success scenario
          <input
            aria-label="Objective success scenario"
            maxLength={500}
            value={success}
            onChange={(e) => setSuccess(e.target.value)}
          />
        </label>
        <label>
          Personalization
          <select
            aria-label="Synthetic personalization"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value) as typeof level)}
          >
            <option value="0">0 — generic</option>
            <option value="1">1 — invented name</option>
            <option value="2">2 — invented name and ball preference</option>
            <option value="3">3 — explicit fictional protagonist</option>
          </select>
        </label>
        <label>
          Authored grammatical agreement
          <select
            aria-label="Grammatical agreement"
            value={grammar}
            onChange={(e) => setGrammar(e.target.value)}
          >
            <option value="unknown">Unknown — human review</option>
            <option value="feminine">Feminine</option>
            <option value="masculine">Masculine</option>
          </select>
        </label>
        <label>
          Future source preference
          <select
            aria-label="Source preference"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as typeof strategy)}
          >
            {["manual", "curated", "ai", "hybrid"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            const r = request();
            r.projectId = crypto.randomUUID();
            r.storyId = crypto.randomUUID();
            r.requestId = crypto.randomUUID();
            void perform(() => window.hekayti.newStory(r));
          }}
        >
          New Story
        </button>
        <button
          disabled={!snapshot}
          onClick={() =>
            snapshot &&
            void perform(() =>
              window.hekayti.reviseStory({
                projectId: snapshot.projectId,
                expectedVersion: snapshot.recordVersion,
                request: request(),
              }),
            )
          }
        >
          Save changed request
        </button>
        <label>
          Reopen persisted story
          <select
            aria-label="Reopen story"
            value={snapshot?.projectId ?? ""}
            onChange={(e) => {
              if (e.target.value)
                void perform(() => window.hekayti.loadStory(e.target.value));
            }}
          >
            <option value="">Choose project</option>
            {projects
              .filter((p) => !p.projectId.startsWith("phase2-"))
              .map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.projectId}
                </option>
              ))}
          </select>
        </label>
      </fieldset>
      {snapshot && (
        <>
          <p data-testid="workflow-state">
            Version {snapshot.recordVersion} · request{" "}
            {snapshot.current.requestRevisionId} · approval{" "}
            {workflowApprovalStatus(snapshot)} · historical approvals{" "}
            {snapshot.approvals.length}
          </p>
          <p>
            Actual provider: {set?.concepts[0]?.provenance.kind ?? "mock"}.
            Blank blueprint editions remain immutable placeholders; drafted
            editions below have separate IDs.
          </p>
          <StoryPlanner workflow={snapshot} onWorkflow={setSnapshot} />
          <button disabled={busy} onClick={() => action("create-more")}>
            Create more concepts
          </button>
          <div className="concept-grid">
            {set?.concepts.map((c) => (
              <article className="concept-card" key={c.conceptId} dir="auto">
                <h3>{c.title}</h3>
                <p>{c.premise}</p>
                <dl>
                  {Object.entries({
                    Type: c.primaryCategory,
                    Objective: c.objective.description,
                    Setting: c.setting[mode],
                    Character:
                      c.characters.map((x) => x.displayName).join(", ") ||
                      "Focal object",
                    Challenge: c.coreChallenge,
                    Resolution: c.resolutionDirection,
                    "Age fit": c.ageFitSummary,
                  }).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  disabled={busy}
                  onClick={() => action("select", { conceptId: c.conceptId })}
                >
                  {snapshot.current.conceptId === c.conceptId
                    ? "Selected — replace derivatives"
                    : "Select / replace concept"}
                </button>
              </article>
            ))}
          </div>
          <button
            disabled={busy || !snapshot.current.conceptId}
            onClick={() => action("build")}
          >
            Build blueprint
          </button>
          {snapshot.blueprints
            .filter(
              (b) => b.revisionId === snapshot.current.blueprintRevisionId,
            )
            .map((b) => (
              <details key={b.revisionId} open>
                <summary>Current canonical blueprint · {b.revisionId}</summary>
                <p>
                  {b.workingTitle} · {b.objective.description}
                </p>
                <ol>
                  {b.meaningBeats.map((beat) => (
                    <li key={beat.beatId} dir="auto">
                      {beat.actionOrDiscovery}
                    </li>
                  ))}
                </ol>
                <p>Page plan</p>
                <ol>
                  {b.pagePlan.map((p) => (
                    <li key={p.pageId}>
                      <bdi>{p.pageId}</bdi> · {p.beatIds.join(", ")}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          <button
            disabled={busy || !snapshot.current.blueprintRevisionId}
            onClick={() => action("draft")}
          >
            Draft language editions
          </button>
          <button
            disabled={busy || !snapshot.current.draftId}
            onClick={() => action("qa")}
          >
            Run structured QA
          </button>
          {draft?.editions.map((e) => (
            <details key={e.languageVersionId} open>
              <summary>
                {e.mode} · edition {e.languageVersionId} · source{" "}
                {e.sourceRevision}
              </summary>
              <div
                dir={e.mode === "en" ? "ltr" : "rtl"}
                lang={e.mode === "ar-EG" ? "ar-EG" : "ar"}
              >
                {e.pages.map((p) => (
                  <p key={p.pageId}>
                    <bdi>{p.pageId}</bdi>: {p.narration}{" "}
                    {p.dialogue.map((d) => d.text).join(" ")}
                  </p>
                ))}
              </div>
            </details>
          ))}
          <h3>Advisory findings</h3>
          {qa ? (
            <>
              <p>
                QA {qa.reportId} · hash <bdi>{qa.contentHash}</bdi>
              </p>
              <ul>
                {qa.findings.map((f) => (
                  <li key={f.findingId}>
                    {f.severity}: {f.message} {f.suggestedAction}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              Current QA required. Previous reviews and approvals remain in
              history.
            </p>
          )}
          <label>
            <input
              type="checkbox"
              aria-label="Acknowledge advisory limits"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I have read the current draft and findings; deterministic QA does
            not certify literary, factual, native language or developmental
            quality.
          </label>
          <button
            disabled={
              busy ||
              !qa ||
              !acknowledged ||
              qa.findings.some(
                (f) => f.severity === "high" || f.severity === "blocker",
              )
            }
            onClick={() =>
              action("approve", {
                reviewerAlias: "synthetic-operator",
                advisoryAcknowledged: true,
              })
            }
          >
            Explicitly approve current text
          </button>
          <details>
            <summary>Validated workflow history</summary>
            <pre dir="ltr">{JSON.stringify(snapshot, null, 2)}</pre>
          </details>
        </>
      )}
      <p>
        Workflow artifacts persist in SQLite. Existing Open/Save JSON controls
        are legacy blueprint-only fixture tools and do not export these workflow
        histories.
      </p>
    </section>
  );
}
