import { useState } from "react";
import type {
  ReaderPage,
  StoryReaderModel,
  StoryCompareModel,
} from "@hekayti/contracts/creator";
import { useCreatorUi } from "./creator-ui";
import { PlanNotices } from "./SimplePlanPreview";
import { readerNoticePage } from "./reader-notice-location";

export function ReaderPageText({ page }: { page: ReaderPage }) {
  const { c } = useCreatorUi();
  return (
    <article className="reader-page" data-testid="reader-page">
      <h3>
        {c("Page")} {page.pageNumber}
      </h3>
      <p className="reader-narration" dir="auto">
        {page.narration}
      </p>
      {page.dialogue.map((x, i) => (
        <p key={i} dir="auto">
          <strong>{x.speaker}: </strong>
          {x.text}
        </p>
      ))}
    </article>
  );
}
export function SimpleReader({
  model,
  onMode,
  onDraft,
  onBack,
  onCompare,
  onIllustrate,
  onReview,
  busy,
}: {
  model: StoryReaderModel;
  onMode: (mode: StoryReaderModel["mode"]) => void;
  onDraft: (draftId: string) => void;
  onBack: () => void;
  onCompare: () => void;
  onIllustrate: () => void;
  onReview: (
    choice: "LIKED" | "NEEDS_EDIT" | "REJECTED",
    notes: string,
    rating?: number,
  ) => void;
  busy: boolean;
}) {
  const { c, label } = useCreatorUi();
  const [index, setIndex] = useState(0);
  const [all, setAll] = useState(false);
  const [choice, setChoice] = useState<"LIKED" | "NEEDS_EDIT" | "REJECTED">(
    "NEEDS_EDIT",
  );
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const page =
    model.pages[Math.min(index, Math.max(0, model.pages.length - 1))];
  const sameLanguage = model.drafts.filter((x) => x.modes.includes(model.mode));
  return (
    <section
      className="simple-reader simple-workspace"
      dir={model.mode === "en" ? "ltr" : "rtl"}
      data-testid="simple-reader"
    >
      <button onClick={onBack}>{c("Return to story")}</button>
      <h2 dir="auto">{model.title}</h2>
      <p>
        {c("Story age")}: {model.ageMonths} — {label(model.category)} —{" "}
        {label(model.mode)}
      </p>
      <p>
        {c(
          model.review.rejected
            ? "Rejected"
            : model.review.approved
              ? "Approved after human review"
              : "Not approved",
        )}
      </p>
      <p>
        {c(model.historical ? "Earlier draft" : "Current draft")} —{" "}
        {model.providerBasis === "CANONICAL" ? (
          <>
            {c("Synthetic draft")}
            <details>
              <summary>{c("Technical details")}</summary>
              <code dir="ltr">{model.providerLabel}</code>
            </details>
          </>
        ) : model.providerBasis === "UNKNOWN" ? (
          c("Provider not recorded")
        ) : (
          <>
            {model.providerBasis === "USER_REPORTED" &&
              c("Provider reported by the creator")}
            :{" "}
            <bdi>
              {model.providerLabel === "GEMINI"
                ? "Gemini"
                : model.providerLabel === "CHATGPT"
                  ? "ChatGPT"
                  : model.providerLabel === "OTHER"
                    ? c("Other")
                    : model.providerLabel}
            </bdi>
          </>
        )}
      </p>
      <nav aria-label={c("Story language")}>
        {model.availableModes.map((mode) => (
          <button
            key={mode}
            disabled={busy}
            aria-pressed={model.mode === mode}
            onClick={() => {
              setIndex(0);
              onMode(mode as StoryReaderModel["mode"]);
            }}
          >
            {label(mode)}
          </button>
        ))}
      </nav>
      <label>
        {c("Draft versions")}
        <select
          value={model.draftId}
          disabled={busy}
          onChange={(e) => {
            setIndex(0);
            onDraft(e.target.value);
          }}
        >
          {sameLanguage.map((x) => (
            <option key={x.draftId} value={x.draftId}>
              {c("Draft")} {x.number}
              {x.current ? ` — ${c("Current draft")}` : ""}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => setAll(!all)}>
        {c(all ? "Page by page" : "Show whole story")}
      </button>
      {all ? (
        model.pages.map((x) => <ReaderPageText key={x.pageId} page={x} />)
      ) : page ? (
        <ReaderPageText page={page} />
      ) : (
        <p>{c("No story text yet.")}</p>
      )}
      {!all && (
        <nav>
          <button disabled={index <= 0} onClick={() => setIndex(index - 1)}>
            {c("Previous")}
          </button>
          <span>
            {Math.min(index + 1, model.pages.length)} / {model.pages.length}
          </span>
          <button
            disabled={index >= model.pages.length - 1}
            onClick={() => setIndex(index + 1)}
          >
            {c("Next")}
          </button>
        </nav>
      )}
      <button onClick={onCompare} disabled={sameLanguage.length < 2 || busy}>
        {c("Compare two drafts")}
      </button>
      {sameLanguage.length < 2 && (
        <p>{c("No second draft in this language yet.")}</p>
      )}
      <button onClick={onIllustrate} disabled={busy || model.historical}>
        {c("Prepare illustrations")}
      </button>
      <PlanNotices
        notices={model.notices}
        pageKey={(location) => readerNoticePage(model, location)?.page.pageId}
        locate={(location) => {
          const found = readerNoticePage(model, location);
          const page = found?.page,
            mode = found?.mode;
          return page
            ? `${mode ? `${label(mode)} — ` : ""}${c("Page")} ${page.pageNumber}`
            : undefined;
        }}
      />
      <fieldset
        disabled={
          busy ||
          !model.review.current ||
          model.notices.some(
            (x) => x.severity === "high" || x.severity === "blocker",
          )
        }
      >
        <legend>{c("Review meaning and language")}</legend>
        <p>{c("Reviews do not publish or automatically promote stories.")}</p>
        {!model.review.current && (
          <p>{c("Review unavailable for an earlier draft.")}</p>
        )}
        {(["LIKED", "NEEDS_EDIT", "REJECTED"] as const).map((x, i) => (
          <button
            type="button"
            key={x}
            aria-pressed={choice === x}
            onClick={() => setChoice(x)}
          >
            {c((["I liked it", "Needs editing", "Rejected"] as const)[i]!)}
          </button>
        ))}
        <label>
          {c("Rating")}
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c("Notes")}
          <textarea
            dir="auto"
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
          />
          {c("Read the story and review its notices before saving an outcome.")}
        </label>
        <button
          disabled={!reviewed}
          onClick={() =>
            onReview(choice, notes, rating ? Number(rating) : undefined)
          }
        >
          {c("Save review")}
        </button>
      </fieldset>
    </section>
  );
}
export function SimpleCompare({
  model,
  onBack,
  onRightDraft,
}: {
  model: StoryCompareModel;
  onBack: () => void;
  onRightDraft?: (draftId: string) => void;
}) {
  const { c } = useCreatorUi();
  return (
    <section
      className="simple-workspace"
      dir={model.mode === "en" ? "ltr" : "rtl"}
    >
      <button onClick={onBack}>{c("Back")}</button>
      <h2>{c("Compare two drafts")}</h2>
      {onRightDraft && (
        <label>
          {c("Second draft")}
          <select
            value={model.right.draftId}
            onChange={(e) => onRightDraft(e.target.value)}
          >
            {model.left.drafts
              .filter(
                (x) =>
                  x.draftId !== model.left.draftId &&
                  x.modes.includes(model.mode),
              )
              .map((x) => (
                <option key={x.draftId} value={x.draftId}>
                  {c("Draft")} {x.number}
                </option>
              ))}
          </select>
        </label>
      )}
      {!model.compatible ? (
        <p role="alert">
          {c("Comparison unavailable")} <span dir="auto">{model.reason}</span>
        </p>
      ) : (
        model.pages.map((x) => (
          <div className="reader-comparison" key={x.pageNumber}>
            <section>
              <h3>{c("First draft")}</h3>
              {x.left ? (
                <ReaderPageText page={x.left} />
              ) : (
                <p>{c("Missing page")}</p>
              )}
            </section>
            <section>
              <h3>{c("Second draft")}</h3>
              {x.right ? (
                <ReaderPageText page={x.right} />
              ) : (
                <p>{c("Missing page")}</p>
              )}
            </section>
          </div>
        ))
      )}
    </section>
  );
}
