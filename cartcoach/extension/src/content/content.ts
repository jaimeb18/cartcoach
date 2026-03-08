import "../styles/global.css";
import { isCheckoutPage, getCurrentSite, waitForCheckout } from "./detector";
import { extractProductInfo } from "./extractor";
import { injectModal } from "./injector";
import { STORAGE_KEYS } from "@shared/constants";
import type { ExtractedProduct, FinanceAnalysis, UserProfile, SpendingHistory, WishlistItem } from "@shared/types";

let interventionShown = false;

async function getUserProfile(): Promise<UserProfile | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.USER_PROFILE, (result) => {
      resolve(result[STORAGE_KEYS.USER_PROFILE] ?? null);
    });
  });
}

async function requestAnalysis(
  product: ExtractedProduct,
  profile: UserProfile
): Promise<FinanceAnalysis> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "PRODUCT_DETECTED", payload: { product, profile } },
      (response: FinanceAnalysis) => {
        resolve(response);
      }
    );
  });
}

async function logAction(
  product: ExtractedProduct,
  action: SpendingHistory["action"]
) {
  const existing = await new Promise<SpendingHistory[]>((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.SPENDING_HISTORY, (r) => {
      resolve(r[STORAGE_KEYS.SPENDING_HISTORY] ?? []);
    });
  });

  const entry: SpendingHistory = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    userId: "local",
    product,
    action,
    timestamp: new Date().toISOString(),
  };

  chrome.storage.local.set({
    [STORAGE_KEYS.SPENDING_HISTORY]: [...existing, entry],
  });
}

async function saveToWishlist(product: ExtractedProduct, analysis: FinanceAnalysis) {
  const existing = await new Promise<WishlistItem[]>((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.WISHLIST, (r) => {
      resolve(r[STORAGE_KEYS.WISHLIST] ?? []);
    });
  });

  const item: WishlistItem = {
    id: `${Date.now()}`,
    userId: "local",
    product,
    savedAt: new Date().toISOString(),
    analysis,
  };

  chrome.storage.local.set({
    [STORAGE_KEYS.WISHLIST]: [...existing, item],
  });
}

async function triggerIntervention() {
  if (interventionShown) return;

  const site = getCurrentSite();
  if (!site) return;

  // Wait a bit for the page to fully render
  await new Promise((r) => setTimeout(r, 1200));

  const productInfo = extractProductInfo(site);
  if (!productInfo?.productName || !productInfo?.price) return;

  const profile = await getUserProfile() ?? {
    id: "demo-user",
    monthlyBudget: 1000,
    monthlySaved: 200,
    savingsGoal: { name: "Emergency Fund", targetAmount: 5000, currentAmount: 1000 },
    watchedCategories: ["Fashion", "Electronics", "Beauty"],
    cooldownHours: 48,
  };

  const product: ExtractedProduct = {
    site,
    productName: productInfo.productName,
    price: productInfo.price,
    category: productInfo.category ?? "Other",
    timestamp: new Date().toISOString(),
    userId: profile.id,
  };

  const analysis = await requestAnalysis(product, profile);

  if (!analysis.showPopup) return;

  interventionShown = true;

  injectModal(
    product,
    analysis,
    () => logAction(product, "purchased"),
    () => logAction(product, "skipped"),
    () => {
      logAction(product, "saved_later");
      saveToWishlist(product, analysis);
    },
    (hours) => {
      logAction(product, "cooldown");
      chrome.runtime.sendMessage({
        type: "SET_COOLDOWN_REMINDER",
        payload: { product, hours },
      });
    }
  );
}

// Checkout button selectors to intercept
const CHECKOUT_BTN_SELECTORS = [
  "#checkoutBtn",                          // Demo page
  "[name='placeYourOrder1']",              // Amazon
  "button[data-test='placeOrderButton']",  // Target
  "#orderSummary button",                  // Walmart
  ".btn-checkout",                         // Generic
  "button[type='submit'][class*='checkout']",
  "button[class*='place-order']",
  "button[class*='placeOrder']",
  "input[type='submit'][value*='order']",
];

function attachCheckoutListeners() {
  for (const selector of CHECKOUT_BTN_SELECTORS) {
    const buttons = document.querySelectorAll<HTMLElement>(selector);
    buttons.forEach((btn) => {
      if (btn.dataset.cartcoachBound) return;
      btn.dataset.cartcoachBound = "true";
      btn.addEventListener("click", (e) => {
        if (!interventionShown) {
          e.preventDefault();
          e.stopPropagation();
          triggerIntervention();
        }
      }, true);
    });
  }
}

// Boot — attach listeners when on a checkout page
waitForCheckout(() => {
  interventionShown = false;
  setTimeout(attachCheckoutListeners, 800);

  const observer = new MutationObserver(() => attachCheckoutListeners());
  observer.observe(document.body, { childList: true, subtree: true });
});

// Reset flag on page unload so next visit works
window.addEventListener("beforeunload", () => {
  interventionShown = false;
});
