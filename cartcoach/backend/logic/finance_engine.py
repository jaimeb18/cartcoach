"""
Part 3: Finance logic engine.
Handles all financial calculations — budget impact, goal delay, future value.
"""

from models.schemas import UserProfile, ExtractedProduct


ANNUAL_RETURN = 0.07
MONTHS_PER_YEAR = 12


def calculate_budget_impact(product: ExtractedProduct, profile: UserProfile) -> dict:
    """
    Returns budget percentage, remaining budget after purchase, and a human-readable label.
    """
    remaining = profile.monthly_budget - profile.monthly_saved
    budget_pct = round((product.price / profile.monthly_budget) * 100, 1)
    remaining_after = remaining - product.price

    if budget_pct < 10:
        label = f"{budget_pct:.0f}% of monthly budget"
    elif budget_pct < 25:
        label = f"{budget_pct:.0f}% of monthly budget"
    else:
        label = f"{budget_pct:.0f}% of monthly budget — significant"

    return {
        "budget_pct": budget_pct,
        "remaining_before": remaining,
        "remaining_after": remaining_after,
        "label": label,
        "over_budget": remaining_after < 0,
    }


def calculate_goal_delay(product: ExtractedProduct, profile: UserProfile) -> int:
    """
    Estimates how many additional days it will take to reach the savings goal
    if this purchase is made, assuming savings rate = 20% of monthly budget.
    """
    goal = profile.savings_goal
    remaining_goal = goal.target_amount - goal.current_amount

    if remaining_goal <= 0:
        return 0

    # Estimate daily savings rate
    monthly_savings_rate = max(1.0, profile.monthly_budget * 0.20)
    daily_savings_rate = monthly_savings_rate / 30

    if daily_savings_rate <= 0:
        return 0

    delay_days = round(product.price / daily_savings_rate)
    return max(0, delay_days)


def calculate_future_value(amount: float, years: int = 5) -> float:
    """
    Computes the future value of an amount if invested at ANNUAL_RETURN for `years` years.
    Educational estimate only — not financial advice.
    """
    fv = amount * ((1 + ANNUAL_RETURN) ** years)
    return round(fv, 2)


def calculate_investment_breakdown(amount: float, years: int = 5) -> dict:
    """
    Shows what the saved amount would grow to across different investment vehicles.
    Rates are conservative educational estimates, not financial advice.
    """
    vehicles = [
        {"name": "S&P 500 index fund", "rate": 0.10, "label": "stocks"},
        {"name": "High-yield savings account", "rate": 0.045, "label": "savings"},
        {"name": "2-year CD", "rate": 0.05, "label": "cd"},
    ]

    breakdown = []
    for v in vehicles:
        fv = round(amount * ((1 + v["rate"]) ** years), 2)
        gain = round(fv - amount, 2)
        breakdown.append({
            "vehicle": v["name"],
            "label": v["label"],
            "rate_pct": round(v["rate"] * 100, 1),
            "future_value": fv,
            "gain": gain,
            "years": years,
        })

    return {
        "amount": amount,
        "years": years,
        "breakdown": breakdown,
    }


def calculate_monthly_goal_progress(profile: UserProfile) -> dict:
    """
    Returns progress summary toward the savings goal.
    """
    goal = profile.savings_goal
    remaining = goal.target_amount - goal.current_amount
    pct = min(100.0, (goal.current_amount / goal.target_amount) * 100) if goal.target_amount > 0 else 0

    monthly_rate = profile.monthly_budget * 0.20
    months_to_goal = (remaining / monthly_rate) if monthly_rate > 0 else float("inf")

    return {
        "goal_name": goal.name,
        "target": goal.target_amount,
        "current": goal.current_amount,
        "remaining": remaining,
        "pct_complete": round(pct, 1),
        "months_to_goal": round(months_to_goal, 1),
    }
