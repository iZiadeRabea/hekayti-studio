// Independently authored MSA clauses keyed to the planner's exact semantics.
// No Egyptian word substitutions: an unlisted operation remains unsupported.
export function msaClauses(
  a: string,
  b: string,
  setting: string,
): Record<string, string> {
  return {
    "One child holds the ball or toy while the friend waits":
      "اللعبة مع طفل وصديقه ينتظر دوره",
    "The friend has not completed a turn and the game has paused":
      "لم يكمل الصديق دوره وتوقف اللعب",
    "Both children can see whose turn comes next":
      "يعرف الطفلان صاحب الدور التالي",
    "Each child has completed a turn and returned the ball or toy to the partner":
      "أكمل كل طفل دوره وأعاد اللعبة إلى صديقه",
    "The children continue a shared game with the same turn rule":
      "يواصل الطفلان اللعب معًا بقاعدة الدور نفسها",
    "notice the waiting partner": "ملاحظة الصديق الذي ينتظر",
    "The friend wants a place in the game": "يريد الصديق المشاركة في اللعب",
    "The game has only one active player": "يلعب طفل واحد فقط",
    "One child is excluded from play": "لا يشارك الصديق في اللعب بعد",
    "offer a peek without yielding the object":
      "إتاحة نظرة سريعة دون تسليم اللعبة",
    "play alone without yielding the object": "اللعب منفردًا دون تسليم اللعبة",
    "A peek or reach is not a real turn":
      "النظرة أو مد اليد لا يمنحان دورًا كاملًا",
    "The interrupted game cannot continue together":
      "لا يستطيع الطفلان مواصلة اللعب المتوقف معًا",
    "Both children notice the unfair interruption":
      "يلاحظ الطفلان أن الدور لم يكتمل",
    "assign complementary roles and agree to swap":
      "تحديد مكان للدحرجة ومكان للاستقبال والاتفاق على تبادلهما",
    "mark one complete turn before passing":
      "وضع علامة لدور كامل قبل تسليم اللعبة",
    "A visible rule tells both children when the next turn begins":
      "توضح العلامة للطفلين بداية الدور التالي",
    "The friend can predict a complete turn":
      "يعرف الصديق متى يبدأ دوره الكامل",
    "Both children agree to the same rule": "يتفق الطفلان على قاعدة واحدة",
    "perform the agreed reciprocal exchange": "تنفيذ التبادل المتفق عليه",
    "Both children have tested the rule": "جرب الطفلان القاعدة",
    "The game works because neither turn is skipped":
      "يستمر اللعب لأن كل طفل يكمل دوره",
    "Both children are included and trust the next turn":
      "يشارك الطفلان ويطمئنان إلى قدوم دورهما",
    "repeat the successful reciprocal rule": "تكرار قاعدة التبادل الناجحة",
    "The next round uses the known signal":
      "تبدأ الجولة التالية بالإشارة المعروفة",
    "They keep playing together without a new dispute":
      "يواصلان اللعب معًا دون خلاف جديد",
    "Their shared rule sustains play":
      "تساعد القاعدة المشتركة على استمرار اللعب",
    "Support remains available": "تبقى المساعدة المألوفة قريبة",
    "The folded mat blocks the roll": "توقف طية الحصيرة دحرجة اللعبة",
    "The toy has stopped before the basket":
      "توقفت اللعبة قبل الوصول إلى السلة",
    "A smooth cardboard path reaches the basket":
      "يمتد طريق مستو من الورق المقوى إلى السلة",
    "The toy reaches the waiting basket along a continuous flat path":
      "تصل اللعبة إلى السلة عبر طريق مستو متصل",
    "The toy and cardboard strip are stored beside the clear mat":
      "توضع اللعبة وشريط الورق المقوى بجانب الحصيرة الخالية",
    "The toy rests in the marked basket and the path is clear":
      "تستقر اللعبة في السلة ذات العلامة ويبقى الممر خاليًا",
    "The toy is left in the walkway instead of its basket":
      "تبقى اللعبة في الممر بدلًا من سلتها",
    "The toy's marked basket is identified":
      "توضح الصورة على السلة مكان اللعبة",
    "The toy stays stored beside a clear walkway":
      "تبقى اللعبة في مكانها والممر خاليًا",
    "A tall block tower stands on the mat":
      "يقف برج طويل من المكعبات على الحصيرة",
    "Blocks are scattered and the child feels tense":
      "تتناثر المكعبات ويشعر الطفل بالضيق",
    "The child's hands rest and the blocks wait on the mat":
      "تهدأ يدا الطفل وتبقى المكعبات على الحصيرة",
    "A lower steady tower stands beside a calmer child":
      "يقف برج أقصر وثابت بجانب الطفل الهادئ",
    "The steady tower and unused blocks have safe resting places":
      "يستقر البرج الثابت والمكعبات المتبقية في أماكن آمنة",
    "A block is counted twice when the row is moved":
      "يُعد مكعب مرتين عندما يتحرك الصف",
    "Each uncounted block now has an empty marked space":
      "لكل مكعب لم يُعد بعد مكان فارغ محدد",
    "Each of the three spaces contains one block counted once":
      "في كل مكان من الثلاثة مكعب واحد عُد مرة واحدة",
    "Three counted blocks rest beside the three spaces":
      "تستقر المكعبات الثلاثة المعدودة بجانب أماكنها",
    "The guessed result is untested and the two objects remain beside the bowl":
      "لم يُختبر التخمين بعد وتبقى الفلينة والحصاة بجانب الوعاء",
    "The cork stays at the surface while the pebble remains to be checked":
      "تبقى الفلينة على السطح وتنتظر الحصاة اختبارها",
    "The cork is observed at the surface and the pebble at the bowl's bottom in both checks":
      "تظهر الفلينة على السطح والحصاة في قاع الوعاء في الاختبارين",
    "The dry tray and removed objects mark a calm end to the supervised check":
      "تنتهي التجربة بإشراف الكبير مع صينية جافة والأشياء خارج الوعاء",
    "The towel is ready but the washing step has been skipped":
      "المنشفة جاهزة لكن خطوة الغسل لم تتم بعد",
    "Soap comes before the waiting towel in the visible sequence":
      "يأتي الصابون قبل المنشفة في الترتيب الواضح",
    "The supported washing steps are complete and the hands are dry":
      "اكتملت خطوات الغسل بالمساعدة وجفت اليدان",
    "The towel and soap are ready in their places for next time":
      "المنشفة والصابون جاهزان في مكانيهما للمرة التالية",
    [`${a} tries the agreed role once while ${b} points to the turn cue`]: `${a} يجرب الدور المتفق عليه مرة واحدة و${b} يشير إلى علامة الدور`,
    [`${b} points to the next player's place and ${a} yields the cue before the full round`]: `${b} يشير إلى مكان اللاعب التالي و${a} يسلم علامة الدور قبل الجولة الكاملة`,
    "The partial result is available before completing the whole operation":
      "تظهر نتيجة الجزء المجرب قبل إكمال العملية كلها",
    "name the concrete trial result before completing the operation":
      "تسمية نتيجة التجربة الملموسة قبل إكمال العملية",
    "The complete operation now follows the observed partial result":
      "تتبع العملية الكاملة نتيجة الجزء المجرب",
    "Guide a toy along a short marked route and bring it back to its basket":
      "توجيه لعبة عبر طريق قصير محدد وإعادتها إلى سلتها",
    "A toy rests beside two familiar route markers and its basket":
      "تستقر لعبة بجانب علامتي طريق مألوفتين وسلتها",
    [`A toy rests beside two familiar route markers and its basket at ${setting}`]: `تستقر لعبة بجانب علامتي طريق مألوفتين وسلتها في ${setting}`,
    "The toy stops at a folded corner before reaching the second marker":
      "تتوقف اللعبة عند ركن مطوي قبل العلامة الثانية",
    "The child rolls the toy past the first mark; it stops at the folded corner":
      "يدحرج الطفل اللعبة بعد العلامة الأولى؛ فتتوقف عند الركن المطوي",
    "The child asks a familiar helper to hold the mat while the corner is flattened":
      "يطلب الطفل من مساعد مألوف تثبيت الحصيرة أثناء فرد الركن",
    "The flattened corner opens the second part of the marked route":
      "يفتح فرد الركن الجزء الثاني من الطريق المحدد",
    "Flatten the corner, roll the toy past the second marker, turn it around and bring it back along the same marks to its basket":
      "فرد الركن ودحرجة اللعبة بعد العلامة الثانية وتدويرها وإعادتها عبر العلامات نفسها إلى السلة",
    "The toy has reached the second mark and returned to the waiting basket":
      "وصلت اللعبة إلى العلامة الثانية وعادت إلى السلة",
    "The child parks the toy and leaves both route markers beside the basket":
      "يوقف الطفل اللعبة ويترك علامتي الطريق بجانب السلة",
    "The parked toy and two marks stay together":
      "تبقى اللعبة المتوقفة والعلامتان معًا",
    "notice the two route markers": "ملاحظة علامتي الطريق",
    "The basket is also the return point": "السلة هي أيضًا نقطة العودة",
    "A short familiar route is visible": "يظهر طريق قصير مألوف",
    "follow the first marked route": "اتباع الجزء الأول المحدد من الطريق",
    "A folded corner interrupts the route": "يعطل ركن مطوي الطريق",
    "The destination is not reached yet": "لم يصل الطفل إلى الوجهة بعد",
    "ask for a specific support at the blocked corner":
      "طلب مساعدة محددة عند الركن الذي يعطل الطريق",
    "Both marks are linked by a flat path": "يربط طريق مستو بين العلامتين",
    "The toy can continue and return safely":
      "تستطيع اللعبة مواصلة الطريق والعودة بأمان",
    "follow the known outward and return marks":
      "اتباع العلامات المعروفة للذهاب والعودة",
    "The same marks work in both directions": "تصلح العلامات نفسها للاتجاهين",
    "The complete short route is demonstrated":
      "يظهر الطريق القصير الكامل بالفعل",
    "store the route materials": "ترتيب أدوات الطريق",
    "The same route can be played again": "يمكن اللعب عبر الطريق نفسه مرة أخرى",
    "The familiar return closes the activity": "تنهي العودة المألوفة النشاط",
    "Notice a familiar soft shape, its sound and its gentle return":
      "ملاحظة شكل ناعم مألوف وصوته وعودته بلطف",
    "Reveal the same soft shape slowly, repeat its gentle sound and settle beside it":
      "إظهار الشكل الناعم نفسه ببطء وتكرار صوته اللطيف والراحة بجانبه",
    "A soft shape rests partly beneath a familiar cloth":
      "يستقر جزء من شكل ناعم تحت قطعة قماش مألوفة",
    [`A familiar soft shape rests at ${setting}; shared attention follows its rounded edge`]: `يستقر شكل ناعم مألوف في ${setting}؛ ويتبع الانتباه المشترك حافته المستديرة`,
    "The rounded edge is visible": "تظهر الحافة المستديرة",
    "look at the edge": "النظر إلى الحافة",
    "A rounded edge is seen": "تُرى الحافة المستديرة",
    "Attention has a familiar focus": "للانتباه نقطة مألوفة",
    "The cloth lifts slowly to show the whole soft shape":
      "ترتفع قطعة القماش ببطء وتظهر الشكل الناعم كاملًا",
    "The whole shape is visible": "يظهر الشكل كاملًا",
    "lift a little cloth": "رفع جزء صغير من القماش",
    "The whole shape joins the known edge": "يكمل الشكل الكامل الحافة المعروفة",
    "Recognition expands without a problem": "يزداد التعرف دون مشكلة",
    "The same shape returns with one soft tapping sound":
      "يعود الشكل نفسه مع صوت نقرة ناعمة واحدة",
    "The familiar shape is linked to a soft sound":
      "يرتبط الشكل المألوف بصوت ناعم",
    "repeat with one sound": "التكرار مع صوت واحد",
    "A soft sound accompanies the known shape": "يرافق صوت ناعم الشكل المعروف",
    "The repetition adds one sensory detail":
      "يضيف التكرار تفصيلًا حسيًا واحدًا",
    "The cloth rests beside the shape and the familiar sound quiets":
      "يستقر القماش بجانب الشكل ويهدأ الصوت المألوف",
    "The shape and cloth rest together": "يستقر الشكل والقماش معًا",
    "slow and settle": "الإبطاء والراحة",
    "The sound becomes quiet": "يصبح الصوت هادئًا",
    "Shared attention closes calmly": "ينتهي الانتباه المشترك بهدوء",
    "Observe which of two familiar objects stays at the surface of a shallow supervised bowl":
      "ملاحظة أي الشيئين المألوفين يبقى على سطح وعاء ضحل بإشراف كبير",
    "A cork, a pebble and a shallow bowl wait beside a familiar adult":
      "فلينة وحصاة ووعاء ضحل بجانب كبير مألوف",
    [`A cork, a pebble and a shallow bowl wait beside a familiar adult at ${setting}`]: `فلينة وحصاة ووعاء ضحل بجانب كبير مألوف في ${setting}`,
    [`${a} guesses that the heavier-looking cork must sink without testing it`]: `${a} يتوقع أن الفلينة التي تبدو أثقل ستغرق دون اختبارها`,
    "With the adult nearby, the child lowers the cork and watches it stay at the surface":
      "ينزل الطفل الفلينة ويراقب بقاءها على السطح والكبير قريب",
    "With adult supervision, lower the pebble, compare its resting place with the cork and repeat each observation without splashing":
      "بإشراف الكبير، إنزال الحصاة ومقارنة مكانها بالفلينة وتكرار الملاحظة دون رش الماء",
    "The adult removes both objects and the child dries the tray":
      "يخرج الكبير الشيئين ويجفف الطفل الصينية",
    "Follow a supported wash-and-dry sequence at a familiar basin":
      "اتباع ترتيب الغسل والتجفيف بالمساعدة عند حوض مألوف",
    "Soap and a towel wait beside a familiar basin and adult":
      "صابون ومنشفة بجانب حوض وكبير مألوفين",
    [`Soap and a towel wait beside a familiar basin and adult at ${setting}`]: `صابون ومنشفة بجانب حوض وكبير مألوفين في ${setting}`,
    [`${a} reaches straight for the towel before washing`]: `${a} يمد يده إلى المنشفة مباشرة قبل الغسل`,
    "The adult points to the soap and the child puts the towel back beside the basin":
      "يشير الكبير إلى الصابون ويعيد الطفل المنشفة إلى جانب الحوض",
    "With adult support, use the soap, rinse at the basin and then dry with the waiting towel":
      "بمساعدة الكبير، استخدام الصابون والشطف عند الحوض ثم التجفيف بالمنشفة",
    "The child returns the towel to its familiar hook":
      "يعيد الطفل المنشفة إلى خطافها المألوف",
    "A different supported strategy is available": "تتوفر طريقة مختلفة ومدعومة",
    "The relevant difference is now observed": "يظهر الفرق المناسب بالملاحظة",
    "perform the changed sequence and check": "تنفيذ الترتيب الجديد وفحصه",
    "The visible result confirms the concrete operation":
      "تؤكد النتيجة المرئية العملية الملموسة",
    [`${a} lays two turn counters beside the ball, one for each child, and points to the waiting empty place`]: `${a} يضع علامتي دور بجانب الكرة، واحدة لكل طفل، ويشير إلى المكان الفارغ`,
    [`${b} points to the empty counter while ${a}'s counter has the ball; they compare who has had a complete turn`]: `${b} يشير إلى علامة الدور الفارغة والكرة عند علامة ${a}؛ ويقارنان من أكمل دوره`,
    [`After each complete pass, ${a} and ${b} move the ball to the next counter; they check that both counters have marked a turn`]: `بعد كل تسليم كامل، ${a} و${b} ينقلان الكرة إلى علامة الدور التالية ويفحصان أن كل علامة سجلت دورًا`,
    [`${a} points to the ready materials and predicts the result before trying`]: `${a} يشير إلى الأدوات الجاهزة ويتوقع النتيجة قبل التجربة`,
    [`${a} compares the first visible result with the earlier prediction and points to the difference`]: `${a} يقارن النتيجة المرئية الأولى بالتوقع السابق ويشير إلى الفرق`,
    [`${a} repeats the changed operation and points out the visible result that confirms it`]: `${a} يكرر العملية الجديدة ويشير إلى النتيجة المرئية التي تؤكدها`,
    [`${a} sets the activity materials in their familiar starting places before beginning the daily sequence`]: `${a} يضع أدوات النشاط في أماكن البداية المألوفة قبل بدء الترتيب اليومي`,
    [`${a} pauses at the familiar basket and ${b} points to the waiting play space; the next turn comes before putting the toy away`]: `${a} يتوقف عند السلة المألوفة و${b} يشير إلى مكان اللعب؛ ويأتي الدور التالي قبل ترتيب اللعبة`,
    [`${a} points to the familiar next step and brings the waiting materials within reach`]: `${a} يشير إلى الخطوة التالية المألوفة ويقرب أدواتها`,
    [`${a} finishes the shared play sequence, then returns the materials to their known basket with ${b}`]: `${a} يكمل اللعب المشترك ثم يعيد الأدوات إلى سلتها المعروفة مع ${b}`,
    [`${a} finishes the supported sequence and returns the materials to their known places`]: `${a} يكمل الترتيب بالمساعدة ويعيد الأدوات إلى أماكنها المعروفة`,
    [`${a}'s fingers tighten around the toy while ${b}'s shoulders droop; their faces show the feeling`]: `تشتد أصابع ${a} حول اللعبة وينخفض كتفا ${b}؛ وتظهر الوجوه الشعور`,
    [`${a}'s hands tighten and shoulders rise before the supported activity; the face shows the feeling`]: `تشتد يدا ${a} ويرتفع كتفاه قبل النشاط المدعوم؛ ويظهر الوجه الشعور`,
    [`${a} pauses, names feeling cross briefly, and loosens the hands before trying the supported response`]: `${a} يتوقف ويسمي الضيق باختصار ويريح يديه قبل تجربة الاستجابة المدعومة`,
    [`${a}'s hands relax and ${b}'s shoulders lift after the shared action; they name the calmer feeling together`]: `ترتاح يدا ${a} ويرتفع كتفا ${b} بعد الفعل المشترك؛ ويسميان الشعور الأهدأ معًا`,
    [`${a}'s hands relax after the supported action; a gentle breath shows the calmer feeling`]: `ترتاح يدا ${a} بعد الفعل المدعوم؛ ويظهر نفس لطيف الشعور الأهدأ`,
    [`${a} notices ${b}'s empty hands after the first choice`]: `${a} يلاحظ يدي ${b} الفارغتين بعد الاختيار الأول`,
    [`${a} notices what the first choice has left unfinished`]: `${a} يلاحظ ما تركه الاختيار الأول دون إكمال`,
    [`${a} chooses to make space for ${b}'s idea, placing the toy where both can reach it`]: `${a} يختار إتاحة مساحة لفكرة ${b} ويضع اللعبة حيث يستطيعان الوصول إليها`,
    [`${a} chooses to try the supported step with care and leaves the materials ready`]: `${a} يختار تجربة الخطوة المدعومة بعناية ويترك الأدوات جاهزة`,
    [`${b} smiles and invites ${a} into the next round after the fair, caring choice`]: `${b} يبتسم ويدعو ${a} إلى الجولة التالية بعد الاختيار العادل والمراعي`,
    [`${a} checks the useful result of the caring choice and sets the materials gently in place`]: `${a} يفحص نتيجة الاختيار المراعي ويضع الأدوات بلطف في مكانها`,
    [`${a} notices the consequence: the waiting partner cannot play while one child holds the toy`]: `${a} يلاحظ النتيجة: لا يستطيع الصديق المنتظر اللعب ما دامت اللعبة مع طفل واحد`,
    [`${a} notices the visible consequence of the first incomplete action`]: `${a} يلاحظ النتيجة المرئية للفعل الأول غير المكتمل`,
    [`${a} changes the choice by yielding the visible turn cue to ${b}`]: `${a} يغير الاختيار بتسليم علامة الدور الواضحة إلى ${b}`,
    [`${a} changes the choice by following the visible cue before completing the action`]: `${a} يغير الاختيار باتباع العلامة الواضحة قبل إكمال الفعل`,
    [`The changed action lets ${b} complete a turn and keeps the shared game moving; ${a} sees the useful consequence`]: `يتيح الفعل الجديد لـ${b} إكمال دوره ويستمر اللعب المشترك؛ ${a} يرى النتيجة المفيدة`,
    [`${a} checks the useful visible consequence of the changed action against the original task`]: `${a} يفحص النتيجة المفيدة المرئية للفعل الجديد بالمقارنة بالمهمة الأصلية`,
    "Give each child a gentle turn with the soft toy before settling beside the familiar book":
      "إعطاء كل طفل دورًا هادئًا مع اللعبة الناعمة قبل الراحة بجانب الكتاب المألوف",
    [`${b} waits for a quiet turn with the soft toy`]: `${b} ينتظر دورًا هادئًا مع اللعبة الناعمة`,
    [`${a} gently passes the soft toy to ${b}; each has a quiet turn, then they place it in its basket and close the book together`]: `${a} يسلم اللعبة الناعمة بلطف إلى ${b}؛ ويأخذ كل طفل دورًا هادئًا، ثم يضعانها في سلتها ويغلقان الكتاب معًا`,
    [`${a} holds the soft toy beside the familiar book while ${b} waits for a quiet turn`]: `${a} يمسك اللعبة الناعمة بجانب الكتاب المألوف و${b} ينتظر دورًا هادئًا`,
    [`${a} notices ${b}'s waiting hands and loosens the grip on the soft toy; both stay beside the familiar book`]: `${a} يلاحظ يدي ${b} المنتظرتين ويخفف قبضته على اللعبة الناعمة؛ ويبقيان بجانب الكتاب المألوف`,
    [`${b} points to the cushion beside the book; ${a} places the soft toy there so the waiting hands can take a quiet turn`]: `${b} يشير إلى الوسادة بجانب الكتاب؛ ${a} يضع اللعبة الناعمة هناك ليأخذ الصديق دوره الهادئ`,
    "The closed book and soft toy rest beside the children in the quiet familiar place":
      "يستقر الكتاب المغلق واللعبة الناعمة بجانب الطفلين في المكان الهادئ المألوف",
    "rest in familiar comfort": "الراحة في مكان مألوف ومطمئن",
    "pass gently, give both a quiet turn and settle":
      "التسليم بلطف وإعطاء كل طفل دورًا هادئًا ثم الراحة",
    "notice waiting hands and offer a quiet turn":
      "ملاحظة اليدين المنتظرتين وإتاحة دور هادئ",
    "Both children have room in the quiet shared routine":
      "لكل طفل مكان في الروتين الهادئ المشترك",
    "Build a stable block bridge so both toy cars can cross":
      "بناء جسر ثابت من المكعبات لتعبر سيارتا اللعب",
    "A narrow block bridge wobbles when one child builds alone":
      "يهتز جسر ضيق من المكعبات عندما يبنيه طفل واحد منفردًا",
    "Blocks and two toy cars lie beside a marked gap":
      "مكعبات وسيارتا لعب بجانب فجوة محددة",
    [`Blocks and two toy cars lie beside a marked gap at ${setting}`]: `مكعبات وسيارتا لعب بجانب فجوة محددة في ${setting}`,
    [`${a} piles blocks onto a narrow base; the bridge leans before a car can cross`]: `${a} يضع مكعبات على قاعدة ضيقة؛ فيميل الجسر قبل عبور السيارة`,
    "The children compare the narrow base with a wide one and choose different jobs":
      "يقارن الطفلان القاعدة الضيقة بقاعدة عريضة ويختاران مهمتين مختلفتين",
    [`${a} holds the base steady while ${b} adds a wide support; they swap builder and tester roles and roll both cars across`]: `${a} يثبت القاعدة و${b} يضيف دعامة عريضة؛ ويتبادلان دوري البناء والاختبار ويدحرجان السيارتين فوق الجسر`,
    [`${a} asks ${b} to hold the base, adds one wider support and then returns the help while ${b} tests the second car`]: `${a} يطلب من ${b} تثبيت القاعدة ويضيف دعامة أعرض، ثم يساعد ${b} في اختبار السيارة الثانية`,
    "A wide base and clear jobs are chosen":
      "اختار الطفلان قاعدة عريضة ومهمتين واضحتين",
    "Both cars cross the steady bridge without tipping it":
      "تعبر السيارتان الجسر الثابت دون إمالته",
    "The children park both cars and keep the wide bridge ready for another crossing":
      "يوقف الطفلان السيارتين ويتركان الجسر العريض جاهزًا لعبور جديد",
    "The completed bridge waits beside two parked cars":
      "يستقر الجسر المكتمل بجانب السيارتين المتوقفتين",
    "notice the shared task": "ملاحظة المهمة المشتركة",
    "The task needs both children's attention":
      "تحتاج المهمة إلى انتباه الطفلين",
    "Materials and participants are ready": "الأدوات والطفلان جاهزون",
    "act alone without checking the partner or base":
      "المحاولة منفردًا دون سؤال الصديق أو فحص القاعدة",
    "The first strategy overlooks a needed support":
      "تغفل الطريقة الأولى دعامة مطلوبة",
    "The task pauses instead of finishing": "تتوقف المهمة بدلًا من اكتمالها",
    "The children need complementary roles": "يحتاج الطفلان إلى دورين متكاملين",
    "listen and change the unsupported strategy":
      "الاستماع وتغيير الطريقة التي تفتقر إلى الدعم",
    "The missing support is now explicit": "أصبح الدعم الناقص واضحًا",
    "A practical repair can begin": "يمكن بدء الإصلاح العملي",
    "Both children contribute to the decision": "يشارك الطفلان في القرار",
    "perform complementary roles and check the result":
      "تنفيذ مهمتين متكاملتين وفحص النتيجة",
    "The repair or support holds when tested":
      "يثبت الإصلاح أو الدعامة عند الاختبار",
    "The shared task succeeds visibly": "تنجح المهمة المشتركة بصورة واضحة",
    "Both children's contributions are respected":
      "تحظى مساهمة كل طفل بالتقدير",
    "continue with equal contributions": "الاستمرار بمساهمتين متساويتين",
    "The successful solution remains available": "يبقى الحل الناجح متاحًا",
    "The relationship and task close together": "تنتهي المهمة والعلاقة معًا",
    "Both children remain included": "يستمر الطفلان في المشاركة",
    "Pause beside a fallen block tower, settle the body and rebuild a lower steady tower":
      "التوقف بجانب برج مكعبات ساقط وتهدئة الجسم وإعادة بناء برج أقصر وثابت",
    "A block tower falls and the child wants to rush the next block":
      "يسقط برج المكعبات ويريد الطفل إضافة المكعب التالي بسرعة",
    "A small block tower stands beside a wide mat":
      "يقف برج مكعبات صغير بجانب حصيرة عريضة",
    [`${a} watches a small block tower at ${setting}`]: `${a} يراقب برج مكعبات صغيرًا في ${setting}`,
    [`${a} reaches for another block as the tower falls; hurried hands knock the base aside`]: `${a} يمد يده إلى مكعب آخر عند سقوط البرج؛ وتحرك اليدان المتعجلتان القاعدة جانبًا`,
    [`${a} names the upset, puts both feet on the floor and asks for a quiet pause`]: `${a} يسمي الضيق ويضع قدميه على الأرض ويطلب وقفة هادئة`,
    [`${a} puts both feet on the floor, breathes slowly, asks for a quiet pause and rebuilds with a wide base`]: `${a} يضع قدميه على الأرض ويتنفس ببطء ويطلب وقفة هادئة، ثم يعيد البناء بقاعدة عريضة`,
    [`${a} leaves a space beside the tower and rests the remaining blocks on the mat`]: `${a} يترك مساحة بجانب البرج ويضع المكعبات المتبقية على الحصيرة`,
    "notice the tower": "ملاحظة البرج",
    "The narrow base is visible": "تظهر القاعدة الضيقة",
    "The child cares about the tower": "يهتم الطفل بالبرج",
    "rush to replace the lost tower": "التعجل لإعادة بناء البرج الساقط",
    "Hurried hands move the loose base":
      "تحرك اليدان المتعجلتان القاعدة غير الثابتة",
    "The upset grows when rebuilding is rushed":
      "يزداد الضيق عند التعجل في إعادة البناء",
    "name the feeling and pause": "تسمية الشعور والتوقف",
    "A pause is available before another try": "يمكن التوقف قبل محاولة أخرى",
    "The body begins to settle": "يبدأ الجسم بالهدوء",
    "breathe then rebuild on a wide base":
      "التنفس ثم إعادة البناء على قاعدة عريضة",
    "A lower wide base stays steady":
      "يبقى البرج الأقصر وقاعدته العريضة ثابتين",
    "Calm makes a careful next action possible":
      "يساعد الهدوء على تنفيذ الفعل التالي بعناية",
    "stop after a manageable success": "التوقف بعد نجاح صغير مناسب",
    "The tower need not grow taller now": "لا حاجة إلى زيادة ارتفاع البرج الآن",
    "The story ends with a settled body": "تنتهي القصة والجسم هادئ",
    "Place three blocks in three marked spaces and check that each has been counted once":
      "وضع ثلاثة مكعبات في ثلاثة أماكن محددة وفحص أن كل مكعب عُد مرة واحدة",
    "Three blocks lie beside three marked spaces":
      "ثلاثة مكعبات بجانب ثلاثة أماكن محددة",
    [`Three blocks lie beside three marked spaces at ${setting}`]: `ثلاثة مكعبات بجانب ثلاثة أماكن محددة في ${setting}`,
    [`${a} counts a loose row, shifts one block and counts that block again`]: `${a} يعد صفًا من المكعبات ويحرك مكعبًا، ثم يعده مرة ثانية`,
    "The child draws one space for each block and moves only uncounted blocks":
      "يرسم الطفل مكانًا لكل مكعب وينقل المكعبات التي لم يعدها فقط",
    "Move each block into one marked space while saying one number, then point to each occupied space once":
      "نقل كل مكعب إلى مكان محدد مع قول رقم واحد، ثم الإشارة إلى كل مكان ممتلئ مرة واحدة",
    "The child points to the three occupied spaces, then stores the blocks":
      "يشير الطفل إلى الأماكن الثلاثة الممتلئة ثم يرتب المكعبات",
    "look at the available objects": "النظر إلى الأشياء الجاهزة",
    "The objects differ in position or shape":
      "تختلف الأشياء في موضعها أو شكلها",
    "There is something visible to check": "يوجد شيء مرئي يمكن فحصه",
    "make one unsupported prediction": "وضع تخمين واحد قبل الفحص",
    "The first result differs from the guess":
      "تختلف النتيجة الأولى عن التخمين",
    "The child has a concrete question": "لدى الطفل سؤال ملموس",
    "change one condition and compare": "تغيير شرط واحد والمقارنة",
    "One-to-one spaces or toy shape explains the difference":
      "يفسر تخصيص مكان لكل مكعب أو شكل اللعبة الفرق",
    "The child can now check a rule": "يستطيع الطفل الآن فحص القاعدة",
    "repeat a controlled check": "تكرار اختبار بشروط المقارنة نفسها",
    "The observed result is consistent": "تتفق النتيجة المرئية في الاختبارين",
    "The learning is demonstrated rather than announced":
      "يظهر التعلم في الفعل لا في محاضرة",
    "use the checked result in a familiar next action":
      "استخدام النتيجة المختبرة في فعل تال مألوف",
    "The checked result remains available": "تبقى النتيجة المختبرة متاحة",
    "The discovery closes with the same concrete objects":
      "ينتهي الاكتشاف بالأشياء الملموسة نفسها",
    "Match familiar blocks to picture trays by color":
      "مطابقة المكعبات المألوفة مع صواني الصور حسب اللون",
    "Different blocks rest beside two trays labelled with color pictures":
      "مكعبات مختلفة بجانب صينيتين تحملان صور ألوان",
    [`Different blocks rest beside two trays labelled with color pictures at ${setting}`]: `مكعبات مختلفة بجانب صينيتين تحملان صور ألوان في ${setting}`,
    [`${a} places every block in the nearest tray without comparing the color pictures`]: `${a} يضع كل المكعبات في أقرب صينية دون مقارنة صور الألوان`,
    "Different blocks are mixed in one tray and the second tray is empty":
      "تختلط مكعبات مختلفة في صينية وتبقى الثانية فارغة",
    [`${a} holds one block beside each picture and notices which color matches`]: `${a} يضع مكعبًا بجانب كل صورة ويلاحظ اللون المطابق`,
    "One block matches a picture while another belongs in the second tray":
      "يطابق مكعب صورة وينتمي مكعب آخر إلى الصينية الثانية",
    "Compare each block's color with the picture, place it in the matching tray and check one new block against the same pictures":
      "مقارنة لون كل مكعب بالصورة ووضعه في الصينية المطابقة واختبار مكعب جديد مع الصور نفسها",
    "Both trays hold blocks matching their color pictures, including the newly checked block":
      "تحمل الصينيتان مكعبات تطابق صور ألوانهما، ومنها المكعب الجديد المختبر",
    "The child leaves the picture labels beside the sorted trays for the next game":
      "يترك الطفل صور الألوان بجانب الصواني المرتبة للعبة التالية",
    "The sorted blocks and visible labels stay ready together":
      "تبقى المكعبات المرتبة والصور الواضحة جاهزة معًا",
    "notice the concrete materials": "ملاحظة الأدوات الملموسة",
    "The materials have distinct visible places": "لكل أداة مكان واضح مختلف",
    "A familiar sequence or test is ready": "ترتيب مألوف أو اختبار جاهز",
    "try before checking the visible cue": "المحاولة قبل فحص العلامة المرئية",
    "The skipped or untested step becomes visible":
      "تظهر الخطوة التي لم تتم أو لم تختبر",
    "The first strategy does not finish the sequence":
      "لا تكمل الطريقة الأولى الترتيب",
    "compare with a visible cue": "المقارنة بعلامة مرئية",
    "The relevant cue changes the next action":
      "تغير العلامة المناسبة الفعل التالي",
    "The concrete operation can now begin": "يمكن الآن بدء العملية الملموسة",
    "perform and check the concrete operation": "تنفيذ العملية الملموسة وفحصها",
    "The checked result confirms the concrete operation":
      "تؤكد النتيجة المفحوصة العملية الملموسة",
    "The requested practical learning or routine is demonstrated":
      "يظهر التعلم العملي أو الروتين المطلوب بالفعل",
    "put materials in their known places": "وضع الأدوات في أماكنها المعروفة",
    "The familiar result remains available": "تبقى النتيجة المألوفة متاحة",
    "The activity closes without a new conflict": "ينتهي النشاط دون خلاف جديد",
    "Put the familiar book and soft toy in their resting places":
      "وضع الكتاب المألوف واللعبة الناعمة في مكاني الراحة",
    "A familiar book lies open beside a soft toy":
      "كتاب مألوف مفتوح بجانب لعبة ناعمة",
    [`A familiar book lies open beside a soft toy at ${setting}`]: `كتاب مألوف مفتوح بجانب لعبة ناعمة في ${setting}`,
    [`${a} opens another page while the toy is waiting for its basket`]: `${a} يفتح صفحة أخرى واللعبة تنتظر سلتها`,
    "The book remains open and the toy has not reached its resting place":
      "يبقى الكتاب مفتوحًا ولم تصل اللعبة إلى مكان الراحة",
    [`${a} notices the toy's basket and the last familiar picture`]: `${a} يلاحظ سلة اللعبة والصورة المألوفة الأخيرة`,
    "The last picture and waiting basket show the next calm steps":
      "توضح الصورة الأخيرة والسلة الخطوات الهادئة التالية",
    "Carry the toy gently to its basket, close the book after the familiar picture and settle beside both resting places":
      "حمل اللعبة بلطف إلى سلتها وإغلاق الكتاب بعد الصورة المألوفة والراحة بجانب مكاني الراحة",
    "The book is closed and the soft toy rests beside a settled child":
      "الكتاب مغلق واللعبة الناعمة بجانب طفل هادئ",
    "The child rests while the familiar materials stay nearby":
      "يستريح الطفل وتبقى الأدوات المألوفة قريبة",
    "The closed book and resting toy remain in a quiet familiar space":
      "يبقى الكتاب المغلق واللعبة المستقرة في مكان هادئ ومألوف",
    "Finish a small familiar activity and put its materials away":
      "إكمال نشاط صغير مألوف وترتيب أدواته",
    "A rolling toy cannot reach the waiting basket":
      "لا تستطيع اللعبة المتدحرجة الوصول إلى السلة",
    "Place a flat cardboard ramp, roll the toy along it and catch it in the basket":
      "وضع منحدر مستو من الورق المقوى ودحرجة اللعبة عليه واستقبالها في السلة",
    "A toy and a basket are ready in the familiar play corner":
      "لعبة وسلة جاهزتان في ركن اللعب المألوف",
    [`${a} sees a toy and a basket at ${setting}`]: `${a} يرى لعبة وسلة في ${setting}`,
    [`${a} rolls the toy directly toward the basket; it stops at the folded mat`]: `${a} يدحرج اللعبة نحو السلة مباشرة؛ فتتوقف عند الحصيرة المطوية`,
    [`${a} compares the folded mat with a flat cardboard strip and lays the strip across the fold`]: `${a} يقارن الحصيرة المطوية بشريط مستو من الورق المقوى ويضع الشريط فوق الطية`,
    [`${a} stores the strip beside the basket and leaves the toy resting inside`]: `${a} يرتب الشريط بجانب السلة ويترك اللعبة مستقرة داخلها`,
    "notice two familiar materials": "ملاحظة أداتين مألوفتين",
    "The basket is a visible destination": "السلة وجهة واضحة",
    "A small activity can begin": "يمكن بدء نشاط صغير",
    "roll without a smooth path": "الدحرجة دون طريق مستو",
    "The first route does not reach the basket":
      "لا يصل الطريق الأول إلى السلة",
    "replace the interrupted path with a flat strip":
      "استبدال الطريق المنقطع بشريط مستو",
    "A flat path bridges the fold": "يعبر الطريق المستوي فوق الطية",
    "The toy has a continuous route": "للعبة طريق متصل",
    "roll along the flat strip and catch":
      "الدحرجة عبر الشريط المستوي والاستقبال",
    "The cardboard path supports the complete roll":
      "يدعم طريق الورق المقوى الدحرجة الكاملة",
    "The small activity finishes visibly": "ينتهي النشاط الصغير بصورة واضحة",
    "put away the successful materials": "ترتيب الأدوات الناجحة",
    "The path can be used again": "يمكن استخدام الطريق مرة أخرى",
    "A concrete activity closes without claiming unknown objective delivery":
      "ينتهي نشاط ملموس دون ادعاء تحقيق هدف غير مؤكد",
  };
}

