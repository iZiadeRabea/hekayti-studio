import { useState, useEffect } from "react";
import type { IllustrationSnapshot } from "@hekayti/contracts/illustration";
import type { StoryReaderModel } from "@hekayti/contracts/creator";
import { illustrationSourceMatches } from "./illustration-source";
import { ReaderPageText } from "./SimpleReader";
import { useCreatorUi } from "./creator-ui";

export function SimpleIllustrations({
  snapshot,
  source,
  onBack,
  onPrepare,
  onGenerate,
  onCopy,
  onEditBible,
  onEditStyle,
  onPlan,
  busy,
}: {
  snapshot: IllustrationSnapshot;
  source: StoryReaderModel;
  onBack: () => void;
  onPrepare: () => void;
  onGenerate: () => void;
  onCopy: (promptId: string) => void;
  onEditBible: () => void;
  onEditStyle: () => void;
  onPlan?: (planId: string) => void;
  busy: boolean;
}) {
  const { c } = useCreatorUi();
  const [tab, setTab] = useState("CHARACTER_REFERENCE");
  const bound = illustrationSourceMatches(snapshot, source);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  useEffect(() => {
    setReviewed(new Set());
    setTab("CHARACTER_REFERENCE");
  }, [snapshot.plan?.planId, snapshot.stale]);
  const prompts = snapshot.prompts.filter(
    (x) => bound && x.planId === snapshot.plan?.planId,
  );
  const current = prompts.filter(
    (x) =>
      x.kind === tab ||
      (tab.startsWith("PAGE:") &&
        x.kind === "PAGE" &&
        x.pageNumber === Number(tab.slice(5))),
  );
  const shownPage = tab.startsWith("PAGE:")
    ? bound
      ? source.pages.find((x) => x.pageNumber === Number(tab.slice(5)))
      : undefined
    : undefined;
  return (
    <section className="simple-workspace" data-testid="simple-illustrations">
      <button onClick={onBack}>{c("Back")}</button>
      <h2>{c("Prepare illustrations")}</h2>
      {snapshot.plan && !bound && (
        <p role="alert" data-testid="illustration-source-mismatch">
          {c(
            "The image plan and displayed draft do not match. Reopen the exact source before continuing.",
          )}
        </p>
      )}
      {snapshot.plan && bound && (
        <p>
          {c("Image source draft")}:{" "}
          {c(
            source.review.approved
              ? "Approved after human review"
              : "Not approved",
          )}{" "}
          — {c(source.historical ? "Earlier draft" : "Current draft")}
        </p>
      )}
      {onPlan && snapshot.plans.length > 0 && (
        <label>
          {c("Illustration plan versions")}
          <select
            value={snapshot.plan?.planId ?? ""}
            disabled={busy}
            onChange={(e) => onPlan(e.target.value)}
          >
            {snapshot.plans.map((x, i) => (
              <option key={x.planId} value={x.planId}>
                {c("Draft")} {i + 1}
                {x.stale ? ` — ${c("Earlier draft")}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      <p>{c("No image generation or image import in this step.")}</p>
      <p>
        {c(
          "Character appearances are fictional defaults, not inferred from names or personal photos.",
        )}
      </p>
      {snapshot.stale && (
        <p role="alert" data-testid="illustration-stale">
          {c(
            "The story changed; prepare current illustration prompts before copying.",
          )}
        </p>
      )}
      {snapshot.notice && <p dir="auto">{snapshot.notice}</p>}
      <button disabled={busy} onClick={onPrepare}>
        {c("Prepare current illustration plan")}
      </button>
      <button
        disabled={busy || !snapshot.plan || snapshot.stale || !bound}
        onClick={onGenerate}
      >
        {c("Prepare image prompts")}
      </button>
      <button disabled={busy || !snapshot.bible} onClick={onEditBible}>
        {c("Edit working character descriptions")}
      </button>
      <button disabled={busy || !snapshot.style} onClick={onEditStyle}>
        {c("Edit working visual style")}
      </button>
      <p>
        {c(
          "Working definition edits do not change retained illustration plans.",
        )}
      </p>
      <p>{c("Review the character references before using page prompts.")}</p>
      <nav>
        <button
          aria-pressed={tab === "CHARACTER_REFERENCE"}
          onClick={() => setTab("CHARACTER_REFERENCE")}
        >
          {c("Character references")}
        </button>
        <button aria-pressed={tab === "COVER"} onClick={() => setTab("COVER")}>
          {c("Story cover")}
        </button>
        {snapshot.plan?.pages.map((x) => (
          <button
            key={x.pageId}
            aria-pressed={tab === `PAGE:${x.pageNumber}`}
            onClick={() => setTab(`PAGE:${x.pageNumber}`)}
          >
            {c("Page")} {x.pageNumber}
          </button>
        ))}
      </nav>
      {shownPage && <ReaderPageText page={shownPage} />}
      {current.length === 0 && <p>{c("No illustration prompts yet.")}</p>}
      {current.map((x) => (
        <article key={x.promptId}>
          <h3>
            {x.characterId
              ? snapshot.plan?.bible.characters.find(
                  (character) => character.characterId === x.characterId,
                )?.name
              : c(x.kind === "COVER" ? "Story cover" : "Image description")}
          </h3>
          <p dir="auto" className="visual-summary">
            {x.arabicSummary}
          </p>
          <details>
            <summary>{c("Technical image prompt")}</summary>
            <pre dir="ltr">{x.technicalPrompt}</pre>
          </details>
          <label>
            <input
              type="checkbox"
              checked={reviewed.has(x.promptId)}
              disabled={busy || snapshot.stale}
              onChange={(e) =>
                setReviewed((old) => {
                  const next = new Set(old);
                  if (e.target.checked) next.add(x.promptId);
                  else next.delete(x.promptId);
                  return next;
                })
              }
            />
            {c("I reviewed the character reference and this image prompt.")}
          </label>
          <button
            disabled={
              busy || snapshot.stale || !bound || !reviewed.has(x.promptId)
            }
            onClick={() => onCopy(x.promptId)}
          >
            {c("Copy image prompt")}
          </button>
        </article>
      ))}
      <details>
        <summary>{c("Technical details")}</summary>
        <ul>
          {snapshot.staleReasons.map((reason, i) => (
            <li key={i}>
              <code dir="ltr">{reason}</code>
            </li>
          ))}
        </ul>
        <pre dir="ltr">
          {JSON.stringify(
            {
              planId: snapshot.plan?.planId,
              dependencies: snapshot.plan?.dependencies,
            },
            null,
            2,
          )}
        </pre>
      </details>
    </section>
  );
}
