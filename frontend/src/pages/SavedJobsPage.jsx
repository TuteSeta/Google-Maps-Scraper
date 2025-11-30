import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJobs } from "../api.js";

function SavedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchJobs();
        setJobs(data || []);
      } catch (err) {
        console.error(err);
        setError("Error al cargar las búsquedas guardadas.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <section className="results">
      <h2>Resultados guardados</h2>

      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <p className="empty">Todavía no hay búsquedas guardadas.</p>
      )}

      <div className="cards">
        {jobs.map((job) => {
          const firstQuery = job.queries?.[0] || "(sin query)";
          return (
            <article key={job.id} className="card">
              <h3>{firstQuery}</h3>
              <p className="meta">
                {job.result_count} resultados ·{" "}
                {job.created_at &&
                  new Date(job.created_at).toLocaleString("es-AR")}
              </p>

              <div className="links">
                <button onClick={() => navigate(`/jobs/${job.id}`)}>
                  Ver completa
                </button>
                {/* Si luego agregás DELETE /jobs/:id, acá pones eliminar */}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default SavedJobsPage;
