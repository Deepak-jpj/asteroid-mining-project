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

const TERM_GUIDE: Array<{ term: string; meaning: string; calc: string; color: string }> = [
  {
    term: "Ensemble Class",
    meaning: "Final asteroid type from multiple classifiers (C/S/M/D/V).",
    calc: "Majority vote of spectral-prior + composition-rules + orbital-heuristic + random-forest classifier.",
    color: "#60a5fa",
  },
  {
    term: "Class Confidence",
    meaning: "How sure the ensemble is about the final class.",
    calc: "Combined confidence from model votes (higher agreement and probabilities increase confidence).",
    color: "#60a5fa",
  },
  {
    term: "Overall Score",
    meaning: "Composite viability index for mission planning.",
    calc: "Average of mining-feasibility, economic, accessibility, Aether-compute, GBR prediction, and RF prediction.",
    color: "#22c55e",
  },
  {
    term: "Mining Feasibility (15p)",
    meaning: "Core physical mining feasibility score.",
    calc: "Weighted model using 15 factors: delta-v, MOID, period, rotation, density, size, mass, composition, albedo, total value, etc.",
    color: "#22c55e",
  },
  {
    term: "Aether DC Score",
    meaning: "Digital value of asteroid as off-planet AI compute host.",
    calc: "DC = min(10, ((water_ice_pct * carbon_compounds_pct) / (delta_v * orbit_uncertainty)) * 10).",
    color: "#a78bfa",
  },
  {
    term: "Economic Yield Score",
    meaning: "Revenue potential normalization score.",
    calc: "Log-scaled from estimated USD value based on composition percentages and market-price constants.",
    color: "#f59e0b",
  },
  {
    term: "Total Value (USD)",
    meaning: "Estimated in-situ economic resource value.",
    calc: "Sum of element values: mass_tons * (element_pct/100) * USD_per_ton across iron/nickel/PGM/cobalt/water.",
    color: "#f59e0b",
  },
  {
    term: "Mission Difficulty",
    meaning: "Operational complexity category.",
    calc: "Derived from feasibility score thresholds: Low/Medium/High/Extreme.",
    color: "#ef4444",
  },
  {
    term: "Orbital Terms",
    meaning: "a,e,i,q,Q,MOID,P,delta-v describe accessibility and transfer cost.",
    calc: "Lower delta-v + lower MOID + favorable period generally improve mission timing and feasibility.",
    color: "#38bdf8",
  },
  {
    term: "Physical Terms",
    meaning: "Diameter, mass, rotation, density, albedo describe extraction complexity.",
    calc: "Rotation stability, size suitability, and density/rubble risk are scored into feasibility model.",
    color: "#22c55e",
  },
  {
    term: "Composition Terms",
    meaning: "Fe/Ni/PGM/H2O/Carbon/Cobalt indicate resource quality.",
    calc: "Composition engine predicts class-based percentages, then normalizes to 100%.",
    color: "#f59e0b",
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [topMining, setTopMining] = useState<MiningRow[]>([]);
  const [topCompute, setTopCompute] = useState<ComputeRow[]>([]);
  const [search, setSearch] = useState("");
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API}/v1/stats`).then((r) => r.json()).then(setStats).catch(() => {});
    fetch(`${API}/v1/asteroids/top-mining?limit=6`).then((r) => r.json()).then(setTopMining).catch(() => {});
    fetch(`${API}/v1/asteroids/top-compute?limit=6`).then((r) => r.json()).then(setTopCompute).catch(() => {});
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
    <main style={{ minHeight: "100vh", background: "#02020a", padding: "28px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 360px", gap: 16, alignItems: "start" }}>
        <div className="dashboard-main-pane">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 className="hero-title">ASTROMINEINTELLIGENCE</h1>
            <p className="hero-subtitle">
              AI-Powered Asteroid Classification - Mining Feasibility - Aether-Compute Analysis
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 28, gap: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter asteroid name or SPK-ID..."
              onKeyDown={(e) => e.key === "Enter" && search.trim() && go(`/asteroid/${encodeURIComponent(search.trim())}`)}
              className="search-input-cyber"
            />
            <button
              onClick={() => search.trim() && go(`/asteroid/${encodeURIComponent(search.trim())}`)}
              className="search-button-cyber"
            >
              ANALYZE ->
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(280px,1fr))", gap: 14, marginBottom: 24 }}>
            <div className="neon-section-card" style={{ borderColor: "rgba(34,197,94,0.5)", padding: 18 }}>
              <div className="track-title" style={{ color: "#22c55e" }}>PHYSICAL TRACK</div>
              <div className="track-body">
                Platinum - Nickel - Iron - Water extraction for in-space industrial economy.
              </div>
            </div>
            <div className="neon-section-card" style={{ borderColor: "rgba(59,130,246,0.5)", padding: 18 }}>
              <div className="track-title" style={{ color: "#60a5fa" }}>DIGITAL TRACK (AETHER-COMPUTE)</div>
              <div className="track-body">
                Off-planet AI data centers with water-ice cooling + radiation shielding.
              </div>
            </div>
          </div>

          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { l: "TOTAL ASTEROIDS", v: stats.total_asteroids?.toLocaleString() || "-" },
                { l: "HIGHEST VALUE", v: stats.highest_value || "-" },
                { l: "TOP MINING", v: stats.top_score || "-" },
                { l: "TOP AETHER DC", v: stats.top_dc_score || "-" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#0a0a18", border: "1px solid rgba(0,212,255,0.18)", borderRadius: 10, padding: 18 }}>
                  <div style={{ color: "#475569", fontSize: 8, letterSpacing: 2 }}>{s.l}</div>
                  <div style={{ color: "#00d4ff", fontSize: 25, fontWeight: 700, marginTop: 5 }}>{s.v}</div>
                </div>
              ))}
            </div>
          )}

          {derived && (
            <div style={{ background: "#070916", border: "1px solid rgba(168,85,247,0.35)", borderRadius: 10, padding: 14, marginBottom: 28 }}>
              <div style={{ color: "#c084fc", fontSize: 9, letterSpacing: 2, marginBottom: 8 }}>DERIVED CHARACTERISTICS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(120px,1fr))", gap: 10 }}>
                {[
                  ["Physical Leader", derived.physicalLeader, "#22c55e"],
                  ["Digital Leader", derived.digitalLeader, "#60a5fa"],
                  ["Mining Index", derived.physicalGrade, "#f59e0b"],
                  ["Compute Index", derived.digitalGrade, "#a78bfa"],
                  ["Mission Risk", derived.riskBand, "#ef4444"],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ border: `1px solid ${color}55`, borderRadius: 8, padding: 10, background: "#030510" }}>
                    <div style={{ color: "#64748b", fontSize: 8 }}>{label}</div>
                    <div style={{ color: color as string, fontSize: 14, fontWeight: 700, marginTop: 4 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <div className="section-kicker">CUSTOM 3D SOLAR SYSTEM EXPLORER</div>
            <div
              onClick={() => go("/solar-system")}
              className="neon-section-card"
              style={{ position: "relative", height: 260, cursor: "pointer", background: "radial-gradient(ellipse at center,#0a0a2a 0%,#000005 100%)" }}
            >
              {[70, 120, 170, 220].map((r, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: r * 2,
                    height: r * 0.35 * 2,
                    marginTop: -r * 0.35,
                    marginLeft: -r,
                    border: "1px solid rgba(0,212,255,0.08)",
                    borderRadius: "50%",
                    transform: `rotate(${i * 18}deg)`,
                  }}
                />
              ))}
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 52, marginBottom: 8 }}>ASTRO</div>
                <div className="explorer-title">LAUNCH 3D ASTEROID EXPLORER</div>
                <div className="explorer-sub">
                  {stats?.total_asteroids || "300+"} asteroids - Real orbital mechanics - Click any to analyze
                </div>
                <div
                  style={{
                    marginTop: 14,
                    padding: "9px 24px",
                    background: "rgba(0,212,255,0.1)",
                    border: "1px solid rgba(0,212,255,0.4)",
                    borderRadius: 6,
                    color: "#00d4ff",
                    fontSize: 13,
                  }}
                >
                  OPEN EXPLORER ->
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(220px,1fr))", gap: 14, marginBottom: 28 }}>
            {[
              { title: "Group A - Orbital Access", color: "#38bdf8", features: "a,e,i,q,Q,MOID,n,P,U,Delta-v" },
              { title: "Group B - Physical Mass", color: "#22c55e", features: "H,G,Diameter,Albedo,Rotation,Density,GM,Extent" },
              { title: "Group C - Spectral Quality", color: "#f59e0b", features: "Class,PC1,PC2,B-V,U-B,3um Depth,Slope" },
            ].map((g) => (
              <div key={g.title} className="neon-section-card" style={{ borderColor: `${g.color}66`, padding: 14 }}>
                <div className="chip-card-title" style={{ color: g.color }}>{g.title}</div>
                <div className="chip-card-body">{g.features}</div>
              </div>
            ))}
          </div>

          {topMining.length > 0 && (
            <div>
              <div style={{ color: "#475569", fontSize: 10, letterSpacing: 2, marginBottom: 12 }}>TOP MINING CANDIDATES</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 14 }}>
                {topMining.map((a: any, i: number) => (
                  <a key={i} href={`/asteroid/${a.spk_id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#0a0a18", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10, padding: 14, cursor: "pointer" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13 }}>#{i + 1} {a.name}</span>
                        <span style={{ background: "#f59e0b", color: "#000", borderRadius: 999, padding: "1px 8px", fontSize: 11, fontWeight: 700 }}>
                          {(a.feasibility_score || 0).toFixed(1)}
                        </span>
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        {a.spectral_type} - dv {a.delta_v_km_s || "?"}km/s - {a.mission_difficulty}
                      </div>
                      <div style={{ color: "#22c55e", fontSize: 11, marginTop: 4 }}>
                        {a.total_value_usd ? `$${(a.total_value_usd / 1e12).toFixed(1)}T est. value` : "Value calculating..."}
                      </div>
                      <div style={{ color: "#00d4ff", fontSize: 10, marginTop: 2 }}>DC Score: {(a.dc_score || 0).toFixed(1)}/10</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside
          style={{
            position: "sticky",
            top: 16,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            background: "#070916",
            border: "1px solid rgba(0,212,255,0.22)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <div style={{ color: "#00d4ff", fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>METRIC GUIDE</div>
          <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 10 }}>
            Definitions + calculation logic used in classification and report scoring.
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {TERM_GUIDE.map((item) => (
              <div key={item.term} className="metric-guide-card" style={{ borderColor: `${item.color}66` }}>
                <div className="metric-guide-lines"><span /><span /><span /></div>
                <div className="metric-guide-content">
                  <div className="metric-guide-title" style={{ color: item.color }}>{item.term}</div>
                  <div className="metric-guide-meaning">{item.meaning}</div>
                  <div className="metric-guide-calc">Calc: {item.calc}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
