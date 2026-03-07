"""
Part 4: Cheaper alternatives lookup.
Uses mock-data catalog with keyword matching. No external scraping needed for demo.
"""

import json
import os
from fastapi import APIRouter
from models.schemas import Alternative

router = APIRouter()

# Load catalog once at startup
_CATALOG_PATH = os.path.join(
    os.path.dirname(__file__), "../../../mock-data/alternatives.json"
)

try:
    with open(_CATALOG_PATH) as f:
        _CATALOG = json.load(f)["catalog"]
except FileNotFoundError:
    _CATALOG = []


def find_alternatives(
    product_name: str,
    category: str,
    price: float,
    max_results: int = 3,
) -> list[Alternative]:
    """
    Finds cheaper alternatives using keyword matching against the mock catalog.
    Filters to items cheaper than the original product.
    """
    name_lower = product_name.lower()
    words = [w for w in name_lower.split() if len(w) > 3]

    scored = []
    for item in _CATALOG:
        if item["price"] >= price:
            continue  # Only show cheaper options

        score = 0

        # Category match
        if item.get("category", "").lower() == category.lower():
            score += 5

        # Keyword match
        for kw in item.get("keywords", []):
            if kw.lower() in name_lower or kw.lower() in words:
                score += 3
        for word in words:
            if word in item["name"].lower():
                score += 2

        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: (-x[0], x[1]["price"]))

    return [
        Alternative(
            name=item["name"],
            price=item["price"],
            url=item.get("url"),
            source=item.get("source"),
        )
        for _, item in scored[:max_results]
    ]


@router.get("/")
def search_alternatives(
    product_name: str,
    category: str = "Other",
    max_price: float = 9999,
    limit: int = 3,
):
    """
    GET /api/alternatives?product_name=Nike+Running+Shoes&category=Fashion&max_price=120
    """
    results = find_alternatives(product_name, category, max_price, limit)
    return {"alternatives": [r.model_dump() for r in results]}
