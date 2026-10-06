import {
  QualityStoryPlanSchema,
  type StoryPlan,
  type ObjectiveIntent,
  type StructuralCompatibility,
} from "@hekayti/contracts/planner";
import type { QaFinding } from "@hekayti/contracts";
import { detectObjectiveIntent } from "./story-objective-intent";

type QualityPlan = ReturnType<typeof QualityStoryPlanSchema.parse>;
type Step = {
  action: StoryPlan["beats"][number]["action"];
  summary: string;
  state: string;
  strategy: string;
  information: string;
  relationship: string;
  consequence: string;
  social?: boolean;
};
const step = (
  action: Step["action"],
  summary: string,
  state: string,
  strategy: string,
  information: string,
  consequence: string,
  social = false,
  relationship = "Support remains available",
): Step => ({
  action,
  summary,
  state,
  strategy,
  information,
  consequence,
  social,
  relationship,
});

export function composeConcretePlan(
  base: StoryPlan,
  intent: ObjectiveIntent,
  compatibility: StructuralCompatibility,
): QualityPlan {
  const p = structuredClone(base),
    r = p.planning.request,
    g = p.guidance,
    calm = r.primaryCategory === "bedtime",
    infant = g.narrativeForm === "recognition",
    routine = g.narrativeForm === "routine",
    social = intent.socialMechanisms.length > 0 && !infant,
    variant =
      p.planning.variation === "SimilarVersion"
        ? 0
        : p.planning.generation +
          (p.planning.variation === "NewVariant" ? 1 : 0);
  if (social && p.characters.length < 2 && g.activeCharacterRange[1] >= 2) {
    p.characters.push({
      ...p.characters[0]!,
      characterId: `${p.revisionId.slice(0, 65)}-friend`,
      bibleVersion: `${p.revisionId.slice(0, 65)}-friend-bible`,
      displayName: "سلمى",
      origin: "synthetic",
      approvedReferenceImages: [],
      consistencyNotes: "Fictional active partner; no real child data.",
    });
  }
  const a = p.characters[0]?.displayName ?? "The familiar shape",
    b = p.characters[1]?.displayName ?? "a familiar caregiver",
    participants = p.characters.map((c) => c.characterId),
    vector = p.provenance.patternVector,
    structural = `${vector?.mechanism ?? p.provenance.mechanism} ${vector?.attemptSequence ?? ""} ${vector?.resolutionCategory ?? ""}`,
    collaborative = /collective|cooperat|together/i.test(structural),
    focus = calm
      ? "soft toy"
      : /playground|garden/i.test(p.setting.description)
        ? "soft ball"
        : "toy car";
  let title = "The little play corner",
    goal = "Finish a small familiar activity and put its materials away",
    friction: string | null = "A rolling toy cannot reach the waiting basket",
    method =
      "Place a flat cardboard ramp, roll the toy along it and catch it in the basket",
    opening = "A toy and a basket are ready in the familiar play corner",
    stages: Step[] = [];

  if (infant) {
    title = "The soft shape returns";
    goal = "Notice a familiar soft shape, its sound and its gentle return";
    friction = null;
    method =
      "Reveal the same soft shape slowly, repeat its gentle sound and settle beside it";
    opening = "A soft shape rests partly beneath a familiar cloth";
    stages = [
      step(
        "notice",
        `A familiar soft shape rests at ${p.setting.description}; shared attention follows its rounded edge`,
        "The rounded edge is visible",
        "look at the edge",
        "A rounded edge is seen",
        "Attention has a familiar focus",
      ),
      step(
        "reveal",
        "The cloth lifts slowly to show the whole soft shape",
        "The whole shape is visible",
        "lift a little cloth",
        "The whole shape joins the known edge",
        "Recognition expands without a problem",
      ),
      step(
        "repeat",
        "The same shape returns with one soft tapping sound",
        "The familiar shape is linked to a soft sound",
        "repeat with one sound",
        "A soft sound accompanies the known shape",
        "The repetition adds one sensory detail",
      ),
      step(
        "settle",
        "The cloth rests beside the shape and the familiar sound quiets",
        "The shape and cloth rest together",
        "slow and settle",
        "The sound becomes quiet",
        "Shared attention closes calmly",
      ),
    ];
  } else if (calm) {
    title = "The soft toy's quiet place";
    goal =
      "Place the soft toy in its basket and settle beside a familiar bedtime book";
    friction = null;
    method =
      "Carry the soft toy slowly into its basket, close the familiar book and rest with a gentle breath";
    opening = "A soft toy rests beside an open bedtime book";
    stages = [
      step(
        "notice",
        `${a} notices the soft toy beside the bedtime book at ${p.setting.description}`,
        "The toy and open book are within reach",
        "notice bedtime materials",
        "A basket is beside the book",
        "A calm routine is ready",
        social,
      ),
      step(
        "try",
        `${a} carries the toy gently while the book waits open`,
        "The toy reaches its basket; the book remains open",
        "carry slowly",
        "The toy has a resting place",
        "Only the book remains to close",
        social,
      ),
      step(
        "notice",
        `${a} looks at the last familiar picture and lowers the book`,
        "The last picture is seen and the book is lowered",
        "look then lower",
        "The last picture is familiar",
        "The pace becomes quieter",
        social,
      ),
      step(
        "settle",
        `${a} closes the book, rests beside the basket and takes a gentle breath`,
        "The book is closed and the toy rests beside a settled child",
        "close, rest and breathe",
        "Both materials are settled",
        "The bedtime sequence is complete",
        social,
      ),
      step(
        "settle",
        "The closed book and resting toy stay nearby as the room grows quiet",
        "The familiar resting places remain visible in a quiet room",
        "rest in the quiet room",
        "Nothing new needs solving",
        "Calm closure continues",
        social,
      ),
    ];
  } else if (intent.primaryIntent === "SHARING_TURN_TAKING") {
    title = collaborative ? "A rolling game for two" : "The turn marker";
    goal = `Give both children a clear turn with the ${focus} and keep their game moving`;
    friction = `${a} holds the ${focus}; ${b} is waiting without a turn`;
    const marker =
      variant % 2 ? "a short clapping signal" : "a small turn card";
    method = collaborative
      ? `Roll the ${focus} to a partner, swap roller and catcher roles after each roll, and let each child lead one roll`
      : `Use ${marker} to mark the current player, pass the ${focus} after one short play, and give each child a complete turn`;
    opening = `${a} has the ${focus}; ${b} stands beside the marked play space`;
    stages = [
      step(
        "notice",
        `${a} holds the ${focus} at ${p.setting.description}; ${b} waits beside the marked play space`,
        "One child holds the ball or toy while the friend waits",
        "notice the waiting partner",
        "The friend wants a place in the game",
        "The game has only one active player",
        true,
        "One child is excluded from play",
      ),
      step(
        "try",
        variant % 2
          ? `${a} offers a very short peek at the ${focus} but takes it back before ${b} can play`
          : `${a} keeps rolling the ${focus} alone; ${b} reaches to join and the game stops`,
        "The friend has not completed a turn and the game has paused",
        variant % 2
          ? "offer a peek without yielding the object"
          : "play alone without yielding the object",
        "A peek or reach is not a real turn",
        "The interrupted game cannot continue together",
        true,
        "Both children notice the unfair interruption",
      ),
      step(
        collaborative ? "cooperate" : "compare",
        collaborative
          ? `${a} and ${b} mark roller and catcher places; they agree to swap places after each roll`
          : `${a} and ${b} place ${marker} beside the player and agree to pass it after one short play`,
        "Both children can see whose turn comes next",
        collaborative
          ? "assign complementary roles and agree to swap"
          : "mark one complete turn before passing",
        "A visible rule tells both children when the next turn begins",
        "The friend can predict a complete turn",
        true,
        "Both children agree to the same rule",
      ),
      step(
        "cooperate",
        method,
        "Each child has completed a turn and returned the ball or toy to the partner",
        "perform the agreed reciprocal exchange",
        "Both children have tested the rule",
        "The game works because neither turn is skipped",
        true,
        "Both children are included and trust the next turn",
      ),
      step(
        "settle",
        `${a} and ${b} begin another gentle round, passing the ${focus} when the agreed signal comes`,
        "The children continue a shared game with the same turn rule",
        "repeat the successful reciprocal rule",
        "The next round uses the known signal",
        "They keep playing together without a new dispute",
        true,
        "Their shared rule sustains play",
      ),
    ];
  } else if (
    intent.primaryIntent === "COOPERATION_HELPING" ||
    intent.primaryIntent === "CONNECTION_REPAIR"
  ) {
    const repair = intent.primaryIntent === "CONNECTION_REPAIR";
    title = repair ? "The drawing made whole" : "The bridge built together";
    goal = repair
      ? "Repair a friend's torn drawing and make room for both children's ideas"
      : "Build a stable block bridge so both toy cars can cross";
    friction = repair
      ? "A hurried pull tears a friend's drawing and the friend stops drawing"
      : "A narrow block bridge wobbles when one child builds alone";
    method = repair
      ? `${a} names the torn corner, listens to ${b}, asks permission to tape it, and they redraw the missing line together`
      : collaborative
        ? `${a} holds the base steady while ${b} adds a wide support; they swap builder and tester roles and roll both cars across`
        : `${a} asks ${b} to hold the base, adds one wider support and then returns the help while ${b} tests the second car`;
    opening = repair
      ? "A drawing and tape lie between two children"
      : "Blocks and two toy cars lie beside a marked gap";
    stages = [
      step(
        "notice",
        `${opening} at ${p.setting.description}`,
        opening,
        "notice the shared task",
        "The task needs both children's attention",
        "Materials and participants are ready",
        true,
      ),
      step(
        "try",
        repair
          ? `${a} tries to cover the torn corner without asking; ${b} pulls the drawing closer`
          : `${a} piles blocks onto a narrow base; the bridge leans before a car can cross`,
        friction,
        "act alone without checking the partner or base",
        "The first strategy overlooks a needed support",
        "The task pauses instead of finishing",
        true,
        repair
          ? "The friend is not yet heard"
          : "The children need complementary roles",
      ),
      step(
        repair ? "ask-help" : "cooperate",
        repair
          ? `${a} stops, names the torn corner and asks ${b} which line matters`
          : `The children compare the narrow base with a wide one and choose different jobs`,
        repair
          ? "The friend points to the missing line"
          : "A wide base and clear jobs are chosen",
        "listen and change the unsupported strategy",
        "The missing support is now explicit",
        "A practical repair can begin",
        true,
        "Both children contribute to the decision",
      ),
      step(
        "cooperate",
        method,
        repair
          ? "The corner is taped and the friend's chosen line is restored"
          : "Both cars cross the steady bridge without tipping it",
        "perform complementary roles and check the result",
        "The repair or support holds when tested",
        "The shared task succeeds visibly",
        true,
        "Both children's contributions are respected",
      ),
      step(
        "settle",
        repair
          ? "The children add one new line each to their repaired drawing"
          : "The children park both cars and keep the wide bridge ready for another crossing",
        repair
          ? "The repaired drawing includes both children's new lines"
          : "The completed bridge waits beside two parked cars",
        "continue with equal contributions",
        "The successful solution remains available",
        "The relationship and task close together",
        true,
        "Both children remain included",
      ),
    ];
  } else if (
    intent.primaryIntent === "EMOTIONAL_REGULATION" ||
    intent.primaryIntent === "GENERAL_EMOTIONAL"
  ) {
    title = "The tower and the quiet breath";
    goal =
      "Pause beside a fallen block tower, settle the body and rebuild a lower steady tower";
    friction = "A block tower falls and the child wants to rush the next block";
    method = `${a} puts both feet on the floor, breathes slowly, asks for a quiet pause and rebuilds with a wide base`;
    opening = "A small block tower stands beside a wide mat";
    stages = [
      step(
        "notice",
        `${a} watches a small block tower at ${p.setting.description}`,
        "A tall block tower stands on the mat",
        "notice the tower",
        "The narrow base is visible",
        "The child cares about the tower",
      ),
      step(
        "try",
        `${a} reaches for another block as the tower falls; hurried hands knock the base aside`,
        "Blocks are scattered and the child feels tense",
        "rush to replace the lost tower",
        "Hurried hands move the loose base",
        "The upset grows when rebuilding is rushed",
      ),
      step(
        "ask-help",
        `${a} names the upset, puts both feet on the floor and asks for a quiet pause`,
        "The child's hands rest and the blocks wait on the mat",
        "name the feeling and pause",
        "A pause is available before another try",
        "The body begins to settle",
      ),
      step(
        "solve",
        method,
        "A lower steady tower stands beside a calmer child",
        "breathe then rebuild on a wide base",
        "A lower wide base stays steady",
        "Calm makes a careful next action possible",
      ),
      step(
        "settle",
        `${a} leaves a space beside the tower and rests the remaining blocks on the mat`,
        "The steady tower and unused blocks have safe resting places",
        "stop after a manageable success",
        "The tower need not grow taller now",
        "The story ends with a settled body",
      ),
    ];
  } else if (
    intent.primaryIntent === "LEARNING_DISCOVERY" ||
    intent.primaryIntent === "GENERAL_EDUCATIONAL"
  ) {
    const counting = /count|number|عد|اعداد/i.test(
      `${r.objective.description} ${r.objective.successScenario}`,
    );
    title = counting ? "Three blocks, three places" : "The rolling test";
    goal = counting
      ? "Place three blocks in three marked spaces and check that each has been counted once"
      : "Find which familiar toy rolls along a flat cardboard ramp";
    friction = counting
      ? "A block is counted twice when the row is moved"
      : "A flat toy stays still when the child expects it to roll";
    method = counting
      ? "Move each block into one marked space while saying one number, then point to each occupied space once"
      : collaborative
        ? "One child holds the ramp steady while the other tests a flat toy and a round toy; they swap jobs to check which rolls"
        : "Test a flat toy and a round toy on the same ramp, compare their movement and repeat the round toy's roll to check the result";
    opening = counting
      ? "Three blocks lie beside three marked spaces"
      : "A flat toy, round toy and cardboard ramp wait side by side";
    stages = [
      step(
        "notice",
        `${opening} at ${p.setting.description}`,
        opening,
        "look at the available objects",
        "The objects differ in position or shape",
        "There is something visible to check",
      ),
      step(
        "try",
        counting
          ? `${a} counts a loose row, shifts one block and counts that block again`
          : `${a} puts the flat toy on the ramp; it remains still`,
        friction,
        "make one unsupported prediction",
        "The first result differs from the guess",
        "The child has a concrete question",
      ),
      step(
        "compare",
        counting
          ? "The child draws one space for each block and moves only uncounted blocks"
          : "The child places the round toy on the same ramp and compares its motion",
        counting
          ? "Each uncounted block now has an empty marked space"
          : "The round toy rolls while the flat toy stays still",
        "change one condition and compare",
        "One-to-one spaces or toy shape explains the difference",
        "The child can now check a rule",
      ),
      step(
        "discover",
        method,
        counting
          ? "Each of the three spaces contains one block counted once"
          : "The round toy rolls twice on the same ramp while the flat toy remains still",
        "repeat a controlled check",
        "The observed result is consistent",
        "The learning is demonstrated rather than announced",
        collaborative,
      ),
      step(
        "settle",
        counting
          ? "The child points to the three occupied spaces, then stores the blocks"
          : "The child puts the two tested toys beside the ramp and chooses the rolling toy for another gentle roll",
        counting
          ? "Three counted blocks rest beside the three spaces"
          : "The tested toys rest beside their known ramp",
        "use the checked result in a familiar next action",
        "The checked result remains available",
        "The discovery closes with the same concrete objects",
      ),
    ];
  } else if (intent.primaryIntent === "ROUTINE_HABIT") {
    title = "The toy basket's ready place";
    goal = "Put a toy in its marked basket and leave the path clear";
    friction = "The toy is left in the walkway instead of its basket";
    method = `${a} looks for the basket's picture label, carries the toy to that basket and checks the empty walkway`;
    opening = "A toy sits beside a basket with a matching picture label";
    stages = [
      step(
        "notice",
        `${a} notices the toy and matching basket at ${p.setting.description}`,
        opening,
        "notice the matching label",
        "A marked resting place is ready",
        "The routine has concrete materials",
      ),
      step(
        "try",
        `${a} pushes the toy aside but leaves it in the walkway`,
        friction,
        "move the toy without finding its resting place",
        "The path is still occupied",
        "Moving aside does not finish putting away",
      ),
      step(
        "compare",
        `${a} matches the toy to the picture on the basket`,
        "The toy's marked basket is identified",
        "match the object to its place",
        "The picture shows where the toy belongs",
        "A repeatable step is available",
      ),
      step(
        "solve",
        method,
        "The toy rests in the marked basket and the path is clear",
        "carry to the marked place and check",
        "The empty path confirms the result",
        "The putting-away routine is complete",
      ),
      step(
        "settle",
        "The child walks along the clear path and leaves the basket ready for next time",
        "The toy stays stored beside a clear walkway",
        "use the completed routine",
        "The basket remains a familiar cue",
        "A calm repeatable habit closes the activity",
      ),
    ];
  } else {
    title = "The toy finds its basket";
    stages = [
      step(
        "notice",
        `${a} sees a toy and a basket at ${p.setting.description}`,
        opening,
        "notice two familiar materials",
        "The basket is a visible destination",
        "A small activity can begin",
      ),
      step(
        "try",
        `${a} rolls the toy directly toward the basket; it stops at the folded mat`,
        "The toy has stopped before the basket",
        "roll without a smooth path",
        "The folded mat blocks the roll",
        "The first route does not reach the basket",
      ),
      step(
        "compare",
        `${a} compares the folded mat with a flat cardboard strip and lays the strip across the fold`,
        "A smooth cardboard path reaches the basket",
        "replace the interrupted path with a flat strip",
        "A flat path bridges the fold",
        "The toy has a continuous route",
      ),
      step(
        "solve",
        method,
        "The toy reaches the waiting basket along a continuous flat path",
        "roll along the flat strip and catch",
        "The cardboard path supports the complete roll",
        "The small activity finishes visibly",
      ),
      step(
        "settle",
        `${a} stores the strip beside the basket and leaves the toy resting inside`,
        "The toy and cardboard strip are stored beside the clear mat",
        "put away the successful materials",
        "The path can be used again",
        "A concrete activity closes without claiming unknown objective delivery",
      ),
    ];
  }
  // A small set of concrete sub-situations prevents a broad intent label from
  // turning every educational objective into rolling, or every habit into tidying.
  // These are authored editorial scenes, never extracted Library/source facts.
  if (!infant && !calm) {
    const objectiveText = `${r.objective.description} ${r.objective.successScenario}`,
      learning = intent.primaryIntent === "LEARNING_DISCOVERY",
      habit = intent.primaryIntent === "ROUTINE_HABIT";
    type Episode = {
      title: string;
      goal: string;
      opening: string;
      failed: string;
      friction: string;
      change: string;
      changed: string;
      method: string;
      result: string;
      ending: string;
      rest: string;
    };
    let episode: Episode | null = null;
    if (
      learning &&
      /colou?r|ألوان|الوان|shape|اشكال|أشكال/i.test(objectiveText)
    ) {
      const attribute = /colou?r|ألوان|الوان/i.test(objectiveText)
        ? "color"
        : "shape";
      episode = {
        title: `The ${attribute} trays`,
        goal: `Match familiar blocks to picture trays by ${attribute}`,
        opening: `Different blocks rest beside two trays labelled with ${attribute} pictures`,
        failed: `${a} places every block in the nearest tray without comparing the ${attribute} pictures`,
        friction:
          "Different blocks are mixed in one tray and the second tray is empty",
        change: `${a} holds one block beside each picture and notices which ${attribute} matches`,
        changed:
          "One block matches a picture while another belongs in the second tray",
        method: `Compare each block's ${attribute} with the picture, place it in the matching tray and check one new block against the same pictures`,
        result: `Both trays hold blocks matching their ${attribute} pictures, including the newly checked block`,
        ending:
          "The child leaves the picture labels beside the sorted trays for the next game",
        rest: "The sorted blocks and visible labels stay ready together",
      };
    } else if (learning && /float|sink|يطفو|يغرق/i.test(objectiveText)) {
      episode = {
        title: "The cork and the pebble",
        goal: "Observe which of two familiar objects stays at the surface of a shallow supervised bowl",
        opening:
          "A cork, a pebble and a shallow bowl wait beside a familiar adult",
        failed: `${a} guesses that the heavier-looking cork must sink without testing it`,
        friction:
          "The guessed result is untested and the two objects remain beside the bowl",
        change:
          "With the adult nearby, the child lowers the cork and watches it stay at the surface",
        changed:
          "The cork stays at the surface while the pebble remains to be checked",
        method:
          "With adult supervision, lower the pebble, compare its resting place with the cork and repeat each observation without splashing",
        result:
          "The cork is observed at the surface and the pebble at the bowl's bottom in both checks",
        ending: "The adult removes both objects and the child dries the tray",
        rest: "The dry tray and removed objects mark a calm end to the supervised check",
      };
    } else if (habit && /wash|غسل/i.test(objectiveText)) {
      episode = {
        title: "The hands and the waiting towel",
        goal: "Follow a supported wash-and-dry sequence at a familiar basin",
        opening: "Soap and a towel wait beside a familiar basin and adult",
        failed: `${a} reaches straight for the towel before washing`,
        friction: "The towel is ready but the washing step has been skipped",
        change:
          "The adult points to the soap and the child puts the towel back beside the basin",
        changed: "Soap comes before the waiting towel in the visible sequence",
        method:
          "With adult support, use the soap, rinse at the basin and then dry with the waiting towel",
        result:
          "The supported washing steps are complete and the hands are dry",
        ending: "The child returns the towel to its familiar hook",
        rest: "The towel and soap are ready in their places for next time",
      };
    } else if (habit && /brush|teeth|أسنان|اسنان/i.test(objectiveText)) {
      episode = {
        title: "The brush beside the cup",
        goal: "Follow the familiar adult-supported tooth-brushing sequence",
        opening: "A familiar brush and cup wait beside an adult at the basin",
        failed: `${a} puts the brush away before beginning the familiar steps`,
        friction: "The brush is stored but the supported routine has not begun",
        change:
          "The adult brings the brush and cup back together and shows the familiar starting cue",
        changed: "The child and adult have the brush ready at the basin",
        method:
          "Follow the familiar caregiver's brushing cues, finish the supported sequence and return the brush beside the cup",
        result:
          "The supported routine is finished and the brush rests beside its cup",
        ending: "The child leaves the cup and brush in the known place",
        rest: "The known place is ready for the next supported routine",
      };
    } else if (habit && /sleep|bedtime|نوم/i.test(objectiveText)) {
      episode = {
        title: "The book and the resting toy",
        goal: "Put the familiar book and soft toy in their resting places",
        opening: "A familiar book lies open beside a soft toy",
        failed: `${a} opens another page while the toy is waiting for its basket`,
        friction:
          "The book remains open and the toy has not reached its resting place",
        change: `${a} notices the toy's basket and the last familiar picture`,
        changed: "The last picture and waiting basket show the next calm steps",
        method:
          "Carry the toy gently to its basket, close the book after the familiar picture and settle beside both resting places",
        result:
          "The book is closed and the soft toy rests beside a settled child",
        ending: "The child rests while the familiar materials stay nearby",
        rest: "The closed book and resting toy remain in a quiet familiar space",
      };
    }
    if (episode) {
      ({ title, goal, opening, friction, method } = episode);
      stages = [
        step(
          "notice",
          `${opening} at ${p.setting.description}`,
          opening,
          "notice the concrete materials",
          "The materials have distinct visible places",
          "A familiar sequence or test is ready",
        ),
        step(
          "try",
          episode.failed,
          friction,
          "try before checking the visible cue",
          "The skipped or untested step becomes visible",
          "The first strategy does not finish the sequence",
        ),
        step(
          "compare",
          episode.change,
          episode.changed,
          "compare with a visible cue",
          "The relevant difference is now observed",
          "A different supported strategy is available",
        ),
        step(
          habit ? "try" : "discover",
          method,
          episode.result,
          "perform the changed sequence and check",
          "The visible result confirms the concrete operation",
          "The requested practical learning or routine is demonstrated",
        ),
        step(
          "settle",
          episode.ending,
          episode.rest,
          "put materials in their known places",
          "The familiar result remains available",
          "The activity closes without a new conflict",
        ),
      ];
    }
    if (intent.limited && /journey|return|travel|host/i.test(structural)) {
      title = "The toy's short route";
      goal =
        "Guide a toy along a short marked route and bring it back to its basket";
      opening = "A toy rests beside two familiar route markers and its basket";
      friction =
        "The toy stops at a folded corner before reaching the second marker";
      method =
        "Flatten the corner, roll the toy past the second marker, turn it around and bring it back along the same marks to its basket";
      stages = [
        step(
          "notice",
          `${opening} at ${p.setting.description}`,
          opening,
          "notice the two route markers",
          "The basket is also the return point",
          "A short familiar route is visible",
        ),
        step(
          "try",
          "The child rolls the toy past the first mark; it stops at the folded corner",
          friction,
          "follow the first marked route",
          "A folded corner interrupts the route",
          "The destination is not reached yet",
        ),
        step(
          "ask-help",
          "The child asks a familiar helper to hold the mat while the corner is flattened",
          "The flattened corner opens the second part of the marked route",
          "ask for a specific support at the blocked corner",
          "Both marks are linked by a flat path",
          "The toy can continue and return safely",
        ),
        step(
          "return",
          method,
          "The toy has reached the second mark and returned to the waiting basket",
          "follow the known outward and return marks",
          "The same marks work in both directions",
          "The complete short route is demonstrated",
        ),
        step(
          "settle",
          "The child parks the toy and leaves both route markers beside the basket",
          "The parked toy and two marks stay together",
          "store the route materials",
          "The same route can be played again",
          "The familiar return closes the activity",
        ),
      ];
    }
  }
  if (!infant && routine) {
    const resolve = stages[3]!;
    resolve.action = calm ? "notice" : "try";
    stages = [stages[0]!, resolve, stages[4]!];
    stages[2]!.action = "repeat";
  } else if (!infant && g.narrativeForm === "simple-causal") {
    stages = [stages[0]!, stages[1]!, stages[3]!, stages[4]!];
  } else if (!infant && g.narrativeForm === "extended-plot") {
    const preview = stages[2]!;
    stages.splice(
      3,
      0,
      step(
        "try",
        social
          ? `${a} tries the agreed role once while ${b} points to the turn cue`
          : `${a} tries one part of the operation: ${preview.summary}`,
        `A partial trial follows this visible cue: ${preview.state}`,
        `test one part of ${preview.strategy}`,
        `One partial trial checks ${preview.information}`,
        "The partial result is available before completing the whole operation",
        social,
      ),
      step(
        "compare",
        social
          ? `${b} points to the next player's place and ${a} yields the cue before the full round`
          : `${a} stops before finishing and points out the observed change: ${preview.information}`,
        `The observed change is named before the final operation: ${preview.state}`,
        "name the concrete trial result before completing the operation",
        preview.information,
        "The complete operation now follows the observed partial result",
        social,
      ),
    );
  }
  const resolutionIndex = routine ? 1 : stages.length - 2,
    problem =
      friction && !infant
        ? {
            problemId: `${p.revisionId.slice(0, 65)}-problem`,
            description: friction,
          }
        : null,
    beats = stages.map((s, i) => {
      const old = p.beats[i]!;
      return {
        ...old,
        action: s.action,
        actorId: participants.length
          ? participants[i % participants.length]!
          : null,
        beforeState: i ? stages[i - 1]!.state : opening,
        afterState: s.state,
        summary: s.summary,
        progress: s.consequence,
        addressesProblemId: problem && i > 0 ? problem.problemId : null,
        introduces: i === 0 ? participants : [],
        achievesGoalId: i === resolutionIndex ? p.goal.goalId : null,
      };
    });
  const plan = {
    ...p,
    schemaVersion: "story-plan/1.1",
    title,
    goal: { ...p.goal, description: goal },
    openingState: opening,
    problem,
    stakes: problem
      ? "The familiar play or task remains incomplete; comfort and support stay available"
      : null,
    need:
      infant || calm
        ? null
        : "Change the ineffective first strategy using a visible cue and supported action",
    incitingBeatId: problem ? beats[1]!.beatId : null,
    turningBeatId:
      g.conventionalPlot && !calm ? beats[resolutionIndex - 1]!.beatId : null,
    climaxBeatId:
      g.conventionalPlot && !calm ? beats[resolutionIndex]!.beatId : null,
    discovery: infant ? null : stages[resolutionIndex]!.information,
    beats,
    quality: {
      schemaVersion: "planner-quality/1.0",
      objectiveIntent: intent,
      structuralCompatibility: compatibility,
      situation: {
        focus: infant
          ? "soft shape"
          : intent.primaryIntent === "SHARING_TURN_TAKING"
            ? focus
            : opening,
        initialFriction: friction,
        resolutionMethod: method,
        basis: "EDITORIAL_SITUATION_NOT_SOURCE_FACT",
      },
      transitions: stages.map((s, i) => ({
        beatId: beats[i]!.beatId,
        participantIds: s.social
          ? participants
          : beats[i]!.actorId
            ? [beats[i]!.actorId!]
            : [],
        strategy: s.strategy,
        informationChange: s.information,
        relationshipChange: s.relationship,
        consequence: s.consequence,
        resolutionMethod: i === resolutionIndex ? method : null,
      })),
    },
    provenance: {
      ...p.provenance,
      limitations: [
        ...p.provenance.limitations,
        ...(intent.limited
          ? [
              "General intent has limited rule coverage; this concrete activity is a proposal, not verified objective delivery.",
            ]
          : []),
        ...(compatibility.level === "MISMATCH"
          ? [
              "Explicit selected structure lacks intent evidence; review or select a compatible family before acceptance.",
            ]
          : []),
      ],
      selectionSignals: [
        ...p.provenance.selectionSignals,
        `Detected intent: ${intent.primaryIntent}; evidence: ${intent.evidence.map((e) => `${e.field}:${e.matched}`).join("; ")}`,
        `Structural compatibility: ${compatibility.level}; ${compatibility.reasons[0]}`,
      ],
    },
  };
  return QualityStoryPlanSchema.parse(plan);
}

