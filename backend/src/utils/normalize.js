import { FEATURE_KEYS } from "../constants/featureKeys.js";
import { safeNumber } from "./number.js";

const defaultAsteroid = {
  a: 0,
  e: 0,
  i: 0,
  q: 0,
  Q: 0,
  moid: 0,
  n: 0,
  P: 0,
  U: 9,
  deltaV: 12,
  H: 0,
  G: 0,
  diameter: 0,
  albedo: 0,
  rotationPeriod: 0,
  density: 0,
  GM: 0,
  extent: 0,
  spectralClass: "UNKNOWN",
  imageUrl: null,
  pc1: 0,
  pc2: 0,
  bMinusV: 0,
  uMinusB: 0,
  absorption3umDepth: 0,
  spectralSlope: 0
};

export function normalizeAsteroid(raw) {
  const normalized = {
    ...defaultAsteroid,
    ...raw
  };

  for (const key of FEATURE_KEYS) {
    if (key === "spectralClass") {
      normalized[key] = String(normalized[key] || "UNKNOWN").toUpperCase();
    } else {
      normalized[key] = safeNumber(normalized[key], defaultAsteroid[key] ?? 0);
    }
  }

  return {
    id: String(raw.id),
    dataSources: raw.dataSources || [],
    ...normalized
  };
}
