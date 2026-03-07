"""
Part 3: Recommendation engine.
Generates human-readable nudge messages and action recommendations.
"""

from models.schemas import UserProfile, ExtractedProduct, RiskLevel


def generate_message(
    product: ExtractedProduct,
    profile: UserProfile,
    risk_level: RiskLevel,
    budget_impact: dict,
    goal_delay_days: int,
    future_value_5y: float,
) -> str:
    """
    Produces a concise, non-judgmental 1–2 sentence nudge message.
    """
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
    else:
        return (
            f"This looks manageable — only {pct:.0f}% of your monthly budget. "
            f"Your \"{goal_name}\" goal stays on track."
        )


def generate_recommendation(
    risk_level: RiskLevel,
    profile: UserProfile,
    budget_impact: dict,
    goal_delay_days: int,
) -> str:
    """
    Returns a short, actionable recommendation string.
    """
    if risk_level == RiskLevel.high:
        if budget_impact["over_budget"]:
            return "This exceeds your remaining budget. Consider skipping or waiting until next month."
        return f"Wait {profile.cooldown_hours} hours and ask: do you still want it?"

    if risk_level == RiskLevel.medium:
        if goal_delay_days > 14:
            return "Is this a need or a want? Skipping it keeps your goal on track."
        return "Consider adding to your wishlist and revisiting next week."

    return "Looks good — this fits within your budget. Your call!"


def generate_future_self_message(product: ExtractedProduct, future_value: float) -> str:
    """
    Optional fun motivational message for the UI.
    """
    templates = [
        f"Your future self might prefer ${future_value:.0f} over this.",
        f"In 5 years, this ${product.price:.0f} could be ${future_value:.0f} if saved.",
        f"Skip it today, and this money could grow to ${future_value:.0f} by 2031.",
    ]
    # Deterministic selection based on price
    idx = int(product.price) % len(templates)
    return templates[idx]
