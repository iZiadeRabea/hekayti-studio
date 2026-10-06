import { build as bundle } from "esbuild";
import { build as vite } from "vite";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("apps/desktop/dist/fixtures", { recursive: true });
await bundle({
  entryPoints: ["apps/desktop/src/main.ts"],
  outfile: "apps/desktop/dist/main.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron"],
  sourcemap: false,
});
await bundle({
  entryPoints: ["apps/desktop/src/preload.ts"],
  outfile: "apps/desktop/dist/preload.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  external: ["electron"],
  sourcemap: false,
});
await vite({
  root: "apps/desktop/renderer",
  base: "./",
  build: { outDir: "../dist/renderer", emptyOutDir: false },
});
for (const name of ["test-a-under-1", "test-b-1-to-2", "test-c-3-plus"])
  await copyFile(
    `examples/test-stories/${name}.json`,
    `apps/desktop/dist/fixtures/${name}.json`,
  );
await copyFile("examples/starter-library/starter-library.jsonl","apps/desktop/dist/fixtures/starter-library.jsonl");
await mkdir("apps/desktop/dist/fonts", { recursive: true });
for (const subset of ["arabic", "latin"])
  await copyFile(
    `node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-${subset}-400-normal.woff2`,
    `apps/desktop/dist/fonts/${subset}.woff2`,
  );
await copyFile(
  "node_modules/@fontsource/noto-sans-arabic/LICENSE",
  "apps/desktop/dist/fonts/OFL.txt",
);
console.log(
  "PASS production bundle: main/preload/renderer/fixtures/fonts+licence",
);
