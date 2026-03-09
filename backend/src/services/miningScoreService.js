import { asteroidStore } from "../storage/asteroidStore.js";
import { clamp } from "../utils/number.js";

const WEIGHTS = {
  // Group A
  a: 0.03,
  e: 0.03,
  i: 0.05,
  q: 0.03,
  Q: 0.02,
  moid: 0.08,
  n: 0.02,
  P: 0.02,
  U: 0.06,
  deltaV: 0.15,
  // Group B
  H: 0.02,
  G: 0.01,
  diameter: 0.08,
  albedo: 0.03,
  rotationPeriod: 0.03,
  density: 0.06,
  GM: 0.05,
  extent: 0.03,
  // Group C
  spectralClass: 0.06,
  pc1: 0.02,
  pc2: 0.02,
  bMinusV: 0.02,
  uMinusB: 0.02,
  absorption3umDepth: 0.06,
  spectralSlope: 0.04
};

export function scoreAsteroids(ids) {
  const asteroids = asteroidStore.getByIds(ids);
  return asteroids.map((a) => {
    const score = computeMiningPotential(a);
    return {
      id: a.id,
      score: Number(score.toFixed(2)),
      band: mapBand(score)
    };
  });
}

export function computeMiningPotential(a) {
  const parts = {
    a: inverseNorm(a.a, 0.7, 3.5),
    e: inverseNorm(a.e, 0, 0.8),
    i: inverseNorm(a.i, 0, 35),
    q: norm(a.q, 0.5, 2.5),
    Q: inverseNorm(a.Q, 1, 5),
    moid: norm(a.moid, 0, 0.3),
    n: norm(a.n, 0, 1.2),
    P: inverseNorm(a.P, 100, 3000),
    U: inverseNorm(a.U, 0, 9),
    deltaV: inverseNorm(a.deltaV, 3, 12),
    H: inverseNorm(a.H, 8, 28),
    G: norm(a.G, 0, 0.5),
    diameter: norm(a.diameter, 0, 250),
    albedo: inverseNorm(a.albedo, 0.02, 0.5),
    rotationPeriod: norm(a.rotationPeriod, 2, 30),
    density: norm(a.density, 1, 8),
    GM: norm(a.GM, 0, 0.005),
    extent: norm(a.extent, 0, 1),
    spectralClass: spectralClassScore(a.spectralClass),
    pc1: norm(a.pc1, -1, 1),
    pc2: norm(a.pc2, -1, 1),
    bMinusV: inverseNorm(a.bMinusV, 0.4, 1.3),
    uMinusB: inverseNorm(a.uMinusB, -0.2, 1),
    absorption3umDepth: norm(a.absorption3umDepth, 0, 0.35),
    spectralSlope: inverseNorm(a.spectralSlope, 0, 0.3)
  };

  let weighted = 0;
  for (const key of Object.keys(WEIGHTS)) {
    weighted += (parts[key] || 0) * WEIGHTS[key];
  }
  return clamp(weighted * 100, 0, 100);
}

function norm(value, min, max) {
  return clamp((value - min) / (max - min), 0, 1);
}

function inverseNorm(value, min, max) {
  return 1 - norm(value, min, max);
}

function spectralClassScore(spectralClass) {
  const s = String(spectralClass || "UNKNOWN").toUpperCase();
  if (s.startsWith("C")) return 1;
  if (s.startsWith("M")) return 0.9;
  if (s.startsWith("S")) return 0.55;
  return 0.4;
}

function mapBand(score) {
  if (score >= 75) return "High Potential";
  if (score >= 50) return "Moderate Potential";
  return "Low Potential";
}
