import React, { useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import BudgetCard from "../components/BudgetCard";
import GoalProgress from "../components/GoalProgress";
import { STORAGE_KEYS } from "@shared/constants";
import type { UserProfile, SpendingHistory } from "@shared/types";

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
    getValue<UserProfile>(STORAGE_KEYS.USER_PROFILE).then((p) => {
      if (p) setProfile(p);
    });
    getValue<SpendingHistory[]>(STORAGE_KEYS.SPENDING_HISTORY).then((h) => {
      if (h) setHistory(h.slice(-10).reverse());
    });
  }, []);

  const openDashboard = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/index.html") });
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const skippedThisWeek = history.filter(
    (h) =>
      h.action === "skipped" &&
      Date.now() - new Date(h.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
  ).length;

  const moneySaved = history
    .filter((h) => h.action === "skipped" || h.action === "saved_later")
    .reduce((sum, h) => sum + h.product.price, 0);

  if (!onboarded) {
    return (
      <div className="w-80 p-6 text-center">
        <div className="text-4xl mb-3">🛒</div>
        <p className="text-gray-600 text-sm">Opening setup...</p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">CartCoach</h1>
            <p className="text-green-100 text-xs">Think twice before you buy.</p>
          </div>
          <div className="text-3xl">🛒</div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Weekly stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{skippedThisWeek}</div>
            <div className="text-xs text-gray-500 mt-1">impulse buys avoided</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${moneySaved.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">money saved</div>
          </div>
        </div>

        {/* Budget */}
        {profile && (
          <>
            <BudgetCard
              spent={profile.monthlySaved}
              budget={profile.monthlyBudget}
            />
            <GoalProgress goal={profile.savingsGoal} />
          </>
        )}

        {/* Recent activity */}
        {history.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Recent Activity
            </h3>
            <div className="space-y-2">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span className="text-gray-700 truncate max-w-[160px]">
                    {item.product.productName}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      item.action === "skipped"
                        ? "bg-green-100 text-green-700"
                        : item.action === "purchased"
                        ? "bg-red-100 text-red-600"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {item.action === "saved_later" ? "saved" : item.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={openDashboard}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={openSettings}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2 rounded-lg transition-colors"
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
