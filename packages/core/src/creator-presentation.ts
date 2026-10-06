import type { StoryPlan } from "@hekayti/contracts/planner";
import type { PlanPresentation } from "@hekayti/contracts/creator";
import type { LanguageMode, QaFinding } from "@hekayti/contracts";
import { arabicClauses } from "./creator-arabic-clauses";
import { msaProject, msaTitles } from "./creator-msa-clauses";
export function presentQaFindings(
  findings: QaFinding[],
  mode: LanguageMode,
): PlanPresentation["notices"] {
  const labels: Record<string, string> = {
    age: "ملاءمة العمر",
    "age-budget": "ميزانية العمر",
    "age-eligibility": "حدود العمر",
    "language-register": "سجل اللغة",
    language: "اللغة",
    register: "سجل اللغة",
    causality: "ترابط السبب والنتيجة",
    state: "استمرارية الحالة",
    location: "استمرارية المكان",
    cast: "استمرارية الشخصيات",
    ordering: "ترتيب الأحداث",
    "human-literary": "مراجعة الجودة الأدبية",
    objective: "وصول الهدف",
    limitations: "حدود المراجعة الآلية",
    CategoryPresence: "حضور نوع القصة",
    CATEGORY_PRESENCE: "حضور نوع القصة",
  };
  return findings.map((f) => ({
    code: f.category,
    severity: f.severity,
    location: f.location,
    text:
      mode === "en"
        ? `${f.message} ${f.suggestedAction}`
        : `${labels[f.category] ?? "مراجعة تفاصيل القصة"}: ${f.severity === "high" || f.severity === "blocker" ? "مشكلة تمنع المتابعة؛ أصلح السبب وراجع التفاصيل الأصلية في الوضع المتقدم، ثم شغّل الفحص من جديد." : "ملاحظة إرشادية تحتاج مراجعة بشرية في الموضع المحدد؛ ليست موافقة أدبية أو شهادة جودة. التفاصيل الأصلية محفوظة في الوضع المتقدم."}`,
  }));
}

