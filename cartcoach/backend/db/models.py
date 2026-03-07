"""
Part 4: SQLAlchemy ORM models.
"""

import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime, JSON
from db.database import Base


def new_id():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=new_id)
    monthly_budget = Column(Float, nullable=False)
    monthly_saved = Column(Float, default=0.0)
    goal_name = Column(String, default="Savings Goal")
    goal_target = Column(Float, default=1000.0)
    goal_current = Column(Float, default=0.0)
    goal_target_date = Column(String, nullable=True)
    watched_categories = Column(JSON, default=list)
    cooldown_hours = Column(Integer, default=48)
    created_at = Column(DateTime, default=datetime.utcnow)


class SpendingLog(Base):
    __tablename__ = "spending_logs"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, default="Other")
    site = Column(String, default="")
    action = Column(String, nullable=False)  # purchased|skipped|saved_later|cooldown
    risk_score = Column(Integer, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class WishlistItem(Base):
    __tablename__ = "wishlist"

    id = Column(String, primary_key=True, default=new_id)
    user_id = Column(String, nullable=False, index=True)
    product_name = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, default="Other")
    site = Column(String, default="")
    analysis_json = Column(JSON, nullable=True)
    saved_at = Column(DateTime, default=datetime.utcnow)
    remind_at = Column(DateTime, nullable=True)
