import React from "react";
import ReactDOM from "react-dom/client";
import InterventionModal from "../components/InterventionModal";
import type { ExtractedProduct, FinanceAnalysis } from "@shared/types";

const MODAL_ROOT_ID = "cartcoach-modal-root";

let modalRoot: ReactDOM.Root | null = null;

export function injectModal(
  product: ExtractedProduct,
  analysis: FinanceAnalysis,
  onBuy: () => void,
  onSkip: () => void,
  onSaveLater: () => void,
  onCooldown: (hours: number) => void
) {
  removeModal();

  const container = document.createElement("div");
  container.id = MODAL_ROOT_ID;
  document.body.appendChild(container);

  modalRoot = ReactDOM.createRoot(container);
  modalRoot.render(
    React.createElement(InterventionModal, {
      product,
      analysis,
      onBuy: () => { onBuy(); removeModal(); },
      onSkip: () => { onSkip(); removeModal(); },
      onSaveLater: () => { onSaveLater(); removeModal(); },
      onCooldown: (hours) => { onCooldown(hours); removeModal(); },
      onClose: removeModal,
    })
  );
}

export function removeModal() {
  const container = document.getElementById(MODAL_ROOT_ID);
  if (container) {
    modalRoot?.unmount();
    modalRoot = null;
    container.remove();
  }
}