const categories: Record<string, string> = {
  adventure: "مغامرة صغيرة وآمنة",
  bedtime: "قصة هادئة قبل النوم",
  educational: "تعلم واكتشاف",
  behavioral: "اختيارات ونتائج",
  values: "قيم وعناية بالآخرين",
  "everyday-life": "حياة يومية",
  "emotional-learning": "مشاعر",
  "early-learning": "تعلم مبكر",
  discovery: "اكتشاف",
};
const titles: Record<string, string> = {
  "The rolling route for two": "رحلة اللعبة لصاحبين",
  "A rolling game for two": "لعبة الدحرجة لصاحبين",
  "The turn marker": "علامة الدور",
  "A quiet turn with the soft toy": "دور هادي مع اللعبة الناعمة",
  "The bridge built together": "الكوبري اللي بنيناه مع بعض",
  "The drawing made whole": "الرسمة اللي كملناها",
  "The tower and the quiet breath": "البرج والنَفَس الهادي",
  "Three blocks, three places": "ثلاث مكعبات وثلاث أماكن",
  "The rolling test": "تجربة الدحرجة",
  "The color trays": "صواني الألوان",
  "The shape trays": "صواني الأشكال",
  "The cork and the pebble": "الفلينة والحصوة",
  "The hands and the waiting towel": "الإيدين والفوطة المستنية",
  "The brush beside the cup": "الفرشة جنب الكوباية",
  "The book and the resting toy": "الكتاب واللعبة المستريحة",
  "The toy basket's ready place": "مكان سلة اللعب",
  "The toy finds its basket": "اللعبة تلاقي سلتها",
  "The toy's short route": "مشوار اللعبة الصغير",
  "The soft shape returns": "الشكل الناعم يرجع",
  "The soft toy's quiet place": "المكان الهادي للعبة الناعمة",
};
// Exact authored clauses/operations only. This is not machine translation and
// never rewrites stored text. Unknown clauses stay unknown, not fabricated.
const clauses: Record<string, string> = {
  "One child holds the ball or toy while the friend waits":
    "اللعبة مع طفل وصاحبه لسه مستني",
  "The friend has not completed a turn and the game has paused":
    "الصاحب لسه ماخدش دور كامل واللعبة وقفت",
  "Both children can see whose turn comes next":
    "الاتنين شايفين الدور الجاي لمين",
  "Each child has completed a turn and returned the ball or toy to the partner":
    "كل طفل خد دور كامل ورجّع اللعبة لصاحبه",
  "The children continue a shared game with the same turn rule":
    "الاتنين بيكملوا اللعب بنفس قاعدة الدور",
  "notice the waiting partner": "ملاحظة الصاحب المستني",
  "The friend wants a place in the game": "الصاحب عايز يدخل اللعبة",
  "The game has only one active player": "طفل واحد بس بيلعب",
  "One child is excluded from play": "الصاحب لسه خارج اللعب",
  "offer a peek without yielding the object": "فرجة سريعة من غير تسليم اللعبة",
  "play alone without yielding the object": "اللعب لوحده من غير تسليم اللعبة",
  "A peek or reach is not a real turn": "الفرجة أو مد الإيد مش دور كامل",
  "The interrupted game cannot continue together":
    "اللعبة المتوقفة مش بتكمل مع الاتنين",
  "Both children notice the unfair interruption":
    "الاتنين يلاحظوا إن الدور ماكملش",
  "assign complementary roles and agree to swap":
    "تحديد مكان للدحرجة ومكان للاستقبال والاتفاق على تبديلهم",
  "mark one complete turn before passing":
    "علامة واضحة لدور كامل قبل تسليم اللعبة",
  "A visible rule tells both children when the next turn begins":
    "علامة واضحة تقول للاتنين إمتى الدور الجاي يبدأ",
  "The friend can predict a complete turn":
    "الصاحب يعرف إمتى دوره الكامل هيبدأ",
  "Both children agree to the same rule": "الاتنين موافقين على نفس القاعدة",
  "perform the agreed reciprocal exchange": "تنفيذ التبادل اللي اتفقوا عليه",
  "Both children have tested the rule": "الاتنين جرّبوا القاعدة",
  "The game works because neither turn is skipped":
    "اللعبة بتكمل لأن دور كل واحد كامل",
  "Both children are included and trust the next turn":
    "الاتنين بيلعبوا وواثقين إن دورهم جاي",
  "repeat the successful reciprocal rule": "تكرار قاعدة التبادل اللي نجحت",
  "The next round uses the known signal": "الجولة الجاية بنفس العلامة المعروفة",
  "They keep playing together without a new dispute":
    "اللعب بيكمل مع بعض من غير خلاف جديد",
  "Their shared rule sustains play": "القاعدة المشتركة بتخلي اللعب يكمل",
  "Support remains available": "المساعدة المألوفة لسه قريبة",
  "The folded mat blocks the roll": "ركن الحصيرة المطوي وقف الدحرجة",
  "The toy has stopped before the basket": "اللعبة وقفت قبل السلة",
  "A smooth cardboard path reaches the basket": "شريط كرتون مستوي يوصل للسلة",
  "The toy reaches the waiting basket along a continuous flat path":
    "اللعبة توصل للسلة على الطريق المستوي",
  "The toy and cardboard strip are stored beside the clear mat":
    "اللعبة وشريط الكرتون في مكانهم جنب الحصيرة",
  "The toy rests in the marked basket and the path is clear":
    "اللعبة في السلة المعلمة والممر فاضي",
  "The toy is left in the walkway instead of its basket":
    "اللعبة لسه في الممر بدل السلة",
  "The toy's marked basket is identified":
    "مكان اللعبة اتعرف من الصورة على السلة",
  "The toy stays stored beside a clear walkway": "اللعبة في مكانها والممر فاضي",
  "A tall block tower stands on the mat": "برج مكعبات طويل على الحصيرة",
  "Blocks are scattered and the child feels tense":
    "المكعبات اتفرقت والطفل متضايق",
  "The child's hands rest and the blocks wait on the mat":
    "الإيدين بتهدى والمكعبات مستنية على الحصيرة",
  "A lower steady tower stands beside a calmer child":
    "برج أقل وأثبت جنب الطفل اللي هدي",
  "The steady tower and unused blocks have safe resting places":
    "البرج الثابت وباقي المكعبات في أماكن آمنة",
  "A block is counted twice when the row is moved":
    "مكعب اتحسب مرتين لما الصف اتحرك",
  "Each uncounted block now has an empty marked space":
    "كل مكعب لسه ماتعدش له مكان فاضي",
  "Each of the three spaces contains one block counted once":
    "كل مكان من الثلاثة فيه مكعب اتحسب مرة واحدة",
  "Three counted blocks rest beside the three spaces":
    "الثلاث مكعبات المعدودة جنب أماكنها",
  "The guessed result is untested and the two objects remain beside the bowl":
    "التخمين لسه ماتجربش والفلينة والحصوة جنب الوعاء",
  "The cork stays at the surface while the pebble remains to be checked":
    "الفلينة على السطح والحصوة لسه مستنية التجربة",
  "The cork is observed at the surface and the pebble at the bowl's bottom in both checks":
    "الفلينة على السطح والحصوة في القاع في التجربتين",
  "The dry tray and removed objects mark a calm end to the supervised check":
    "الصينية ناشفة والأشياء بره الوعاء بعد التجربة بإشراف الكبير",
  "The towel is ready but the washing step has been skipped":
    "الفوطة جاهزة بس خطوة الغسل لسه ماتعملتش",
  "Soap comes before the waiting towel in the visible sequence":
    "الصابون قبل الفوطة في الترتيب الواضح",
  "The supported washing steps are complete and the hands are dry":
    "خطوات الغسل بالمساعدة خلصت والإيدين ناشفة",
  "The towel and soap are ready in their places for next time":
    "الفوطة والصابون في أماكنهم للمرة الجاية",
};
export function categoryLabel(category: string, mode: LanguageMode) {
  return mode === "en"
    ? category
    : (categories[category] ?? "نوع يحتاج مراجعة");
}
export function presentPlan(
  plan: StoryPlan,
  mode: LanguageMode,
): PlanPresentation {
  const p = plan,
    arabic = mode !== "en",
    a = p.characters[0]?.displayName ?? "الطفل",
    b = p.characters[1]?.displayName ?? "الصاحب";
  let unsupported = false;
  const unknown = () => {
    unsupported = true;
    return "تفصيل غير متاح بعربية موثوقة. راجع الخطة الأصلية في الوضع المتقدم أو أنشئ خطة مدعومة جديدة؛ لم نختَرع ترجمة.";
  };
  const knownSettings: Record<string, string> = {
    "a quiet familiar room": "غرفة هادئة ومألوفة",
    "a supervised familiar garden": "حديقة مألوفة بإشراف كبير",
    "a familiar play corner": "ركن لعب مألوف",
    "A familiar Egyptian neighborhood playground": "ملعب مألوف في حي مصري",
  };
  const settingText = /[A-Za-z]/.test(p.setting.description)
    ? (knownSettings[p.setting.description] ??
      (arabic ? unknown() : p.setting.description))
    : p.setting.description;
  const allClauses = {
    ...clauses,
    ...Object.fromEntries(
      Object.entries(arabicClauses(a, b, p.setting.description)).map(
        ([en, ar]) => [en, ar.replaceAll(p.setting.description, settingText)],
      ),
    ),
  };
  const convert = (input: string): string => {
    if (!arabic) return input;
    if (!/[A-Za-z]/.test(input)) return input;
    if (mode === "ar-MSA-simple")
      return (
        msaProject(input, a, b, p.setting.description, settingText) ?? unknown()
      );
    if (allClauses[input]) return allClauses[input]!;
    let s = input;
    const focus = /soft ball/.test(s)
      ? "الكرة الناعمة"
      : /soft toy/.test(s)
        ? "اللعبة الناعمة"
        : "عربية اللعبة";
    const method = /swap roller and catcher/.test(s),
      signal = /short clapping/.test(s) ? "تصفيقة قصيرة" : "كارت دور صغير";
    // Controlled sharing operations: every branch is keyed to the actual action,
    // object, role exchange and selected cue, not just the objective label.
    const patterns: [RegExp, string][] = [
      [
        /^Give both children a clear turn with the (?:soft ball|toy car|soft toy) and keep their game moving/,
        `كل طفل ياخد دور واضح مع ${focus} واللعب يكمل`,
      ],
      [
        new RegExp(
          `^${a} holds the (?:soft ball|toy car|soft toy); ${b} is waiting without a turn`,
        ),
        `${a} ماسك ${focus} و${b} مستني دوره`,
      ],
      [
        new RegExp(
          `^${a} has the (?:soft ball|toy car|soft toy); ${b} stands beside the marked play space`,
        ),
        `${a} معاه ${focus} و${b} جنب مكان اللعب المعلم`,
      ],
      [
        new RegExp(
          `^${a} holds the (?:soft ball|toy car|soft toy) at .+?; ${b} waits beside the marked play space`,
        ),
        `${a} ماسك ${focus} في ${settingText} و${b} مستني جنب مكان اللعب المعلم`,
      ],
      [
        new RegExp(
          `^${a} keeps rolling the (?:soft ball|toy car|soft toy) alone; ${b} reaches to join and the game stops`,
        ),
        `${a} بيدحرج ${focus} لوحده. ${b} يمد إيده يدخل اللعبة، واللعب يقف`,
      ],
      [
        new RegExp(
          `^${a} offers a very short peek at the (?:soft ball|toy car|soft toy) but takes it back before ${b} can play`,
        ),
        `${a} يورّي ${focus} بسرعة ويرجع ياخدها قبل ما ${b} يلعب`,
      ],
      [
        new RegExp(
          `^${a} and ${b} mark roller and catcher places; they agree to swap places after each roll`,
        ),
        `${a} و${b} يحددوا مكان للدحرجة ومكان للاستقبال ويتفقوا يبدلوا بعد كل دحرجة`,
      ],
      [
        new RegExp(
          `^${a} and ${b} place (?:a short clapping signal|a small turn card) beside the player and agree to pass it after one short play`,
        ),
        `${a} و${b} يستخدموا ${signal} لتحديد الدور ويسلّموا اللعبة بعد لعب قصير كامل`,
      ],
      [
        /^Roll the (?:soft ball|toy car|soft toy) to a partner, swap roller and catcher roles after each roll, and let each child lead one roll/,
        `دحرجة ${focus} للصاحب، وتبديل دور الدحرجة والاستقبال بعد كل مرة، وكل طفل يبدأ دحرجة`,
      ],
      [
        /^Use (?:a short clapping signal|a small turn card) to mark the current player, pass the (?:soft ball|toy car|soft toy) after one short play, and give each child a complete turn/,
        `استخدام ${signal} لتحديد اللاعب، وتسليم ${focus} بعد لعب قصير، بحيث كل طفل ياخد دور كامل`,
      ],
      [
        new RegExp(
          `^${a} and ${b} begin another gentle round, passing the (?:soft ball|toy car|soft toy) when the agreed signal comes`,
        ),
        `${a} و${b} يبدأوا جولة خفيفة جديدة ويسلّموا ${focus} عند العلامة المتفق عليها`,
      ],
    ];
    for (const [re, value] of patterns)
      if (re.test(s)) {
        s = s.replace(re, value);
        break;
      }
    for (const [key, value] of Object.entries(allClauses).sort(
      (x, y) => y[0].length - x[0].length,
    ))
      s = s.replaceAll(key, value);
    const replacements: [string, string][] = [
      [
        "A partial trial follows this visible cue: ",
        "محاولة جزئية تتبع العلامة المرئية التالية: ",
      ],
      [
        "The observed change is named before the final operation: ",
        "يُسمى التغير المرئي قبل العملية النهائية: ",
      ],
      ["test one part of ", "تجربة جزء واحد من "],
      ["One partial trial checks ", "محاولة جزئية واحدة تفحص "],
      [
        `${a} tries one part of the operation: `,
        `${a} يجرب جزء واحد من العملية: `,
      ],
      [
        `${a} stops before finishing and points out the observed change: `,
        `${a} يقف قبل الإكمال ويشاور للتغير المرئي: `,
      ],
      [
        "the nearby activity destination beside the familiar materials",
        "وجهة النشاط القريبة جنب الأدوات المألوفة",
      ],
      ["the first ground marker", "أول علامة على الأرض"],
      [
        "along a short route from أول علامة على الأرض to وجهة النشاط القريبة جنب الأدوات المألوفة",
        "على طريق قصير من أول علامة على الأرض لوجهة النشاط القريبة جنب الأدوات المألوفة",
      ],
      [
        "; two visible dry ground markers lead to وجهة النشاط القريبة جنب الأدوات المألوفة inside ",
        "؛ علامتان واضحتان على أرض جافة يوصلوا لوجهة النشاط القريبة جنب الأدوات المألوفة داخل ",
      ],
      [
        "The mini-mission starts at أول علامة على الأرض; both ground markers and وجهة النشاط القريبة جنب الأدوات المألوفة are visible.",
        "المهمة الصغيرة تبدأ عند أول علامة؛ العلامتان ووجهة النشاط القريبة جنب الأدوات المألوفة واضحين.",
      ],
      [
        "At the first marker, the mini-mission pauses at this actual activity obstacle: ",
        "عند أول علامة، المهمة الصغيرة تقف بسبب عائق النشاط الفعلي: ",
      ],
      [
        "At the next ground marker, the clue comes from the activity itself: ",
        "عند العلامة التالية، الدليل يأتي من نفس النشاط: ",
      ],
      [
        ". The child uses this clue to continue toward وجهة النشاط القريبة جنب الأدوات المألوفة.",
        ". الطفل يستخدم الدليل عشان يكمل لوجهة النشاط القريبة جنب الأدوات المألوفة.",
      ],
      [
        "They reach وجهة النشاط القريبة جنب الأدوات المألوفة along the two visible markers, using the agreed operation.",
        "يوصلوا لوجهة النشاط القريبة جنب الأدوات المألوفة عبر العلامتين بتنفيذ العملية المتفق عليها.",
      ],
      [
        "They return along the same short ground route and rest beside أول علامة على الأرض.",
        "يرجعوا عبر نفس الطريق القصير ويستريحوا جنب أول علامة على الأرض.",
      ],
      [
        "; complete this supported activity at وجهة النشاط القريبة جنب الأدوات المألوفة, then return along the same two dry ground markers with empty hands while the adult keeps the materials in place",
        "؛ يكملوا النشاط المدعوم عند وجهته القريبة، ويرجعوا عبر العلامتين على أرض جافة وإيدين فاضية، والكبير يبقي الأدوات في مكانها",
      ],
      [
        "; complete the familiar activity gently before resting",
        "؛ إكمال النشاط المألوف بلطف قبل الراحة",
      ],
      [
        ". The familiar materials rest nearby as the room becomes quiet.",
        ". الأدوات المألوفة قريبة والغرفة تهدأ.",
      ],
      [
        ". The child stays in the familiar place, moves slowly and uses a quiet voice.",
        ". الطفل في المكان المألوف يتحرك بهدوء ويستخدم صوت منخفض.",
      ],
      [
        "; the child rests in quiet familiar comfort",
        "؛ الطفل يستريح في مكان مألوف ومطمئن",
      ],
      [
        "; the activity stays gentle and unhurried",
        "؛ النشاط بلطف ومن غير استعجال",
      ],
      ["; quiet rest follows", "؛ بعدها راحة هادئة"],
      ["; comfort remains available", "؛ الطمأنينة لسه متاحة"],
      ["a quiet familiar room", "غرفة هادئة ومألوفة"],
      ["a supervised familiar garden", "حديقة مألوفة بإشراف كبير"],
      ["a familiar play corner", "ركن لعب مألوف"],
      ["A familiar Egyptian neighborhood playground", "ملعب مألوف في حي مصري"],
      [
        "along a short route from the first ground marker to the nearby basket destination",
        "على طريق قصير من أول علامة على الأرض لحد السلة القريبة",
      ],
      [
        "; two visible dry ground markers lead to the nearby basket destination inside ",
        "؛ علامتان واضحتان على أرض جافة يوصلوا للسلة القريبة داخل ",
      ],
      ["; familiar adult support remains nearby", "؛ كبير مألوف قريب للمساعدة"],
      [
        "The mini-mission starts at the first ground marker; both ground markers and the nearby basket destination are visible.",
        "المهمة الصغيرة تبدأ من أول علامة؛ العلامتان والسلة القريبة ظاهرين.",
      ],
      [
        "At the first marker, a folded play mat corner stops the rolling toy; the route waits while the game pauses.",
        "عند أول علامة، ركن الحصيرة المطوي يوقف اللعبة المتدحرجة؛ المشوار يستنى واللعب يقف.",
      ],
      [
        "At the next ground marker, they flatten the mat corner together and point toward the nearby basket.",
        "عند العلامة التالية يفردوا ركن الحصيرة مع بعض ويشاوروا للسلة القريبة.",
      ],
      [
        "They reach the nearby basket destination along the two visible markers, using the agreed operation.",
        "يوصلوا للسلة القريبة عبر العلامتين بالعملية اللي اتفقوا عليها.",
      ],
      [
        "They return along the same short ground route and rest beside the first ground marker.",
        "يرجعوا على نفس الطريق القصير ويستريحوا جنب أول علامة.",
      ],
      [
        "; follow the two ground markers to the nearby basket destination and return by the same short route",
        "؛ يتبعوا العلامتين للسلة القريبة ويرجعوا من نفس الطريق القصير",
      ],
      [
        "; a folded play mat corner interrupts the short route",
        "؛ ركن حصيرة مطوي يعطل المشوار القصير",
      ],
      ["; try the first short route", "؛ يجربوا بداية الطريق القصير"],
      ["; follow the visible ground route", "؛ يتبعوا الطريق الواضح على الأرض"],
    ];
    for (const [en, ar] of replacements) {
      if (
        en === "the first ground marker" &&
        p.schemaVersion !== "story-plan/1.0" &&
        p.quality.objectiveIntent.primaryIntent === "SHARING_TURN_TAKING"
      )
        continue;
      s = s.replaceAll(en, ar);
    }
    return /[A-Za-z]/.test(s) ? unknown() : s;
  };
  const selectedTitles = mode === "ar-MSA-simple" ? msaTitles : titles;
  let title = p.title.startsWith("The short route: ")
    ? `${mode === "ar-MSA-simple" ? "الرحلة القصيرة" : "المشوار الصغير"}: ${selectedTitles[p.title.slice(17)] ?? unknown()}`
    : (selectedTitles[p.title] ?? (arabic ? unknown() : p.title));
  if (!arabic) title = p.title;
  const q = p.schemaVersion === "story-plan/1.0" ? null : p.quality;
  const events = p.beats.map((beat, i) => ({
    sequence: beat.sequence,
    action: convert(beat.summary),
    beforeState: convert(beat.beforeState),
    afterState: convert(beat.afterState),
    cause: i ? convert(p.beats[i - 1]!.afterState) : convert(p.openingState),
    strategy: convert(q?.transitions[i]?.strategy ?? beat.summary),
    consequence: convert(q?.transitions[i]?.consequence ?? beat.progress),
    informationChange: convert(
      q?.transitions[i]?.informationChange ?? beat.afterState,
    ),
    relationshipChange: convert(
      q?.transitions[i]?.relationshipChange ?? "Support remains available",
    ),
  }));
  const result: PlanPresentation = {
    mode,
    supported: false,
    title,
    ageMonths: p.planning.request.ageMonths,
    category: categoryLabel(p.planning.request.primaryCategory, mode),
    goal: convert(p.goal.description),
    objective: convert(p.planning.request.objective.description),
    setting: convert(p.setting.description),
    constraints: p.planning.constraints.map(convert),
    characters: p.characters.map((c, i) => ({
      name: c.displayName,
      role: arabic
        ? i
          ? "شريك في الأحداث"
          : "الشخصية الرئيسية"
        : i
          ? "Active partner"
          : "Protagonist",
    })),
    problem: p.problem
      ? convert(p.problem.description)
      : arabic
        ? mode === "ar-MSA-simple"
          ? "لا توجد مشكلة تحتاج إلى حل"
          : "من غير مشكلة تحتاج حل"
        : "No problem to solve",
    opening: convert(p.openingState),
    resolution: convert(
      q?.situation.resolutionMethod ??
        p.beats.find((b) => b.beatId === p.resolutionBeatId)!.summary,
    ),
    ending: convert(
      p.beats.find((b) => b.beatId === p.endingBeatId)!.afterState,
    ),
    events,
    notices: [],
  };
  result.supported = !unsupported;
  if (unsupported)
    result.notices.push({
      code: "ARABIC_SEMANTICS_REVIEW",
      severity: "medium",
      text: arabic
        ? "بعض تفاصيل هذه الخطة لا تملك عرضًا عربيًا موثوقًا بعد. راجع التفاصيل الأصلية في الوضع المتقدم قبل قبولها؛ العرض لا يدّعي ترجمة كاملة."
        : "Some plan details have no supported localized projection; review the original Advanced plan.",
    });
  // Structural blockers are never folded into unsupported-translation advice.
  return result;
}
