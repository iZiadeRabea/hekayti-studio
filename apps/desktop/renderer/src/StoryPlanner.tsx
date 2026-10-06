import { useEffect, useState } from "react";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";
import type {
  PlannerSnapshot,
  PlanningRequest,
} from "@hekayti/contracts/planner";
import type { LibraryRecord } from "@hekayti/contracts/library";
import { validateStoryPlan } from "@hekayti/core/planner";

export function StoryPlanner({
  workflow,
  onWorkflow,
}: {
  workflow: WorkflowSnapshot;
  onWorkflow: (w: WorkflowSnapshot) => void;
}) {
  const [state, setState] = useState<PlannerSnapshot | null>(null),
    [families, setFamilies] = useState<LibraryRecord[]>([]),
    [variation, setVariation] =
      useState<PlanningRequest["variation"]>("FreshConcept"),
    [family, setFamily] = useState(""),
    [profile, setProfile] = useState<PlanningRequest["profile"]>(
      "EGYPTIAN_ARAB_MUSLIM_FAMILY",
    );
  const [inspiration, setInspiration] = useState(false),
    [adaptation, setAdaptation] = useState(false),
    [sensitive, setSensitive] = useState(false),
    [religious, setReligious] = useState(false),
    [ack, setAck] = useState(false),
    [copyReview, setCopyReview] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(
      "Review the request, then plan before prose.",
    ),
    [raw, setRaw] = useState(""),
    [notes, setNotes] = useState(""),
    [rating, setRating] = useState(3),
    [setting, setSetting] = useState(""),
    [constraints, setConstraints] = useState("");
  useEffect(() => {
    let active = true;
    void window.hekayti.plannerLoad(workflow.projectId).then((r) => {
      if (active && r.ok) setState(r.value);
    });
    void window.hekayti
      .libraryPage({ type: "STORY_FAMILY", limit: 100 })
      .then((r) => {
        if (active && r.ok) setFamilies(r.value.records);
      });
    setAck(false);
    setCopyReview(false);
    return () => {
      active = false;
    };
  }, [workflow.projectId, workflow.current.requestRevisionId]);
  const plan = state?.plans.find(
      (p) => p.revisionId === state.currentPlanRevisionId,
    ),
    qa = plan ? validateStoryPlan(plan) : null,
    pkg = state?.packages
      .filter((p) => p.plan.revisionId === state.currentPlanRevisionId)
      .at(-1);
  async function command(extra: Record<string, unknown>) {
    setBusy(true);
    try {
      const result = await window.hekayti.plannerCommand({
        projectId: workflow.projectId,
        expectedPlanner: state?.recordVersion ?? 0,
        expectedWorkflow: workflow.recordVersion,
        ...extra,
      });
      if (!result.ok) {
        setStatus(`${result.error.code}: ${result.error.message}`);
        return;
      }
      setState(result.value.planner);
      if (result.value.workflow) onWorkflow(result.value.workflow);
      setStatus(
        extra.action === "COPY"
          ? "Copy-ready package copied. Paste manually into the selected service."
          : "Planner change saved and validated.",
      );
      setAck(false);
      setCopyReview(false);
    } catch {
      setStatus("Connection failed; reload story.");
    } finally {
      setBusy(false);
    }
  }
  async function planStory() {
    const lib = await window.hekayti.libraryPage({ limit: 1 });
    if (!lib.ok) {
      setStatus(lib.error.message);
      return;
    }
    const selected = families.find((f) => f.recordId === family);
    const planning: PlanningRequest = {
      schemaVersion: "planning-request/1.0",
      planningRevisionId: crypto.randomUUID(),
      request: workflow.requests.at(-1)!,
      profile,
      variation,
      generation: state?.plans.length ?? 0,
      selectedFamily: selected
        ? { recordId: selected.recordId, version: selected.version }
        : null,
      selectedCharacter: null,
      selectedSetting: setting.trim() || null,
      constraints: constraints.trim() ? [constraints.trim()] : [],
      inspirationReviewed: inspiration,
      adaptationAcknowledged: adaptation,
      sensitiveOptIn: sensitive,
      religiousOptIn: religious,
    };
    await command({
      action: "PLAN",
      planning,
      expectedLibrary: lib.value.recordVersion,
    });
  }
  async function feedback(outcome: "APPROVED" | "EDITED" | "REJECTED") {
    if (!plan || !workflow.current.draftId || !workflow.current.reportId)
      return;
    const lib = await window.hekayti.libraryPage({ limit: 1 });
    if (!lib.ok) {
      setStatus(lib.error.message);
      return;
    }
    await command({
      action: "FEEDBACK",
      expectedLibrary: lib.value.recordVersion,
      feedback: {
        feedbackId: crypto.randomUUID(),
        planRevisionId: plan.revisionId,
        requestRevisionId: workflow.current.requestRevisionId,
        draftId: workflow.current.draftId,
        reportId: workflow.current.reportId,
        approvalId: outcome === "REJECTED" ? null : workflow.current.approvalId,
        outcome,
        reviewerAlias: "creator",
        notes: notes.trim(),
        ratings: { StoryQuality: rating },
        timestamp: new Date().toISOString(),
        humanReviewAcknowledged: true,
      },
    });
  }
  return (
    <section aria-label="Story Planner">
      <h3>Story Planner — before prose</h3>
      <p role="status" data-testid="planner-status">
        {status}
      </p>
      <fieldset disabled={busy}>
        <legend>Planning choices</legend>
        <label>
          Variation
          <select
            aria-label="Planner variation"
            value={variation}
            onChange={(e) => setVariation(e.target.value as typeof variation)}
          >
            {[
              "SimilarVersion",
              "NewVariant",
              "FreshConcept",
              "CompletelyNew",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Family
          <select
            aria-label="Planner family"
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          >
            <option value="">Automatic structural selection</option>
            {families.map((f) => (
              <option key={f.recordId} value={f.recordId}>
                {f.title} · {f.status} ·{" "}
                {f.creative?.culture.fit ?? "unscreened"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cultural profile
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as typeof profile)}
          >
            <option>EGYPTIAN_ARAB_MUSLIM_FAMILY</option>
            <option>GENERAL_FAMILY</option>
          </select>
        </label>
        <label>
          Optional fictional setting
          <input
            value={setting}
            maxLength={500}
            onChange={(e) => setSetting(e.target.value)}
          />
        </label>
        <label>
          Creator constraints for human review
          <input
            value={constraints}
            maxLength={1500}
            onChange={(e) => setConstraints(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={inspiration}
            onChange={(e) => setInspiration(e.target.checked)}
          />
          I reviewed provisional Library inspiration; this does not promote it.
        </label>
        <label>
          <input
            type="checkbox"
            checked={adaptation}
            onChange={(e) => setAdaptation(e.target.checked)}
          />
          I acknowledge cultural/age/Arabic adaptation needs.
        </label>
        <label>
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => setSensitive(e.target.checked)}
          />
          Explicitly include sensitive/not-default inspiration for review.
        </label>
        <label>
          <input
            type="checkbox"
            checked={religious}
            onChange={(e) => setReligious(e.target.checked)}
          />
          Explicitly consider religious material; qualified accuracy review
          remains required.
        </label>
        <button onClick={() => void planStory()}>
          Plan Story / regenerate with choices
        </button>
        <button
          onClick={() => {
            void window.hekayti.plannerLoad(workflow.projectId).then((r) => {
              if (r.ok) setState(r.value);
              else setStatus(r.error.message);
            });
            void window.hekayti
              .libraryPage({ type: "STORY_FAMILY", limit: 100 })
              .then((r) => {
                if (r.ok) setFamilies(r.value.records);
                else setStatus(r.error.message);
              });
          }}
        >
          Reload planner / family choices
        </button>
      </fieldset>
      {plan && (
        <>
          <p>
            {plan.title} · {plan.guidance.narrativeForm} ·{" "}
            {plan.provenance.sourceMode}
          </p>
          <p>Goal: {plan.goal.description}</p>
          <p>
            Problem:{" "}
            {plan.problem?.description ??
              "Sensory recognition; no conventional conflict"}
          </p>
          <ol>
            {plan.beats.map((b) => (
              <li key={b.beatId}>
                {b.role}: {b.summary} · cause {b.causes.join(", ") || "opening"}
              </li>
            ))}
          </ol>
          <details>
            <summary>Logic QA and source provenance</summary>
            <p>{JSON.stringify(qa?.signals)}</p>
            <ul>
              {qa?.findings.map((f) => (
                <li key={f.findingId}>
                  {f.severity}: {f.message}
                </li>
              ))}
            </ul>
            <pre dir="ltr">{JSON.stringify(plan.provenance, null, 2)}</pre>
          </details>
          <label>
            <input
              type="checkbox"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
            />
            I reviewed this plan and advisory limits; accept fixed structure.
          </label>
          <button
            disabled={
              busy ||
              !ack ||
              qa?.findings.some((f) => ["high", "blocker"].includes(f.severity))
            }
            onClick={() =>
              void command({
                action: "ACCEPT",
                reviewerAlias: "creator",
                advisoryAcknowledged: true,
              })
            }
          >
            Accept Plan and build Blueprint
          </button>
          <button
            disabled={busy || !state?.currentAcceptanceId}
            onClick={() => void command({ action: "PREPARE" })}
          >
            Prepare manual writing package
          </button>
          {pkg && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={copyReview}
                  onChange={(e) => setCopyReview(e.target.checked)}
                />
                I reviewed the whole package for synthetic-only external
                copying.
              </label>
              {(["CHATGPT", "GEMINI", "GENERIC"] as const).map((target) => (
                <button
                  key={target}
                  disabled={busy || !copyReview}
                  onClick={() =>
                    void command({
                      action: "COPY",
                      packageId: pkg.packageId,
                      target,
                      syntheticReviewed: true,
                    })
                  }
                >
                  Copy for {target}
                </button>
              ))}
              <label>
                Paste plan-response/1.0 JSON
                <textarea
                  aria-label="Planner result JSON"
                  rows={6}
                  value={raw}
                  maxLength={500000}
                  onChange={(e) => setRaw(e.target.value)}
                />
              </label>
              <button
                disabled={busy || !raw.trim()}
                onClick={() =>
                  void command({
                    action: "IMPORT",
                    packageId: pkg.packageId,
                    json: raw,
                  })
                }
              >
                Validate / Import planned prose
              </button>
              <p>
                Run current Story QA and human text approval below. Anchor
                validation cannot establish that arbitrary prose follows the
                plan; inspect every page and language edition.
              </p>
            </>
          )}
          <fieldset disabled={busy || !workflow.current.reportId}>
            <legend>Actual human review feedback</legend>
            <label>
              Review notes
              <input
                value={notes}
                maxLength={1500}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label>
              Story quality (1–5)
              <input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </label>
            <p>
              Submitting records your actual review of the current draft and QA.
            </p>
            {(["APPROVED", "EDITED", "REJECTED"] as const).map((outcome) => (
              <button
                key={outcome}
                disabled={
                  !notes.trim() ||
                  (outcome === "REJECTED"
                    ? !!workflow.current.approvalId
                    : !workflow.current.approvalId)
                }
                onClick={() => void feedback(outcome)}
              >
                Record {outcome}
              </button>
            ))}
          </fieldset>
        </>
      )}
    </section>
  );
}
