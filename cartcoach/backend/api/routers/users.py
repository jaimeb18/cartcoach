"""
Part 4: User management routes.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from db import models as db_models
from models.schemas import UserCreateRequest, UserProfile, SavingsGoal

router = APIRouter()


@router.post("/", response_model=UserProfile)
def create_user(req: UserCreateRequest, db: Session = Depends(get_db)):
    user = db_models.User(
        id=str(uuid.uuid4()),
        monthly_budget=req.monthly_budget,
        monthly_saved=0.0,
        goal_name=req.savings_goal.name,
        goal_target=req.savings_goal.target_amount,
        goal_current=req.savings_goal.current_amount,
        goal_target_date=req.savings_goal.target_date,
        watched_categories=req.watched_categories,
        cooldown_hours=req.cooldown_hours,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_profile(user)


@router.get("/{user_id}", response_model=UserProfile)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_profile(user)


@router.put("/{user_id}", response_model=UserProfile)
def update_user(user_id: str, req: UserCreateRequest, db: Session = Depends(get_db)):
    user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.monthly_budget = req.monthly_budget
    user.goal_name = req.savings_goal.name
    user.goal_target = req.savings_goal.target_amount
    user.goal_current = req.savings_goal.current_amount
    user.goal_target_date = req.savings_goal.target_date
    user.watched_categories = req.watched_categories
    user.cooldown_hours = req.cooldown_hours

    db.commit()
    db.refresh(user)
    return _to_profile(user)


@router.post("/{user_id}/log")
def log_spending(user_id: str, body: dict, db: Session = Depends(get_db)):
    """Log a purchase decision (purchased/skipped/saved_later/cooldown)."""
    entry = db_models.SpendingLog(
        user_id=user_id,
        product_name=body.get("product_name", "Unknown"),
        price=body.get("price", 0),
        category=body.get("category", "Other"),
        site=body.get("site", ""),
        action=body.get("action", "purchased"),
        risk_score=body.get("risk_score"),
    )
    db.add(entry)

    # Update monthly_saved if purchase was made
    if body.get("action") == "purchased":
        user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
        if user:
            user.monthly_saved = (user.monthly_saved or 0) + body.get("price", 0)

    db.commit()
    return {"status": "logged", "id": entry.id}


@router.get("/{user_id}/history")
def get_history(user_id: str, limit: int = 20, db: Session = Depends(get_db)):
    logs = (
        db.query(db_models.SpendingLog)
        .filter(db_models.SpendingLog.user_id == user_id)
        .order_by(db_models.SpendingLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "product_name": l.product_name,
            "price": l.price,
            "category": l.category,
            "site": l.site,
            "action": l.action,
            "risk_score": l.risk_score,
            "timestamp": l.timestamp.isoformat(),
        }
        for l in logs
    ]


def _to_profile(user: db_models.User) -> UserProfile:
    return UserProfile(
        id=user.id,
        monthly_budget=user.monthly_budget,
        monthly_saved=user.monthly_saved or 0.0,
        savings_goal=SavingsGoal(
            name=user.goal_name,
            target_amount=user.goal_target,
            current_amount=user.goal_current,
            target_date=user.goal_target_date,
        ),
        watched_categories=user.watched_categories or [],
        cooldown_hours=user.cooldown_hours,
    )
