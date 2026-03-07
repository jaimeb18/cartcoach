import { useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import BudgetCard from "../components/BudgetCard";
import GoalProgress from "../components/GoalProgress";
import LedgerTable from "../components/LedgerTable";
import { STORAGE_KEYS } from "@shared/constants";
import type { UserProfile, SpendingHistory, WishlistItem } from "@shared/types";

type Tab = "overview" | "history" | "wishlist" | "insights";

const CATEGORY_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899",
];

const ACTION_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  skipped:     { label: "Skipped",   dot: "#10b981", badge: "bg-emerald-50 text-emerald-700" },
  purchased:   { label: "Purchased", dot: "#ef4444", badge: "bg-red-50 text-red-600" },
  saved_later: { label: "Saved",     dot: "#f59e0b", badge: "bg-amber-50 text-amber-700" },
  cooldown:    { label: "Cooldown",  dot: "#6366f1", badge: "bg-indigo-50 text-indigo-600" },
};

const PROJECTION_YEARS = [0, 1, 3, 5, 10, 20] as const;
const CHART_W = 360;
const CHART_H = 100;
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
];

export default function Dashboard() {
  const { getValue } = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<SpendingHistory[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [tab, setTab] = useState<Tab>("overview");
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    getValue<UserProfile>(STORAGE_KEYS.USER_PROFILE).then((p) => p && setProfile(p));
    getValue<SpendingHistory[]>(STORAGE_KEYS.SPENDING_HISTORY).then((h) =>
      h && setHistory(h.reverse())
    );
    getValue<WishlistItem[]>(STORAGE_KEYS.WISHLIST).then((w) => w && setWishlist(w));
  }, []);

  const totalSaved = history
    .filter((h) => h.action === "skipped" || h.action === "saved_later")
    .reduce((sum, h) => sum + h.product.price, 0);

  const skippedCount = history.filter((h) => h.action === "skipped").length;
  const futureValueTotal = totalSaved * Math.pow(1.07, 5);

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
    <div className="flex min-h-screen" style={{ backgroundColor: "#f4f5f9" }}>

      {/* ── Left sidebar ── */}
      <aside
        className="fixed left-0 top-0 bottom-0 z-20 flex flex-col items-center py-5 gap-1"
        style={{ width: 64, backgroundColor: "#fff", borderRight: "1px solid #f1f5f9" }}
      >
        {/* Logo */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-4 shrink-0"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
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
                className="relative flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
                style={{
                  backgroundColor: active ? "#f0fdf4" : "transparent",
                  color: active ? "#059669" : "#9ca3af",
                }}
              >
                {icon}
                {id === "wishlist" && wishlist.length > 0 && (
                  <span
                    className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center"
                    style={{ fontSize: 8, fontWeight: 700, backgroundColor: "#6366f1" }}
                  >
                    {wishlist.length}
                  </span>
                )}
              </button>
            );
          })}

          {/* Ledger button */}
          <button
            onClick={() => setShowLedger(true)}
            title="Open Ledger"
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors mt-1"
            style={{ color: "#9ca3af" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="3" y1="15" x2="21" y2="15" />
              <line x1="9" y1="9" x2="9" y2="21" />
            </svg>
          </button>
        </div>

        {/* Settings */}
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          title="Settings"
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors shrink-0"
          style={{ color: "#9ca3af" }}
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

          <div>
            <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
              {NAV_ITEMS.find((n) => n.id === tab)?.label}
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">CartCoach · Financial Wellness</p>
          </div>

          {/* ══ OVERVIEW ══ */}
          {tab === "overview" && (
            <>
              <div
                className="rounded-2xl p-6 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #14352a 100%)" }}
              >
                <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(74,222,128,0.12), transparent 70%)" }} />
                <div className="absolute right-12 -bottom-14 w-52 h-52 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.1), transparent 70%)" }} />
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Total Saved</p>
                <div className="flex items-end gap-2 mb-7">
                  <span className="text-5xl font-bold text-white leading-none tracking-tight">${totalSaved.toFixed(0)}</span>
                  {totalSaved > 0 && (
                    <span className="text-emerald-400 text-xs font-semibold mb-1.5 flex items-center gap-0.5">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5H7z" /></svg>
                      great work
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 divide-x divide-white/10">
                  <div className="pr-6">
                    <p className="text-xl font-semibold text-white">{skippedCount}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">buys skipped</p>
                  </div>
                  <div className="px-6">
                    <p className="text-xl font-semibold text-white">${futureValueTotal.toFixed(0)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">in 5 yrs @ 7%</p>
                  </div>
                  <div className="pl-6">
                    <p className="text-xl font-semibold text-white">{wishlist.length}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">on wishlist</p>
                  </div>
                </div>
              </div>

              {profile && (
                <div className="grid grid-cols-2 gap-4">
                  <BudgetCard spent={profile.monthlySaved} budget={profile.monthlyBudget} />
                  <GoalProgress goal={profile.savingsGoal} />
                </div>
              )}

              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-4">Spending by Category</p>
                {categoryData.length > 0 ? (
                  <div className="space-y-3.5">
                    {categoryData.map(([cat, amount], i) => (
                      <div key={cat} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-28 shrink-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          <span className="text-[13px] text-gray-600 truncate">{cat}</span>
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(amount / maxAmount) * 100}%`, backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                        </div>
                        <span className="text-[13px] font-semibold text-gray-700 w-14 text-right shrink-0">${amount.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-[13px] text-gray-400">No spending data yet.</p>
                    <p className="text-xs text-gray-300 mt-1">CartCoach tracks your decisions as you shop.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ══ HISTORY ══ */}
          {tab === "history" && (
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {history.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {history.slice(0, 30).map((item) => {
                    const cfg = ACTION_CONFIG[item.action] ?? ACTION_CONFIG["skipped"];
                    return (
                      <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-0.5 h-7 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-gray-800 truncate leading-tight">{item.product.productName}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {item.product.site} · {new Date(item.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0 ml-3">
                          <span className="text-[13px] font-semibold text-gray-700">${item.product.price}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-[13px] text-gray-400">No history yet.</p>
                  <p className="text-xs text-gray-300 mt-1">Items appear here after CartCoach analyzes a product.</p>
                </div>
              )}
            </div>
          )}

          {/* ══ WISHLIST ══ */}
          {tab === "wishlist" && (
            <div className="space-y-2">
              {wishlist.length > 0 ? wishlist.map((item) => (
                <div key={item.id} className="bg-white flex items-center justify-between px-5 py-4 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 truncate">{item.product.productName}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{item.product.site} · {item.product.category}</p>
                    {item.remindAt && (
                      <p className="text-[11px] text-indigo-500 font-medium mt-1">
                        Reminder: {new Date(item.remindAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 ml-4 text-right">
                    <p className="text-[15px] font-bold text-gray-900">${item.product.price}</p>
                    {item.analysis.riskLevel && (
                      <p className={`text-[10px] font-semibold mt-0.5 ${
                        item.analysis.riskLevel === "High" ? "text-red-500"
                        : item.analysis.riskLevel === "Medium" ? "text-amber-500"
                        : "text-emerald-500"
                      }`}>{item.analysis.riskLevel} risk</p>
                    )}
                  </div>
                </div>
              )) : (
                <div className="bg-white rounded-2xl py-16 text-center" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <p className="text-[13px] text-gray-400">Your wishlist is empty.</p>
                  <p className="text-xs text-gray-300 mt-1">Tap "Save for later" at checkout to add items here.</p>
                </div>
              )}
            </div>
          )}

          {/* ══ INSIGHTS ══ */}
          {tab === "insights" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-5" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Investment Potential</p>
                  <span className="text-[10px] text-gray-300">7% annual return</span>
                </div>
                <p className="text-[12px] text-gray-500 mb-4">If you invested the ${totalSaved.toFixed(0)} you avoided spending:</p>
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 ${CHART_W} ${CHART_H + 36}`} width="100%" style={{ minWidth: 280 }}>
                    {projectionData.map((d, i) => {
                      const barH = Math.max(4, (d.value / maxProjection) * CHART_H);
                      const x = slotW * i + (slotW - BAR_W) / 2;
                      const y = CHART_H - barH;
                      const isLast = i === projectionData.length - 1;
                      return (
                        <g key={d.label}>
                          <rect x={x} y={0} width={BAR_W} height={CHART_H} rx="6" fill="#f8fafc" />
                          <rect x={x} y={y} width={BAR_W} height={barH} rx="6" fill={isLast ? "#6366f1" : "#e0e7ff"} />
                          <text x={x + BAR_W / 2} y={y - 5} textAnchor="middle" fontSize="9" fontWeight="600" fill={isLast ? "#6366f1" : "#94a3b8"}>
                            ${d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}
                          </text>
                          <text x={x + BAR_W / 2} y={CHART_H + 16} textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight={isLast ? "700" : "400"}>
                            {d.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {projectionData.filter((d) => [5, 10, 20].includes(Number(d.label.replace("yr", "")))).map((d) => (
                    <div key={d.label} className="rounded-xl px-3 py-2.5 text-center" style={{ backgroundColor: "#f5f3ff" }}>
                      <p className="text-[10px] text-indigo-400 font-medium">{d.label}</p>
                      <p className="text-[15px] font-bold text-indigo-700 mt-0.5">
                        ${d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}k` : d.value.toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="px-5 pt-5 pb-3">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Monthly Breakdown</p>
                </div>
                {monthlyRows.length > 0 ? (
                  <>
                    <div className="grid grid-cols-4 px-5 py-2 bg-gray-50 border-t border-b border-gray-100">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Month</p>
                      <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide text-right">Avoided</p>
                      <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide text-right">Spent</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-right">Net</p>
                    </div>
                    {monthlyRows.map(([month, data]) => {
                      const net = data.avoided - data.spent;
                      return (
                        <div key={month} className="grid grid-cols-4 px-5 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors last:border-0">
                          <div>
                            <p className="text-[13px] font-medium text-gray-700">{month}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{data.skipped + data.purchased} decisions</p>
                          </div>
                          <p className="text-[13px] font-semibold text-emerald-600 text-right self-center">+${data.avoided.toFixed(0)}</p>
                          <p className="text-[13px] font-semibold text-red-400 text-right self-center">{data.spent > 0 ? `-$${data.spent.toFixed(0)}` : "—"}</p>
                          <p className={`text-[13px] font-bold text-right self-center ${net >= 0 ? "text-gray-800" : "text-red-500"}`}>
                            {net >= 0 ? `$${net.toFixed(0)}` : `-$${Math.abs(net).toFixed(0)}`}
                          </p>
                        </div>
                      );
                    })}
                    {monthlyRows.length > 1 && (() => {
                      const totAvoided = monthlyRows.reduce((s, [, d]) => s + d.avoided, 0);
                      const totSpent   = monthlyRows.reduce((s, [, d]) => s + d.spent, 0);
                      const totNet     = totAvoided - totSpent;
                      return (
                        <div className="grid grid-cols-4 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
                          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide self-center">Total</p>
                          <p className="text-[13px] font-bold text-emerald-600 text-right self-center">+${totAvoided.toFixed(0)}</p>
                          <p className="text-[13px] font-bold text-red-400 text-right self-center">{totSpent > 0 ? `-$${totSpent.toFixed(0)}` : "—"}</p>
                          <p className={`text-[13px] font-bold text-right self-center ${totNet >= 0 ? "text-gray-900" : "text-red-500"}`}>
                            {totNet >= 0 ? `$${totNet.toFixed(0)}` : `-$${Math.abs(totNet).toFixed(0)}`}
                          </p>
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[13px] text-gray-400">No data yet.</p>
                    <p className="text-xs text-gray-300 mt-1">Monthly records appear as you use CartCoach.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-[11px] text-center text-gray-300 pb-2">
            General financial wellness insights only · Not financial advice · 7% annual return is an estimate
          </p>
        </div>
      </main>

      {showLedger && <LedgerTable onClose={() => setShowLedger(false)} />}
    </div>
  );
}
