import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchJobResults,
  updatePlaceContacted,
  downloadResultsAsCSV,
} from "../api.js";

function JobResultsPage() {
  const { jobId } = useParams();
  const [jobInfo, setJobInfo] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyNotContacted, setOnlyNotContacted] = useState(false);
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchJobResults(jobId);
        setJobInfo({
          job_id: data.job_id,
          queries: data.queries,
          result_count: data.result_count,
        });
        setResults(data.results || []);
      } catch (err) {
        console.error(err);
        setError("Error al cargar los resultados de esta búsqueda.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [jobId]);

  const handleToggleContacted = async (placeId, newValue) => {
    try {
      setSaving(true);
      await updatePlaceContacted(placeId, newValue);
      setResults((prev) =>
        prev.map((p) => (p.id === placeId ? { ...p, contacted: newValue } : p))
      );
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el estado de contacto.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadCSV = () => {
    downloadResultsAsCSV(results, "resultados-job-" + jobId + ".csv");
  };

  const queryText = jobInfo?.queries?.[0];

  // Filtros 
  const filtered = results.filter((place) => {
    
    // filtro texto 
    const text = `${place.name || ""} ${place.address || ""}`.toLowerCase();
    if (!text.includes(searchTerm.toLowerCase())) return false;

    // filtro solo no contactados
    if (onlyNotContacted && place.contacted) return false;

    // filtro rating mínimo
    if (minRating) {
      const rating = place.average_rating ?? 0;
      if (rating < Number(minRating)) return false;
    }

    return true;
  });

  // Ordenar 
  const sortedResults = [...filtered].sort((a, b) => {
    const rA = a.average_rating ?? 0;
    const rB = b.average_rating ?? 0;

    switch (sortBy) {
      case "rating_desc":
        return rB - rA;
      case "rating_asc":
        return rA - rB;
      case "name_desc":
        return (b.name || "").localeCompare(a.name || "");
      case "name_asc":
      default:
        return (a.name || "").localeCompare(b.name || "");
    }
  });

  return (
    <section className="panel fullwidth-panel">
      <div className="summary">
        <div>
          <h2>Resultados de la búsqueda</h2>
          <p>
            {queryText ? `"${queryText}"` : ""} ·{" "}
            {jobInfo?.result_count ?? results.length} resultados totales
          </p>
          {results.length > 0 && (
            <p className="meta">
              Mostrando {sortedResults.length} de {results.length} resultados
              (según filtros)
            </p>
          )}
        </div>
        <div className="links">
          <button onClick={handleDownloadCSV} disabled={results.length === 0}>
            Descargar CSV
          </button>
          <Link to="/jobs" className="button-link">
            Volver a búsquedas
          </Link>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      {saving && <p className="meta">Guardando cambios...</p>}

      {/* Barra de filtros */}
      {!loading && !error && results.length > 0 && (
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Buscar por nombre o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <label className="filter-item">
            Rating mínimo:
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
            >
              <option value="">Cualquiera</option>
              <option value="3">3.0+</option>
              <option value="3.5">3.5+</option>
              <option value="4">4.0+</option>
              <option value="4.5">4.5+</option>
            </select>
          </label>

          <label className="filter-item">
            <input
              type="checkbox"
              checked={onlyNotContacted}
              onChange={(e) => setOnlyNotContacted(e.target.checked)}
            />
            Solo no contactados
          </label>

          <label className="filter-item">
            Ordenar por:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="name_desc">Nombre (Z-A)</option>
              <option value="rating_desc">Rating (mayor a menor)</option>
              <option value="rating_asc">Rating (menor a mayor)</option>
            </select>
          </label>
        </div>
      )}

      {!loading && !error && sortedResults.length > 0 && (
        <div className="table-wrapper">
          <table className="results-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Dirección</th>
                <th>Teléfono</th>
                <th>Rating</th>
                <th>Contactado</th>
              </tr>
            </thead>
            <tbody>
              {sortedResults.map((place) => (
                <tr key={place.id}>
                  <td>{place.name || "Sin nombre"}</td>
                  <td>{place.address || "-"}</td>
                  <td>{place.phone || "-"}</td>
                  <td>
                    {place.average_rating != null
                      ? place.average_rating.toFixed(1)
                      : "-"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!place.contacted}
                      onChange={(e) =>
                        handleToggleContacted(place.id, e.target.checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && results.length > 0 && sortedResults.length === 0 && (
        <p className="empty">
          No hay resultados que coincidan con los filtros aplicados.
        </p>
      )}

      {!loading && !error && results.length === 0 && (
        <p className="empty">Esta búsqueda no tiene resultados guardados.</p>
      )}
    </section>
  );
}

export default JobResultsPage;
