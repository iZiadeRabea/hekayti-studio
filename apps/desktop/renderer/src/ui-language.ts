import type { StoryPlan } from "@hekayti/contracts/planner";
export type UiLanguage = "ar" | "en";
export const UI_LANGUAGE_KEY = "hekayti.uiLanguage";
export const arabic = {
  "Deterministic QA checks explicit structural fields, not the truth of arbitrary prose or child appeal.":
    "تراجع الفحوص الآلية حقول البناء المحددة؛ ولا تثبت جودة النص الحر أو جاذبيته للطفل.",
  "Concrete objective delivery needs editorial judgment even when exact objective anchors match.":
    "تحقق الهدف داخل القصة يحتاج حكمًا تحريريًا، حتى مع تطابق مؤشرات الهدف المحددة.",
  "Limited intent/source coverage requires creator review; no strong match claimed.":
    "تغطية معنى الهدف أو مصادره محدودة؛ يلزم أن يراجعها الكاتب، ولا ندّعي تطابقًا قويًا.",
  "Synthetic projects": "المشروعات الاصطناعية",
  "Arabic reading direction": "العربية واتجاه القراءة",
  "Try selecting, typing and new lines. These samples are temporary and are not saved automatically.":
    "جرّب التحديد والكتابة والأسطر الجديدة. النصوص هنا مؤقتة؛ لا تُحفظ تلقائيًا.",
  "Contracts, age and approvals": "العقود والعمر والموافقات",
  "Choose Inspect from the projects list.": "اختر «فحص» من قائمة المشروعات.",
  "Simulation shows approval invalidation and grants no real approval.":
    "المحاكاة توضح بطلان الاعتماد ولا تمنح موافقة حقيقية.",
  "Synthetic PDF test": "تجربة PDF اصطناعية",
  "200 mm trim with 3 mm print bleed on each side. Not PDF/X or printer approval.":
    "٢٠٠ مم مقاس القطع؛ الطباعة تضيف ٣ مم نزيف لكل جانب. ليست PDF/X أو موافقة مطبعة.",
  "Local diagnostics": "التشخيص المحلي",
  "No API keys or cloud diagnostics transmission.":
    "لا مفاتيح API، ولا إرسال تشخيصات إلى خدمة سحابية.",
  "Hekayti Studio — synthetic creator lab": "حكايتي — استوديو القصص التجريبي",
  "Synthetic data only; this is a creator prototype, not the final book editor.":
    "بيانات اصطناعية فقط. هذه واجهة تجريبية للكاتب وليست محرّر الكتاب النهائي.",
  Projects: "المشروعات",
  "Story Creator": "منشئ القصة",
  "Library / Inbox / Bridge": "المكتبة / الوارد / برومبتات الكتابة",
  "Starter / Creative Library": "مكتبة الإلهام والمواد الإبداعية",
  "RTL Test": "تجربة اتجاه القراءة",
  "Core Data Inspector": "فحص بيانات القصة",
  "Export Test": "تجربة التصدير",
  "Settings / Diagnostics": "الإعدادات والتشخيص",
  "Prototype sections": "أقسام الاستوديو التجريبي",
  "Synthetic lab only - no AI / private data":
    "واجهة تجريبية ببيانات اصطناعية فقط — لا اتصال بخدمات ذكاء اصطناعي أو بيانات خاصة",
  "Synthetic fixtures ready": "البيانات التجريبية جاهزة",
  "New Synthetic Projects": "إنشاء مشروعات تجريبية",
  "Open synthetic JSON safely": "فتح ملف JSON تجريبي مع التحقق",
  Inspect: "فحص",
  "Save synthetic title edit": "حفظ تعديل العنوان التجريبي",
  "Save new JSON snapshot": "حفظ نسخة JSON جديدة",
  "Validated canonical blueprint": "مخطط القصة المعتمد بعد التحقق",
  "Simulate approved text edit": "محاكاة تعديل نص معتمد",
  "Generate PRINT + DIGITAL proof": "إنشاء عينة للطباعة والنسخة الرقمية",
  "Refresh diagnostics": "تحديث التشخيص",
  "Rendering synthetic print + digital proofs...":
    "جارٍ إعداد عينة الطباعة والنسخة الرقمية…",
  "New Story — synthetic creator": "منشئ القصة — قصة جديدة تجريبية",
  "Synthetic creator and manual Story Planner":
    "منشئ القصة ومخططها باستخدام الكتابة اليدوية",
  "No real child details. Personalization uses the fixed invented example ليلى; grammatical agreement is authored explicitly. Plan before prose with acknowledged Library inspiration and manual AI copy/paste. The separate Create more concepts button retains the deterministic mock path.":
    "لا تُدخل بيانات طفل حقيقي. التخصيص يستخدم الاسم الخيالي «ليلى»، مع اختيار صيغة التذكير أو التأنيث صراحةً. خطّط القصة قبل الكتابة، وراجع الإلهام من المكتبة ثم انسخ البرومبت يدويًا. زر إنشاء أفكار إضافية يظل مسارًا تجريبيًا منفصلًا.",
  "Synthetic request": "طلب قصة تجريبي",
  "Age in months (0–95)": "عمر الطفل بالشهور (٠–٩٥)",
  "Story age months": "عمر الطفل بالشهور",
  "Primary language": "لغة القصة",
  "Story language": "لغة القصة",
  "Simplified MSA": "فصحى مبسطة",
  "Egyptian Arabic": "العربية المصرية",
  Category: "نوع القصة",
  "Story category": "نوع القصة",
  Objective: "الهدف",
  "Story objective": "الهدف",
  "Synthetic objective description": "وصف الهدف التجريبي",
  "Objective description": "وصف الهدف",
  "Synthetic success scenario": "الموقف الذي يوضح تحقق الهدف",
  "Objective success scenario": "موقف تحقق الهدف",
  Personalization: "التخصيص",
  "Synthetic personalization": "التخصيص التجريبي",
  "0 — generic": "٠ — دون تخصيص",
  "1 — invented name": "١ — اسم خيالي",
  "2 — invented name and ball preference": "٢ — اسم خيالي وتفضيل اللعب بالكرة",
  "3 — explicit fictional protagonist": "٣ — بطل خيالي باختيار صريح",
  "Authored grammatical agreement": "صيغة التذكير أو التأنيث المختارة",
  "Grammatical agreement": "صيغة التذكير أو التأنيث",
  "Unknown — human review": "غير محددة — تحتاج مراجعة بشرية",
  Feminine: "مؤنث",
  Masculine: "مذكر",
  "Future source preference": "أسلوب اختيار مصادر القصة",
  "Source preference": "أسلوب اختيار المصادر",
  "New Story": "قصة جديدة",
  "Save changed request": "حفظ تعديلات الطلب",
  "Reopen persisted story": "فتح قصة محفوظة",
  "Reopen story": "فتح قصة محفوظة",
  "Choose project": "اختر مشروعًا",
  Version: "الإصدار",
  "· request": "· الطلب",
  "· approval": "· الاعتماد",
  "· historical approvals": "· الاعتمادات السابقة",
  "Actual provider:": "المصدر الفعلي:",
  ". Blank blueprint editions remain immutable placeholders; drafted editions below have separate IDs.":
    ". نسخ مخطط القصة الفارغة محفوظة دون تعديل، وللنصوص المكتوبة أدناه معرّفات مستقلة.",
  "Create more concepts": "إنشاء أفكار إضافية",
  "Build blueprint": "بناء مخطط القصة",
  "Current canonical blueprint ·": "مخطط القصة الحالي ·",
  "Page plan": "توزيع الصفحات",
  "Draft language editions": "إنشاء مسودات النسخ اللغوية",
  "Run structured QA": "مراجعة القصة وفق القواعد",
  "· edition": "· النسخة",
  "· source": "· المصدر",
  "Advisory findings": "ملاحظات المراجعة",
  "Current QA required. Previous reviews and approvals remain in history.":
    "يلزم مراجعة النسخة الحالية. تبقى المراجعات والاعتمادات السابقة في السجل.",
  QA: "المراجعة",
  "· hash": "· البصمة",
  "Acknowledge advisory limits": "الإقرار بحدود المراجعة الآلية",
  "I have read the current draft and findings; deterministic QA does not certify literary, factual, native language or developmental quality.":
    "قرأت المسودة الحالية وملاحظاتها. المراجعة الآلية لا تثبت الجودة الأدبية أو صحة المعلومات أو سلامة اللغة أو ملاءمة نمو الطفل.",
  "Explicitly approve current text": "اعتماد النص الحالي صراحةً",
  "Validated workflow history": "سجل العمل بعد التحقق",
  "Workflow artifacts persist in SQLite. Existing Open/Save JSON controls are legacy blueprint-only fixture tools and do not export these workflow histories.":
    "تُحفظ مراحل العمل محليًا في SQLite. أدوات فتح وحفظ JSON القديمة تخص مخططات التجربة فقط، ولا تصدّر سجل العمل هذا.",
  "Story state saved and validated": "تم حفظ حالة القصة والتحقق منها",
  "Desktop connection failed; reload before continuing.":
    "تعذر الاتصال بالتطبيق. أعد التحميل قبل المتابعة.",
  "Story Planner": "مخطط القصة",
  "Story Planner — before prose": "مخطط القصة — قبل الكتابة",
  "Review the request, then plan before prose.":
    "راجع الطلب، ثم خطّط القصة قبل الكتابة.",
  "Planning choices": "اختيارات التخطيط",
  Variation: "أسلوب التنويع",
  "Planner variation": "أسلوب التنويع",
  Family: "عائلة القصة",
  "Planner family": "عائلة القصة",
  "Automatic structural selection": "اختيار تلقائي لبنية القصة",
  "Cultural profile": "الملف الثقافي",
  EGYPTIAN_ARAB_MUSLIM_FAMILY: "أسرة مصرية عربية مسلمة",
  GENERAL_FAMILY: "أسرة عامة",
  "Optional fictional setting": "مكان خيالي اختياري",
  "Creator constraints for human review": "اشتراطات الكاتب للمراجعة البشرية",
  "I reviewed provisional Library inspiration; this does not promote it.":
    "راجعت الإلهام الأولي من المكتبة؛ وهذا لا يعني اعتماده للاستخدام النهائي.",
  "I acknowledge cultural/age/Arabic adaptation needs.":
    "أقرّ بالحاجة إلى ملاءمة المحتوى ثقافيًا وللعمر واللغة العربية.",
  "Explicitly include sensitive/not-default inspiration for review.":
    "أختار صراحةً تضمين إلهام حساس أو غير افتراضي للمراجعة.",
  "Explicitly consider religious material; qualified accuracy review remains required.":
    "أختار صراحةً النظر في مواد دينية؛ وتظل مراجعة صحتها من مختص لازمة.",
  "Plan Story / regenerate with choices":
    "خطّط القصة / أعد التخطيط بالاختيارات",
  "Reload planner / family choices": "تحديث الخطة واختيارات عائلة القصة",
  "Goal:": "الهدف:",
  "Problem:": "المشكلة:",
  "· cause": "· السبب",
  "Logic QA and source provenance": "مراجعة منطق القصة ومصادر البناء",
  "I reviewed this plan and advisory limits; accept fixed structure.":
    "راجعت الخطة وحدود المراجعة؛ وأوافق على تثبيت بنية القصة.",
  "Accept Plan and build Blueprint": "اعتماد الخطة وبناء مخطط القصة",
  "Prepare manual writing package": "تجهيز برومبت الكتابة",
  "I reviewed the whole package for synthetic-only external copying.":
    "راجعت البرومبت كاملًا، وأؤكد أنه يحتوي بيانات خيالية فقط قبل نسخه لخدمة خارجية.",
  "Copy for": "نسخ لـ",
  "Paste plan-response/1.0 JSON": "الصق نتيجة الكتابة بصيغة JSON المطلوبة",
  "Planner result JSON": "نتيجة الكتابة بصيغة JSON",
  "Validate / Import planned prose": "التحقق من النص واستيراده",
  "Run current Story QA and human text approval below. Anchor validation cannot establish that arbitrary prose follows the plan; inspect every page and language edition.":
    "راجع القصة الحالية واعتمد النص بشريًا أدناه. فحص الروابط لا يثبت التزام النص بالخطة؛ راجع كل صفحة وكل نسخة لغوية.",
  "Actual human review feedback": "نتائج المراجعة البشرية الفعلية",
  "Review notes": "ملاحظات المراجعة",
  "Story quality (1–5)": "جودة القصة (١–٥)",
  "Submitting records your actual review of the current draft and QA.":
    "عند الإرسال تُسجّل مراجعتك الفعلية للمسودة الحالية ونتائج فحصها.",
  Record: "تسجيل",
  "Planner change saved and validated.": "تم حفظ التغييرات والتحقق من الخطة",
  "Copy-ready package copied. Paste manually into the selected service.":
    "تم نسخ البرومبت وهو جاهز للاستخدام. الصقه يدويًا في الخدمة المختارة.",
  "Connection failed; reload story.": "تعذر الاتصال. أعد فتح القصة.",
  "Sensory recognition; no conventional conflict":
    "تعرّف حسي؛ دون صراع قصصي تقليدي",
  Type: "نوع القصة",
  Setting: "المكان",
  Character: "الشخصيات",
  Challenge: "التحدي",
  Resolution: "الحل",
  "Age fit": "ملاءمة العمر",
  "Selected — replace derivatives": "تم الاختيار — استبدال المراحل التالية",
  "Select / replace concept": "اختيار الفكرة أو استبدالها",
  "Focal object": "العنصر المحوري",
  "Technical details": "التفاصيل التقنية الأصلية",
  Opening: "البداية",
  "Inciting event": "الحدث المحرّك",
  Attempt: "المحاولة",
  "Turning point": "نقطة التحول",
  Ending: "النهاية",
  Characters: "الشخصيات",
  "Story plan signals": "مؤشرات مراجعة الخطة",
  "No suitable story structure":
    "لم يتم العثور على بنية قصة مناسبة في المكتبة.",
  "Operation could not be completed":
    "تعذر إتمام العملية. راجع التفاصيل التقنية أدناه.",
  "Operation information": "معلومات العملية — التفاصيل الأصلية متاحة أدناه.",
  "Review this finding":
    "راجع هذه الملاحظة قبل اعتماد القصة؛ تظهر التفاصيل الأصلية أدناه.",
  "Reusable Library · Inbox · Manual AI Bridge":
    "مكتبة إعادة الاستخدام · الوارد · برومبتات الكتابة اليدوية",
  "Reload Library": "تحديث المكتبة",
  "Add synthetic starter": "إضافة نموذج إلهام تجريبي",
  "Human reviewer alias": "اسم المراجع المستعار",
  "Current story": "القصة الحالية",
  "Choose saved story request": "اختر طلب قصة محفوظًا",
  "Filter records": "تصفية المواد",
  All: "الكل",
  Theme: "الموضوع",
  "Include frozen context in next package":
    "تضمين السياق المثبّت في البرومبت التالي",
  "Editorial note": "ملاحظة تحريرية",
  "Record editorial scores": "تسجيل التقييمات التحريرية",
  "Related variants": "التنويعات المرتبطة",
  "Source strategy": "أسلوب اختيار المصادر",
  Candidates: "الأفكار المقترحة",
  "Prepare immutable package": "تجهيز برومبت ثابت",
  "Consumer target": "الخدمة المختارة",
  "Source type": "نوع المصدر",
  "Source provider": "مصدر المحتوى",
  "Provider note": "ملاحظة عن المصدر",
  "Model note (optional, unknown is fine)": "ملاحظة عن النموذج (اختيارية)",
  "Validate and import to Inbox": "التحقق والاستيراد إلى الوارد",
  "Copy repair instructions": "نسخ تعليمات التصحيح",
  "I reviewed public/synthetic creative text; no private child/customer information.":
    "راجعت النصوص العامة أو الخيالية، ولا توجد معلومات خاصة بطفل أو عميل.",
  "Starter target cultural profile": "الملف الثقافي لمواد الإلهام",
  "Import traceable starter": "استيراد إلهام موثق المصدر",
  "Import JSON / JSONL batch": "استيراد مجموعة JSON / JSONL",
  "Export creative ZIP": "تصدير الأرشيف الإبداعي ZIP",
  "Preview creative restore": "معاينة استعادة الأرشيف الإبداعي",
  "All exact identity conflicts": "جميع تعارضات المعرّفات",
  "Keep existing; explicitly skip conflicting archive records":
    "الاحتفاظ بالموجود وتجاوز المواد المتعارضة صراحةً",
  "Copy archive conflicts under deterministic new IDs":
    "نسخ المواد المتعارضة بمعرّفات جديدة ثابتة",
  "Confirm creative restore": "تأكيد استعادة الأرشيف الإبداعي",
  "Search title": "البحث في العنوان",
  "All / unknown": "الكل / غير معروف",
  "Previous creative page": "الصفحة السابقة",
  "Next creative page": "الصفحة التالية",
  "Record ID:": "معرّف المادة:",
  "; family:": "؛ عائلة القصة:",
  "Source:": "المصدر:",
  "; culture:": "؛ الثقافة:",
  "creative record": "المادة الإبداعية",
  "Source locator (copy manually):": "رابط المصدر (للنسخ اليدوي):",
  "Source → Metadata → Summary → DNA → Pattern → Family → Age → Culture → Candidate → Validation → Import. Ideas are not approved stories. Missing DNA stays UNKNOWN; original abstracts and extractive observations are distinguished.":
    "المصدر ← البيانات ← الملخص ← عناصر البناء ← النمط ← عائلة القصة ← العمر ← الثقافة ← الاقتراح ← التحقق ← الاستيراد. أفكار الإلهام ليست قصصًا معتمدة. تُعرض المعلومات الناقصة بوصفها غير معروفة، مع التمييز بين الملخصات والملاحظات المقتبسة.",
  "Both profiles retain conservative provisional source flags; selecting a profile never certifies religious accuracy or clears sensitivity. Reimporting the same identity under a different profile is an explicit conflict, not an overwrite.":
    "يبقى التنبيه إلى حساسية المصادر في كلا الملفين. اختيار ملف ثقافي لا يثبت صحة المواد الدينية ولا يلغي حساسيتها. إعادة استيراد المادة نفسها بملف مختلف تُعرض كتعارض صريح دون استبدال الموجود.",
  "matches; page": "نتيجة؛ الصفحة",
  "; at most30 rows rendered.": "؛ تُعرض ٣٠ مادة كحد أقصى.",
  ". Provisional, not native/religious/rights certification.":
    ". معلومات أولية لا تثبت سلامة اللغة أو الدين أو حقوق الاستخدام.",
  "Explicit review/approval/promotion is separate from cultural/rights/source screening. Use existing Library / Inbox / Bridge for human actions and selected Hybrid context.":
    "المراجعة والاعتماد والترقية إجراءات مستقلة عن فحص الثقافة والحقوق والمصدر. استخدم المكتبة والوارد وبرومبتات الكتابة لإجراءات المراجعة البشرية واختيار السياق.",
  "No API keys or automated service calls. Use fictional synthetic content only. Imported text is untrusted data, not instructions, facts, approval or verified provider identity.":
    "لا توجد مفاتيح API أو اتصالات آلية بالخدمات. استخدم محتوى خياليًا فقط. النص المستورد بيانات تحتاج مراجعة، وليس تعليمات أو حقائق أو اعتمادًا أو إثباتًا لهوية مزود الخدمة.",
  "records. Archived records are retained; there is no hard delete.":
    "مادة. تبقى المواد المؤرشفة محفوظة ولا تُحذف نهائيًا.",
  "Human editorial scores (1–5, opinion not science)":
    "تقييمات بشرية تحريرية (١–٥، رأي لا قياس علمي)",
  "Create structural story family — human-authored, not complete content":
    "إنشاء عائلة لبنية القصة — من إعداد الكاتب، وليست قصة مكتملة",
  "Family for this variant": "عائلة القصة لهذا التنويع",
  "Choose structural family": "اختر عائلة لبنية القصة",
  "Link next numbered variant": "ربط التنويع التالي برقم جديد",
  Log: "تسجيل",
  "usage outcome": "نتيجة الاستخدام",
  "Save human-authored idea seed": "حفظ بذرة فكرة من إعداد الكاتب",
  "Save seed to Inbox": "حفظ الفكرة في الوارد",
  "Explicit extraction from currently approved story":
    "استخراج صريح من القصة المعتمدة حاليًا",
  Save: "حفظ",
  "Save authored": "حفظ عنصر من إعداد الكاتب",
  block: "من عناصر البناء",
  "Reopen retained package ID": "معرّف البرومبت المحفوظ",
  "Reopen frozen package": "فتح البرومبت المثبّت",
  "promoted library records selected; context is frozen when package is created.":
    "مادة معتمدة مختارة من المكتبة؛ يُثبّت السياق عند تجهيز البرومبت.",
  "Context record IDs (comma-separated, max30; browse paged starter separately)":
    "معرّفات مواد السياق (تفصل بينها فواصل؛ ٣٠ كحد أقصى)",
  "Explicitly acknowledge selected non-default/religious source flags; this is not qualified cultural/religious clearance.":
    "أقرّ صراحةً بتنبيهات المصادر الدينية أو غير الافتراضية المختارة؛ وهذا ليس اعتمادًا من مختص ثقافي أو ديني.",
  "I reviewed this package; all content is fictional/synthetic and safe to copy externally.":
    "راجعت البرومبت؛ كل محتواه خيالي ويمكن نسخه إلى الخدمة الخارجية.",
  "Copy package instructions": "نسخ برومبت الكتابة",
  "Operator source notes — not verified provider/model identity":
    "ملاحظات الكاتب عن المصدر — لا تثبت هوية الخدمة أو النموذج",
  "Manual draft handoff (after USE_NOW and canonical Blueprint build)":
    "الكتابة اليدوية للمسودة (بعد اختيار المصدر وبناء مخطط القصة)",
  "Prepare manual draft instructions": "تجهيز برومبت المسودة",
  "Copy manual draft instructions": "نسخ برومبت المسودة",
  "Validate and import manual draft": "التحقق من المسودة واستيرادها",
  "Quality detail": "تفاصيل جودة التخطيط",
  "Objective intent": "المعنى المقصود للهدف",
  Compatibility: "توافق البنية",
  Situation: "الموقف",
  "Initial friction": "العائق الأولي",
  "Resolution method": "طريقة الحل",
  "Active participants": "المشاركون في الحدث",
  Strategy: "الاستراتيجية",
  "Information change": "المعلومة الجديدة",
  "Relationship change": "تغيّر العلاقة",
  Consequence: "النتيجة",
} as const;
export type UiKey = keyof typeof arabic;
export const beatRoleArabic: Readonly<
  Record<StoryPlan["beats"][number]["role"], string>
