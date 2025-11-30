// src/App.jsx
import { Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home.jsx";
import ScraperPage from "./pages/ScraperPage.jsx";
import SavedJobsPage from "./pages/SavedJobsPage.jsx";
import JobResultsPage from "./pages/JobResultsPage.jsx";

function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Google Maps Scraper</h1>
          <p>Busca lugares en Google Maps y guarda los resultados en MongoDB.</p>
        </div>
        <nav className="nav">
          <Link to="/" className="nav-link">
            Inicio
          </Link>
          <Link to="/scraper" className="nav-link">
            Scraper
          </Link>
          <Link to="/jobs" className="nav-link">
            Resultados guardados
          </Link>
        </nav>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scraper" element={<ScraperPage />} />
          <Route path="/jobs" element={<SavedJobsPage />} />
          <Route path="/jobs/:jobId" element={<JobResultsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
