// Authored finite semantic projections for the planner's controlled episodes.
// Keys are exact operation/state text, not broad genre/objective summaries.
export function arabicClauses(
  a: string,
  b: string,
  setting: string,
): Record<string, string> {
  return {
    [`${a} tries the agreed role once while ${b} points to the turn cue`]: `${a} يجرب الدور المتفق عليه مرة و${b} يشاور لعلامة الدور`,
    [`${b} points to the next player's place and ${a} yields the cue before the full round`]: `${b} يشاور لمكان اللاعب التالي و${a} يسلم علامة الدور قبل الجولة الكاملة`,
    "The partial result is available before completing the whole operation":
      "نتيجة الجزء المجرب ظاهرة قبل إكمال العملية كلها",
    "name the concrete trial result before completing the operation":
      "تسمية نتيجة التجربة الملموسة قبل إكمال العملية",
    "The complete operation now follows the observed partial result":
      "العملية الكاملة دلوقتي تتبع نتيجة الجزء المجرب",
    "Guide a toy along a short marked route and bring it back to its basket":
      "توجيه لعبة على طريق قصير معلم ورجوعها لسلتها",
    "A toy rests beside two familiar route markers and its basket":
      "لعبة جنب علامتي طريق مألوفتين وسلتها",
    [`A toy rests beside two familiar route markers and its basket at ${setting}`]: `لعبة جنب علامتي طريق مألوفتين وسلتها في ${setting}`,
    "The toy stops at a folded corner before reaching the second marker":
      "اللعبة تقف عند ركن مطوي قبل العلامة التانية",
    "The child rolls the toy past the first mark; it stops at the folded corner":
      "الطفل يدحرج اللعبة بعد أول علامة؛ تقف عند الركن المطوي",
    "The child asks a familiar helper to hold the mat while the corner is flattened":
      "الطفل يطلب من مساعد مألوف تثبيت الحصيرة أثناء فرد الركن",
    "The flattened corner opens the second part of the marked route":
      "فرد الركن يفتح الجزء التاني من الطريق المعلم",
    "Flatten the corner, roll the toy past the second marker, turn it around and bring it back along the same marks to its basket":
      "فرد الركن ودحرجة اللعبة بعد العلامة التانية وتدويرها والعودة بها على نفس العلامات للسلة",
    "The toy has reached the second mark and returned to the waiting basket":
      "اللعبة وصلت للعلامة التانية ورجعت للسلة المستنية",
    "The child parks the toy and leaves both route markers beside the basket":
      "الطفل يوقف اللعبة ويسيب علامتي الطريق جنب السلة",
    "The parked toy and two marks stay together":
      "اللعبة المتوقفة والعلامتان مع بعض",
    "notice the two route markers": "ملاحظة علامتي الطريق",
    "The basket is also the return point": "السلة هي كمان نقطة الرجوع",
    "A short familiar route is visible": "طريق قصير مألوف ظاهر",
    "follow the first marked route": "اتباع أول جزء معلم من الطريق",
    "A folded corner interrupts the route": "ركن مطوي يعطل الطريق",
    "The destination is not reached yet": "الوجهة لسه ماوصلناهاش",
    "ask for a specific support at the blocked corner":
      "طلب مساعدة محددة عند الركن اللي عطل الطريق",
    "Both marks are linked by a flat path": "العلامتان متصلتان بطريق مستوي",
    "The toy can continue and return safely": "اللعبة تقدر تكمل وترجع بأمان",
    "follow the known outward and return marks":
      "اتباع العلامات المعروفة للذهاب والرجوع",
    "The same marks work in both directions": "نفس العلامات تنفع في الاتجاهين",
    "The complete short route is demonstrated":
      "الطريق القصير الكامل ظاهر بالفعل",
    "store the route materials": "ترتيب أدوات الطريق",
    "The same route can be played again": "نفس الطريق ينفع يتلعب تاني",
    "The familiar return closes the activity": "الرجوع المألوف يقفل النشاط",
    "Notice a familiar soft shape, its sound and its gentle return":
      "ملاحظة شكل ناعم مألوف وصوته ورجوعه بلطف",
    "Reveal the same soft shape slowly, repeat its gentle sound and settle beside it":
      "إظهار نفس الشكل الناعم بهدوء وتكرار صوته اللطيف والراحة جنبه",
    "A soft shape rests partly beneath a familiar cloth":
      "شكل ناعم جزء منه تحت قماشة مألوفة",
    [`A familiar soft shape rests at ${setting}; shared attention follows its rounded edge`]: `شكل ناعم مألوف في ${setting}؛ الانتباه المشترك يتبع حافته المدورة`,
    "The rounded edge is visible": "الحافة المدورة ظاهرة",
    "look at the edge": "النظر للحافة",
    "A rounded edge is seen": "الحافة المدورة اتشافت",
    "Attention has a familiar focus": "الانتباه له نقطة مألوفة",
    "The cloth lifts slowly to show the whole soft shape":
      "القماشة ترتفع بهدوء وتظهر الشكل الناعم كامل",
    "The whole shape is visible": "الشكل كامل ظاهر",
    "lift a little cloth": "رفع جزء صغير من القماشة",
    "The whole shape joins the known edge": "الشكل الكامل يكمل الحافة المعروفة",
    "Recognition expands without a problem": "التعرف يزيد من غير مشكلة",
    "The same shape returns with one soft tapping sound":
      "نفس الشكل يرجع مع صوت نقرة ناعمة واحدة",
    "The familiar shape is linked to a soft sound":
      "الشكل المألوف مرتبط بصوت ناعم",
    "repeat with one sound": "التكرار مع صوت واحد",
    "A soft sound accompanies the known shape": "صوت ناعم مع الشكل المعروف",
    "The repetition adds one sensory detail": "التكرار يضيف تفصيل حسي واحد",
    "The cloth rests beside the shape and the familiar sound quiets":
      "القماشة جنب الشكل والصوت المألوف يهدى",
    "The shape and cloth rest together": "الشكل والقماشة يستريحان معًا",
    "slow and settle": "الإبطاء والراحة",
    "The sound becomes quiet": "الصوت يبقى هادي",
    "Shared attention closes calmly": "الانتباه المشترك يقفل بهدوء",
    "Observe which of two familiar objects stays at the surface of a shallow supervised bowl":
      "ملاحظة أي من شيئين مألوفين يبقى على سطح وعاء ضحل بإشراف كبير",
    "A cork, a pebble and a shallow bowl wait beside a familiar adult":
      "فلينة وحصوة ووعاء ضحل جنب كبير مألوف",
    [`A cork, a pebble and a shallow bowl wait beside a familiar adult at ${setting}`]: `فلينة وحصوة ووعاء ضحل جنب كبير مألوف في ${setting}`,
    [`${a} guesses that the heavier-looking cork must sink without testing it`]: `${a} يتوقع إن الفلينة اللي شكلها أتقل لازم تغرق من غير تجربة`,
    "With the adult nearby, the child lowers the cork and watches it stay at the surface":
      "والكبير قريب، الطفل ينزل الفلينة ويراقبها وهي على السطح",
    "With adult supervision, lower the pebble, compare its resting place with the cork and repeat each observation without splashing":
      "بإشراف الكبير، تنزيل الحصوة ومقارنة مكانها بالفلينة وتكرار الملاحظة من غير رش مياه",
    "The adult removes both objects and the child dries the tray":
      "الكبير يخرج الشيئين والطفل ينشف الصينية",
    "Follow a supported wash-and-dry sequence at a familiar basin":
      "اتباع ترتيب الغسل والتنشيف بالمساعدة عند حوض مألوف",
    "Soap and a towel wait beside a familiar basin and adult":
      "صابون وفوطة جنب حوض وكبير مألوفين",
    [`Soap and a towel wait beside a familiar basin and adult at ${setting}`]: `صابون وفوطة جنب حوض وكبير مألوفين في ${setting}`,
    [`${a} reaches straight for the towel before washing`]: `${a} يمد إيده للفوطة مباشرة قبل الغسل`,
    "The adult points to the soap and the child puts the towel back beside the basin":
      "الكبير يشاور للصابون والطفل يرجع الفوطة جنب الحوض",
    "With adult support, use the soap, rinse at the basin and then dry with the waiting towel":
      "بمساعدة الكبير، استخدام الصابون والشطف عند الحوض ثم التنشيف بالفوطة المستنية",
    "The child returns the towel to its familiar hook":
      "الطفل يرجع الفوطة للخطاف المألوف",
    "A different supported strategy is available":
      "طريقة مختلفة ومدعومة بقت متاحة",
    "The relevant difference is now observed":
      "الفرق المناسب بقى واضح بالملاحظة",
    "perform the changed sequence and check": "تنفيذ الترتيب الجديد وفحصه",
    "The visible result confirms the concrete operation":
      "النتيجة المرئية تؤكد العملية الملموسة",
    [`${a} lays two turn counters beside the ball, one for each child, and points to the waiting empty place`]: `${a} يحط علامتي دور جنب الكرة، واحدة لكل طفل، ويشاور للمكان الفاضي المستني`,
    [`${b} points to the empty counter while ${a}'s counter has the ball; they compare who has had a complete turn`]: `${b} يشاور لعلامة الدور الفاضية والكرة عند علامة ${a}؛ يقارنوا مين خد دور كامل`,
    [`After each complete pass, ${a} and ${b} move the ball to the next counter; they check that both counters have marked a turn`]: `بعد كل تسليم كامل، ${a} و${b} ينقلوا الكرة لعلامة الدور التالية ويفحصوا إن كل علامة سجلت دور`,
    [`${a} points to the ready materials and predicts the result before trying`]: `${a} يشاور للأدوات الجاهزة ويتوقع النتيجة قبل التجربة`,
    [`${a} compares the first visible result with the earlier prediction and points to the difference`]: `${a} يقارن النتيجة الأولى بالتوقع ويشاور للفرق`,
    [`${a} repeats the changed operation and points out the visible result that confirms it`]: `${a} يكرر العملية اللي اتغيرت ويشاور للنتيجة الواضحة اللي تؤكدها`,
    [`${a} sets the activity materials in their familiar starting places before beginning the daily sequence`]: `${a} يحط أدوات النشاط في أماكن البداية المألوفة قبل الترتيب اليومي`,
    [`${a} pauses at the familiar basket and ${b} points to the waiting play space; the next turn comes before putting the toy away`]: `${a} يقف عند السلة المألوفة و${b} يشاور لمكان اللعب المستني؛ الدور الجاي قبل ترتيب اللعبة`,
    [`${a} points to the familiar next step and brings the waiting materials within reach`]: `${a} يشاور للخطوة الجاية المألوفة ويقرّب أدواتها`,
    [`${a} finishes the shared play sequence, then returns the materials to their known basket with ${b}`]: `${a} يكمل اللعب المشترك، وبعدين يرجع الأدوات للسلة المعروفة مع ${b}`,
    [`${a} finishes the supported sequence and returns the materials to their known places`]: `${a} يكمل الترتيب بالمساعدة ويرجع الأدوات لأماكنها المعروفة`,
    [`${a}'s fingers tighten around the toy while ${b}'s shoulders droop; their faces show the feeling`]: `صوابع ${a} تمسك اللعبة بشدة وكتفا ${b} ينزلان؛ وشوشهم تظهر الشعور`,
    [`${a}'s hands tighten and shoulders rise before the supported activity; the face shows the feeling`]: `إيدا ${a} يشدّوا وكتفاه يرتفعان قبل النشاط المدعوم؛ الوجه يظهر الشعور`,
    [`${a} pauses, names feeling cross briefly, and loosens the hands before trying the supported response`]: `${a} يقف ويسمي الزعل باختصار ويريح إيديه قبل تجربة الاستجابة المدعومة`,
    [`${a}'s hands relax and ${b}'s shoulders lift after the shared action; they name the calmer feeling together`]: `إيدا ${a} يرتاحان وكتفا ${b} يرتفعان بعد الفعل المشترك؛ يسموا الشعور الأهدى مع بعض`,
    [`${a}'s hands relax after the supported action; a gentle breath shows the calmer feeling`]: `إيدا ${a} يرتاحان بعد الفعل المدعوم؛ نَفَس هادي يبين الشعور الأهدى`,
    [`${a} notices ${b}'s empty hands after the first choice`]: `${a} يلاحظ إيدين ${b} الفاضية بعد الاختيار الأول`,
    [`${a} notices what the first choice has left unfinished`]: `${a} يلاحظ اللي الاختيار الأول سابه من غير إكمال`,
    [`${a} chooses to make space for ${b}'s idea, placing the toy where both can reach it`]: `${a} يختار يسيب مساحة لفكرة ${b} ويحط اللعبة في مكان الاتنين يوصلوا له`,
    [`${a} chooses to try the supported step with care and leaves the materials ready`]: `${a} يختار يجرب الخطوة المدعومة بعناية ويسيب الأدوات جاهزة`,
    [`${b} smiles and invites ${a} into the next round after the fair, caring choice`]: `${b} يبتسم ويدعو ${a} للجولة الجاية بعد الاختيار العادل والمراعي`,
    [`${a} checks the useful result of the caring choice and sets the materials gently in place`]: `${a} يفحص نتيجة الاختيار المراعي ويحط الأدوات بلطف في مكانها`,
    [`${a} notices the consequence: the waiting partner cannot play while one child holds the toy`]: `${a} يلاحظ النتيجة: الصاحب المستني مش قادر يلعب واللعبة مع طفل واحد`,
    [`${a} notices the visible consequence of the first incomplete action`]: `${a} يلاحظ النتيجة الواضحة للفعل الأول اللي ماكملش`,
    [`${a} changes the choice by yielding the visible turn cue to ${b}`]: `${a} يغير الاختيار بتسليم علامة الدور الواضحة لـ${b}`,
    [`${a} changes the choice by following the visible cue before completing the action`]: `${a} يغير الاختيار باتباع العلامة الواضحة قبل إكمال الفعل`,
    [`The changed action lets ${b} complete a turn and keeps the shared game moving; ${a} sees the useful consequence`]: `الفعل الجديد يدي ${b} دور كامل ويخلي اللعبة المشتركة تكمل؛ ${a} يشوف النتيجة المفيدة`,
    [`${a} checks the useful visible consequence of the changed action against the original task`]: `${a} يفحص النتيجة المفيدة الواضحة للفعل الجديد بالمقارنة بالمهمة الأصلية`,
    "Give each child a gentle turn with the soft toy before settling beside the familiar book":
      "كل طفل ياخد دور هادي مع اللعبة الناعمة قبل الراحة جنب الكتاب المألوف",
    [`${b} waits for a quiet turn with the soft toy`]: `${b} مستني دور هادي مع اللعبة الناعمة`,
    [`${a} gently passes the soft toy to ${b}; each has a quiet turn, then they place it in its basket and close the book together`]: `${a} يسلم اللعبة الناعمة بهدوء لـ${b}؛ كل واحد ياخد دور هادي، وبعدها يحطوها في سلتها ويقفلوا الكتاب مع بعض`,
    [`${a} holds the soft toy beside the familiar book while ${b} waits for a quiet turn`]: `${a} ماسك اللعبة الناعمة جنب الكتاب المألوف و${b} مستني دور هادي`,
    [`${a} notices ${b}'s waiting hands and loosens the grip on the soft toy; both stay beside the familiar book`]: `${a} يلاحظ إيدين ${b} المستنية ويفك مسكته للعبة الناعمة؛ الاتنين جنب الكتاب المألوف`,
    [`${b} points to the cushion beside the book; ${a} places the soft toy there so the waiting hands can take a quiet turn`]: `${b} يشاور للمخدة جنب الكتاب؛ ${a} يحط اللعبة الناعمة هناك عشان الصاحب ياخد دور هادي`,
    "The closed book and soft toy rest beside the children in the quiet familiar place":
      "الكتاب المقفول واللعبة الناعمة جنب الطفلين في المكان الهادي المألوف",
    "rest in familiar comfort": "الراحة في مكان مألوف ومطمئن",
    "pass gently, give both a quiet turn and settle":
      "التسليم بهدوء وإعطاء دور لكل طفل ثم الراحة",
    "notice waiting hands and offer a quiet turn":
      "ملاحظة الإيدين المستنية وإتاحة دور هادي",
    "Both children have room in the quiet shared routine":
      "كل طفل له مكان في الروتين الهادي المشترك",
    "Build a stable block bridge so both toy cars can cross":
      "بناء كوبري مكعبات ثابت عشان عربيتَي اللعبة يعدّوا",
    "A narrow block bridge wobbles when one child builds alone":
      "كوبري مكعبات ضيق بيهتز لما طفل واحد يبني لوحده",
    "Blocks and two toy cars lie beside a marked gap":
      "مكعبات وعربيتان للعب جنب فجوة معلمة",
    [`Blocks and two toy cars lie beside a marked gap at ${setting}`]: `مكعبات وعربيتان للعب جنب فجوة معلمة في ${setting}`,
    [`${a} piles blocks onto a narrow base; the bridge leans before a car can cross`]: `${a} يحط مكعبات على قاعدة ضيقة؛ الكوبري يميل قبل العربية ما تعدّي`,
    "The children compare the narrow base with a wide one and choose different jobs":
      "الطفلان يقارنان القاعدة الضيقة بقاعدة عريضة ويختاران مهمتين مختلفتين",
    [`${a} holds the base steady while ${b} adds a wide support; they swap builder and tester roles and roll both cars across`]: `${a} يثبت القاعدة و${b} يضيف دعامة عريضة؛ يبدلوا دور البناء والتجربة ويدحرجوا العربيتين فوق الكوبري`,
    [`${a} asks ${b} to hold the base, adds one wider support and then returns the help while ${b} tests the second car`]: `${a} يطلب من ${b} تثبيت القاعدة ويضيف دعامة أعرض؛ وبعدها يساعد ${b} في تجربة العربية التانية`,
    "A wide base and clear jobs are chosen":
      "قاعدة عريضة ومهمتان واضحتان تم اختيارهم",
    "Both cars cross the steady bridge without tipping it":
      "العربيتان يعدّوا فوق الكوبري الثابت من غير ما يميل",
    "The children park both cars and keep the wide bridge ready for another crossing":
      "الطفلان يوقفان العربيتين ويتركان الكوبري العريض جاهزًا لعبور جديد",
    "The completed bridge waits beside two parked cars":
      "الكوبري الكامل جنب العربيتين المتوقفتين",
    "notice the shared task": "ملاحظة المهمة المشتركة",
    "The task needs both children's attention": "المهمة محتاجة انتباه الطفلين",
    "Materials and participants are ready": "الأدوات والطفلان جاهزين",
    "act alone without checking the partner or base":
      "المحاولة لوحده من غير سؤال الصاحب أو فحص القاعدة",
    "The first strategy overlooks a needed support":
      "المحاولة الأولى نسيت دعامة مطلوبة",
    "The task pauses instead of finishing": "المهمة تقف بدل ما تخلص",
    "The children need complementary roles":
      "الطفلان محتاجان دورين يكملان بعضهما",
    "listen and change the unsupported strategy":
      "الاستماع وتغيير الطريقة اللي من غير دعم",
    "The missing support is now explicit": "الدعم الناقص بقى واضح",
    "A practical repair can begin": "الإصلاح العملي ممكن يبدأ",
    "Both children contribute to the decision": "الطفلان يشاركان في القرار",
    "perform complementary roles and check the result":
      "تنفيذ مهمتين متكاملتين وفحص النتيجة",
    "The repair or support holds when tested":
      "الإصلاح أو الدعامة يثبت في التجربة",
    "The shared task succeeds visibly": "المهمة المشتركة تنجح بشكل واضح",
    "Both children's contributions are respected": "مساهمة كل طفل لها تقدير",
    "continue with equal contributions": "الاستمرار بمساهمة متساوية",
    "The successful solution remains available": "الحل الناجح لسه متاح",
    "The relationship and task close together": "المهمة والعلاقة يقفلان معًا",
    "Both children remain included": "الطفلان مستمران في المشاركة",
    "Pause beside a fallen block tower, settle the body and rebuild a lower steady tower":
      "وقفة جنب برج المكعبات اللي وقع، وتهدئة الجسم وإعادة بناء برج أقل وثابت",
    "A block tower falls and the child wants to rush the next block":
      "برج المكعبات يقع والطفل عايز يستعجل المكعب اللي بعده",
    "A small block tower stands beside a wide mat":
      "برج مكعبات صغير جنب حصيرة عريضة",
    [`${a} watches a small block tower at ${setting}`]: `${a} يراقب برج مكعبات صغير في ${setting}`,
    [`${a} reaches for another block as the tower falls; hurried hands knock the base aside`]: `${a} يمد إيده لمكعب جديد والبرج يقع؛ الإيدين المستعجلة تزق القاعدة`,
    [`${a} names the upset, puts both feet on the floor and asks for a quiet pause`]: `${a} يسمي الزعل ويحط رجليه على الأرض ويطلب وقفة هادية`,
    [`${a} puts both feet on the floor, breathes slowly, asks for a quiet pause and rebuilds with a wide base`]: `${a} يحط رجليه على الأرض ويتنفس بهدوء ويطلب وقفة، وبعدها يبني بقاعدة عريضة`,
    [`${a} leaves a space beside the tower and rests the remaining blocks on the mat`]: `${a} يسيب مساحة جنب البرج ويحط باقي المكعبات على الحصيرة`,
    "notice the tower": "ملاحظة البرج",
    "The narrow base is visible": "القاعدة الضيقة واضحة",
    "The child cares about the tower": "البرج مهم للطفل",
    "rush to replace the lost tower": "الاستعجال لإعادة البرج اللي وقع",
    "Hurried hands move the loose base":
      "الإيدين المستعجلة تحرك القاعدة المفكوكة",
    "The upset grows when rebuilding is rushed":
      "الزعل يزيد لما البناء يحصل باستعجال",
    "name the feeling and pause": "تسمية الشعور والوقفة",
    "A pause is available before another try":
      "ممكن ياخد وقفة قبل المحاولة الجديدة",
    "The body begins to settle": "الجسم يبدأ يهدى",
    "breathe then rebuild on a wide base": "التنفس ثم البناء على قاعدة عريضة",
    "A lower wide base stays steady": "القاعدة العريضة والبرج الأقل يثبتان",
    "Calm makes a careful next action possible":
      "الهدوء يساعد الفعل الجاي يكون بعناية",
    "stop after a manageable success": "الوقوف بعد نجاح صغير يمكن إدارته",
    "The tower need not grow taller now": "مش لازم البرج يطول دلوقتي",
    "The story ends with a settled body": "القصة تنتهي والجسم هادي",
    "Place three blocks in three marked spaces and check that each has been counted once":
      "وضع ثلاث مكعبات في ثلاث أماكن معلمة وفحص إن كل مكعب اتعد مرة واحدة",
    "Three blocks lie beside three marked spaces":
      "ثلاث مكعبات جنب ثلاث أماكن معلمة",
    [`Three blocks lie beside three marked spaces at ${setting}`]: `ثلاث مكعبات جنب ثلاث أماكن معلمة في ${setting}`,
    [`${a} counts a loose row, shifts one block and counts that block again`]: `${a} يعد صف مكعبات ويحرك مكعب، وبعدين يعده مرة تانية`,
    "The child draws one space for each block and moves only uncounted blocks":
      "الطفل يرسم مكان لكل مكعب وينقل بس المكعبات اللي لسه ماعدهاش",
    "Move each block into one marked space while saying one number, then point to each occupied space once":
      "نقل كل مكعب لمكان معلم مع قول رقم واحد، وبعدها الإشارة لكل مكان مليان مرة واحدة",
    "The child points to the three occupied spaces, then stores the blocks":
      "الطفل يشاور للأماكن الثلاثة المليانة وبعدين يرتب المكعبات",
    "look at the available objects": "النظر للأشياء الجاهزة",
    "The objects differ in position or shape":
      "الأشياء مختلفة في المكان أو الشكل",
    "There is something visible to check": "فيه حاجة واضحة ممكن نفحصها",
    "make one unsupported prediction": "عمل تخمين واحد قبل الفحص",
    "The first result differs from the guess":
      "النتيجة الأولى مختلفة عن التخمين",
    "The child has a concrete question": "الطفل عنده سؤال ملموس",
    "change one condition and compare": "تغيير شرط واحد والمقارنة",
    "One-to-one spaces or toy shape explains the difference":
      "مكان لكل مكعب أو شكل اللعبة يفسر الفرق",
    "The child can now check a rule": "الطفل يقدر يفحص القاعدة دلوقتي",
    "repeat a controlled check": "تكرار تجربة بنفس شروط المقارنة",
    "The observed result is consistent": "النتيجة المرئية ثابتة في التجربتين",
    "The learning is demonstrated rather than announced":
      "التعلم ظاهر في الفعل مش في محاضرة",
    "use the checked result in a familiar next action":
      "استخدام النتيجة المجربة في فعل مألوف بعده",
    "The checked result remains available": "النتيجة المجربة لسه متاحة",
    "The discovery closes with the same concrete objects":
      "الاكتشاف يقفل بنفس الأشياء الملموسة",
    "Match familiar blocks to picture trays by color":
      "مطابقة المكعبات المألوفة مع صواني الصور حسب اللون",
    "Different blocks rest beside two trays labelled with color pictures":
      "مكعبات مختلفة جنب صينيتين عليهم صور ألوان",
    [`Different blocks rest beside two trays labelled with color pictures at ${setting}`]: `مكعبات مختلفة جنب صينيتين عليهم صور ألوان في ${setting}`,
    [`${a} places every block in the nearest tray without comparing the color pictures`]: `${a} يحط كل المكعبات في أقرب صينية من غير ما يقارن صور الألوان`,
    "Different blocks are mixed in one tray and the second tray is empty":
      "مكعبات مختلفة مختلطة في صينية والتانية فاضية",
    [`${a} holds one block beside each picture and notices which color matches`]: `${a} يحط مكعب جنب كل صورة ويلاحظ أنهي لون مطابق`,
    "One block matches a picture while another belongs in the second tray":
      "مكعب يطابق صورة ومكعب تاني مكانه الصينية التانية",
    "Compare each block's color with the picture, place it in the matching tray and check one new block against the same pictures":
      "مقارنة لون كل مكعب بالصورة ووضعه في الصينية المطابقة وتجربة مكعب جديد مع نفس الصور",
    "Both trays hold blocks matching their color pictures, including the newly checked block":
      "الصينيتان فيهما مكعبات مطابقة لصور ألوانهما، ومنها المكعب الجديد المجرب",
    "The child leaves the picture labels beside the sorted trays for the next game":
      "الطفل يسيب صور الألوان جنب الصواني المرتبة للعبة الجاية",
    "The sorted blocks and visible labels stay ready together":
      "المكعبات المرتبة والصور الواضحة جاهزين مع بعض",
    "notice the concrete materials": "ملاحظة الأدوات الملموسة",
    "The materials have distinct visible places": "لكل أداة مكان واضح مختلف",
    "A familiar sequence or test is ready": "ترتيب مألوف أو تجربة جاهزة",
    "try before checking the visible cue": "المحاولة قبل فحص العلامة المرئية",
    "The skipped or untested step becomes visible":
      "الخطوة اللي اتنسيت أو ماتجربتش تبقى واضحة",
    "The first strategy does not finish the sequence":
      "الطريقة الأولى ماتكملش الترتيب",
    "compare with a visible cue": "المقارنة بعلامة مرئية",
    "The relevant cue changes the next action":
      "العلامة المناسبة تغير الفعل الجاي",
    "The concrete operation can now begin": "العملية الملموسة ممكن تبدأ دلوقتي",
    "perform and check the concrete operation": "تنفيذ العملية الملموسة وفحصها",
    "The checked result confirms the concrete operation":
      "النتيجة المفحوصة تؤكد العملية الملموسة",
    "The requested practical learning or routine is demonstrated":
      "التعلم العملي أو الروتين المطلوب ظاهر بالفعل",
    "put materials in their known places": "وضع الأدوات في أماكنها المعروفة",
    "The familiar result remains available": "النتيجة المألوفة لسه متاحة",
    "The activity closes without a new conflict":
      "النشاط يقفل من غير خلاف جديد",
    "Put the familiar book and soft toy in their resting places":
      "وضع الكتاب المألوف واللعبة الناعمة في أماكن الراحة",
    "A familiar book lies open beside a soft toy":
      "كتاب مألوف مفتوح جنب لعبة ناعمة",
    [`A familiar book lies open beside a soft toy at ${setting}`]: `كتاب مألوف مفتوح جنب لعبة ناعمة في ${setting}`,
    [`${a} opens another page while the toy is waiting for its basket`]: `${a} يفتح صفحة كمان واللعبة مستنية سلتها`,
    "The book remains open and the toy has not reached its resting place":
      "الكتاب لسه مفتوح واللعبة ماوصلتش مكان الراحة",
    [`${a} notices the toy's basket and the last familiar picture`]: `${a} يلاحظ سلة اللعبة وآخر صورة مألوفة`,
    "The last picture and waiting basket show the next calm steps":
      "آخر صورة والسلة المستنية يوضحوا الخطوات الهادية اللي بعدها",
    "Carry the toy gently to its basket, close the book after the familiar picture and settle beside both resting places":
      "حمل اللعبة بلطف لسلتها وإغلاق الكتاب بعد الصورة المألوفة والراحة جنب مكانَي الراحة",
    "The book is closed and the soft toy rests beside a settled child":
      "الكتاب مقفول واللعبة الناعمة جنب طفل هادي",
    "The child rests while the familiar materials stay nearby":
      "الطفل يستريح والأدوات المألوفة قريبة",
    "The closed book and resting toy remain in a quiet familiar space":
      "الكتاب المقفول واللعبة المستريحة في مكان مألوف هادي",
    "Finish a small familiar activity and put its materials away":
      "إكمال نشاط مألوف صغير وترتيب أدواته",
    "A rolling toy cannot reach the waiting basket":
      "اللعبة المتدحرجة مش قادرة توصل للسلة المستنية",
    "Place a flat cardboard ramp, roll the toy along it and catch it in the basket":
      "وضع منحدر كرتون مستوي ودحرجة اللعبة عليه واستقبالها في السلة",
    "A toy and a basket are ready in the familiar play corner":
      "لعبة وسلة جاهزين في ركن اللعب المألوف",
    [`${a} sees a toy and a basket at ${setting}`]: `${a} يشوف لعبة وسلة في ${setting}`,
    [`${a} rolls the toy directly toward the basket; it stops at the folded mat`]: `${a} يدحرج اللعبة للسلة مباشرة؛ تقف عند الحصيرة المطوية`,
    [`${a} compares the folded mat with a flat cardboard strip and lays the strip across the fold`]: `${a} يقارن الحصيرة المطوية بشريط كرتون مستوي ويحط الشريط فوق الطية`,
    [`${a} stores the strip beside the basket and leaves the toy resting inside`]: `${a} يرتب الشريط جنب السلة ويسيب اللعبة جواها`,
    "notice two familiar materials": "ملاحظة أداتين مألوفتين",
    "The basket is a visible destination": "السلة وجهة واضحة",
    "A small activity can begin": "نشاط صغير ممكن يبدأ",
    "roll without a smooth path": "الدحرجة من غير طريق مستوي",
    "The first route does not reach the basket": "الطريق الأول مايوصلش للسلة",
    "replace the interrupted path with a flat strip":
      "تغيير الطريق المقطوع بشريط مستوي",
    "A flat path bridges the fold": "الطريق المستوي يعدّي فوق الطية",
    "The toy has a continuous route": "اللعبة لها طريق متصل",
    "roll along the flat strip and catch":
      "الدحرجة على الشريط المستوي والاستقبال",
    "The cardboard path supports the complete roll":
      "طريق الكرتون يسمح بدحرجة كاملة",
    "The small activity finishes visibly": "النشاط الصغير يخلص بشكل واضح",
    "put away the successful materials": "ترتيب الأدوات اللي نجحت",
    "The path can be used again": "الطريق ممكن يتستخدم تاني",
    "A concrete activity closes without claiming unknown objective delivery":
      "نشاط ملموس يقفل من غير ادعاء وصول هدف غير مؤكد",
  };
}
