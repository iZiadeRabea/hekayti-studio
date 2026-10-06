import { useState } from "react";
import type { VisualBible, VisualStyle } from "@hekayti/contracts/illustration";
import { useCreatorUi, type CreatorUiKey } from "./creator-ui";

function StringList({
  title,
  values,
  onChange,
}: {
  title: CreatorUiKey;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const { c } = useCreatorUi();
  return (
    <fieldset>
      <legend>{c(title)}</legend>
      {values.map((value, i) => (
        <input
          key={i}
          dir="auto"
          maxLength={4000}
          value={value}
          aria-label={`${c(title)} ${i + 1}`}
          onChange={(e) =>
            onChange(values.map((x, n) => (n === i ? e.target.value : x)))
          }
        />
      ))}
    </fieldset>
  );
}
const characterFields = {
  ageDescription: "Age appearance",
  presentation: "Presentation",
  skin: "Skin",
  hair: "Hair",
  face: "Face",
  clothes: "Clothes",
  colors: "Colors",
  proportions: "Proportions",
  carriedItem: "Carried item",
  expressions: "Expressions",
  stabilityRules: "Stability rules",
} as const;
export function VisualBibleEditor({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: VisualBible;
  busy: boolean;
  onCancel: () => void;
  onSave: (bible: VisualBible) => void;
}) {
  const { c } = useCreatorUi();
  const [value, setValue] = useState(initial);
  return (
    <form
      className="simple-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...value, revisionId: crypto.randomUUID() });
      }}
    >
      <h2>{c("Edit character descriptions")}</h2>
      <p>
        {c(
          "Character appearances are fictional defaults, not inferred from names or personal photos.",
        )}
      </p>
      <fieldset disabled={busy}>
        {value.characters.map((character, i) => (
          <fieldset key={character.characterId}>
            <legend dir="auto">{character.name}</legend>
            {(
              Object.keys(characterFields) as (keyof typeof characterFields)[]
            ).map((key) => (
              <label key={key}>
                {c(characterFields[key])}
                <input
                  dir="auto"
                  required
                  maxLength={4000}
                  value={character[key]}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      characters: value.characters.map((x, n) =>
                        n === i
                          ? {
                              ...x,
                              [key]: e.target.value,
                              appearanceBasis: "EXPLICIT_EDIT",
                            }
                          : x,
                      ),
                    })
                  }
                />
              </label>
            ))}
          </fieldset>
        ))}
        <label>
          {c("Location")}
          <textarea
            dir="auto"
            required
            maxLength={4000}
            value={value.location}
            onChange={(e) => setValue({ ...value, location: e.target.value })}
          />
        </label>
        <StringList
          title="Location anchors"
          values={value.locationAnchors}
          onChange={(locationAnchors) =>
            setValue({ ...value, locationAnchors })
          }
        />
        <StringList
          title="Props"
          values={value.props}
          onChange={(props) => setValue({ ...value, props })}
        />
        <StringList
          title="Continuity rules"
          values={value.continuityRules}
          onChange={(continuityRules) =>
            setValue({ ...value, continuityRules })
          }
        />
        <button type="submit">{c("Save")}</button>
        <button type="button" onClick={onCancel}>
          {c("Cancel")}
        </button>
      </fieldset>
    </form>
  );
}
export function VisualStyleEditor({
  initial,
  busy,
  onCancel,
  onSave,
}: {
  initial: VisualStyle;
  busy: boolean;
  onCancel: () => void;
  onSave: (style: VisualStyle) => void;
}) {
  const { c } = useCreatorUi();
  const [value, setValue] = useState(initial);
  const fields = {
    texture: "Texture",
    light: "Light",
    palette: "Palette",
    composition: "Composition",
  } as const;
  return (
    <form
      className="simple-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...value, revisionId: crypto.randomUUID() });
      }}
    >
      <h2>{c("Edit visual style")}</h2>
      <fieldset disabled={busy}>
        <label>
          {c("Medium")}
          <select
            value={value.medium}
            onChange={(e) =>
              setValue({
                ...value,
                medium: e.target.value as VisualStyle["medium"],
              })
            }
          >
            <option value="PAPER_CUT_COLLAGE">{c("Paper-cut collage")}</option>
            <option value="SOFT_WATERCOLOR">{c("Soft watercolor")}</option>
          </select>
        </label>
        {(Object.keys(fields) as (keyof typeof fields)[]).map((key) => (
          <label key={key}>
            {c(fields[key])}
            <textarea
              dir="auto"
              required
              maxLength={4000}
              value={value[key]}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
            />
          </label>
        ))}
        <StringList
          title="Negative rules"
          values={value.negativeRules}
          onChange={(negativeRules) => setValue({ ...value, negativeRules })}
        />
        <button type="submit">{c("Save")}</button>
        <button type="button" onClick={onCancel}>
          {c("Cancel")}
        </button>
      </fieldset>
    </form>
  );
}
