"""
Part 3: Recommendation engine.
Uses Gemini API for AI-generated nudge messages. Falls back to templates if no API key.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv
from models.schemas import UserProfile, ExtractedProduct, RiskLevel, ToneMode

load_dotenv()

_GEMINI_KEY = os.getenv("GEMINI_API_KEY")
_model = None

if _GEMINI_KEY:
    genai.configure(api_key=_GEMINI_KEY)
    _model = genai.GenerativeModel("gemini-2.5-flash")


_TONE_INSTRUCTIONS = {
    ToneMode.gentle: "Be warm, supportive, and non-judgmental. Speak like a caring friend.",
    ToneMode.direct: "Be clear and honest. No fluff. Give the facts and a direct recommendation.",
    ToneMode.best_friend: "Be casual, fun, and relatable. Like texting a friend who's good with money. Keep it real but light.",
    ToneMode.professional: "Be neutral and factual. Professional financial guidance tone. No emotion.",
}


async def generate_message(
    product: ExtractedProduct,
    profile: UserProfile,
    risk_level: RiskLevel,
    budget_impact: dict,
    goal_delay_days: int,
    future_value_5y: float,
    investment_data: dict = None,
) -> str:
    if _model:
        return await _gemini_message(
            product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y, investment_data
        )
    return _template_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y)


async def generate_recommendation(
    risk_level: RiskLevel,
    profile: UserProfile,
    budget_impact: dict,
    goal_delay_days: int,
) -> str:
    if _model:
        return await _gemini_recommendation(risk_level, profile, budget_impact, goal_delay_days)
    return _template_recommendation(risk_level, profile, budget_impact, goal_delay_days)


async def classify_intent(product: ExtractedProduct, profile: UserProfile) -> dict:
    """Classifies the purchase intent: need, want, impulse, emergency, gift, duplicate."""
    if _model:
        return await _gemini_classify_intent(product, profile)
    return _template_classify_intent(product)


async def explain_alternative(original: ExtractedProduct, alt_name: str, alt_price: float, profile: UserProfile) -> str:
    """Explains why an alternative is a better fit for this user."""
    if _model:
        return await _gemini_explain_alternative(original, alt_name, alt_price, profile)
    savings = round(original.price - alt_price, 2)
    pct = round((savings / original.price) * 100)
    return f"{alt_name} is {pct}% cheaper (saves ${savings:.2f}), making it a better fit for your current budget."


async def generate_weekly_summary(logs: list, profile: UserProfile) -> str:
    """Generates a Gemini-written weekly behavior summary from spending logs."""
    if _model:
        return await _gemini_weekly_summary(logs, profile)
    return _template_weekly_summary(logs, profile)


async def answer_question(question: str, product, profile: UserProfile) -> str:
    """Answers a user's financial question in context."""
    if _model:
        return await _gemini_chat(question, product, profile)
    return "I can't answer right now, but check your budget remaining and goal progress before deciding."


# --- Gemini implementations ---

async def _gemini_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y, investment_data=None) -> str:
    investment_context = ""
    if investment_data and investment_data.get("breakdown"):
        lines = []
        for opt in investment_data["breakdown"]:
            lines.append(f"  - {opt['vehicle']} ({opt['rate_pct']}%/yr): grows to ${opt['future_value']:.2f} (+${opt['gain']:.2f})")
        investment_context = "\nIf saved and invested for 5 years:\n" + "\n".join(lines)

    prompt = f"""Output exactly 3 bullet points (using • ) with factual numbers only. No sentences, no greeting, no opinion, no emojis, no conversational language. Pure financial facts.

Data:
- Product: {product.product_name} — ${product.price:.2f}
- Budget used: {budget_impact['budget_pct']:.0f}% of ${profile.monthly_budget}/mo, ${budget_impact['remaining_after']:.2f} remaining
- Goal "{profile.savings_goal.name}": delayed by {goal_delay_days} days ({profile.savings_goal.current_amount:.0f}/{profile.savings_goal.target_amount:.0f} saved){investment_context}
- 5-year invested value: ${future_value_5y:.2f}

Output format (fill in real numbers, nothing else):
• ${product.price:.2f} = {budget_impact['budget_pct']:.0f}% of your ${profile.monthly_budget:.0f}/mo budget, leaving ${budget_impact['remaining_after']:.2f}
• Delays "{profile.savings_goal.name}" goal by {goal_delay_days} days
• Invested at 7%/yr over 5 years: ${future_value_5y:.2f}"""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini message error] {e}")
        return _template_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y)


