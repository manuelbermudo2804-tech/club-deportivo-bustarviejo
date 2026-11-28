import React, { useState } from "react";
import { AlertTriangle, Phone, ChevronDown, ClipboardList } from "lucide-react";
import CampusSalidaPanel from "@/components/campus/CampusSalidaPanel";

export const estadoDia = r => !r || r.estado === "pendiente" || !r.estado ? "pendiente" : r.estado === "ausente" ? "ausente" : r.hora_salida ? "salido" : "dentro";
const BADGE = {
  pendiente: ["Por llegar", "bg-amber-100 text-amber-800"],
  dentro: ["Ha llegado", "bg-green-100 text-green-800"],
  salido: ["Ha salido", "bg-slate-200 text-slate-700"],
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
      <div className="flex w-full items-center gap-2">
        <button onClick={() => setFicha(v => !v)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold text-slate-900">{p.nombre}</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">Grupo {p.grupo_edad || "—"}</span>
          </span>
          {!(estado === "pendiente" && !modoSalida) && <span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold " + cls}>{label}</span>}
          <ChevronDown className={"h-4 w-4 shrink-0 text-slate-400 transition " + (ficha ? "rotate-180" : "")} />
        </button>
        {estado === "pendiente" && !modoSalida && <>
          <button disabled={busy} onClick={e => { e.stopPropagation(); onLlega?.(); }} className="shrink-0 rounded-lg bg-green-600 px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">Ha llegado</button>
          <button disabled={busy} onClick={e => { e.stopPropagation(); onFalta?.(); }} className="shrink-0 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">Falta</button>
        </>}
        {estado === "ausente" && !modoSalida && <button disabled={busy} onClick={e => { e.stopPropagation(); onLlega?.(); }} className="shrink-0 rounded-lg border-2 border-green-600 px-3 py-2 text-xs font-black text-green-700 disabled:opacity-40">Ha llegado</button>}
      </div>
      {busy && <p className="mt-1 text-[11px] text-slate-500">Guardando…</p>}

      {ficha && <div className="mt-2 space-y-2 rounded-xl border bg-slate-50 p-3 text-xs text-slate-700">
        <div className="grid grid-cols-2 gap-2">
          <p><b>Fecha nacimiento:</b> {p.fecha_nacimiento || "No indicada"}</p>
          <p><b>Grupo:</b> {p.grupo_edad || "—"}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5">
          <p className="mb-1 font-extrabold text-red-800"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />Información médica</p>
          <div><b>Alergias:</b> {p.alergias || "Ninguna comunicada"}{p.alergia_gravedad ? " · Gravedad: " + p.alergia_gravedad : ""}</div>
          {p.alergia_reaccion && <div><b>Reacción:</b> {p.alergia_reaccion}</div>}
          <div><b>Intolerancias:</b> {p.intolerancias || "Ninguna comunicada"}</div>
          <div><b>Medicación:</b> {p.medicacion || "Ninguna comunicada"}</div>
          <div><b>¿Medicación durante el Campus?:</b> {p.medicacion_durante_campus === "si" ? "Sí" : p.medicacion_durante_campus === "no" ? "No" : "No indicado"}</div>
          {p.medicacion_durante_campus === "si" && <><div><b>Instrucciones:</b> {p.instrucciones_medicacion || "No indicadas"}</div><div className="font-bold text-red-800"><b>Autorización familiar:</b> {p.autorizacion_medicacion ? "Sí" : "NO CONSTA"}</div></>}
          {p.protocolo_emergencia && <div><b>Protocolo de emergencia:</b> {p.protocolo_emergencia}</div>}
          <div><b>Observaciones:</b> {p.observaciones_medicas || "Sin observaciones"}</div>
        </div>
        {p.salida_autonoma && <p className="rounded-lg border border-blue-200 bg-blue-50 p-2 font-bold text-blue-800">🚶 Autorización familiar para salir solo</p>}
        {r?.hora_entrada && <p><b>Hora de entrada:</b> {r.hora_entrada}</p>}
        {r?.hora_salida && <p><b>Hora de salida:</b> {r.hora_salida}</p>}
        <div className="border-t pt-2"><b>Contactos de emergencia</b>
          {contactos.length ? contactos.map((c, i) => <a key={i} href={"tel:" + tel(c[1])} className="mt-1 flex items-center gap-1.5 font-bold text-blue-700"><Phone className="h-3.5 w-3.5" />{c[0]} · {c[1]}</a>) : <p>No consta teléfono de emergencia.</p>}
        </div>
        <div className="border-t pt-2"><b>Personas autorizadas para recoger</b>
          {autorizados.length ? <div className="mt-1 space-y-1">{autorizados.map((a, i) => <div key={i} className="rounded-lg bg-white p-2"><b>{a.nombre}</b> · {a.parentesco || a.tipo || "Autorizado"}<p className="text-slate-500">DNI/NIE: {a.dni || "No consta"} · Teléfono: {a.telefono || "No consta"}</p></div>)}</div> : <p>No hay personas adicionales registradas; comprobar con el responsable legal.</p>}
        </div>
      </div>}

      {ficha && <>
      <div className="mt-3 flex flex-wrap gap-2">
        {estado === "dentro" && modoSalida && p.salida_autonoma && <button disabled={busy} onClick={onAutonoma} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-40">🚶 Registrar salida autónoma</button>}
        {estado === "dentro" && !modoSalida && <p className="flex-1 rounded-xl bg-green-50 px-3 py-2.5 text-xs font-bold text-green-800">✓ Dentro desde las {r?.hora_entrada || "—"}</p>}
        {estado === "dentro" && modoSalida && !p.salida_autonoma && !panelAbierto && <button disabled={busy} onClick={() => setSalida(true)} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-40">Registrar recogida</button>}
        {(estado === "dentro" || estado === "ausente" || estado === "salido") && <button disabled={busy} onClick={onDeshacer} className="rounded-xl border px-3 py-2.5 text-xs font-bold text-slate-600 disabled:opacity-40">Deshacer</button>}
        {estado === "salido" && <p className="flex-1 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">{r.persona_recoge?.startsWith("Salida autónoma") ? "Salió solo (autorizado)" : <>Entregado a <b>{r.persona_recoge || "persona autorizada"}</b></>} · {r.hora_salida}</p>}
      </div>
      {panelAbierto && <CampusSalidaPanel p={p} busy={busy} onClose={() => setSalida(false)} onAutonoma={onAutonoma} onPickup={onPickup} />}
      </>}
    </article>
  );
}
