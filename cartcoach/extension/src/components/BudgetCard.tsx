interface Props {
  spent: number;
  budget: number;
}

export default function BudgetCard({ spent, budget }: Props) {
  const pct = Math.min(100, (spent / budget) * 100);
  const remaining = budget - spent;
  const barColor =
    pct < 50 ? "#10b981" : pct < 80 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Monthly Budget
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1 leading-none">
            ${remaining.toFixed(0)}
            <span className="text-sm font-normal text-gray-400 ml-1">left</span>
          </p>
        </div>
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: "#f0fdf4" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="flex justify-between text-[11px] text-gray-400">
        <span>${spent.toLocaleString()} spent</span>
        <span>${budget.toLocaleString()} total</span>
      </div>
    </div>
  );
}
