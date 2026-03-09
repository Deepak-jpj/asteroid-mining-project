import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import AsteroidDistanceChart from "@/components/AsteroidDistanceChart";

type ReportMap = Record<string, any>;
export const dynamic = "force-dynamic";

const ASSIGNED_TO_SYNTH: Record<string, string> = {
  "1": "SYNTH-1000",
  "1 ceres": "SYNTH-1000",
  ceres: "SYNTH-1000",
  "2": "SYNTH-1001",
  "2 pallas": "SYNTH-1001",
  pallas: "SYNTH-1001",
  "3": "SYNTH-1002",
  "3 juno": "SYNTH-1002",
  juno: "SYNTH-1002",
  "4": "SYNTH-1003",
  "4 vesta": "SYNTH-1003",
  vesta: "SYNTH-1003",
  "5": "SYNTH-1004",
  "5 astraea": "SYNTH-1004",
  astraea: "SYNTH-1004",
  "6": "SYNTH-1005",
  "6 hebe": "SYNTH-1005",
  hebe: "SYNTH-1005",
  "7": "SYNTH-1006",
  "7 iris": "SYNTH-1006",
  iris: "SYNTH-1006",
  "8": "SYNTH-1007",
  "8 flora": "SYNTH-1007",
  flora: "SYNTH-1007",
  "9": "SYNTH-1008",
  "9 metis": "SYNTH-1008",
  metis: "SYNTH-1008",
  "10": "SYNTH-1009",
  "10 hygiea": "SYNTH-1009",
  hygiea: "SYNTH-1009",
  "11": "SYNTH-1010",
  "11 parthenope": "SYNTH-1010",
  parthenope: "SYNTH-1010",
  "12": "SYNTH-1011",
  "12 victoria": "SYNTH-1011",
  victoria: "SYNTH-1011",
  "13": "SYNTH-1012",
  "13 egeria": "SYNTH-1012",
  egeria: "SYNTH-1012",
  "14": "SYNTH-1013",
  "14 irene": "SYNTH-1013",
  irene: "SYNTH-1013",
  "15": "SYNTH-1014",
  "15 eunomia": "SYNTH-1014",
  eunomia: "SYNTH-1014",
  "16": "SYNTH-1015",
  "16 psyche": "SYNTH-1015",
  psyche: "SYNTH-1015",
  "17": "SYNTH-1016",
  "17 thetis": "SYNTH-1016",
  thetis: "SYNTH-1016",
  "18": "SYNTH-1017",
  "18 melpomene": "SYNTH-1017",
  melpomene: "SYNTH-1017",
  "19": "SYNTH-1018",
  "19 fortuna": "SYNTH-1018",
  fortuna: "SYNTH-1018",
  "20": "SYNTH-1019",
  "20 massalia": "SYNTH-1019",
  massalia: "SYNTH-1019",
  "92": "SYNTH-1092",
  "92 undina": "SYNTH-1092",
  undina: "SYNTH-1092",
  "93": "SYNTH-1093",
  "93 minerva": "SYNTH-1093",
  minerva: "SYNTH-1093",
  "94": "SYNTH-1094",
  "94 aurora": "SYNTH-1094",
  aurora: "SYNTH-1094",
  "95": "SYNTH-1095",
  "95 arethusa": "SYNTH-1095",
  arethusa: "SYNTH-1095",
  "96": "SYNTH-1096",
  "96 aegle": "SYNTH-1096",
  aegle: "SYNTH-1096",
};
const SYNTH_TO_ASSIGNED: Record<string, string> = {
  "SYNTH-1000": "1 Ceres",
  "SYNTH-1001": "2 Pallas",
  "SYNTH-1002": "3 Juno",
  "SYNTH-1003": "4 Vesta",
  "SYNTH-1004": "5 Astraea",
  "SYNTH-1005": "6 Hebe",
  "SYNTH-1006": "7 Iris",
  "SYNTH-1007": "8 Flora",
  "SYNTH-1008": "9 Metis",
  "SYNTH-1009": "10 Hygiea",
  "SYNTH-1010": "11 Parthenope",
  "SYNTH-1011": "12 Victoria",
  "SYNTH-1012": "13 Egeria",
  "SYNTH-1013": "14 Irene",
  "SYNTH-1014": "15 Eunomia",
  "SYNTH-1015": "16 Psyche",
  "SYNTH-1016": "17 Thetis",
  "SYNTH-1017": "18 Melpomene",
  "SYNTH-1018": "19 Fortuna",
  "SYNTH-1019": "20 Massalia",
  "SYNTH-1092": "92 Undina",
  "SYNTH-1093": "93 Minerva",
  "SYNTH-1094": "94 Aurora",
  "SYNTH-1095": "95 Arethusa",
  "SYNTH-1096": "96 Aegle",
};

