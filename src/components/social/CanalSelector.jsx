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
      <p className="text-slate-300 text-xs font-bold">¿Dónde lo publicamos?</p>
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
                  ? "bg-slate-700/70 border-slate-500"
                  : "bg-slate-800/60 border-slate-700 hover:border-slate-600"
              }`}
            >
              <c.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${c.color}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  {c.label}
                  {active && <Check className="w-3.5 h-3.5 text-green-400" />}
                </p>
                <p className="text-xs text-slate-400 leading-snug">{c.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}