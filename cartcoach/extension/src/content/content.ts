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

  const profile = await getUserProfile();
  if (!profile) return;

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

// Boot
waitForCheckout(() => {
  interventionShown = false;
  triggerIntervention();
});

// Reset flag on page unload so next visit works
window.addEventListener("beforeunload", () => {
  interventionShown = false;
});
