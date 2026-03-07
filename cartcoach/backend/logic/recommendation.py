"""
Part 3: Recommendation engine.
Uses Gemini API for AI-generated nudge messages. Falls back to templates if no API key.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv
from models.schemas import UserProfile, ExtractedProduct, RiskLevel

load_dotenv()

_GEMINI_KEY = os.getenv("GEMINI_API_KEY")
_model = None

if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)
    _model = genai.GenerativeModel("gemini-2.0-flash")


async def generate_message(
    product: ExtractedProduct,
    profile: UserProfile,
    risk_level: RiskLevel,
    budget_impact: dict,
    goal_delay_days: int,
    future_value_5y: float,
) -> str:
    """
    Generates a personalized nudge message using Gemini.
    Falls back to a template if the API key is not set.
    """
    if _model:
        return await _gemini_message(
            product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y
        )
    return _template_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y)


async def generate_recommendation(
    risk_level: RiskLevel,
    profile: UserProfile,
    budget_impact: dict,
    goal_delay_days: int,
) -> str:
    """
    Generates a short action recommendation using Gemini.
    Falls back to a template if the API key is not set.
    """
    if _model:
        return await _gemini_recommendation(risk_level, profile, budget_impact, goal_delay_days)
    return _template_recommendation(risk_level, profile, budget_impact, goal_delay_days)


async def _gemini_message(
    product: ExtractedProduct,
    profile: UserProfile,
    risk_level: RiskLevel,
    budget_impact: dict,
    goal_delay_days: int,
    future_value_5y: float,
) -> str:
    prompt = f"""You are CartCoach, a friendly financial wellness assistant.
A user is about to buy something online. Write a brief, non-judgmental 1-2 sentence nudge message.
Be conversational and supportive — not preachy. Mention specific numbers. No emojis.

Purchase details:
- Item: {product.product_name}
- Price: ${product.price:.2f}
- Site: {product.site}
- Category: {product.category}

User's financial situation:
- Monthly budget: ${profile.monthly_budget}
- Budget used this month: {budget_impact['budget_pct']:.0f}%
- Remaining budget after purchase: ${budget_impact['remaining_after']:.2f}
- Savings goal: "{profile.savings_goal.name}" (${profile.savings_goal.current_amount} of ${profile.savings_goal.target_amount} saved)
- This purchase delays that goal by: {goal_delay_days} days
- If saved and invested at 7% for 5 years: ${future_value_5y:.2f}
- Risk level: {risk_level.value}

Write only the message, nothing else."""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception:
        return _template_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y)


async def _gemini_recommendation(
    risk_level: RiskLevel,
    profile: UserProfile,
    budget_impact: dict,
    goal_delay_days: int,
) -> str:
    prompt = f"""You are CartCoach, a financial wellness assistant.
Based on this purchase risk, write a single short action recommendation (max 12 words).
Be direct but kind. No emojis.

Risk level: {risk_level.value}
Over budget: {budget_impact['over_budget']}
Goal delay: {goal_delay_days} days
Cooldown preference: {profile.cooldown_hours} hours

Write only the recommendation, nothing else."""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception:
        return _template_recommendation(risk_level, profile, budget_impact, goal_delay_days)


# --- Template fallbacks ---

def _template_message(
    product: ExtractedProduct,
    profile: UserProfile,
    risk_level: RiskLevel,
    budget_impact: dict,
    goal_delay_days: int,
    future_value_5y: float,
) -> str:
    goal_name = profile.savings_goal.name
    pct = budget_impact["budget_pct"]

    if risk_level == RiskLevel.high:
        return (
            f"This ${product.price:.0f} purchase is {pct:.0f}% of your monthly budget "
            f"and could delay your \"{goal_name}\" goal by {goal_delay_days} days. "
            f"If saved, it could grow to ${future_value_5y:.0f} in 5 years."
        )
    elif risk_level == RiskLevel.medium:
        return (
            f"This would use {pct:.0f}% of your monthly budget "
            f"and push your \"{goal_name}\" goal back by {goal_delay_days} days."
        )
    return (
        f"This looks manageable — only {pct:.0f}% of your monthly budget. "
        f"Your \"{goal_name}\" goal stays on track."
    )


def _template_recommendation(
    risk_level: RiskLevel,
    profile: UserProfile,
    budget_impact: dict,
    goal_delay_days: int,
) -> str:
    if risk_level == RiskLevel.high:
        if budget_impact["over_budget"]:
            return "This exceeds your remaining budget. Consider skipping or waiting."
        return f"Wait {profile.cooldown_hours} hours and ask: do you still want it?"
    if risk_level == RiskLevel.medium:
        if goal_delay_days > 14:
            return "Is this a need or a want? Skipping it keeps your goal on track."
        return "Consider adding to your wishlist and revisiting next week."
    return "Looks good — this fits within your budget. Your call!"


def generate_future_self_message(product: ExtractedProduct, future_value: float) -> str:
    templates = [
        f"Your future self might prefer ${future_value:.0f} over this.",
        f"In 5 years, this ${product.price:.0f} could be ${future_value:.0f} if saved.",
        f"Skip it today, and this money could grow to ${future_value:.0f} by 2031.",
    ]
    idx = int(product.price) % len(templates)
    return templates[idx]
