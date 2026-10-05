import {
  ageBandFor,
  type AgeProfile,
  type Approval,
  type Dependency,
  type LanguageMode,
  type StoryBlueprint,
  type Project,
  type LanguageEdition,
  type CharacterBible,
  AppError,
} from "@hekayti/contracts";

const profiles: readonly AgeProfile[] = [
  {
    id: "0-11m",
    version: "age-profiles/0.1",
    authority: "editorial-D/H",
    words: [0, 40],
    pages: [6, 10],
    wordsPerPage: [0, 5],
    sentenceWords: [1, 4],
    cast: [0, 1],
    events: [0, 0],
    vocabulary: "Familiar nouns/sounds",
    repetition: "High exact refrain",
    visualComplexity: "One focal subject; uncluttered separation",
    emotions: "Warm faces and familiar recognition",
    education: "Naming, sounds, familiar objects",
    plot: "Not required; recognition units rather than plot",
    dialogue: "Virtually none",
    narration: "Caregiver labels/sound imitation; stop freely",
    interaction: "Point/name/respond to looks or sounds",
    adventure: "No adventure",
    adventureEligible: false,
  },
  {
    id: "12-23m",
    version: "age-profiles/0.1",
    authority: "editorial-D/H",
    words: [20, 100],
    pages: [8, 12],
    wordsPerPage: [2, 10],
    sentenceWords: [2, 6],
    cast: [1, 2],
    events: [1, 3],
    vocabulary: "Everyday nouns/actions; one concrete clause",
    repetition: "High repeat with one change",
    visualComplexity: "One action, few large objects",
    emotions: "Gentle familiar routines",
    education: "Hello/goodbye, in/out, naming",
    plot: "Optional routine mini-story",
    dialogue: "Tiny exchanges",
    narration: "Warm, slow; caregiver supports action",
    interaction: "Invite gesture or one word; revisit pages",
    adventure: "No peril/quest",
    adventureEligible: false,
  },
  {
    id: "24-35m",
    version: "age-profiles/0.1",
    authority: "editorial-D/H",
    words: [60, 180],
    pages: [8, 14],
    wordsPerPage: [4, 15],
    sentenceWords: [3, 9],
    cast: [2, 3],
    events: [2, 4],
    vocabulary: "Concrete sequencing; occasional linked clauses",
    repetition: "Recurring refrain",
    visualComplexity: "One key change per page; stable setting",
    emotions: "Simple supported feelings",
    education: "Simple cause/result; adult-modeled turn-taking",
    plot: "Short linked events",
    dialogue: "Short exchanges",
    narration: "Natural rhythm with response pauses",
    interaction: "Two familiar choices; caregiver models",
    adventure: "Small familiar exploration; no villain/subplot",
    adventureEligible: true,
  },
  {
    id: "36-59m",
    version: "age-profiles/0.1",
    authority: "editorial-D/H",
    words: [120, 400],
    pages: [12, 20],
    wordsPerPage: [8, 25],
    sentenceWords: [4, 12],
    cast: [2, 4],
    events: [3, 6],
    vocabulary: "Explain one unfamiliar word in context",
    repetition: "Moderate",
    visualComplexity: "Clear foreground, limited scene anchors",
    emotions: "Friendship and supported problem solving",
    education: "Choices/comparison/cooperation",
    plot: "One short plot; 1-3 short sentences per page",
    dialogue: "Brief dialogue plus narration",
    narration: "Reassuring, unhurried",
    interaction: "Optional prediction/feeling question, not quiz",
    adventure: "Bounded reassuring adventure",
    adventureEligible: true,
  },
  {
    id: "60-95m",
    version: "age-profiles/0.1",
    authority: "editorial-D/H",
    words: [250, 700],
    pages: [16, 28],
    wordsPerPage: [12, 35],
    sentenceWords: [5, 16],
    cast: [3, 5],
    events: [5, 8],
    vocabulary: "Simple varied sentences; supported inference/metaphor",
    repetition: "Optional refrain",
    visualComplexity: "More clues with explicit hierarchy",
    emotions: "Simple viewpoints",
    education: "Practical concepts and sequences",
    plot: "One main plot and small subproblem",
    dialogue: "Balanced dialogue/narration",
    narration: "Read-aloud still supported; independent literacy not assumed",
    interaction: "Retelling/why/how and safe off-screen activity",
    adventure: "One contained subproblem, no sprawling lore",
    adventureEligible: true,
  },
];
export function ageGuidance(input: {
  ageMonths?: number;
  ageBandId?: AgeProfile["id"];
  mode: LanguageMode;
  category: string;
  readingMode?: "adult-read" | "emerging-reader";
}) {
  const band =
    input.ageMonths === undefined
      ? input.ageBandId
      : ageBandFor(input.ageMonths);
  const found = profiles.find((p) => p.id === band);
  if (!found)
    throw new AppError(
      "AGE_UNSUPPORTED",
      "Choose an exact age from 0 to 95 months or a supported age band.",
    );
  if (input.ageBandId && input.ageBandId !== found.id)
    throw new AppError("AGE_MISMATCH", "Age and selected band disagree.");
  const profile = structuredClone(found);
  const eligible = !["0-11m", "12-23m"].includes(profile.id);
  return {
    profile,
    language: { mode: input.mode, complexity: profile.vocabulary },
    video: {
      eligible,
      authority: "editorial-product-policy",
      reason: eligible
        ? "Finite caregiver co-viewing only; no autoplay."
        : "Under-two child-facing video excluded by conservative product policy.",
    },
    evidence: [
      {
        authority: "research-E",
        source: "https://www.cdc.gov/act-early/milestones/index.html",
        finding:
          "Milestones describe population observations, not individual diagnoses or precise story budgets.",
      },
      {
        authority: "research-E",
        source: "https://www.who.int/publications/i/item/9789241550536",
        finding:
          "WHO screen guidance informs the product policy; it is not a safe video-duration formula.",
      },
    ],
    warnings: [
      ...(input.ageMonths === undefined
        ? ["Band-only guidance; exact age required before story approval."]
        : []),
      ...(input.category === "adventure" && !profile.adventureEligible
        ? [
            "Adventure is not suitable for this profile; use familiar recognition/routine instead.",
          ]
        : []),
      "All numeric budgets are provisional editorial advice, not medical certainty or guaranteed outcomes.",
    ],
  };
}
export function adviseBlueprint(b: StoryBlueprint): string[] {
  const p = ageGuidance({
    ageMonths: b.ageMonths,
    mode: b.primaryLanguageMode,
    category: b.primaryCategory,
  }).profile;
  const warnings: string[] = [];
  for (const e of b.languageVersions)
    if (e.totalWords < p.words[0] || e.totalWords > p.words[1])
      warnings.push(`${e.mode}: word total outside advisory range.`);
  if (b.pagePlan.length < p.pages[0] || b.pagePlan.length > p.pages[1])
    warnings.push("Page count outside advisory range.");
  return warnings;
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
      .join(",")}}`;
  throw new AppError(
    "HASH_INPUT",
    "Hash inputs must be JSON values; no undefined or non-finite numbers.",
  );
}
export async function contentHash(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function approvalState(
  approval: Approval,
  current: readonly Dependency[],
): "approved" | "stale" {
  const byId = new Map(current.map((d) => [d.id, d]));
  const target = byId.get(approval.targetId);
  if (
    !target ||
    target.hash !== approval.hash ||
    target.revisionId !== approval.revisionId
  )
    return "stale";
  return approval.dependencies.every(
    (d) =>
      byId.get(d.id)?.hash === d.hash &&
      byId.get(d.id)?.revisionId === d.revisionId,
  )
    ? "approved"
    : "stale";
}
export interface DependentArtifact {
  id: string;
  dependencies: string[];
  state: "candidate" | "approved" | "stale";
}
export function invalidateDependents(
  changedIds: readonly string[],
  artifacts: readonly DependentArtifact[],
): DependentArtifact[] {
  if (new Set(artifacts.map((a) => a.id)).size !== artifacts.length)
    throw new AppError("DEPENDENCY_DUPLICATE", "Artifact IDs must be unique.");
  const affected = new Set(changedIds);
  let progress = true;
  while (progress) {
    progress = false;
    for (const a of artifacts)
      if (
        !affected.has(a.id) &&
        a.dependencies.some((id) => affected.has(id))
      ) {
        affected.add(a.id);
        progress = true;
      }
  }
  return artifacts.map((a) => ({
    ...a,
    dependencies: [...a.dependencies],
    state: affected.has(a.id) ? "stale" : a.state,
  }));
}
export interface ProjectRepository {
  createProject(p: Project): void;
  loadProject(id: string): Project | null;
  updateProject(p: Project, expectedVersion: number): Project;
  listProjects(): Project[];
  saveBlueprint(b: StoryBlueprint): void;
  loadBlueprint(revisionId: string): StoryBlueprint | null;
  saveEdition(e: LanguageEdition): void;
  saveCharacter(projectId: string, c: CharacterBible): void;
  close(): void;
}
export interface AssetReference {
  uri: string;
  hash: string;
  bytes: number;
  bucket: "source" | "generated" | "temp" | "exports";
  projectId: string;
}
export interface AssetStore {
  put(
    projectId: string,
    bucket: AssetReference["bucket"],
    bytes: Uint8Array,
    extension: string,
  ): Promise<AssetReference>;
  get(ref: AssetReference): Promise<Uint8Array>;
}
