import React from "react";
import { RISK_COLORS } from "@shared/constants";

interface Props {
  riskLevel: "Low" | "Medium" | "High";
  riskScore: number;
  message: string;
}

const RISK_ICONS = {
  Low: "✅",
  Medium: "⚠️",
  High: "🚨",
};

const RISK_BG = {
  Low: "bg-green-50 border-green-200",
  Medium: "bg-yellow-50 border-yellow-200",
  High: "bg-red-50 border-red-200",
};

const RISK_TEXT = {
  Low: "text-green-800",
  Medium: "text-yellow-800",
  High: "text-red-800",
};

export default function RiskWarning({ riskLevel, riskScore, message }: Props) {
  return (
    <div className={`rounded-xl border p-3 ${RISK_BG[riskLevel]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{RISK_ICONS[riskLevel]}</span>
        <span className={`text-sm font-semibold ${RISK_TEXT[riskLevel]}`}>
          {riskLevel} Risk
        </span>
        <span
          className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: RISK_COLORS[riskLevel] }}
        >
          {riskScore}/100
        </span>
      </div>
      <ul className={`text-xs leading-relaxed ${RISK_TEXT[riskLevel]} space-y-0.5 list-none p-0 m-0`}>
        {message.split('\n').filter(l => l.trim()).map((line, i) => (
          <li key={i}>{line.trim()}</li>
        ))}
      </ul>
    </div>
  );
}
