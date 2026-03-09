import axios from "axios";

const cache = new Map();

const KNOWN_IMAGE_MAP = {
  "433": "https://upload.wikimedia.org/wikipedia/commons/7/77/Asteroid_433_Eros_-_PIA02923.jpg",
  "16": "https://upload.wikimedia.org/wikipedia/commons/5/5a/16_Psyche_rendering.jpg",
  "101955": "https://upload.wikimedia.org/wikipedia/commons/9/9c/Asteroid_101955_Bennu_OSIRIS-REx_%28cropped%29.jpg"
};

export async function resolveAsteroidImage(asteroidId) {
  const baseId = String(asteroidId).split("-")[0];
  if (cache.has(baseId)) return cache.get(baseId);

  if (KNOWN_IMAGE_MAP[baseId]) {
    const known = KNOWN_IMAGE_MAP[baseId];
    cache.set(baseId, known);
    return known;
  }

  const nasaImage = await fetchFromNasaImageApi(baseId);
  cache.set(baseId, nasaImage);
  return nasaImage;
}

async function fetchFromNasaImageApi(baseId) {
  try {
    const { data } = await axios.get("https://images-api.nasa.gov/search", {
      params: {
        q: `asteroid ${baseId}`,
        media_type: "image",
        page: 1
      },
      timeout: 5000
    });

    const items = data?.collection?.items || [];
    for (const item of items) {
      const href = item?.links?.[0]?.href;
      if (href) return href;
    }
    return null;
  } catch (_error) {
    return null;
  }
}
