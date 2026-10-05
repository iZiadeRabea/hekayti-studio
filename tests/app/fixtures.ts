import { readFileSync } from "node:fs";
import { loadBlueprint, type Project } from "@hekayti/contracts";
export const names = ["test-a-under-1", "test-b-1-to-2", "test-c-3-plus"];
export const legacy = (name = names[1]!) =>
  JSON.parse(
    readFileSync(
      new URL(`../../examples/test-stories/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
export const fixture = (name = names[1]!) =>
  loadBlueprint(legacy(name)).blueprint;
export function project(id = "demo-product-design"): Project {
  return {
    schemaVersion: "project/1.0",
    projectId: id,
    title: "Synthetic demo only",
    origin: "synthetic",
    createdAt: "2026-10-06T00:00:00Z",
    updatedAt: "2026-10-06T00:00:00Z",
    recordVersion: 0,
  };
}
