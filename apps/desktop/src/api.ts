import type { Project, StoryBlueprint, StoryRequest } from "@hekayti/contracts";
import type { LanguageMode } from "@hekayti/contracts";
import type {
  BookDefaults,
  BookStudioSnapshot,
  BookCommand,
  SelectBookAssets,
} from "@hekayti/contracts/book";
import type { SimpleCreateInput } from "@hekayti/contracts/creator";
import type {
  SimpleDefaults,
  SimpleCommand,
  SimpleStoryList,
  StoryReaderModel,
  StoryCompareModel,
} from "@hekayti/contracts/creator";
import type {
  IllustrationSnapshot,
  IllustrationCommand,
} from "@hekayti/contracts/illustration";
import type { SimpleSession } from "@hekayti/core/creator";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";
import type {
  PlannerSnapshot,
  PlanPackage,
  WriterPreview,
} from "@hekayti/contracts/planner";
import type {
  LibraryState,
  GenerationPackage,
  LibraryRecord,
  ManualImport,
} from "@hekayti/contracts/library";
export type Result<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        target?: import("@hekayti/contracts").AppError["target"];
      };
    };
export interface DesktopApi {
  studioDefaults(input: {
    ageMonths: number;
    category: string;
    goalPreset: string;
    mode: LanguageMode;
  }): Promise<Result<BookDefaults>>;
  studioCreate(input: SimpleCreateInput): Promise<Result<BookStudioSnapshot>>;
  studioLoad(input: {
    projectId: string;
    mode?: LanguageMode;
  }): Promise<Result<BookStudioSnapshot>>;
  studioCommand(input: BookCommand): Promise<Result<BookStudioSnapshot>>;
  studioSelectAssets(
    input: SelectBookAssets,
  ): Promise<Result<BookStudioSnapshot | null>>;
  studioAssetPreview(input: {
    projectId: string;
    assetId: string;
    thumbnail?: boolean;
  }): Promise<Result<string | null>>;
  studioReadiness(input: { projectId: string; expectedBook: number; mode?: LanguageMode }): Promise<Result<import("@hekayti/contracts/book").BookReadiness>>;
  studioRelinkAsset(input: {
    projectId: string;
    expectedBook: number;
    assetId: string;
  }): Promise<Result<BookStudioSnapshot | null>>;
  studioPreview(input: {
    projectId: string;
    expectedBook: number;
  }): Promise<
    Result<{
      html: string;
      pages: number;
      errors: { boxId: string; page: string; reason: string }[];
    }>
  >;
  studioShowPreview(input: {
    projectId: string;
    expectedBook: number;
  }): Promise<
    Result<{
      pages: number;
      errors: { boxId: string; page: string; reason: string }[];
    }>
  >;
  studioExport(input: {
    projectId: string;
    expectedBook: number;
    kind: "digital" | "print";
  }): Promise<Result<{ path: string; pages: number; sha256: string } | null>>;
  simpleDefaults(): Promise<Result<SimpleDefaults>>;
  simpleCommand(input: SimpleCommand): Promise<Result<SimpleSession>>;
  simpleLoad(input: {
    projectId: string;
    mode?: LanguageMode;
  }): Promise<Result<SimpleSession>>;
  simpleList(input: {
    query?: string;
    offset?: number;
    limit?: number;
    mode?: LanguageMode;
  }): Promise<Result<SimpleStoryList>>;
  simpleReader(input: {
    projectId: string;
    draftId?: string;
    mode: LanguageMode;
  }): Promise<Result<StoryReaderModel>>;
  simpleCompare(input: {
    projectId: string;
    leftDraftId: string;
    rightDraftId: string;
    mode: LanguageMode;
  }): Promise<Result<StoryCompareModel>>;
  simpleStarter(input: {
    expectedLibrary: number;
    publicCreativeReviewed: true;
  }): Promise<Result<{ added: number; replayed: number }>>;
  illustrationLoad(input: {
    projectId: string;
    mode?: LanguageMode;
    planId?: string;
  }): Promise<Result<IllustrationSnapshot>>;
  illustrationCommand(
    input: IllustrationCommand,
  ): Promise<Result<IllustrationSnapshot & { text?: string }>>;
  plannerLoad(projectId: string): Promise<Result<PlannerSnapshot | null>>;
  plannerCommand(input: Record<string, unknown>): Promise<
    Result<{
      planner: PlannerSnapshot;
      workflow?: WorkflowSnapshot;
      package?: PlanPackage;
      text?: string;
      preview?: WriterPreview;
    }>
  >;
  libraryPage(input: Record<string, unknown>): Promise<
    Result<{
      recordVersion: number;
      total: number;
      offset: number;
      limit: number;
      records: LibraryRecord[];
    }>
  >;
  starterImport(input: {
    expectedVersion: number;
    publicCreativeReviewed: true;
    profile?: "EGYPTIAN_ARAB_MUSLIM_FAMILY" | "GENERAL_FAMILY";
  }): Promise<Result<{ added: number; replayed: number }>>;
  creativeBatchOpen(input: {
    expectedVersion: number;
    publicCreativeReviewed: true;
  }): Promise<Result<{ added: number; replayed: number } | null>>;
  creativeExport(input: {
    publicCreativeReviewed: true;
  }): Promise<Result<{ path: string; sha256: string; bytes: number } | null>>;
  creativePreview(): Promise<
    Result<{
      previewId: string;
      digest: string;
      expectedVersion: number;
      total: number;
      add: number;
      replay: number;
      conflicts: { recordId: string; title: string; decision: string }[];
      exclusions: string[];
      notice: string;
    } | null>
  >;
  creativeRestore(input: {
    previewId: string;
    digest: string;
    expectedVersion: number;
    choice: "KEEP_EXISTING" | "COPY_WITH_NEW_IDS";
  }): Promise<
    Result<{
      added: number;
      replayed: number;
      kept: number;
      recordVersion: number;
    }>
  >;
  bridgeCopy(input: Record<string, unknown>): Promise<Result<boolean>>;
  libraryLoad(): Promise<Result<LibraryState>>;
  librarySeed(): Promise<Result<LibraryState>>;
  libraryCommand(input: Record<string, unknown>): Promise<Result<LibraryState>>;
  bridgePrepare(
    input: Record<string, unknown>,
  ): Promise<Result<GenerationPackage>>;
  bridgeText(input: {
    packageId: string;
    target: "CHATGPT" | "GEMINI" | "GENERIC";
  }): Promise<Result<string>>;
  bridgeLoad(packageId: string): Promise<Result<GenerationPackage | null>>;
  bridgeImport(
    input: Record<string, unknown>,
  ): Promise<Result<{ library: LibraryState; imported: ManualImport }>>;
  bridgeUse(input: Record<string, unknown>): Promise<Result<WorkflowSnapshot>>;
  manualDraftText(projectId: string): Promise<Result<string>>;
  manualDraftImport(input: {
    projectId: string;
    expectedVersion: number;
    json: string;
  }): Promise<Result<WorkflowSnapshot>>;
  newStory(request: StoryRequest): Promise<Result<WorkflowSnapshot>>;
  loadStory(projectId: string): Promise<Result<WorkflowSnapshot | null>>;
  reviseStory(input: {
    projectId: string;
    expectedVersion: number;
    request: StoryRequest;
  }): Promise<Result<WorkflowSnapshot>>;
  storyAction(input: {
    projectId: string;
    expectedVersion: number;
    action: "create-more" | "select" | "build" | "draft" | "qa" | "approve";
    conceptId?: string;
    reviewerAlias?: string;
    advisoryAcknowledged?: boolean;
  }): Promise<Result<WorkflowSnapshot>>;
  listProjects(): Promise<Result<Project[]>>;
  seedSynthetic(): Promise<Result<Project[]>>;
  inspectProject(id: string): Promise<Result<StoryBlueprint>>;
  updateTitle(input: {
    projectId: string;
    title: string;
    expectedVersion: number;
  }): Promise<Result<Project>>;
  openProject(): Promise<
    Result<{ blueprint: StoryBlueprint; migrations: string[] } | null>
  >;
  saveProject(id: string): Promise<Result<string | null>>;
  exportProof(): Promise<
    Result<{ print: string; digital: string; pageCount: number }>
  >;
  diagnostics(): Promise<Result<Record<string, unknown>>>;
}
