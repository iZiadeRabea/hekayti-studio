import {
  WriterStoryPlanSchema,
  type StoryPlan,
  type CategoryIntentSchema,
} from "@hekayti/contracts/planner";
import type { z } from "zod";
import type { QaFinding } from "@hekayti/contracts";

type Category = StoryPlan["planning"]["request"]["primaryCategory"];
const signatures: Record<Category, [string, string[]]> = {
  adventure: [
    "A safe visible mini-mission across familiar nearby play markers",
    [
      "A reachable destination",
      "Safe movement and discovery",
      "A playful obstacle solved through the objective",
    ],
  ],
  bedtime: [
    "A reassuring sequence that slows into rest",
    ["Familiar comfort", "Low arousal and gentle pacing", "Quiet final image"],
  ],
  educational: [
    "Observe, test and compare a visible result",
    ["Observable learning", "A concrete test", "An outcome the child can see"],
  ],
  "early-learning": [
    "Notice and repeat one observable difference",
    ["Concrete observation", "Supported repetition"],
  ],
  discovery: [
    "Follow a visible clue to a small familiar discovery",
    ["Notice a clue", "Test it safely"],
  ],
  "everyday-life": [
    "Complete a familiar daily sequence",
    ["Recognizable routine", "Concrete order of actions"],
  ],
  "emotional-learning": [
    "Recognize a feeling and use a supported response",
    ["Visible emotional reaction", "Regulation or repair"],
  ],
  behavioral: [
    "A changed choice creates an observable consequence",
    ["A visible consequence", "A useful changed action"],
  ],
  values: [
    "A small choice affects another participant",
    ["A meaningful choice", "Visible care or fairness"],
  ],
};
export function detectCategoryIntent(
  category: Category,
): z.infer<typeof CategoryIntentSchema> {
  const [signature, storyNeeds] = signatures[category];
  return {
    schemaVersion: "category-intent/1.0",
    category,
    signature,
    storyNeeds,
  };
}

