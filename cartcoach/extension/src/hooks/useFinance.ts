import { useState } from "react";
import { API_BASE_URL } from "@shared/constants";
import type { ExtractedProduct, FinanceAnalysis, UserProfile } from "@shared/types";

export function useFinance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (
    product: ExtractedProduct,
    profile: UserProfile
  ): Promise<FinanceAnalysis | null> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, profile }),
      });
      if (!res.ok) throw new Error("Analysis request failed");
      return await res.json();
    } catch (e) {
      // Fallback: local calculation if backend unreachable
      return localFallbackAnalysis(product, profile);
    } finally {
      setLoading(false);
    }
  };

  return { analyze, loading, error };
}

function localFallbackAnalysis(
  product: ExtractedProduct,
  profile: UserProfile
): FinanceAnalysis {
  const remaining = profile.monthlyBudget - profile.monthlySaved;
  const budgetPct = Math.round((product.price / profile.monthlyBudget) * 100);
  const remainingGoal =
    profile.savingsGoal.targetAmount - profile.savingsGoal.currentAmount;
  const monthlySavingsRate = profile.monthlyBudget * 0.2;
  const goalDelayDays =
    monthlySavingsRate > 0
      ? Math.round((product.price / monthlySavingsRate) * 30)
      : 0;
  const futureValue5y = product.price * Math.pow(1.07, 5);

  let riskScore = 0;
  if (budgetPct > 30) riskScore += 40;
  else if (budgetPct > 15) riskScore += 20;
  if (product.price > remaining) riskScore += 30;
  if (goalDelayDays > 7) riskScore += 20;
  riskScore = Math.min(100, riskScore);

  const riskLevel =
    riskScore < 33 ? "Low" : riskScore < 66 ? "Medium" : "High";

  return {
    showPopup: riskScore > 20,
    riskScore,
    riskLevel,
    budgetImpact: `${budgetPct}% of budget`,
    remainingBudget: remaining - product.price,
    goalDelayDays,
    futureValue5y,
    recommendation:
      riskLevel === "High"
        ? "Consider skipping or waiting 48 hours."
        : riskLevel === "Medium"
        ? "Think about whether you really need this."
        : "Looks like this fits within your budget.",
    message: `This purchase is ${budgetPct}% of your monthly budget and may delay your ${profile.savingsGoal.name} goal by ${goalDelayDays} days.`,
    alternatives: [],
  };
}
