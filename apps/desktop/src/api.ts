import type { Project, StoryBlueprint, StoryRequest } from "@hekayti/contracts";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";
import type {
  LibraryState,
  GenerationPackage,
  LibraryRecord,
  ManualImport,
} from "@hekayti/contracts/library";
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
export interface DesktopApi {
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
