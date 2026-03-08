import React, { useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { STORAGE_KEYS } from "@shared/constants";
import type { UserProfile, SpendingHistory } from "@shared/types";

const ACTION_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  skipped:     { bg: "#ecfdf5", text: "#059669", label: "skipped" },
  purchased:   { bg: "#fef2f2", text: "#dc2626", label: "purchased" },
  saved_later: { bg: "#fdf2f8", text: "#c0506a", label: "saved" },
  cooldown:    { bg: "#fdf2f8", text: "#c0506a", label: "cooldown" },
};

export default function Popup() {
  const { getValue } = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<SpendingHistory[]>([]);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    getValue<boolean>(STORAGE_KEYS.ONBOARDED).then((v) => {
      if (!v) {
        setOnboarded(false);
        chrome.tabs.create({ url: chrome.runtime.getURL("onboarding/index.html") });
      }
    });
    getValue<UserProfile>(STORAGE_KEYS.USER_PROFILE).then((p) => p && setProfile(p));
    getValue<SpendingHistory[]>(STORAGE_KEYS.SPENDING_HISTORY).then((h) => h && setHistory(h.slice(-10).reverse()));
  }, []);

  const openDashboard = () => chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
  const openSettings = () => chrome.runtime.openOptionsPage();

  const now = new Date();
  const monthlySpent = history
    .filter((h) => {
      const d = new Date(h.timestamp);
      return h.action === "purchased" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, h) => sum + h.product.price, 0);

  const totalSaved = history
    .filter((h) => h.action === "saved_later")
    .reduce((sum, h) => sum + h.product.price, 0);

  const avoidedCount = history.filter((h) => h.action === "skipped" || h.action === "saved_later").length;

  if (!onboarded) {
    return (
      <div style={{ width: 320, padding: 24, textAlign: "center", backgroundColor: "#fef9ee", fontFamily: "monospace" }}>
        <p style={{ color: "#c0808a", fontSize: 13 }}>Opening setup...</p>
      </div>
    );
  }

  return (
    <div style={{ width: 320, backgroundColor: "#fef9ee", fontFamily: "monospace" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #560700 0%, #8b1a1a 60%, #7a1040 100%)", padding: "16px 18px" }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: "#e8a0bc", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 2px" }}>CartCoach</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: 0 }}>your spending coach</p>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#fff", border: "2px solid #fde8c8", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#560700", margin: 0 }}>{avoidedCount}</p>
            <p style={{ fontSize: 10, color: "#c0808a", margin: "2px 0 0" }}>purchases avoided</p>
          </div>
          <div style={{ background: "#fff", border: "2px solid #fde8c8", borderRadius: 14, padding: "10px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#560700", margin: 0 }}>${totalSaved.toFixed(0)}</p>
            <p style={{ fontSize: 10, color: "#c0808a", margin: "2px 0 0" }}>saved to savings</p>
          </div>
        </div>

        {/* Budget bar */}
        {profile && (() => {
          const pct = Math.min(100, (monthlySpent / profile.monthlyBudget) * 100);
          const remaining = profile.monthlyBudget - monthlySpent;
          const barColor = pct < 50 ? "#e8a0bc" : pct < 80 ? "#f59e0b" : "#ef4444";
          return (
            <div style={{ background: "#fff", border: "2px solid #fde8c8", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#e8a0bc", textTransform: "uppercase", letterSpacing: "0.15em", margin: 0 }}>Monthly Budget</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#560700", margin: 0 }}>${remaining.toFixed(0)} <span style={{ fontSize: 11, fontWeight: 400, color: "#c0808a" }}>left</span></p>
              </div>
              <div style={{ background: "#fef3c7", borderRadius: 99, height: 7, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: 99 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                <span style={{ fontSize: 10, color: "#c0808a" }}>${monthlySpent.toFixed(0)} spent</span>
                <span style={{ fontSize: 10, color: "#c0808a" }}>${profile.monthlyBudget.toLocaleString()} total</span>
              </div>
            </div>
          );
        })()}

        {/* Recent activity */}
        {history.length > 0 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#c0808a", textTransform: "uppercase", letterSpacing: "0.15em", margin: "0 0 8px" }}>Recent Activity</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {history.slice(0, 3).map((item) => {
                const cfg = ACTION_CONFIG[item.action] ?? ACTION_CONFIG["skipped"];
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1.5px solid #fde8c8", borderRadius: 10, padding: "7px 10px" }}>
                    <span style={{ fontSize: 12, color: "#560700", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                      {item.product.productName}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, backgroundColor: cfg.bg, color: cfg.text, flexShrink: 0, marginLeft: 6 }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={openDashboard}
            style={{ background: "#560700", color: "#fff", fontWeight: 700, fontSize: 13, padding: "9px 0", borderRadius: 12, border: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#7a1040")}
            onMouseLeave={e => (e.currentTarget.style.background = "#560700")}
          >
            Dashboard
          </button>
          <button
            onClick={openSettings}
            style={{ background: "#fdf2f8", color: "#c0506a", fontWeight: 700, fontSize: 13, padding: "9px 0", borderRadius: 12, border: "1.5px solid #f9c8d8", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#fce7f3")}
            onMouseLeave={e => (e.currentTarget.style.background = "#fdf2f8")}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
