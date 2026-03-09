import { clamp } from "../utils/number.js";

const CLASSES = ["C", "S", "M"];

export async function fetchFromSmass(limit) {
  const rows = [];
  for (let i = 0; i < limit; i += 1) {
    rows.push({
      id: `SMASS-${i + 1}`,
      source: "SMASS",
      spectralClass: CLASSES[i % CLASSES.length],
      absorption3umDepth: clamp((i % 9) * 0.03, 0, 0.3),
      spectralSlope: clamp(0.02 + (i % 8) * 0.02, 0, 0.25)
    });
  }
  return rows;
}
