from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise ValueError("No se encontró MONGO_URI")

client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=30000
)

db = client["rellenitos"]

productos_collection = db["productos"]

client.admin.command("ping")

print("Mongo conectado")