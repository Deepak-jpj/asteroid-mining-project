import { fetchFromJpl } from "../connectors/jplConnector.js";
import { fetchFromMpc } from "../connectors/mpcConnector.js";
import { fetchFromMithneos } from "../connectors/mithneosConnector.js";
import { fetchFromSmass } from "../connectors/smassConnector.js";
import { normalizeAsteroid } from "../utils/normalize.js";
import { resolveAsteroidImage } from "./imageLookupService.js";

export async function ingestAsteroids(limit = 100) {
  const [jplRows, mpcRows, mithneosRows, smassRows] = await Promise.all([
    fetchFromJpl(limit),
    fetchFromMpc(limit),
    fetchFromMithneos(limit),
    fetchFromSmass(limit)
  ]);

  const count = Math.min(jplRows.length, mpcRows.length, mithneosRows.length, smassRows.length);
  const merged = [];

  for (let i = 0; i < count; i += 1) {
    const jpl = stripMeta(jplRows[i]);
    const mpc = stripMeta(mpcRows[i]);
    const mithneos = stripMeta(mithneosRows[i]);
    const smass = stripMeta(smassRows[i]);

    merged.push(
      normalizeAsteroid({
        id: jplRows[i].id,
        dataSources: [jplRows[i].source, mpcRows[i].source, mithneosRows[i].source, smassRows[i].source],
        ...jpl,
        ...mpc,
        ...mithneos,
        ...smass
      })
    );
  }

  const withImages = await Promise.all(
    merged.map(async (asteroid) => ({
      ...asteroid,
      imageUrl: await resolveAsteroidImage(asteroid.id)
    }))
  );

  return withImages;
}

function stripMeta(row) {
  const { id, source, ...rest } = row;
  return rest;
}
