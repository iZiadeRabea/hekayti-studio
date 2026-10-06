import { useState, type ReactNode } from "react";
import { useCreatorUi } from "./creator-ui";
export type CreatorMode = "SIMPLE" | "ADVANCED";
export const CREATOR_MODE_KEY = "hekayti.creatorMode";
export function readCreatorMode(
  storage?: Pick<Storage, "getItem">,
): CreatorMode {
  try {
    return storage?.getItem(CREATOR_MODE_KEY) === "ADVANCED"
      ? "ADVANCED"
      : "SIMPLE";
  } catch {
    return "SIMPLE";
  }
}
export function saveCreatorMode(
  mode: CreatorMode,
  storage?: Pick<Storage, "setItem">,
) {
  try {
    storage?.setItem(CREATOR_MODE_KEY, mode);
  } catch {
    /* Local preference is optional. */
  }
}
function localStorageOrUndefined() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
export function CreatorModeShell({
  simple,
  advanced,
}: {
  simple: ReactNode;
  advanced: ReactNode;
}) {
  const { c } = useCreatorUi();
  const [mode, setMode] = useState<CreatorMode>(() =>
    readCreatorMode(localStorageOrUndefined()),
  );
  const next = mode === "SIMPLE" ? "ADVANCED" : "SIMPLE";
  return (
    <>
      <div className="creator-mode-switch" aria-label={c("Creator modes")}>
        <button
          data-testid="creator-mode-switch"
          onClick={() => {
            saveCreatorMode(next, localStorageOrUndefined());
            setMode(next);
          }}
        >
          {c(next === "ADVANCED" ? "Advanced mode" : "Simple mode")}
        </button>
      </div>
      <div data-testid="creator-mode" data-mode={mode}>
        {mode === "SIMPLE" ? simple : advanced}
      </div>
    </>
  );
}
