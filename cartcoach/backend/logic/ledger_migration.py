"""
Migration logic: Import spending_logs into monthly ledger collections.
"""

from datetime import datetime
from db.database import get_collection, get_ledger_collection, ensure_ledger_indexes
from db.models import ledger_entry_doc

async def import_spending_logs_to_ledger(user_id: str):
    spending_logs = get_collection("spending_logs")
    cursor = spending_logs.find({"user_id": user_id})
    logs_by_month = {}
    async for log in cursor:
        ts = datetime.fromisoformat(log["timestamp"])
        month_key = f"{ts.year}_{ts.month}"
        if month_key not in logs_by_month:
            logs_by_month[month_key] = []
        logs_by_month[month_key].append(log)
    for month_key, logs in logs_by_month.items():
        year, month = map(int, month_key.split("_"))
        collection = get_ledger_collection(user_id, year, month)
        await ensure_ledger_indexes(year, month)
        entries = []
        for log in logs:
            ts = datetime.fromisoformat(log["timestamp"])
            is_purchase = log.get("action") == "purchased"
            entry = ledger_entry_doc(
                user_id=user_id,
                date=ts.strftime("%Y-%m-%d"),
                description=log.get("product_name", "Unknown"),
                category=log.get("category", "Other"),
                inflow=None if is_purchase else log.get("price", 0),
                outflow=log.get("price", 0) if is_purchase else None,
                notes=log.get("site", ""),
                source="auto"
            )
            entries.append(entry)
        if entries:
            await collection.insert_many(entries)
    return {
        "status": "migrated",
        "user_id": user_id,
        "months_created": len(logs_by_month),
        "total_entries": sum(len(logs) for logs in logs_by_month.values())
    }
