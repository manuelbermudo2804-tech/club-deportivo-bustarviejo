import React, { useState } from "react";
import { AlertTriangle, Phone, ChevronDown } from "lucide-react";
import CampusSalidaPanel from "@/components/campus/CampusSalidaPanel";

export const estadoDia = r => !r || r.estado === "pendiente" || !r.estado ? "pendiente" : r.estado === "ausente" ? "ausente" : r.hora_salida ? "salido" : "dentro";
const BADGE = {
  pendiente: ["Por llegar", "bg-amber-100 text-amber-800"],
  dentro: ["En el campus", "bg-green-100 text-green-800"],
  salido: ["Ya ha salido", "bg-slate-200 text-slate-700"],
  ausente: ["Falta", "bg-red-100 text-red-800"],
};
const tel = n => String(n || "").replace(/[^\d+]/g, "");

export default function CampusAlumnoFila({ p, r, busy, onLlega, onFalta, onDeshacer, onPickup, onAutonoma }) {
  const [salida, setSalida] = useState(false);
  const [ficha, setFicha] = useState(false);
  const estado = estadoDia(r);
  const salud = [p.alergias && "Alergias: " + p.alergias, p.intolerancias && "Intolerancias: " + p.intolerancias, p.medicacion && "Medicación: " + p.medicacion].filter(Boolean);
  const [label, cls] = BADGE[estado];
  return (
    <div className={"rounded-2xl border bg-white p-3 shadow-sm " + (estado === "pendiente" ? "border-amber-200" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setFicha(v => !v)} className="min-w-0 text-left">
          <p className="truncate text-base font-black text-slate-900">{p.nombre}</p>
          <p className="text-xs text-slate-500">Grupo {p.grupo_edad || "—"}{r?.hora_entrada ? " · Entra " + r.hora_entrada : ""}{r?.hora_salida ? " · Sale " + r.hora_salida : ""}{p.salida_autonoma ? " · Puede salir solo" : ""}<ChevronDown className={"ml-1 inline h-3 w-3 transition " + (ficha ? "rotate-180" : "")} /></p>
        </button>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black " + cls}>{label}</span>
      </div>
      {salud.length > 0 && <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{salud.join(" · ")}</div>}
      {ficha && <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
        {p.observaciones_medicas && <p><b>Observaciones:</b> {p.observaciones_medicas}</p>}
        {[[p.contacto_emergencia_nombre || p.responsable?.nombre, p.contacto_emergencia_telefono || p.responsable?.telefono], [p.contacto_emergencia_2_nombre, p.contacto_emergencia_2_telefono]].filter(c => c[1]).map((c, i) => <a key={i} href={"tel:" + tel(c[1])} className="flex items-center gap-1.5 font-bold text-blue-700"><Phone className="h-3.5 w-3.5" />{c[0] || "Contacto"} · {c[1]}</a>)}
        <p><b>Recogen:</b> {(p.autorizado_recogida || []).map(a => a.nombre).join(" / ") || "—"}</p>
      </div>}
      <div className="mt-3 flex gap-2">
        {estado === "pendiente" && <><button disabled={busy} onClick={onLlega} className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-black text-white disabled:opacity-40">✓ Ha llegado</button><button disabled={busy} onClick={onFalta} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Falta</button></>}
        {estado === "dentro" && <button disabled={busy} onClick={() => setSalida(v => !v)} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-40">Registrar salida</button>}
        {estado === "ausente" && <button disabled={busy} onClick={onLlega} className="flex-1 rounded-xl border-2 border-green-600 py-2.5 text-sm font-black text-green-700 disabled:opacity-40">Ha llegado tarde</button>}
        {(estado === "dentro" || estado === "ausente") && <button disabled={busy} onClick={onDeshacer} className="rounded-xl border px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40">Deshacer</button>}
        {estado === "salido" && <p className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">Entregado a <b>{r.persona_recoge || "—"}</b></p>}
      </div>
      {busy && <p className="mt-1 text-[11px] text-slate-500">Guardando…</p>}
      {salida && estado === "dentro" && <CampusSalidaPanel p={p} busy={busy} onClose={() => setSalida(false)} onAutonoma={onAutonoma} onPickup={onPickup} />}
    </div>
  );
}