const CATEGORY_COLORS: Record<string, string> = {
  orbital: "#38bdf8",
  physical: "#f59e0b",
  composition: "#34d399",
  aether_compute: "#a78bfa",
  economic: "#f43f5e",
};

const CLASS_MINING_TECH: Record<string, string[]> = {
  "M-type": [
    "Autonomous robotic drilling",
    "Magnetic metal extraction",
    "Laser-assisted ore fragmentation",
    "Electromagnetic separation and smelting",
  ],
  "S-type": [
    "Mechanical excavation",
    "Electrostatic dust collection",
    "Microwave-assisted regolith processing",
    "In-situ beneficiation and sorting",
  ],
  "C-type": [
    "Thermal volatile extraction",
    "Solar electrolysis for H2/O2",
    "Cryogenic capture of water vapor",
    "Low-energy regolith handling robotics",
  ],
  "D-type": [
    "Optical mining via concentrated sunlight",
    "Volatile sublimation capture systems",
    "Non-contact particulate collection",
    "Thermal cracking for organics release",
  ],
  "V-type": [
    "Surface sample robotics",
    "Pneumatic conveyance",
    "Basalt crushing and grading",
    "Precision coring of hard lithology",
  ],
};

async function loadReports(): Promise<ReportMap | null> {
  const candidates = [
    path.join(process.cwd(), "public", "full_reports.json"),
    path.join(process.cwd(), "..", "backend", "data", "reports", "full_reports.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as ReportMap;
      }
    } catch {
      // try next fallback path
    }
  }

  return null;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function resolveMappedSpk(query: string): string | null {
  const q = normalize(query);
  if (ASSIGNED_TO_SYNTH[q]) return ASSIGNED_TO_SYNTH[q];
  const dMatch = /^d(\d+)$/i.exec(query.trim());
  if (dMatch) return `SYNTH-${1000 + Number(dMatch[1])}`;
  return null;
}

async function fetchAsteroid3dRow(spkOrAlias: string): Promise<any | null> {
  const mapped = resolveMappedSpk(spkOrAlias);
  const wanted = new Set(
    [spkOrAlias, spkOrAlias.toUpperCase(), spkOrAlias.toLowerCase(), mapped || ""].filter(Boolean)
  );
  const bases = Array.from(
    new Set(
      [
        process.env.NEXT_PUBLIC_API_BASE_URL,
        process.env.API_BASE_URL,
        "http://localhost:8000",
        "http://localhost:8001",
      ].filter(Boolean)
    )
  ) as string[];

  for (const base of bases) {
    try {
      const res = await fetch(`${base}/v1/asteroids/3d-data?limit=5000`, { cache: "no-store" });
      if (!res.ok) continue;
      const rows = await res.json();
      if (!Array.isArray(rows)) continue;
      const row = rows.find((r: any) =>
        wanted.has(String(r?.spk_id || "")) ||
        wanted.has(String(r?.designation || "")) ||
        wanted.has(String(r?.name || ""))
      );
      if (row) return row;
    } catch {
      // try next base
    }
  }
  return null;
}

