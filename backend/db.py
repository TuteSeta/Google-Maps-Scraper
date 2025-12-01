import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "maps_scraper")

client = MongoClient(MONGO_URI)
db = client[MONGO_DB_NAME]

def get_collection(name: str):
    return db[name]
