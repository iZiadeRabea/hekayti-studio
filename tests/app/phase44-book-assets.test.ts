import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  writeFile,
  unlink,
  readFile,
  symlink,
  rm,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PrivateBookAssetStore, sniffImage } from "@hekayti/persistence";
import {
  AssetManifestSchema,
  SelectBookAssetsSchema,
  TextBoxSchema,
} from "@hekayti/contracts/book";
// Actual synthetic 1x1 PNG; the unit decoder is a controlled port, not a claim of native visual QA.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=",
  "base64",
);
test("private media copies opaque hashes, survives missing/relink and rejects alteration", async () => {
  const root = await mkdtemp(join(tmpdir(), "hekayti-assets-"));
  try {
    const picked = join(root, "synthetic.png");
    await writeFile(picked, png);
    const store = new PrivateBookAssetStore(
      join(root, "outside-source"),
      { dimensions: () => ({ width: 1, height: 1 }) },
      [join(root, "source")],
    );
    const ref = await store.importSelected(
      "synthetic-project",
      picked,
      "PHOTO",
      "PUBLIC_SYNTHETIC",
    );
    assert.equal(ref.classification, "PRIVATE_LOCAL_PROJECT");
    assert.notEqual(ref.assetId, "synthetic.png");
    assert.equal(ref.bytes, png.length);
    assert.deepEqual(Buffer.from((await store.read(ref))!), png);
    assert.match((await store.preview(ref))!, /^data:image\/png;base64,/);
    const canonical = join(
      root,
      "outside-source",
      ref.projectId,
      ref.assetId + ".png",
    );
    await assert.rejects(store.relinkSelected(ref, picked), /موجود بالفعل/);
    await unlink(canonical);
    assert.equal(await store.read(ref), null);
    const altered = join(root, "different.png"),
      different = Buffer.from(png);
    different[different.length - 1] = different[different.length - 1]! ^ 1;
    await writeFile(altered, different);
    await assert.rejects(
      store.relinkSelected(ref, altered),
      /نفس الصورة الأصلية/,
    );
    assert.equal(await store.read(ref), null);
    await store.relinkSelected(ref, picked);
    assert.deepEqual(await readFile(canonical), png);
    assert.equal(ref.classification, "PRIVATE_LOCAL_PROJECT");
    await writeFile(canonical, different);
    await assert.rejects(store.read(ref), /لا تطابق/);
    await assert.rejects(
      store.importSelected("../escape", picked, "PAGE", "PUBLIC_SYNTHETIC"),
    );
    assert.throws(
      () =>
        new PrivateBookAssetStore(
          join(root, "source", "private"),
          { dimensions: () => null },
          [join(root, "source")],
        ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("media validates decoded dimensions, actual signatures, and linked picker paths", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "hekayti-decode-"));
  try {
    const picked = join(root, "synthetic.png");
    await writeFile(picked, png);
    for (const dimensions of [
      null,
      { width: 16001, height: 1 },
      { width: 10000, height: 10000 },
    ]) {
      const store = new PrivateBookAssetStore(join(root, "assets"), {
        dimensions: () => dimensions,
      });
      await assert.rejects(
        store.importSelected(
          "synthetic-project",
          picked,
          "PAGE",
          "PUBLIC_SYNTHETIC",
        ),
        /أبعادها/,
      );
    }
    assert.throws(() => sniffImage(Buffer.from("not an image")));
    const fake = join(root, "fake.png");
    await writeFile(fake, Buffer.alloc(30));
    await assert.rejects(
      new PrivateBookAssetStore(join(root, "assets"), {
        dimensions: () => ({ width: 1, height: 1 }),
      }).importSelected("synthetic-project", fake, "PAGE", "PUBLIC_SYNTHETIC"),
      /PNG/,
    );
    const linked = join(root, "linked.png");
    try {
      await symlink(picked, linked);
    } catch (e) {
      if (
        ["EPERM", "EACCES"].includes((e as NodeJS.ErrnoException).code ?? "")
      ) {
        t.diagnostic(
          "Symlink creation unavailable on host; native path validation remains covered structurally.",
        );
        return;
      }
      throw e;
    }
    await assert.rejects(
      new PrivateBookAssetStore(join(root, "assets"), {
        dimensions: () => ({ width: 1, height: 1 }),
      }).importSelected(
        "synthetic-project",
        linked,
        "PAGE",
        "PUBLIC_SYNTHETIC",
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("untrusted bounds cannot declassify photos or forge slot/box geometry", () => {
  const ref = {
    assetId: "image",
    projectId: "project",
    sha256: "a".repeat(64),
    mime: "image/png",
    bytes: 100,
    width: 1,
    height: 1,
    classification: "PUBLIC_SYNTHETIC",
    purpose: "PHOTO",
    createdAt: "now",
  };
  assert.equal(AssetManifestSchema.safeParse(ref).success, false);
  for (const x of [
    { kind: "PHOTO" },
    { kind: "COVER", pageId: "page" },
    { kind: "PAGE", pageId: "page", characterId: "actor" },
  ])
    assert.equal(
      SelectBookAssetsSchema.safeParse({
        projectId: "project",
        expectedBook: 0,
        ...x,
      }).success,
      false,
    );
  const box = {
    boxId: "box",
    kind: "DIALOGUE",
    sourceIndex: 0,
    speakerId: "actor",
    x: 0.1,
    y: 0.1,
    width: 0.4,
    height: 0.3,
    fontPt: 20,
    style: "BUBBLE",
    tail: "ANCHOR",
    text: "نعم",
  };
  for (const bad of [
    { x: NaN },
    { height: Infinity },
    { width: 1 },
    { fontPt: 8 },
    { speakerId: undefined },
  ])
    assert.equal(TextBoxSchema.safeParse({ ...box, ...bad }).success, false);
});
