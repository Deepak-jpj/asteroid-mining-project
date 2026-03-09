import { clamp } from "../utils/number.js";

export async function fetchFromMithneos(limit) {
  const rows = [];
  for (let i = 0; i < limit; i += 1) {
    rows.push({
      id: `MITHNEOS-${i + 1}`,
      source: "MITHNEOS",
      pc1: clamp(-0.8 + (i % 10) * 0.2, -1, 1),
      pc2: clamp(-0.7 + (i % 8) * 0.25, -1, 1),
      bMinusV: clamp(0.65 + (i % 5) * 0.08, 0.5, 1.2),
      uMinusB: clamp(0.05 + (i % 5) * 0.1, -0.2, 1),
      spectralSlope: clamp(0.01 + (i % 7) * 0.03, 0, 0.3)
    });
  }
  return rows;
}
