// Reproducible batch collector: offline cache after one discovery/download per collection.
// Outputs are generated data, never fabricated canonical outlines or production approvals.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { screenCulture } from "@hekayti/core/creative";
import { emptyStoryDna } from "@hekayti/core/dna";
import { enrichDna } from "./starter-dna.mjs";
const cache = "temp/phase4.1-source-cache",
  date = "2026-10-06",
  sha = (x) => createHash("sha256").update(x).digest("hex");
const decode = (x) =>
  x
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([a-f\d]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(
      /&(?:nbsp|amp|quot|apos|rsquo|lsquo|rdquo|ldquo|mdash|ndash|hellip|aelig|AElig);/g,
      (x) =>
        ({
          "&nbsp;": " ",
          "&amp;": "&",
          "&quot;": '"',
          "&apos;": "'",
          "&rsquo;": "’",
          "&lsquo;": "‘",
          "&rdquo;": "”",
          "&ldquo;": "“",
          "&mdash;": "—",
          "&ndash;": "–",
          "&hellip;": "…",
          "&aelig;": "æ",
          "&AElig;": "Æ",
        })[x],
    )
    .replace(/\s+/g, " ")
    .trim();
const specs = [
  [
    "aesop",
    "Three hundred Aesop’s fables",
    "https://www.gutenberg.org/files/21/21-h/21-h.htm",
    "Greek fable collection; individual origin uncertain",
    "George Fyler Townsend, translator",
    "1867 translation",
    /chap\d+/,
  ],
  [
    "grimm",
    "Household Tales by Brothers Grimm",
    "https://www.gutenberg.org/files/5314/5314-h/5314-h.htm",
    "German collection; individual oral origin uncertain",
    "Jacob and Wilhelm Grimm; Margaret Hunt translator",
    "1884 translation",
    /chap\d+/,
  ],
  [
    "arabian",
    "The Arabian Nights Entertainments",
    "https://www.gutenberg.org/files/128/128-h/128-h.htm",
    "Arab/Persian/Middle Eastern linked collection; individual origin uncertain",
    "Andrew Lang, editor",
    "1898 edition",
    /chap(?!00)\d+/,
  ],
  [
    "westafrica",
    "West African Folk-Tales",
    "https://www.gutenberg.org/cache/epub/66923/pg66923-images.html",
    "Gold Coast/West Africa (collection attribution)",
    "W. H. Barker and Cecilia Sinclair",
    "1917 collection",
    null,
  ],
  [
    "nigeria",
    "Folk Stories from Southern Nigeria",
    "https://www.gutenberg.org/cache/epub/34655/pg34655-images.html",
    "Southern Nigeria (collection attribution)",
    "Elphinstone Dayrell",
    "1910 collection",
    null,
  ],
  [
    "nasreddin",
    "The Turkish Jester",
    "https://www.gutenberg.org/files/16244/16244-h/16244-h.htm",
    "Turkish Nasreddin tradition; NOT Egyptian Goha provenance",
    "George Borrow, translator",
    "1884 translation / 1924 transcribed edition",
    null,
  ],
];
function headings(html) {
  const all = [...html.matchAll(/<h([1234])\b[^>]*>([\s\S]*?)<\/h\1>/gi)];
  return all.map((m, i) => ({
    title: decode(m[2]),
    tag: m[0],
    start: m.index,
    end: all[i + 1]?.index ?? html.length,
    body: html.slice(m.index + m[0].length, all[i + 1]?.index ?? html.length),
  }));
}
function paragraphs(body) {
  const clean = body.replace(
    /<(?:style|script)\b[^>]*>[\s\S]*?<\/(?:style|script)>/gi,
    "",
  );
  return [...clean.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => decode(m[1]))
    .filter(
      (x) => x.split(" ").length > 7 && !/^\[|^Image:|^Illustration:/.test(x),
    );
}
const discovered = [],
  registry = [];
for (const [id, title, url, culture, author, era, pattern] of specs) {
  const html = await readFile(`${cache}/${id}.html`, "utf8");
  let items = [];
  if (id === "nasreddin") {
    const body = html.slice(
      html.indexOf("<p>The story goes"),
      html.indexOf("*** END"),
    );
    const p = paragraphs(body).filter(
      (x) =>
        !x.startsWith("Footnote") && !x.startsWith("The Cogia, now with God"),
    );
    items = p.map((text, i) => ({
      title: `Nasreddin anecdote ${i + 1}: ${text.split(" ").slice(0, 9).join(" ")}`,
      locator: `Narrative paragraph ${i + 1} after THE PLEASANTRIES heading`,
      body: text,
      anchor: "startoftext",
    }));
  } else {
    const h = headings(html);
    if (id === "nigeria")
      for (let i = 0; i < h.length; i++) {
        const roman = h[i].tag.match(/id="([IVXL]+)"/);
        if (roman && h[i + 1])
          items.push({
            title: h[i + 1].title,
            locator: `Tale ${roman[1]}`,
            body: h[i + 1].body,
            anchor: roman[1],
          });
      }
    else
      for (const x of h) {
        const idMatch =
          x.tag.match(/(?:id|name)="([^"]+)"/i) ??
          html
            .slice(Math.max(0, x.start - 150), x.start)
            .match(/(?:id|name)="([^"]+)"[^<>]*>\s*<\/a>\s*$/i);
        const selected = pattern
          ? pattern.test(idMatch?.[1] ?? "")
          : id === "westafrica" &&
            /<span class="divNum">[IVXL]+\.<\/span>/i.test(x.tag);
        if (selected) {
          const p = paragraphs(x.body);
          if (!p.length) continue;
          const anchor = idMatch?.[1] ?? `heading-${x.start}`;
          items.push({
            title: x.title.replace(/^\d+\s+|^[IVXL]+\.\s+/g, ""),
            locator: `${x.title}; source character offset ${x.start}`,
            body: p.join("\n"),
            anchor,
          });
        }
      }
  }
  // Exact evidence duplicates are excluded; same-title/different narrative retained.
  const seen = new Set();
  items = items.filter((x) => {
    const h = sha(x.body);
    if (seen.has(h)) return false;
    seen.add(h);
    return x.body.length > 70;
  });
  discovered.push(
    ...items.map((item, i) => ({
      ...item,
      id: `${id}-${i + 1}`,
      collectionId: id,
      collectionTitle: title,
      url,
      culture,
      author,
      era,
    })),
  );
  registry.push({
    collectionId: id,
    title,
    url,
    culture,
    author,
    era,
    retrievedAt: date,
    cacheSha256: sha(html),
    status: "IMPORTED",
    count: items.length,
    cursor: "all selected narrative sections",
    confidence:
      "high for extracted English edition, not oral-origin attribution",
    method:
      "Historical narrative-section/paragraph evidence, not catalog title invention",
  });
}
for (const [id, titles, url] of [
  [
    "egypt1",
    [
      "TALES OF THE MAGICIANS",
      "THE PEASANT AND THE WORKMAN",
      "THE SHIPWRECKED SAILOR",
      "THE ADVENTURES OF SANEHAT",
    ],
    "https://www.gutenberg.org/ebooks/7386",
  ],
  [
    "egypt2",
    [
      "THE TAKING OF JOPPA",
      "THE DOOMED PRINCE",
      "ANPU AND BATA",
      "SETNA AND THE MAGIC BOOK",
    ],
    "https://www.gutenberg.org/ebooks/7413",
  ],
]) {
  const rawSource = await readFile(`${cache}/${id}.txt`, "utf8");
  const source = rawSource.replace(
      /\r\n/g,
      "\n",
    ),
    start = source.indexOf(
      titles[0],
      source.indexOf(titles[0]) + titles[0].length,
    );
  for (const [i, title] of titles.entries()) {
    const from = source.indexOf(title, start);
    if (from < 0) throw new Error(`Missing narrative ${title}`);
    const tail = source.slice(from + title.length),
      remarks = tail.search(/^Remarks\s*$/im);
    if (remarks < 0) throw new Error(`Missing commentary boundary ${title}`);
    const body = tail.slice(0, remarks).trim();
    discovered.push({
      id: `${id}-${i + 1}`,
      title,
      body,
      anchor: "",
      locator: `Narrative ${title}; plain text line ${source.slice(0, from).split("\n").length}, excludes translator REMARKS`,
      collectionId: id,
      collectionTitle: `Egyptian Tales, ${id === "egypt1" ? "First" : "Second"} Series`,
      url,
      culture:
        "Ancient Egyptian narrative (translator attribution), NOT modern Egyptian folklore",
      author: "W. M. Flinders Petrie, translator/editor",
      era: "1890s translation of ancient papyri",
    });
  }
  registry.push({
    collectionId: id,
    title: `Egyptian Tales ${id}`,
    url,
    culture: "Ancient Egypt, not modern folklore",
    author: "W. M. Flinders Petrie",
    era: "1890s translation",
    retrievedAt: date,
    cacheSha256: sha(rawSource),
    status: "IMPORTED",
    count: titles.length,
    cursor: "Four narrative units; commentary excluded",
    confidence: "medium, historical translation limitations",
    method: "Narrative text through next REMARKS boundary",
  });
}
{
  const source = await readFile(`${cache}/egypt-modern.txt`, "utf8"),
    sections = [...source.matchAll(/^Histoire[^\n]+/gm)];
  for (const [i, m] of sections.entries()) {
    const body = source
      .slice(
        m.index + m[0].length,
        sections[i + 1]?.index ?? source.indexOf("GLOSSAIRE", m.index),
      )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);
    discovered.push({
      id: `egypt-modern-${i + 1}`,
      title: m[0].replace(/\s+/g, " ").trim(),
      body,
      openingOnly: true,
      anchor: "",
      locator: `French tale ${i + 1}, ${m[0].trim()}, OCR line ${source.slice(0, m.index).split("\n").length}; OPENING EXCERPT ONLY: interleaved Arabic/French OCR prevents reliable automated whole-tale boundaries`,
      collectionId: "egypt-modern",
      collectionTitle: "Contes arabes modernes",
      url: "https://archive.org/details/contesarabesmode00spit",
      culture:
        "Egyptian Arabic tales recorded by Spitta in 1883; colonial transcription/translation, not contemporary certification",
      author: "Guillaume Spitta-Bey, collector/translator",
      era: "1883 edition",
    });
  }
  registry.push({
    collectionId: "egypt-modern",
    title: "Contes arabes modernes",
    url: "https://archive.org/details/contesarabesmode00spit",
    culture: "Egyptian Arabic oral collection, historical attribution",
    author: "Guillaume Spitta-Bey",
    era: "1883",
    retrievedAt: date,
    cacheSha256: sha(source),
    status: "IMPORTED",
    count: sections.length,
    cursor:
      "12 actual French opening excerpts, not complete summaries; interleaved OCR uncertain",
    confidence:
      "medium; transliterated Arabic/French source, colonial/OCR limitations",
    method:
      "Opening inspiration evidence only; French/Arabic human reviewer needed before complete narrative extraction",
  });
}
for (let i = 1; i <= 2; i++) {
  const html = await readFile(`${cache}/kalila-${i}.html`, "utf8");
  const content = html.slice(html.indexOf('id="mw-content-text"'));
  const p = paragraphs(content).filter(
    (x) =>
      x.length > 100 &&
      !/Creative Commons|Wikisource|Copyright|license/i.test(x),
  );
  const body = p.join("\n");
  discovered.push({
    id: `kalila-${i}`,
    title:
      i === 1
        ? "The commission of Bidpai’s book"
        : "Barzouyeh’s mission to India",
    body,
    anchor: "",
    locator: `Chapter ${i}, historical translation narrative paragraphs`,
    collectionId: "kalila",
    collectionTitle: "Kalila and Dimna (1819)",
    url: `https://en.wikisource.org/wiki/Kalila_and_Dimna_(1819)/Chapter_${i}`,
    culture:
      "Indian/Persian/Arabic transmission; individual tradition not Egyptian",
    author: "Ibn al-Muqaffaʿ tradition; Wyndham Knatchbull translator",
    era: "1819 English translation",
  });
}
registry.push({
  collectionId: "kalila",
  title: "Kalila and Dimna (1819)",
  url: "https://en.wikisource.org/wiki/Kalila_and_Dimna_(1819)",
  retrievedAt: date,
  status: "PARTIAL",
  count: 2,
  cursor: "Chapters1–2 available; Chapters3–14 HTTP unavailable, not inferred",
  confidence:
    "medium; historic frame narratives, not full animal-story collection",
  method: "Cached actual chapter paragraphs; no title-only fabrication",
});
registry.push({
  collectionId: "holy-land",
  title: "Folk-lore of the Holy Land",
  url: "https://original.sacred-texts.com/asia/flhl/index.htm",
  retrievedAt: date,
  status: "SKIPPED",
  count: 0,
  cursor: "Index fetch unavailable; retain discovery lead, do not count",
  confidence: "low",
  method: "No narrative extraction",
});
await mkdir("temp/phase4.1-source-cache", { recursive: true });
await writeFile(`${cache}/sections.json`, JSON.stringify(discovered, null, 2));
console.log(
  JSON.stringify(
    {
      discovered: discovered.length,
      collections: registry.map((x) => ({
        id: x.collectionId,
        count: x.count,
      })),
    },
    null,
    2,
  ),
);
if (process.argv.includes("--emit")) {
  // Extractive seed deliberately quotes a bounded source observation, rather than
  // asserting an invented full plot. ORIGINAL_ABSTRACT overrides are authored later.
  const overrides = {
    ...JSON.parse(
      await readFile("examples/starter-library/abstracts.json", "utf8"),
    ),
    ...JSON.parse(
      await readFile(
        "examples/starter-library/regional-abstracts.json",
        "utf8",
      ),
    ),
  };
  overrides["aesop-133"] =
    "A dove rescues a drowning ant with a leaf. Later the ant stings a birdcatcher targeting the dove, interrupting the trap and allowing its benefactor to escape.";
  overrides["aesop-155"] =
    "A peasant frees a trapped eagle. The bird later pulls him away from an unsafe wall by snatching a bundle; the fallen wall reveals why the interruption protected him.";
  const dnaEntries = JSON.parse(
    await readFile("examples/starter-library/dna-enrichment.json", "utf8"),
  );
  const families = [
    "cause-and-consequence",
    "clever-problem-solving",
    "cooperation-and-reciprocity",
    "journey-and-return",
    "perspective-and-misunderstanding",
    "promise-and-trust",
  ];
  const record = (id, title, payload) => ({
    schemaVersion: "library-record/1.0",
    recordId: id,
    version: 1,
    title,
    payload,
    status: "GENERATED",
    metadata: {
      sourceType: "CURATED",
      sourceProvider: "MANUAL",
      providerNote: null,
      modelNote: null,
    },
    tags: {
      ageBands: [],
      storyTypes: ["values"],
      themes: [],
      objectives: ["entertainment"],
      mechanism: "source-inspiration",
    },
    family: null,
    variantId: null,
    variantNumber: null,
    derivedFrom: null,
    scores: null,
    editorialNote:
      "Unreviewed source inspiration, not an age-approved children's story.",
    origin: { transport: "human-authored", importId: null, packageId: null },
  });
  const records = families.map((name, i) => ({
    ...record(`hekayti-family-${i}`, `Hekayti structure: ${name}`, {
      type: "STORY_FAMILY",
      structure: {
        narrativePattern: name,
        mechanism: name,
        conflictPattern:
          "A character encounters a bounded challenge; source detail is not a template mandate.",
        resolutionPattern:
          "Rework the source outcome as a safe, understandable creative resolution.",
        emotionalArc:
          "Notice a difficulty → consider an action → reflect on the outcome",
        reusableConstraints: [
          "Age/Arabic safety rules remain fixed",
          "Do not present religious/mythological source as facts",
          "Similarity allowed; cultural adaptation explicit",
        ],
      },
    }),
    metadata: {
      sourceType: "SYNTHETIC_HEKAYTI",
      sourceProvider: "MANUAL",
      providerNote: null,
      modelNote: null,
    },
    creative: {
      schemaVersion: "creative-metadata/1.0",
      source: {
        collectionId: "hekayti-structures",
        collectionTitle: "Authored structural grouping labels",
        itemUrl: "https://github.com/iZiadeRabea/hekayti-studio",
        itemLocator: `Family ${name}`,
        retrievedAt: date,
        sourceCulture:
          "Synthetic Hekayti editorial structure; not indigenous provenance",
        originalLanguage: "English metadata",
        era: null,
        author: "Hekayti Engineering",
        kind: "SYNTHETIC_HEKAYTI",
        extractionMethod: "AGENT_EDITORIAL_SYNTHESIS",
        confidence: "medium",
        evidence:
          "Explicit abstract grouping scaffold, not a traditional tale or claim of human cultural review.",
        evidenceSha256: null,
        rights: "UNREVIEWED",
        rightsNote:
          "Authored prototype metadata, user rights review remains separate.",
      },
      culture: screenCulture(name, "A structural editorial scaffold"),
      historicalAttribution: null,
      usageSummary: null,
    },
  }));
  const numbers = new Map();
  const mappedFamilies = new Map();
  for (const item of discovered) {
    const sentences = item.body.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [item.body],
      words = (x) => x.split(/\s+/);
    const first = words(sentences[0].trim()).slice(0, 28).join(" "),
      last = words(sentences.at(-1).trim()).slice(-18).join(" ");
    const evidence = `Opening observation: ${first}.${item.openingOnly ? " Closing observation NOT_AVAILABLE (interleaved OCR; opening-only seed)." : ` Closing observation: ${last}.`}`;
    const abstract = overrides[item.id],
      idea =
        abstract ??
        `Source-derived inspiration seed (extractive, not a full original summary): ${evidence}`;
    const r = record(`source-${item.id}`, item.title, {
        type: "IDEA_SEED",
        idea,
      }),
      dna = enrichDna(item, first, last, dnaEntries[item.id], dnaEntries);
    r.tags.themes = ["source-inspiration"];
    r.creative = {
      schemaVersion: "creative-metadata/1.0",
      source: {
        collectionId: item.collectionId,
        collectionTitle: item.collectionTitle,
        itemUrl: item.url + (item.anchor ? "#" + item.anchor : ""),
        itemLocator: item.locator,
        retrievedAt: date,
        sourceCulture: item.culture,
        originalLanguage: null,
        era: item.era,
        author: item.author,
        kind: "SOURCE_DERIVED",
        extractionMethod: abstract ? "ORIGINAL_ABSTRACT" : "EXTRACTIVE_SEED",
        summaryScope: abstract
          ? item.openingOnly || abstract.startsWith("Opening-only")
            ? "OPENING_OBSERVATION"
            : "COMPLETE_NARRATIVE"
          : "EXTRACTIVE_OBSERVATIONS",
        confidence: abstract || item.openingOnly ? "medium" : "high",
        evidence,
        evidenceSha256: sha(item.body),
        rights: "HISTORICAL_PD_US_ASSERTION",
        rightsNote:
          "Historical edition; host/age supports PD-US lead, not global clearance/native cultural review. Check local rights/editorial use.",
      },
      culture: screenCulture(item.title, item.body + " " + idea),
      dna,
      historicalAttribution: null,
      usageSummary: null,
    };
    if (item.collectionId === "egypt-modern") {
      r.creative.culture.fit = "SENSITIVE_REVIEW";
      r.creative.culture.factors.push({
        dimension: "family",
        finding:
          "Historical Egyptian collection has coercive, adult or violent contexts; opening-only OCR cannot clear unseen content.",
        adaptation:
          "Source lead only: qualified Arabic/French reading, safeguarding and religious screening before any child adaptation.",
      });
      r.creative.culture.religiousReview = "RELIGIOUS_ACCURACY_REVIEW_REQUIRED";
      r.creative.culture.religiousNote =
        "Conservative human-review flag for incompletely extracted historical source, not a verified religious claim.";
    }
    if (dna.pattern) {
      let family = mappedFamilies.get(dna.pattern.signature);
      if (!family) {
        family = {
          ...record(
            `structure-${dna.pattern.patternId}`,
            `Structure: ${dna.pattern.mechanism}`,
            {
              type: "STORY_FAMILY",
              structure: {
                narrativePattern: dna.pattern.signature,
                mechanism: dna.pattern.mechanism,
                conflictPattern: dna.pattern.conflictCategory,
                resolutionPattern: dna.pattern.resolutionCategory,
                emotionalArc:
                  "Not established by structural classification; human adaptation required.",
                reusableConstraints: [
                  "Structural grouping is agent inference, not certified traditional tale type",
                  "Source names/settings/themes do not define this family",
                  "No automatic approval, age fit or promotion",
                ],
              },
            },
          ),
          metadata: {
            sourceType: "SYNTHETIC_HEKAYTI",
            sourceProvider: "MANUAL",
            providerNote: null,
            modelNote: null,
          },
          creative: {
            ...r.creative,
            source: {
              ...r.creative.source,
              kind: "SYNTHETIC_HEKAYTI",
              extractionMethod: "AGENT_EDITORIAL_SYNTHESIS",
              summaryScope: "NOT_APPLICABLE",
              sourceCulture:
                "Agent-authored editorial structural grouping, not indigenous provenance",
              evidence:
                "Structural vector derived from selected source actions; no qualified human review occurred.",
            },
            dna: { ...emptyStoryDna(), pattern: dna.pattern },
          },
        };
        mappedFamilies.set(dna.pattern.signature, family);
        records.push(family);
      }
      r.family = { recordId: family.recordId, version: 1 };
      r.variantNumber = (numbers.get(family.recordId) ?? 0) + 1;
      numbers.set(family.recordId, r.variantNumber);
      r.variantId = `${r.recordId}-variant`;
      r.tags.mechanism = dna.pattern.mechanism;
    }
    records.push(r);
  }
  await mkdir("examples/starter-library", { recursive: true });
  await mkdir("docs/story-library", { recursive: true });
  await writeFile(
    "examples/starter-library/starter-library.jsonl",
    records.map((x) => JSON.stringify(x)).join("\n") + "\n",
  );
  await writeFile(
    "docs/story-library/source-registry.json",
    JSON.stringify(
      {
        schemaVersion: "source-registry/1.0",
        retrievedAt: date,
        collections: registry,
        counts: {
          sourceDerived: discovered.length,
          canonicalConcepts: 0,
          syntheticFamilies: families.length + mappedFamilies.size,
          originalAbstracts: Object.keys(overrides).length,
          extractiveSeeds: discovered.length - Object.keys(overrides).length,
          dnaRecords: discovered.length,
          representativeRichDna: Object.keys(dnaEntries).length,
          structuralPatterns: mappedFamilies.size,
          structureMappedSourceRecords: records.filter((r) => r.family).length,
          performanceFixtures: 0,
        },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `Emitted ${records.length} strict records; extracted seeds explicitly distinguished from original abstracts.`,
  );
}
