"""
Part 4: User management routes — backed by MongoDB.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from db.database import get_collection, get_ledger_collection, ensure_ledger_indexes
from db.models import user_doc, spending_log_doc, ledger_entry_doc
from models.schemas import UserCreateRequest, UserProfile, SavingsGoal

router = APIRouter()


@router.post("/", response_model=UserProfile)
async def create_user(req: UserCreateRequest):
    users = get_collection("users")
    doc = user_doc(
        monthly_budget=req.monthly_budget,
        savings_goal=req.savings_goal.model_dump(),
        watched_categories=req.watched_categories,
        cooldown_hours=req.cooldown_hours,
        tone_mode=req.tone_mode.value,
    )
    await users.insert_one(doc)
    return _to_profile(doc)


@router.get("/{user_id}", response_model=UserProfile)
async def get_user(user_id: str):
    users = get_collection("users")
    doc = await users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_profile(doc)


@router.put("/{user_id}", response_model=UserProfile)
async def update_user(user_id: str, req: UserCreateRequest):
    users = get_collection("users")
    update = {
        "monthly_budget": req.monthly_budget,
        "goal_name": req.savings_goal.name,
        "goal_target": req.savings_goal.target_amount,
        "goal_current": req.savings_goal.current_amount,
        "goal_target_date": req.savings_goal.target_date,
        "watched_categories": req.watched_categories,
        "cooldown_hours": req.cooldown_hours,
    }
    result = await users.find_one_and_update(
        {"id": user_id},
        {"$set": update},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_profile(result)


@router.post("/{user_id}/log")
async def log_spending(user_id: str, body: dict):
    """Log a purchase decision: purchased | skipped | saved_later | cooldown"""
    logs = get_collection("spending_logs")
    doc = spending_log_doc(
        user_id=user_id,
        product_name=body.get("product_name", "Unknown"),
        price=body.get("price", 0),
        category=body.get("category", "Other"),
        site=body.get("site", ""),
        action=body.get("action", "purchased"),
        risk_score=body.get("risk_score"),
    )
    await logs.insert_one(doc)

    action = body.get("action")

    # Track monthly spend
    if action == "purchased":
        users = get_collection("users")
        await users.update_one(
            {"id": user_id},
            {"$inc": {"monthly_spent": body.get("price", 0)}},
        )

    # Auto-sync to ledger
    if action in ("purchased", "saved_later"):
        ts = datetime.fromisoformat(doc["timestamp"])
        year, month = ts.year, ts.month
        await ensure_ledger_indexes(year, month)
        collection = get_ledger_collection(user_id, year, month)
        if action == "purchased":
            description = body.get("product_name", "Unknown")
            category = body.get("category", "Other")
            inflow, outflow = None, body.get("price", 0)
        else:  # saved_later
            description = "Item Skipped - Cash Transfer"
            category = "Savings"
            inflow, outflow = None, body.get("price", 0)
        entry = ledger_entry_doc(
            user_id=user_id,
            date=ts.strftime("%Y-%m-%d"),
            description=description,
            category=category,
            inflow=inflow,
            outflow=outflow,
            notes=body.get("site", ""),
            entry_id=f"log_{doc['id']}",
            source="auto",
        )
        await collection.update_one({"id": entry["id"]}, {"$set": entry}, upsert=True)

    return {"status": "logged", "id": doc["id"]}


@router.get("/{user_id}/history")
async def get_history(user_id: str, limit: int = 20):
    logs = get_collection("spending_logs")
    cursor = logs.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    return results


def _to_profile(doc: dict) -> UserProfile:
    return UserProfile(
        id=doc["id"],
        monthly_budget=doc["monthly_budget"],
        monthly_saved=doc.get("monthly_spent", 0.0),
        savings_goal=SavingsGoal(
            name=doc["goal_name"],
            target_amount=doc["goal_target"],
            current_amount=doc["goal_current"],
            target_date=doc.get("goal_target_date"),
        ),
        watched_categories=doc.get("watched_categories", []),
        cooldown_hours=doc.get("cooldown_hours", 48),
    )
