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

  return (
    <section className="panel fullwidth-panel">
      <div className="summary">
        <div>
          <h2>Resultados de la búsqueda</h2>
          <p>
            {queryText ? `"${queryText}"` : ""} ·{" "}
            {jobInfo?.result_count ?? results.length} resultados
          </p>
        </div>
        <div className="links">
          <button onClick={handleDownloadCSV} disabled={results.length === 0}>
            Descargar CSV
          </button>
          <Link to="/jobs" className="button-link">Volver a búsquedas</Link>
        </div>
      </div>

      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      {saving && <p className="meta">Guardando cambios...</p>}

      {!loading && !error && results.length > 0 && (
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
              {results.map((place) => (
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

      {!loading && !error && results.length === 0 && (
        <p className="empty">Esta búsqueda no tiene resultados guardados.</p>
      )}
    </section>
  );
}

export default JobResultsPage;
