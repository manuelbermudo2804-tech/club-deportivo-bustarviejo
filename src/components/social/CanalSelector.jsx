import React from "react";
import { Check } from "lucide-react";
import { CANALES } from "./canales";

/**
 * Selector de canales de difusión.
 * value = array de ids (ej: ['telegram','app'])
 */
export default function CanalSelector({ value = [], onChange }) {
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-slate-800">¿Dónde lo publicamos?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CANALES.map((c) => {
          const active = value.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                active
                  ? "bg-orange-50 border-orange-400 ring-1 ring-orange-100"
                  : "bg-white border-slate-200 hover:border-orange-300 hover:bg-orange-50/50"
              }`}
            >
              <c.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${c.color}`} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  {c.label}
                  {active && <Check className="h-3.5 w-3.5 text-orange-700" />}
                </p>
                <p className="text-xs leading-snug text-slate-600">{c.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}