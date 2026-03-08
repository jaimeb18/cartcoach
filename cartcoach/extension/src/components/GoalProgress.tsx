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
      style={{ boxShadow: "0 2px 12px rgba(86,7,0,0.06)", border: "2px solid #fde8c8" }}
    >
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>
        Savings Goal
      </p>
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={R} fill="none" stroke="#fce7ef" strokeWidth="8" />
            <circle
              cx="40" cy="40" r={R}
              fill="none"
              stroke="#e8a0bc"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`}
              strokeDashoffset={C * 0.25}
              transform="rotate(-90 40 40)"
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[14px] font-bold" style={{ color: "#560700", fontFamily: "monospace" }}>
              {Math.round(pct)}%
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold truncate leading-tight" style={{ color: "#560700" }}>
            {goal.name}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "#c0808a", fontFamily: "monospace" }}>
            ${goal.currentAmount.toLocaleString()}
            <span className="mx-1" style={{ color: "#f0c0cc" }}>/</span>
            ${goal.targetAmount.toLocaleString()}
          </p>
          {pct >= 100 ? (
            <p className="text-[11px] font-bold mt-1.5" style={{ color: "#e8a0bc" }}>Goal reached!</p>
          ) : (
            <p className="text-[11px] mt-1.5" style={{ color: "#c0808a", fontFamily: "monospace" }}>
              ${remaining.toLocaleString()} remaining
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
