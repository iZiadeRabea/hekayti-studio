// Astra-owned minimum shared contracts, frozen before Phase 3 Wave 1.
// Runtime schemas are implemented separately by the explicitly delegated Story worker.
import type {
  AgeProfile,
  CharacterBible,
  LanguageEdition,
  LanguageMode,
  StoryBlueprint,
  StoryObjective,
  SyntheticPersonalization,
} from "./index";

export type StoryCategory = Exclude<
  StoryBlueprint["primaryCategory"],
  "personalized"
>;
export type SourceStrategy = "manual" | "curated" | "ai" | "hybrid";
export type LocalizedText = Record<LanguageMode, string>;
export interface TrustedFact {
  factId: string;
  statement: string;
  sourceReference: string;
  reviewStatus: "unreviewed" | "human-reviewed";
  reviewerAlias: string | null;
}
export interface StoryRequest {
  schemaVersion: "story-request/1.0";
  requestId: string;
  revisionId: string;
  projectId: string;
  storyId: string;
  ageMonths: number;
  languageModes: LanguageMode[];
  primaryLanguageMode: LanguageMode;
  primaryCategory: StoryCategory;
  objective: StoryObjective;
  theme: string;
  readingMode: "adult-read" | "emerging-reader";
  personalization: SyntheticPersonalization;
  sourceStrategy: SourceStrategy;
  trustedFacts: TrustedFact[];
  outputIntents: ("print" | "digital" | "video")[];
}
export interface StoryStructureProfile {
  ageBandId: AgeProfile["id"];
  authority: "editorial-D/H";
  narrativeForm:
    | "recognition"
    | "routine"
    | "simple-causal"
    | "short-plot"
    | "extended-plot";
  conventionalPlot: boolean;
  beatRange: [number, number];
  activeCharacterRange: [number, number];
  pageRange: [number, number];
  wordsPerPage: [number, number];
  sentenceWords: [number, number];
  allowedMechanisms: string[];
  conflict: "none" | "supported-friction" | "bounded-problem";
  repetition: string;
  vocabulary: string;
  dialogue: string;
  emotionalComplexity: string;
  adventure: string;
  educationalComplexity: string;
  parentParticipation: string;
  durationGuidance: string;
  warnings: string[];
}
export type IdeaComponentKind =
  | "theme"
  | "objective"
  | "setting"
  | "character-archetype"
  | "mechanism"
  | "challenge"
  | "conflict"
  | "discovery"
  | "resolution"
  | "emotional-goal"
  | "educational-goal";
export interface IdeaComponent {
  componentId: string;
  kind: IdeaComponentKind;
  label: LocalizedText;
  description: string;
}
export type BeatAction =
  | "recognize"
  | "reveal"
  | "repeat"
  | "notice"
  | "try"
  | "compare"
  | "ask-help"
  | "cooperate"
  | "discover"
  | "solve"
  | "return"
  | "settle";
export interface StoryBeat {
  beatId: string;
  sequence: number;
  action: BeatAction;
  actorId: string | null;
  focus: LocalizedText;
  detail: LocalizedText;
  emotion: string;
  beforeState: string;
  afterState: string;
  visibleFacts: string[];
  factIds: string[];
}
export interface ProviderProvenance {
  kind: SourceStrategy | "mock";
  providerId: string;
  version: string;
  deterministic: boolean;
}
export interface StoryConcept {
  conceptId: string;
  requestId: string;
  requestRevisionId: string;
  title: string;
  premise: string;
  primaryCategory: StoryCategory;
  objective: StoryObjective;
  setting: LocalizedText;
  mainCharacterId: string | null;
  characters: CharacterBible[];
  coreChallenge: string;
  resolutionDirection: string;
  ageFitSummary: string;
  mechanism: string;
  components: IdeaComponent[];
  outline: StoryBeat[];
  provenance: ProviderProvenance;
}
export interface ConceptSet {
  schemaVersion: "concept-set/1.0";
  conceptSetId: string;
  requestId: string;
  requestRevisionId: string;
  generation: number;
  concepts: StoryConcept[];
}
export interface QaFinding {
  findingId: string;
  severity: "blocker" | "high" | "medium" | "low";
  category: string;
  location: string;
  message: string;
  suggestedAction: string;
}
export interface ConceptEvaluation {
  conceptId: string;
  structuralSignature: string;
  findings: QaFinding[];
  humanSelectionRequired: true;
}
export interface StoryDraft {
  schemaVersion: "story-draft/1.0";
  draftId: string;
  sourceRevision: string;
  conceptId: string;
  editions: LanguageEdition[];
  provenance: ProviderProvenance;
  status: "draft";
}
export interface StoryQaReport {
  reportId: string;
  sourceRevision: string;
  contentHash: string;
  findings: QaFinding[];
  humanReviewRequired: true;
  method: "deterministic-advisory";
}
export interface StoryConceptProvider {
  readonly provenance: ProviderProvenance;
  createConcepts(
    request: StoryRequest,
    structure: StoryStructureProfile,
    generation: number,
  ): Promise<ConceptSet>;
}
export interface StoryDraftProvider {
  readonly provenance: ProviderProvenance;
  createDraft(
    request: StoryRequest,
    concept: StoryConcept,
    blueprint: StoryBlueprint,
    draftId: string,
  ): Promise<StoryDraft>;
}
