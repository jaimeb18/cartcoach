from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.database import connect_db, close_db
from api.routers import users, finance, alternatives, wishlist, insights, ledger


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()


app = FastAPI(
    title="CartCoach API",
    description="Real-time financial nudges at checkout.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(finance.router, prefix="/api", tags=["finance"])
app.include_router(alternatives.router, prefix="/api/alternatives", tags=["alternatives"])
app.include_router(wishlist.router, prefix="/api/wishlist", tags=["wishlist"])
app.include_router(insights.router, prefix="/api/insights", tags=["insights"])
app.include_router(ledger.router, prefix="/api/ledger", tags=["ledger"])


@app.get("/health")
async def health():
    from db.database import get_db
    try:
        await get_db().command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "unreachable"
    return {"status": "ok", "service": "CartCoach API", "mongodb": mongo_status}
