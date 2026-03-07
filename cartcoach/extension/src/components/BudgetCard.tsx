import React from "react";

interface Props {
  spent: number;
  budget: number;
}

export default function BudgetCard({ spent, budget }: Props) {
  const pct = Math.min(100, (spent / budget) * 100);
  const remaining = budget - spent;
  const color = pct < 50 ? "bg-green-500" : pct < 80 ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Monthly Budget
          </p>
          <p className="text-xl font-bold text-gray-800 mt-0.5">${remaining.toFixed(0)} left</p>
        </div>
        <span className="text-2xl">💰</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>${spent} spent</span>
        <span>${budget} total</span>
      </div>
    </div>
  );
}
