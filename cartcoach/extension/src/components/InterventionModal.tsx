import React, { useState } from "react";
import RiskWarning from "./RiskWarning";
import AlternativeCard from "./AlternativeCard";
import CooldownButton from "./CooldownButton";
import type { FinanceAnalysis, ExtractedProduct } from "@shared/types";

interface Props {
  product: ExtractedProduct;
  analysis: FinanceAnalysis;
  onBuy: () => void;
  onSkip: () => void;
  onSaveLater: () => void;
  onCooldown: (hours: number) => void;
  onClose: () => void;
}

export default function InterventionModal({
  product,
  analysis,
  onBuy,
  onSkip,
  onSaveLater,
  onCooldown,
  onClose,
}: Props) {
  const [showAlts, setShowAlts] = useState(false);

  return (
    <div className="min-h-full flex flex-col">
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-screen">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-green-100 font-medium uppercase tracking-wide">
                CartCoach
              </p>
              <h2 className="text-base font-bold mt-0.5 leading-tight">
                Before you buy...
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-green-200 hover:text-white text-lg leading-none ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Product */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {product.productName}
              </p>
              <p className="text-xs text-gray-400">{product.site}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">${product.price}</p>
          </div>

          {/* Risk warning */}
          <RiskWarning
            riskLevel={analysis.riskLevel}
            riskScore={analysis.riskScore}
            message={analysis.message}
          />

          {/* Impact stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-xs text-gray-400 leading-tight">Budget impact</p>
              <p className="text-sm font-bold text-gray-800 mt-1">
                {analysis.budgetImpact}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-xs text-gray-400 leading-tight">Goal delay</p>
              <p className="text-sm font-bold text-gray-800 mt-1">
                {analysis.goalDelayDays > 0 ? `+${analysis.goalDelayDays}d` : "None"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-2.5">
              <p className="text-xs text-gray-400 leading-tight">In 5 years</p>
              <p className="text-sm font-bold text-green-600 mt-1">
                ${analysis.futureValue5y.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5 text-center">
            <p className="text-xs text-blue-600 font-medium">💡 {analysis.recommendation}</p>
          </div>

          {/* Alternatives */}
          {analysis.alternatives.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlts((s) => !s)}
                className="text-xs text-green-600 font-medium hover:underline flex items-center gap-1"
              >
                {showAlts ? "▲" : "▼"} {showAlts ? "Hide" : "Show"} cheaper alternatives
                ({analysis.alternatives.length})
              </button>
              {showAlts && (
                <div className="mt-2 space-y-2">
                  {analysis.alternatives.map((alt, i) => (
                    <AlternativeCard
                      key={i}
                      alternative={alt}
                      originalPrice={product.price}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onSkip}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Skip it 🎯
              </button>
              <button
                onClick={onSaveLater}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                Save for later
              </button>
            </div>
            <CooldownButton onCooldown={onCooldown} />
            <button
              onClick={onBuy}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2.5 rounded-xl text-sm transition-colors"
            >
              Buy anyway
            </button>
          </div>
        </div>

        <div className="px-4 pb-3 text-center">
          <p className="text-[10px] text-gray-300">
            Educational estimate only · Not financial advice
          </p>
        </div>
      </div>
    </div>
  );
}
