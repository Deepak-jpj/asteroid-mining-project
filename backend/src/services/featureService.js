import { safeNumber } from "../utils/number.js";

// Reduced numeric vector used by local classifiers.
export function toFeatureVector(asteroid) {
  return [
    normalizeRange(safeNumber(asteroid.e), 0, 1),
    normalizeRange(safeNumber(asteroid.i), 0, 40),
    normalizeRange(safeNumber(asteroid.albedo), 0, 1),
    normalizeRange(safeNumber(asteroid.absorption3umDepth), 0, 0.4),
    normalizeRange(safeNumber(asteroid.spectralSlope), 0, 0.5),
    normalizeRange(safeNumber(asteroid.density), 0, 8)
  ];
}

function normalizeRange(value, min, max) {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min);
}
