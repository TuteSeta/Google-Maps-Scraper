import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    
    <section className="panel home-panel">
      <h2>Bienvenido</h2>
      <p>Elegí qué querés hacer:</p>

      <div className="home-buttons">
        <button onClick={() => navigate("/scraper")}>
          Ir al Scraper
        </button>
        <button onClick={() => navigate("/jobs")}>
          Ver resultados guardados
        </button>
      </div>
    </section>
  );
}

export default Home;