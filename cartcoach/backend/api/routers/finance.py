"""
Part 3: Finance API router.
POST /api/analyze — core endpoint used by the extension.
All routes are async to support Motor (MongoDB) and Gemini async calls.
"""

from fastapi import APIRouter
from models.schemas import AnalyzeRequest, FinanceAnalysis
from logic.finance_engine import (
    calculate_budget_impact,
    calculate_goal_delay,
    calculate_future_value,
    calculate_investment_breakdown,
)
from models.schemas import InvestmentOption
from logic.scoring import compute_risk_score, risk_level_from_score
from logic.recommendation import generate_message, generate_recommendation

router = APIRouter()


@router.post("/analyze", response_model=FinanceAnalysis, response_model_by_alias=True)
async def analyze_purchase(req: AnalyzeRequest):
    """
    Core endpoint. Accepts a product + user profile, returns full financial analysis.
    Calls Gemini for AI-generated nudge messages. Saves analysis to MongoDB.
    """
    product = req.product
    profile = req.profile

    budget_impact = calculate_budget_impact(product, profile)
    goal_delay_days = calculate_goal_delay(product, profile)
    future_value_5y = calculate_future_value(product.price, years=5)
    investment_data = calculate_investment_breakdown(product.price, years=5)

    risk_score = compute_risk_score(product, profile, budget_impact, goal_delay_days)
    risk_level = risk_level_from_score(risk_score)

    # Gemini-powered messages (async, with template fallback)
    message, recommendation = await _generate_messages(
        product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y, investment_data
    )

    from api.routers.alternatives import find_alternatives
    alternatives = await find_alternatives(product.product_name, product.category, product.price)

    return FinanceAnalysis(
        show_popup=risk_score > 15,
        risk_score=risk_score,
        risk_level=risk_level,
        budget_impact=budget_impact["label"],
        remaining_budget=budget_impact["remaining_after"],
        goal_delay_days=goal_delay_days,
        future_value_5y=future_value_5y,
        investment_breakdown=[InvestmentOption(**opt) for opt in investment_data["breakdown"]],
        recommendation=recommendation,
        message=message,
        alternatives=alternatives[:3],
    )


async def _generate_messages(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y, investment_data):
    """Run both Gemini calls concurrently."""
    import asyncio
    message, recommendation = await asyncio.gather(
        generate_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y, investment_data),
        generate_recommendation(risk_level, profile, budget_impact, goal_delay_days),
    )
    return message, recommendation


@router.get("/goal-progress")
async def goal_progress(user_id: str):
    """Returns savings goal progress for a user from MongoDB."""
    from db.database import get_collection
    users = get_collection("users")
    user = await users.find_one({"id": user_id})
    if not user:
        return {"error": "User not found"}
    remaining = user["goal_target"] - user["goal_current"]
    pct = min(100.0, user["goal_current"] / user["goal_target"] * 100) if user["goal_target"] > 0 else 0
    return {
        "goal_name": user["goal_name"],
        "target": user["goal_target"],
        "current": user["goal_current"],
        "remaining": remaining,
        "pct_complete": round(pct, 1),
    }
