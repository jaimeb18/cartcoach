// Shared types used by both the extension and backend

export interface UserProfile {
  id: string;
  monthlyBudget: number;
  monthlySaved: number;
  savingsGoal: SavingsGoal;
  watchedCategories: string[];
  cooldownHours: number;
}

export interface SavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

export interface ExtractedProduct {
  site: string;
  productName: string;
  price: number;
  category: string;
  timestamp: string;
  userId?: string;
}

export interface FinanceAnalysis {
  showPopup: boolean;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High";
  budgetImpact: string;
  remainingBudget: number;
  goalDelayDays: number;
  futureValue5y: number;
  recommendation: string;
  message: string;
  alternatives: Alternative[];
}

export interface Alternative {
  name: string;
  price: number;
  url?: string;
  source?: string;
}

export interface WishlistItem {
  id: string;
  userId: string;
  product: ExtractedProduct;
  savedAt: string;
  remindAt?: string;
  analysis: FinanceAnalysis;
}

export interface SpendingHistory {
  id: string;
  userId: string;
  product: ExtractedProduct;
  action: "purchased" | "skipped" | "saved_later" | "cooldown";
  timestamp: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  inflow: number | null;
  outflow: number | null;
  notes: string;
  created_at?: string;
  updated_at?: string;
  sync_status?: string;
  source?: string;
}

export interface LedgerMonth {
  year: number;
  month: number;
  entry_count: number;
  balance: number;
}

// Chrome extension message types
export type MessageType =
  | { type: "PRODUCT_DETECTED"; payload: ExtractedProduct }
  | { type: "GET_USER_PROFILE" }
  | { type: "SAVE_USER_PROFILE"; payload: UserProfile }
  | { type: "LOG_ACTION"; payload: Omit<SpendingHistory, "id" | "timestamp"> }
  | { type: "GET_WISHLIST" }
  | { type: "ADD_TO_WISHLIST"; payload: WishlistItem }
  | { type: "ANALYSIS_RESULT"; payload: FinanceAnalysis };