> = {
  OPENING: "البداية",
  INCITING: "الحدث المحرّك",
  ATTEMPT: "المحاولة",
  TURN: "نقطة التحول",
  RESOLUTION: "الحل",
  ENDING: "النهاية",
  RECOGNITION: "التعرّف",
  REPEAT: "التكرار",
};
const enumArabic: Readonly<Record<string, string>> = {
  ...beatRoleArabic,
  "human-literary": "المراجعة الأدبية البشرية",
  limitations: "حدود الفحص والمصادر",
  INTENT_STRUCTURE_MISMATCH: "توافق معنى الهدف وبنية القصة",
  NON_PROGRESSING_BEATS: "تقدّم الأحداث",
  INACTIVE_SECOND_CHARACTER: "مشاركة الشخصية الثانية",
  GENERIC_RESOLUTION: "خصوصية الحل",
  Library: "المكتبة",
  Inbox: "الوارد",
  Bridge: "برومبتات الكتابة",
  Log: "السجل",
  type: "نوع المادة",
  status: "الحالة",
  age: "العمر",
  storyType: "نوع القصة",
  objective: "الهدف",
  source: "المصدر",
  provider: "الخدمة",
  culture: "الثقافة",
  theme: "الموضوع",
  familyId: "معرّف عائلة القصة",
  patternId: "معرّف النمط",
  profile: "الملف الثقافي",
  plotDepth: "عمق الحبكة",
  fit: "الملاءمة",
  religious: "المواد الدينية",
  SAVE: "حفظ",
  APPROVE: "اعتماد",
  PROMOTE: "ترقية للمكتبة",
  ARCHIVE: "أرشفة",
  USE_NOW: "استخدام الآن",
  CREATE_STORY_FAMILY: "إنشاء عائلة قصة",
  IDEA_SEED: "بذرة فكرة",
  STORY_CONCEPT: "فكرة قصة",
  STORY_FAMILY: "عائلة قصة",
  BUILDING_BLOCK: "عنصر بناء",
  APPROVED_STORY_REFERENCE: "مرجع قصة معتمدة",
  PROMOTED_TO_LIBRARY: "مرقاة للمكتبة",
  NEEDS_ADAPTATION: "تحتاج ملاءمة",
  SENSITIVE_REVIEW: "تحتاج مراجعة الحساسية",
  NOT_DEFAULT: "غير افتراضية",
  NO_RELIGIOUS_CLAIM: "دون ادعاء ديني",
  RELIGIOUS_ACCURACY_REVIEW_REQUIRED: "تحتاج مراجعة صحة دينية",
  CURATED: "من المكتبة",
  AI: "كتابة خارجية",
  HYBRID: "مزيج مصادر",
  HUMAN: "من إعداد الكاتب",
  MANUAL: "يدوي",
  OTHER: "خدمة أخرى",
  recognition: "تعرّف حسي",
  routine: "تتابع يومي بسيط",
  "simple-causal": "أسباب ونتائج بسيطة",
  "short-plot": "حبكة قصيرة",
  "extended-plot": "حبكة ممتدة",
  SHARING_TURN_TAKING: "المشاركة وتبادل الأدوار",
  COOPERATION_HELPING: "التعاون والمساعدة",
  EMOTIONAL_REGULATION: "تنظيم المشاعر",
  ROUTINE_HABIT: "روتين وعادة",
  LEARNING_DISCOVERY: "التعلم والاكتشاف",
  CONNECTION_REPAIR: "إصلاح التواصل",
  GENERAL_BEHAVIORAL: "هدف سلوكي عام",
  GENERAL_EDUCATIONAL: "هدف تعليمي عام",
  GENERAL_EMOTIONAL: "هدف عاطفي عام",
  GENERAL_ENTERTAINMENT: "متعة عامة",
  PROMOTED_LIBRARY: "مادة معتمدة في المكتبة",
  ACKNOWLEDGED_PROVISIONAL: "إلهام أولي راجعه الكاتب",
  EDITORIAL_FALLBACK: "بناء تحريري بديل",
  FreshConcept: "فكرة جديدة",
  SimilarVersion: "نسخة مشابهة",
  NewVariant: "تنويع جديد",
  CompletelyNew: "فكرة مختلفة تمامًا",
  "ar-EG": "العربية المصرية",
  "ar-MSA-simple": "فصحى مبسطة",
  en: "الإنجليزية",
  "everyday-life": "الحياة اليومية",
  educational: "تعليمية",
  behavioral: "سلوكية",
  values: "قيم",
  adventure: "مغامرة",
  bedtime: "قبل النوم",
  "early-learning": "تعلم مبكر",
  connection: "التواصل",
  emotional: "المشاعر",
  entertainment: "المتعة",
  manual: "يدوي",
  curated: "من المكتبة",
  ai: "كتابة خارجية بالذكاء الاصطناعي",
  hybrid: "مزيج المكتبة والكتابة الخارجية",
  APPROVED: "معتمد",
  EDITED: "معدّل",
  REJECTED: "مرفوض",
  GENERATED: "أولي غير معتمد",
  READY: "جاهز",
  REVIEWED: "تمت مراجعته",
  SAVED: "محفوظ",
  ARCHIVED: "مؤرشف",
  approved: "معتمد",
  stale: "اعتماد سابق يحتاج تحديثًا",
  none: "دون اعتماد",
  mock: "تجريبي",
  opening: "البداية",
  TURNING: "نقطة التحول",
  DISCOVERY: "الاكتشاف",
  CLIMAX: "الذروة",
  ROUTINE: "تتابع بسيط",
  SENSORY: "تعرّف حسي",
  LIBRARY: "من المكتبة",
  EDITORIAL: "بناء تحريري",
  PLANNER: "مخطط القصة",
  DERIVED: "مشتق من عناصر البناء",
  STRONG: "قوي",
  ACCEPTABLE: "مقبول",
  REVIEW: "يحتاج مراجعة",
  FAIL: "غير مستوفٍ",
  MISMATCH: "غير متوافق",
  blocker: "مانع",
  high: "ملاحظة عالية الأهمية",
  medium: "ملاحظة متوسطة",
  low: "ملاحظة بسيطة",
  advisory: "تنبيه للمراجعة",
  AgeFit: "ملاءمة العمر",
  CausalCoherence: "ترابط الأسباب والنتائج",
  ObjectiveAlignment: "اتساق الهدف",
  CulturalFit: "الملاءمة الثقافية",
  StructuralCompleteness: "اكتمال البنية",
  VariationCompliance: "ملاءمة التنويع",
  ObjectiveIntentFit: "ملاءمة المعنى المقصود للهدف",
  StructuralCompatibility: "توافق بنية القصة",
  BeatProgression: "تقدّم الأحداث",
  SituationSpecificity: "وضوح الموقف",
  ResolutionSpecificity: "وضوح الحل",
  EGYPTIAN_ARAB_MUSLIM_FAMILY: arabic.EGYPTIAN_ARAB_MUSLIM_FAMILY,
  GENERAL_FAMILY: arabic.GENERAL_FAMILY,
};
export function text(key: UiKey, language: UiLanguage): string {
  return language === "ar" ? arabic[key] : key;
}
export function label(value: string, language: UiLanguage): string {
  return language === "ar"
    ? (enumArabic[value] ?? (value in arabic ? arabic[value as UiKey] : value))
    : value;
}
export function readUiLanguage(storage?: Pick<Storage, "getItem">): UiLanguage {
  try {
    return storage?.getItem(UI_LANGUAGE_KEY) === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}
export function saveUiLanguage(
  language: UiLanguage,
  storage?: Pick<Storage, "setItem">,
) {
  try {
    storage?.setItem(UI_LANGUAGE_KEY, language);
  } catch {
    /* Memory preference still works when storage is unavailable. */
  }
}
export function statusText(raw: string, language: UiLanguage): string {
  if (raw in arabic) return text(raw as UiKey, language);
  if (language === "en") return raw;
  if (
    /no .*eligible|no .*structure|no .*candidate|suitable.*structure/i.test(raw)
  )
    return arabic["No suitable story structure"];
  return /^[A-Z_]+:/.test(raw)
    ? arabic["Operation could not be completed"]
    : arabic["Operation information"];
}
