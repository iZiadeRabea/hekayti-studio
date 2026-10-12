import type { BookStudioSnapshot } from "@hekayti/contracts/book";

export function storyboardSlots(s: BookStudioSnapshot) {
  const edition = s.session.workflow.drafts.find((d) => d.draftId === s.session.workflow.current.draftId)?.editions.find((e) => e.mode === s.mode);
  return [{ key: "cover", pageId: undefined as string | undefined, title: "الغلاف", number: 0 }, ...(edition?.pages ?? []).map((p, index) => ({ key: p.pageId, pageId: p.pageId, title: `صفحة ${index + 1}`, number: index + 1 }))].map((slot) => {
    const image = s.images.find((i) => i.selected && (slot.pageId ? i.kind === "PAGE" && i.pageId === slot.pageId : i.kind === "COVER"));
    const plan = s.compositionPlans?.filter((p) => p.pageId === slot.pageId).at(-1);
    return { ...slot, image, state: !image ? "MISSING" : image.stale ? "STALE" : image.status === "APPROVED" ? "APPROVED" : "REVIEW_REQUIRED", warning: !!plan?.visual.reviewRequired || !!plan?.repetitionOverride };
  });
}
export function nextUnfinishedArt(s: BookStudioSnapshot) {
  return storyboardSlots(s).find((slot) => slot.state !== "APPROVED");
}
export function confirmedArtApproval(s: BookStudioSnapshot, imageId: string) {
  return s.images.some((i) => i.imageId === imageId && (i.kind === "PAGE" || i.kind === "COVER") && i.selected && i.status === "APPROVED" && !i.stale);
}
