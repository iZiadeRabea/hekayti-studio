import { z } from "zod";
import { AppError, validate } from "@hekayti/contracts";
import {
  LibraryRecordSchema,
  LibraryStateSchema,
  type LibraryRecord,
  type LibraryState,
  type CreativeMetadata,
} from "@hekayti/contracts/library";
import { canonicalJson } from "./index";
import {
  latestLibraryRecords,
  libraryStatisticsByRecord,
  type LibraryRepository,
} from "./story-library";

const controls = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
export function validateCreativeText(value: unknown): void {
  if (typeof value === "string" && controls.test(value))
    throw new AppError(
      "LIBRARY_UNICODE",
      "Logical Unicode required; bidi controls are not accepted.",
    );
  if (value && typeof value === "object")
    for (const child of Object.values(value)) validateCreativeText(child);
}
export function screenCulture(
  title: string,
  evidence: string,
  profile: CreativeMetadata["culture"]["profile"] = "EGYPTIAN_ARAB_MUSLIM_FAMILY",
): CreativeMetadata["culture"] {
  const text = title + " " + evidence;
  const factors: CreativeMetadata["culture"]["factors"] = [];
  const tests: [
    RegExp,
    CreativeMetadata["culture"]["factors"][number]["dimension"],
    string,
    string,
  ][] = [
    [
      /\b(kill|killed|death|dead|blood|murder|hang|slay|slain|slavery|slave|whip|burnt)\b/i,
      "violence",
      "Source includes violence/death/coercion language.",
      "Replace danger/punishment with a bounded repair problem; do not preserve abusive moral.",
    ],
    [
      /\b(ghost|witch|devil|demon|ogre|monster|fear|terrified|jinn|genie)\b/i,
      "fear",
      "Supernatural or frightening vocabulary present.",
      "Reframe as pretend/imagination with caregiver reassurance; age-specific human review.",
    ],
    [
      /\b(god|gods|allah|prophet|holy|moslem|muslim|christ|jesus|jupiter|mercury|juno|prayer|heaven|hell|temple)\b/i,
      "faith",
      "Source invokes religious/mythological figures or practice.",
      "Keep descriptive provenance separate from faith instruction; qualified religious review for claims.",
    ],
    [
      /\b(marry|married|wife|husband|bride|lover|sweetheart|drunk|wine|beer)\b/i,
      "family",
      "Adult relationship/substance context may need adaptation.",
      "Use fictional supportive family/friend situations; no romantic/substance plot for young children.",
    ],
    [
      /\b(savage|negro|heathen|stupid|fool|ugly|cripple|ethiop)\b/i,
      "stereotypes",
      "Historical derogatory/stereotyping language detected.",
      "Remove demeaning identity/appearance associations and seek cultural reader.",
    ],
  ];
  for (const [pattern, dimension, finding, adaptation] of tests)
    if (pattern.test(text)) factors.push({ dimension, finding, adaptation });
  factors.push({
    dimension: "language",
    finding:
      "Historic English translation is not an Egyptian Arabic/MSA children's draft.",
    adaptation:
      "Author natural Arabic independently; retain cause/effect, not archaic phrases.",
  });
  factors.push({
    dimension: "age",
    finding:
      "Source is an inspiration seed, not an approved age-specific executable outline.",
    adaptation:
      "Select age guidance and redesign cast/causality/word/page budget; explicit QA required.",
  });
  const religious = factors.some((f) => f.dimension === "faith");
  return {
    profile,
    fit: factors.some((f) => f.dimension === "stereotypes")
      ? "NOT_DEFAULT"
      : factors.some((f) => ["violence", "faith"].includes(f.dimension))
        ? "SENSITIVE_REVIEW"
        : "NEEDS_ADAPTATION",
    assessment: "PROVISIONAL_EDITORIAL_SCREENING",
    factors,
    religiousReview: religious
      ? "RELIGIOUS_ACCURACY_REVIEW_REQUIRED"
      : "NO_RELIGIOUS_CLAIM",
    religiousNote: religious
      ? "Detection is a review flag, not a verified religious statement or human approval."
      : "No religious claim identified by limited provisional screening; absence is not certification.",
    reviewedBy: null,
  };
}
export function parseLibraryBatch(raw: string): LibraryRecord[] {
  if (new TextEncoder().encode(raw).length > 25_000_000)
    throw new AppError("LIBRARY_BATCH_SIZE", "Creative batch exceeds 25MB.");
  try {
    const rows = raw.trim().startsWith("[")
      ? JSON.parse(raw)
      : raw
          .split(/\r?\n/)
          .filter((x) => x.trim())
          .map((x, i) => {
            try {
              return JSON.parse(x);
            } catch {
              throw new Error(`Invalid JSONL line ${i + 1}`);
            }
          });
    const records = validate(
      z.array(LibraryRecordSchema).min(1).max(10000),
      rows,
    );
    validateCreativeText(records);
    if (
      new Set(records.map((r) => r.recordId)).size !== records.length ||
      records.some(
        (r) =>
          r.version !== 1 ||
          r.status !== "GENERATED" ||
          r.origin.transport !== "human-authored" ||
          r.origin.importId ||
          r.origin.packageId ||
          r.payload.type === "APPROVED_STORY_REFERENCE",
      )
    )
      throw new AppError(
        "LIBRARY_BATCH",
        "New batch identities must be unique version1 GENERATED creative records; no operational import/approval authority.",
      );
    return records;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      "LIBRARY_BATCH_JSON",
      e instanceof Error ? e.message : "Invalid creative JSON/JSONL",
    );
  }
}
export function importLibraryBatch(
  repo: LibraryRepository,
  records: LibraryRecord[],
  expectedVersion: number,
  batchId: string,
  timestamp: string,
) {
  records = parseLibraryBatch(JSON.stringify(records));
  validate(
    z
      .string()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
    batchId,
  );
  return repo.transaction(() => {
    const s = repo.loadLibrary();
    if (s.recordVersion !== expectedVersion)
      throw new AppError("LIBRARY_CONFLICT", "Library changed; preview again.");
    const current = new Map(
      latestLibraryRecords(s).map((r) => [r.recordId, r]),
    );
    const firstVersions = new Map(
      s.records.filter((r) => r.version === 1).map((r) => [r.recordId, r]),
    );
    const added = records.filter((r) => {
      const old = current.get(r.recordId);
      if (!old) return true;
      const first = firstVersions.get(r.recordId)!;
      if (canonicalJson(first) !== canonicalJson(r))
        throw new AppError(
          "LIBRARY_BATCH_CONFLICT",
          `Exact identity conflict: ${r.recordId}; no overwrite.`,
        );
      return false;
    });
    if (!added.length) return { state: s, added: 0, replayed: records.length };
    const next = {
      ...s,
      records: [...s.records, ...added],
      events: [
        ...s.events,
        ...added.map((r, i) => ({
          eventId: `${batchId}.${i}`,
          recordId: r.recordId,
          version: 1,
          action: "CREATE" as const,
          reviewerAlias: "creative-batch-declaration",
          timestamp,
        })),
      ],
    };
    return {
      state: repo.saveLibrary(next, expectedVersion),
      added: added.length,
      replayed: records.length - added.length,
    };
  });
}
export const CreativeBundleSchema = z
  .object({
    schemaVersion: z.literal("creative-library/1.0"),
    declaration: z.literal("EXPLICIT_PUBLIC_OR_SYNTHETIC_CREATIVE_DECLARATION"),
    records: z.array(LibraryRecordSchema).max(10000),
    exclusions: z.array(z.string()).max(40),
    sourceRecordVersion: z.number().int().nonnegative(),
  })
  .strict();
