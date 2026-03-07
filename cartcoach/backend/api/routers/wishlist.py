"""
Part 4: Wishlist / deferred purchase management.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db import models as db_models
from models.schemas import WishlistItemCreate

router = APIRouter()


@router.post("/")
def add_to_wishlist(body: WishlistItemCreate, db: Session = Depends(get_db)):
    remind_dt = None
    if body.remind_at:
        try:
            remind_dt = datetime.fromisoformat(body.remind_at.replace("Z", "+00:00"))
        except ValueError:
            pass

    item = db_models.WishlistItem(
        user_id=body.user_id,
        product_name=body.product.product_name,
        price=body.product.price,
        category=body.product.category,
        site=body.product.site,
        analysis_json=body.analysis.model_dump() if body.analysis else None,
        remind_at=remind_dt,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"status": "saved", "id": item.id}


@router.get("/{user_id}")
def get_wishlist(user_id: str, db: Session = Depends(get_db)):
    items = (
        db.query(db_models.WishlistItem)
        .filter(db_models.WishlistItem.user_id == user_id)
        .order_by(db_models.WishlistItem.saved_at.desc())
        .all()
    )
    return [
        {
            "id": item.id,
            "product_name": item.product_name,
            "price": item.price,
            "category": item.category,
            "site": item.site,
            "saved_at": item.saved_at.isoformat(),
            "remind_at": item.remind_at.isoformat() if item.remind_at else None,
            "analysis": item.analysis_json,
        }
        for item in items
    ]


@router.delete("/{item_id}")
def remove_from_wishlist(item_id: str, db: Session = Depends(get_db)):
    item = db.query(db_models.WishlistItem).filter(db_models.WishlistItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(item)
    db.commit()
    return {"status": "removed"}


@router.get("/due-reminders/{user_id}")
def get_due_reminders(user_id: str, db: Session = Depends(get_db)):
    """Returns wishlist items whose reminder time has passed."""
    now = datetime.utcnow()
    items = (
        db.query(db_models.WishlistItem)
        .filter(
            db_models.WishlistItem.user_id == user_id,
            db_models.WishlistItem.remind_at <= now,
        )
        .all()
    )
    return [
        {
            "id": item.id,
            "product_name": item.product_name,
            "price": item.price,
            "remind_at": item.remind_at.isoformat() if item.remind_at else None,
        }
        for item in items
    ]
