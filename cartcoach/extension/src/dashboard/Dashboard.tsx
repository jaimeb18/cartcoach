import { useEffect, useRef, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import BudgetCard from "../components/BudgetCard";
import GoalProgress from "../components/GoalProgress";
import LedgerTable from "../components/LedgerTable";
import { STORAGE_KEYS } from "@shared/constants";
import type { UserProfile, SpendingHistory, WishlistItem } from "@shared/types";
import boxClosed from "./box-closed.png";
import boxOpen from "./box-open.png";
import { getOrCreateUserId } from "../shared/userId";

type Tab = "overview" | "history" | "wishlist" | "insights" | "ledger";

const SASE_COLORS = ["#e8a0bc", "#f59e0b", "#60a5fa", "#34d399", "#f97316", "#a78bfa"];
const ACCENT_BORDERS = ["#e8a0bc", "#f59e0b", "#60a5fa", "#34d399", "#f97316", "#a78bfa"];

const ACTION_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  skipped:     { label: "Skipped",   dot: "#34d399", bg: "#ecfdf5", text: "#059669" },
  purchased:   { label: "Purchased", dot: "#ef4444", bg: "#fef2f2", text: "#dc2626" },
  saved_later: { label: "Saved",     dot: "#f59e0b", bg: "#fffbeb", text: "#d97706" },
  cooldown:    { label: "Cooldown",  dot: "#e8a0bc", bg: "#fdf2f8", text: "#c0506a" },
};

const PROJECTION_YEARS = [0, 1, 3, 5, 10, 20] as const;
const CHART_W = 360;
const CHART_H = 100;
const CHART_TOP_PAD = 18;
const BAR_W = 36;

const NAV_ITEMS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "wishlist",
    label: "Wishlist",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "insights",
    label: "Insights",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "ledger",
    label: "Ledger",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="9" x2="9" y2="21" />
      </svg>
    ),
  },
] as { id: Tab; label: string; icon: JSX.Element }[];

