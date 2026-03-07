"""
Part 4: MongoDB document helpers.
No ORM — just plain dicts that match our Pydantic schemas.
"""

import uuid
from datetime import datetime, timezone


def new_id() -> str:
    return str(uuid.uuid4())


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def user_doc(
    monthly_budget: float,
    savings_goal: dict,
    watched_categories: list,
    cooldown_hours: int,
    user_id: str = None,
) -> dict:
    return {
        "id": user_id or new_id(),
        "monthly_budget": monthly_budget,
        "monthly_spent": 0.0,
        "goal_name": savings_goal.get("name", "Savings Goal"),
        "goal_target": savings_goal.get("target_amount", 1000.0),
        "goal_current": savings_goal.get("current_amount", 0.0),
        "goal_target_date": savings_goal.get("target_date"),
        "watched_categories": watched_categories,
        "cooldown_hours": cooldown_hours,
        "created_at": now_utc().isoformat(),
    }


def spending_log_doc(
    user_id: str,
    product_name: str,
    price: float,
    category: str,
    site: str,
    action: str,
    risk_score: int = None,
) -> dict:
    return {
        "id": new_id(),
        "user_id": user_id,
        "product_name": product_name,
        "price": price,
        "category": category,
        "site": site,
        "action": action,
        "risk_score": risk_score,
        "timestamp": now_utc().isoformat(),
    }


def wishlist_doc(
    user_id: str,
    product: dict,
    analysis: dict = None,
    remind_at: str = None,
) -> dict:
    return {
        "id": new_id(),
        "user_id": user_id,
        "product_name": product.get("product_name", ""),
        "price": product.get("price", 0),
        "category": product.get("category", "Other"),
        "site": product.get("site", ""),
        "analysis": analysis,
        "saved_at": now_utc().isoformat(),
        "remind_at": remind_at,
    }
