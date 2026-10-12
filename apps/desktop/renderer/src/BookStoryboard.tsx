import { useEffect, useRef, useState } from "react";
import type { BookStudioSnapshot } from "@hekayti/contracts/book";
import { storyboardSlots } from "./studio-readiness";
import { useStudioUi } from "./studio-ui";

function Thumbnail({ projectId, assetId }: { projectId: string; assetId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [data, setData] = useState<string>();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setNear(!!entry?.isIntersecting), { rootMargin: "120px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    setData(undefined); setMissing(false);
    if (near) void window.hekayti.studioAssetPreview({ projectId, assetId, thumbnail: true }).then((r) => { if (active) { if (r.ok && r.value) setData(r.value); else setMissing(true); } }).catch(() => { if (active) setMissing(true); });
    return () => { active = false; };
  }, [projectId, assetId, near]);
  return <div ref={ref} className="studio-thumbnail">{data ? <img src={data} alt="معاينة صغيرة للصورة الحالية" loading="lazy" /> : <span>{missing ? "الصورة المحلية ناقصة" : "معاينة الصورة"}</span>}</div>;
}
export function BookStoryboard({ snapshot, busy, onSelect }: { snapshot: BookStudioSnapshot; busy: boolean; onSelect: (key: string) => void }) {
  const { say } = useStudioUi();
  const slots = storyboardSlots(snapshot);
  const labels: Record<string, string> = { MISSING: "ناقصة", STALE: "قديمة — تحتاج تحديثًا", REVIEW_REQUIRED: "تحتاج مراجعة واعتمادًا", APPROVED: "معتمدة" };
  return <section className="studio-panel" data-testid="book-storyboard"><h3>{say("الكتاب كاملًا — لوحة الصفحات", "Full book storyboard")}</h3>
    <div className="studio-actions"><button disabled={busy || !slots.some((s) => s.state === "MISSING")} onClick={() => onSelect(slots.find((s) => s.state === "MISSING")!.key)}>{say("أول صورة ناقصة", "First missing image")}</button><button disabled={busy || !slots.some((s) => s.state !== "APPROVED")} onClick={() => onSelect(slots.find((s) => s.state !== "APPROVED")!.key)}>{say("أول صورة تحتاج مراجعة", "First image to review")}</button></div>
    <div className="studio-storyboard-grid">{slots.map((slot) => <button key={slot.key} disabled={busy} onClick={() => onSelect(slot.key)} data-page-id={slot.pageId} data-slot={slot.key}>
      {slot.image ? <Thumbnail projectId={snapshot.book.projectId} assetId={slot.image.assetId} /> : <div className="studio-thumbnail">{say("لا توجد صورة", "No image")}</div>}
      <strong>{slot.title}</strong><span>{labels[slot.state]}</span>{slot.warning && <small>{say("تنبيه: راجع الفعل أو التكرار بصريًا", "Review action or repetition visually")}</small>}
    </button>)}</div>
  </section>;
}
