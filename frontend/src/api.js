const API_BASE = "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || `Request failed: ${path}`);
  }
  return data;
}

export function ingest(limit) {
  return request("/asteroids/ingest", {
    method: "POST",
    body: JSON.stringify({ limit })
  });
}

export function listAsteroids() {
  return request("/asteroids");
}

export function classify(ids) {
  return request("/asteroids/classify", {
    method: "POST",
    body: JSON.stringify({ ids })
  });
}

export function score(ids) {
  return request("/asteroids/score", {
    method: "POST",
    body: JSON.stringify({ ids })
  });
}
