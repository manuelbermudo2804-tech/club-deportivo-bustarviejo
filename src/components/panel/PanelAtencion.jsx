import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";

const TONOS = {
  rojo: "border-red-500/40 bg-red-500/10 text-red-200",
  ambar: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

const AMBITOS = { familia: "👨‍👩‍👧 Familia", equipo: "🧢 Equipo" };

export default function PanelAtencion({ items = [] }) {
  if (items.length === 0) {
    return (
      <div className="bg-slate-800/60 border-2 border-slate-700 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
        <p className="text-slate-300 text-sm">No tienes nada pendiente. Todo al día.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <h2 className="text-white font-bold text-sm uppercase tracking-wide">Requiere tu atención</h2>
      </div>
      {items.map((it, i) => (
        <Link key={i} to={it.url}>
          <div className={`border-2 rounded-2xl p-3 flex items-center justify-between gap-3 ${TONOS[it.tono] || TONOS.ambar}`}>
            <div className="min-w-0">
              <p className="text-[11px] opacity-80">{AMBITOS[it.ambito]}</p>
              <p className="font-semibold text-sm truncate">{it.texto}</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-70" />
          </div>
        </Link>
      ))}
    </div>
  );
}