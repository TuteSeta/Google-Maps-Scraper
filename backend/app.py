from flask import Flask, jsonify, request
from flask_cors import CORS
from bson import ObjectId

try:
    from .scraper.core import scrape_google_maps
    from .db import get_collection
except ImportError:
    from scraper.core import scrape_google_maps
    from db import get_collection


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app, resources={r"/*": {"origins": "*"}})

    jobs_col = get_collection("jobs")
    places_col = get_collection("places")

    # Verificar estado 
    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    # Endpoint post
    @app.post("/scrape")
    def scrape():
        data = request.get_json(silent=True) or {}
        queries = data.get("queries")
        max_results = data.get("max_results", None)

        if not isinstance(queries, list) or not queries:
            return (
                jsonify(
                    {"error": "Field 'queries' must be a non-empty list of strings"}
                ),
                400,
            )

        # Normalizamos y validamos max_results
        if max_results is not None:
            try:
                max_results = int(max_results)
            except (TypeError, ValueError):
                return jsonify({"error": "Field 'max_results' must be an integer"}), 400

            if max_results <= 0:
                return jsonify({"error": "'max_results' must be > 0"}), 400
        else:
            max_results = 20 

        results = scrape_google_maps(queries, max_per_query=max_results)

        job_doc = {
            "queries": queries,
            "result_count": len(results),
        }
        job_id = jobs_col.insert_one(job_doc).inserted_id

        mongo_docs = []
        for r in results:
            doc = dict(r)
            doc["job_id"] = job_id  # ObjectId para Mongo
            doc["contacted"] = False
            mongo_docs.append(doc)

        if mongo_docs:
            places_col.insert_many(mongo_docs)

        safe_results = []
        for r in results:
            safe_results.append(
                {
                    "query": r.get("query"),
                    "name": r.get("name"),
                    "average_rating": r.get("average_rating"),
                    "address": r.get("address"),
                    "url": r.get("url"),
                    "phone": r.get("phone"),
                    "website": r.get("website"),
                    "job_id": str(job_id),  # para el cliente, string
                }
            )

        return (
            jsonify(
                {
                    "job_id": str(job_id),
                    "count": len(safe_results),
                    "results": safe_results,
                }
            ),
            200,
        )


    # Endpoint para debug
    @app.get("/results")
    def get_results():
        docs = []
        for doc in places_col.find():
            doc["_id"] = str(doc["_id"])
            doc["job_id"] = str(doc["job_id"])
            docs.append(doc)
        return jsonify(docs), 200

    # listar jobs guardadas
    @app.get("/jobs")
    def get_jobs():
        jobs = []
        for job in jobs_col.find().sort("_id", -1):
            job_id = job["_id"]
            jobs.append(
                {
                    "id": str(job_id),
                    "queries": job.get("queries", []),
                    "result_count": job.get("result_count", 0),
                    # timestamp aproximado usando el ObjectId
                    "created_at": job_id.generation_time.isoformat(),
                }
            )
        return jsonify(jobs), 200

    # resultados por job_id
    @app.get("/jobs/<job_id>/results")
    def get_job_results(job_id):
        try:
            oid = ObjectId(job_id)
        except Exception:
            return jsonify({"error": "Invalid job_id"}), 400

        job = jobs_col.find_one({"_id": oid})
        if not job:
            return jsonify({"error": "Job not found"}), 404

        places = []
        for doc in places_col.find({"job_id": oid}):
            places.append(
                {
                    "id": str(doc["_id"]),
                    "job_id": str(doc["job_id"]),
                    "query": doc.get("query"),
                    "name": doc.get("name"),
                    "average_rating": doc.get("average_rating"),
                    "address": doc.get("address"),
                    "url": doc.get("url"),
                    "phone": doc.get("phone"),
                    "website": doc.get("website"),
                    "contacted": bool(doc.get("contacted", False)),
                }
            )

        return (
            jsonify(
                {
                    "job_id": str(job["_id"]),
                    "queries": job.get("queries", []),
                    "result_count": job.get("result_count", len(places)),
                    "results": places,
                }
            ),
            200,
        )

    # actualizar solo contacted de un place
    @app.patch("/places/<place_id>")
    def update_place(place_id):
        data = request.get_json(silent=True) or {}
        if "contacted" not in data:
            return jsonify({"error": "Field 'contacted' is required"}), 400

        contacted = bool(data["contacted"])

        try:
            oid = ObjectId(place_id)
        except Exception:
            return jsonify({"error": "Invalid place_id"}), 400

        result = places_col.update_one({"_id": oid}, {"$set": {"contacted": contacted}})
        if result.matched_count == 0:
            return jsonify({"error": "Place not found"}), 404

        return jsonify({"ok": True, "contacted": contacted}), 200

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
