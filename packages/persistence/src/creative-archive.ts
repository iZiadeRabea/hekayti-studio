import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { AppError, validate } from "@hekayti/contracts";
import { LibraryStateSchema } from "@hekayti/contracts/library";
import {
  type LibraryRepository,
  latestLibraryRecords,
} from "@hekayti/core/library";
import { canonicalJson } from "@hekayti/core";
import {
  CreativeBundleSchema,
  projectCreativeLibrary,
  parseLibraryBatch,
  importLibraryBatch,
  validateCreativeText,
  type CreativeBundle,
} from "@hekayti/core/creative";
const hash = (data: Uint8Array | string) =>
  createHash("sha256").update(data).digest("hex");
const crc = (b: Uint8Array) => {
  let n = 0xffffffff;
  for (const byte of b) {
    n ^= byte;
    for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
  }
  return (n ^ 0xffffffff) >>> 0;
};
// Small standard ZIP (stored entries), deliberately no general-purpose archive extraction.
// A fixed three-file allowlist cannot extract paths, symlinks, code or a mixed SQLite DB.
function zip(entries: Map<string, Buffer>) {
  const parts: Buffer[] = [],
    central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const n = Buffer.from(name),
      local = Buffer.alloc(30),
      header = Buffer.alloc(46),
      sum = crc(data);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(n.length, 26);
    header.writeUInt32LE(0x02014b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt32LE(sum, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(n.length, 28);
    header.writeUInt32LE(offset, 42);
    parts.push(local, n, data);
    central.push(header, n);
    offset += local.length + n.length + data.length;
  }
  const c = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.size, 8);
  end.writeUInt16LE(entries.size, 10);
  end.writeUInt32LE(c.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, c, end]);
}
function unzip(bytes: Buffer) {
  if (bytes.length > 30_000_000 || bytes.length < 22)
    throw new AppError("CREATIVE_ZIP", "Archive size invalid.");
  const entries = new Map<string, Buffer>();
  let p = 0;
  while (p + 4 < bytes.length && bytes.readUInt32LE(p) === 0x04034b50) {
    if (p + 30 > bytes.length) throw new Error("truncated");
    const method = bytes.readUInt16LE(p + 8),
      flags = bytes.readUInt16LE(p + 6),
      size = bytes.readUInt32LE(p + 18),
      expanded = bytes.readUInt32LE(p + 22),
      n = bytes.readUInt16LE(p + 26),
      extra = bytes.readUInt16LE(p + 28),
      start = p + 30 + n + extra,
      name = bytes.subarray(p + 30, p + 30 + n).toString("utf8");
    if (
      method !== 0 ||
      flags !== 0 ||
      size !== expanded ||
      size > 25_000_000 ||
      start + size > bytes.length ||
      !["manifest.json", "library.jsonl", "SHA256.json"].includes(name) ||
      entries.has(name)
    )
      throw new Error("entry denied");
    const data = bytes.subarray(start, start + size);
    if (crc(data) !== bytes.readUInt32LE(p + 14))
      throw new Error("CRC mismatch");
    entries.set(name, data);
    p = start + size;
  }
  if (
    entries.size !== 3 ||
    p + 4 > bytes.length ||
    bytes.readUInt32LE(p) !== 0x02014b50
  )
    throw new Error("invalid central directory");
  // Verify exact central directory/end, with no unparsed entries/trailing payload.
  const expected = zip(entries);
  if (!bytes.equals(expected))
    throw new Error("noncanonical or malformed ZIP directory");
  return entries;
}
export function createCreativeArchive(
  repo: LibraryRepository,
  declaration: boolean,
): Buffer {
  const bundle = projectCreativeLibrary(repo.loadLibrary(), declaration);
  const jsonl = Buffer.from(
    bundle.records.map((r) => canonicalJson(r)).join("\n") + "\n",
  );
  const { records, ...head } = bundle;
  const manifest = Buffer.from(
    canonicalJson({ ...head, recordCount: records.length }),
  );
  return zip(
    new Map([
      ["manifest.json", manifest],
      ["library.jsonl", jsonl],
      [
        "SHA256.json",
        Buffer.from(
          canonicalJson({
            "manifest.json": hash(manifest),
            "library.jsonl": hash(jsonl),
          }),
        ),
      ],
    ]),
  );
}
export function readCreativeArchive(bytes: Buffer): {
  bundle: CreativeBundle;
  digest: string;
} {
  try {
    const entries = unzip(bytes),
      checks = JSON.parse(entries.get("SHA256.json")!.toString());
    if (Object.keys(checks).sort().join(",") !== "library.jsonl,manifest.json")
      throw new Error("hash manifest");
    for (const name of ["manifest.json", "library.jsonl"])
      if (hash(entries.get(name)!) !== checks[name])
        throw new Error("file hash mismatch");
    const manifest = JSON.parse(entries.get("manifest.json")!.toString()),
      { recordCount, ...head } = manifest;
    const raw = entries.get("library.jsonl")!.toString("utf8");
    const records = raw.trim() ? parseLibraryBatch(raw) : [];
    if (recordCount !== records.length) throw new Error("count mismatch");
    const bundle = validate(CreativeBundleSchema, { ...head, records });
    validateCreativeText(bundle);
    return { bundle, digest: hash(bytes) };
  } catch (e) {
    throw new AppError(
      "CREATIVE_ARCHIVE",
      `Creative ZIP rejected; original data untouched: ${e instanceof Error ? e.message : "invalid"}`,
    );
  }
}
export type RestoreChoice = "KEEP_EXISTING" | "COPY_WITH_NEW_IDS";
export function previewCreativeRestore(repo: LibraryRepository, bytes: Buffer) {
  const { bundle, digest } = readCreativeArchive(bytes),
    state = repo.loadLibrary(),
    existing = new Map(latestLibraryRecords(state).map((r) => [r.recordId, r]));
  validate(LibraryStateSchema, {
    schemaVersion: "library-state/1.0",
    recordVersion: 0,
    records: bundle.records,
    events: bundle.records.map((r, i) => ({
      eventId: `preview-${i}`,
      recordId: r.recordId,
      version: 1,
      action: "CREATE",
      reviewerAlias: "preview-only",
      timestamp: "preview-only",
    })),
    usage: [],
  });
  const firstVersions = new Map(
    state.records.filter((r) => r.version === 1).map((r) => [r.recordId, r]),
  );
  const variantNumbers = new Map(
    [...existing.values()]
      .filter((r) => r.family)
      .map((r) => [`${r.family!.recordId}:${r.variantNumber}`, r.recordId]),
  );
  const variantIds = new Map(
    [...existing.values()]
      .filter((r) => r.variantId)
      .map((r) => [r.variantId!, r.recordId]),
  );
  const rows = bundle.records.map((r) => {
    const old = existing.get(r.recordId),
      first = firstVersions.get(r.recordId),
      collision =
        (r.family &&
          variantNumbers.has(`${r.family.recordId}:${r.variantNumber}`) &&
          variantNumbers.get(`${r.family.recordId}:${r.variantNumber}`) !==
            r.recordId) ||
        (r.variantId &&
          variantIds.has(r.variantId) &&
          variantIds.get(r.variantId) !== r.recordId);
    return {
      recordId: r.recordId,
      title: r.title,
      decision: collision
        ? "CONFLICT"
        : !old
          ? "ADD"
          : canonicalJson(first) === canonicalJson(r)
            ? "REPLAY"
            : "CONFLICT",
    };
  });
  return {
    digest,
    expectedVersion: state.recordVersion,
    records: rows,
    total: rows.length,
    add: rows.filter((x) => x.decision === "ADD").length,
    replay: rows.filter((x) => x.decision === "REPLAY").length,
    conflicts: rows.filter((x) => x.decision === "CONFLICT"),
    exclusions: bundle.exclusions,
    notice:
      "Restored records are GENERATED; historical approvals/usage are attribution only. Conflicts include variant identity/number collisions. COPY also copies each conflicting variant's structural family under deterministic new IDs, preserving variant numbers; KEEP explicitly skips conflicts.",
  };
}
export function restoreCreativeArchive(
  repo: LibraryRepository,
  bytes: Buffer,
  input: {
    digest: string;
    expectedVersion: number;
    choices: Record<string, RestoreChoice>;
  },
  timestamp: string,
) {
  return repo.transaction(() => {
    const preview = previewCreativeRestore(repo, bytes),
      { bundle } = readCreativeArchive(bytes);
    if (
      preview.digest !== input.digest ||
      preview.expectedVersion !== input.expectedVersion
    )
      throw new AppError(
        "CREATIVE_STALE",
        "Archive/library differs from preview; preview again.",
      );
    const conflicts = new Set(preview.conflicts.map((x) => x.recordId));
    if (Object.keys(input.choices).some((id) => !conflicts.has(id)))
      throw new AppError(
        "CREATIVE_CHOICE",
        "Choice refers to a non-conflict identity.",
      );
    for (const id of conflicts)
      if (
        !["KEEP_EXISTING", "COPY_WITH_NEW_IDS"].includes(
          input.choices[id] ?? "",
        )
      )
        throw new AppError(
          "CREATIVE_CONFLICT",
          `Explicit conflict choice required: ${id}`,
        );
    const copy = new Set(
      Object.entries(input.choices)
        .filter(([, v]) => v === "COPY_WITH_NEW_IDS")
        .map(([id]) => id),
    );
    for (const r of bundle.records)
      if (copy.has(r.recordId) && r.family) {
        if (input.choices[r.family.recordId] === "KEEP_EXISTING")
          throw new AppError(
            "CREATIVE_CHOICE",
            "Copying a variant requires copying its structural family; conflicting KEEP choice must be changed.",
          );
        copy.add(r.family.recordId);
      }
    // A kept conflicting dependency is a DIFFERENT creative identity despite
    // resolving structurally by ID/version. Do not silently relink incoming
    // ADD variants or derived records to that target's meaning.
    for (const r of bundle.records)
      if (input.choices[r.recordId] !== "KEEP_EXISTING") {
        for (const ref of [r.family, r.derivedFrom])
          if (ref && input.choices[ref.recordId] === "KEEP_EXISTING")
            throw new AppError(
              "CREATIVE_DEPENDENCY",
              `Incoming ${r.recordId} depends on conflicting kept ${ref.recordId}; copy the dependency or explicitly defer this import.`,
            );
      }
    const suffix = `-restored-${preview.digest.slice(0, 10)}`,
      newId = (id: string) => id.slice(0, 120 - suffix.length) + suffix;
    const remap = new Map<string, string>();
    for (const r of bundle.records)
      remap.set(
        r.recordId,
        copy.has(r.recordId) ? newId(r.recordId) : r.recordId,
      );
    const records = bundle.records
      .filter((r) => input.choices[r.recordId] !== "KEEP_EXISTING")
      .map((r) => ({
        ...r,
        recordId: remap.get(r.recordId)!,
        family: r.family
          ? { ...r.family, recordId: remap.get(r.family.recordId)! }
          : null,
        derivedFrom: r.derivedFrom
          ? { ...r.derivedFrom, recordId: remap.get(r.derivedFrom.recordId)! }
          : null,
        variantId:
          r.variantId && copy.has(r.recordId)
            ? newId(r.variantId)
            : r.variantId,
      }));
    if (!records.length)
      return {
        added: 0,
        replayed: 0,
        kept: preview.conflicts.length,
        recordVersion: preview.expectedVersion,
      };
    const result = importLibraryBatch(
      repo,
      records,
      input.expectedVersion,
      `restore-${hash(canonicalJson({ digest: preview.digest, choices: input.choices }))}`,
      timestamp,
    );
    return {
      added: result.added,
      replayed: result.replayed,
      kept: preview.conflicts.filter(
        (r) => input.choices[r.recordId] === "KEEP_EXISTING",
      ).length,
      recordVersion: result.state.recordVersion,
    };
  });
}
export function writeCreativeArchive(
  path: string,
  repo: LibraryRepository,
  declaration: boolean,
) {
  const bytes = createCreativeArchive(repo, declaration);
  writeFileSync(path, bytes, { flag: "wx" });
  return { bytes: bytes.length, sha256: hash(bytes), path };
}
export const loadCreativeArchive = (path: string) => readFileSync(path);