export function msaProject(
  input: string,
  a: string,
  b: string,
  setting: string,
  localizedSetting: string,
): string | undefined {
  if (!/[A-Za-z]/.test(input)) return input; // Authored input is retained, not translated.
  const clauses = msaClauses(a, b, setting);
  for (const key of Object.keys(clauses))
    clauses[key] = clauses[key]!.replaceAll(setting, localizedSetting);
  if (clauses[input]) return clauses[input];
  const focus = /soft ball/.test(input)
    ? "الكرة الناعمة"
    : /soft toy/.test(input)
      ? "اللعبة الناعمة"
      : "سيارة اللعب";
  const signal = /short clapping/.test(input)
    ? "تصفيقة قصيرة"
    : "بطاقة دور صغيرة";
  const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const x = escape(a),
    y = escape(b);
  const patterns: [RegExp, string][] = [
    [
      /^Give both children a clear turn with the (?:soft ball|toy car|soft toy) and keep their game moving/,
      `إعطاء كل طفل دورًا واضحًا مع ${focus} ومواصلة اللعب`,
    ],
    [
      new RegExp(
        `^${x} holds the (?:soft ball|toy car|soft toy); ${y} is waiting without a turn`,
      ),
      `${a} يمسك ${focus} و${b} ينتظر دوره`,
    ],
    [
      new RegExp(
        `^${x} has the (?:soft ball|toy car|soft toy); ${y} stands beside the marked play space`,
      ),
      `${a} يحمل ${focus} و${b} يقف بجانب مكان اللعب المحدد`,
    ],
    [
      new RegExp(
        `^${x} holds the (?:soft ball|toy car|soft toy) at .+?; ${y} waits beside the marked play space`,
      ),
      `${a} يمسك ${focus} في ${localizedSetting} و${b} ينتظر بجانب مكان اللعب المحدد`,
    ],
    [
      new RegExp(
        `^${x} keeps rolling the (?:soft ball|toy car|soft toy) alone; ${y} reaches to join and the game stops`,
      ),
      `${a} يواصل دحرجة ${focus} منفردًا. ${b} يمد يده للمشاركة، فيتوقف اللعب`,
    ],
    [
      new RegExp(
        `^${x} offers a very short peek at the (?:soft ball|toy car|soft toy) but takes it back before ${y} can play`,
      ),
      `${a} يعرض ${focus} سريعًا ثم يستعيدها قبل أن يلعب ${b}`,
    ],
    [
      new RegExp(
        `^${x} and ${y} mark roller and catcher places; they agree to swap places after each roll`,
      ),
      `${a} و${b} يحددان مكانًا للدحرجة ومكانًا للاستقبال ويتفقان على تبادلهما بعد كل دحرجة`,
    ],
    [
      new RegExp(
        `^${x} and ${y} place (?:a short clapping signal|a small turn card) beside the player and agree to pass it after one short play`,
      ),
      `${a} و${b} يستخدمان ${signal} لتحديد الدور ويسلمان اللعبة بعد لعب قصير كامل`,
    ],
    [
      /^Roll the (?:soft ball|toy car|soft toy) to a partner, swap roller and catcher roles after each roll, and let each child lead one roll/,
      `دحرجة ${focus} إلى الصديق وتبادل دوري الدحرجة والاستقبال بعد كل مرة، وإتاحة دحرجة يبدأها كل طفل`,
    ],
    [
      /^Use (?:a short clapping signal|a small turn card) to mark the current player, pass the (?:soft ball|toy car|soft toy) after one short play, and give each child a complete turn/,
      `استخدام ${signal} لتحديد اللاعب وتسليم ${focus} بعد لعب قصير، وإعطاء كل طفل دورًا كاملًا`,
    ],
    [
      new RegExp(
        `^${x} and ${y} begin another gentle round, passing the (?:soft ball|toy car|soft toy) when the agreed signal comes`,
      ),
      `${a} و${b} يبدآن جولة لطيفة جديدة ويسلمان ${focus} عند الإشارة المتفق عليها`,
    ],
  ];
  let s = input;
  for (const [re, value] of patterns)
    if (re.test(s)) {
      s = s.replace(re, value);
      break;
    }
  for (const [key, value] of Object.entries(clauses).sort(
    (x, y) => y[0].length - x[0].length,
  ))
    s = s.replaceAll(key, value);
  // Controlled category modifiers are authored separately too; longest first
  // prevents partial substitution from hiding an unsupported action.
  const grammar: [string, string][] = [
    [
      "A partial trial follows this visible cue: ",
      "تتبع محاولة جزئية هذه العلامة المرئية: ",
    ],
    [
      "The observed change is named before the final operation: ",
      "يُسمى التغير المرئي قبل العملية النهائية: ",
    ],
    ["test one part of ", "تجربة جزء واحد من "],
    ["One partial trial checks ", "تفحص محاولة جزئية واحدة "],
    [
      `${a} tries one part of the operation: `,
      `${a} يجرب جزءًا واحدًا من العملية: `,
    ],
    [
      `${a} stops before finishing and points out the observed change: `,
      `${a} يتوقف قبل الإكمال ويشير إلى التغير المرئي: `,
    ],
    [
      "along a short route from the first ground marker to the nearby activity destination beside the familiar materials",
      "عبر طريق قصير من العلامة الأرضية الأولى إلى وجهة النشاط القريبة بجانب الأدوات المألوفة",
    ],
    [
      "; two visible dry ground markers lead to the nearby activity destination beside the familiar materials inside ",
      "؛ تقود علامتان واضحتان على أرض جافة إلى وجهة النشاط القريبة بجانب الأدوات المألوفة داخل ",
    ],
    [
      "The mini-mission starts at the first ground marker; both ground markers and the nearby activity destination beside the familiar materials are visible.",
      "تبدأ المهمة الصغيرة عند العلامة الأولى؛ وتظهر العلامتان ووجهة النشاط القريبة بجانب الأدوات المألوفة.",
    ],
    [
      "At the first marker, the mini-mission pauses at this actual activity obstacle: ",
      "عند العلامة الأولى، تتوقف المهمة الصغيرة بسبب عائق النشاط الفعلي: ",
    ],
    [
      "At the next ground marker, the clue comes from the activity itself: ",
      "عند العلامة الأرضية التالية، يأتي الدليل من النشاط نفسه: ",
    ],
    [
      ". The child uses this clue to continue toward the nearby activity destination beside the familiar materials.",
      ". يستخدم الطفل هذا الدليل لمواصلة الطريق إلى وجهة النشاط القريبة بجانب الأدوات المألوفة.",
    ],
    [
      "They reach the nearby activity destination beside the familiar materials along the two visible markers, using the agreed operation.",
      "يصلان إلى وجهة النشاط القريبة بجانب الأدوات المألوفة عبر العلامتين بتنفيذ العملية المتفق عليها.",
    ],
    [
      "; complete this supported activity at the nearby activity destination beside the familiar materials, then return along the same two dry ground markers with empty hands while the adult keeps the materials in place",
      "؛ إكمال النشاط المدعوم عند وجهته القريبة، ثم العودة عبر العلامتين نفسيهما على أرض جافة بأيد فارغة بينما يبقي الكبير الأدوات في مكانها",
    ],
    [
      "; complete the familiar activity gently before resting",
      "؛ إكمال النشاط المألوف بلطف قبل الراحة",
    ],
    [
      ". The familiar materials rest nearby as the room becomes quiet.",
      ". تستقر الأدوات المألوفة بالقرب ويهدأ المكان.",
    ],
    [
      ". The child stays in the familiar place, moves slowly and uses a quiet voice.",
      ". يبقى الطفل في المكان المألوف ويتحرك ببطء ويستخدم صوتًا منخفضًا.",
    ],
    [
      "; the child rests in quiet familiar comfort",
      "؛ يستريح الطفل في مكان هادئ ومألوف ومطمئن",
    ],
    [
      "; the activity stays gentle and unhurried",
      "؛ يبقى النشاط لطيفًا دون استعجال",
    ],
    ["; quiet rest follows", "؛ تتبع ذلك راحة هادئة"],
    ["; comfort remains available", "؛ تبقى الطمأنينة متاحة"],
    ["a quiet familiar room", "غرفة هادئة ومألوفة"],
    ["a supervised familiar garden", "حديقة مألوفة بإشراف كبير"],
    ["a familiar play corner", "ركن لعب مألوف"],
    ["A familiar Egyptian neighborhood playground", "ملعب مألوف في حي مصري"],
    [
      "along a short route from the first ground marker to the nearby basket destination",
      "عبر طريق قصير من العلامة الأرضية الأولى إلى السلة القريبة",
    ],
    [
      "; two visible dry ground markers lead to the nearby basket destination inside ",
      "؛ تقود علامتان واضحتان على أرض جافة إلى السلة القريبة داخل ",
    ],
    [
      "; familiar adult support remains nearby",
      "؛ يبقى كبير مألوف قريبًا للمساعدة",
    ],
    [
      "The mini-mission starts at the first ground marker; both ground markers and the nearby basket destination are visible.",
      "تبدأ المهمة الصغيرة عند العلامة الأولى؛ وتظهر العلامتان والسلة القريبة.",
    ],
    [
      "At the first marker, a folded play mat corner stops the rolling toy; the route waits while the game pauses.",
      "عند العلامة الأولى، يوقف ركن الحصيرة المطوي اللعبة المتدحرجة؛ ويتوقف الطريق واللعب.",
    ],
    [
      "At the next ground marker, they flatten the mat corner together and point toward the nearby basket.",
      "عند العلامة الأرضية التالية يفردان ركن الحصيرة معًا ويشيران إلى السلة القريبة.",
    ],
    [
      "They reach the nearby basket destination along the two visible markers, using the agreed operation.",
      "يصلان إلى السلة القريبة عبر العلامتين بتنفيذ العملية المتفق عليها.",
    ],
    [
      "They return along the same short ground route and rest beside the first ground marker.",
      "يعودان عبر الطريق الأرضي القصير نفسه ويستريحان بجانب العلامة الأولى.",
    ],
    [
      "; follow the two ground markers to the nearby basket destination and return by the same short route",
      "؛ اتباع العلامتين الأرضيتين إلى السلة القريبة والعودة عبر الطريق القصير نفسه",
    ],
    [
      "; a folded play mat corner interrupts the short route",
      "؛ يعطل ركن حصيرة مطوي الطريق القصير",
    ],
    ["; try the first short route", "؛ تجربة بداية الطريق القصير"],
    ["; follow the visible ground route", "؛ اتباع الطريق الأرضي الواضح"],
    [
      "the nearby activity destination beside the familiar materials",
      "وجهة النشاط القريبة بجانب الأدوات المألوفة",
    ],
    ["the first ground marker", "العلامة الأرضية الأولى"],
  ];
  for (const [en, ar] of grammar.sort((x, y) => y[0].length - x[0].length))
    s = s.replaceAll(en, ar);
  return /[A-Za-z]/.test(s) ? undefined : s;
}

