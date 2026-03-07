export const API_BASE_URL = "http://localhost:8000";

export const RISK_THRESHOLDS = {
  LOW: 33,
  MEDIUM: 66,
} as const;

export const RISK_COLORS = {
  Low: "#22c55e",
  Medium: "#f59e0b",
  High: "#ef4444",
} as const;

export const DEFAULT_ANNUAL_RETURN = 0.07;

export const SUPPORTED_SITES = [
  "amazon.com",
  "target.com",
  "sephora.com",
  "bestbuy.com",
  "walmart.com",
  "etsy.com",
  "ebay.com",
] as const;

export const CHECKOUT_URL_PATTERNS = [
  /\/checkout/i,
  /\/cart/i,
  /\/basket/i,
  /\/bag/i,
  /\/order\/review/i,
  /\/purchase/i,
];

export const PRODUCT_CATEGORIES = [
  "Electronics",
  "Fashion",
  "Beauty",
  "Home",
  "Sports",
  "Books",
  "Food",
  "Entertainment",
  "Other",
] as const;

export const COOLDOWN_OPTIONS = [
  { label: "24 hours", hours: 24 },
  { label: "48 hours", hours: 48 },
  { label: "1 week", hours: 168 },
  { label: "Until payday", hours: -1 },
];

export const STORAGE_KEYS = {
  USER_PROFILE: "cartcoach_user_profile",
  WISHLIST: "cartcoach_wishlist",
  SPENDING_HISTORY: "cartcoach_spending_history",
  ONBOARDED: "cartcoach_onboarded",
} as const;