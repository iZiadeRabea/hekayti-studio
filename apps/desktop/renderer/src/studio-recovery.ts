import type { AppError } from "@hekayti/contracts";
import type { BookStudioSnapshot } from "@hekayti/contracts/book";
export type StudioTarget = NonNullable<AppError["target"]>;
export type StudioIssue = {
  code: string;
  message: string;
  target?: StudioTarget;
  action: string;
  severity: "warning" | "error";
  returnTo: "story" | "images" | "book";
};
export function studioIssue(
  error: { code: string; message: string; target?: StudioTarget },
  returnTo: StudioIssue["returnTo"],
): StudioIssue {
  const target =
    error.target ??
    (error.code === "BOOK_STORY_APPROVAL"
      ? { section: "story" as const, control: "approval" }
      : undefined);
  return {
    ...error,
    target,
    returnTo,
    severity: "error",
    action:
      target?.control === "identity"
        ? "مراجعة واعتماد تعريف الشخصية"
        : target?.control === "sheet"
          ? "مراجعة واعتماد شكل الشخصية"
          : target?.section === "story"
            ? "مراجعة واعتماد القصة"
            : target?.section === "book"
              ? "مراجعة مكان الكلام"
              : target
                ? "مراجعة الصفحة واستكمال الصورة"
                : "مراجعة الخطوة",
  };
}
export function studioPrerequisites(s: BookStudioSnapshot): StudioIssue[] {
  const out: StudioIssue[] = [];
  const add = (code: string, message: string, target: StudioTarget) =>
    out.push(studioIssue({ code, message, target }, "book"));
  if (!s.session.workflow.current.approvalId)
    add("BOOK_STORY_APPROVAL", "القصة لسه محتاجة اعتماد.", {
      section: "story",
      control: "approval",
    });
  for (const i of s.identities) {
    if (!i.approvedProfile)
      add("BOOK_IDENTITY", `تعريف شخصية ${i.name} لسه محتاج اعتماد.`, {
        section: "images",
        characterId: i.characterId,
        control: "identity",
      });
    if (
      !s.images.some(
        (q) =>
          q.characterId === i.characterId &&
          q.kind === "CHARACTER_SHEET" &&
          q.selected &&
          q.status === "APPROVED" &&
          !q.stale,
      )
    )
      add("BOOK_SHEET", `شكل شخصية ${i.name} لسه محتاج اعتماد.`, {
        section: "images",
        characterId: i.characterId,
        control: "sheet",
      });
  }
  const edition = s.session.workflow.drafts
    .find((d) => d.draftId === s.session.workflow.current.draftId)
    ?.editions.find((e) => e.mode === s.mode);
  for (const [index, page] of (edition?.pages ?? []).entries())
    if (
      !s.images.some(
        (i) =>
          i.pageId === page.pageId &&
          i.selected &&
          i.status === "APPROVED" &&
          !i.stale,
      )
    )
      add(
        "BOOK_IMAGES",
        `صورة الصفحة ${index + 1} لسه ${s.images.some((i) => i.pageId === page.pageId) ? "محتاجة مراجعة واعتماد" : "ناقصة"}.`,
        { section: "images", pageId: page.pageId, control: "image" },
      );
  if (
    !s.images.some(
      (i) =>
        i.kind === "COVER" && i.selected && i.status === "APPROVED" && !i.stale,
    )
  )
    add("BOOK_IMAGES", "صورة الغلاف لسه محتاجة اعتماد.", {
      section: "images",
      control: "cover",
    });
  return out;
}
export const targetElementId = (t: StudioTarget) =>
  `studio-target-${t.control}-${t.characterId ?? t.pageId ?? "current"}`;
