interface Props {
  spent: number;
  budget: number;
}

export default function BudgetCard({ spent, budget }: Props) {
  const pct = Math.min(100, (spent / budget) * 100);
  const remaining = budget - spent;
  const barColor = pct < 50 ? "#e8a0bc" : pct < 80 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="bg-white rounded-2xl p-5"
      style={{ boxShadow: "0 2px 12px rgba(86,7,0,0.06)", border: "2px solid #fde8c8" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#e8a0bc", fontFamily: "monospace" }}>
            Monthly Budget
          </p>
          <p className="text-2xl font-bold mt-1 leading-none" style={{ color: "#560700" }}>
            ${remaining.toFixed(0)}
            <span className="text-sm font-normal ml-1" style={{ color: "#c0808a" }}>left</span>
          </p>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#fce7ef" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e8a0bc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
      </div>
      <div className="w-full rounded-full h-2 mb-2.5 overflow-hidden" style={{ backgroundColor: "#fef3c7" }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between text-[11px]" style={{ color: "#c0808a", fontFamily: "monospace" }}>
        <span>${spent.toLocaleString()} spent</span>
        <span>${budget.toLocaleString()} total</span>
      </div>
    </div>
  );
}
