import { useCreatorUi, type CreatorUiKey } from "./creator-ui";
const reasons: Readonly<Record<string, CreatorUiKey>> = {
  CREATOR_ILLUSTRATION_SOURCE:
    "The image plan and displayed draft do not match. Reopen the exact source before continuing.",
  CREATOR_LIBRARY_EMPTY:
    "Initialize the inspiration Library before creating a story.",
  CREATOR_PROVISIONAL_REVIEW:
    "Review the provisional inspiration notice before continuing.",
  CREATOR_PLAN_REQUIRED:
    "This older story needs a plan; open Advanced to prepare it.",
  CREATOR_DRAFT_REQUIRED:
    "The story has no draft yet; continue to writing and import a response.",
  CREATOR_EDITION_MISSING:
    "This edition is unavailable; choose a saved edition.",
  CREATOR_PLAN_BLOCKED:
    "The choices failed age or story-structure review. Adjust the age, type or goal.",
  CREATOR_MISSING:
    "The story was not found. Return to My stories and reopen it.",
};
export function SimpleError({ code }: { code: string }) {
  const { c } = useCreatorUi();
  const reason =
    reasons[code] ??
    (/STALE|CONFLICT/.test(code)
      ? "Reload the story before trying again."
      : /NO_FAMILY|STRUCTURE|NO_MATCH/.test(code)
        ? "No suitable story structure was found. Try another story type or goal."
        : "The story could not be prepared. Review your choices and try again.");
  return (
    <section role="alert" data-testid="simple-error">
      <p>{c(reason)}</p>
      <details>
        <summary>{c("Technical details")}</summary>
        <code dir="ltr">{code}</code>
      </details>
    </section>
  );
}
