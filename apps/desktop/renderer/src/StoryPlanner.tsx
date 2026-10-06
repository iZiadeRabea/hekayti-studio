import { useUi, UiStatus, UiFinding } from "./UiLanguage";
import { useEffect, useState } from "react";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";
import type {
  PlannerSnapshot,
  PlanningRequest,
  WriterPreview,
} from "@hekayti/contracts/planner";
import type { LibraryRecord } from "@hekayti/contracts/library";
import {
  validateStoryPlan,
  planGenerationInstructions,
} from "@hekayti/core/planner";
import {
  WriterResponseFeedback,
  WriterPromptPreview,
} from "./WriterResponseFeedback";

export function StoryPlanner({
  workflow,
  onWorkflow,
}: {
  workflow: WorkflowSnapshot;
  onWorkflow: (w: WorkflowSnapshot) => void;
}) {
  const { t, label } = useUi();
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
  const [writerFeedback, setWriterFeedback] = useState<{
    preview: WriterPreview;
    json: string;
    packageId: string;
  } | null>(null);
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
    setWriterFeedback(null);
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
  const writerPackage = pkg?.outputSchemaVersion === "writer-response/1.0";
  let promptText = "";
  if (pkg) {
    try {
      promptText = planGenerationInstructions(pkg, workflow, "GENERIC");
    } catch {
      /* A stale retained package must not crash or invent a current prompt. */
    }
  }
  const currentFeedback =
    writerFeedback?.json === raw && writerFeedback.packageId === pkg?.packageId
      ? writerFeedback.preview
      : null;
  async function command(extra: Record<string, unknown>) {
    setBusy(true);
    try {
      if (extra.action === "IMPORT" && writerPackage && pkg) {
        const checked = await window.hekayti.plannerCommand({
          projectId: workflow.projectId,
          expectedPlanner: state?.recordVersion ?? 0,
          expectedWorkflow: workflow.recordVersion,
          action: "PREVIEW",
          packageId: pkg.packageId,
          json: raw,
        });
        const preview = checked.ok
          ? checked.value.preview
          : {
              status: "FAIL" as const,
              diagnostics: [
                { code: checked.error.code, message: checked.error.message },
              ],
              editions: [],
            };
        if (!preview) {
          setWriterFeedback({
            json: raw,
            packageId: pkg.packageId,
            preview: {
              status: "FAIL",
              diagnostics: [
                {
                  code: "WRITER_VALIDATION",
                  message: "Missing validation preview",
                },
              ],
              editions: [],
            },
          });
          return;
        }
        setWriterFeedback({ preview, json: raw, packageId: pkg.packageId });
        if (preview.status === "FAIL") return;
      }
      const result = await window.hekayti.plannerCommand({
        projectId: workflow.projectId,
        expectedPlanner: state?.recordVersion ?? 0,
        expectedWorkflow: workflow.recordVersion,
        ...extra,
      });
      if (!result.ok) {
        if (["IMPORT", "PREVIEW"].includes(String(extra.action)) && pkg) {
          setWriterFeedback({
            json: raw,
            packageId: pkg.packageId,
            preview: {
              status: "FAIL",
              diagnostics: [
                { code: result.error.code, message: result.error.message },
              ],
              editions: [],
            },
          });
        } else setStatus(`${result.error.code}: ${result.error.message}`);
        return;
      }
      if (extra.action === "PREVIEW") {
        if (pkg)
          setWriterFeedback({
            json: raw,
            packageId: pkg.packageId,
            preview: result.value.preview ?? {
              status: "FAIL",
              diagnostics: [
                {
                  code: "WRITER_VALIDATION",
                  message: "Missing validation preview",
                },
              ],
              editions: [],
            },
          });
        return;
      }
      setState(result.value.planner);
      if (result.value.workflow) onWorkflow(result.value.workflow);
      setStatus(
        extra.action === "PREPARE"
          ? "Prompt prepared."
          : extra.action === "IMPORT"
            ? "Draft imported successfully."
            : extra.action === "COPY"
              ? extra.target === "CHATGPT"
                ? "ChatGPT prompt copied."
                : extra.target === "GEMINI"
                  ? "Gemini prompt copied."
                  : "Writer prompt copied."
              : "Planner change saved and validated.",
      );
      if (extra.action === "IMPORT" || extra.action === "PREPARE")
        setWriterFeedback(null);
      setAck(false);
      setCopyReview(false);
    } catch {
      if (["IMPORT", "PREVIEW"].includes(String(extra.action)) && pkg) {
        setWriterFeedback({
          json: raw,
          packageId: pkg.packageId,
          preview: {
            status: "FAIL",
            diagnostics: [
              { code: "WRITER_VALIDATION", message: "Connection failed" },
            ],
            editions: [],
          },
        });
      } else setStatus("Connection failed; reload story.");
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
    <section aria-label={t("Story Planner")} data-testid="story-planner">
      <h3>{t("Story Planner — before prose")}</h3>
      <p role="status" data-testid="planner-status">
        <UiStatus raw={status} />
      </p>
      <fieldset disabled={busy}>
        <legend>{t("Planning choices")}</legend>
        <label>
          {t("Variation")}
          <select
            aria-label={t("Planner variation")}
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
          {t("Family")}
          <select
            aria-label={t("Planner family")}
            value={family}
            onChange={(e) => setFamily(e.target.value)}
          >
            <option value="">{t("Automatic structural selection")}</option>
            {families.map((f) => (
              <option key={f.recordId} value={f.recordId}>
                {f.title} · {label(f.status)} ·{" "}
                {f.creative?.culture.fit ?? "unscreened"}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("Cultural profile")}
          <select
            value={profile}
            onChange={(e) => setProfile(e.target.value as typeof profile)}
          >
            <option value="EGYPTIAN_ARAB_MUSLIM_FAMILY">
              {t("EGYPTIAN_ARAB_MUSLIM_FAMILY")}
            </option>
            <option value="GENERAL_FAMILY">{t("GENERAL_FAMILY")}</option>
          </select>
        </label>
        <label>
          {t("Optional fictional setting")}
          <input
            value={setting}
            maxLength={500}
            onChange={(e) => setSetting(e.target.value)}
          />
        </label>
        <label>
          {t("Creator constraints for human review")}
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
          {t(
            "I reviewed provisional Library inspiration; this does not promote it.",
          )}
        </label>
        <label>
          <input
            type="checkbox"
            checked={adaptation}
            onChange={(e) => setAdaptation(e.target.checked)}
          />
          {t("I acknowledge cultural/age/Arabic adaptation needs.")}
        </label>
        <label>
          <input
            type="checkbox"
            checked={sensitive}
            onChange={(e) => setSensitive(e.target.checked)}
          />
          {t(
            "Explicitly include sensitive/not-default inspiration for review.",
          )}
        </label>
        <label>
          <input
            type="checkbox"
            checked={religious}
            onChange={(e) => setReligious(e.target.checked)}
          />
          {t(
            "Explicitly consider religious material; qualified accuracy review remains required.",
          )}
        </label>
        <button onClick={() => void planStory()}>
          {t("Plan Story / regenerate with choices")}
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
          {t("Reload planner / family choices")}
        </button>
      </fieldset>
      {plan && (
        <>
          <p>
            <span dir="auto">{plan.title}</span> ·{" "}
            {label(plan.guidance.narrativeForm)} ·{" "}
            {label(plan.provenance.sourceMode)}
          </p>
          <p>
            {t("Goal:")} <span dir="auto">{plan.goal.description}</span>
          </p>
          <p>
            {t("Problem:")}{" "}
            <span dir="auto">
              {plan.problem?.description ??
                t("Sensory recognition; no conventional conflict")}
            </span>
          </p>
          <p>
            {t("Setting")}: <span dir="auto">{plan.setting.description}</span>
          </p>
          <details>
            <summary>{t("Characters")}</summary>
            <ul>
              {plan.characters.map((character) => (
                <li key={character.characterId}>
                  <span dir="auto">{character.displayName}</span>{" "}
                  <bdi dir="ltr">{character.characterId}</bdi>
                  <p dir="auto">{character.consistencyNotes}</p>
                </li>
              ))}
            </ul>
          </details>
          <ol>
            {plan.beats.map((b) => (
              <li key={b.beatId}>
                {label(b.role)}: <span dir="auto">{b.summary}</span>{" "}
                {t("· cause")}{" "}
                <bdi dir="ltr">{b.causes.join(", ") || label("opening")}</bdi>
              </li>
            ))}
          </ol>
          {plan.schemaVersion !== "story-plan/1.0" && (
            <details data-testid="planner-quality" open>
              <summary>{t("Quality detail")}</summary>
              <dl>
                <div>
                  <dt>{t("Objective intent")}</dt>
                  <dd>{label(plan.quality.objectiveIntent.primaryIntent)}</dd>
                </div>
                {plan.schemaVersion === "story-plan/1.2" && (
                  <div>
                    <dt>{t("Category intent")}</dt>
                    <dd>{label(plan.quality.categoryIntent.category)}</dd>
                    <dd dir="auto">{plan.quality.categoryIntent.signature}</dd>
                    <dt>{t("Story needs")}</dt>
                    <dd dir="auto">
                      {plan.quality.categoryIntent.storyNeeds.join(" · ")}
                    </dd>
                  </div>
                )}
                <div>
                  <dt>{t("Compatibility")}</dt>
                  <dd>{label(plan.quality.structuralCompatibility.level)}</dd>
                </div>
                <div>
                  <dt>{t("Situation")}</dt>
                  <dd dir="auto">{plan.quality.situation.focus}</dd>
                </div>
                <div>
                  <dt>{t("Initial friction")}</dt>
                  <dd dir="auto">{plan.quality.situation.initialFriction}</dd>
                </div>
                <div>
                  <dt>{t("Resolution method")}</dt>
                  <dd dir="auto">{plan.quality.situation.resolutionMethod}</dd>
                </div>
              </dl>
              <ol>
                {plan.quality.transitions.map((transition) => (
                  <li key={transition.beatId}>
                    <bdi dir="ltr">{transition.beatId}</bdi>
                    <dl>
                      <div>
                        <dt>{t("Active participants")}</dt>
                        <dd>
                          <bdi dir="ltr">
                            {transition.participantIds.join(", ")}
                          </bdi>
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Strategy")}</dt>
                        <dd dir="auto">{transition.strategy}</dd>
                      </div>
                      <div>
                        <dt>{t("Information change")}</dt>
                        <dd dir="auto">{transition.informationChange}</dd>
                      </div>
                      <div>
                        <dt>{t("Relationship change")}</dt>
                        <dd dir="auto">{transition.relationshipChange}</dd>
                      </div>
                      <div>
                        <dt>{t("Consequence")}</dt>
                        <dd dir="auto">{transition.consequence}</dd>
                      </div>
                      <div>
                        <dt>{t("Resolution method")}</dt>
                        <dd dir="auto">{transition.resolutionMethod}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            </details>
          )}
          <details>
            <summary>{t("Logic QA and source provenance")}</summary>
            <dl aria-label={t("Story plan signals")}>
              {Object.entries(qa?.signals ?? {}).map(([key, value]) => (
                <div key={key}>
                  <dt>{label(key)}</dt>
                  <dd>{label(String(value))}</dd>
                </div>
              ))}
            </dl>
            <ul>
              {qa?.findings.map((f) => (
                <li key={f.findingId}>
                  <UiFinding finding={f} />
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
            {t(
              "I reviewed this plan and advisory limits; accept fixed structure.",
            )}
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
            {t("Accept Plan and build Blueprint")}
          </button>
          <button
            disabled={busy || !state?.currentAcceptanceId}
            onClick={() => void command({ action: "PREPARE" })}
          >
            {t("Prepare manual writing package")}
          </button>
          {pkg && (
            <>
              <WriterPromptPreview text={promptText} />
              <label>
                <input
                  type="checkbox"
                  checked={copyReview}
                  onChange={(e) => setCopyReview(e.target.checked)}
                />
                {t(
                  "I reviewed the whole package for synthetic-only external copying.",
                )}
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
                  {t("Copy for")} <bdi dir="ltr">{target}</bdi>
                </button>
              ))}
              <label>
                {writerPackage ? (
                  <>
                    {t("Paste writer-response/1.0 JSON")}{" "}
                    <bdi dir="ltr">writer-response/1.0</bdi>
                  </>
                ) : (
                  t("Paste plan-response/1.0 JSON")
                )}
                <textarea
                  aria-label={t("Planner result JSON")}
                  dir="ltr"
                  rows={6}
                  value={raw}
                  maxLength={500000}
                  disabled={busy}
                  onChange={(e) => {
                    setRaw(e.target.value);
                    setWriterFeedback(null);
                  }}
                />
              </label>
              {writerPackage && (
                <button
                  disabled={busy || !raw.trim()}
                  onClick={() =>
                    void command({
                      action: "PREVIEW",
                      packageId: pkg.packageId,
                      json: raw,
                    })
                  }
                >
                  {t("Validate response without saving")}
                </button>
              )}
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
                {t("Validate / Import planned prose")}
              </button>
              {currentFeedback && (
                <WriterResponseFeedback preview={currentFeedback} />
              )}
              <p>
                {t(
                  "Run current Story QA and human text approval below. Anchor validation cannot establish that arbitrary prose follows the plan; inspect every page and language edition.",
                )}
              </p>
            </>
          )}
          <fieldset disabled={busy || !workflow.current.reportId}>
            <legend>{t("Actual human review feedback")}</legend>
            <label>
              {t("Review notes")}
              <input
                value={notes}
                maxLength={1500}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label>
              {t("Story quality (1–5)")}
              <input
                type="number"
                min={1}
                max={5}
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              />
            </label>
            <p>
              {t(
                "Submitting records your actual review of the current draft and QA.",
              )}
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
                {t("Record")} {label(outcome)}
              </button>
            ))}
          </fieldset>
        </>
      )}
    </section>
  );
}
