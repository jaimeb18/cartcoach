import { CHECKOUT_URL_PATTERNS, SUPPORTED_SITES } from "@shared/constants";

export function isCheckoutPage(): boolean {
  const url = window.location.href;
  // Treat demo page as checkout
  if (url.includes("checkout.html") || url.includes("localhost")) return true;
  return CHECKOUT_URL_PATTERNS.some((pattern) => pattern.test(url));
}

export function getCurrentSite(): string | null {
  const hostname = window.location.hostname.replace("www.", "");
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "") {
    return "localhost";
  }
  for (const site of SUPPORTED_SITES) {
    if (hostname.includes(site)) return site;
  }
  return null;
}

export function waitForCheckout(callback: () => void): void {
  // Run immediately if already on checkout
  if (isCheckoutPage()) {
    callback();
    return;
  }

  // Watch for SPA navigation
  let lastUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      if (isCheckoutPage()) {
        callback();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
