from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/rellenitos")

if not MONGO_URI:
    raise ValueError("No se encontró MONGO_URI")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=10000
)


db = client["rellenitos"]

productos_collection = db["productos"]

client.admin.command("ping")

print("Mongo conectado")