import React from "react";

// Selector sencillo de sub-secciones (botones tipo "pastilla")
export default function SubTabs({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-4 py-2 text-sm font-medium ${value === o.value ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}