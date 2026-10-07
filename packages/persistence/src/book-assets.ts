import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  lstat,
  realpath,
  readFile,
  writeFile,
  link,
  unlink,
} from "node:fs/promises";
import { join, resolve, sep, dirname } from "node:path";
import { AppError, Id } from "@hekayti/contracts";
import {
  AssetManifestSchema,
  type AssetManifest,
} from "@hekayti/contracts/book";
export interface ImageDecoder {
  dimensions(bytes: Uint8Array): { width: number; height: number } | null;
}
/** Validate existing ancestors before mkdir: a descendant of a junction is not a safe root. */
export async function ensurePrivateBookDirectory(
  path: string,
  forbiddenRoots: string[] = [],
) {
  const target = resolve(path);
  let nearest = target;
  for (;;) {
    try {
      const info = await lstat(nearest);
      if (info.isSymbolicLink() || !info.isDirectory())
        throw new AppError(
          "BOOK_ASSET_PATH",
          "Private root path or ancestor cannot be a link or file.",
        );
      if ((await realpath(nearest)).toLowerCase() !== nearest.toLowerCase())
        throw new AppError(
          "BOOK_ASSET_PATH",
          "Private root ancestor differs from canonical path authority.",
        );
      break;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      const parent = dirname(nearest);
      if (parent === nearest) throw e;
      nearest = parent;
    }
  }
  for (const root of forbiddenRoots) {
    const lexical = resolve(root);
    let canonical = lexical;
    try {
      canonical = await realpath(lexical);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (
      [lexical, canonical].some(
        (r) =>
          target.toLowerCase() === r.toLowerCase() ||
          target.toLowerCase().startsWith(r.toLowerCase() + sep),
      )
    )
      throw new AppError(
        "BOOK_ASSET_ROOT",
        "Private root must remain outside source/recovery directories.",
      );
  }
  await mkdir(target, { recursive: true });
  if (
    (await lstat(target)).isSymbolicLink() ||
    (await realpath(target)).toLowerCase() !== target.toLowerCase()
  )
    throw new AppError(
      "BOOK_ASSET_PATH",
      "Private root changed its path authority.",
    );
  return target;
}
export function sniffImage(bytes: Uint8Array): AssetManifest["mime"] {
  const b = Buffer.from(bytes);
  if (
    b.length >= 24 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    b.length >= 4 &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255 &&
    b.at(-2) === 255 &&
    b.at(-1) === 217
  )
    return "image/jpeg";
  if (
    b.length >= 12 &&
    b.subarray(0, 4).toString() === "RIFF" &&
    b.subarray(8, 12).toString() === "WEBP" &&
    b.readUInt32LE(4) + 8 === b.length
  )
    return "image/webp";
  throw new AppError("BOOK_ASSET_TYPE", "اختر صورة PNG أو JPEG أو WEBP سليمة.");
}
const ext = (mime: AssetManifest["mime"]) =>
  mime === "image/png" ? "png" : mime === "image/jpeg" ? "jpg" : "webp";
export class PrivateBookAssetStore {
  constructor(
    private root: string,
    private decoder: ImageDecoder,
    private forbiddenRoots: string[] = [],
  ) {
    const r = resolve(root).toLowerCase();
    if (
      forbiddenRoots.some(
        (f) =>
          r === resolve(f).toLowerCase() ||
          r.startsWith(resolve(f).toLowerCase() + sep),
      )
    )
      throw new AppError(
        "BOOK_ASSET_ROOT",
        "Book media must be outside source/recovery directories.",
      );
  }
  private async folder(projectId: string) {
    Id.parse(projectId);
    const root = await ensurePrivateBookDirectory(
        this.root,
        this.forbiddenRoots,
      ),
      folder = join(root, projectId);
    await ensurePrivateBookDirectory(folder, this.forbiddenRoots);
    if (
      (await realpath(folder)).toLowerCase() !== resolve(folder).toLowerCase()
    )
      throw new AppError(
        "BOOK_ASSET_PATH",
        "Asset project path differs from canonical authority.",
      );
    return folder;
  }
  private async selectedBytes(path: string) {
    // Only the trusted main process calls this with a path returned by its native picker.
    const info = await lstat(path);
    if (
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.size < 24 ||
      info.size > 40000000
    )
      throw new AppError(
        "BOOK_ASSET_SIZE",
        "الصورة غير سليمة أو أكبر من الحد المسموح.",
      );
    if ((await realpath(path)).toLowerCase() !== resolve(path).toLowerCase())
      throw new AppError(
        "BOOK_ASSET_PATH",
        "Linked source paths are not accepted.",
      );
    const bytes = await readFile(path);
    if (bytes.length !== info.size)
      throw new AppError("BOOK_ASSET_CHANGED", "الصورة تغيرت أثناء اختيارها.");
    return bytes;
  }
  async importSelected(
    projectId: string,
    path: string,
    purpose: AssetManifest["purpose"],
    classification: AssetManifest["classification"],
  ): Promise<AssetManifest> {
    const bytes = await this.selectedBytes(path),
      mime = sniffImage(bytes),
      dimensions = this.decoder.dimensions(bytes);
    if (
      !dimensions ||
      dimensions.width < 1 ||
      dimensions.height < 1 ||
      dimensions.width > 16000 ||
      dimensions.height > 16000 ||
      dimensions.width * dimensions.height > 40000000
    )
      throw new AppError(
        "BOOK_ASSET_DECODE",
        "تعذر قراءة الصورة أو أبعادها أكبر من الحد المسموح.",
      );
    const manifest = AssetManifestSchema.parse({
      assetId: randomUUID(),
      projectId,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      mime,
      bytes: bytes.length,
      ...dimensions,
      classification:
        purpose === "PHOTO" ? "PRIVATE_LOCAL_PROJECT" : classification,
      purpose,
      createdAt: new Date().toISOString(),
    });
    await this.publish(manifest, bytes);
    return manifest;
  }
  private async publish(ref: AssetManifest, bytes: Uint8Array) {
    const folder = await this.folder(ref.projectId),
      file = join(folder, ref.assetId + "." + ext(ref.mime)),
      candidate = join(folder, randomUUID() + ".candidate");
    await writeFile(candidate, bytes, { flag: "wx" });
    try {
      await link(candidate, file);
    } finally {
      await unlink(candidate);
    }
  }
  async read(ref: AssetManifest): Promise<Uint8Array | null> {
    AssetManifestSchema.parse(ref);
    const file = join(
      await this.folder(ref.projectId),
      ref.assetId + "." + ext(ref.mime),
    );
    let info;
    try {
      info = await lstat(file);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
    if (!info.isFile() || info.isSymbolicLink() || info.size !== ref.bytes)
      throw new AppError(
        "BOOK_ASSET_CORRUPT",
        "الصورة المخزنة تغيرت؛ أعد ربط النسخة الأصلية.",
      );
    const bytes = await readFile(file);
    if (
      createHash("sha256").update(bytes).digest("hex") !== ref.sha256 ||
      sniffImage(bytes) !== ref.mime
    )
      throw new AppError(
        "BOOK_ASSET_CORRUPT",
        "الصورة المخزنة لا تطابق المرجع الأصلي.",
      );
    return bytes;
  }
  async relinkSelected(ref: AssetManifest, path: string) {
    if (await this.read(ref))
      throw new AppError(
        "BOOK_RELINK_PRESENT",
        "المرجع موجود بالفعل؛ استورد نسخة جديدة لتغييره.",
      );
    const bytes = await this.selectedBytes(path),
      mime = sniffImage(bytes),
      dims = this.decoder.dimensions(bytes);
    if (
      createHash("sha256").update(bytes).digest("hex") !== ref.sha256 ||
      mime !== ref.mime ||
      bytes.length !== ref.bytes ||
      dims?.width !== ref.width ||
      dims?.height !== ref.height
    )
      throw new AppError(
        "BOOK_RELINK_MISMATCH",
        "اختر نفس الصورة الأصلية؛ النسخة المختلفة تحتاج استيرادًا جديدًا.",
      );
    await this.publish(ref, bytes);
  }
  async preview(ref: AssetManifest) {
    const bytes = await this.read(ref);
    return bytes
      ? `data:${ref.mime};base64,${Buffer.from(bytes).toString("base64")}`
      : null;
  }
}
