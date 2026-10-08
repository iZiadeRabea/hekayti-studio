import { useEffect, useState } from "react";
import type {
  BookCommand,
  BookStudioSnapshot,
  CompositionPlan,
} from "@hekayti/contracts/book";
import { similarVisualIntents } from "@hekayti/core/book";
import { useStudioUi } from "./studio-ui";
export function PageCompositionPlan({
  snapshot,
  pageId,
  onCommand,
  busy,
}: {
  snapshot: BookStudioSnapshot;
  pageId: string;
  onCommand: (c: BookCommand) => Promise<boolean>;
  busy: boolean;
}) {
  const { say } = useStudioUi(),
    saved = [...(snapshot.compositionPlans ?? [])]
      .reverse()
      .find((p) => p.pageId === pageId);
  const [plan, setPlan] = useState<CompositionPlan>();
  useEffect(() => {
    setPlan(saved ? structuredClone(saved) : undefined);
  }, [saved?.revisionId, pageId]);
  const binding = {
    projectId: snapshot.book.projectId,
    expectedBook: snapshot.book.recordVersion,
  };
  const previous = plan
    ? [...(snapshot.compositionPlans ?? [])]
        .reverse()
        .find((p) => p.visual.pageNumber === plan.visual.pageNumber - 1)
    : undefined;
  const repeated =
    plan &&
    previous &&
    similarVisualIntents(previous.visual, plan.visual) &&
    !plan.repetitionOverride;
  return (
    <section
      className="studio-panel"
      id={`studio-target-composition-${pageId}`}
      tabIndex={-1}
    >
      <h3>
        {say(
          "خطة الرسم والكلام قبل تجهيز الصورة",
          "Art and text plan before artwork",
        )}
      </h3>
      <button
        disabled={busy}
        onClick={() => onCommand({ ...binding, action: "PLAN_PAGE", pageId })}
      >
        {say("جهّز / أعد ترتيب خطة الصفحة", "Prepare / rearrange page plan")}
      </button>
      {plan && (
        <>
          <p>
            {say("الحدث: ", "Event: ")}
            {plan.visual.pageAction}
          </p>
          <p>
            {say("التركيز: ", "Focus: ")}
            {plan.visual.focus}
          </p>
          <p>
            {say("التكوين: ", "Composition: ")}
            {plan.visual.cameraFraming}
          </p>
          {plan.visual.stateChange.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
          {plan.layoutReviewRequired && (
            <p role="status" className="studio-warning">
              {say(
                "الترتيب مقترح ويحتاج مراجعتك. حدد مناطق الوجه والفعل المهمة؛ التطبيق لا يفحص الرسم بصريًا.",
                "Suggested layout needs review. Mark important faces/actions; the app does not visually inspect artwork.",
              )}
            </p>
          )}
          {repeated && (
            <div className="studio-warning" role="alert">
              <p>
                {say(
                  "مشهد الصفحة قريب جدًا من الصفحة السابقة.",
                  "This scene is very similar to the previous page.",
                )}
              </p>
              <button
                onClick={() =>
                  setPlan({
                    ...plan,
                    visual: {
                      ...plan.visual,
                      cameraFraming:
                        "راجع لقطة أقرب إلى الفعل المذكور فقط؛ لا تضف حدثًا",
                      compositionHint: "أبرز الفعل الأصلي بمساحة أبسط حوله",
                    },
                  })
                }
              >
                {say("اقتراح تكوين مختلف", "Suggest different composition")}
              </button>
              <button
                onClick={() => setPlan({ ...plan, repetitionOverride: true })}
              >
                {say("الاستمرار كما هو", "Keep intentional similarity")}
              </button>
            </div>
          )}
          <div
            className="composition-map"
            style={{
              position: "relative",
              aspectRatio: plan.settings.widthMm / plan.settings.heightMm,
              background: "#efe5d5",
              maxWidth: 420,
            }}
          >
            {plan.regions.map((r, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: r.rect.x * 100 + "%",
                  top: r.rect.y * 100 + "%",
                  width: r.rect.width * 100 + "%",
                  height: r.rect.height * 100 + "%",
                  background: "#fffdf0",
                  border: "1px solid #947959",
                  borderRadius: r.kind === "DIALOGUE" ? "35%" : "20%",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {r.kind === "NARRATION"
                  ? say("سرد", "Narration")
                  : say("حوار", "Dialogue") + " " + (r.sourceIndex + 1)}
              </div>
            ))}
            {plan.protectedRegions.map((r, i) => (
              <div
                key={`p${i}`}
                style={{
                  position: "absolute",
                  left: r.x * 100 + "%",
                  top: r.y * 100 + "%",
                  width: r.width * 100 + "%",
                  height: r.height * 100 + "%",
                  border: "2px dashed #9b3a20",
                }}
              />
            ))}
          </div>
          <details>
            <summary>
              {say(
                "مراجعة مكان الكلام والمناطق المهمة",
                "Review text placement and protected regions",
              )}
            </summary>
            {plan.regions.map((r, i) => (
              <fieldset key={i}>
                <legend>
                  {r.kind === "NARRATION"
                    ? say("السرد", "Narration")
                    : say("الحوار", "Dialogue") + " " + (r.sourceIndex + 1)}
                </legend>
                {(["x", "y", "width", "height"] as const).map((k) => (
                  <label key={k}>
                    {
                      {
                        x: "الموضع الأفقي ٪",
                        y: "الموضع الرأسي ٪",
                        width: "العرض ٪",
                        height: "الارتفاع ٪",
                      }[k]
                    }
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(r.rect[k] * 100)}
                      onChange={(e) =>
                        setPlan({
                          ...plan,
                          regions: plan.regions.map((q, j) =>
                            j === i
                              ? {
                                  ...q,
                                  rect: {
                                    ...q.rect,
                                    [k]: Number(e.target.value) / 100,
                                  },
                                }
                              : q,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
              </fieldset>
            ))}
            <button
              onClick={() =>
                setPlan({
                  ...plan,
                  protectedRegions: [
                    ...plan.protectedRegions,
                    { x: 0.35, y: 0.35, width: 0.3, height: 0.3 },
                  ],
                })
              }
            >
              {say(
                "أضف منطقة وجه أو فعل مهمة",
                "Add important face / action region",
              )}
            </button>
            {plan.protectedRegions.map((r, i) => (
              <fieldset key={i}>
                <legend>
                  {say("منطقة مهمة", "Protected region")} {i + 1}
                </legend>
                {(["x", "y", "width", "height"] as const).map((k) => (
                  <label key={k}>
                    {
                      {
                        x: "الموضع الأفقي ٪",
                        y: "الموضع الرأسي ٪",
                        width: "العرض ٪",
                        height: "الارتفاع ٪",
                      }[k]
                    }
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round(r[k] * 100)}
                      onChange={(e) =>
                        setPlan({
                          ...plan,
                          protectedRegions: plan.protectedRegions.map((q, j) =>
                            j === i
                              ? { ...q, [k]: Number(e.target.value) / 100 }
                              : q,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <button
                  onClick={() =>
                    setPlan({
                      ...plan,
                      protectedRegions: plan.protectedRegions.filter(
                        (_, j) => j !== i,
                      ),
                    })
                  }
                >
                  {say("إزالة المنطقة", "Remove region")}
                </button>
              </fieldset>
            ))}
          </details>
          <label>
            {say(
              "توجيه بصري إضافي بدون تغيير أحداث القصة",
              "Visual direction without changing story events",
            )}
            <textarea
              value={plan.notes}
              maxLength={4000}
              onChange={(e) => setPlan({ ...plan, notes: e.target.value })}
            />
          </label>
          <button
            disabled={busy}
            onClick={() =>
              onCommand({ ...binding, action: "SAVE_COMPOSITION", plan })
            }
          >
            {say("حفظ خطة الرسم والكلام", "Save art and text plan")}
          </button>
        </>
      )}
    </section>
  );
}
