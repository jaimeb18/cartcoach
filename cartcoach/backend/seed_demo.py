"""
Demo seed script — pre-loads MongoDB with a demo user and spending history.
Run: python seed_demo.py
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "cartcoach")

DEMO_USER = {
    "id": "demo_user_1",
    "monthly_budget": 500.0,
    "monthly_spent": 187.94,
    "goal_name": "Japan Trip",
    "goal_target": 3000.0,
    "goal_current": 850.0,
    "goal_target_date": "2026-12-01",
    "watched_categories": ["Fashion", "Beauty"],
    "cooldown_hours": 48,
    "tone_mode": "gentle",
    "created_at": "2026-03-01T00:00:00+00:00",
}

DEMO_LOGS = [
    {"id":"log_1","user_id":"demo_user_1","product_name":"Nike Air Max Running Shoes","price":120.00,"category":"Fashion","site":"amazon.com","action":"skipped","risk_score":72,"timestamp":"2026-03-01T14:22:00+00:00"},
    {"id":"log_2","user_id":"demo_user_1","product_name":"Maybelline Fit Me Foundation","price":8.97,"category":"Beauty","site":"walmart.com","action":"purchased","risk_score":12,"timestamp":"2026-03-02T10:05:00+00:00"},
    {"id":"log_3","user_id":"demo_user_1","product_name":"Sony WH-1000XM5 Headphones","price":279.99,"category":"Electronics","site":"bestbuy.com","action":"saved_later","risk_score":89,"timestamp":"2026-03-03T23:15:00+00:00"},
    {"id":"log_4","user_id":"demo_user_1","product_name":"Hanes T-Shirt 6-Pack","price":22.00,"category":"Fashion","site":"amazon.com","action":"purchased","risk_score":18,"timestamp":"2026-03-04T09:30:00+00:00"},
    {"id":"log_5","user_id":"demo_user_1","product_name":"Charlotte Tilbury Lipstick","price":38.00,"category":"Beauty","site":"sephora.com","action":"skipped","risk_score":55,"timestamp":"2026-03-05T20:45:00+00:00"},
    {"id":"log_6","user_id":"demo_user_1","product_name":"AmazonBasics Laptop Backpack","price":27.99,"category":"Fashion","site":"amazon.com","action":"purchased","risk_score":22,"timestamp":"2026-03-06T11:00:00+00:00"},
    {"id":"log_7","user_id":"demo_user_1","product_name":"Dyson Airwrap","price":599.99,"category":"Beauty","site":"dyson.com","action":"skipped","risk_score":100,"timestamp":"2026-03-07T01:30:00+00:00"},
]

DEMO_WISHLIST = [
    {"id":"wish_1","user_id":"demo_user_1","product_name":"Sony WH-1000XM5 Headphones","price":279.99,"category":"Electronics","site":"bestbuy.com","analysis":None,"saved_at":"2026-03-03T23:15:00+00:00","remind_at":"2026-03-05T23:15:00+00:00"},
]


async def seed():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[MONGODB_DB]

    await db["users"].delete_many({"id": "demo_user_1"})
    await db["spending_logs"].delete_many({"user_id": "demo_user_1"})
    await db["wishlist"].delete_many({"user_id": "demo_user_1"})

    await db["users"].insert_one(DEMO_USER)
    await db["spending_logs"].insert_many(DEMO_LOGS)
    await db["wishlist"].insert_many(DEMO_WISHLIST)

    print("Demo data seeded successfully.")
    print(f"  User ID: demo_user_1")
    print(f"  Spending logs: {len(DEMO_LOGS)}")
    print(f"  Wishlist items: {len(DEMO_WISHLIST)}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
