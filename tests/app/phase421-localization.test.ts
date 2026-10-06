import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  UiLanguageProvider,
  UiLanguageSwitch,
  UiStatus,
  UiFinding,
} from "../../apps/desktop/renderer/src/UiLanguage";
import { StoryCreator } from "../../apps/desktop/renderer/src/StoryCreator";
import { StoryPlanner } from "../../apps/desktop/renderer/src/StoryPlanner";
import {
  readUiLanguage,
  saveUiLanguage,
  UI_LANGUAGE_KEY,
  label,
  text,
  beatRoleArabic,
} from "../../apps/desktop/renderer/src/ui-language";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";

function withLanguage(language: string | null, render: () => string) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: () => language, setItem: () => {} } },
  });
  try {
    return render();
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}
const wrapped = (component: React.ReactElement) =>
  renderToStaticMarkup(
    React.createElement(UiLanguageProvider, null, component),
  );
test("UI defaults to Arabic; English preference is bounded and storage failures are nonfatal", () => {
  assert.equal(readUiLanguage(), "ar");
  assert.equal(readUiLanguage({ getItem: () => "de" }), "ar");
  assert.equal(readUiLanguage({ getItem: () => "en" }), "en");
  assert.equal(
    readUiLanguage({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    "ar",
  );
  let stored: unknown;
  saveUiLanguage("en", {
    setItem: (key, value) => {
      stored = [key, value];
    },
  });
  assert.deepEqual(stored, [UI_LANGUAGE_KEY, "en"]);
  assert.doesNotThrow(() =>
    saveUiLanguage("ar", {
      setItem: () => {
        throw Error("blocked");
      },
    }),
  );
});
test("Arabic creator renders labels while request language/category/strategy values remain canonical", () => {
  const html = withLanguage(null, () =>
    wrapped(React.createElement(StoryCreator)),
  );
  assert.ok(html.includes("منشئ القصة"));
  assert.ok(html.includes('aria-label="عمر الطفل بالشهور"'));
  assert.ok(html.includes('value="ar-MSA-simple" selected=""'));
  assert.ok(html.includes('value="everyday-life" selected=""'));
  assert.ok(html.includes('value="hybrid" selected=""'));
  assert.ok(
    html.includes("Warm supported exploration"),
    "Authored story input must not be translated",
  );
});
test("English creator retains English labels and the exact same underlying story values", () => {
  const html = withLanguage("en", () =>
    wrapped(React.createElement(StoryCreator)),
  );
  assert.ok(html.includes("New Story — synthetic creator"));
  assert.ok(html.includes('aria-label="Story language"'));
  assert.ok(html.includes('value="ar-MSA-simple" selected=""'));
  assert.ok(html.includes('value="everyday-life" selected=""'));
});
test("Arabic planner options show translated variation/profile without changing persisted enum choices", () => {
  const workflow = {
    projectId: "synthetic-ui",
    current: { requestRevisionId: "r1" },
  } as WorkflowSnapshot;
  const html = withLanguage(null, () =>
    wrapped(
      React.createElement(StoryPlanner, { workflow, onWorkflow: () => {} }),
    ),
  );
  assert.ok(html.includes("مخطط القصة — قبل الكتابة"));
  assert.ok(html.includes('value="FreshConcept" selected=""'));
  assert.ok(html.includes("فكرة مختلفة تمامًا"));
  assert.ok(html.includes('value="EGYPTIAN_ARAB_MUSLIM_FAMILY" selected=""'));
});
test("Unknown labels remain exact data; translation changes display labels only", () => {
  const raw = "unknown-category/a1b2";
  assert.equal(label(raw, "ar"), raw);
  assert.equal(label("FreshConcept", "en"), "FreshConcept");
  assert.equal(label("FreshConcept", "ar"), "فكرة جديدة");
  assert.equal(text("Story language", "en"), "Story language");
});
test("All canonical beat roles have Arabic presentation labels, including infant REPEAT", () => {
  assert.deepEqual(Object.keys(beatRoleArabic), [
    "OPENING",
    "INCITING",
    "ATTEMPT",
    "TURN",
    "RESOLUTION",
    "ENDING",
    "RECOGNITION",
    "REPEAT",
  ]);
  for (const [role, translated] of Object.entries(beatRoleArabic)) {
    assert.notEqual(translated, role);
    assert.equal(label(role, "ar"), translated);
    assert.equal(label(role, "en"), role);
  }
  assert.equal(label("REPEAT", "ar"), "التكرار");
  assert.equal(label("unknown-authored-role", "ar"), "unknown-authored-role");
});
test("Switch is bilingual and technical error diagnostics remain exact LTR text", () => {
  const html = withLanguage(null, () =>
    wrapped(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(UiLanguageSwitch),
        React.createElement(UiStatus, {
          raw: "PLANNER_SOURCE: No eligible structure a1b2-c3",
        }),
      ),
    ),
  );
  assert.ok(html.includes("العربية") && html.includes("English"));
  assert.ok(html.includes('data-testid="ui-language-ar" aria-pressed="true"'));
  assert.ok(
    html.includes('dir="ltr">PLANNER_SOURCE: No eligible structure a1b2-c3'),
  );
  assert.ok(html.includes("لم يتم العثور على بنية قصة مناسبة"));
});
test("Arabic QA warnings explain their limits and retain exact original diagnostics", () => {
  const message =
    "Concrete objective delivery needs editorial judgment even when exact objective anchors match.";
  const html = withLanguage(null, () =>
    wrapped(
      React.createElement(UiFinding, {
        finding: {
          severity: "medium",
          category: "objective",
          message,
          suggestedAction: "Original action",
        },
      }),
    ),
  );
  assert.ok(html.includes("تحقق الهدف داخل القصة يحتاج حكمًا تحريريًا"));
  assert.ok(html.includes(message) && html.includes("Original action"));
  assert.ok(html.includes('dir="ltr"'));
});
