// src/App.jsx
import { useState } from "react";
import "./App.css";

function App() {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(5);     
  const [results, setResults] = useState([]);
  const [jobId, setJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResults([]);
    setJobId(null);

    if (!query.trim()) {
      setError("Por favor escribí una búsqueda (ej: cafeterías en Mendoza).");
      return;
    }

    try {
      setLoading(true);

      const resp = await fetch("http://localhost:5000/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: [query],
          max_results: Number(limit), 
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Error en el servidor");
      }

      const data = await resp.json();
      const rawResults = data.results || [];

      const sliced = rawResults.slice(0, Number(limit));

      setResults(sliced);
      setJobId(data.job_id || null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Google Maps Scraper</h1>
        <p>Busca lugares en Google Maps y guarda los resultados en MongoDB.</p>
      </header>

      <main className="main">
        <section className="panel">
          <form onSubmit={handleSubmit} className="form">
            <div className="field-group">
              <label htmlFor="query">Búsqueda</label>
              <input
                id="query"
                type="text"
                placeholder="Ej: cafeterías en Mendoza"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="field-group inline">
              <label htmlFor="limit">Cantidad de resultados</label>
              <select
                id="limit"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Scrapear"}
            </button>
          </form>

          {error && <div className="error">{error}</div>}

          {jobId && (
            <div className="summary">
              <span>Job ID: </span>
              <code>{jobId}</code>
              <span> · Resultados: {results.length}</span>
            </div>
          )}
        </section>

        <section className="results">
          {results.length === 0 && !loading && !error && (
            <p className="empty">Todavía no hay resultados.</p>
          )}

          {results.map((place, idx) => (
            <article key={idx} className="card">
              <h2>{place.name || "Sin nombre"}</h2>

              <div className="meta">
                {place.average_rating && (
                  <span>⭐ {place.average_rating.toFixed(1)}</span>
                )}
              </div>

              {place.address && (
                <p className="field">
                  <strong>Dirección:</strong> {place.address}
                </p>
              )}

              {place.phone && (
                <p className="field">
                  <strong>Teléfono:</strong>{" "}
                  <a href={`tel:${place.phone}`}>{place.phone}</a>
                </p>
              )}

              <div className="links">
                {place.website && (
                  <a href={place.website} target="_blank" rel="noreferrer">
                    Sitio web
                  </a>
                )}
                {place.url && (
                  <a href={place.url} target="_blank" rel="noreferrer">
                    Ver en Maps
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default App;
