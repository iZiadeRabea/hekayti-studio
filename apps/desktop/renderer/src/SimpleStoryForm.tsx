import type { StoryRequest } from "@hekayti/contracts";
import type { PlanningRequest } from "@hekayti/contracts/planner";
import type {
  SimpleDefaults,
  LocalizedLabel,
  SimpleCreateInput,
} from "@hekayti/contracts/creator";
import { useCreatorUi } from "./creator-ui";

// Form state only. The service owns request construction, age defaults and goals.
export type SimpleFormValues = {
  agePreset: string;
  exactAge: string;
  language: StoryRequest["primaryLanguageMode"];
  bothLanguages: boolean;
  category: NonNullable<SimpleCreateInput["category"]>;
  goalPreset: string;
  customGoal: string;
  successScenario: string;
  fictionalName: string;
  personalize: boolean;
  setting: string;
  constraints: string;
  variation: PlanningRequest["variation"];
  profile: PlanningRequest["profile"];
};
export type FormChoices = Pick<SimpleDefaults, "agePresets" | "goalPresets">;
export function simpleFormInput(
  value: SimpleFormValues,
  expectedLibrary: number,
  provisionalAcknowledged: boolean,
): SimpleCreateInput {
  return {
    agePreset: value.agePreset as SimpleCreateInput["agePreset"],
    ...(value.exactAge !== ""
      ? { exactAgeMonths: Number(value.exactAge) }
      : {}),
    primaryLanguageMode: value.language,
    bothArabicEditions: value.bothLanguages,
    category: value.category,
    goalPreset: value.goalPreset as SimpleCreateInput["goalPreset"],
    ...(value.customGoal !== "" ? { customGoal: value.customGoal } : {}),
    ...(value.successScenario !== ""
      ? { successScenario: value.successScenario }
      : {}),
    ...(value.setting !== "" ? { setting: value.setting } : {}),
    ...(value.constraints !== "" ? { constraints: value.constraints } : {}),
    ...(value.personalize && value.fictionalName !== ""
      ? { fictionalName: value.fictionalName }
      : {}),
    profile: value.profile,
    variation: value.variation,
    provisionalAcknowledged,
    expectedLibrary,
  };
}
export function SimpleStoryForm({
  choices,
  value,
  onChange,
  onCreate,
  busy,
  disabledCreation = false,
}: {
  choices: FormChoices;
  value: SimpleFormValues;
  onChange: (value: SimpleFormValues) => void;
  onCreate: () => void;
  busy: boolean;
  disabledCreation?: boolean;
}) {
  const { c, label, language } = useCreatorUi();
  const display = (x: LocalizedLabel) =>
    language === "en" ? x.en : x["ar-EG"];
  const update = (patch: Partial<SimpleFormValues>) =>
    onChange({ ...value, ...patch });
  const goals = choices.goalPresets.filter((p) => p.key !== "CUSTOM");
  return (
    <form
      className="simple-form"
      data-testid="simple-story-form"
      onSubmit={(e) => {
        e.preventDefault();
        onCreate();
      }}
    >
      <fieldset disabled={busy}>
        <legend>{c("New story")}</legend>
        <label>
          {c("Story age")}
          <select
            aria-label={c("Story age")}
            value={value.agePreset}
            onChange={(e) =>
              update({ agePreset: e.target.value, exactAge: "" })
            }
          >
            {choices.agePresets.map((p) => (
              <option key={p.key} value={p.key}>
                {display(p.label)}
              </option>
            ))}
          </select>
        </label>
        <p dir="auto">
          {choices.agePresets.find((p) => p.key === value.agePreset)?.note &&
            display(
              choices.agePresets.find((p) => p.key === value.agePreset)!.note,
            )}
        </p>
        <label>
          {c("Story language")}
          <select
            aria-label={c("Story language")}
            value={value.language}
            onChange={(e) =>
              update({
                language: e.target.value as SimpleFormValues["language"],
              })
            }
          >
            <option value="ar-EG">{label("ar-EG")}</option>
            <option value="ar-MSA-simple">{label("ar-MSA-simple")}</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={value.bothLanguages}
            onChange={(e) => update({ bothLanguages: e.target.checked })}
          />
          {c("Create both Arabic editions")}
        </label>
        <fieldset className="simple-type-cards">
          <legend>{c("Story type")}</legend>
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
          ).map((category) => (
            <button
              type="button"
              key={category}
              aria-pressed={value.category === category}
              onClick={() => update({ category })}
            >
              {label(category)}
            </button>
          ))}
        </fieldset>
        <label>
          {c("Story goal")}
          <select
            aria-label={c("Story goal")}
            value={value.goalPreset}
            onChange={(e) => update({ goalPreset: e.target.value })}
          >
            {goals.map((p) => (
              <option key={p.key} value={p.key}>
                {display(p.label)}
              </option>
            ))}
            <option value="CUSTOM">{c("Custom goal")}</option>
          </select>
        </label>
        {value.goalPreset === "CUSTOM" && (
          <label>
            {c("Custom goal")}
            <textarea
              aria-label={c("Custom goal")}
              dir="auto"
              value={value.customGoal}
              maxLength={2000}
              onChange={(e) => update({ customGoal: e.target.value })}
            />
          </label>
        )}
        <label>
          {c("Personalization")}
          <select
            value={value.personalize ? "FICTIONAL_NAME" : "NONE"}
            onChange={(e) =>
              update({ personalize: e.target.value === "FICTIONAL_NAME" })
            }
          >
            <option value="NONE">{c("No personalization")}</option>
            <option value="FICTIONAL_NAME">{c("Fictional name")}</option>
          </select>
        </label>
        {value.personalize && (
          <label>
            {c("Fictional name")}
            <input
              dir="auto"
              value={value.fictionalName}
              maxLength={80}
              onChange={(e) => update({ fictionalName: e.target.value })}
            />
          </label>
        )}
        <details>
          <summary>{c("Additional choices")}</summary>
          <label>
            {c("Exact age in months")}
            <input
              type="number"
              min={0}
              max={95}
              value={value.exactAge}
              onChange={(e) => update({ exactAge: e.target.value })}
            />
          </label>
          <label>
            {c("Story place")}
            <input
              aria-label={c("Story place")}
              dir="auto"
              value={value.setting}
              maxLength={500}
              onChange={(e) => update({ setting: e.target.value })}
            />
          </label>
          {value.goalPreset !== "CUSTOM" && (
            <label>
              {c("Goal in detail")}
              <textarea
                dir="auto"
                value={value.customGoal}
                maxLength={2000}
                onChange={(e) => update({ customGoal: e.target.value })}
              />
            </label>
          )}
          <label>
            {c("Successful outcome")}
            <textarea
              dir="auto"
              value={value.successScenario}
              maxLength={2000}
              onChange={(e) => update({ successScenario: e.target.value })}
            />
          </label>
          <label>
            {c("Creator constraints")}
            <textarea
              aria-label={c("Creator constraints")}
              dir="auto"
              value={value.constraints}
              maxLength={2000}
              onChange={(e) => update({ constraints: e.target.value })}
            />
          </label>
          <label>
            {label("Variation")}
            <select
              value={value.variation}
              onChange={(e) =>
                update({
                  variation: e.target.value as SimpleFormValues["variation"],
                })
              }
            >
              {(
                [
                  "FreshConcept",
                  "SimilarVersion",
                  "NewVariant",
                  "CompletelyNew",
                ] as const
              ).map((x) => (
                <option key={x} value={x}>
                  {label(x)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {label("Cultural profile")}
            <select
              value={value.profile}
              onChange={(e) =>
                update({
                  profile: e.target.value as SimpleFormValues["profile"],
                })
              }
            >
              {(["EGYPTIAN_ARAB_MUSLIM_FAMILY", "GENERAL_FAMILY"] as const).map(
                (x) => (
                  <option key={x} value={x}>
                    {label(x)}
                  </option>
                ),
              )}
            </select>
          </label>
        </details>
        <button
          type="submit"
          className="primary-action"
          disabled={
            busy ||
            disabledCreation ||
            (value.goalPreset === "CUSTOM" && !value.customGoal.trim()) ||
            (value.personalize && !value.fictionalName.trim())
          }
        >
          {c(busy ? "Creating the plan…" : "Create story")}
        </button>
      </fieldset>
    </form>
  );
}
