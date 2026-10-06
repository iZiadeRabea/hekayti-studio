import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  text,
  label,
  statusText,
  readUiLanguage,
  saveUiLanguage,
  type UiLanguage,
  type UiKey,
} from "./ui-language";
const Context = createContext<{
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
} | null>(null);
function localStorageOrUndefined() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
export function UiLanguageProvider({ children }: { children: ReactNode }) {
  const [language, set] = useState<UiLanguage>(() =>
    readUiLanguage(localStorageOrUndefined()),
  );
  function setLanguage(next: UiLanguage) {
    set(next);
    saveUiLanguage(next, localStorageOrUndefined());
  }
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);
  return (
    <Context.Provider value={{ language, setLanguage }}>
      {children}
    </Context.Provider>
  );
}
export function useUi() {
  const value = useContext(Context);
  if (!value) throw Error("Missing UI language provider");
  return {
    ...value,
    t: (key: UiKey) => text(key, value.language),
    label: (raw: string) => label(raw, value.language),
    status: (raw: string) => statusText(raw, value.language),
  };
}
export function UiLanguageSwitch() {
  const ui = useUi();
  return (
    <div className="ui-language-switch" dir="ltr" aria-label="UI language">
      <button
        data-testid="ui-language-ar"
        aria-pressed={ui.language === "ar"}
        onClick={() => ui.setLanguage("ar")}
      >
        العربية
      </button>
      <span aria-hidden="true"> | </span>
      <button
        data-testid="ui-language-en"
        aria-pressed={ui.language === "en"}
        onClick={() => ui.setLanguage("en")}
      >
        English
      </button>
    </div>
  );
}
export function UiStatus({ raw }: { raw: string }) {
  const ui = useUi(),
    translated = ui.status(raw);
  return (
    <>
      <span dir="auto">{translated}</span>
      {translated !== raw &&
        !Object.prototype.hasOwnProperty.call(arabicKnown, raw) && (
          <details>
            <summary>{ui.t("Technical details")}</summary>
            <pre dir="ltr">{raw}</pre>
          </details>
        )}
    </>
  );
}
import { arabic as arabicKnown } from "./ui-language";
export function UiFinding({
  finding,
}: {
  finding: {
    severity: string;
    message: string;
    suggestedAction?: string;
    category?: string;
  };
}) {
  const ui = useUi();
  return ui.language === "en" ? (
    <>
      <span>
        {finding.severity}: {finding.message} {finding.suggestedAction}
      </span>
    </>
  ) : (
    <>
      <span>
        {ui.label(finding.severity)}:{" "}
        {finding.category && <>{ui.label(finding.category)} — </>}
        {Object.prototype.hasOwnProperty.call(arabicKnown, finding.message)
          ? ui.t(finding.message as UiKey)
          : ui.t("Review this finding")}
      </span>
      <details>
        <summary>{ui.t("Technical details")}</summary>
        <p dir="ltr">
          {finding.message} {finding.suggestedAction}
        </p>
      </details>
    </>
  );
}
