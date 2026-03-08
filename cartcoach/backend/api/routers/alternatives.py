"""
Cheaper alternatives via real eBay scraping.
Runs Playwright in a subprocess to avoid Windows event loop issues.
Falls back to mock-data catalog if scraping fails.
"""

import json
import os
import subprocess
import sys
from fastapi import APIRouter
from models.schemas import Alternative

router = APIRouter()

# Load mock catalog as fallback
_CATALOG_PATH = os.path.join(
    os.path.dirname(__file__), "../../../mock-data/alternatives.json"
)
try:
    with open(_CATALOG_PATH) as f:
        _CATALOG = json.load(f)["catalog"]
except FileNotFoundError:
    _CATALOG = []

# Path to the scraper script
_SCRAPER_DIR = os.path.join(os.path.dirname(__file__), "../../")


def _run_scraper_sync(product_name: str, max_price: float, max_results: int) -> list[dict]:
    """Run the scraper subprocess synchronously (called via run_in_executor)."""
    result = subprocess.run(
        [sys.executable, "-m", "logic.ebay_scraper",
         product_name, str(max_price), str(max_results)],
        capture_output=True, text=True, timeout=30,
        cwd=os.path.abspath(_SCRAPER_DIR),
    )
    if result.returncode != 0:
        raise RuntimeError(f"Scraper failed: {result.stderr[:200]}")
    return json.loads(result.stdout.strip())


async def scrape_ebay(
    product_name: str,
    max_price: float,
    max_results: int = 3,
) -> list[Alternative]:
    """Run the sync Playwright scraper in a thread to avoid event loop issues."""
    import asyncio
    loop = asyncio.get_event_loop()
    raw = await loop.run_in_executor(
        None, _run_scraper_sync, product_name, max_price, max_results
    )
    return [
        Alternative(name=r["name"], price=r["price"], url=r["url"], source=r["source"])
        for r in raw
    ]


def find_alternatives_mock(
    product_name: str,
    category: str,
    price: float,
    max_results: int = 3,
) -> list[Alternative]:
    """Fallback: keyword matching against the mock catalog."""
    name_lower = product_name.lower()
    words = [w for w in name_lower.split() if len(w) > 3]

    scored = []
    for item in _CATALOG:
        if item["price"] >= price:
            continue
        score = 0
        if item.get("category", "").lower() == category.lower():
            score += 5
        for kw in item.get("keywords", []):
            if kw.lower() in name_lower or kw.lower() in words:
                score += 3
        for word in words:
            if word in item["name"].lower():
                score += 2
        if score > 0:
            scored.append((score, item))

    scored.sort(key=lambda x: (-x[0], x[1]["price"]))
    results = scored[:max_results]

    # If nothing matched, return the cheapest items under the price as a generic fallback
    if not results:
        cheaper = [item for item in _CATALOG if item["price"] < price]
        cheaper.sort(key=lambda x: x["price"])
        results = [(0, item) for item in cheaper[:max_results]]

    return [
        Alternative(
            name=item["name"],
            price=item["price"],
            url=item.get("url"),
            source=item.get("source"),
        )
        for _, item in results
    ]


async def find_alternatives(
    product_name: str,
    category: str,
    price: float,
    max_results: int = 3,
) -> list[Alternative]:
    """
    Scrape real eBay listings. Fall back to mock catalog on failure.
    """
    try:
        results = await scrape_ebay(product_name, price, max_results)
        if results:
            print(f"[Alternatives] Scraped {len(results)} real eBay listings for '{product_name}'")
            return results
    except Exception as e:
        print(f"[Alternatives] eBay scraping failed: {e}")

    print(f"[Alternatives] Using mock catalog for '{product_name}'")
    return find_alternatives_mock(product_name, category, price, max_results)


@router.get("/")
async def search_alternatives(
    product_name: str,
    category: str = "Other",
    max_price: float = 9999,
    limit: int = 3,
):
    """
    GET /api/alternatives?product_name=Nike+Running+Shoes&category=Fashion&max_price=120
    """
    results = await find_alternatives(product_name, category, max_price, limit)
    return {"alternatives": [r.model_dump() for r in results]}
