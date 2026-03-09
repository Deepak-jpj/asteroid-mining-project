"use client";
import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type OrbitInput = {
  semi_major_axis_au?: number;
  eccentricity?: number;
  inclination_deg?: number;
  orbital_period_yr?: number;
};

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 12; i += 1) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

function asteroidPos(a: number, e: number, incDeg: number, M: number) {
  const E = solveKepler(M, e);
  const b = a * Math.sqrt(Math.max(0, 1 - e * e));
  const inc = (incDeg * Math.PI) / 180;
  const x = a * (Math.cos(E) - e);
  const yOrb = b * Math.sin(E);
  const y = yOrb * Math.sin(inc);
  const z = yOrb * Math.cos(inc);
  return { x, y, z };
}

function earthPos(M: number) {
  return { x: Math.cos(M), y: 0, z: Math.sin(M) };
}

function buildDistanceSeries(orbit: OrbitInput) {
  const a = orbit.semi_major_axis_au ?? 2.2;
  const e = orbit.eccentricity ?? 0.2;
  const inc = orbit.inclination_deg ?? 7;
  const period = Math.max(0.3, orbit.orbital_period_yr ?? Math.pow(Math.max(a, 0.3), 1.5));
  const points = 84;
  const data: Array<{ t_yr: number; dist_au: number }> = [];
  for (let k = 0; k < points; k += 1) {
    const t = (k / (points - 1)) * period;
    const Ma = (2 * Math.PI * t) / period;
    const Me = 2 * Math.PI * t; // Earth period ~ 1 year
    const pa = asteroidPos(a, e, inc, Ma);
    const pe = earthPos(Me);
    const d = Math.sqrt((pa.x - pe.x) ** 2 + (pa.y - pe.y) ** 2 + (pa.z - pe.z) ** 2);
    data.push({ t_yr: Number(t.toFixed(3)), dist_au: Number(d.toFixed(4)) });
  }
  return data;
}

export default function AsteroidDistanceChart({
  spkId,
  fallback,
}: {
  spkId: string;
  fallback?: OrbitInput;
}) {
  const [orbit, setOrbit] = useState<OrbitInput>(fallback || {});
  const [source, setSource] = useState("model-estimate");
  const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    let active = true;
    fetch(`${API}/v1/asteroids/3d-data?limit=2000`)
      .then((r) => r.json())
      .then((rows: any[]) => {
        if (!active || !Array.isArray(rows)) return;
        const row = rows.find((x) => String(x.spk_id).toUpperCase() === String(spkId).toUpperCase());
        if (row) {
          setOrbit({
            semi_major_axis_au: row.semi_major_axis_au,
            eccentricity: row.eccentricity,
            inclination_deg: row.inclination_deg,
            orbital_period_yr: row.orbital_period_yr,
          });
          setSource("backend-orbital-data");
        }
      })
      .catch(() => {
        setSource("model-estimate");
      });
    return () => {
      active = false;
    };
  }, [API, spkId]);

  const data = useMemo(() => buildDistanceSeries(orbit), [orbit]);
  const stats = useMemo(() => {
    if (!data.length) return { min: 0, avg: 0, max: 0 };
    const vals = data.map((d) => d.dist_au);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg };
  }, [data]);

  return (
    <div style={{ background: "#0a0a18", border: "1px solid rgba(0,212,255,0.2)", borderRadius: 12, padding: 14 }}>
      <div style={{ color: "#00d4ff", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
        Periodic Earth Distance Profile
      </div>
      <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 10 }}>
        Source: {source} | min {stats.min.toFixed(3)} AU | avg {stats.avg.toFixed(3)} AU | max {stats.max.toFixed(3)} AU
      </div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
            <XAxis dataKey="t_yr" stroke="#94a3b8" fontSize={11} />
            <YAxis dataKey="dist_au" stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{ background: "#070916", border: "1px solid rgba(0,212,255,0.3)", color: "#e2e8f0" }}
              formatter={(v: any) => `${Number(v).toFixed(4)} AU`}
              labelFormatter={(v: any) => `t=${Number(v).toFixed(2)} yr`}
            />
            <Line type="monotone" dataKey="dist_au" stroke="#00ffaa" dot={false} strokeWidth={2.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

