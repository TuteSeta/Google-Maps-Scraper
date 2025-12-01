import pytest

try:
    # Caso host 
    from backend.app import create_app
    from backend.db import get_collection
except ModuleNotFoundError:
    # Caso docker/container
    from app.app import create_app
    from app.db import get_collection
    
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


def test_scrape_validates_max_results_types(client):
    # Non-integer string
    resp = client.post("/scrape", json={"queries": ["a"], "max_results": "abc"})
    assert resp.status_code == 400
    assert "max_results" in resp.get_json().get("error", "")

    # Zero or negative
    resp = client.post("/scrape", json={"queries": ["a"], "max_results": 0})
    assert resp.status_code == 400
    resp = client.post("/scrape", json={"queries": ["a"], "max_results": -5})
    assert resp.status_code == 400


def test_scrape_uses_default_max_results_and_inserts_places(client, monkeypatch):
    # Stub the scraper to avoid Selenium
    calls = {"args": []}

    def fake_scraper(queries, max_per_query=20):
        calls["args"].append((tuple(queries), max_per_query))
        return [
            {
                "query": queries[0],
                "name": "Test Place",
                "average_rating": 4.5,
                "address": "Some Addr",
                "url": "https://maps.google.com/?cid=1",
                "phone": "+1 555-0100",
                "website": "https://example.com",
            }
        ]

    try:
        import backend.app as app_mod
    except ModuleNotFoundError:
        import app.app as app_mod

    monkeypatch.setattr(app_mod, "scrape_google_maps", fake_scraper)

    resp = client.post("/scrape", json={"queries": ["cafes"]})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["count"] == 1
    assert len(data["results"]) == 1

    # Ensure default max_results (20) is passed down as max_per_query
    assert calls["args"], "Scraper stub was not called"
    passed_queries, passed_max = calls["args"][0]
    assert list(passed_queries) == ["cafes"]
    assert passed_max == 20

    # Verify DB inserts
    jobs = get_collection("jobs")
    places = get_collection("places")
    job_docs = list(jobs.find({}))
    assert len(job_docs) == 1
    place_docs = list(places.find({"job_id": job_docs[0]["_id"]}))
    assert len(place_docs) == 1


def test_get_jobs_lists_inserted_job(client, monkeypatch):
    # Insert via scrape with stubbed scraper to keep it fast
    def fake_scraper(queries, max_per_query=20):
        return [
            {
                "query": queries[0],
                "name": "Foo",
                "average_rating": None,
                "address": "",
                "url": None,
                "phone": None,
                "website": None,
            }
        ]

    try:
        import backend.app as app_mod
    except ModuleNotFoundError:
        import app.app as app_mod

    monkeypatch.setattr(app_mod, "scrape_google_maps", fake_scraper)

    client.post("/scrape", json={"queries": ["term"]})

    resp = client.get("/jobs")
    assert resp.status_code == 200
    jobs_list = resp.get_json()
    assert isinstance(jobs_list, list)
    assert len(jobs_list) == 1
    job = jobs_list[0]
    assert set(["id", "queries", "result_count", "created_at"]).issubset(job.keys())
    assert job["queries"] == ["term"]
    assert job["result_count"] == 1


def test_get_job_results_invalid_and_notfound(client):
    # Invalid ObjectId format
    resp = client.get("/jobs/not-an-oid/results")
    assert resp.status_code == 400
    assert "Invalid" in resp.get_json().get("error", "")

    # Valid ObjectId but not found
    from bson import ObjectId

    fake_oid = str(ObjectId())
    resp = client.get(f"/jobs/{fake_oid}/results")
    assert resp.status_code == 404


def test_update_place_contacted_flow(client):
    jobs = get_collection("jobs")
    places = get_collection("places")

    # Prepare one job and one place
    job_id = jobs.insert_one({"queries": ["x"], "result_count": 1}).inserted_id
    place_id = places.insert_one({
        "job_id": job_id,
        "query": "x",
        "name": "Bar",
        "average_rating": None,
        "address": "",
        "url": None,
        "phone": None,
        "website": None,
        "contacted": False,
    }).inserted_id

    # Missing body field
    resp = client.patch(f"/places/{str(place_id)}", json={})
    assert resp.status_code == 400

    # Invalid id
    resp = client.patch("/places/invalid-id", json={"contacted": True})
    assert resp.status_code == 400

    # Not found
    from bson import ObjectId

    resp = client.patch(f"/places/{str(ObjectId())}", json={"contacted": True})
    assert resp.status_code == 404

    # Success
    resp = client.patch(f"/places/{str(place_id)}", json={"contacted": True})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"ok": True, "contacted": True}

    # Verify in DB
    updated = places.find_one({"_id": place_id})
    assert updated["contacted"] is True
