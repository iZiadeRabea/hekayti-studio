import type { StoryReaderModel } from "@hekayti/contracts/creator";
export function readerNoticePage(model: StoryReaderModel, location: string) {
  const indexed =
    /^blueprint\.languageVersions\.(ar-EG|ar-MSA-simple|en)\.pages\.(\d+)$/.exec(
      location,
    );
  if (indexed) {
    const index = Number(indexed[2]);
    const page =
      Number.isSafeInteger(index) && index >= 0
        ? model.pages[index]
        : undefined;
    return page && model.availableModes.includes(indexed[1]!)
      ? { page, mode: indexed[1]! }
      : undefined;
  }
  const parts = location.split(/[/.]/);
  const page = model.pages.find((x) => parts.includes(x.pageId));
  const mode = parts.find((x) => model.availableModes.includes(x));
  return page ? { page, mode } : undefined;
}
