"""
AI-powered insights endpoints:
- POST /api/insights/classify  — intent classification
- POST /api/insights/chat      — conversational financial Q&A
- GET  /api/insights/weekly/{user_id} — weekly behavior summary
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.schemas import (
    ExtractedProduct, UserProfile, ChatRequest, ChatResponse,
    IntentClassification, WeeklySummary,
)
from logic.recommendation import classify_intent, generate_weekly_summary, answer_question
from db.database import get_collection
from datetime import datetime, timezone, timedelta

router = APIRouter()


class ClassifyRequest(BaseModel):
    product: ExtractedProduct
    profile: UserProfile


@router.post("/classify", response_model=IntentClassification)
async def classify_purchase(req: ClassifyRequest):
    """
    Classifies a purchase as: need, want, impulse, emergency, gift, or duplicate.
    """
    result = await classify_intent(req.product, req.profile)
    return IntentClassification(
        intent=result.get("intent", "want"),
        confidence=result.get("confidence", "medium"),
        explanation=result.get("explanation", ""),
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Answers a user's financial question in context.
    Examples: "Can I afford this?", "How bad is this for my budget?", "What should I cut this month?"
    """
    answer = await answer_question(req.question, req.product, req.profile)
    return ChatResponse(answer=answer)


@router.get("/weekly/{user_id}", response_model=WeeklySummary)
async def weekly_summary(user_id: str):
    """
    Generates a Gemini-written weekly behavior summary from the user's spending logs.
    """
    users = get_collection("users")
    user_doc = await users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")

    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    logs_col = get_collection("spending_logs")
    cursor = logs_col.find({"user_id": user_id, "timestamp": {"$gte": week_ago}})
    logs = []
    async for doc in cursor:
        doc.pop("_id", None)
        logs.append(doc)

    from models.schemas import SavingsGoal, ToneMode
    profile = UserProfile(
        id=user_doc["id"],
        monthly_budget=user_doc["monthly_budget"],
        monthly_saved=user_doc.get("monthly_spent", 0.0),
        savings_goal=SavingsGoal(
            name=user_doc["goal_name"],
            target_amount=user_doc["goal_target"],
            current_amount=user_doc["goal_current"],
        ),
        watched_categories=user_doc.get("watched_categories", []),
        cooldown_hours=user_doc.get("cooldown_hours", 48),
        tone_mode=user_doc.get("tone_mode", ToneMode.gentle),
    )

    purchased = [l for l in logs if l.get("action") == "purchased"]
    skipped = [l for l in logs if l.get("action") in ("skipped", "saved_later")]
    total_spent = sum(l.get("price", 0) for l in purchased)
    amount_saved = sum(l.get("price", 0) for l in skipped)

    categories = [l.get("category", "Other") for l in purchased]
    top_category = max(set(categories), key=categories.count) if categories else "None"

    insight = await generate_weekly_summary(logs, profile)

    return WeeklySummary(
        week_start=week_ago[:10],
        total_spent=round(total_spent, 2),
        purchases_made=len(purchased),
        purchases_skipped=len(skipped),
        amount_saved=round(amount_saved, 2),
        top_category=top_category,
        insight=insight,
    )
