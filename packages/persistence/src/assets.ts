import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  lstat,
  realpath,
  readFile,
  writeFile,
  link,
} from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { AppError, Id, validate } from "@hekayti/contracts";
import type { AssetStore, AssetReference } from "@hekayti/core";

// Atomic no-clobber promotion. Retain temp candidates on failure; never replace an older export.
export async function writeNewFile(path: string, bytes: Uint8Array) {
  await mkdir(dirname(path), { recursive: true });
  const candidate = path + ".candidate-" + randomUUID();
  await writeFile(candidate, bytes, { flag: "wx" });
  await link(candidate, path);
}
export class LocalAssetStore implements AssetStore {
  constructor(private readonly root: string) {}
  private async folder(projectId: string, bucket: string) {
    validate(Id, projectId);
    if (!["source", "generated", "temp", "exports"].includes(bucket))
      throw new AppError(
        "PRIVATE_DISABLED",
        "Private asset processing is not enabled in Phase 2.",
      );
    await mkdir(this.root, { recursive: true });
    const canonicalRoot = await realpath(this.root);
    const project = join(canonicalRoot, projectId);
    await mkdir(project, { recursive: true });
    if ((await lstat(project)).isSymbolicLink())
      throw new AppError(
        "ASSET_PATH",
        "Symbolic-link project directories are not allowed.",
      );
    const target = join(project, bucket);
    await mkdir(target, { recursive: true });
    if ((await lstat(target)).isSymbolicLink())
      throw new AppError(
        "ASSET_PATH",
        "Symbolic-link asset directories are not allowed.",
      );
    return target;
  }
  async put(
    projectId: string,
    bucket: AssetReference["bucket"],
    bytes: Uint8Array,
    extension: string,
  ): Promise<AssetReference> {
    if (!["png", "svg", "json", "txt", "pdf"].includes(extension))
      throw new AppError("ASSET_TYPE", "Unsupported prototype asset type.");
    if (bytes.byteLength > 20_000_000)
      throw new AppError("ASSET_SIZE", "Asset exceeds prototype size limit.");
    const folder = await this.folder(projectId, bucket);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const file = join(folder, hash + "." + extension);
    try {
      await writeFile(file, bytes, { flag: "wx" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      if (
        (await lstat(file)).isSymbolicLink() ||
        createHash("sha256")
          .update(await readFile(file))
          .digest("hex") !== hash
      )
        throw new AppError(
          "ASSET_CORRUPT",
          "Existing asset hash mismatch; file preserved.",
        );
    }
    return {
      uri: `asset:${projectId}:${bucket}:${hash}.${extension}`,
      hash,
      bytes: bytes.byteLength,
      projectId,
      bucket,
    };
  }
  async get(ref: AssetReference): Promise<Uint8Array> {
    const match =
      /^asset:([a-zA-Z0-9][a-zA-Z0-9._-]*):(source|generated|temp|exports):([a-f0-9]{64})\.(png|svg|json|txt|pdf)$/.exec(
        ref.uri,
      );
    if (
      !match ||
      match[1] !== ref.projectId ||
      match[2] !== ref.bucket ||
      match[3] !== ref.hash
    )
      throw new AppError(
        "ASSET_REFERENCE",
        "Invalid provider-independent asset handle.",
      );
    const path = resolve(
      await this.folder(ref.projectId, ref.bucket),
      match[3] + "." + match[4],
    );
    if ((await lstat(path)).isSymbolicLink())
      throw new AppError("ASSET_PATH", "Symbolic-link assets are not allowed.");
    const bytes = await readFile(path);
    if (
      createHash("sha256").update(bytes).digest("hex") !== ref.hash ||
      bytes.length !== ref.bytes
    )
      throw new AppError(
        "ASSET_CORRUPT",
        "Asset contents changed; existing file retained.",
      );
    return new Uint8Array(bytes);
  }
}
