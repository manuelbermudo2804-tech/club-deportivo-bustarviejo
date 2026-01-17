import React from "react";

export default function PaymentSelect({ checked, onChange, disabled=false }) {
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" className="w-4 h-4" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span className="text-xs text-slate-600">Añadir</span>
    </label>
  );
}