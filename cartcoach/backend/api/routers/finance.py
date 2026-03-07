"""
Part 3: Finance API router.
POST /api/analyze — core endpoint used by the extension.
"""

from fastapi import APIRouter
from models.schemas import AnalyzeRequest, FinanceAnalysis
from logic.finance_engine import (
    calculate_budget_impact,
    calculate_goal_delay,
    calculate_future_value,
)
from logic.scoring import compute_risk_score, risk_level_from_score
from logic.recommendation import generate_message, generate_recommendation

router = APIRouter()


@router.post("/analyze", response_model=FinanceAnalysis)
def analyze_purchase(req: AnalyzeRequest) -> FinanceAnalysis:
    """
    Core endpoint. Accepts a product + user profile, returns full financial analysis.
    Used by the Chrome extension content script via the background service worker.
    """
    product = req.product
    profile = req.profile

    budget_impact = calculate_budget_impact(product, profile)
    goal_delay_days = calculate_goal_delay(product, profile)
    future_value_5y = calculate_future_value(product.price, years=5)

    risk_score = compute_risk_score(product, profile, budget_impact, goal_delay_days)
    risk_level = risk_level_from_score(risk_score)

    message = generate_message(
        product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y
    )
    recommendation = generate_recommendation(
        risk_level, profile, budget_impact, goal_delay_days
    )

    # Fetch alternatives inline (import here to avoid circular)
    from api.routers.alternatives import find_alternatives
    alternatives = find_alternatives(product.product_name, product.category, product.price)

    return FinanceAnalysis(
        show_popup=risk_score > 15,
        risk_score=risk_score,
        risk_level=risk_level,
        budget_impact=budget_impact["label"],
        remaining_budget=budget_impact["remaining_after"],
        goal_delay_days=goal_delay_days,
        future_value_5y=future_value_5y,
        recommendation=recommendation,
        message=message,
        alternatives=alternatives[:3],  # Show at most 3
    )


@router.get("/goal-progress")
def goal_progress(user_id: str):
    """Returns savings goal progress for a user. Reads from DB."""
    from db.database import SessionLocal
    from db import models as db_models

    db = SessionLocal()
    try:
        user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
        if not user:
            return {"error": "User not found"}
        remaining = user.goal_target - user.goal_current
        pct = min(100.0, (user.goal_current / user.goal_target * 100)) if user.goal_target > 0 else 0
        return {
            "goal_name": user.goal_name,
            "target": user.goal_target,
            "current": user.goal_current,
            "remaining": remaining,
            "pct_complete": round(pct, 1),
        }
    finally:
        db.close()
