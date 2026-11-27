import React, { useState } from "react";
import { AlertTriangle, Phone, ChevronDown, ClipboardList } from "lucide-react";
import CampusSalidaPanel from "@/components/campus/CampusSalidaPanel";

export const estadoDia = r => !r || r.estado === "pendiente" || !r.estado ? "pendiente" : r.estado === "ausente" ? "ausente" : r.hora_salida ? "salido" : "dentro";
const BADGE = {
  pendiente: ["Por llegar", "bg-amber-100 text-amber-800"],
  dentro: ["En el campus", "bg-green-100 text-green-800"],
  salido: ["Ya ha salido", "bg-slate-200 text-slate-700"],
  ausente: ["Falta", "bg-red-100 text-red-800"],
};
const tel = n => String(n || "").replace(/[^\d+]/g, "");

export default function CampusAlumnoFila({ p, r, busy, modoSalida, onLlega, onFalta, onDeshacer, onPickup, onAutonoma }) {
  const [salida, setSalida] = useState(false);
  const [ficha, setFicha] = useState(false);
  const estado = estadoDia(r);
  const panelAbierto = estado === "dentro" && salida;
  const salud = [p.alergias && "Alergias: " + p.alergias, p.intolerancias && "Intolerancias: " + p.intolerancias, p.medicacion && "Medicación: " + p.medicacion].filter(Boolean);
  const [label, cls] = BADGE[estado];
  const contactos = [
    [p.contacto_emergencia_nombre || p.responsable?.nombre || "Responsable legal", p.contacto_emergencia_telefono || p.responsable?.telefono],
    [p.contacto_emergencia_2_nombre, p.contacto_emergencia_2_telefono],
  ].filter(c => c[1]);
  const autorizados = p.autorizado_recogida || [];

  return (
    <article className={"rounded-2xl border bg-white p-3 shadow-sm " + (modoSalida && estado === "dentro" ? (p.salida_autonoma ? "border-l-8 border-l-blue-500 " : "border-l-8 border-l-orange-500 ") : "") + (estado === "pendiente" ? "border-amber-200" : "border-slate-200")}>
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setFicha(v => !v)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-base font-black text-slate-900">{p.nombre}</p>
          <p className="text-xs text-slate-500">Grupo {p.grupo_edad || "—"}{r?.hora_entrada ? " · Entrada " + r.hora_entrada : ""}{r?.hora_salida ? " · Salida " + r.hora_salida : ""}</p>
        </button>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black " + cls}>{label}</span>
      </div>

      {p.salida_autonoma && <p className="mt-2 rounded-lg bg-blue-50 px-2 py-1.5 text-xs font-bold text-blue-800">🚶 Autorizado por su familia para salir solo</p>}
      {salud.length > 0 ? (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-bold text-red-800"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{salud.join(" · ")}</div>
      ) : (
        <p className="mt-2 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-500">Sin alertas médicas comunicadas</p>
      )}

      <div className="mt-2 flex flex-wrap gap-2">
        {contactos.map((c, i) => (
          <a key={i} href={"tel:" + tel(c[1])} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-bold text-blue-800">
            <Phone className="h-3.5 w-3.5" />{c[0]} · {c[1]}
          </a>
        ))}
        <button onClick={() => setFicha(v => !v)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700">
          <ClipboardList className="h-3.5 w-3.5" />Ficha completa <ChevronDown className={"h-3 w-3 transition " + (ficha ? "rotate-180" : "")} />
        </button>
      </div>

      {ficha && <div className="mt-2 space-y-2 rounded-xl border bg-slate-50 p-3 text-xs text-slate-700">
        <div className="grid grid-cols-2 gap-2">
          <p><b>Fecha nacimiento:</b> {p.fecha_nacimiento || "No indicada"}</p>
          <p><b>Grupo:</b> {p.grupo_edad || "—"}</p>
        </div>
        <div><b>Alergias:</b> {p.alergias || "Ninguna indicada"}</div>
        <div><b>Intolerancias:</b> {p.intolerancias || "Ninguna indicada"}</div>
        <div><b>Medicación:</b> {p.medicacion || "Ninguna indicada"}</div>
        <div><b>Observaciones médicas:</b> {p.observaciones_medicas || "Sin observaciones"}</div>
        <div className="border-t pt-2"><b>Contactos de emergencia</b>
          {contactos.length ? contactos.map((c, i) => <a key={i} href={"tel:" + tel(c[1])} className="mt-1 flex items-center gap-1.5 font-bold text-blue-700"><Phone className="h-3.5 w-3.5" />{c[0]} · {c[1]}</a>) : <p>No consta teléfono de emergencia.</p>}
        </div>
        <div className="border-t pt-2"><b>Personas autorizadas para recoger</b>
          {autorizados.length ? <div className="mt-1 space-y-1">{autorizados.map((a, i) => <div key={i} className="rounded-lg bg-white p-2"><b>{a.nombre}</b> · {a.parentesco || a.tipo || "Autorizado"}<p className="text-slate-500">DNI/NIE: {a.dni || "No consta"} · Teléfono: {a.telefono || "No consta"}</p></div>)}</div> : <p>No hay personas adicionales registradas; comprobar con el responsable legal.</p>}
        </div>
      </div>}

      <div className="mt-3 flex gap-2">
        {estado === "pendiente" && <><button disabled={busy} onClick={onLlega} className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-black text-white disabled:opacity-40">✓ Ha llegado</button><button disabled={busy} onClick={onFalta} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40">Falta</button></>}
        {estado === "dentro" && modoSalida && p.salida_autonoma && <button disabled={busy} onClick={onAutonoma} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-40">🚶 Registrar salida autónoma</button>}
        {estado === "dentro" && !modoSalida && <p className="flex-1 rounded-xl bg-green-50 px-3 py-2.5 text-xs font-bold text-green-800">✓ Dentro desde las {r?.hora_entrada || "—"}</p>}
        {estado === "dentro" && modoSalida && !p.salida_autonoma && !panelAbierto && <button disabled={busy} onClick={() => setSalida(true)} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-40">Registrar recogida</button>}
        {estado === "ausente" && <button disabled={busy} onClick={onLlega} className="flex-1 rounded-xl border-2 border-green-600 py-2.5 text-sm font-black text-green-700 disabled:opacity-40">Ha llegado tarde</button>}
        {(estado === "dentro" || estado === "ausente" || estado === "salido") && <button disabled={busy} onClick={onDeshacer} className="rounded-xl border px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40">Deshacer</button>}
        {estado === "salido" && <p className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">{r.persona_recoge?.startsWith("Salida autónoma") ? "Salió solo (autorizado)" : <>Entregado a <b>{r.persona_recoge || "persona autorizada"}</b></>} · {r.hora_salida}</p>}
      </div>
      {busy && <p className="mt-1 text-[11px] text-slate-500">Guardando…</p>}
      {panelAbierto && <CampusSalidaPanel p={p} busy={busy} onClose={() => setSalida(false)} onAutonoma={onAutonoma} onPickup={onPickup} />}
    </article>
  );
}
