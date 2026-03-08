"""
Part 4: MongoDB connection using Motor (async driver).
Collections: users, spending_logs, wishlist
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "cartcoach")

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    client = AsyncIOMotorClient(MONGODB_URL)


async def close_db():
    global client
    if client:
        client.close()


def get_db():
    return client[MONGODB_DB]


def get_collection(name: str):
    return client[MONGODB_DB][name]


# Ledger collection helpers
def get_ledger_collection(user_id: str, year: int, month: int):
    db = get_db()
    collection_name = f"ledger_{year}_{month}"
    return db[collection_name]

async def ensure_ledger_indexes(year: int, month: int):
    db = get_db()
    collection_name = f"ledger_{year}_{month}"
    col = db[collection_name]
    await col.create_index([("user_id", 1), ("date", 1)])
    await col.create_index([("id", 1)], unique=True)
    await col.create_index([("user_id", 1), ("created_at", -1)])
