import { useUi } from "./UiLanguage";
import type { BookStudioSnapshot } from "@hekayti/contracts/book";

export function studioCharacters(snapshot: BookStudioSnapshot) {
  return (
    snapshot.session.planner.plans.find(
      (plan) =>
        plan.revisionId === snapshot.session.planner.currentPlanRevisionId,
    )?.characters ?? []
  );
}

export function useStudioUi() {
  const ui = useUi();
  return {
    ...ui,
    say: (ar: string, en: string) => (ui.language === "ar" ? ar : en),
  };
}

// Canvas geometry only; the service validates saved print geometry and approvals.
export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function constrainCanvasRect(
  rect: CanvasRect,
  margin = 0.04,
): CanvasRect {
  const width = Math.min(1 - margin * 2, Math.max(0.12, rect.width));
  const height = Math.min(1 - margin * 2, Math.max(0.08, rect.height));
  return {
    x: Math.min(1 - margin - width, Math.max(margin, rect.x)),
    y: Math.min(1 - margin - height, Math.max(margin, rect.y)),
    width,
    height,
  };
}

export function movePathStep<T>(steps: T[], index: number, delta: -1 | 1): T[] {
  const next = index + delta;
  if (next < 0 || next >= steps.length) return steps;
  const result = [...steps];
  [result[index], result[next]] = [result[next]!, result[index]!];
  return result;
}