function buildFallbackReportFrom3d(row: any) {
  const spk = String(row?.spk_id || "UNKNOWN");
  const spec = row?.spectral_type || "C-type";
  const score = Number(row?.feasibility_score || 0);
  const dc = Number(row?.dc_score || 0);
  const total = Number(row?.total_value_usd || 0);
  const band = score >= 7.5 ? "High" : score >= 5 ? "Moderate" : "Low";
  return {
    asteroid: {
      spk_id: spk,
      name: row?.name || row?.designation || spk,
      designation: row?.designation || spk,
      spectral_type_db: spec,
    },
    parameters_used: {
      categories: {
        orbital: ["semi_major_axis_au", "eccentricity", "inclination_deg", "moid_au", "delta_v_km_s"],
        physical: ["diameter_km"],
        composition: ["spectral_type"],
        aether_compute: ["dc_score"],
        economic: ["total_value_usd"],
      },
      available: Object.keys(row || {}),
      missing: [],
    },
    classification: {
      ensemble_prediction: { predicted_class: spec, votes: 1, confidence: 0.55 },
      models: [
        {
          model: "fallback-3d-row-classifier-v1",
          prediction: spec,
          confidence: 0.55,
          top_features: ["spectral_type", "delta_v_km_s", "moid_au"],
        },
      ],
    },
    rating: {
      overall_score: Number(score.toFixed(2)),
      band,
      models: [
        { model: "fallback-feasibility-from-3d-v1", score: Number(score.toFixed(2)), top_features: ["feasibility_score"] },
        { model: "fallback-dc-from-3d-v1", score: Number(dc.toFixed(2)), top_features: ["dc_score"] },
      ],
    },
    mission_summary: {
      delta_v_km_s: row?.delta_v_km_s ?? null,
      moid_au: row?.moid_au ?? null,
      feasibility_score: Number(score.toFixed(2)),
      dc_score: Number(dc.toFixed(2)),
      total_value_usd: total,
      mission_difficulty: row?.mission_difficulty || "Unknown",
      recommended_method: row?.recommended_method || "Robotic extraction",
    },
    model_references: [
      {
        model: "fallback-3d-row-classifier-v1",
        type: "classification",
        reference: "Fallback report generated from /v1/asteroids/3d-data when precomputed report is unavailable.",
      },
      {
        model: "fallback-feasibility-from-3d-v1",
        type: "rating",
        reference: "Uses backend 3D dataset feasibility_score directly as fallback.",
      },
    ],
    training_metadata: { classification_accuracy: null, feasibility_mae: null, dc_mae: null },
  };
}

function buildMinimalReportFromQuery(query: string) {
  const mapped = resolveMappedSpk(query);
  const spk = String(mapped || query || "UNKNOWN");
  return {
    asteroid: {
      spk_id: spk,
      name: spk,
      designation: spk,
      spectral_type_db: "C-type",
    },
    parameters_used: {
      categories: {
        orbital: ["delta_v_km_s", "moid_au"],
        physical: ["diameter_km"],
        composition: ["spectral_type"],
        aether_compute: ["dc_score"],
        economic: ["total_value_usd"],
      },
      available: ["spk_id"],
      missing: [],
    },
    classification: {
      ensemble_prediction: { predicted_class: "C-type", votes: 1, confidence: 0.5 },
      models: [
        {
          model: "minimal-fallback-classifier-v1",
          prediction: "C-type",
          confidence: 0.5,
          top_features: ["spk_id"],
        },
      ],
    },
    rating: {
      overall_score: 0,
      band: "Unknown",
      models: [
        { model: "minimal-fallback-rating-v1", score: 0, top_features: ["spk_id"] },
      ],
    },
    mission_summary: {
      delta_v_km_s: null,
      moid_au: null,
      feasibility_score: 0,
      dc_score: 0,
      total_value_usd: 0,
      mission_difficulty: "Unknown",
      recommended_method: "Robotic extraction",
    },
    model_references: [
      {
        model: "minimal-fallback-report-v1",
        type: "fallback",
        reference: "Used when neither precomputed report nor backend asteroid row is available.",
      },
    ],
    training_metadata: { classification_accuracy: null, feasibility_mae: null, dc_mae: null },
  };
}