export default function Dashboard() {
  const { getValue, setValue } = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<SpendingHistory[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: "bot" | "user"; text: string }[]>([
    { role: "bot", text: "psst... i saw ur cart. wanna talk about it?" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const userId = getOrCreateUserId();

  useEffect(() => {
    getValue<UserProfile>(STORAGE_KEYS.USER_PROFILE).then((p) => p && setProfile(p));
    getValue<SpendingHistory[]>(STORAGE_KEYS.SPENDING_HISTORY).then((h) =>
      h && setHistory(h.reverse())
    );
    getValue<WishlistItem[]>(STORAGE_KEYS.WISHLIST).then((w) => w && setWishlist(w));
  }, []);

  const deleteHistory = async (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    await setValue(STORAGE_KEYS.SPENDING_HISTORY, [...updated].reverse());
  };

  const deleteWishlist = async (id: string) => {
    const updated = wishlist.filter((w) => w.id !== id);
    setWishlist(updated);
    await setValue(STORAGE_KEYS.WISHLIST, updated);
  };

  const totalSaved = history
    .filter((h) => h.action === "saved_later")
    .reduce((sum, h) => sum + h.product.price, 0);

  const avoidedCount = history.filter((h) => h.action === "skipped" || h.action === "saved_later").length;
  const futureValueTotal = totalSaved * Math.pow(1.07, 5);

  const now = new Date();
  const monthlySpent = history
    .filter((h) => {
      const d = new Date(h.timestamp);
      return h.action === "purchased" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, h) => sum + h.product.price, 0);

  const categoryData = Object.entries(
    history.reduce<Record<string, number>>((acc, h) => {
      const cat = h.product.category;
      acc[cat] = (acc[cat] || 0) + h.product.price;
      return acc;
    }, {})
  ).sort(([, a], [, b]) => b - a).slice(0, 6);
  const maxAmount = Math.max(...categoryData.map(([, v]) => v), 1);

  const projectionData = PROJECTION_YEARS.map((y) => ({
    label: y === 0 ? "Now" : `${y}yr`,
    value: totalSaved * Math.pow(1.07, y),
  }));
  const maxProjection = Math.max(...projectionData.map((d) => d.value), 1);
  const slotW = CHART_W / projectionData.length;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatSending]);

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatSending) return;
    setChatMessages((m) => [...m, { role: "user", text: q }]);
    setChatInput("");
    setChatSending(true);
    try {
      const apiProfile = profile
        ? {
            id: profile.id,
            monthly_budget: profile.monthlyBudget,
            monthly_saved: profile.monthlySaved,
            savings_goal: {
              name: profile.savingsGoal.name,
              target_amount: profile.savingsGoal.targetAmount,
              current_amount: profile.savingsGoal.currentAmount,
            },
            watched_categories: profile.watchedCategories,
            cooldown_hours: profile.cooldownHours,
            tone_mode: "gentle",
          }
        : {
            id: "guest",
            monthly_budget: 1000,
            monthly_saved: 0,
            savings_goal: { name: "Savings Goal", target_amount: 5000, current_amount: 0 },
            watched_categories: [],
            cooldown_hours: 48,
            tone_mode: "gentle",
          };
      const res = await fetch("http://127.0.0.1:8000/api/insights/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, product: null, profile: apiProfile }),
      });
      const data = await res.json();
      setChatMessages((m) => [...m, { role: "bot", text: data.answer }]);
    } catch {
      setChatMessages((m) => [...m, { role: "bot", text: "can't connect to the server right now. try again shortly!" }]);
    } finally {
      setChatSending(false);
    }
  };

  const monthlyRows = Object.entries(
    history.reduce<Record<string, { avoided: number; spent: number; skipped: number; purchased: number }>>((acc, h) => {
      const key = new Date(h.timestamp).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!acc[key]) acc[key] = { avoided: 0, spent: 0, skipped: 0, purchased: 0 };
      if (h.action === "skipped" || h.action === "saved_later") { acc[key].avoided += h.product.price; acc[key].skipped++; }
      else if (h.action === "purchased") { acc[key].spent += h.product.price; acc[key].purchased++; }
      return acc;
    }, {})
  ).reverse();

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#fef9ee", fontFamily: "monospace" }}>

      {/* ── Left sidebar ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-20 flex flex-col items-center py-5 gap-1"
        style={{ width: 64, backgroundColor: "#fff9f0", borderRight: "2px solid #fde8c8" }}
      >
        {/* Logo mark */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #560700, #c0506a)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-1 flex-1">
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                title={label}
                className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-all"
                style={{
                  backgroundColor: active ? "#560700" : "transparent",
                  color: active ? "#fff" : "#c0808a",
                  boxShadow: active ? "0 2px 8px rgba(86,7,0,0.25)" : "none",
                }}
              >
                {icon}
                {id === "wishlist" && wishlist.length > 0 && (
                  <span
                    className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
                    style={{ fontSize: 8, fontWeight: 700, backgroundColor: "#f59e0b" }}
                  >
                    {wishlist.length}
                  </span>
                )}
              </button>
            );
          })}

        </div>

        {/* Settings */}
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Settings"
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all shrink-0"
          style={{ color: "#c0808a" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen" style={{ marginLeft: 64 }}>
        <div className="max-w-3xl mx-auto px-6 py-7 space-y-5">

          {/* Page header */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>
                CartCoach
              </p>
              <h1 className="text-[26px] font-bold leading-tight" style={{ color: "#560700", fontFamily: "monospace" }}>
                {NAV_ITEMS.find((n) => n.id === tab)?.label}
              </h1>
            </div>
            {/* decorative dot cluster */}
            <div className="flex gap-1.5 items-center mb-1">
              {["#e8a0bc", "#f59e0b", "#60a5fa"].map((c) => (
                <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          {/* ══ OVERVIEW ══ */}
          {tab === "overview" && (
            <>
              {/* Hero card */}
              <div
                className="rounded-3xl p-6 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #560700 0%, #8b1a1a 60%, #7a1040 100%)" }}
              >
                {/* decorative blobs */}
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)" }} />
                <div className="absolute right-16 -bottom-12 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(232,160,188,0.15), transparent 70%)" }} />
                <div className="absolute -left-4 bottom-0 w-24 h-24 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(96,165,250,0.12), transparent 70%)" }} />

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>
                  Total Saved
                </p>
                <div className="flex items-end gap-3 mb-6">
                  <span className="text-5xl font-bold text-white leading-none">${totalSaved.toFixed(0)}</span>
                  {totalSaved > 0 && (
                    <span className="text-[11px] font-bold mb-1.5 px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(52,211,153,0.2)", color: "#34d399", fontFamily: "monospace" }}>
                      great work!
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-0">
                  {[
                    { value: avoidedCount, label: "purchases avoided" },
                    { value: `$${futureValueTotal.toFixed(0)}`, label: "in 5 yrs @ 7%" },
                    { value: wishlist.length, label: "on wishlist" },
                  ].map(({ value, label }, i) => (
                    <div key={label} className="relative" style={{ paddingLeft: i > 0 ? 20 : 0 }}>
                      {i > 0 && <div className="absolute left-0 top-1 bottom-1 w-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />}
                      <p className="text-xl font-bold text-white">{value}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {profile && (
                <div className="grid grid-cols-2 gap-4">
                  <BudgetCard spent={monthlySpent} budget={profile.monthlyBudget} />
                  <GoalProgress goal={{ ...profile.savingsGoal, currentAmount: profile.savingsGoal.currentAmount + totalSaved }} />
                </div>
              )}

              {/* Category spending */}
              <div className="rounded-2xl p-5 bg-white" style={{ border: "2px solid #fde8c8", boxShadow: "0 2px 12px rgba(86,7,0,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#c0808a", fontFamily: "monospace" }}>
                    Spending by Category
                  </p>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                </div>
                {categoryData.length > 0 ? (
                  <div className="space-y-3">
                    {categoryData.map(([cat, amount], i) => {
                      const color = SASE_COLORS[i % SASE_COLORS.length];
                      const pct = (amount / maxAmount) * 100;
                      return (
                        <div key={cat} className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[12px] w-24 truncate shrink-0" style={{ color: "#560700", fontFamily: "monospace" }}>{cat}</span>
                          <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ backgroundColor: "#fef3c7" }}>
                            <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.8 }} />
                          </div>
                          <span className="text-[12px] font-bold w-14 text-right shrink-0" style={{ color: "#560700", fontFamily: "monospace" }}>${amount.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[13px]" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>No spending data yet.</p>
                    <p className="text-xs mt-1" style={{ color: "#c0808a", fontFamily: "monospace" }}>CartCoach tracks your decisions as you shop.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ HISTORY ══ */}
          {tab === "history" && (
            <div className="rounded-2xl overflow-hidden bg-white" style={{ border: "2px solid #fde8c8", boxShadow: "0 2px 12px rgba(86,7,0,0.06)" }}>
              {history.length > 0 ? (
                <div className="divide-y" style={{ borderColor: "#fef3c7" }}>
                  {history.slice(0, 30).map((item) => {
                    const cfg = ACTION_CONFIG[item.action] ?? ACTION_CONFIG["skipped"];
                    return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3.5 transition-colors" style={{ cursor: "default" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef9ee")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold truncate leading-tight" style={{ color: "#560700", fontFamily: "monospace" }}>
                              {item.product.productName}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: "#c0808a", fontFamily: "monospace" }}>
                              {item.product.site} · {new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                          <span className="text-[13px] font-bold" style={{ color: "#560700", fontFamily: "monospace" }}>${item.product.price}</span>
                          <span
                            className="text-[10px] px-2.5 py-0.5 rounded-full font-bold"
                            style={{ backgroundColor: cfg.bg, color: cfg.text, fontFamily: "monospace" }}
                          >
                            {cfg.label}
                          </span>
                          <button
                            onClick={() => deleteHistory(item.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 2, lineHeight: 1 }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#d1d5db")}
                            title="Remove"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-[13px]" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>No history yet.</p>
                  <p className="text-xs mt-1" style={{ color: "#c0808a", fontFamily: "monospace" }}>Items appear here after CartCoach analyzes a product.</p>
                </div>
              )}
            </div>
          )}

          {/* ══ WISHLIST ══ */}
          {tab === "wishlist" && (
            <div className="space-y-2.5">
              {wishlist.length > 0 ? wishlist.map((item, i) => (
                <div
                  key={item.id}
                  className="bg-white flex items-center justify-between px-5 py-4 rounded-2xl"
                  style={{
                    border: "2px solid #fde8c8",
                    borderLeftColor: ACCENT_BORDERS[i % ACCENT_BORDERS.length],
                    borderLeftWidth: 4,
                    boxShadow: "0 2px 10px rgba(86,7,0,0.05)",
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: "#560700", fontFamily: "monospace" }}>{item.product.productName}</p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#c0808a", fontFamily: "monospace" }}>{item.product.site} · {item.product.category}</p>
                    {item.remindAt && (
                      <p className="text-[11px] font-bold mt-1" style={{ color: "#f59e0b", fontFamily: "monospace" }}>
                        Reminder: {new Date(item.remindAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 ml-4 text-right flex items-center gap-2">
                    <div>
                      <p className="text-[15px] font-bold" style={{ color: "#560700", fontFamily: "monospace" }}>${item.product.price}</p>
                      {item.analysis.riskLevel && (
                        <p className="text-[10px] font-bold mt-0.5" style={{
                          color: item.analysis.riskLevel === "High" ? "#ef4444" : item.analysis.riskLevel === "Medium" ? "#f59e0b" : "#34d399",
                          fontFamily: "monospace",
                        }}>
                          {item.analysis.riskLevel} risk
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteWishlist(item.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 2, lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#d1d5db")}
                      title="Remove"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl py-16 text-center bg-white" style={{ border: "2px solid #fde8c8" }}>
                  <p className="text-[13px]" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>Your wishlist is empty.</p>
                  <p className="text-xs mt-1" style={{ color: "#c0808a", fontFamily: "monospace" }}>Tap "Save for later" at checkout to add items here.</p>
                </div>
              )}
            </div>
          )}

          {/* ══ INSIGHTS ══ */}
          {tab === "insights" && (
            <div className="space-y-5">
              {/* Investment projection */}
              <div className="rounded-2xl p-5 bg-white" style={{ border: "2px solid #fde8c8", boxShadow: "0 2px 12px rgba(86,7,0,0.06)" }}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#c0808a", fontFamily: "monospace" }}>Investment Potential</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#d97706", fontFamily: "monospace" }}>7% annual return</span>
                </div>
                <p className="text-[12px] mb-4 mt-1" style={{ color: "#c0808a", fontFamily: "monospace" }}>
                  If you invested the ${totalSaved.toFixed(0)} you avoided spending:
                </p>
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 ${CHART_W} ${CHART_H + CHART_TOP_PAD + 36}`} width="100%" style={{ minWidth: 280 }}>
                    {projectionData.map((d, i) => {
                      const barH = Math.max(4, (d.value / maxProjection) * CHART_H);
                      const x = slotW * i + (slotW - BAR_W) / 2;
                      const y = CHART_TOP_PAD + (CHART_H - barH);
                      const isLast = i === projectionData.length - 1;
                      const color = isLast ? "#560700" : SASE_COLORS[i % SASE_COLORS.length];
                      return (
                        <g key={d.label}>
                          <rect x={x} y={0} width={BAR_W} height={CHART_H + CHART_TOP_PAD} rx="6" fill="#fef9ee" />
                          <rect x={x} y={y} width={BAR_W} height={barH} rx="6" fill={color} opacity={isLast ? 1 : 0.7} />
                          <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" fontSize="9" fontWeight="700" fill={isLast ? "#560700" : "#a0707a"} fontFamily="monospace">
                            ${d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}
                          </text>
                          <text x={x + BAR_W / 2} y={CHART_H + CHART_TOP_PAD + 16} textAnchor="middle" fontSize="10" fill={isLast ? "#560700" : "#c0808a"} fontWeight={isLast ? "700" : "400"} fontFamily="monospace">
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {projectionData.filter((d) => [5, 10, 20].includes(Number(d.label.replace("yr", "")))).map((d, i) => (
                    <div key={d.label} className="rounded-xl px-3 py-2.5 text-center" style={{ backgroundColor: ["#fdf2f8", "#fef9ee", "#ecfdf5"][i], border: `1.5px solid ${["#fce7ef", "#fde8c8", "#d1fae5"][i]}` }}>
                      <p className="text-[10px] font-bold" style={{ color: ["#c0506a", "#d97706", "#059669"][i], fontFamily: "monospace" }}>{d.label}</p>
                      <p className="text-[15px] font-bold mt-0.5" style={{ color: "#560700", fontFamily: "monospace" }}>
                        ${d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Monthly bookkeeping */}
              <div className="rounded-2xl overflow-hidden bg-white" style={{ border: "2px solid #fde8c8", boxShadow: "0 2px 12px rgba(86,7,0,0.06)" }}>
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "#c0808a", fontFamily: "monospace" }}>Monthly Breakdown</p>
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#34d399" }} />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                  </div>
                </div>
                {monthlyRows.length > 0 ? (
                  <>
                    <div className="grid grid-cols-4 px-5 py-2 border-t border-b" style={{ backgroundColor: "#fef9ee", borderColor: "#fde8c8" }}>
                      {["Month", "Avoided", "Spent", "Net"].map((h, i) => (
                        <p key={h} className={`text-[10px] font-bold uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}
                          style={{ color: i === 1 ? "#059669" : i === 2 ? "#dc2626" : "#c0808a", fontFamily: "monospace" }}>
                          {h}
                        </p>
                      ))}
                    </div>
                    {monthlyRows.map(([month, data]) => {
                      const net = data.avoided - data.spent;
                      return (
                        <div key={month} className="grid grid-cols-4 px-5 py-3.5 border-b last:border-0 transition-colors"
                          style={{ borderColor: "#fef3c7" }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef9ee")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <div>
                            <p className="text-[13px] font-bold" style={{ color: "#560700", fontFamily: "monospace" }}>{month}</p>
                            <p className="text-[10px] mt-0.5" style={{ color: "#c0808a", fontFamily: "monospace" }}>{data.skipped + data.purchased} items</p>
                          </div>
                          <p className="text-[13px] font-bold text-right self-center" style={{ color: "#059669", fontFamily: "monospace" }}>+${data.avoided.toFixed(0)}</p>
                          <p className="text-[13px] font-bold text-right self-center" style={{ color: "#dc2626", fontFamily: "monospace" }}>{data.spent > 0 ? `-$${data.spent.toFixed(0)}` : "—"}</p>
                          <p className="text-[13px] font-bold text-right self-center" style={{ color: net >= 0 ? "#560700" : "#dc2626", fontFamily: "monospace" }}>
                            {net >= 0 ? `$${net.toFixed(0)}` : `-$${Math.abs(net).toFixed(0)}`}
                          </p>
                        </div>
                      );
                    })}
                    {monthlyRows.length > 1 && (() => {
                      const totAvoided = monthlyRows.reduce((s, [, d]) => s + d.avoided, 0);
                      const totSpent = monthlyRows.reduce((s, [, d]) => s + d.spent, 0);
                      const totNet = totAvoided - totSpent;
                      return (
                        <div className="grid grid-cols-4 px-5 py-3.5 border-t" style={{ backgroundColor: "#fef9ee", borderColor: "#fde8c8" }}>
                          <p className="text-[11px] font-bold uppercase self-center" style={{ color: "#c0808a", fontFamily: "monospace" }}>Total</p>
                          <p className="text-[13px] font-bold text-right self-center" style={{ color: "#059669", fontFamily: "monospace" }}>+${totAvoided.toFixed(0)}</p>
                          <p className="text-[13px] font-bold text-right self-center" style={{ color: "#dc2626", fontFamily: "monospace" }}>{totSpent > 0 ? `-$${totSpent.toFixed(0)}` : "—"}</p>
                          <p className="text-[13px] font-bold text-right self-center" style={{ color: totNet >= 0 ? "#560700" : "#dc2626", fontFamily: "monospace" }}>
                            {totNet >= 0 ? `$${totNet.toFixed(0)}` : `-$${Math.abs(totNet).toFixed(0)}`}
                          </p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[13px]" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>No data yet.</p>
                    <p className="text-xs mt-1" style={{ color: "#c0808a", fontFamily: "monospace" }}>Monthly records appear as you use CartCoach.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab !== "ledger" && (
            <p className="text-[10px] text-center pb-2" style={{ color: "#c0808a", fontFamily: "monospace" }}>
              General financial wellness insights only · Not financial advice · 7% return is an estimate
            </p>
          )}
        </div>
      </main>

      {tab === "ledger" && (
        <div style={{ position: "fixed", top: 0, left: 64, right: 0, bottom: 0, backgroundColor: "#fef9ee", zIndex: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <LedgerTable history={history} userId={userId} onDeleteHistory={deleteHistory} />
        </div>
      )}


      {/* ── Floating chat ── */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {showChat && (
          <div style={{ position: "relative" }}>
          <div
            className="flex flex-col overflow-hidden"
            style={{
              width: 300,
              maxHeight: 400,
              backgroundColor: "#fff9f5",
              border: "2.5px solid #f9c8d8",
              borderRadius: 32,
              boxShadow: "0 8px 32px rgba(232,160,188,0.35)",
            }}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundColor: "#fff9f5" }}>
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="text-[12px] px-3 py-2"
                    style={{
                      maxWidth: "80%",
                      borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      backgroundColor: m.role === "user" ? "#560700" : "#fff",
                      color: m.role === "user" ? "#fff" : "#560700",
                      border: m.role === "bot" ? "1.5px solid #fde8c8" : "none",
                      fontFamily: "monospace",
                      lineHeight: 1.55,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatSending && (
                <div className="flex justify-start">
                  <div className="px-3 py-2.5" style={{ backgroundColor: "#fff", border: "1.5px solid #fde8c8", borderRadius: "16px 16px 16px 4px" }}>
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: "#e8a0bc",
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 shrink-0" style={{ borderTop: "1.5px solid #f9c8d8", backgroundColor: "#fff9f5" }}>
              <div className="flex gap-2 items-center">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="say something..."
                  className="flex-1 text-[12px] px-3 py-2 rounded-xl outline-none"
                  style={{
                    backgroundColor: "#fff",
                    border: "1.5px solid #f9c8d8",
                    color: "#560700",
                    fontFamily: "monospace",
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={chatSending || !chatInput.trim()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-opacity"
                  style={{ backgroundColor: "#560700", opacity: chatSending || !chatInput.trim() ? 0.35 : 1 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {/* Speech bubble tail - border */}
          <div style={{ position: "absolute", bottom: -23, right: 78, width: 0, height: 0, borderLeft: "15px solid transparent", borderRight: "15px solid transparent", borderTop: "23px solid #f9c8d8" }} />
          {/* Speech bubble tail - fill */}
          <div style={{ position: "absolute", bottom: -19, right: 80, width: 0, height: 0, borderLeft: "13px solid transparent", borderRight: "13px solid transparent", borderTop: "20px solid #fff9f5" }} />
          </div>
        )}

        {/* Toggle button */}
        <button
          onClick={() => setShowChat((v) => !v)}
          className="relative active:scale-95"
          style={{ width: 200, height: 200, background: "none", border: "none", padding: 0, cursor: "pointer", transition: "transform 0.15s" }}
        >
          <img
            src={boxClosed}
            alt="open chat"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "contain",
              opacity: showChat ? 0 : 1,
              transform: showChat ? "scale(0.8) translateY(6px)" : "scale(1) translateY(0)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
              pointerEvents: showChat ? "none" : "auto",
            }}
          />
          <img
            src={boxOpen}
            alt="close chat"
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "contain",
              opacity: showChat ? 1 : 0,
              transform: showChat ? "scale(1) translateY(0)" : "scale(0.8) translateY(6px)",
              transition: "opacity 0.3s ease, transform 0.3s ease",
              pointerEvents: showChat ? "auto" : "none",
            }}
          />
        </button>
      </div>
    </div>
  );
}
