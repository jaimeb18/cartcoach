from fastapi import APIRouter, HTTPException, Depends
from db.database import get_ledger_collection, ensure_ledger_indexes
from db.models import ledger_entry_doc
from typing import List
from logic.ledger_migration import import_spending_logs_to_ledger

router = APIRouter()

# Placeholder endpoints for implementation
@router.get("/{user_id}/{year}/{month}")
async def get_ledger(user_id: str, year: int, month: int):
    await ensure_ledger_indexes(year, month)
    collection = get_ledger_collection(user_id, year, month)
    entries = []
    total_inflow = 0.0
    total_outflow = 0.0
    async for doc in collection.find({"user_id": user_id}):
        entry = {
            "id": doc.get("id"),
            "date": doc.get("date"),
            "description": doc.get("description"),
            "category": doc.get("category"),
            "inflow": doc.get("inflow"),
            "outflow": doc.get("outflow"),
            "notes": doc.get("notes"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        }
        entries.append(entry)
        if entry["inflow"]:
            total_inflow += float(entry["inflow"])
        if entry["outflow"]:
            total_outflow += float(entry["outflow"])
    balance = total_inflow - total_outflow
    return {
        "user_id": user_id,
        "year": year,
        "month": month,
        "entries": entries,
        "total_inflow": total_inflow,
        "total_outflow": total_outflow,
        "balance": balance
    }

@router.post("/{user_id}/{year}/{month}")
async def save_ledger(user_id: str, year: int, month: int, data: dict):
    await ensure_ledger_indexes(year, month)
    collection = get_ledger_collection(user_id, year, month)
    entries = data.get("entries", [])
    saved = 0
    from datetime import datetime
    for entry in entries:
        entry_id = entry.get("id")
        doc = ledger_entry_doc(
            user_id=user_id,
            date=entry.get("date"),
            description=entry.get("description", ""),
            category=entry.get("category", "Other"),
            inflow=entry.get("inflow"),
            outflow=entry.get("outflow"),
            notes=entry.get("notes", ""),
            entry_id=entry_id,
            source=entry.get("source", "manual")
        )
        doc["updated_at"] = datetime.utcnow().isoformat()
        # Upsert by id
        await collection.update_one({"id": doc["id"]}, {"$set": doc}, upsert=True)
        saved += 1
    return {"status": "saved", "user_id": user_id, "year": year, "month": month, "entries_saved": saved, "collection": f"ledger_{year}_{month}"}

@router.delete("/{user_id}/{year}/{month}/{entry_id}")
async def delete_ledger_entry(user_id: str, year: int, month: int, entry_id: str):
    await ensure_ledger_indexes(year, month)
    collection = get_ledger_collection(user_id, year, month)
    result = await collection.delete_one({"user_id": user_id, "id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"status": "deleted", "entry_id": entry_id, "collection": f"ledger_{year}_{month}"}

@router.get("/{user_id}/months")
async def get_available_months(user_id: str):
    db = get_ledger_collection(user_id, 2000, 1).database  # get db object
    months = []
    for name in await db.list_collection_names():
        if name.startswith("ledger_"):
            parts = name.split("_")
            if len(parts) == 3:
                year, month = int(parts[1]), int(parts[2])
                col = db[name]
                count = await col.count_documents({"user_id": user_id})
                if count > 0:
                    # Optionally, compute balance for the month
                    cursor = col.find({"user_id": user_id})
                    total_inflow = 0.0
                    total_outflow = 0.0
                    async for doc in cursor:
                        if doc.get("inflow"): total_inflow += float(doc["inflow"])
                        if doc.get("outflow"): total_outflow += float(doc["outflow"])
                    balance = total_inflow - total_outflow
                    months.append({
                        "year": year,
                        "month": month,
                        "entry_count": count,
                        "balance": balance
                    })
    months.sort(key=lambda m: (m["year"], m["month"]))
    return {"user_id": user_id, "available_months": months}

@router.post("/import-from-spending-logs")
async def import_spending_logs(user_id: str):
    try:
        result = await import_spending_logs_to_ledger(user_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