async def _gemini_recommendation(risk_level, profile, budget_impact, goal_delay_days) -> str:
    tone = _TONE_INSTRUCTIONS.get(profile.tone_mode, _TONE_INSTRUCTIONS[ToneMode.gentle])
    prompt = f"""You are CartCoach. {tone}
Write a single short action recommendation (max 12 words). No emojis.

Risk: {risk_level.value} | Over budget: {budget_impact['over_budget']} | Goal delay: {goal_delay_days} days

Write only the recommendation."""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini recommendation error] {e}")
        return _template_recommendation(risk_level, profile, budget_impact, goal_delay_days)


async def _gemini_classify_intent(product: ExtractedProduct, profile: UserProfile) -> dict:
    prompt = f"""Classify this online purchase into one of these intents:
- need: essential item, replacing broken/worn out thing
- want: desired but not essential
- impulse: unplanned, likely emotional/boredom purchase
- emergency: urgent necessity
- gift: buying for someone else
- duplicate: user likely already owns something similar

Product: {product.product_name}
Price: ${product.price}
Category: {product.category}
Site: {product.site}
Time of purchase: {product.timestamp}

Respond in this exact JSON format:
{{"intent": "<intent>", "confidence": "<high|medium|low>", "explanation": "<one sentence>"}}"""

    try:
        response = await _model.generate_content_async(prompt)
        import json
        text = response.text.strip().strip("```json").strip("```").strip()
        data = json.loads(text)
        return data
    except Exception as e:
        print(f"[Gemini classify error] {e}")
        return _template_classify_intent(product)


async def _gemini_explain_alternative(original: ExtractedProduct, alt_name: str, alt_price: float, profile: UserProfile) -> str:
    savings = round(original.price - alt_price, 2)
    tone = _TONE_INSTRUCTIONS.get(profile.tone_mode, _TONE_INSTRUCTIONS[ToneMode.gentle])
    prompt = f"""You are CartCoach. {tone}
In one sentence, explain why this cheaper alternative is a better choice given the user's situation. No emojis.

Original: {original.product_name} — ${original.price}
Alternative: {alt_name} — ${alt_price} (saves ${savings:.2f})
User's savings goal: "{profile.savings_goal.name}"
Remaining budget: ${profile.monthly_budget - profile.monthly_saved:.2f}

Write only the explanation."""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini alternative error] {e}")
        return f"{alt_name} saves you ${savings:.2f}, keeping more money toward your {profile.savings_goal.name} goal."


async def _gemini_weekly_summary(logs: list, profile: UserProfile) -> str:
    purchased = [l for l in logs if l.get("action") == "purchased"]
    skipped = [l for l in logs if l.get("action") in ("skipped", "saved_later")]
    total_spent = sum(l.get("price", 0) for l in purchased)
    amount_saved = sum(l.get("price", 0) for l in skipped)

    log_lines = "\n".join(
        f"- {l.get('product_name')} ${l.get('price')} [{l.get('action')}]" for l in logs
    )

    prompt = f"""You are CartCoach. Write a short, encouraging 2-3 sentence weekly spending summary for this user. Be specific with numbers. No emojis.

User: monthly budget ${profile.monthly_budget}, goal: "{profile.savings_goal.name}"
This week's activity:
{log_lines}

Total spent: ${total_spent:.2f}
Purchases avoided: {len(skipped)} items worth ${amount_saved:.2f}

Write only the summary."""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini summary error] {e}")
        return _template_weekly_summary(logs, profile)


