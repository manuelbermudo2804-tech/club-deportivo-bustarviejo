import React, { useState } from "react";
import { Clock, X } from "lucide-react";

const PRESETS = [
  { label: "En 1 hora", minutes: 60 },
  { label: "En 3 horas", minutes: 180 },
  { label: "Mañana 9:00", custom: () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d; } },
  { label: "Mañana 20:00", custom: () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(20,0,0,0); return d; } },
  { label: "Viernes 20:00", custom: () => { const d = new Date(); const diff = (5 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate()+diff); d.setHours(20,0,0,0); return d; } },
  { label: "Sábado 11:00", custom: () => { const d = new Date(); const diff = (6 - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate()+diff); d.setHours(11,0,0,0); return d; } },
];

const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function ScheduleSelector({ value, onChange }) {
  const [open, setOpen] = useState(!!value);

  const apply = (date) => {
    onChange(date.toISOString());
    setOpen(true);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 font-medium py-3 rounded-2xl flex items-center justify-center gap-2 border border-slate-700 transition-all"
      >
        <Clock className="w-4 h-4" /> Programar para más tarde (opcional)
      </button>
    );
  }

  return (
    <div className="bg-slate-800/80 rounded-2xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Programación
        </p>
        <button
          type="button"
          onClick={() => { onChange(null); setOpen(false); }}
          className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {PRESETS.map(p => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              const date = p.custom ? p.custom() : new Date(Date.now() + p.minutes*60000);
              apply(date);
            }}
            className="bg-slate-900/60 hover:bg-slate-700 text-slate-200 text-xs py-2 rounded-lg border border-slate-700 transition-all"
          >
            {p.label}
          </button>
        ))}
      </div>

      <input
        type="datetime-local"
        value={value ? toLocalInput(new Date(value)) : ""}
        onChange={(e) => {
          if (e.target.value) onChange(new Date(e.target.value).toISOString());
        }}
        min={toLocalInput(new Date())}
        className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white"
      />

      {value && (
        <p className="text-emerald-400 text-xs text-center font-medium">
          ✓ Se publicará: {new Date(value).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}