from pymongo import MongoClient
from dotenv import load_dotenv
import os
import certifi
import ssl

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

# Fix SSL/TLS issues with MongoDB Atlas
# Use TLSv1.2+ and proper certificate handling
client = MongoClient(
    MONGO_URI,
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=False,
    tlsAllowInvalidHostnames=False,
    serverSelectionTimeoutMS=10000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000
)

db = client["recipes"]
recipes_collection = db["recipes"]
