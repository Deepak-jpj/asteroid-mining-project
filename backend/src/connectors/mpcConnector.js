import { clamp } from "../utils/number.js";

export async function fetchFromMpc(limit) {
  const items = [];

  for (let i = 0; i < limit; i += 1) {
    items.push({
      id: `MPC-${i + 1}`,
      source: "MPC",
      U: i % 9,
      moid: clamp(0.001 * (i + 1), 0.001, 2),
      deltaV: clamp(3.5 + (i % 7) * 0.4, 3.5, 9),
      group: i % 2 === 0 ? "NEO" : "MBA"
    });
  }

  return items;
}
