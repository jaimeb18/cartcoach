import React, { useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { STORAGE_KEYS, PRODUCT_CATEGORIES, COOLDOWN_OPTIONS } from "@shared/constants";
import type { UserProfile } from "@shared/types";

export default function Options() {
  const { getValue, setValue } = useStorage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getValue<UserProfile>(STORAGE_KEYS.USER_PROFILE).then((p) => p && setProfile(p));
  }, []);

  const save = async () => {
    if (!profile) return;
    await setValue(STORAGE_KEYS.USER_PROFILE, profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleCategory = (cat: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      watchedCategories: profile.watchedCategories.includes(cat)
        ? profile.watchedCategories.filter((c) => c !== cat)
        : [...profile.watchedCategories, cat],
    });
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛒</span>
          <h1 className="text-xl font-bold text-gray-900">CartCoach Settings</h1>
        </div>

        {/* Budget */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Budget
          </h2>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">
              Monthly discretionary budget
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                value={profile.monthlyBudget}
                onChange={(e) => setProfile({ ...profile, monthlyBudget: +e.target.value })}
                className="input-field pl-8"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Cooldown period
            </label>
            <select
              value={profile.cooldownHours}
              onChange={(e) => setProfile({ ...profile, cooldownHours: +e.target.value })}
              className="input-field"
            >
              {COOLDOWN_OPTIONS.filter((o) => o.hours > 0).map((o) => (
                <option key={o.hours} value={o.hours}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Savings goal */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Savings Goal
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Goal name</label>
              <input
                type="text"
                value={profile.savingsGoal.name}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    savingsGoal: { ...profile.savingsGoal, name: e.target.value },
                  })
                }
                className="input-field"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Target</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={profile.savingsGoal.targetAmount}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        savingsGoal: {
                          ...profile.savingsGoal,
                          targetAmount: +e.target.value,
                        },
                      })
                    }
                    className="input-field pl-8"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Saved so far</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={profile.savingsGoal.currentAmount}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        savingsGoal: {
                          ...profile.savingsGoal,
                          currentAmount: +e.target.value,
                        },
                      })
                    }
                    className="input-field pl-8"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Watched categories */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Watch Categories
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            CartCoach will be extra cautious for purchases in these categories.
          </p>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  profile.watchedCategories.includes(cat)
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={save}
          className={`w-full py-3 rounded-xl font-semibold text-white transition-colors ${
            saved ? "bg-green-600" : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
