import React, { useState } from "react";
import { COOLDOWN_OPTIONS } from "@shared/constants";

interface Props {
  onCooldown: (hours: number) => void;
}

export default function CooldownButton({ onCooldown }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl py-2.5 text-sm font-medium transition-colors"
      >
        ⏰ Set a cooldown reminder
      </button>
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
          {COOLDOWN_OPTIONS.filter((o) => o.hours > 0).map((opt) => (
            <button
              key={opt.hours}
              onClick={() => {
                onCooldown(opt.hours);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              Remind me in {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
