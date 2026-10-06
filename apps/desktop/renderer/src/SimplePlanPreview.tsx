import { useState } from "react";
import type { PlanPresentation } from "@hekayti/contracts/creator";
import { useCreatorUi } from "./creator-ui";

export function PlanNotices({
  notices,
  locate,
}: {
  notices: PlanPresentation["notices"];
  locate?: (location: string) => string | undefined;
}) {
  const { c } = useCreatorUi();
  const blocking = notices.filter(
    (x) => x.severity === "high" || x.severity === "blocker",
  );
  const advisory = notices.filter(
    (x) => x.severity !== "high" && x.severity !== "blocker",
  );
  const items = (rows: typeof notices) => (
    <ul>
      {rows.map((x, i) => (
        <li key={i}>
          <span dir="auto">{x.text}</span>
          {x.location && locate?.(x.location) && (
            <span dir="auto"> — {locate(x.location)}</span>
          )}
          <details>
            <summary>{c("Technical details")}</summary>
            <code dir="ltr">{x.code}</code>
            {x.location && (
              <p>
                <code dir="ltr">{x.location}</code>
              </p>
            )}
          </details>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label={c("Review meaning and language")}>
      {blocking.length > 0 && (
        <div role="alert" data-testid="simple-blocking-notices">
          <h3>{c("Blocking issues")}</h3>
          {items(blocking)}
        </div>
      )}
      {advisory.length > 0 && (
        <details>
          <summary>
            {c("Review meaning and language")} ({advisory.length})
          </summary>
          {items(advisory)}
        </details>
      )}
    </section>
  );
}

export function SimplePlanPreview({
  plan,
  onContinue,
  busy,
}: {
  plan: PlanPresentation;
  onContinue: () => void;
  busy: boolean;
}) {
  const { c, label } = useCreatorUi();
  const [reviewed, setReviewed] = useState(false);
  const blocked =
    !plan.supported ||
    plan.notices.some((x) => x.severity === "blocker" || x.severity === "high");
  return (
    <section
      className="simple-workspace"
      data-testid="simple-plan-preview"
      dir={plan.mode === "en" ? "ltr" : "rtl"}
    >
      <h2>{c("Plan preview")}</h2>
      {!plan.supported && (
        <p role="alert">{c("Presentation unavailable for this language.")}</p>
      )}
      <h3 dir="auto">{plan.title}</h3>
      <p>
        {c("Story age")}: {plan.ageMonths} — {c("Story type")}:{" "}
        <span dir="auto">{plan.category}</span> — {label(plan.mode)}
      </p>
      <dl>
        {[
          [c("Story goal"), plan.goal],
          [c("What do the characters want?"), plan.objective],
          [c("Story place"), plan.setting],
          [c("What is the problem?"), plan.problem],
          [c("Opening"), plan.opening],
          [c("How is the problem solved?"), plan.resolution],
          [c("How does the story end?"), plan.ending],
        ].map(([heading, text]) => (
          <div key={heading}>
            <dt>{heading}</dt>
            <dd dir="auto">{text}</dd>
          </div>
        ))}
      </dl>
      <h3>{c("Characters")}</h3>
      <ul>
        {plan.characters.map((x, i) => (
          <li key={i} dir="auto">
            {x.name} — {x.role}
          </li>
        ))}
      </ul>
      <h3>{c("What will happen?")}</h3>
      <ol>
        {plan.events.map((x) => (
          <li key={x.sequence}>
            <p dir="auto">{x.action}</p>
            <details>
              <summary>{c("Plan details")}</summary>
              <dl>
                {[
                  [c("Before and after"), `${x.beforeState} ← ${x.afterState}`],
                  [c("Cause"), x.cause],
                  [c("Strategy"), x.strategy],
                  [c("Consequence"), x.consequence],
                  [c("Information change"), x.informationChange],
                  [c("Relationship change"), x.relationshipChange],
                ].map(([heading, text]) => (
                  <div key={heading}>
                    <dt>{heading}</dt>
                    <dd dir="auto">{text}</dd>
                  </div>
                ))}
              </dl>
            </details>
          </li>
        ))}
      </ol>
      {plan.constraints.length > 0 && (
        <>
          <h3>{c("Creator constraints")}</h3>
          <ul>
            {plan.constraints.map((x, i) => (
              <li key={i} dir="auto">
                {x}
              </li>
            ))}
          </ul>
        </>
      )}
      <PlanNotices notices={plan.notices} />
      <label>
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
          disabled={busy || blocked}
        />
        {c("I reviewed the plan and its notices.")}
      </label>
      <button
        className="primary-action"
        disabled={busy || blocked || !reviewed}
        onClick={onContinue}
      >
        {c("Continue to writing")}
      </button>
    </section>
  );
}
