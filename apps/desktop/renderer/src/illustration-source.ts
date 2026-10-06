import type { IllustrationSnapshot } from "@hekayti/contracts/illustration";
import type { StoryReaderModel } from "@hekayti/contracts/creator";

export function illustrationSourceMatches(
  snapshot: IllustrationSnapshot,
  reader: StoryReaderModel,
): boolean {
  return (
    !!snapshot.plan &&
    snapshot.plan.projectId === reader.projectId &&
    snapshot.plan.draftId === reader.draftId &&
    snapshot.plan.mode === reader.mode
  );
}
// Every snapshot, including current PREPARE after historical selection, binds
// to its retained source. No substitution by page number or current draft.
export async function resolveIllustrationReader(
  snapshot: IllustrationSnapshot,
  reader: StoryReaderModel,
  load: (input: {
    projectId: string;
    draftId: string;
    mode: StoryReaderModel["mode"];
  }) => Promise<StoryReaderModel | undefined>,
): Promise<StoryReaderModel> {
  if (!snapshot.plan || illustrationSourceMatches(snapshot, reader))
    return reader;
  const exact = await load({
    projectId: snapshot.plan.projectId,
    draftId: snapshot.plan.draftId,
    mode: snapshot.plan.mode,
  });
  if (!exact || !illustrationSourceMatches(snapshot, exact))
    throw new Error("CREATOR_ILLUSTRATION_SOURCE");
  return exact;
}
