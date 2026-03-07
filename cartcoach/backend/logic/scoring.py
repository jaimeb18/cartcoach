"""
Part 3: Purchase risk scoring engine.
Computes a 0–100 risk score for a given purchase relative to a user profile.
"""

from models.schemas import UserProfile, ExtractedProduct, RiskLevel


def compute_risk_score(
    product: ExtractedProduct,
    profile: UserProfile,
    budget_impact: dict,
    goal_delay_days: int,
) -> int:
    """
    Returns a 0–100 risk score. Higher = riskier purchase.

    Factors:
    - % of monthly budget (up to 40 pts)
    - Over budget flag (20 pts)
    - Goal delay severity (up to 20 pts)
    - Watched category match (10 pts)
    - Time-of-day heuristic (10 pts, penalizes late-night purchases)
    """
    score = 0

    # Factor 1: budget percentage
    pct = budget_impact["budget_pct"]
    if pct >= 50:
        score += 40
    elif pct >= 30:
        score += 30
    elif pct >= 15:
        score += 20
    elif pct >= 5:
        score += 10

    # Factor 2: over-budget
    if budget_impact["over_budget"]:
        score += 20

    # Factor 3: goal delay
    if goal_delay_days >= 30:
        score += 20
    elif goal_delay_days >= 14:
        score += 15
    elif goal_delay_days >= 7:
        score += 10
    elif goal_delay_days >= 3:
        score += 5

    # Factor 4: watched category
    if product.category in profile.watched_categories:
        score += 10

    # Factor 5: late-night purchase (11pm–4am UTC heuristic)
    try:
        from datetime import datetime
        ts = datetime.fromisoformat(product.timestamp.replace("Z", "+00:00"))
        if 23 <= ts.hour or ts.hour <= 4:
            score += 10
    except Exception:
        pass

    return min(100, score)


def risk_level_from_score(score: int) -> RiskLevel:
    if score < 33:
        return RiskLevel.low
    elif score < 66:
        return RiskLevel.medium
    return RiskLevel.high