const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/[\s\p{P}]+/gu, " ")
    .trim();
// Remove enumerated attempt labels, not substantive quantities (e.g. two
// counted blocks). A counter alone is not new strategy/information/consequence.
const progressionText = (s: string) =>
  normalized(
    s.replace(
      /\b(?:attempt|approach|step|try)\s*#?\s*[0-9٠-٩]+\b|(?:المحاولة|محاولة|الخطوة|خطوة)\s*[0-9٠-٩]+/giu,
      "",
    ),
  );
export function qualityFindings(p: QualityPlan): QaFinding[] {
  const result: QaFinding[] = [],
    add = (
      category: string,
      location: string,
      message: string,
      severity: QaFinding["severity"] = "medium",
    ) =>
      result.push({
        findingId: `quality-${result.length + 1}`,
        category,
        location,
        message,
        severity,
        suggestedAction:
          "Review the concrete situation, source match and observable transition; do not infer literary certification.",
      });
  const q = p.quality,
    g = p.guidance,
    map = new Map(q.transitions.map((t) => [t.beatId, t]));
  for (const [location, description] of [
    ["goal", p.goal.description],
    ["problem", p.problem?.description ?? ""],
  ] as const)
    if (
      /^Practice |^The first approach does not yet achieve/i.test(description)
    )
      add(
        "GENERIC_BEAT_DESCRIPTION",
        location,
        "A known objective-template placeholder survived instead of a concrete editorial situation.",
      );
  if (
    JSON.stringify(q.objectiveIntent) !==
    JSON.stringify(detectObjectiveIntent(p.planning.request.objective))
  )
    add(
      "INTENT_STRUCTURE_MISMATCH",
      "quality.objectiveIntent",
      "Declared intent evidence differs from the bounded rules for this request.",
      "high",
    );
  if (q.structuralCompatibility.level === "MISMATCH")
    add(
      "INTENT_STRUCTURE_MISMATCH",
      "quality.structuralCompatibility",
      "The explicit selected source has no structural evidence for the requested intent.",
      "high",
    );
  if (q.objectiveIntent.limited || q.structuralCompatibility.level === "REVIEW")
    add(
      "INTENT_STRUCTURE_MISMATCH",
      "quality",
      "Limited intent/source coverage requires creator review; no strong match claimed.",
    );
  if (
    map.size !== p.beats.length ||
    q.transitions.length !== p.beats.length ||
    q.transitions.some((t) => !p.beats.some((b) => b.beatId === t.beatId))
  )
    add(
      "NON_PROGRESSING_BEATS",
      "quality.transitions",
      "Every major beat requires exactly one explicit quality transition.",
      "high",
    );
  const active = new Set<string>(),
    introduced = new Set<string>();
  for (const [i, b] of p.beats.entries()) {
    b.introduces.forEach((id) => introduced.add(id));
    const t = map.get(b.beatId),
      prev = i ? p.beats[i - 1] : null,
      old = prev ? map.get(prev.beatId) : null;
    if (t && new Set(t.participantIds).size !== t.participantIds.length)
      add(
        "SOCIAL_INTENT_CAST_MISMATCH",
        b.beatId,
        "Active participants must be distinct; repeated IDs are not additional actors.",
        "high",
      );
    for (const id of t?.participantIds ?? []) {
      if (
        !introduced.has(id) ||
        !p.characters.some((c) => c.characterId === id)
      )
        add(
          "SOCIAL_INTENT_CAST_MISMATCH",
          b.beatId,
          "Active participant is not declared and introduced.",
          "high",
        );
      active.add(id);
    }
    if (
      /\bApproach \d|next visible clue|^Introduce Practice|^Practice |\b(?:discovery|cooperation|journey|helping) enables\b/i.test(
        b.summary,
      ) ||
      normalized(b.summary).startsWith(
        normalized(`${p.provenance.mechanism} enables`),
      )
    )
      add(
        "GENERIC_BEAT_DESCRIPTION",
        b.beatId,
        "Known placeholder-style summary survived into the human-facing plan.",
      );
    if (
      g.conventionalPlot &&
      b.role !== "ENDING" &&
      b.role !== "OPENING" &&
      (progressionText(b.beforeState) === progressionText(b.afterState) ||
        (prev &&
          t &&
          old &&
          ((b.action === prev.action &&
            progressionText(b.summary) === progressionText(prev.summary)) ||
            (progressionText(t.strategy) === progressionText(old.strategy) &&
              progressionText(t.informationChange) ===
                progressionText(old.informationChange) &&
              progressionText(t.relationshipChange) ===
                progressionText(old.relationshipChange) &&
              progressionText(t.consequence) ===
                progressionText(old.consequence)))))
    )
      add(
        "NON_PROGRESSING_BEATS",
        b.beatId,
        "No meaningful change in strategy, state, information, relationship or consequence.",
        "high",
      );
  }
  if (
    q.objectiveIntent.socialMechanisms.length &&
    g.narrativeForm !== "recognition" &&
    g.activeCharacterRange[1] >= 2 &&
    (active.size < 2 ||
      new Set(map.get(p.resolutionBeatId)?.participantIds ?? []).size < 2)
  )
    add(
      "SOCIAL_INTENT_CAST_MISMATCH",
      "quality.transitions",
      "Social intent needs two active participants in the reciprocal or joint resolution, not merely two declared names.",
      "high",
    );
  const requested = [
      p.planning.request.objective.description,
      p.planning.request.objective.successScenario,
    ]
      .map(normalized)
      .filter((t) => t.length >= 16),
    texts = [
      p.goal.description,
      p.problem?.description ?? "",
      ...p.beats.map((b) => b.summary),
    ],
    echoes = texts.filter((t) =>
      requested.some((o) => normalized(t).includes(o)),
    );
  if (echoes.length >= 2)
    add(
      "OBJECTIVE_RESTATEMENT",
      "plan",
      "Goal/problem/beats excessively copy the request instead of concrete editorial actions.",
    );
  const resolution = p.beats.find((b) => b.beatId === p.resolutionBeatId),
    rt = map.get(p.resolutionBeatId);
  if (
    !rt?.resolutionMethod ||
    rt.resolutionMethod.trim().split(/\s+/).length < 4 ||
    requested.some((o) => normalized(rt.resolutionMethod ?? "") === o) ||
    normalized(rt.resolutionMethod) !==
      normalized(q.situation.resolutionMethod) ||
    /\benables\b|^visible achievement|^goal achieved/i.test(
      resolution?.summary ?? "",
    ) ||
    requested.some((o) => normalized(resolution?.summary ?? "") === o)
  )
    add(
      "WEAK_RESOLUTION_MECHANISM",
      "resolutionBeatId",
      "Resolution must explain a concrete operation that makes the outcome true, not just name the goal.",
    );
  return result;
}
