import type { Project, StoryBlueprint, StoryRequest } from "@hekayti/contracts";
import type { WorkflowSnapshot } from "@hekayti/core/workflow";
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
export interface DesktopApi {
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
