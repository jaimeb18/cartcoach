"""
Standalone eBay scraper script.
Run as a subprocess to avoid event loop conflicts with uvicorn on Windows.
Usage: python -m logic.ebay_scraper "product name" max_price max_results
Outputs JSON to stdout.
"""

import sys
import json
from playwright.sync_api import sync_playwright


def scrape(product_name: str, max_price: float, max_results: int = 3) -> list[dict]:
    query = product_name.replace(" ", "+")
    url = (
        f"https://www.ebay.com/sch/i.html"
        f"?_nkw={query}"
        f"&_udhi={int(max_price)}"
        f"&LH_BIN=1"
        f"&_sop=12"
    )

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, timeout=15000)
        page.wait_for_timeout(2500)

        items = page.locator('.srp-results li').all()

        results = []
        for item in items:
            if len(results) >= max_results:
                break

            links = item.locator('a[href*="/itm/"]').all()
            if not links:
                continue

            title = ''
            href = ''
            for link in links:
                text = link.inner_text().strip()
                h = link.get_attribute('href') or ''
                text = text.replace('Opens in a new window or tab', '').strip()
                if text and text.lower() != 'shop on ebay' and len(text) > 5:
                    title = text
                    href = h
                    break
                if not href and '/itm/' in h:
                    href = h

            if not title or not href:
                continue

            price_els = item.locator('[class*="price"]').all()
            price = None
            for pel in price_els:
                price_text = pel.inner_text().strip()
                price_text = price_text.split(' to ')[0].strip()
                try:
                    price = float(price_text.replace('$', '').replace(',', ''))
                    break
                except ValueError:
                    continue

            if price is None or price <= 0 or price >= max_price:
                continue

            clean_url = href.split('?')[0] if '?' in href else href

            results.append({
                "name": title[:80],
                "price": round(price, 2),
                "url": clean_url,
                "source": "eBay",
            })

        browser.close()

    return results


if __name__ == "__main__":
    product_name = sys.argv[1]
    max_price = float(sys.argv[2])
    max_results = int(sys.argv[3]) if len(sys.argv) > 3 else 3

    results = scrape(product_name, max_price, max_results)
    print(json.dumps(results))
