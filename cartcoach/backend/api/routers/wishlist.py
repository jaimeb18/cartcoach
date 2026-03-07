"""
Part 4: Wishlist / deferred purchase management — backed by MongoDB.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from db.database import get_collection
from db.models import wishlist_doc
from models.schemas import WishlistItemCreate

router = APIRouter()


@router.post("/")
async def add_to_wishlist(body: WishlistItemCreate):
    wishlist = get_collection("wishlist")
    doc = wishlist_doc(
        user_id=body.user_id,
        product=body.product.model_dump(),
        analysis=body.analysis.model_dump() if body.analysis else None,
        remind_at=body.remind_at,
    )
    await wishlist.insert_one(doc)
    return {"status": "saved", "id": doc["id"]}


@router.get("/{user_id}")
async def get_wishlist(user_id: str):
    wishlist = get_collection("wishlist")
    cursor = wishlist.find({"user_id": user_id}).sort("saved_at", -1)
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    return results


@router.delete("/{item_id}")
async def remove_from_wishlist(item_id: str):
    wishlist = get_collection("wishlist")
    result = await wishlist.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "removed"}


@router.get("/due-reminders/{user_id}")
async def get_due_reminders(user_id: str):
    """Returns wishlist items whose reminder time has passed."""
    now = datetime.now(timezone.utc).isoformat()
    wishlist = get_collection("wishlist")
    cursor = wishlist.find({
        "user_id": user_id,
        "remind_at": {"$lte": now, "$ne": None},
    })
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    return results
