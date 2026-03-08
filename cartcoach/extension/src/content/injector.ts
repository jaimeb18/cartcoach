import type { ExtractedProduct, FinanceAnalysis } from "@shared/types";

const IFRAME_ID = "cartcoach-iframe-root";

let pendingCallbacks: {
  onBuy: () => void;
  onSkip: () => void;
  onSaveLater: () => void;
  onCooldown: (hours: number) => void;
} | null = null;

// Listen for actions sent back from the iframe
window.addEventListener("message", (event) => {
  if (event.data?.type === "CARTCOACH_ACTION" && pendingCallbacks) {
    const { action, payload } = event.data;
    if (action === "buy") pendingCallbacks.onBuy();
    else if (action === "skip") pendingCallbacks.onSkip();
    else if (action === "save_later") pendingCallbacks.onSaveLater();
    else if (action === "cooldown") pendingCallbacks.onCooldown(payload?.hours ?? 48);
    else if (action === "close") removeModal();
    if (action !== "close") removeModal();
  }
});

export function injectModal(
  product: ExtractedProduct,
  analysis: FinanceAnalysis,
  onBuy: () => void,
  onSkip: () => void,
  onSaveLater: () => void,
  onCooldown: (hours: number) => void
) {
  removeModal();

  pendingCallbacks = { onBuy, onSkip, onSaveLater, onCooldown };

  // Create a wrapper div so we can apply fixed positioning
  const wrapper = document.createElement("div");
  wrapper.id = IFRAME_ID;
  wrapper.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 400px;
    max-height: 90vh;
    z-index: 2147483647;
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    overflow: hidden;
    border: none;
  `;

  const iframe = document.createElement("iframe");
  iframe.src = chrome.runtime.getURL("modal/index.html");
  iframe.style.cssText = `
    width: 100%;
    height: 600px;
    border: none;
    border-radius: 16px;
    background: transparent;
  `;
  iframe.allow = "same-origin";

  // Once iframe is ready, send it the data
  const readyHandler = (event: MessageEvent) => {
    if (event.data?.type === "CARTCOACH_READY") {
      iframe.contentWindow?.postMessage(
        { type: "CARTCOACH_INIT", payload: { product, analysis } },
        "*"
      );
      window.removeEventListener("message", readyHandler);
    }
  };
  window.addEventListener("message", readyHandler);

  wrapper.appendChild(iframe);
  document.body.appendChild(wrapper);
}

export function removeModal() {
  const wrapper = document.getElementById(IFRAME_ID);
  if (wrapper) wrapper.remove();
  pendingCallbacks = null;
}
