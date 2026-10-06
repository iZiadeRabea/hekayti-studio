import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UiLanguageProvider } from "../../apps/desktop/renderer/src/UiLanguage";
import {
  CreatorModeShell,
  readCreatorMode,
  saveCreatorMode,
  CREATOR_MODE_KEY,
} from "../../apps/desktop/renderer/src/CreatorMode";
import {
  SimpleStoryForm,
  simpleFormInput,
  type SimpleFormValues,
  type FormChoices,
} from "../../apps/desktop/renderer/src/SimpleStoryForm";
import { SimpleError } from "../../apps/desktop/renderer/src/SimpleFeedback";
import { SimpleWriter } from "../../apps/desktop/renderer/src/SimpleWriter";
import { SimpleIllustrations } from "../../apps/desktop/renderer/src/SimpleIllustrations";
import type { IllustrationSnapshot } from "@hekayti/contracts/illustration";
import { SimplePlanPreview } from "../../apps/desktop/renderer/src/SimplePlanPreview";
import {
  SimpleReader,
  SimpleCompare,
} from "../../apps/desktop/renderer/src/SimpleReader";
import type {
  PlanPresentation,
  StoryReaderModel,
} from "@hekayti/contracts/creator";
function render(
  component: React.ReactElement,
  preference?: string,
  language = "ar",
) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) =>
          key === CREATOR_MODE_KEY ? (preference ?? null) : language,
        setItem: () => {},
      },
    },
  });
  try {
    return renderToStaticMarkup(
      React.createElement(UiLanguageProvider, null, component),
    );
  } finally {
    if (old) Object.defineProperty(globalThis, "window", old);
    else Reflect.deleteProperty(globalThis, "window");
  }
}
const values: SimpleFormValues = {
  agePreset: "THREE_FIVE",
  exactAge: "42",
  language: "ar-EG",
  bothLanguages: true,
  category: "adventure",
  goalPreset: "CUSTOM",
  customGoal: "يتعلم الطفل يستنى دوره ويلعب مع صاحبه.",
  successScenario: "يتبادل الطفل اللعب مع صاحبه.",
  fictionalName: "نور",
  personalize: false,
  setting: "ملعب صغير في الحي جنب البيت",
  constraints: "عايز القصة خفيفة ومضحكة، من غير خوف، وتحصل في مكان مصري طبيعي.",
  variation: "FreshConcept",
  profile: "EGYPTIAN_ARAB_MUSLIM_FAMILY",
};
const choices: FormChoices = {
  agePresets: [
    {
      key: "THREE_FIVE",
      ageMonths: 42,
      label: {
        "ar-EG": "٣–٥ سنوات",
        "ar-MSA-simple": "٣–٥ سنوات",
        en: "3–5 years",
      },
      note: {
        "ar-EG": "عمر تقريبي",
        "ar-MSA-simple": "عمر تقريبي",
        en: "Approximate age",
      },
    },
  ],
  goalPresets: [
    {
      key: "SHARING",
      label: {
        "ar-EG": "المشاركة",
        "ar-MSA-simple": "المشاركة",
        en: "Sharing",
      },
      description: {
        "ar-EG": "المشاركة",
        "ar-MSA-simple": "المشاركة",
        en: "Sharing",
      },
      successScenario: {
        "ar-EG": "تبادل اللعب",
        "ar-MSA-simple": "تبادل اللعب",
        en: "Taking turns",
      },
    },
  ],
};
test("Simple is the bounded default; Advanced preference persists independently of UI language", () => {
  assert.equal(readCreatorMode(), "SIMPLE");
  assert.equal(readCreatorMode({ getItem: () => "unknown" }), "SIMPLE");
  assert.equal(readCreatorMode({ getItem: () => "ADVANCED" }), "ADVANCED");
  assert.equal(
    readCreatorMode({
      getItem: () => {
        throw Error("blocked");
      },
    }),
    "SIMPLE",
  );
  let stored: [string, string] | undefined;
  saveCreatorMode("ADVANCED", {
    setItem: (key, value) => {
      stored = [key, value];
    },
  });
  assert.deepEqual(stored, [CREATOR_MODE_KEY, "ADVANCED"]);
  assert.doesNotThrow(() =>
    saveCreatorMode("SIMPLE", {
      setItem: () => {
        throw Error("blocked");
      },
    }),
  );
});
test("Default shell does not render Advanced metadata; saved Advanced remains available", () => {
  const component = React.createElement(CreatorModeShell, {
    simple: React.createElement("p", null, "واجهة بسيطة"),
    advanced: React.createElement("p", null, "technical-only-fixture"),
  });
  const simple = render(component);
  assert.ok(
    simple.includes('data-mode="SIMPLE"') && simple.includes("الوضع المتقدم"),
  );
  assert.ok(!simple.includes("technical-only-fixture"));
  const advanced = render(component, "ADVANCED");
  assert.ok(
    advanced.includes('data-mode="ADVANCED"') &&
      advanced.includes("technical-only-fixture") &&
      advanced.includes("الوضع البسيط"),
  );
});
test("Arabic compact form preserves exact Arabic fields and canonical option values with collapsed extras", () => {
  const html = render(
    React.createElement(SimpleStoryForm, {
      choices,
      value: values,
      onChange: () => {},
      onCreate: () => {},
      busy: false,
    }),
  );
  for (const exact of [values.setting, values.constraints, values.customGoal])
    assert.ok(html.includes(exact));
  assert.ok(html.includes("أنشئ القصة") && html.includes("خيارات إضافية"));
  assert.ok(html.includes("<details>") && !html.includes("<details open"));
  assert.ok(
    html.includes('value="ar-EG"') && html.includes('value="FreshConcept"'),
  );
  assert.ok(
    !html.includes("photo") &&
      !html.includes("UUID") &&
      !html.includes("holds"),
  );
  assert.ok(!html.replace(/<[^>]+>/g, "").match(/[A-Za-z]/));
});
test("English UI changes labels but does not translate authored Arabic or story-language values", () => {
  const html = render(
    React.createElement(SimpleStoryForm, {
      choices,
      value: values,
      onChange: () => {},
      onCreate: () => {},
      busy: false,
    }),
    undefined,
    "en",
  );
  assert.ok(
    html.includes("Create story") &&
      html.includes(values.setting) &&
      html.includes(values.customGoal),
  );
  assert.ok(html.includes('value="ar-EG"'));
});
test("Simple error guidance is actionable Arabic with technical code only inside disclosure", () => {
  const stale = render(
    React.createElement(SimpleError, { code: "PLANNER_STALE" }),
  );
  assert.ok(stale.includes("أعد فتح القصة"));
  assert.ok(
    stale.includes("<details>") && stale.includes('dir="ltr">PLANNER_STALE'),
  );
  const structure = render(
    React.createElement(SimpleError, { code: "PLANNER_NO_FAMILY" }),
  );
  assert.ok(structure.includes("جرّب تغيير نوع القصة أو الهدف"));
});
const plan: PlanPresentation = {
  mode: "ar-EG",
  supported: true,
  title: "لعبة بالدور",
  ageMonths: 42,
  category: "مغامرة",
  goal: values.customGoal,
  objective: "نور وسلمى عايزين يلعبوا سوا.",
  setting: values.setting,
  constraints: [values.constraints],
  characters: [
    { name: "نور", role: "صديقة" },
    { name: "سلمى", role: "صديقة" },
  ],
  problem: "الاتنين عايزين نفس اللعبة.",
  opening: "دخلوا الملعب.",
  resolution: "اتفقوا على تبادل الدور.",
  ending: "كملوا اللعب سوا.",
  events: [
    {
      sequence: 1,
      action: "نور بتستنى وسلمى بتجرب.",
      beforeState: "نفس الدور",
      afterState: "دورين",
      cause: "عايزين يلعبوا",
      strategy: "يتبادلوا",
      consequence: "اللعبة كملت",
      informationChange: "فهموا الدور",
      relationshipChange: "اتعاونوا",
    },
  ],
  notices: [
    { code: "HUMAN_QUALITY", severity: "medium", text: "راجع خفة الحوار." },
    { code: "UNRESOLVED", severity: "high", text: "يجب مراجعة نهاية القصة." },
  ],
};
test("Human plan preview preserves localized authored content, never silently accepts, and exposes high notices", () => {
  const html = render(
    React.createElement(SimplePlanPreview, {
      plan,
      busy: false,
      onContinue: () => {},
    }),
  );
  assert.ok(
    html.includes(values.setting) &&
      html.includes(values.constraints) &&
      html.includes(plan.events[0]!.action),
  );
  assert.ok(
    html.includes('data-testid="simple-blocking-notices"') &&
      html.includes('role="alert"'),
  );
  assert.ok(
    html.includes("يجب مراجعة نهاية القصة.") &&
      html.includes("متابعة لكتابة القصة"),
  );
  assert.ok(!html.includes('checked=""'));
  assert.match(html, /<button[^>]*disabled=""[^>]*>متابعة لكتابة القصة/);
});
const reader: StoryReaderModel = {
  notices: [],
  projectId: "private-project-identity",
  draftId: "private-draft-identity",
  title: "لعبة بالدور",
  ageMonths: 42,
  category: "adventure",
  mode: "ar-EG",
  availableModes: ["ar-EG", "ar-MSA-simple"],
  historical: false,
  providerLabel: "Gemini",
  providerBasis: "USER_REPORTED",
  drafts: [
    {
      draftId: "private-draft-identity",
      number: 1,
      modes: ["ar-EG"],
      current: true,
      providerLabel: "Gemini",
      providerBasis: "USER_REPORTED",
    },
  ],
  pages: [
    {
      pageId: "private-page-identity",
      pageNumber: 1,
      narration: "نور راحت الملعب الصغير.",
      dialogue: [{ speaker: "سلمى", text: "نلعب بالدور؟" }],
      altText: "صديقتان في الملعب",
      wordCount: 8,
    },
  ],
  totalWords: 8,
  review: { current: true, qaReady: false, approved: false, rejected: false },
};
test("Reader displays narration, named dialogue and honest provenance without visible internal IDs or automatic approval", () => {
  const html = render(
    React.createElement(SimpleReader, {
      model: reader,
      onMode: () => {},
      onDraft: () => {},
      onBack: () => {},
      onCompare: () => {},
      onIllustrate: () => {},
      onReview: () => {},
      busy: false,
    }),
  );
  const visible = html.replace(/<[^>]+>/g, "");
  assert.ok(
    visible.includes(reader.pages[0]!.narration) &&
      visible.includes("سلمى:") &&
      visible.includes("نلعب بالدور؟"),
  );
  assert.ok(
    visible.includes("الخدمة كما ذكرها الكاتب") &&
      visible.includes("لا تعتمدها تلقائيًا"),
  );
  assert.ok(
    !visible.includes("private-") &&
      !visible.includes("wordCount") &&
      !visible.includes("altText"),
  );
  assert.ok(visible.includes("لا توجد نسخة ثانية بهذه اللغة"));
});
test("Comparison renders actual same-language page texts side by side without invented differences", () => {
  const right = {
    ...reader,
    draftId: "second",
    pages: [{ ...reader.pages[0]!, narration: "سلمى وصلت الملعب الأول." }],
  };
  const html = render(
    React.createElement(SimpleCompare, {
      model: {
        compatible: true,
        reason: null,
        mode: "ar-EG",
        left: reader,
        right,
        pages: [
          { pageNumber: 1, left: reader.pages[0]!, right: right.pages[0]! },
        ],
      },
      onBack: () => {},
    }),
  );
  assert.ok(
    html.includes(reader.pages[0]!.narration) &&
      html.includes(right.pages[0]!.narration),
  );
  assert.ok(html.includes("النسخة الأولى") && html.includes("النسخة الثانية"));
  assert.ok(!html.includes("private-page-identity"));
});
test("Illustration workspace honestly discloses fictional defaults and stale prompts without generating images", () => {
  const snapshot: IllustrationSnapshot = {
    recordVersion: 0,
    plan: null,
    plans: [],
    bible: null,
    style: null,
    prompts: [],
    stale: true,
    staleReasons: ["DRAFT_CHANGED"],
    notice: "",
  };
  const html = render(
    React.createElement(SimpleIllustrations, {
      snapshot,
      pages: reader.pages,
      onBack: () => {},
      onPrepare: () => {},
      onGenerate: () => {},
      onCopy: () => {},
      onEditBible: () => {},
      onEditStyle: () => {},
      busy: false,
    }),
  );
  assert.ok(
    html.includes('data-testid="illustration-stale"') &&
      html.includes("مظهر الشخصيات افتراضي خيالي"),
  );
  assert.ok(
    html.includes("لا يتم إنشاء الصور أو استيرادها") &&
      html.includes("راجع مرجع الشخصيات أولًا"),
  );
  assert.ok(
    html.includes("<details>") && html.includes('dir="ltr">DRAFT_CHANGED'),
  );
  assert.match(html, /<button[^>]*disabled=""[^>]*>تجهيز برومبتات الصور/);
});
test("Create mapping preserves authored whitespace and a single exact constraint string without changing story language", () => {
  const authored = {
    ...values,
    setting: `  ${values.setting}  `,
    constraints: `\n${values.constraints}\n`,
    customGoal: ` ${values.customGoal} `,
  };
  const input = simpleFormInput(authored, 7, true);
  assert.equal(input.setting, authored.setting);
  assert.equal(input.constraints, authored.constraints);
  assert.equal(input.customGoal, authored.customGoal);
  assert.equal(input.primaryLanguageMode, "ar-EG");
  assert.equal(input.exactAgeMonths, 42);
  assert.equal(input.expectedLibrary, 7);
  assert.equal(input.provisionalAcknowledged, true);
  assert.ok(!("fictionalName" in input));
  const blank = simpleFormInput(
    {
      ...values,
      exactAge: "",
      customGoal: "",
      constraints: "",
      setting: "",
      successScenario: "",
    },
    0,
    false,
  );
  assert.ok(!("exactAgeMonths" in blank) && !("constraints" in blank));
});
test("Writer shows human Arabic prompt sections and keeps machine text in a technical disclosure; copying/import need review", () => {
  const html = render(
    React.createElement(SimpleWriter, {
      presentation: plan,
      text: "technical-schema-fixture",
      preview: null,
      prepared: true,
      busy: false,
      onPrepare: () => {},
      onCopy: () => {},
      onPreview: () => {},
      onImport: () => {},
    }),
  );
  for (const heading of [
    "القصة المطلوبة",
    "ما يجب الحفاظ عليه",
    "ما يمكن للكاتب ابتكاره",
    "قواعد اللغة",
    "قواعد الجودة الأدبية",
    "صيغة الرد المطلوبة",
  ])
    assert.ok(html.includes(heading));
  assert.ok(
    html.includes(values.constraints) && html.includes(plan.events[0]!.action),
  );
  assert.match(
    html,
    /<details><summary>التفاصيل التقنية<\/summary><textarea[^>]*>technical-schema-fixture/,
  );
  assert.match(html, /<button[^>]*disabled=""[^>]*>Gemini/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>استيراد القصة/);
});
test("Reader high findings remain visibly blocking, with human page labels and original locator only in technical disclosure", () => {
  const model = {
    ...reader,
    notices: [
      {
        code: "LANGUAGE",
        severity: "high" as const,
        text: "راجع لغة هذه الصفحة.",
        location: `ar-EG/${reader.pages[0]!.pageId}`,
      },
    ],
  };
  const html = render(
    React.createElement(SimpleReader, {
      model,
      onMode: () => {},
      onDraft: () => {},
      onBack: () => {},
      onCompare: () => {},
      onIllustrate: () => {},
      onReview: () => {},
      busy: false,
    }),
  );
  assert.ok(
    html.includes('data-testid="simple-blocking-notices"') &&
      html.includes("راجع لغة هذه الصفحة."),
  );
  assert.ok(html.includes("العربية المصرية — صفحة 1"));
  assert.ok(
    html.includes(`<code dir="ltr">ar-EG/${reader.pages[0]!.pageId}</code>`),
  );
  assert.match(html, /<fieldset disabled=""><legend>مراجعة المعنى واللغة/);
});