async def _gemini_chat(question: str, product, profile: UserProfile) -> str:
    tone = _TONE_INSTRUCTIONS.get(profile.tone_mode, _TONE_INSTRUCTIONS[ToneMode.gentle])
    product_context = ""
    if product:
        product_context = f"\nItem being considered: {product.product_name} — ${product.price} ({product.category})"

    prompt = f"""You are CartCoach, a financial wellness assistant. {tone}
Answer the user's question in 1-3 sentences using their financial context. No emojis. No generic advice.

User's finances:
- Monthly budget: ${profile.monthly_budget}
- Spent this month: ${profile.monthly_saved}
- Remaining: ${profile.monthly_budget - profile.monthly_saved:.2f}
- Savings goal: "{profile.savings_goal.name}" (${profile.savings_goal.current_amount} of ${profile.savings_goal.target_amount}){product_context}

User's question: {question}

Answer directly."""

    try:
        response = await _model.generate_content_async(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"[Gemini chat error] {e}")
        return "I can't answer right now. Check your remaining budget and consider whether this aligns with your savings goal."


# --- Template fallbacks ---

def _template_message(product, profile, risk_level, budget_impact, goal_delay_days, future_value_5y) -> str:
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


def _template_recommendation(risk_level, profile, budget_impact, goal_delay_days) -> str:
    if risk_level == RiskLevel.high:
        if budget_impact["over_budget"]:
            return "This exceeds your remaining budget. Consider skipping or waiting."
        return f"Wait {profile.cooldown_hours} hours and ask: do you still want it?"
    if risk_level == RiskLevel.medium:
        if goal_delay_days > 14:
            return "Is this a need or a want? Skipping it keeps your goal on track."
        return "Consider adding to your wishlist and revisiting next week."
    return "Looks good — this fits within your budget. Your call!"


def _template_classify_intent(product: ExtractedProduct) -> dict:
    name = product.product_name.lower()
    category = product.category.lower()
    if any(w in name for w in ["charger", "cable", "repair", "replacement", "medicine", "urgent"]):
        return {"intent": "need", "confidence": "medium", "explanation": "This appears to be a functional necessity."}
    if category in ["beauty", "fashion"] and product.price > 50:
        return {"intent": "impulse", "confidence": "medium", "explanation": "Higher-priced fashion/beauty items are often impulse purchases."}
    if any(w in name for w in ["gift", "present", "birthday"]):
        return {"intent": "gift", "confidence": "high", "explanation": "Product name suggests this is a gift."}
    return {"intent": "want", "confidence": "medium", "explanation": "This appears to be a desired but non-essential purchase."}


def _template_weekly_summary(logs: list, profile: UserProfile) -> str:
    purchased = [l for l in logs if l.get("action") == "purchased"]
    skipped = [l for l in logs if l.get("action") in ("skipped", "saved_later")]
    total_spent = sum(l.get("price", 0) for l in purchased)
    amount_saved = sum(l.get("price", 0) for l in skipped)
    return (
        f"This week you made {len(purchased)} purchases totaling ${total_spent:.2f} "
        f"and avoided {len(skipped)} flagged items worth ${amount_saved:.2f}. "
        f"Keep it up — every skipped purchase gets you closer to your {profile.savings_goal.name} goal."
    )


def generate_future_self_message(product: ExtractedProduct, future_value: float) -> str:
    templates = [
        f"Your future self might prefer ${future_value:.0f} over this.",
        f"In 5 years, this ${product.price:.0f} could be ${future_value:.0f} if saved.",
        f"Skip it today, and this money could grow to ${future_value:.0f} by 2031.",
    ]
    idx = int(product.price) % len(templates)
    return templates[idx]
