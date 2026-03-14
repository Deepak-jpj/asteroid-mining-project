"use client";
import { useEffect, useMemo, useState } from "react";

type MiningRow = {
  spk_id: string;
  name: string;
  spectral_type: string;
  feasibility_score: number;
  dc_score: number;
  mission_difficulty: string;
  total_value_usd: number;
  delta_v_km_s?: number;
};

type ComputeRow = {
  spk_id: string;
  name: string;
  spectral_type: string;
  dc_score: number;
  compute_density_tflops?: number;
  thermal_dissipation_capacity?: number;
  radiation_hardness_level?: string;
};

const TERM_GUIDE = [
  {
    term: "Ensemble Class",
    meaning: "Final asteroid type from multiple classifiers (C/S/M/D/V).",
    calc: "Majority vote of spectral-prior + composition-rules + orbital-heuristic + random-forest classifier.",
    color: "#60a5fa",
  },
  {
    term: "Class Confidence",
    meaning: "How sure the ensemble is about the final class.",
    calc: "Combined confidence from model votes.",
    color: "#60a5fa",
  },
  {
    term: "Overall Score",
    meaning: "Composite viability index for mission planning.",
    calc: "Average of mining-feasibility, economic, accessibility, Aether-compute, GBR prediction, and RF prediction.",
    color: "#22c55e",
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [topMining, setTopMining] = useState<MiningRow[]>([]);
  const [topCompute, setTopCompute] = useState<ComputeRow[]>([]);
  const [search, setSearch] = useState("");

  const API =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API}/v1/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    fetch(`${API}/v1/asteroids/top-mining?limit=6`)
      .then((r) => r.json())
      .then(setTopMining)
      .catch(() => {});

    fetch(`${API}/v1/asteroids/top-compute?limit=6`)
      .then((r) => r.json())
      .then(setTopCompute)
      .catch(() => {});
  }, [API]);

  const go = (path: string) => {
    window.location.href = path;
  };

  const derived = useMemo(() => {
    const best = topMining[0];
    const bestCompute = topCompute[0];

    if (!best && !bestCompute) return null;

    return {
      physicalLeader: best?.name || "Unknown",
      digitalLeader: bestCompute?.name || "Unknown",
      physicalGrade: best?.feasibility_score?.toFixed(2) || "0.00",
      digitalGrade: bestCompute?.dc_score?.toFixed(2) || "0.00",
      riskBand:
        (best?.feasibility_score || 0) >= 7.5
          ? "Low"
          : (best?.feasibility_score || 0) >= 5
          ? "Medium"
          : "High",
    };
  }, [topMining, topCompute]);

  return (
    <main style={{ minHeight: "100vh", background: "#02020a", padding: 28 }}>
      <div style={{ maxWidth: 1200, margin: "auto" }}>
        <h1 style={{ color: "#00d4ff", textAlign: "center" }}>
          ASTROMINE INTELLIGENCE
        </h1>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 10,
            marginTop: 20,
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Enter asteroid name..."
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #333",
              background: "#000",
              color: "#fff",
            }}
          />

          <button
            onClick={() =>
              search.trim() &&
              go(`/asteroid/${encodeURIComponent(search.trim())}`)
            }
            style={{
              padding: "10px 20px",
              background: "#00d4ff",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
            }}
          >
            ANALYZE {"\u2192"}
          </button>
        </div>

        {derived && (
          <div
            style={{
              marginTop: 30,
              border: "1px solid #333",
              padding: 20,
              borderRadius: 10,
              background: "#050510",
            }}
          >
            <h3 style={{ color: "#c084fc" }}>Derived Characteristics</h3>

            <p>Physical Leader: {derived.physicalLeader}</p>
            <p>Digital Leader: {derived.digitalLeader}</p>
            <p>Mining Score: {derived.physicalGrade}</p>
            <p>Compute Score: {derived.digitalGrade}</p>
            <p>Risk Band: {derived.riskBand}</p>
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          <div
            onClick={() => go("/solar-system")}
            style={{
              border: "1px solid rgba(0,212,255,0.4)",
              padding: 20,
              borderRadius: 10,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <h2 style={{ color: "#00d4ff" }}>
              OPEN EXPLORER {"\u2192"}
            </h2>
            <p style={{ color: "#888" }}>
              Launch the 3D asteroid exploration interface
            </p>
          </div>
        </div>

        {topMining.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <h3 style={{ color: "#f59e0b" }}>Top Mining Candidates</h3>

            {topMining.map((a, i) => (
              <div
                key={i}
                style={{
                  border: "1px solid #333",
                  padding: 12,
                  borderRadius: 8,
                  marginTop: 10,
                  background: "#0a0a18",
                }}
              >
                #{i + 1} {a.name} — Score {(a.feasibility_score || 0).toFixed(1)}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40 }}>
          <h3 style={{ color: "#00d4ff" }}>Metric Guide</h3>

          {TERM_GUIDE.map((item) => (
            <div
              key={item.term}
              style={{
                border: `1px solid ${item.color}`,
                padding: 10,
                marginTop: 10,
                borderRadius: 6,
              }}
            >
              <strong style={{ color: item.color }}>{item.term}</strong>
              <p style={{ fontSize: 13 }}>{item.meaning}</p>
              <p style={{ fontSize: 12, color: "#aaa" }}>
                Calc: {item.calc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}