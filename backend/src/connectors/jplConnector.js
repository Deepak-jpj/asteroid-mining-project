import axios from "axios";
import { safeNumber } from "../utils/number.js";

const SBDB_API = "https://ssd-api.jpl.nasa.gov/sbdb.api";

export async function fetchFromJpl(limit) {
  const records = [];
  const fallback = getMockJplRecords(limit);

  try {
    for (const entry of fallback.slice(0, limit)) {
      const { data } = await axios.get(SBDB_API, {
        params: {
          sstr: entry.id,
          full_prec: true,
          phys_par: true
        },
        timeout: 5000
      });

      records.push(mapJplResponse(data, entry.id));
    }
    return records;
  } catch (_error) {
    return fallback.slice(0, limit);
  }
}

function mapJplResponse(payload, id) {
  const orbit = payload?.orbit?.elements || {};
  const phys = payload?.phys_par || {};

  return {
    id,
    source: "JPL",
    a: safeNumber(orbit.a),
    e: safeNumber(orbit.e),
    i: safeNumber(orbit.i),
    q: safeNumber(orbit.q),
    Q: safeNumber(orbit.ad),
    moid: safeNumber(orbit.moid),
    n: safeNumber(orbit.n),
    P: safeNumber(orbit.per),
    U: safeNumber(orbit.condition_code),
    H: safeNumber(phys.H),
    G: safeNumber(phys.G),
    diameter: safeNumber(phys.diameter),
    albedo: safeNumber(phys.albedo),
    rotationPeriod: safeNumber(phys.rot_per),
    density: safeNumber(phys.density),
    GM: safeNumber(phys.GM),
    extent: 0,
    spectralClass: String(phys.spec_B ?? "Unknown").toUpperCase()
  };
}

function getMockJplRecords(limit) {
  const base = [
    {
      id: "433",
      source: "JPL",
      a: 1.458,
      e: 0.223,
      i: 10.83,
      q: 1.132,
      Q: 1.784,
      moid: 0.149,
      n: 0.56,
      P: 643.2,
      U: 0,
      H: 10.31,
      G: 0.23,
      diameter: 16.84,
      albedo: 0.25,
      rotationPeriod: 5.27,
      density: 2.7,
      GM: 0.00013,
      extent: 0.6,
      spectralClass: "S"
    },
    {
      id: "101955",
      source: "JPL",
      a: 1.126,
      e: 0.204,
      i: 6.03,
      q: 0.897,
      Q: 1.355,
      moid: 0.0032,
      n: 0.825,
      P: 436.9,
      U: 0,
      H: 19.2,
      G: 0.15,
      diameter: 0.34,
      albedo: 0.29,
      rotationPeriod: 4.29,
      density: 2.1,
      GM: 0.000001,
      extent: 0.1,
      spectralClass: "C"
    },
    {
      id: "16",
      source: "JPL",
      a: 2.922,
      e: 0.134,
      i: 5.34,
      q: 2.532,
      Q: 3.312,
      moid: 1.53,
      n: 0.198,
      P: 1828,
      U: 0,
      H: 5.9,
      G: 0.12,
      diameter: 214,
      albedo: 0.12,
      rotationPeriod: 4.2,
      density: 3.4,
      GM: 0.0032,
      extent: 0.8,
      spectralClass: "M"
    }
  ];

  const output = [];
  for (let idx = 0; idx < limit; idx += 1) {
    const sample = base[idx % base.length];
    output.push({
      ...sample,
      id: `${sample.id}-${idx + 1}`
    });
  }
  return output;
}
