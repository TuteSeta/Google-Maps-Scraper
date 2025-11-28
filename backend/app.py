from flask import Flask, jsonify, request
from flask_cors import CORS
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

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.post("/scrape")
    def scrape():
        data = request.get_json(silent=True) or {}
        queries = data.get("queries")

        if not isinstance(queries, list) or not queries:
            return (
                jsonify({"error": "Field 'queries' must be a non-empty list of strings"}),
                400,
            )

        results = scrape_google_maps(queries)
  
        job_doc = {
            "queries": queries,
            "result_count": len(results),
        }
        job_id = jobs_col.insert_one(job_doc).inserted_id

        mongo_docs = []
        for r in results:
            doc = dict(r)
            doc["job_id"] = job_id          # ObjectId para Mongo
            mongo_docs.append(doc)

        if mongo_docs:
            places_col.insert_many(mongo_docs)

        safe_results = []
        for r in results:
            safe_results.append({
                "query": r.get("query"),
                "name": r.get("name"),
                "average_rating": r.get("average_rating"),
                "address": r.get("address"),
                "url": r.get("url"),
                "phone": r.get("phone"),
                "website": r.get("website"),
                "job_id": str(job_id),   # para el cliente, string
            })

        return jsonify({
            "job_id": str(job_id),
            "count": len(safe_results),
            "results": safe_results,
        }), 200

    @app.get("/results")
    def get_results():
        docs = []
        for doc in places_col.find():
            doc["_id"] = str(doc["_id"])
            doc["job_id"] = str(doc["job_id"])
            docs.append(doc)
        return jsonify(docs), 200

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
