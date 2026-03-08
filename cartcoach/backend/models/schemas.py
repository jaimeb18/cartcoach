from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class RiskLevel(str, Enum):
    low = "Low"
    medium = "Medium"
    high = "High"


class ToneMode(str, Enum):
    gentle = "gentle"
    direct = "direct"
    best_friend = "best_friend"
    professional = "professional"


class SavingsGoal(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    target_date: Optional[str] = None


class UserProfile(BaseModel):
    id: str
    monthly_budget: float
    monthly_saved: float = 0.0
    savings_goal: SavingsGoal
    watched_categories: List[str] = []
    cooldown_hours: int = 48
    tone_mode: ToneMode = ToneMode.gentle


class ExtractedProduct(BaseModel):
    site: str
    product_name: str
    price: float
    category: str = "Other"
    timestamp: str
    user_id: Optional[str] = None


class Alternative(BaseModel):
    name: str
    price: float
    url: Optional[str] = None
    source: Optional[str] = None


class InvestmentOption(BaseModel):
    vehicle: str
    label: str
    rate_pct: float
    future_value: float
    gain: float
    years: int


class FinanceAnalysis(BaseModel):
    show_popup: bool
    risk_score: int = Field(ge=0, le=100)
    risk_level: RiskLevel
    budget_impact: str
    remaining_budget: float
    goal_delay_days: int
    future_value_5y: float
    investment_breakdown: List[InvestmentOption] = []
    recommendation: str
    message: str
    alternatives: List[Alternative] = []


class IntentClassification(BaseModel):
    intent: str  # need | want | impulse | emergency | gift | duplicate
    confidence: str  # high | medium | low
    explanation: str


class WeeklySummary(BaseModel):
    week_start: str
    total_spent: float
    purchases_made: int
    purchases_skipped: int
    amount_saved: float
    top_category: str
    insight: str


class ChatRequest(BaseModel):
    question: str
    product: Optional[ExtractedProduct] = None
    profile: UserProfile


class ChatResponse(BaseModel):
    answer: str


class AnalyzeRequest(BaseModel):
    product: ExtractedProduct
    profile: UserProfile


class UserCreateRequest(BaseModel):
    monthly_budget: float
    savings_goal: SavingsGoal
    watched_categories: List[str] = []
    cooldown_hours: int = 48
    tone_mode: ToneMode = ToneMode.gentle


class WishlistItemCreate(BaseModel):
    user_id: str
    product: ExtractedProduct
    analysis: FinanceAnalysis
    remind_at: Optional[str] = None


class SpendingLogCreate(BaseModel):
    user_id: str
    product: ExtractedProduct
    action: str  # purchased | skipped | saved_later | cooldown
