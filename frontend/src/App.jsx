import { useMemo, useState } from "react";
import { classify, ingest, listAsteroids, score } from "./api";

export default function App() {
  const [limit, setLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [asteroids, setAsteroids] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [classification, setClassification] = useState([]);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState("");

  const scoreMap = useMemo(() => {
    const m = new Map();
    for (const item of scores) m.set(item.id, item);
    return m;
  }, [scores]);

  const classMap = useMemo(() => {
    const m = new Map();
    for (const item of classification) m.set(item.id, item);
    return m;
  }, [classification]);

  const selectedAsteroid = useMemo(() => asteroids.find((a) => a.id === selectedId) || null, [asteroids, selectedId]);

  async function runIngest() {
    setLoading(true);
    setError("");
    try {
      await ingest(Number(limit));
      const data = await listAsteroids();
      setAsteroids(data.asteroids);
      setSelectedId(data.asteroids[0]?.id || "");
      setClassification([]);
      setScores([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalyzeSelected() {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const [classData, scoreData] = await Promise.all([classify([selectedId]), score([selectedId])]);
      setClassification(classData.result);
      setScores(scoreData.result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="nasa-bg">
        <iframe title="NASA Eyes Asteroids" src="https://eyes.nasa.gov/apps/asteroids/#/home" loading="lazy" />
      </div>
      <main className="app">
        <h1>Asteroid Classification and Mining Potential</h1>
        <section className="panel controls">
          <div className="control-row">
            <label htmlFor="limit">Ingest Count</label>
            <input
              id="limit"
              type="number"
              min={1}
              max={1000}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
            <button disabled={loading} onClick={runIngest}>
              Ingest Datasets
            </button>
          </div>
          <div className="control-row">
            <label htmlFor="asteroid-select">Asteroid (Name/Number)</label>
            <select id="asteroid-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {!asteroids.length ? <option value="">No asteroids loaded</option> : null}
              {asteroids.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id}
                </option>
              ))}
            </select>
            <button disabled={loading || !selectedId} onClick={runAnalyzeSelected}>
              Analyze Selected Asteroid
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
        </section>

        <section className="panel single-view">
          <h2>Selected Asteroid</h2>
          {!selectedAsteroid ? (
            <p>No asteroid selected. Ingest data, then choose an asteroid number/name.</p>
          ) : (
            (() => {
              const c = classMap.get(selectedAsteroid.id);
              const s = scoreMap.get(selectedAsteroid.id);
              const resultClass = c?.finalClass || "-";
              const scoreText = s ? `${s.score}` : "-";
              const bandText = s?.band || "Not Scored";

              return (
                <article key={selectedAsteroid.id} className="card">
                  <div className={`top-section ${selectedAsteroid.imageUrl ? "has-image" : ""}`}>
                    {selectedAsteroid.imageUrl ? (
                      <img className="top-image" src={selectedAsteroid.imageUrl} alt={`Asteroid ${selectedAsteroid.id}`} loading="lazy" />
                    ) : null}
                    <div className="border" />
                    <div className="icons">
                      <div className="logo">AST</div>
                      <a className="open-nasa" href="https://eyes.nasa.gov/apps/asteroids/#/home" target="_blank" rel="noreferrer">
                        Open NASA
                      </a>
                    </div>
                  </div>
                  <div className="bottom-section">
                    <span className="title">{selectedAsteroid.id}</span>
                    <p className="subtitle">{selectedAsteroid.dataSources.join(", ")}</p>
                    <div className="row">
                      <div className="item">
                        <span className="big-text">{resultClass}</span>
                        <span className="regular-text">Class</span>
                      </div>
                      <div className="item">
                        <span className="big-text">{scoreText}</span>
                        <span className="regular-text">Score</span>
                      </div>
                      <div className="item">
                        <span className="big-text">{selectedAsteroid.deltaV}</span>
                        <span className="regular-text">Delta-v</span>
                      </div>
                    </div>
                    <div className="row">
                      <div className="item">
                        <span className="big-text">{selectedAsteroid.moid}</span>
                        <span className="regular-text">MOID</span>
                      </div>
                      <div className="item">
                        <span className="big-text">{selectedAsteroid.spectralClass}</span>
                        <span className="regular-text">Spectral</span>
                      </div>
                      <div className="item">
                        <span className="big-text">{bandText}</span>
                        <span className="regular-text">Potential</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })()
          )}
        </section>
      </main>
    </>
  );
}
