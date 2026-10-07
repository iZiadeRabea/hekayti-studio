import { createRoot } from "react-dom/client";
import "@fontsource/noto-sans-arabic/400.css";
import "./style.css";
import { UiLanguageProvider } from "./UiLanguage";
import { CreatorModeShell } from "./CreatorMode";
import { AdvancedApp } from "./AdvancedApp";
import { BookStudioApp } from "./BookStudioApp";
createRoot(document.getElementById("root")!).render(
  <UiLanguageProvider>
    <CreatorModeShell simple={<BookStudioApp />} advanced={<AdvancedApp />} />
  </UiLanguageProvider>,
);
