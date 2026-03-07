import React, { useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import BudgetCard from "../components/BudgetCard";
import GoalProgress from "../components/GoalProgress";
import { STORAGE_KEYS } from "@shared/constants";
import type { UserProfile, SpendingHistory, WishlistItem } from "@shared/types";
import LedgerTable from "../components/LedgerTable";

type Tab = "overview" | "history" | "wishlist";

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛒</span>
            <div>
              <h1 className="text-xl font-bold text-gray-900">CartCoach</h1>
              <p className="text-xs text-gray-400">Your financial wellness dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowLedger(true)}
              className="text-sm px-4 py-1.5 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100 transition-colors"
            >
              Open Ledger
            </button>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl font-bold text-green-600">${totalSaved.toFixed(0)}</div>
            <div className="text-xs text-gray-500 mt-1">total money saved</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl font-bold text-blue-600">{skippedCount}</div>
            <div className="text-xs text-gray-500 mt-1">impulse buys skipped</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <div className="text-3xl font-bold text-purple-600">
              ${futureValueTotal.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">potential in 5 years</div>
          </div>
        </div>

        {/* Budget + Goal */}
        {profile && (
          <div className="grid grid-cols-2 gap-4">
            <BudgetCard spent={profile.monthlySaved} budget={profile.monthlyBudget} />
            <GoalProgress goal={profile.savingsGoal} />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(["overview", "history", "wishlist"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${tab === t
                  ? "text-green-600 border-b-2 border-green-500"
                  : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {t}
                {t === "wishlist" && wishlist.length > 0 && (
                  <span className="ml-1 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded-full">
                    {wishlist.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-4">
            {tab === "overview" && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Spending by category
                </h3>
                {Object.entries(
                  history.reduce<Record<string, number>>((acc, h) => {
                    const cat = h.product.category;
                    acc[cat] = (acc[cat] || 0) + h.product.price;
                    return acc;
                  }, {})
                )
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([cat, amount]) => (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-24">{cat}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (amount /
                                Math.max(...Object.values({ [cat]: amount }))) *
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-16 text-right">
                        ${amount.toFixed(0)}
                      </span>
                    </div>
                  ))}
                {history.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No activity yet. Start shopping and CartCoach will track your
                    decisions.
                  </p>
                )}
              </div>
            )}

            {tab === "history" && (
              <div className="space-y-2">
                {history.slice(0, 20).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.product.productName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {item.product.site} ·{" "}
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-700">
                        ${item.product.price}
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.action === "skipped"
                          ? "bg-green-100 text-green-700"
                          : item.action === "purchased"
                            ? "bg-red-100 text-red-600"
                            : "bg-yellow-100 text-yellow-700"
                          }`}
                      >
                        {item.action === "saved_later" ? "saved" : item.action}
                      </span>
                    </div>
                  </div>
                ))}
                {history.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">
                    No history yet.
                  </p>
                )}
              </div>
            )}

            {tab === "wishlist" && (
              <div className="space-y-3">
                {wishlist.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-xl p-3 flex items-start justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.product.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        ${item.product.price} · {item.product.site}
                      </p>
                      {item.remindAt && (
                        <p className="text-xs text-blue-500 mt-1">
                          Remind: {new Date(item.remindAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      ${item.product.price}
                    </span>
                  </div>
                ))}
                {wishlist.length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-4">
                    Your wishlist is empty. Save items during checkout to revisit
                    them later.
                  </p>
                )}
              </div>
            )}

          </div>
        </div>

        <p className="text-xs text-center text-gray-400">
          CartCoach provides general financial wellness insights. Not financial
          advice. Investment projections use a 7% annual return estimate.
        </p>
      </div>

      {showLedger && <LedgerTable onClose={() => setShowLedger(false)} />}
    </div>
  );
}
