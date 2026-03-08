import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import InterventionModal from "../components/InterventionModal";
import type { ExtractedProduct, FinanceAnalysis } from "@shared/types";
import "../styles/global.css";

interface ModalData {
  product: ExtractedProduct;
  analysis: FinanceAnalysis;
}

function ModalApp() {
  const [data, setData] = useState<ModalData | null>(null);

  useEffect(() => {
    // Listen for data from the content script
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "CARTCOACH_INIT") {
        setData(event.data.payload);
      }
    };
    window.addEventListener("message", handler);

    // Tell the parent we're ready
    window.parent.postMessage({ type: "CARTCOACH_READY" }, "*");

    return () => window.removeEventListener("message", handler);
  }, []);

  const sendAction = (action: string, payload?: unknown) => {
    window.parent.postMessage({ type: "CARTCOACH_ACTION", action, payload }, "*");
  };

  if (!data) {
    return null;
  }

  return (
    <InterventionModal
      product={data.product}
      analysis={data.analysis}
      onBuy={() => sendAction("buy")}
      onSkip={() => sendAction("skip")}
      onSaveLater={() => sendAction("save_later")}
      onCooldown={(hours) => sendAction("cooldown", { hours })}
      onClose={() => sendAction("close")}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ModalApp />
  </React.StrictMode>
);
