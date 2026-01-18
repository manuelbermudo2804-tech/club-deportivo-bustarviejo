import React from "react";

const toneClasses = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-yellow-50 text-yellow-700 border-yellow-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  slate: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function MiniKPIBanner({ items = [], className = "" }) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`w-full flex flex-wrap gap-2 ${className}`}>
      {items.map((it, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] border ${toneClasses[it.tone || "slate"]}`}
        >
          <span className="font-semibold">{String(it.value)}</span>
          <span className="opacity-80">{it.label}</span>
        </div>
      ))}
    </div>
  );
}