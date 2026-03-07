import React from "react";
import type { Alternative } from "@shared/types";

interface Props {
  alternative: Alternative;
  originalPrice: number;
}

export default function AlternativeCard({ alternative, originalPrice }: Props) {
  const savings = originalPrice - alternative.price;
  const pctSaved = Math.round((savings / originalPrice) * 100);

  return (
    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3 hover:border-green-200 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{alternative.name}</p>
        {alternative.source && (
          <p className="text-xs text-gray-400">{alternative.source}</p>
        )}
      </div>
      <div className="text-right ml-3 shrink-0">
        <p className="text-sm font-bold text-gray-900">${alternative.price}</p>
        {savings > 0 && (
          <p className="text-xs text-green-600 font-medium">Save {pctSaved}%</p>
        )}
      </div>
    </div>
  );
}
