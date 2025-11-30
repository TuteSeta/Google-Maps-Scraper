# Google Maps Scraper – Full Stack | Flask + React + Docker + MongoDB

Proyecto full-stack que permite buscar lugares en Google Maps, scrapeando resultados reales mediante Selenium, almacenándolos en MongoDB y visualizándolos desde un frontend moderno en React.  
La aplicación está totalmente dockerizada y cuenta con tests automatizados que pueden ejecutarse tanto localmente como dentro del contenedor.

-------------------------------------------------------
## 📌 Características

- Scraping real de Google Maps usando Selenium + Chrome.
- API backend en Flask con arquitectura app factory.
- Base de datos MongoDB para almacenar jobs y resultados.
- Frontend en React (Vite), totalmente responsive.
- Proyecto 100% dockerizado con Docker Compose.
- Suite de tests de integración con Pytest.
- Tests que funcionan tanto localmente como dentro del contenedor.
- Manejo de errores, validaciones y CORS.

-------------------------------------------------------
## 🛠️ Tecnologías

Backend:
- Python 3.12
- Flask
- Selenium
- PyMongo
- Docker

Frontend:
- React + Vite
- Fetch API
- CSS responsive

Base de datos:
- MongoDB (Dockerizado)

Testing:
- Pytest (tests de integración reales)

-------------------------------------------------------
## 🏗️ Arquitectura


Frontend (React)
     ↓
Backend Flask API
     ↓
Google Maps Scraper (Selenium)
     ↓
MongoDB
     ↓
Tests (pytest) dentro o fuera de Docker

-------------------------------------------------------
## 📦 Instalación

Clonar el repositorio:

git clone https://github.com/tuusuario/map-scraper.git
cd map-scraper

-------------------------------------------------------
## 🐳 Ejecución con Docker (recomendado)

Requisitos:
- Docker
- Docker Compose

Levantar todo el stack:

docker compose up --build

Servicios levantados:

Frontend → http://localhost:5173
Backend → http://127.0.0.1:5000
MongoDB → puerto 27017

-------------------------------------------------------

## 🔥 Desarrollo con Hot Reload (sin reconstruir Docker)

Backend:
Cualquier cambio en el código Python se refleja automáticamente dentro del contenedor.

Frontend:

Vite corre dentro del contenedor pero usa tu código local, así que también recarga automáticamente.

Esto te permite trabajar sin reconstruir la imagen en cada cambio.

-------------------------------------------------------

## 🧪 Testing


### Ejecutar tests localmente:
cd backend
pytest

### Ejecutar tests dentro del contenedor:
docker compose exec backend pytest

Los tests:
- Crean una instancia de Flask con create_app().
- Ejecutan el endpoint /scrape.
- Ejecutan scraping real.
- Insertan datos en MongoDB.
- Verifican toda la respuesta de la API.
- Funcionan tanto local como desde Docker.

-------------------------------------------------------
## 🌐 Endpoints Backend


GET /health  
Retorna el estado de la API.

POST /scrape  
Body:
{
  "queries": ["cafeterías en Mendoza"],
  "max_results": 20
}

GET /jobs

Retorna:
job_id, queries, result_count, created_at

GET /jobs/<job_id>/results
Resultados de un job específico

PATCH /places/<place_id>
{
  "contacted": true
}

-------------------------------------------------------


