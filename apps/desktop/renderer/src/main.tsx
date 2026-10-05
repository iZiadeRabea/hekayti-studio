import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/noto-sans-arabic/400.css";
import "./style.css";
import { ageGuidance, invalidateDependents } from "@hekayti/core";
import { rtlSamples } from "@hekayti/export";
import type { Project, StoryBlueprint } from "@hekayti/contracts";
import type { DesktopApi, Result } from "../../src/api";
declare global {
  interface Window {
    hekayti: DesktopApi;
  }
}
function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [blueprint, setBlueprint] = useState<StoryBlueprint | null>(null);
  const [status, setStatus] = useState(
    "Synthetic lab only - no AI / private data",
  );
  const [tab, setTab] = useState("Projects");
  const [diagnostics, setDiagnostics] = useState<Record<string, unknown>>({});
  const [stale, setStale] = useState(false);
  async function unwrap<T>(p: Promise<Result<T>>): Promise<T | undefined> {
    const result = await p;
    if (!result.ok) {
      setStatus(result.error.code + ": " + result.error.message);
      return;
    }
    return result.value;
  }
  async function reload() {
    const value = await unwrap(window.hekayti.listProjects());
    if (value) setProjects(value);
  }
  useEffect(() => {
    void reload();
  }, []);
  return (
    <>
      <header>
        <h1>حكايتي - مختبر المرحلة الثانية</h1>
        <p>بيانات اصطناعية فقط. هذه واجهة تجارب وليست محرّر الكتاب النهائي.</p>
      </header>
      <nav aria-label="Prototype sections">
        {[
          "Projects",
          "RTL Test",
          "Core Data Inspector",
          "Export Test",
          "Settings / Diagnostics",
        ].map((x) => (
          <button key={x} aria-pressed={tab === x} onClick={() => setTab(x)}>
            {x}
          </button>
        ))}
      </nav>
      <main>
        <p role="status" className="status" dir="auto">
          {status}
        </p>
        {tab === "Projects" && (
          <section>
            <h2>المشروعات الاصطناعية</h2>
            <button
              onClick={async () => {
                await unwrap(window.hekayti.seedSynthetic());
                await reload();
                setStatus("Synthetic fixtures ready");
              }}
            >
              New Synthetic Projects
            </button>
            <button
              onClick={async () => {
                const value = await unwrap(window.hekayti.openProject());
                if (value) {
                  setBlueprint(value.blueprint);
                  setTab("Core Data Inspector");
                  setStatus(
                    "Read-only validated import: " +
                      value.migrations.join("; "),
                  );
                }
              }}
            >
              Open synthetic JSON safely
            </button>
            <ul>
              {projects.map((p) => (
                <li key={p.projectId}>
                  <span>{p.title}</span>
                  <bdi>{p.projectId}</bdi>
                  <button
                    onClick={async () => {
                      const b = await unwrap(
                        window.hekayti.inspectProject(p.projectId),
                      );
                      if (b) {
                        setBlueprint(b);
                        setTab("Core Data Inspector");
                      }
                    }}
                  >
                    Inspect
                  </button>
                  <button
                    onClick={async () => {
                      const saved = await unwrap(
                        window.hekayti.updateTitle({
                          projectId: p.projectId,
                          title: p.title + " - test",
                          expectedVersion: p.recordVersion,
                        }),
                      );
                      if (saved) {
                        await reload();
                        setStatus(
                          "SQLite update saved; version " + saved.recordVersion,
                        );
                      }
                    }}
                  >
                    Save synthetic title edit
                  </button>
                  <button
                    onClick={async () => {
                      const path = await unwrap(
                        window.hekayti.saveProject(p.projectId),
                      );
                      if (path) setStatus("New snapshot saved: " + path);
                    }}
                  >
                    Save new JSON snapshot
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {tab === "RTL Test" && (
          <section>
            <h2>العربية واتجاه القراءة</h2>
            <p>
              جرّب التحديد والكتابة والأسطر الجديدة. النصوص هنا مؤقتة؛ لا تُحفظ
              تلقائيًا.
            </p>
            {[
              ["MSA", rtlSamples.msa, "rtl", "ar"],
              ["Egyptian", rtlSamples.egyptian, "rtl", "ar-EG"],
              ["English", rtlSamples.english, "ltr", "en"],
              ["Mixed", rtlSamples.mixed, "rtl", "ar"],
            ].map(([label, text, dir, lang]) => (
              <label key={label}>
                <span>{label}</span>
                <textarea
                  aria-label={label + " editing sample"}
                  defaultValue={text}
                  dir={dir}
                  lang={lang}
                  rows={3}
                />
              </label>
            ))}
            <p className="mixed">
              الرمز <bdi>A-12</bdi> والعدد <bdi>١٢</bdi> - <bdi>Paper Cut</bdi>{" "}
              - هل النص واضح؟
            </p>
          </section>
        )}
        {tab === "Core Data Inspector" && (
          <section>
            <h2>العقود والعمر والموافقات</h2>
            {blueprint ? (
              <>
                <p>{blueprint.workingTitle}</p>
                <pre dir="ltr">
                  {JSON.stringify(
                    ageGuidance({
                      ageMonths: blueprint.ageMonths,
                      mode: blueprint.primaryLanguageMode,
                      category: blueprint.primaryCategory,
                    }),
                    null,
                    2,
                  )}
                </pre>
                <details>
                  <summary>Validated canonical blueprint</summary>
                  <pre dir="ltr">{JSON.stringify(blueprint, null, 2)}</pre>
                </details>
              </>
            ) : (
              <p>اختر Inspect من قائمة المشروعات.</p>
            )}
            <button onClick={() => setStale(true)}>
              Simulate approved text edit
            </button>
            <pre dir="ltr">
              {JSON.stringify(
                invalidateDependents(stale ? ["text"] : [], [
                  {
                    id: "page-plan",
                    dependencies: ["text"],
                    state: "approved",
                  },
                  {
                    id: "illustration",
                    dependencies: ["page-plan"],
                    state: "approved",
                  },
                  {
                    id: "export",
                    dependencies: ["illustration"],
                    state: "approved",
                  },
                ]),
                null,
                2,
              )}
            </pre>
            <p>المحاكاة توضح بطلان الاعتماد ولا تمنح موافقة حقيقية.</p>
          </section>
        )}
        {tab === "Export Test" && (
          <section>
            <h2>تجربة PDF اصطناعية</h2>
            <p>
              ٢٠٠ مم مقاس القطع؛ الطباعة تضيف ٣ مم نزيف لكل جانب. ليست PDF/X أو
              موافقة مطبعة.
            </p>
            <button
              onClick={async () => {
                setStatus("Rendering synthetic print + digital proofs...");
                const value = await unwrap(window.hekayti.exportProof());
                if (value) setStatus(JSON.stringify(value));
              }}
            >
              Generate PRINT + DIGITAL proof
            </button>
          </section>
        )}
        {tab === "Settings / Diagnostics" && (
          <section>
            <h2>التشخيص المحلي</h2>
            <button
              onClick={async () => {
                const value = await unwrap(window.hekayti.diagnostics());
                if (value) setDiagnostics(value);
              }}
            >
              Refresh diagnostics
            </button>
            <pre dir="ltr">{JSON.stringify(diagnostics, null, 2)}</pre>
            <p>لا مفاتيح API، ولا إرسال تشخيصات إلى خدمة سحابية.</p>
          </section>
        )}
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
