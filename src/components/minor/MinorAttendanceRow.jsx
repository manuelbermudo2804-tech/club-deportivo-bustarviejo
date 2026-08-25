import React from "react";
import { CheckCircle2, XCircle, Clock, Star } from "lucide-react";

export const ESTADOS = [
  { key: "presente", icon: CheckCircle2, label: "Presente", on: "bg-green-100 text-green-700" },
  { key: "tardanza", icon: Clock, label: "Tarde", on: "bg-orange-100 text-orange-700" },
  { key: "ausente", icon: XCircle, label: "Ausente", on: "bg-red-100 text-red-700" },
];

export default function MinorAttendanceRow({ player, estado, valoracion = {}, puedeValorar, onEstado, onValoracion }) {
  const ausente = estado === "ausente";

  return (
    <div className="bg-slate-50 rounded-xl p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {player.foto_url ? (
            <img src={player.foto_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs">⚽</div>
          )}
          <span className="text-sm font-medium text-slate-800 truncate">{player.nombre}</span>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {ESTADOS.map((e) => {
            const Icon = e.icon;
            const sel = estado === e.key;
            return (
              <button
                key={e.key}
                title={e.label}
                onClick={() => onEstado(e.key)}
                className={`p-2 rounded-lg ${sel ? e.on : "bg-white text-slate-400"}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {puedeValorar && !ausente && (
        <div className="pl-10 space-y-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 mr-1">Actitud</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                title={`${n} de 5`}
                onClick={() => onValoracion({ ...valoracion, actitud: n })}
              >
                <Star className={`w-4 h-4 ${(valoracion.actitud || 0) >= n ? "text-amber-500 fill-amber-500" : "text-slate-300"}`} />
              </button>
            ))}
          </div>
          <input
            type="text"
            value={valoracion.observaciones || ""}
            onChange={(e) => onValoracion({ ...valoracion, observaciones: e.target.value })}
            placeholder="Nota corta del entrenamiento (opcional)"
            className="w-full h-9 rounded-lg border border-slate-200 px-2.5 text-xs bg-white"
          />
        </div>
      )}
    </div>
  );
}