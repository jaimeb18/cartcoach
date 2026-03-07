import type { SavingsGoal } from "@shared/types";

interface Props {
  goal: SavingsGoal;
}

const R = 34;
const C = 2 * Math.PI * R;

export default function GoalProgress({ goal }: Props) {
  const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const dash = (pct / 100) * C;

  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
        Savings Goal
      </p>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={R} fill="none" stroke="#f1f5f9" strokeWidth="8" />
            <circle
              cx="40" cy="40" r={R}
              fill="none"
              stroke="#6366f1"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={C * 0.25}
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] font-bold text-gray-900">{Math.round(pct)}%</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-gray-900 truncate leading-tight">{goal.name}</p>
          <p className="text-[12px] text-gray-500 mt-1">
            ${goal.currentAmount.toLocaleString()}
            <span className="text-gray-300 mx-1">/</span>
            ${goal.targetAmount.toLocaleString()}
          </p>
          {pct >= 100 ? (
            <p className="text-[11px] text-emerald-500 font-semibold mt-1.5">Goal reached!</p>
          ) : (
            <p className="text-[11px] text-gray-400 mt-1.5">${remaining.toLocaleString()} remaining</p>
          )}
        </div>
      </div>
    </div>
  );
}