function findReport(allReports: ReportMap, query: string): { report: any | null; matchedKey: string | null; assignedAlias: string | null } {
  if (!query) return { report: null, matchedKey: null, assignedAlias: null };
  const normalized = normalize(query);
  const aliasHit = ASSIGNED_TO_SYNTH[normalized];
  if (aliasHit && allReports[aliasHit]) {
    return { report: allReports[aliasHit], matchedKey: aliasHit, assignedAlias: query };
  }
  const dMapped = resolveMappedSpk(query);
  if (dMapped) {
    const mappedHit = allReports[dMapped];
    if (mappedHit) return { report: mappedHit, matchedKey: dMapped, assignedAlias: query };
  }
  const exact = allReports[query] || allReports[query.toUpperCase()] || allReports[query.toLowerCase()];
  if (exact) return { report: exact, matchedKey: query, assignedAlias: null };

  const q = normalize(query);
  for (const [k, v] of Object.entries(allReports)) {
    const asteroid = (v as any)?.asteroid || {};
    const spk = normalize(String(asteroid.spk_id || k));
    const name = normalize(String(asteroid.name || ""));
    const des = normalize(String(asteroid.designation || ""));
    if (spk === q || name === q || des === q) {
      return { report: v, matchedKey: k, assignedAlias: null };
    }
  }

  for (const [k, v] of Object.entries(allReports)) {
    const asteroid = (v as any)?.asteroid || {};
    const spk = normalize(String(asteroid.spk_id || k));
    const name = normalize(String(asteroid.name || ""));
    const des = normalize(String(asteroid.designation || ""));
    if (spk.includes(q) || name.includes(q) || des.includes(q)) {
      return { report: v, matchedKey: k, assignedAlias: null };
    }
  }

  return { report: null, matchedKey: null, assignedAlias: null };
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "-";
    if (Math.abs(v) >= 1_000_000_000_000) return `$${(v / 1_000_000_000_000).toFixed(2)}T`;
    if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (Number.isInteger(v)) return `${v}`;
    return v.toFixed(3);
  }
  return String(v);
}

function getModelHoverDescription(
  modelName: string,
  refs: Array<{ model: string; type: string; reference: string }>
): string {
  const m = String(modelName || "").toLowerCase();
  const exactRef = refs.find((r) => String(r.model || "").toLowerCase() === m);
  if (exactRef?.reference) return exactRef.reference;

  const closeRef = refs.find((r) => {
    const rm = String(r.model || "").toLowerCase();
    return m.includes(rm) || rm.includes(m);
  });
  if (closeRef?.reference) return closeRef.reference;

  if (m.includes("spectral-prior")) {
    return "Spectral-prior classifier: predicts taxonomy using spectral_type with albedo/density priors.";
  }
  if (m.includes("composition-signature")) {
    return "Composition-signature classifier: uses Fe/Ni/PGM vs water/carbon ratios to infer class.";
  }
  if (m.includes("orbital-dynamics")) {
    return "Orbital-dynamics heuristic: access-based class proxy from delta-v, eccentricity and inclination.";
  }
  if (m.includes("random_forest_classifier")) {
    return "RandomForest classifier trained on orbital + physical + composition features.";
  }
  if (m.includes("mining-feasibility")) {
    return "15-parameter mining feasibility model combining accessibility, resources, economics and stability.";
  }
  if (m.includes("economic-yield")) {
    return "Economic yield model: log-scaled normalization of estimated in-situ USD value.";
  }
  if (m.includes("accessibility-risk")) {
    return "Accessibility-risk model: penalizes high delta-v, poor MOID timing, and unstable mission windows.";
  }
  if (m.includes("aether-compute")) {
    return "Aether-compute capacity model: uses water/carbon, thermal dissipation and radiation hardness.";
  }
  if (m.includes("gradient_boosting_regressor")) {
    return "Gradient Boosting regressor for feasibility score prediction.";
  }
  if (m.includes("random_forest_regressor")) {
    return "RandomForest regressor for Aether DC / mission scoring.";
  }
  if (m.includes("fallback")) {
    return "Fallback model output generated when primary report/model outputs are unavailable.";
  }
  return "Model description unavailable.";
}

