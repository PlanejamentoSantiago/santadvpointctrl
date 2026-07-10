"use client";

import { Minus, Plus } from "lucide-react";

export default function Stepper({
  value, onChange, min = 1, max = 120, suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Diminuir">
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number" value={value} min={min} max={max}
        onChange={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) onChange(clamp(v)); }}
      />
      {suffix && <span className="stepper-suffix">{suffix}</span>}
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Aumentar">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
