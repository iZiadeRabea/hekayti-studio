import type { Project, StoryBlueprint } from "@hekayti/contracts";
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } };
export interface DesktopApi {
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
