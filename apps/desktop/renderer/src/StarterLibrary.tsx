import React, { useEffect, useState } from "react";
import type { LibraryRecord } from "@hekayti/contracts/library";
import type { Result } from "../../src/api";
import { storyDnaAdvisories } from "@hekayti/core/dna";
export function StarterLibrary() {
  const [page, setPage] = useState<{
      recordVersion: number;
      total: number;
      offset: number;
      limit: number;
      records: LibraryRecord[];
    }>({ recordVersion: 0, total: 0, offset: 0, limit: 30, records: [] }),
    [filters, setFilters] = useState<Record<string, string>>({}),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<LibraryRecord | null>(null),
    [reviewed, setReviewed] = useState(false),
    [status, setStatus] = useState(
      "Explicit import only. Normal data is never replaced. Source/cultural/rights screening is provisional.",
    ),
    [preview, setPreview] =
      useState<
        Awaited<
          ReturnType<typeof window.hekayti.creativePreview>
        > extends Result<infer T>
          ? T
          : null
      >(null),
    [choice, setChoice] = useState<"KEEP_EXISTING" | "COPY_WITH_NEW_IDS">(
      "KEEP_EXISTING",
    );
  async function unwrap<T>(p: Promise<Result<T>>) {
    const r = await p;
    if (!r.ok) {
      setStatus(`${r.error.code}: ${r.error.message}`);
      return;
    }
    return r.value;
  }
  async function load() {
    const r = await unwrap(
      window.hekayti.libraryPage({
        offset,
        limit: 30,
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
      }),
    );
    if (r) {
      setPage(r);
      setSelected((current) =>
        current
          ? (r.records.find((row) => row.recordId === current.recordId) ?? null)
          : null,
      );
    }
  }
  const [profile, setProfile] = useState<
    "EGYPTIAN_ARAB_MUSLIM_FAMILY" | "GENERAL_FAMILY"
  >("EGYPTIAN_ARAB_MUSLIM_FAMILY");
  useEffect(() => {
    void load();
  }, [offset, filters]);
  const filter = (name: string, value: string) => {
    setOffset(0);
    setFilters({ ...filters, [name]: value });
  };
  return (
    <section aria-label="Starter and creative Library">
      <h2>Starter / Creative Library</h2>
      <p>
        Source → Metadata → Summary → DNA → Pattern → Family → Age → Culture →
        Candidate → Validation → Import. Ideas are not approved stories. Missing
        DNA stays UNKNOWN; original abstracts and extractive observations are
        distinguished.
      </p>
      <label>
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        I reviewed public/synthetic creative text; no private child/customer
        information.
      </label>
      <label>
        Starter target cultural profile
        <select
          aria-label="Starter target cultural profile"
          value={profile}
          onChange={(e) => setProfile(e.target.value as typeof profile)}
        >
          <option>EGYPTIAN_ARAB_MUSLIM_FAMILY</option>
          <option>GENERAL_FAMILY</option>
        </select>
      </label>
      <p>
        Both profiles retain conservative provisional source flags; selecting a
        profile never certifies religious accuracy or clears sensitivity.
        Reimporting the same identity under a different profile is an explicit
        conflict, not an overwrite.
      </p>
      <div>
        <button
          disabled={!reviewed}
          onClick={async () => {
            const r = await unwrap(
              window.hekayti.starterImport({
                expectedVersion: page.recordVersion,
                publicCreativeReviewed: true,
                profile,
              }),
            );
            if (r) {
              setStatus(
                `Starter imported: ${r.added} added, ${r.replayed} exact replays. All new records remain GENERATED.`,
              );
              await load();
            }
          }}
        >
          Import traceable starter
        </button>
        <button
          disabled={!reviewed}
          onClick={async () => {
            const r = await unwrap(
              window.hekayti.creativeBatchOpen({
                expectedVersion: page.recordVersion,
                publicCreativeReviewed: true,
              }),
            );
            if (r) {
              setStatus(`Batch: ${r.added} added, ${r.replayed} replays`);
              await load();
            }
          }}
        >
          Import JSON / JSONL batch
        </button>
        <button
          disabled={!reviewed}
          onClick={async () => {
            const r = await unwrap(
              window.hekayti.creativeExport({ publicCreativeReviewed: true }),
            );
            if (r)
              setStatus(
                `Creative ZIP saved: ${r.path}; ${r.bytes} bytes; SHA256 ${r.sha256}. Source/Git backup is separate.`,
              );
          }}
        >
          Export creative ZIP
        </button>
        <button
          onClick={async () => {
            const r = await unwrap(window.hekayti.creativePreview());
            if (r) {
              setPreview(r);
              setStatus(
                `Dry-run only: ${r.total} records; ${r.add} additions; ${r.replay} replays; ${r.conflicts.length} conflicts. Nothing changed.`,
              );
            }
          }}
        >
          Preview creative restore
        </button>
      </div>
      {preview && (
        <section aria-label="Creative restore preview">
          <p>{preview.notice}</p>
          <pre>
            {JSON.stringify(
              {
                digest: preview.digest,
                total: preview.total,
                add: preview.add,
                replay: preview.replay,
                conflicts: preview.conflicts.slice(0, 30),
                exclusions: preview.exclusions,
              },
              null,
              2,
            )}
          </pre>
          <label>
            All exact identity conflicts
            <select
              value={choice}
              onChange={(e) => setChoice(e.target.value as typeof choice)}
            >
              <option value="KEEP_EXISTING">
                Keep existing; explicitly skip conflicting archive records
              </option>
              <option value="COPY_WITH_NEW_IDS">
                Copy archive conflicts under deterministic new IDs
              </option>
            </select>
          </label>
          <button
            disabled={!reviewed}
            onClick={async () => {
              const r = await unwrap(
                window.hekayti.creativeRestore({
                  previewId: preview.previewId,
                  digest: preview.digest,
                  expectedVersion: preview.expectedVersion,
                  choice,
                }),
              );
              if (r) {
                setStatus(
                  `Restored atomically: ${r.added} additions, ${r.replayed} replays, ${r.kept} kept conflicts. No workflow approval replayed.`,
                );
                setPreview(null);
                await load();
              }
            }}
          >
            Confirm creative restore
          </button>
        </section>
      )}
      <div>
        <label>
          Search title
          <input
            value={filters.search ?? ""}
            onChange={(e) => filter("search", e.target.value)}
          />
        </label>
        {(
          [
            [
              "type",
              [
                "IDEA_SEED",
                "STORY_CONCEPT",
                "STORY_FAMILY",
                "BUILDING_BLOCK",
                "APPROVED_STORY_REFERENCE",
              ],
            ],
            [
              "status",
              [
                "GENERATED",
                "SAVED",
                "REVIEWED",
                "APPROVED",
                "PROMOTED_TO_LIBRARY",
                "ARCHIVED",
              ],
            ],
            ["age", ["0-11m", "12-23m", "24-35m", "36-59m", "60-95m"]],
            [
              "fit",
              ["READY", "NEEDS_ADAPTATION", "SENSITIVE_REVIEW", "NOT_DEFAULT"],
            ],
            [
              "religious",
              ["NO_RELIGIOUS_CLAIM", "RELIGIOUS_ACCURACY_REVIEW_REQUIRED"],
            ],
            [
              "source",
              ["CURATED", "AI", "HYBRID", "HUMAN", "SYNTHETIC_HEKAYTI"],
            ],
            ["provider", ["CHATGPT", "GEMINI", "OTHER", "MANUAL"]],
          ] as [string, string[]][]
        ).map(([name, options]) => (
          <label key={name}>
            {name}
            <select
              aria-label={`Paged ${name}`}
              value={filters[name] ?? ""}
              onChange={(e) => filter(name, e.target.value)}
            >
              <option value="">All / unknown</option>
              {options.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        ))}
        {[
          "culture",
          "theme",
          "objective",
          "storyType",
          "familyId",
          "patternId",
          "profile",
          "plotDepth",
        ].map((name) => (
          <label key={name}>
            {name}
            <input
              aria-label={`Paged ${name}`}
              value={filters[name] ?? ""}
              onChange={(e) => filter(name, e.target.value)}
            />
          </label>
        ))}
      </div>
      <p data-testid="paged-library-count">
        {page.total} matches; page {Math.floor(page.offset / 30) + 1}; at most30
        rows rendered.
      </p>
      <button
        disabled={offset === 0}
        onClick={() => setOffset(Math.max(0, offset - 30))}
      >
        Previous creative page
      </button>
      <button
        disabled={offset + 30 >= page.total}
        onClick={() => setOffset(offset + 30)}
      >
        Next creative page
      </button>
      <ul>
        {page.records.map((r) => (
          <li key={r.recordId}>
            <button onClick={() => setSelected(r)}>{r.title}</button>{" "}
            {r.payload.type} · {r.status} ·{" "}
            {r.creative?.culture.fit ?? "UNSCREENED"}
          </li>
        ))}
      </ul>
      {selected && (
        <section aria-label="Creative record details">
          <h3>{selected.title}</h3>
          <p>
            Record ID: <code>{selected.recordId}</code>; family:{" "}
            {selected.family?.recordId ??
              "Unassigned / insufficient structural evidence"}
          </p>
          <p>
            {selected.payload.type === "IDEA_SEED"
              ? selected.payload.idea
              : "Structured creative content"}
          </p>
          <p>
            Source:{" "}
            {selected.creative?.source?.extractionMethod ?? "Unspecified"};
            culture: {selected.creative?.source?.sourceCulture ?? "Unknown"}.
            Provisional, not native/religious/rights certification.
          </p>
          {(["SAVE", "REVIEW", "APPROVE", "PROMOTE", "ARCHIVE"] as const).map(
            (action) => (
              <button
                key={action}
                onClick={async () => {
                  const r = await unwrap(
                    window.hekayti.libraryCommand({
                      action,
                      recordId: selected.recordId,
                      expectedVersion: page.recordVersion,
                      eventId: crypto.randomUUID(),
                      reviewerAlias: "owner-explicit-action",
                    }),
                  );
                  if (r) {
                    setSelected(
                      r.records
                        .filter((x) => x.recordId === selected.recordId)
                        .at(-1)!,
                    );
                    setStatus(
                      `${action} recorded explicitly; cultural/rights flags remain separate.`,
                    );
                    await load();
                  }
                }}
              >
                {action} creative record
              </button>
            ),
          )}
          {selected.creative?.source && (
            <a
              href={selected.creative.source.itemUrl}
              onClick={(e) => e.preventDefault()}
            >
              Source locator (copy manually): {selected.creative.source.itemUrl}
            </a>
          )}
          <pre>
            {JSON.stringify(
              {
                metadata: selected.creative,
                advisories: selected.creative?.dna
                  ? storyDnaAdvisories(selected.creative.dna)
                  : [],
                scores: selected.scores,
                notes: selected.editorialNote,
              },
              null,
              2,
            )}
          </pre>
          <p>
            Explicit review/approval/promotion is separate from
            cultural/rights/source screening. Use existing Library / Inbox /
            Bridge for human actions and selected Hybrid context.
          </p>
        </section>
      )}
      <p role="status" data-testid="creative-library-status">
        {status}
      </p>
    </section>
  );
}
