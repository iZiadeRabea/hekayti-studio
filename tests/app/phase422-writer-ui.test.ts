import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UiLanguageProvider } from "../../apps/desktop/renderer/src/UiLanguage";
import {
  WriterResponseFeedback,
  WriterPromptPreview,
  writerDiagnosticReason,
} from "../../apps/desktop/renderer/src/WriterResponseFeedback";
import { text } from "../../apps/desktop/renderer/src/ui-language";
import type { WriterPreview } from "@hekayti/contracts/planner";

function renderComponent(
  component: React.ReactElement,
  language: "ar" | "en" = "ar",
) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: () => language, setItem: () => {} } },
  });
  try {
    return renderToStaticMarkup(
      React.createElement(UiLanguageProvider, null, component),
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}
function render(preview: WriterPreview, language: "ar" | "en" = "ar") {
  return renderComponent(
    React.createElement(WriterResponseFeedback, { preview }),
    language,
  );
}
const failed: WriterPreview = {
  status: "FAIL",
  editions: [],
  diagnostics: [
    {
      code: "WRITER_SPEAKER_DISALLOWED",
      message: "Error: unsafe provider text\n at C:/private/path.ts:5",
      mode: "ar-EG",
      pageNumber: 3,
      speaker: "ليلى",
    },
  ],
};

test("Writer action feedback has the precise requested Arabic messages", () => {
  assert.equal(text("Prompt prepared.", "ar"), "تم تجهيز البرومبت.");
  assert.equal(text("ChatGPT prompt copied.", "ar"), "تم نسخ برومبت ChatGPT.");
  assert.equal(text("Gemini prompt copied.", "ar"), "تم نسخ برومبت Gemini.");
  assert.equal(
    text("Draft imported successfully.", "ar"),
    "تم استيراد المسودة بنجاح.",
  );
});
test("Arabic diagnostics explain the safe reason and show precise edition/page/speaker beside the response", () => {
  const html = render(failed);
  assert.ok(html.includes("هذا المتحدث غير مسموح به في هذه الصفحة"));
  assert.ok(html.includes("البيانات الحالية لم تتغير"));
  assert.ok(html.includes("العربية المصرية"));
  assert.ok(html.includes('dir="ltr">ar-EG') && html.includes('dir="ltr">3'));
  assert.ok(html.includes('dir="auto">ليلى'));
  assert.ok(
    html.includes("<details>") &&
      html.includes('dir="ltr">WRITER_SPEAKER_DISALLOWED'),
  );
  assert.ok(
    !html.includes("unsafe provider") && !html.includes("private/path"),
  );
});
test("English diagnostics remain clear, preserve data location and do not expose exception stacks", () => {
  const html = render(failed, "en");
  assert.ok(html.includes("This speaker is not allowed on this page."));
  assert.ok(
    html.includes("Story edition") &&
      html.includes("Speaker") &&
      html.includes("Page"),
  );
  assert.ok(
    html.includes("ليلى") && html.includes("WRITER_SPEAKER_DISALLOWED"),
  );
  assert.ok(!html.includes("private/path"));
});
test("READY and REVIEW previews disclose readonly behavior and edition counts, not human approval", () => {
  const preview: WriterPreview = {
    status: "READY",
    diagnostics: [],
    editions: [{ mode: "ar-MSA-simple", pageCount: 4, totalWords: 31 }],
  };
  const ready = render(preview);
  assert.ok(ready.includes("الرد جاهز للاستيراد"));
  assert.ok(ready.includes("هذا الفحص لا يحفظ أي تغييرات"));
  assert.ok(ready.includes('dir="ltr">4') && ready.includes('dir="ltr">31'));
  const review = render({
    ...preview,
    status: "REVIEW",
    diagnostics: [{ code: "WRITER_HUMAN_REVIEW", message: "raw" }],
  });
  assert.ok(review.includes("الفحص الآلي ليس اعتمادًا للنص"));
});
test("Every stable writer diagnostic code has a safe explanation; canonical/review prefixes are handled", () => {
  for (const code of [
    "WRITER_JSON",
    "WRITER_SCHEMA",
    "WRITER_SIZE",
    "WRITER_BIDI",
    "WRITER_LANGUAGES",
    "WRITER_PAGES",
    "WRITER_PAGE_MISSING",
    "WRITER_SPEAKER_UNKNOWN",
    "WRITER_SPEAKER_AMBIGUOUS",
    "WRITER_SPEAKER_DISALLOWED",
    "WRITER_OBJECTIVE_CONTRADICTION",
    "WRITER_CAST_DRIFT",
    "WRITER_STRUCTURE_DRIFT",
    "WRITER_CAST_REVIEW",
    "WRITER_HUMAN_REVIEW",
    "WRITER_STALE",
  ]) {
    assert.notEqual(
      writerDiagnosticReason(code),
      "Check the response format and try again.",
    );
    assert.notEqual(
      text(writerDiagnosticReason(code), "ar"),
      writerDiagnosticReason(code),
    );
  }
  assert.equal(
    writerDiagnosticReason("WRITER_CANONICAL_AGE"),
    "Canonical story validation failed; review this page.",
  );
  assert.equal(
    writerDiagnosticReason("WRITER_REVIEW_LANGUAGE"),
    "Human story review is required for this page.",
  );
  assert.equal(
    writerDiagnosticReason("WRITER_FORMAT"),
    "Check the response format and try again.",
  );
});
test("Unknown diagnostic data cannot inject markup or leak raw provider errors", () => {
  const html = render({
    status: "FAIL",
    editions: [],
    diagnostics: [
      {
        code: "FUTURE_CODE",
        message: "Error: secret stack",
        speaker: "<script>alert(1)</script>",
        pageNumber: 2,
      },
    ],
  });
  assert.ok(html.includes("FUTURE_CODE"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>") && !html.includes("secret stack"));
});
test("Prompt preview is readonly and preserves story text and technical schema in either UI language", () => {
  const prompt =
    'القصة المطلوبة\nنور تنتظر دورها.\n{"schemaVersion":"writer-response/1.0"}';
  for (const language of ["ar", "en"] as const) {
    const html = renderComponent(
      React.createElement(WriterPromptPreview, { text: prompt }),
      language,
    );
    assert.ok(html.includes('data-testid="writer-prompt-preview"'));
    assert.ok(/readonly=""/i.test(html) && html.includes('dir="auto"'));
    assert.ok(html.includes("نور تنتظر دورها."));
    assert.ok(html.includes("writer-response/1.0"));
    assert.ok(
      html.includes(
        text(
          "Review the prompt before copying. Nothing is sent automatically.",
          language,
        ),
      ),
    );
  }
});
test("A stale or absent prompt preview requests preparation instead of showing invented content", () => {
  const html = renderComponent(
    React.createElement(WriterPromptPreview, { text: "" }),
  );
  assert.ok(
    html.includes(
      text("The plan or request changed; prepare a current prompt.", "ar"),
    ),
  );
  assert.ok(!html.includes("<textarea"));
});
test("Actual stale and concurrent-update service failures explain reloading and preparing the current package", () => {
  for (const code of ["PLANNER_STALE", "PLANNER_CONFLICT"]) {
    assert.equal(
      writerDiagnosticReason(code),
      "The plan or request changed; prepare a current prompt.",
    );
    for (const language of ["ar", "en"] as const) {
      const html = render(
        {
          status: "FAIL",
          editions: [],
          diagnostics: [{ code, message: "Error: private stack" }],
        },
        language,
      );
      assert.ok(
        html.includes(
          text(
            "The plan or request changed; prepare a current prompt.",
            language,
          ),
        ),
      );
      assert.ok(
        html.includes(
          text(
            "Reload the story and planner, then prepare and copy the current package before retrying import.",
            language,
          ),
        ),
      );
      assert.ok(html.includes(`dir="ltr">${code}`));
      assert.ok(!html.includes("private stack"));
      assert.ok(
        !html.includes(
          text("Check the response format and try again.", language),
        ),
      );
    }
  }
});
test("Register advisories explain the requested edition and preserve the precise page", () => {
  const reason =
    "This page may use wording from another language edition; review the requested register.";
  assert.equal(
    writerDiagnosticReason("WRITER_REVIEW_LANGUAGE_REGISTER"),
    reason,
  );
  for (const language of ["ar", "en"] as const) {
    const html = render(
      {
        status: "REVIEW",
        editions: [],
        diagnostics: [
          {
            code: "WRITER_REVIEW_LANGUAGE_REGISTER",
            message: "raw stack",
            mode: "ar-MSA-simple",
            pageNumber: 2,
          },
        ],
      },
      language,
    );
    assert.ok(html.includes(text(reason, language)));
    assert.ok(
      html.includes('dir="ltr">ar-MSA-simple') && html.includes('dir="ltr">2'),
    );
    assert.ok(html.includes("WRITER_REVIEW_LANGUAGE_REGISTER"));
    assert.ok(!html.includes("raw stack"));
  }
});
