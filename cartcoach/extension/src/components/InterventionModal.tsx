import React, { useState } from "react";
import RiskWarning from "./RiskWarning";
import AlternativeCard from "./AlternativeCard";
import CooldownButton from "./CooldownButton";
import type { FinanceAnalysis, ExtractedProduct } from "@shared/types";
import mochiImg from "./mochi.png";

interface Props {
  product: ExtractedProduct;
  analysis: FinanceAnalysis;
  onBuy: () => void;
  onSkip: () => void;
  onSaveLater: () => void;
  onCooldown: (hours: number) => void;
  onClose: () => void;
}

export default function InterventionModal({
  product,
  analysis,
  onBuy,
  onSkip,
  onSaveLater,
  onCooldown,
  onClose,
}: Props) {
  const [showAlts, setShowAlts] = useState(false);
  const [showSkipFollowUp, setShowSkipFollowUp] = useState(false);

  if (showSkipFollowUp) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-3xl shadow-2xl animate-slide-up flex flex-col items-center"
          style={{ width: "420px", maxWidth: "95vw", padding: "32px 28px", gap: 20 }}
        >
          <img src={mochiImg} alt="Mochi" style={{ width: 100, height: 100, objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(232,160,188,0.4))" }} />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 18, color: "#c0506a", margin: "0 0 6px" }}>nice choice! 🎉</p>
            <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
              what are you doing with the <span style={{ fontWeight: 700, color: "#374151" }}>${product.price}</span> you saved?
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
            <button
              onClick={onSaveLater}
              style={{ background: "#e8a0bc", color: "#fff", fontWeight: 700, padding: "13px 0", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 14, width: "100%" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#d4789e")}
              onMouseLeave={e => (e.currentTarget.style.background = "#e8a0bc")}
            >
              putting it into savings 🐷
            </button>
            <button
              onClick={onSkip}
              style={{ background: "#fdf2f8", color: "#c0506a", fontWeight: 700, padding: "13px 0", borderRadius: 14, border: "1.5px solid #f9c8d8", cursor: "pointer", fontSize: 14, width: "100%" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#fce7f3")}
              onMouseLeave={e => (e.currentTarget.style.background = "#fdf2f8")}
            >
              spending it elsewhere
            </button>
          </div>
          <p style={{ fontSize: 10, color: "#d1d5db", margin: 0 }}>Educational estimate only · Not financial advice</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl animate-slide-up flex flex-col"
        style={{ width: "620px", maxWidth: "95vw", maxHeight: "90vh" }}
      >
        {/* Mochi mascot banner */}
        <div
          className="flex items-end gap-0 px-6 pt-4 pb-0 relative shrink-0"
          style={{ background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)", borderBottom: "1.5px solid #f9c8d8", borderRadius: "24px 24px 0 0" }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{ position: "absolute", top: 12, right: 16, color: "#9ca3af", background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
          >
            ✕
          </button>

          {/* Mochi image — big and prominent */}
          <img
            src={mochiImg}
            alt="Mochi"
            style={{ width: 160, height: 160, objectFit: "contain", flexShrink: 0, marginBottom: 0, filter: "drop-shadow(0 6px 16px rgba(232,160,188,0.5))" }}
          />

          {/* Speech bubble + product info */}
          <div style={{ flex: 1, paddingBottom: 20, paddingLeft: 8 }}>
            {/* Speech bubble */}
            <div style={{ position: "relative", background: "#fff", border: "2.5px solid #f9c8d8", borderRadius: 20, padding: "12px 16px" }}>
              <p style={{ fontWeight: 800, fontSize: 20, color: "#c0506a", margin: 0, lineHeight: 1.2 }}>
                wait... hold on! 🛑
              </p>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "6px 0 10px", lineHeight: 1.4 }}>
                you're about to buy:
              </p>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#374151", margin: "0 0 4px", lineHeight: 1.3 }}>
                {product.productName}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{product.site}</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>${product.price}</p>
              </div>
              {/* Bubble tail pointing left toward mochi */}
              <div style={{
                position: "absolute", left: -13, top: 24,
                width: 0, height: 0,
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                borderRight: "13px solid #f9c8d8",
              }} />
              <div style={{
                position: "absolute", left: -9, top: 25,
                width: 0, height: 0,
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                borderRight: "11px solid #fff",
              }} />
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <div className="p-5 space-y-4">
            {/* Risk warning */}
            <RiskWarning
              riskLevel={analysis.riskLevel}
              riskScore={analysis.riskScore}
              message={analysis.message}
            />

            {/* Impact stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, width: "100%", textAlign: "center" }}>
              <div style={{ background: "#fdf2f8", borderRadius: 14, padding: "10px 8px" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Budget impact</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginTop: 4 }}>{analysis.budgetImpact}</p>
              </div>
              <div style={{ background: "#fdf2f8", borderRadius: 14, padding: "10px 8px" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>Goal delay</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginTop: 4 }}>
                  {analysis.goalDelayDays > 0 ? `+${analysis.goalDelayDays}d` : "None"}
                </p>
              </div>
              <div style={{ background: "#fdf2f8", borderRadius: 14, padding: "10px 8px" }}>
                <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>In 5 years</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginTop: 4 }}>${analysis.futureValue5y.toFixed(0)}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div style={{ background: "#fdf2f8", border: "1.5px solid #f9c8d8", borderRadius: 14, padding: "10px 14px", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "#c0506a", fontWeight: 600, margin: 0 }}>💡 {analysis.recommendation}</p>
            </div>

            {/* Alternatives */}
            {analysis.alternatives.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAlts((s) => !s)}
                  style={{ fontSize: 12, color: "#c0506a", fontWeight: 600, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0 }}
                >
                  {showAlts ? "▲" : "▼"} {showAlts ? "Hide" : "Show"} cheaper alternatives ({analysis.alternatives.length})
                </button>
                {showAlts && (
                  <div className="mt-2 space-y-2">
                    {analysis.alternatives.map((alt, i) => (
                      <AlternativeCard key={i} alternative={alt} originalPrice={product.price} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>
                <button
                  onClick={() => setShowSkipFollowUp(true)}
                  style={{ background: "#e8a0bc", color: "#fff", fontWeight: 700, padding: "11px 0", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 14, width: "100%" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#d4789e")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#e8a0bc")}
                >
                  Skip it 🎯
                </button>
                <button
                  onClick={onSaveLater}
                  style={{ background: "#fdf2f8", color: "#c0506a", fontWeight: 700, padding: "11px 0", borderRadius: 14, border: "1.5px solid #f9c8d8", cursor: "pointer", fontSize: 14, width: "100%" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fce7f3")}
                  onMouseLeave={e => (e.currentTarget.style.background = "#fdf2f8")}
                >
                  Wishlist
                </button>
              </div>
              <button
                onClick={onBuy}
                style={{ width: "100%", background: "#f3f4f6", color: "#6b7280", fontWeight: 600, padding: "11px 0", borderRadius: 14, border: "none", cursor: "pointer", fontSize: 14 }}
                onMouseEnter={e => (e.currentTarget.style.background = "#e5e7eb")}
                onMouseLeave={e => (e.currentTarget.style.background = "#f3f4f6")}
              >
                Buy anyway
              </button>
            </div>
          </div>

          <div className="px-5 pb-4 text-center">
            <p style={{ fontSize: 10, color: "#d1d5db", margin: 0 }}>Educational estimate only · Not financial advice</p>
          </div>
        </div>
      </div>
    </div>
  );
}
