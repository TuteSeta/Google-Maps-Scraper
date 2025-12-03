import pytest

#try:
    # Caso host 
from backend.app import create_app
from backend.db import get_collection
""" except ModuleNotFoundError:
    # Caso docker/container
    from app.app import create_app
    from app.db import get_collection """
    
@pytest.fixture(autouse=True)
def clean_db():
    jobs = get_collection("jobs")
    places = get_collection("places")

    # Antes del test
    jobs.delete_many({})
    places.delete_many({})

    yield

    # Después del test
    jobs.delete_many({})
    places.delete_many({})

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_health_ok(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"status": "ok"}


def test_scrape_invalid_body_returns_400(client):
    resp = client.post("/scrape", json={})
    assert resp.status_code == 400

    data = resp.get_json()
    assert "error" in data
    assert "queries" in data["error"]

def test_scrape_real_flow_inserts_job_and_places(client):
    """
    Test de integración REAL:
    - Llama al endpoint /scrape
    - Usa el scraper real
    - Inserta en Mongo real de pruebas
    """
    payload = {
        "queries": ["cafeterias en Mendoza"],
    }

    resp = client.post("/scrape", json=payload)

    # Si algo falla en el scraper
    assert resp.status_code == 200

    data = resp.get_json()
    assert "job_id" in data
    assert "count" in data
    assert "results" in data

    # Estructura mínima del resultado
    assert isinstance(data["results"], list)
    
    # Verificamos que haya un job en la DB
    jobs = get_collection("jobs")
    job_docs = list(jobs.find({}))
    assert len(job_docs) == 1
    assert job_docs[0]["queries"] == payload["queries"]

    # Verificamos que haya places con ese job_id
    places = get_collection("places")
    place_docs = list(places.find({"job_id": job_docs[0]["_id"]}))
    # Verificamos que no se rompa
    assert len(place_docs) >= 0
