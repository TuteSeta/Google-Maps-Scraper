import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJobs,deleteJob } from "../api.js";

function SavedJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); 
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

  const handleDelete = async (jobId) => {
  if (!confirm("¿Seguro deseas eliminar esta búsqueda?")) return;

  try {
    await deleteJob(jobId);

    // Filtrar del estado el job eliminado
    setJobs((prev) => prev.filter((job) => job.id !== jobId));

  } catch (err) {
    console.error(err);
    setError(err.message || "Error al eliminar la búsqueda.");
  }
};

  // Filtrado por texto de la query
  const filteredJobs = jobs.filter((job) => {
    const firstQuery = job.queries?.[0] || "";
    return firstQuery.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <section className="results">
      <h2>Resultados guardados</h2>

      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && jobs.length === 0 && (
        <p className="empty">Todavía no hay búsquedas guardadas.</p>
      )}

      {/* Barra de búsqueda */}
      {!loading && !error && jobs.length > 0 && (
        <div className="filters-bar">
          <input
            type="text"
            placeholder="Buscar por texto de la búsqueda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="meta">
            Mostrando {filteredJobs.length} de {jobs.length} búsquedas
          </span>
        </div>
      )}

      <div className="cards">
        {filteredJobs.map((job) => {
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
                <button onClick={() => handleDelete(job.id)}>
                  Eliminar
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default SavedJobsPage;
