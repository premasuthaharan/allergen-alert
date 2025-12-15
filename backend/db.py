from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

# Fix SSL/TLS issues with MongoDB Atlas on Python 3.13
client = MongoClient(
    MONGO_URI,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000
)
db = client["recipes"]
recipes_collection = db["recipes"]
