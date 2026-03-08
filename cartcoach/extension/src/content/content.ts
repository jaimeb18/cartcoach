import "../styles/global.css";
import { getCurrentSite, waitForCheckout } from "./detector";
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

function showDebugDot(label: string, color: string) {
  const existing = document.getElementById("cartcoach-debug-dot");
  if (existing) existing.remove();
  const dot = document.createElement("div");
  dot.id = "cartcoach-debug-dot";
  dot.textContent = label;
  dot.style.cssText = `position:fixed;top:12px;left:12px;z-index:99999;background:${color};color:white;font-size:12px;padding:6px 10px;border-radius:999px;font-family:monospace;`;
  document.body.appendChild(dot);
}

async function triggerIntervention() {
  if (interventionShown) return;

  showDebugDot("1: triggerIntervention fired", "red");

  const site = getCurrentSite();
  if (!site) { showDebugDot("2: no site matched", "orange"); return; }

  // Wait a bit for the page to fully render
  await new Promise((r) => setTimeout(r, 1200));

  const productInfo = extractProductInfo(site);
  if (!productInfo?.productName || !productInfo?.price) { showDebugDot("3: product extract failed", "orange"); return; }

  showDebugDot("4: product found - " + productInfo.productName, "blue");

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

  // Debug dot: show alternatives count
  const altDot = document.createElement("div");
  altDot.id = "cartcoach-alt-dot";
  altDot.textContent = `alts: ${analysis.alternatives?.length ?? 0}`;
  altDot.style.cssText = `position:fixed;top:12px;left:12px;z-index:99999;background:purple;color:white;font-size:12px;padding:6px 10px;border-radius:999px;font-family:monospace;`;
  document.getElementById("cartcoach-alt-dot")?.remove();
  document.body.appendChild(altDot);

  if (!analysis.showPopup) { showDebugDot("5: showPopup=false, riskScore=" + analysis.riskScore, "orange"); return; }

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

// Boot
waitForCheckout(() => {
  interventionShown = false;
  triggerIntervention();
});

// Reset flag on page unload so next visit works
window.addEventListener("beforeunload", () => {
  interventionShown = false;
});
