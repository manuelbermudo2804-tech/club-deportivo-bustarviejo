import React from "react";
import { Stethoscope } from "lucide-react";
import { estadoRM } from "@/lib/reconocimiento";

const OPCIONES = [
  { value: "all", label: "Todos", on: "bg-slate-800 text-white border-slate-800" },
  { value: "caducado", label: "Caducado", on: "bg-red-600 text-white border-red-600" },
  { value: "vence", label: "Vence pronto", on: "bg-orange-500 text-white border-orange-500" },
  { value: "vigente", label: "Vigente", on: "bg-green-600 text-white border-green-600" },
  { value: "sin", label: "Sin reconocimiento", on: "bg-slate-600 text-white border-slate-600" },
  { value: "cita", label: "Con cita subida", on: "bg-blue-600 text-white border-blue-600" },
];

const esBaloncesto = (p) => `${p.categoria_principal || ""} ${p.deporte || ""}`.toLowerCase().includes("baloncesto");

// Devuelve el estado de reconocimiento de un jugador (null si no aplica: baloncesto)
export function rmEstadoJugador(player, byJugador) {
  if (esBaloncesto(player)) return null;
  const rm = byJugador[player.id];
  if (!rm || !rm.fecha_vencimiento) return "sin";
  return ["sin", "caducado", "vence", "vigente"][estadoRM(rm.fecha_vencimiento).orden];
}

export function rmCoincide(filtro, player, byJugador) {
  if (filtro === "all") return true;
  if (filtro === "cita") return !esBaloncesto(player) && !!byJugador[player.id]?.cita_pdf_uri;
  return rmEstadoJugador(player, byJugador) === filtro;
}

export default function RMFiltroChips({ value, onChange, players, byJugador }) {
  const contar = (v) => players.filter((p) => rmCoincide(v, p, byJugador)).length;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
        <Stethoscope className="w-4 h-4 text-blue-600" /> Reconocimiento médico
      </p>
      <div className="flex flex-wrap gap-2">
        {OPCIONES.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border ${value === o.value ? o.on : "bg-white text-slate-700 border-slate-200"}`}
          >
            {o.label} ({contar(o.value)})
          </button>
        ))}
      </div>
    </div>
  );
}