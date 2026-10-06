import type { WriterPreview } from "@hekayti/contracts/planner";
import { useUi } from "./UiLanguage";
import type { UiKey } from "./ui-language";

export function WriterPromptPreview({ text }: { text: string }) {
  const { t } = useUi();
  return (
    <details open data-testid="writer-prompt-section">
      <summary>{t("Writer prompt preview")}</summary>
      <p>
        {t("Review the prompt before copying. Nothing is sent automatically.")}
      </p>
      {text ? (
        <textarea
          aria-label={t("Writer prompt preview")}
          data-testid="writer-prompt-preview"
          readOnly
          dir="auto"
          rows={10}
          value={text}
        />
      ) : (
        <p>{t("The plan or request changed; prepare a current prompt.")}</p>
      )}
    </details>
  );
}

const reasons: Readonly<Record<string, UiKey>> = {
  WRITER_JSON: "Response JSON is invalid.",
  WRITER_SCHEMA: "Response fields do not match the required format.",
  WRITER_SIZE: "The response exceeds the supported size.",
  WRITER_BIDI: "The response contains unsupported direction controls.",
  WRITER_LANGUAGES: "Story editions do not match the requested languages.",
  WRITER_PAGES: "Page count or numbering does not match the prompt.",
  WRITER_PAGE_MISSING: "A required page is missing.",
  WRITER_SPEAKER_UNKNOWN: "The speaker is not a known story character.",
  WRITER_SPEAKER_AMBIGUOUS: "The speaker name matches more than one character.",
  WRITER_SPEAKER_DISALLOWED: "This speaker is not allowed on this page.",
  WRITER_OBJECTIVE_CONTRADICTION:
    "The response conflicts with the requested objective.",
  WRITER_CAST_DRIFT: "The response differs from the planned cast.",
  WRITER_STRUCTURE_DRIFT:
    "The response differs from the planned event sequence.",
  WRITER_CAST_REVIEW: "Character usage needs human review.",
  WRITER_HUMAN_REVIEW:
    "Literary quality and objective delivery need human review.",
  WRITER_REVIEW_LANGUAGE_REGISTER:
    "This page may use wording from another language edition; review the requested register.",
  WRITER_STALE: "The plan or request changed; prepare a current prompt.",
  PLANNER_STALE: "The plan or request changed; prepare a current prompt.",
  PLANNER_CONFLICT: "The plan or request changed; prepare a current prompt.",
};
export function writerDiagnosticReason(code: string): UiKey {
  return (
    reasons[code] ??
    (code.startsWith("WRITER_CANONICAL_")
      ? "Canonical story validation failed; review this page."
      : code.startsWith("WRITER_REVIEW_")
        ? "Human story review is required for this page."
        : "Check the response format and try again.")
  );
}

// Presentation only: validation/assembly/CAS remain in the desktop service.
export function WriterResponseFeedback({
  preview,
}: {
  preview: WriterPreview;
}) {
  const { t, label } = useUi();
  return (
    <section
      aria-label={t("Writer response review")}
      data-testid="writer-response-feedback"
      role="status"
    >
      <p>
        {t(
          preview.status === "FAIL"
            ? "Response cannot be imported; existing data is unchanged."
            : preview.status === "REVIEW"
              ? "Review the response before import."
              : "Response is ready for import.",
        )}
      </p>
      <p>{t("No changes were saved by this preview.")}</p>
      <ul aria-label={t("Import diagnostics")}>
        {preview.diagnostics.map((diagnostic, index) => (
          <li key={index}>
            <div>
              <p>{t(writerDiagnosticReason(diagnostic.code))}</p>
              {["WRITER_STALE", "PLANNER_STALE", "PLANNER_CONFLICT"].includes(
                diagnostic.code,
              ) && (
                <p>
                  {t(
                    "Reload the story and planner, then prepare and copy the current package before retrying import.",
                  )}
                </p>
              )}
              <dl>
                {diagnostic.mode && (
                  <div>
                    <dt>{t("Story edition")}</dt>
                    <dd>
                      {label(diagnostic.mode)}{" "}
                      <bdi dir="ltr">{diagnostic.mode}</bdi>
                    </dd>
                  </div>
                )}
                {diagnostic.pageNumber !== undefined && (
                  <div>
                    <dt>{t("Page")}</dt>
                    <dd>
                      <bdi dir="ltr">{diagnostic.pageNumber}</bdi>
                    </dd>
                  </div>
                )}
                {diagnostic.speaker && (
                  <div>
                    <dt>{t("Speaker")}</dt>
                    <dd>
                      <bdi dir="auto">{diagnostic.speaker}</bdi>
                    </dd>
                  </div>
                )}
              </dl>
              <details>
                <summary>{t("Technical code")}</summary>
                <code dir="ltr">{diagnostic.code}</code>
              </details>
            </div>
          </li>
        ))}
      </ul>
      <ul>
        {preview.editions.map((edition) => (
          <li key={edition.mode}>
            {label(edition.mode)}: {t("Pages")}{" "}
            <bdi dir="ltr">{edition.pageCount}</bdi> · {t("Words")}{" "}
            <bdi dir="ltr">{edition.totalWords}</bdi>
          </li>
        ))}
      </ul>
    </section>
  );
}
