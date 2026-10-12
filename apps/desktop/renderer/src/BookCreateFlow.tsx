import { useEffect, useState } from "react";
import type {
  SimpleCreateInput,
  SimpleDefaults,
} from "@hekayti/contracts/creator";
import type { BookDefaults, BookIntent } from "@hekayti/contracts/book";
import { movePathStep, useStudioUi } from "./studio-ui";
import { infantCoveredProgression } from "@hekayti/core/book";

export function BookCreateFlow({
  simple,
  choices,
  busy,
  onChoices,
  onCreate,
}: {
  simple: SimpleDefaults;
  choices: BookDefaults | null;
  busy: boolean;
  onChoices: (
    ageMonths: number,
    category: string,
    goalPreset: string,
    mode: "ar-EG" | "ar-MSA-simple",
  ) => void;
  onCreate: (input: SimpleCreateInput, photoCharacter: boolean) => void;
}) {
  const { say, label, language } = useStudioUi();
  const [step, setStep] = useState(0);
  const [advanced, setAdvanced] = useState(false);
  const [age, setAge] = useState(42);
  const [agePreset, setAgePreset] = useState("THREE_FIVE");
  const [mode, setMode] = useState<"ar-EG" | "ar-MSA-simple">("ar-EG");
  const [category, setCategory] =
    useState<NonNullable<SimpleCreateInput["category"]>>("bedtime");
  const [goal, setGoal] =
    useState<NonNullable<SimpleCreateInput["goalPreset"]>>("SLEEP");
  const [customGoal, setCustomGoal] = useState("");
  const [idea, setIdea] = useState<BookIntent["idea"]>({
    source: "SUGGESTED",
    text: "",
  });
  const [path, setPath] = useState<BookIntent["path"]>({
    mode: "AUTO",
    steps: [],
  });
  const [length, setLength] = useState<BookIntent["length"]>("SHORT");
  const [characterMode, setCharacterMode] = useState("FICTIONAL");
  const [name, setName] = useState("");
  const [setting, setSetting] = useState("");
  const [ideaMode, setIdeaMode] = useState<"AUTO" | "CHOOSE" | "MANUAL">(
    "AUTO",
  );
  const [manualIdea, setManualIdea] = useState("");
  const [ideaOffset, setIdeaOffset] = useState(0);
  useEffect(() => { onChoices(age, category, goal, mode); }, []);
  useEffect(() => {
    if (ideaMode !== "AUTO" || !choices?.ideas.length) return;
    const candidates = choices.ideas.filter(item => item.category === category);
    const suitable = candidates.length ? candidates : choices.ideas;
    const chosen = suitable[ideaOffset % suitable.length]!;
    setIdea(
      chosen.libraryRef
        ? {
            source: "LIBRARY",
            text: chosen.description,
            libraryRef: chosen.libraryRef,
          }
        : { source: "SUGGESTED", text: chosen.description },
    );
  }, [choices, ideaMode, ideaOffset, category]);
  useEffect(() => {
    const goals = choices?.goalChoices;
    if (goals?.length && !goals.some((item) => item.key === goal)) {
      const next = goals[0]!.key as typeof goal;
      setGoal(next);
      onChoices(age, category, next, mode);
    }
  }, [choices, goal]);
  const headings = [
    say("العمر", "Age"),
    say("لغة القصة", "Story language"),
    say("نوع القصة", "Story type"),
    say("فكرة القصة", "Story idea"),
    say("هدف القصة", "Story goal"),
    say("مسار القصة", "Story path"),
    say("الشخصية", "Character"),
    say("مكان القصة", "Setting"),
  ];
  const ready =
    step !== 3 ||
    (!!idea.text.trim() && (idea.source !== "LIBRARY" || !!idea.libraryRef));
  const pathReady =
    path.mode !== "CUSTOM" ||
    (path.steps.length >= 2 && path.steps.every((x) => x.trim()));
  const next = () => {
    onChoices(age, category, goal, mode);
    setStep(Math.min(headings.length - 1, step + 1));
  };
  const create = () => onCreate({
    agePreset: agePreset as SimpleCreateInput["agePreset"], exactAgeMonths: age,
    primaryLanguageMode: mode, category, goalPreset: goal,
    ...(customGoal ? { customGoal } : {}), ...(name ? { fictionalName: name } : {}),
    ...(setting ? { setting } : {}), expectedLibrary: simple.library.recordVersion,
    provisionalAcknowledged: true, bookIntent: { idea, path, length },
  }, characterMode === "PHOTO");
  const quickValid = age >= 0 && age <= 95 && !!idea.text.trim() && pathReady && (goal !== "CUSTOM" || !!customGoal.trim()) && (characterMode === "FICTIONAL" || !!name.trim());
  const previewSteps = path.mode === "CUSTOM" ? path.steps : path.mode === "AUTO" && age < 12 && /قماش|غطاء|cloth|fabric/iu.test(idea.text) && /ناعم|لعب|مدور|toy|soft/iu.test(idea.text) ? infantCoveredProgression : choices?.paths.find(p => p.key === path.key)?.steps ?? choices?.paths[0]?.steps ?? [];
  return (
    <section className="studio-panel" data-testid="book-create-flow">
      <div className="studio-actions">
        <button disabled={busy} aria-pressed={!advanced} onClick={() => { setAdvanced(false); setStep(0); }}>{say("إنشاء سريع", "Quick creation")}</button>
        <button disabled={busy} aria-pressed={advanced} onClick={() => { setAdvanced(true); setStep(0); }}>{say("تخصيص متقدم", "Advanced customization")}</button>
      </div>
      <ol className="studio-steps">
        {(advanced ? headings : [say("عن الطفل والقصة", "Child and story"), say("راجع الفكرة", "Review idea")]).map((title, i) => (
          <li key={title} aria-current={step === i ? "step" : undefined}>
            {i + 1}. {title}
          </li>
        ))}
      </ol>
      <h2>{advanced ? headings[step] : step === 0 ? say("عن الطفل والقصة", "Child and story") : say("راجع الفكرة", "Review idea")}</h2>
      <fieldset disabled={busy}>
        {!advanced && step === 1 && <article data-testid="quick-idea-review">
          <h3>{say("فكرة القصة", "Story premise")}</h3><p dir="auto">{idea.text}</p>
          <p>{say("الشخصية: ", "Character: ")}{name || say("شخصية خيالية مناسبة للعمر", "Age-appropriate fictional character")}</p>
          <p>{say("المكان: ", "Setting: ")}{setting || say("مكان مألوف مناسب للفكرة؛ راجعه في مسار القصة", "A familiar setting appropriate to the idea; review it in the story path")}</p>
          <p>{say("نوع القصة: ", "Story mood: ")}{label(category)} · {say("اللغة: ", "Language: ")}{label(mode)}</p>
          <p>{say("الطول المختار: ", "Selected length: ")}{label(length)} · {say("المقترح للقصة القصيرة: ", "Short story suggestion: ")}{age < 12 ? 4 : age < 24 ? 6 : age < 36 ? 8 : 10} {say("صفحات؛ عدد الأحداث الفعلي يُراجع قبل الكتابة.", "pages; review actual events before writing.")}</p>
          <p>{say("مسار مبدئي للمراجعة؛ تجهيز القصة يربطه بتفاصيل فكرتك، ثم تراجع الأحداث قبل الكتابة.", "Suggested progression: preparation binds it to your idea; review actual events before writing.")}</p>
          <ol>{previewSteps.map((text,i)=><li key={i}>{text}</li>)}</ol>
          <p>{say("هذه مراجعة للفكرة وليست اعتمادًا للقصة أو الصور. تقدر تضيف الصور المرجعية لاحقًا في الشخصيات.", "This is concept review, not story or artwork approval. Add reference photos later in Characters.")}</p>
          <button onClick={() => { setStep(0); if (ideaMode === "AUTO") setIdeaOffset(ideaOffset + 1); }}>{say("غير الفكرة", "Change idea")}</button>
        </article>}
        {step === 0 && (
          <>
            <label>
              {say("فئة العمر", "Age band")}
              <select
                value={agePreset}
                onChange={(e) => {
                  setAgePreset(e.target.value);
                  const preset = simple.agePresets.find(
                    (p) => p.key === e.target.value,
                  );
                  if (preset) {
                    setAge(preset.ageMonths);
                    onChoices(preset.ageMonths, category, goal, mode);
                  }
                }}
              >
                {simple.agePresets.map((p) => (
                  <option key={p.key} value={p.key}>
                    {language === "en" ? p.label.en : p.label["ar-EG"]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {say("العمر بالشهور", "Exact age in months")}
              <input
                aria-label={say("العمر بالشهور", "Exact age in months")}
                type="number"
                min={0}
                max={95}
                value={age}
                onChange={(e) => {
                  const months = Number(e.target.value);
                  setAge(months);
                  onChoices(months, category, goal, mode);
                }}
              />
            </label>
            {age <= 12 && (
              <p>
                {say(
                  "للرضّع: لحظات حسية هادئة، وفعل بسيط في كل صفحة، ونهاية مطمئنة.",
                  "For babies: quiet sensory moments, one simple action per page and a reassuring ending.",
                )}
              </p>
            )}
          </>
        )}
        {advanced && step === 1 && (
          <label>
            {headings[1]}
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
            >
              <option value="ar-EG">{label("ar-EG")}</option>
              <option value="ar-MSA-simple">{label("ar-MSA-simple")}</option>
            </select>
          </label>
        )}
        {(advanced ? step === 2 : step === 0) && (
          <div className="studio-choice-grid">
            {(
              [
                "adventure",
                "bedtime",
                "educational",
                "behavioral",
                "emotional-learning",
                "everyday-life",
                "values",
              ] as const
            ).filter(type => advanced || age >= 24 || type !== "adventure").map((type) => (
              <button
                key={type}
                aria-pressed={category === type}
                onClick={() => {
                  setCategory(type);
                  onChoices(age, type, goal, mode);
                }}
              >
                {label(type)}
              </button>
            ))}
          </div>
        )}
        {(advanced ? step === 3 : step === 0) && (
          <>
            <div className="studio-actions">
              <button
                aria-pressed={ideaMode === "AUTO"}
                onClick={() => setIdeaMode("AUTO")}
              >
                {say("اقترحلي فكرة", "Suggest an idea")}
              </button>
              <button
                aria-pressed={ideaMode === "CHOOSE"}
                onClick={() => setIdeaMode("CHOOSE")}
              >
                {say("اختار من الأفكار", "Choose an idea")}
              </button>
              <button
                aria-pressed={ideaMode === "MANUAL"}
                onClick={() => {
                  setIdeaMode("MANUAL");
                  setIdea({ source: "CUSTOM", text: manualIdea });
                }}
              >
                {say("أكتب فكرتي", "My own idea")}
              </button>
            </div>
            {ideaMode === "CHOOSE" && (
              <div className="studio-choice-grid">
                {choices?.ideas.slice(0, 6).map((item) => (
                  <button
                    key={item.key}
                    aria-pressed={idea.text === item.description}
                    onClick={() => {
                      setIdeaMode("CHOOSE");
                      setIdea(
                        item.libraryRef
                          ? {
                              source: "LIBRARY",
                              text: item.description,
                              libraryRef: item.libraryRef,
                            }
                          : { source: "SUGGESTED", text: item.description },
                      );
                    }}
                  >
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <small>
                      {label(item.category)} · {item.ageMin}–{item.ageMax}{" "}
                      {say("شهر", "months")}
                    </small>
                  </button>
                ))}
              </div>
            )}
            {ideaMode !== "MANUAL" && (
              <div className="studio-actions">
                <button
                  onClick={() => {
                    setIdeaMode("AUTO");
                    setIdeaOffset(ideaOffset + 1);
                  }}
                >
                  {say("فكرة تانية", "Another idea")}
                </button>
                <button
                  onClick={() => {
                    setManualIdea(idea.text);
                    setIdeaMode("MANUAL");
                    setIdea({
                      ...idea,
                      source: "CUSTOM",
                      libraryRef: undefined,
                    });
                  }}
                >
                  {say("تعديل الفكرة", "Edit idea")}
                </button>
              </div>
            )}
            {idea.source === "LIBRARY" && (
              <p className="studio-muted">
                {say(
                  "مواد المكتبة إلهام مبدئي يحتاج مراجعتك؛ اختيار الفكرة يحفظ مصدرها ولا يعتمد المادة تلقائيًا.",
                  "Library material is provisional inspiration for your review. Selecting an idea preserves its source without approving the record.",
                )}
              </p>
            )}
            {(advanced || ideaMode === "MANUAL") && <label>
              {say("فكرة القصة", "Story idea")}
              <textarea
                dir="auto"
                maxLength={4000}
                value={idea.text}
                onChange={(e) => {
                  setIdeaMode("MANUAL");
                  setManualIdea(e.target.value);
                  setIdea({ source: "CUSTOM", text: e.target.value });
                }}
                placeholder={say(
                  "تولين تشوف حاجة ناعمة تحت القماشة، تكشفها وتحضنها وتنام…",
                  "What would you like to happen?",
                )}
              />
            </label>}
          </>
        )}
        {advanced && step === 4 && (
          <>
            <label>
              {headings[4]}
              <select
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value as typeof goal);
                  onChoices(age, category, e.target.value, mode);
                }}
              >
                {(
                  choices?.goalChoices ??
                  simple.goalPresets.map((p) => ({
                    key: p.key,
                    label: language === "en" ? p.label.en : p.label["ar-EG"],
                    description:
                      language === "en"
                        ? p.description.en
                        : p.description["ar-EG"],
                  }))
                ).map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {
                choices?.goalChoices?.find((item) => item.key === goal)
                  ?.description
              }
            </p>
            {goal === "CUSTOM" && (
              <label>
                {say("اكتب هدفك", "Your goal")}
                <textarea
                  dir="auto"
                  maxLength={2000}
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                />
              </label>
            )}
          </>
        )}
        {advanced && step === 5 && (
          <>
            <div className="studio-actions">
              {(["AUTO", "GUIDED", "CUSTOM"] as const).map((value, i) => (
                <button
                  key={value}
                  aria-pressed={path.mode === value}
                  onClick={() =>
                    setPath({
                      ...path,
                      mode: value,
                      ...(value === "GUIDED" && choices?.paths[0]
                        ? { key: choices.paths[0].key }
                        : {}),
                    })
                  }
                >
                  {
                    [
                      say("تلقائي", "Automatic"),
                      say("أختار المسار", "Choose a path"),
                      say("أبني المسار بنفسي", "Build my path"),
                    ][i]
                  }
                </button>
              ))}
            </div>
            {path.mode === "AUTO" && choices?.paths[0] && (
              <article>
                <h3>{choices.paths[0].title}</h3>
                <p>{choices.paths[0].steps.join(" ← ")}</p>
              </article>
            )}
            {path.mode === "GUIDED" && (
              <div className="studio-choice-grid">
                {choices?.paths.map((item) => (
                  <button
                    key={item.key}
                    aria-pressed={path.key === item.key}
                    onClick={() =>
                      setPath({ mode: "GUIDED", key: item.key, steps: [] })
                    }
                  >
                    <strong>{item.title}</strong>
                    <p>{item.steps.join(" ← ")}</p>
                  </button>
                ))}
              </div>
            )}
            {path.mode === "CUSTOM" && (
              <>
                {path.steps.map((text, i) => (
                  <div className="studio-path-step" key={i}>
                    <label>
                      {say("خطوة", "Step")} {i + 1}
                      <textarea
                        dir="auto"
                        value={text}
                        maxLength={4000}
                        onChange={(e) =>
                          setPath({
                            ...path,
                            steps: path.steps.map((old, j) =>
                              i === j ? e.target.value : old,
                            ),
                          })
                        }
                      />
                    </label>
                    <div className="studio-actions">
                      <button
                        disabled={i === 0}
                        onClick={() =>
                          setPath({
                            ...path,
                            steps: movePathStep(path.steps, i, -1),
                          })
                        }
                      >
                        {say("لأعلى", "Up")}
                      </button>
                      <button
                        disabled={i === path.steps.length - 1}
                        onClick={() =>
                          setPath({
                            ...path,
                            steps: movePathStep(path.steps, i, 1),
                          })
                        }
                      >
                        {say("لأسفل", "Down")}
                      </button>
                      <button
                        onClick={() =>
                          setPath({
                            ...path,
                            steps: path.steps.filter((_, j) => i !== j),
                          })
                        }
                      >
                        {say("حذف", "Delete")}
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  disabled={path.steps.length >= 32}
                  onClick={() =>
                    setPath({ ...path, steps: [...path.steps, ""] })
                  }
                >
                  {say("إضافة خطوة", "Add step")}
                </button>
              </>
            )}
            <label>
              {say("طول القصة", "Story length")}
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as typeof length)}
              >
                {(["AUTO", "SHORT", "NORMAL", "LONG"] as const).map(
                  (key, i) => (
                    <option key={key} value={key}>
                      {
                        [
                          say("تلقائي", "Automatic"),
                          say("قصيرة", "Short"),
                          say("عادية", "Normal"),
                          say("أطول", "Longer"),
                        ][i]
                      }
                    </option>
                  ),
                )}
              </select>
            </label>
          </>
        )}
        {advanced && step === 6 && (
          <>
            <label>
              {headings[6]}
              <select
                value={characterMode}
                onChange={(e) => setCharacterMode(e.target.value)}
              >
                <option value="FICTIONAL">
                  {say("شخصية خيالية", "Fictional character")}
                </option>
                <option value="NAMED">
                  {say("اسم خيالي", "Fictional name")}
                </option>
                <option value="PHOTO">
                  {say("من صور حقيقية", "From real photos")}
                </option>
              </select>
            </label>
            {characterMode !== "FICTIONAL" && (
              <label>
                {say("اسم الشخصية", "Character name")}
                <input
                  dir="auto"
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            {characterMode === "PHOTO" && (
              <p>
                {say(
                  "ستختار الصور المحلية عند فتح الكتاب. تبقى خاصة على هذا الجهاز، وتُرفق يدويًا بالخدمة الخارجية. التشابه الكامل غير مضمون.",
                  "Choose local photos when the book opens. They remain private on this device; attach them manually to an external service. Exact likeness is not guaranteed.",
                )}
              </p>
            )}
          </>
        )}
        {!advanced && step === 0 && <>
          <label>{say("اسم الطفل أو البطل — اختياري", "Child or hero name — optional")}<input dir="auto" maxLength={80} value={name} onChange={e=>setName(e.target.value)} /></label>
          <p>{say("الصور مش مطلوبة دلوقتي. تقدر تضيف مراجع الشخصية بعد كتابة القصة.", "Photos are not required now. Add character references after writing the story.")}</p>
        </>}
        {advanced && step === 7 && (
          <label>
            {say("مكان القصة — اختياري", "Setting — optional")}
            <input
              dir="auto"
              maxLength={500}
              value={setting}
              onChange={(e) => setSetting(e.target.value)}
            />
          </label>
        )}
      </fieldset>
      <div className="studio-actions">
        <button disabled={busy || step === 0} onClick={() => setStep(step - 1)}>
          {say("السابق", "Back")}
        </button>
        {!advanced ? <button className="primary-action" disabled={busy || !quickValid} onClick={() => step === 0 ? setStep(1) : create()}>{step === 0 ? say("راجع الفكرة", "Review idea") : say("ابدأ القصة", "Start story")}</button> : step < 7 ? (
          <button
            className="primary-action"
            disabled={
              busy ||
              !ready ||
              (step === 0 && (age < 0 || age > 95)) ||
              (step === 4 && goal === "CUSTOM" && !customGoal.trim()) ||
              (step === 5 && !pathReady) ||
              (step === 6 && characterMode !== "FICTIONAL" && !name.trim())
            }
            onClick={next}
          >
            {say("التالي", "Next")}
          </button>
        ) : (
          <button
            className="primary-action"
            disabled={busy || !idea.text.trim() || !pathReady}
            onClick={create}
          >
            {say("أنشئ القصة", "Create story")}
          </button>
        )}
      </div>
    </section>
  );
}
