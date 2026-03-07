import React, { useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { STORAGE_KEYS, PRODUCT_CATEGORIES, COOLDOWN_OPTIONS } from "@shared/constants";
import type { UserProfile } from "@shared/types";

const STEPS = ["welcome", "budget", "goal", "categories", "done"] as const;
type Step = (typeof STEPS)[number];

const defaultProfile: UserProfile = {
  id: `user-${Date.now()}`,
  monthlyBudget: 500,
  monthlySaved: 0,
  savingsGoal: {
    name: "Emergency Fund",
    targetAmount: 1000,
    currentAmount: 0,
  },
  watchedCategories: ["Fashion", "Beauty"],
  cooldownHours: 48,
};

export default function Onboarding() {
  const { setValue } = useStorage();
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

  const next = () => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const finish = async () => {
    await setValue(STORAGE_KEYS.USER_PROFILE, profile);
    await setValue(STORAGE_KEYS.ONBOARDED, true);
    window.close();
  };

  const toggleCategory = (cat: string) => {
    setProfile((p) => ({
      ...p,
      watchedCategories: p.watchedCategories.includes(cat)
        ? p.watchedCategories.filter((c) => c !== cat)
        : [...p.watchedCategories, cat],
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.slice(0, -1).map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                STEPS.indexOf(s) <= STEPS.indexOf(step)
                  ? "w-8 bg-green-500"
                  : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {step === "welcome" && (
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              Welcome to CartCoach
            </h1>
            <p className="text-gray-500 mb-8">
              Your real-time spending accountability partner. We'll help you
              pause before purchases and stay on track with your goals.
            </p>
            <button onClick={next} className="btn-primary w-full">
              Get Started
            </button>
          </div>
        )}

        {step === "budget" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Set your monthly budget
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              How much do you want to spend on discretionary purchases per month?
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  $
                </span>
                <input
                  type="number"
                  value={profile.monthlyBudget}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, monthlyBudget: +e.target.value }))
                  }
                  className="input-field pl-8"
                  min={0}
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cooldown period for impulse buys
              </label>
              <select
                value={profile.cooldownHours}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, cooldownHours: +e.target.value }))
                }
                className="input-field"
              >
                {COOLDOWN_OPTIONS.filter((o) => o.hours > 0).map((o) => (
                  <option key={o.hours} value={o.hours}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Continue
            </button>
          </div>
        )}

        {step === "goal" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              What are you saving for?
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Your savings goal helps us show you the real cost of each purchase.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal name
                </label>
                <input
                  type="text"
                  value={profile.savingsGoal.name}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      savingsGoal: { ...p.savingsGoal, name: e.target.value },
                    }))
                  }
                  className="input-field"
                  placeholder="e.g. Summer trip, Emergency fund"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={profile.savingsGoal.targetAmount}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          savingsGoal: {
                            ...p.savingsGoal,
                            targetAmount: +e.target.value,
                          },
                        }))
                      }
                      className="input-field pl-8"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saved so far
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      value={profile.savingsGoal.currentAmount}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          savingsGoal: {
                            ...p.savingsGoal,
                            currentAmount: +e.target.value,
                          },
                        }))
                      }
                      className="input-field pl-8"
                      min={0}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target date (optional)
                </label>
                <input
                  type="date"
                  value={profile.savingsGoal.targetDate || ""}
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      savingsGoal: {
                        ...p.savingsGoal,
                        targetDate: e.target.value,
                      },
                    }))
                  }
                  className="input-field"
                />
              </div>
            </div>
            <button onClick={next} className="btn-primary w-full">
              Continue
            </button>
          </div>
        )}

        {step === "categories" && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Which categories do you overspend in?
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              We'll be extra watchful in these areas.
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    profile.watchedCategories.includes(cat)
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button onClick={next} className="btn-primary w-full">
              Continue
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              You're all set!
            </h2>
            <p className="text-gray-500 mb-4">
              CartCoach is now active. The next time you go to checkout, we'll
              help you make a smarter decision.
            </p>
            <div className="bg-green-50 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monthly budget</span>
                <span className="font-semibold">${profile.monthlyBudget}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Saving for</span>
                <span className="font-semibold">{profile.savingsGoal.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cooldown</span>
                <span className="font-semibold">{profile.cooldownHours}h</span>
              </div>
            </div>
            <button onClick={finish} className="btn-primary w-full">
              Start Shopping Smarter
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
