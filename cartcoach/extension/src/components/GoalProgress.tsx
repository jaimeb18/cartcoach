import React from "react";
import type { SavingsGoal } from "@shared/types";

interface Props {
  goal: SavingsGoal;
}

export default function GoalProgress({ goal }: Props) {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - goal.currentAmount;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Savings Goal
          </p>
          <p className="text-sm font-bold text-gray-800 mt-0.5 truncate max-w-[140px]">
            {goal.name}
          </p>
        </div>
        <span className="text-2xl">🎯</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>${goal.currentAmount.toLocaleString()} saved</span>
        <span>${remaining.toLocaleString()} to go</span>
      </div>
      {pct >= 100 && (
        <p className="text-xs text-green-600 font-medium mt-1 text-center">
          🎉 Goal reached!
        </p>
      )}
    </div>
  );
}
