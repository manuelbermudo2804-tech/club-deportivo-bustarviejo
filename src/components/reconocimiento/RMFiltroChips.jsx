import React from "react";
import { Stethoscope } from "lucide-react";
import { estadoRM } from "@/lib/reconocimiento";
import FiltroGrupo from "@/components/federation/FiltroGrupo";

const OPCIONES = [
  { value: "all", label: "Todos", on: "bg-slate-800 text-white border-slate-800" },
  { value: "caducado", label: "Caducado", on: "bg-red-600 text-white border-red-600" },
  { value: "vence", label: "Vence pronto", on: "bg-orange-500 text-white border-orange-500" },
  { value: "vigente", label: "Vigente", on: "bg-green-600 text-white border-green-600" },
  { value: "sin", label: "Sin fecha", on: "bg-slate-600 text-white border-slate-600" },
  { value: "cita", label: "Con cita", on: "bg-blue-600 text-white border-blue-600" },
];

const esBaloncesto = (p) => `${p.categoria_principal || ""} ${p.deporte || ""}`.toLowerCase().includes("baloncesto");

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
  const opciones = OPCIONES.map((o) => ({ ...o, count: players.filter((p) => rmCoincide(o.value, p, byJugador)).length }));
  return <FiltroGrupo icon={Stethoscope} titulo="Reconocimiento médico" color="bg-blue-50/60 border-blue-100" opciones={opciones} value={value} onChange={onChange} />;
}