export const msaTitles: Record<string, string> = {
  "The rolling route for two": "رحلة اللعبة لصديقين",
  "A rolling game for two": "لعبة الدحرجة لصديقين",
  "The turn marker": "علامة الدور",
  "A quiet turn with the soft toy": "دور هادئ مع اللعبة الناعمة",
  "The bridge built together": "الجسر الذي بنيناه معًا",
  "The drawing made whole": "الرسمة المكتملة",
  "The tower and the quiet breath": "البرج والنفس الهادئ",
  "Three blocks, three places": "ثلاثة مكعبات وثلاثة أماكن",
  "The rolling test": "اختبار الدحرجة",
  "The color trays": "صواني الألوان",
  "The shape trays": "صواني الأشكال",
  "The cork and the pebble": "الفلينة والحصاة",
  "The hands and the waiting towel": "اليدان والمنشفة المنتظرة",
  "The brush beside the cup": "الفرشاة بجانب الكوب",
  "The book and the resting toy": "الكتاب واللعبة المستقرة",
  "The toy basket's ready place": "مكان سلة اللعب",
  "The toy finds its basket": "تجد اللعبة سلتها",
  "The toy's short route": "رحلة اللعبة القصيرة",
  "The soft shape returns": "يعود الشكل الناعم",
  "The soft toy's quiet place": "المكان الهادئ للعبة الناعمة",
};
