import { useState } from "react";
import type { WriterPreview } from "@hekayti/contracts/planner";
import type { PlanPresentation } from "@hekayti/contracts/creator";
import { WriterResponseFeedback } from "./WriterResponseFeedback";
import { useCreatorUi } from "./creator-ui";

export function SimpleWriter({
  text,
  presentation,
  preview,
  busy,
  prepared,
  onPrepare,
  onCopy,
  onPreview,
  onImport,
}: {
  text: string;
  presentation: PlanPresentation;
  preview: WriterPreview | null;
  busy: boolean;
  prepared: boolean;
  onPrepare: () => void;
  onCopy: (target: "CHATGPT" | "GEMINI") => void;
  onPreview: (json: string) => void;
  onImport: (json: string, provider: "CHATGPT" | "GEMINI" | "OTHER") => void;
}) {
  const { c } = useCreatorUi();
  const [raw, setRaw] = useState("");
  const [provider, setProvider] = useState<"CHATGPT" | "GEMINI" | "OTHER">(
    "GEMINI",
  );
  const [reviewed, setReviewed] = useState(false);
  const [previewedRaw, setPreviewedRaw] = useState<string | null>(null);
  const currentPreview = previewedRaw === raw ? preview : null;
  return (
    <section className="simple-workspace" data-testid="simple-writer">
      <h2>{c("Write the story")}</h2>
      <p>
        {c(
          "Review the prompt before copying; use the external service manually.",
        )}
      </p>
      <button
        disabled={busy}
        onClick={() => {
          setReviewed(false);
          setPreviewedRaw(null);
          onPrepare();
        }}
      >
        {c("Prepare prompt")}
      </button>
      {prepared && (
        <>
          <section
            data-testid="simple-human-writer-prompt"
            dir={presentation.mode === "en" ? "ltr" : "rtl"}
          >
            <h3>{c("Required story")}</h3>
            <p dir="auto">{presentation.title}</p>
            <dl>
              {[
                [c("Story age"), String(presentation.ageMonths)],
                [c("Story type"), presentation.category],
                [c("Story goal"), presentation.goal],
                [
                  c("Characters"),
                  presentation.characters
                    .map((x) => `${x.name} — ${x.role}`)
                    .join("، "),
                ],
                [c("Story place"), presentation.setting],
              ].map(([heading, content]) => (
                <div key={heading}>
                  <dt>{heading}</dt>
                  <dd dir="auto">{content}</dd>
                </div>
              ))}
            </dl>
            <h3>{c("What will happen?")}</h3>
            <ol>
              {presentation.events.map((x) => (
                <li key={x.sequence} dir="auto">
                  {x.action}
                </li>
              ))}
            </ol>
            <h3>{c("Keep these choices")}</h3>
            <p>{c("Keep the characters, goal, place and event order.")}</p>
            {presentation.constraints.map((x, i) => (
              <p key={i} dir="auto">
                {x}
              </p>
            ))}
            <h3>{c("Writer freedom")}</h3>
            <p>
              {c(
                "Create natural dialogue and sensory detail without changing the plan.",
              )}
            </p>
            <h3>{c("Language rules")}</h3>
            <p>
              {c("Use the requested edition and age-appropriate language.")}
            </p>
            <h3>{c("Literary quality rules")}</h3>
            <p>
              {c(
                "Keep the story light, specific and coherent; human review is still needed.",
              )}
            </p>
            <h3>{c("Required response")}</h3>
            <p>
              {c(
                "Return only the requested structured response; the app computes technical bindings and counts.",
              )}
            </p>
          </section>
          <details>
            <summary>{c("Technical details")}</summary>
            <textarea
              readOnly
              dir="auto"
              rows={12}
              value={text}
              aria-label={c("Prepare prompt")}
            />
          </details>
          <label>
            <input
              type="checkbox"
              checked={reviewed}
              disabled={busy}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            {c(
              "Review the prompt before copying; use the external service manually.",
            )}
          </label>
          <p>{c("This provider is a preference, not a quality guarantee.")}</p>
          <button disabled={busy || !reviewed} onClick={() => onCopy("GEMINI")}>
            Gemini
          </button>
          <button
            disabled={busy || !reviewed}
            onClick={() => onCopy("CHATGPT")}
          >
            ChatGPT
          </button>
          <label>
            {c("Paste the result here")}
            <textarea
              data-testid="simple-writer-response"
              dir="ltr"
              rows={8}
              maxLength={500000}
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setPreviewedRaw(null);
              }}
            />
          </label>
          <label>
            {c("Provider reported by the creator")}
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as typeof provider)}
            >
              <option value="GEMINI">Gemini</option>
              <option value="CHATGPT">ChatGPT</option>
              <option value="OTHER">{c("Other")}</option>
            </select>
          </label>
          <button
            disabled={busy || !raw}
            onClick={() => {
              setPreviewedRaw(raw);
              onPreview(raw);
            }}
          >
            {c("Check response")}
          </button>
          {currentPreview && (
            <WriterResponseFeedback preview={currentPreview} simple />
          )}
          <button
            disabled={
              busy ||
              !raw ||
              !currentPreview ||
              currentPreview.status === "FAIL"
            }
            onClick={() => onImport(raw, provider)}
          >
            {c("Import story")}
          </button>
        </>
      )}
    </section>
  );
}