/** Explicit new dispatch only; retained 1.1 plans never pass through here. */
export function composeCategoryPlan(
  input: Extract<StoryPlan, { schemaVersion: "story-plan/1.1" }>,
) {
  const p = structuredClone(input),
    category = p.planning.request.primaryCategory;
  const intent = detectCategoryIntent(category);
  const infant = p.guidance.narrativeForm === "recognition";
  const social =
    p.quality.objectiveIntent.primaryIntent === "SHARING_TURN_TAKING";
  const a = p.characters[0]?.displayName ?? "The child",
    b = p.characters[1]?.displayName ?? "a familiar partner";
  if (!infant && category === "adventure") {
    const start = "the first ground marker",
      end = social
        ? "the nearby basket destination"
        : "the nearby activity destination beside the familiar materials";
    p.title = social
      ? "The rolling route for two"
      : `The short route: ${p.title}`;
    p.goal.description += ` along a short route from ${start} to ${end}`;
    p.openingState += `; two visible dry ground markers lead to ${end} inside ${p.setting.description}; familiar adult support remains nearby`;
    p.beats.forEach((beat, i) => {
      const t = p.quality.transitions[i]!;
      const context =
        i === 0
          ? `The mini-mission starts at ${start}; both ground markers and ${end} are visible.`
          : beat.beatId === p.resolutionBeatId
            ? `They reach ${end} along the two visible markers, using the agreed operation.`
            : beat.beatId === p.endingBeatId
              ? `They return along the same short ground route and rest beside ${start}.`
              : i === 1
                ? social
                  ? `At the first marker, a folded play mat corner stops the rolling toy; the route waits while the game pauses.`
                  : `At the first marker, the mini-mission pauses at this actual activity obstacle: ${p.quality.situation.initialFriction ?? beat.beforeState}.`
                : social
                  ? `At the next ground marker, they flatten the mat corner together and point toward the nearby basket.`
                  : `At the next ground marker, the clue comes from the activity itself: ${t.informationChange}. The child uses this clue to continue toward ${end}.`;
      beat.summary += ` ${context}`;
      beat.afterState += `; ${context}`;
      beat.beforeState = i ? p.beats[i - 1]!.afterState : p.openingState;
      t.strategy +=
        i === 1
          ? "; try the first short route"
          : "; follow the visible ground route";
      t.informationChange += `; ${context}`;
      t.consequence += `; ${context}`;
      beat.progress = t.consequence;
    });
    p.quality.situation.resolutionMethod += social
      ? `; follow the two ground markers to ${end} and return by the same short route`
      : `; complete this supported activity at ${end}, then return along the same two dry ground markers with empty hands while the adult keeps the materials in place`;
    const rt = p.quality.transitions.find(
      (t) => t.beatId === p.resolutionBeatId,
    )!;
    rt.resolutionMethod = p.quality.situation.resolutionMethod;
    p.beats.find((t) => t.beatId === p.resolutionBeatId)!.summary =
      p.quality.situation.resolutionMethod;
    if (p.problem && social)
      p.problem.description +=
        "; a folded play mat corner interrupts the short route";
  } else if (!infant && category === "bedtime" && social) {
    p.title = "A quiet turn with the soft toy";
    p.goal.description =
      "Give each child a gentle turn with the soft toy before settling beside the familiar book";
    p.quality.situation.resolutionMethod = `${a} gently passes the soft toy to ${b}; each has a quiet turn, then they place it in its basket and close the book together`;
    p.quality.situation.focus = "soft toy beside a familiar book";
    p.quality.situation.initialFriction = `${b} waits for a quiet turn with the soft toy`;
    if (p.problem) p.problem.description = p.quality.situation.initialFriction;
    p.need = "Notice the waiting hands and make room for a quiet turn";
    p.discovery = "The quiet turn cue lets both children settle together";
    p.beats.forEach((beat, i) => {
      const end = beat.beatId === p.endingBeatId,
        resolve = beat.beatId === p.resolutionBeatId;
      const text = end
        ? "The closed book and soft toy rest beside the children in the quiet familiar place"
        : resolve
          ? p.quality.situation.resolutionMethod
          : i === 0
            ? `${a} holds the soft toy beside the familiar book while ${b} waits for a quiet turn`
            : i === 1
              ? `${a} notices ${b}'s waiting hands and loosens the grip on the soft toy; both stay beside the familiar book`
              : `${b} points to the cushion beside the book; ${a} places the soft toy there so the waiting hands can take a quiet turn`;
      beat.summary = text;
      beat.afterState = text;
      beat.beforeState = i ? p.beats[i - 1]!.afterState : text;
      const t = p.quality.transitions[i]!;
      t.strategy = end
        ? "rest in familiar comfort"
        : resolve
          ? "pass gently, give both a quiet turn and settle"
          : "notice waiting hands and offer a quiet turn";
      t.informationChange = text;
      t.relationshipChange =
        "Both children have room in the quiet shared routine";
      t.consequence = text;
      beat.progress = text;
      if (resolve) t.resolutionMethod = p.quality.situation.resolutionMethod;
    });
    p.openingState = p.beats[0]!.beforeState;
  } else if (!infant && category === "bedtime") {
    p.goal.description +=
      "; complete the familiar activity gently before resting";
    p.beats.forEach((beat, i) => {
      const closing = beat.beatId === p.endingBeatId;
      beat.summary += closing
        ? ". The familiar materials rest nearby as the room becomes quiet."
        : ". The child stays in the familiar place, moves slowly and uses a quiet voice.";
      beat.afterState += closing
        ? "; the child rests in quiet familiar comfort"
        : "; the activity stays gentle and unhurried";
      if (i) beat.beforeState = p.beats[i - 1]!.afterState;
      p.quality.transitions[i]!.consequence += closing
        ? "; quiet rest follows"
        : "; comfort remains available";
    });
  } else if (!infant) {
    // Add an operation, not a category label; preserve objective-specific causal mechanics.
    const contexts: Partial<Record<Category, string[]>> = {
      educational: [
        social
          ? `${a} lays two turn counters beside the ball, one for each child, and points to the waiting empty place`
          : `${a} points to the ready materials and predicts the result before trying`,
        social
          ? `${b} points to the empty counter while ${a}'s counter has the ball; they compare who has had a complete turn`
          : `${a} compares the first visible result with the earlier prediction and points to the difference`,
        social
          ? `After each complete pass, ${a} and ${b} move the ball to the next counter; they check that both counters have marked a turn`
          : `${a} repeats the changed operation and points out the visible result that confirms it`,
      ],
      "early-learning": [
        "Notice one concrete difference",
        "Try the same action and compare the visible change",
        "Repeat the observed difference gently",
      ],
      discovery: [
        "Notice a nearby visible clue",
        "Follow the clue within the familiar play space",
        "Check the small discovery against the clue",
      ],
      "everyday-life": [
        `${a} sets the activity materials in their familiar starting places before beginning the daily sequence`,
        social
          ? `${a} pauses at the familiar basket and ${b} points to the waiting play space; the next turn comes before putting the toy away`
          : `${a} points to the familiar next step and brings the waiting materials within reach`,
        social
          ? `${a} finishes the shared play sequence, then returns the materials to their known basket with ${b}`
          : `${a} finishes the supported sequence and returns the materials to their known places`,
      ],
      "emotional-learning": [
        social
          ? `${a}'s fingers tighten around the toy while ${b}'s shoulders droop; their faces show the feeling`
          : `${a}'s hands tighten and shoulders rise before the supported activity; the face shows the feeling`,
        `${a} pauses, names feeling cross briefly, and loosens the hands before trying the supported response`,
        social
          ? `${a}'s hands relax and ${b}'s shoulders lift after the shared action; they name the calmer feeling together`
          : `${a}'s hands relax after the supported action; a gentle breath shows the calmer feeling`,
      ],
      values: [
        social
          ? `${a} notices ${b}'s empty hands after the first choice`
          : `${a} notices what the first choice has left unfinished`,
        social
          ? `${a} chooses to make space for ${b}'s idea, placing the toy where both can reach it`
          : `${a} chooses to try the supported step with care and leaves the materials ready`,
        social
          ? `${b} smiles and invites ${a} into the next round after the fair, caring choice`
          : `${a} checks the useful result of the caring choice and sets the materials gently in place`,
      ],
      behavioral: [
        social
          ? `${a} notices the consequence: the waiting partner cannot play while one child holds the toy`
          : `${a} notices the visible consequence of the first incomplete action`,
        social
          ? `${a} changes the choice by yielding the visible turn cue to ${b}`
          : `${a} changes the choice by following the visible cue before completing the action`,
        social
          ? `The changed action lets ${b} complete a turn and keeps the shared game moving; ${a} sees the useful consequence`
          : `${a} checks the useful visible consequence of the changed action against the original task`,
      ],
    };
    const cs = contexts[category];
    if (cs)
      p.beats.forEach((beat, i) => {
        if (beat.beatId === p.endingBeatId) return;
        const c = cs[i === 0 ? 0 : beat.beatId === p.resolutionBeatId ? 2 : 1]!;
        beat.summary += `. ${c}.`;
        beat.afterState += `; ${c}`;
        beat.beforeState = i ? p.beats[i - 1]!.afterState : p.openingState;
        p.quality.transitions[i]!.strategy += `; ${c}`;
        p.quality.transitions[i]!.informationChange += `; ${c}`;
      });
    p.beats.at(-1)!.beforeState = p.beats.at(-2)!.afterState;
  }
  return WriterStoryPlanSchema.parse({
    ...p,
    schemaVersion: "story-plan/1.2",
    quality: { ...p.quality, categoryIntent: intent },
  });
}
export function categoryFindings(
  p: Extract<StoryPlan, { schemaVersion: "story-plan/1.2" }>,
): QaFinding[] {
  const category = p.planning.request.primaryCategory;
  const texts = p.beats.map((b) => b.summary).join(" ");
  const tokens: Partial<Record<Category, RegExp>> = {
    adventure: /route|marker|destination/i,
    bedtime: /quiet|rest|gentle/i,
    educational: /observe|test|compare|visible result/i,
    "everyday-life": /familiar|sequence/i,
    "emotional-learning": /feeling|pause|response/i,
    values: /choice|fair|caring/i,
    behavioral: /consequence|changed/i,
  };
  const present = !tokens[category] || tokens[category]!.test(texts);
  return [
    {
      findingId: "category-presence",
      category: "CATEGORY_PRESENCE",
      location: "quality.categoryIntent",
      severity: "medium",
      message: present
        ? "Category cues are present in explicit actions; creator must judge whether the story delivers the category and objective together."
        : "Expected category actions are not visible in this plan; revise the sequence before prose.",
      suggestedAction:
        "Review category and objective together; this is an advisory presence check, not genre certification.",
    },
  ];
}
