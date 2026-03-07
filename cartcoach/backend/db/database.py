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