export type CreativeBundle = z.infer<typeof CreativeBundleSchema>;
export function projectCreativeLibrary(
  state: LibraryState,
  declaration: boolean,
): CreativeBundle {
  if (!declaration)
    throw new AppError(
      "CREATIVE_PRIVACY",
      "Explicit public/synthetic free-text privacy declaration required; automatic screening cannot certify text.",
    );
  validate(LibraryStateSchema, state);
  const latest = latestLibraryRecords(state),
    ids = new Set(latest.map((r) => r.recordId)),
    statistics = libraryStatisticsByRecord(state);
  const records = latest.map((r) => {
    const payload = structuredClone(r.payload);
    const approvalHash =
      payload.type === "APPROVED_STORY_REFERENCE" ? payload.contentHash : null;
    let creativePayload: LibraryRecord["payload"] = payload;
    if (
      payload.type === "STORY_CONCEPT" ||
      payload.type === "APPROVED_STORY_REFERENCE"
    ) {
      const concept = structuredClone(payload.concept);
      concept.conceptId = "portable-creative-concept";
      concept.requestId = "portable-creative-request";
      concept.requestRevisionId = "portable-creative-revision";
      concept.provenance = {
        kind: "manual",
        providerId: "portable-creative-attribution",
        version: "historical-only-not-generation-proof",
        deterministic: false,
      };
      concept.components.forEach((component, i) => {
        component.componentId = `portable-component-${i + 1}`;
      });
      // Source/profile fields can carry operational identities; character descriptions
      // remain human-declared creative text, never customer's profile linkage.
      const characterIds = new Map(
        concept.characters.map((c, i) => [
          c.characterId,
          `portable-character-${i + 1}`,
        ]),
      );
      for (const character of concept.characters) {
        character.characterId = characterIds.get(character.characterId)!;
        character.bibleVersion = "portable-bible-1";
        character.approvedReferenceImages = [];
        if (character.illustrationReference !== undefined)
          character.illustrationReference = null;
      }
      concept.mainCharacterId = concept.mainCharacterId
        ? characterIds.get(concept.mainCharacterId)!
        : null;
      for (const [i, beat] of concept.outline.entries()) {
        beat.beatId = `portable-beat-${i + 1}`;
        beat.actorId = beat.actorId ? characterIds.get(beat.actorId)! : null;
        beat.factIds = [];
      }
      creativePayload = { type: "STORY_CONCEPT", concept };
    }
    const creative: CreativeMetadata = {
      source: r.creative?.source ?? null,
      culture:
        r.creative?.culture ??
        screenCulture(r.title, JSON.stringify(creativePayload)),
      ...(r.creative?.dna ? { dna: r.creative.dna } : {}),
      schemaVersion: "creative-metadata/1.0",
      historicalAttribution: {
        originalType: payload.type,
        originalStatus: r.status,
        originalVersion: r.version,
        approvalHash,
        authority: "HISTORICAL_ONLY_NOT_CURRENT_APPROVAL",
      },
      usageSummary: statistics.get(r.recordId)!,
    };
    return validate(LibraryRecordSchema, {
      schemaVersion: "library-record/1.0",
      recordId: r.recordId,
      version: 1,
      title: r.title,
      payload: creativePayload,
      status: "GENERATED",
      metadata: {
        sourceType: r.metadata.sourceType,
        sourceProvider: r.metadata.sourceProvider,
        providerNote: null,
        modelNote: null,
      },
      tags: r.tags,
      family: r.family ? { recordId: r.family.recordId, version: 1 } : null,
      variantId: r.variantId,
      variantNumber: r.variantNumber,
      derivedFrom:
        r.derivedFrom && ids.has(r.derivedFrom.recordId)
          ? { recordId: r.derivedFrom.recordId, version: 1 }
          : null,
      scores: r.scores,
      editorialNote: r.editorialNote,
      origin: { transport: "human-authored", importId: null, packageId: null },
      creative,
    });
  });
  // Restore topological reference order, even when a family's latest revision is newer.
  const ordered: LibraryRecord[] = [],
    pending = new Map(records.map((r) => [r.recordId, r]));
  while (pending.size) {
    let progress = false;
    for (const [id, r] of pending) {
      if (
        [r.family, r.derivedFrom].every(
          (ref) => !ref || ordered.some((x) => x.recordId === ref.recordId),
        )
      ) {
        ordered.push(r);
        pending.delete(id);
        progress = true;
      }
    }
    if (!progress)
      throw new AppError(
        "CREATIVE_REFERENCES",
        "Latest creative references form a cycle/unresolved source; export stopped, original retained.",
      );
  }
  return validate(CreativeBundleSchema, {
    schemaVersion: "creative-library/1.0",
    declaration: "EXPLICIT_PUBLIC_OR_SYNTHETIC_CREATIVE_DECLARATION",
    records: ordered,
    sourceRecordVersion: state.recordVersion,
    exclusions: [
      "projects/workflows/requests/packages/imports/editions/assets/photos/characters tables",
      "operational approval/project/request/concept/component/beat/character IDs; concept IDs are portable placeholders",
      "audit reviewer aliases/timestamps and usage project/request IDs",
      "provider/model free-text notes and operational provider identity; sourceProvider category retained",
      "trusted-fact identity links removed, creative factual text requires fresh review",
      "historical revisions collapsed explicitly to latest creative view; original version/status retained as attribution",
      "actual approvals NOT replayed; restored records enter GENERATED",
    ],
  });
}