export default async function AsteroidReportPage({
  params,
}: {
  params: Promise<{ spk_id: string }>;
}) {
  const { spk_id } = await params;
  const key = decodeURIComponent(spk_id || "").trim();

  const allReports = (await loadReports()) || {};

  const found = findReport(allReports, key);
  let report = found.report;
  let matchedKey = found.matchedKey;
  let assignedAlias = found.assignedAlias;

  if (!report) {
    const row = await fetchAsteroid3dRow(key);
    if (row) {
      report = buildFallbackReportFrom3d(row);
      matchedKey = String(row.spk_id || key);
      if (!assignedAlias) {
        assignedAlias = SYNTH_TO_ASSIGNED[String(row.spk_id || "")] || null;
      }
    }
  }

  if (!report) {
    report = buildMinimalReportFromQuery(key);
    matchedKey = String(resolveMappedSpk(key) || key || "UNKNOWN");
    if (!assignedAlias) {
      assignedAlias = SYNTH_TO_ASSIGNED[matchedKey] || null;
    }
  }

  const asteroid = report.asteroid || {};
  const classification = report.classification || {};
  const rating = report.rating || {};
  const mission = report.mission_summary || {};
  const paramsUsed = report.parameters_used || {};
  const modelRefs: Array<{ model: string; type: string; reference: string }> = report.model_references || [];
  const cls =
    classification?.ensemble_prediction?.predicted_class ||
    asteroid?.spectral_type_db ||
    "C-type";
  const technologies = CLASS_MINING_TECH[cls] || [
    "Robotic extraction",
    "Thermal processing",
    "Electrostatic material collection",
  ];
  const datasetSpk = String(asteroid.spk_id || matchedKey || key);
  const assignedSpk = assignedAlias || SYNTH_TO_ASSIGNED[datasetSpk] || datasetSpk;

  return (
    <main style={{ minHeight: "100vh", background: "#02020a", color: "#e2e8f0", padding: 30, fontFamily: "var(--font-main), 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#38bdf8", textDecoration: "none" }}>Back to dashboard</Link>

        <h1 style={{ margin: "16px 0 8px", color: "#00d4ff", fontFamily: "var(--font-display), var(--font-main), sans-serif", fontSize: 36, letterSpacing: "0.06em" }}>
          Full Intelligence Report: {asteroid.name || asteroid.designation || key}
        </h1>
        <p style={{ color: "#94a3b8", marginTop: 0, fontSize: 14 }}>
          Assigned SPK-ID: {assignedSpk} | Dataset SPK-ID: {datasetSpk} | DB Type: {asteroid.spectral_type_db || "Unknown"}
        </p>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16, marginBottom: 24 }}>
          {[
            ["Ensemble Class", classification?.ensemble_prediction?.predicted_class],
            ["Class Confidence", classification?.ensemble_prediction?.confidence],
            ["Overall Score", rating?.overall_score],
            ["Score Band", rating?.band],
            ["Mission Difficulty", mission?.mission_difficulty],
            ["Aether DC", mission?.dc_score],
            ["Total Value (USD)", mission?.total_value_usd],
          ].map(([label, value]) => (
            <div key={String(label)} style={{ background: "#0a0a18", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{label}</div>
              <div style={{ fontSize: 18, color: "#e2e8f0", fontWeight: 700 }}>{formatValue(value)}</div>
            </div>
          ))}
        </section>

        <section style={{ background: "#0a0a18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: "#f59e0b", fontFamily: "var(--font-display), var(--font-main), sans-serif", letterSpacing: "0.05em" }}>Model Outputs</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
            {(classification.models || []).map((m: any, i: number) => (
              <div
                key={`c-${i}`}
                title={getModelHoverDescription(String(m.model || ""), modelRefs)}
                style={{ background: "#111827", borderRadius: 10, padding: 12, cursor: "help" }}
              >
                <div style={{ color: "#93c5fd", fontWeight: 700 }}>{m.model}</div>
                <div>Prediction: {formatValue(m.prediction)}</div>
                <div>Confidence: {formatValue(m.confidence)}</div>
              </div>
            ))}
            {(rating.models || []).map((m: any, i: number) => (
              <div
                key={`r-${i}`}
                title={getModelHoverDescription(String(m.model || ""), modelRefs)}
                style={{ background: "#111827", borderRadius: 10, padding: 12, cursor: "help" }}
              >
                <div style={{ color: "#86efac", fontWeight: 700 }}>{m.model}</div>
                <div>Score: {formatValue(m.score)}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ background: "#0a0a18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <h3 style={{ margin: "0 0 12px", color: "#22c55e", fontFamily: "var(--font-display), var(--font-main), sans-serif", letterSpacing: "0.05em" }}>Parameters Used by Category</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {Object.entries(paramsUsed.categories || {}).map(([cat, fields]) => (
              <div key={cat} style={{ border: `1px solid ${CATEGORY_COLORS[cat] || "#64748b"}`, borderRadius: 10, padding: 12, background: "#111827" }}>
                <div style={{ color: CATEGORY_COLORS[cat] || "#e2e8f0", fontWeight: 700, marginBottom: 6 }}>{cat}</div>
                <div style={{ color: "#cbd5e1", fontSize: 12 }}>{Array.isArray(fields) ? fields.join(", ") : "-"}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, color: "#94a3b8", fontSize: 12 }}>
            Available: {(paramsUsed.available || []).length} | Missing: {(paramsUsed.missing || []).length}
          </div>
        </section>

        <section style={{ background: "#0a0a18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: "0 0 12px", color: "#a78bfa", fontFamily: "var(--font-display), var(--font-main), sans-serif", letterSpacing: "0.05em" }}>Model References</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {modelRefs.map((ref, i) => (
              <div key={i} style={{ borderLeft: "3px solid #a78bfa", paddingLeft: 10 }}>
                <div style={{ color: "#e9d5ff", fontWeight: 700 }}>{ref.model} <span style={{ color: "#94a3b8", fontWeight: 400 }}>({ref.type})</span></div>
                <div style={{ color: "#cbd5e1", fontSize: 13 }}>{ref.reference}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 18, background: "#0a0a18", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
          <h3 style={{ margin: "0 0 12px", color: "#22c55e", fontFamily: "var(--font-display), var(--font-main), sans-serif", letterSpacing: "0.05em" }}>Possible Mining Technologies</h3>
          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 8 }}>
            Suggested for class: <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{cls}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
            {technologies.map((t) => (
              <div key={t} style={{ background: "#111827", borderRadius: 10, padding: 12, border: "1px solid rgba(34,197,94,0.25)" }}>
                <div style={{ color: "#d1fae5", fontSize: 12 }}>{t}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 18 }}>
          <AsteroidDistanceChart
            spkId={asteroid.spk_id || matchedKey || key}
            fallback={{
              orbital_period_yr: mission?.orbital_period_yr,
            }}
          />
        </section>
      </div>
    </main>
  );
}
