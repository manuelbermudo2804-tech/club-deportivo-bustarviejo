import React from "react";

const fecha = (v) => v ? new Date(v + "T12:00:00").toLocaleDateString("es-ES") : "—";
const money = (v) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(v || 0));

export default function CampusFichaMenor({ k }) {
  const autorizados = k.autorizados_recogida || [];
  const solo = k.salida_modalidad === "salida_autonoma" && k.autorizacion_salida_solo;
  const salud = [k.alergias && "Alergias: " + k.alergias, k.intolerancias && "Intolerancias: " + k.intolerancias, k.medicacion && "Medicación: " + k.medicacion].filter(Boolean);
  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-black text-slate-900">{k.nombre}</p>
        <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black " + (solo ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800")}>{solo ? "🚶 Sale solo" : "🔒 Le recogen"}</span>
      </div>
      <p><b>Nacimiento:</b> {fecha(k.fecha_nacimiento)} ({k.edad_inicio ?? "—"} años) · <b>Grupo:</b> {k.grupo_edad || "—"}{k.grupo_manual ? " · " + k.grupo_manual : ""}</p>
      <p><b>Semanas:</b> {(k.semanas_ocupadas || []).join(", ") || "—"} · <b>Precio:</b> {money(k.precio_aplicado)} · <b>Estado:</b> {k.estado || "—"}</p>
      {salud.length > 0 ? <p className="rounded-md bg-red-50 px-2 py-1 font-bold text-red-800">⚠️ {salud.join(" · ")}</p> : <p><b>Salud:</b> Sin alergias, intolerancias ni medicación</p>}
      {k.observaciones_medicas && <p><b>Observaciones:</b> {k.observaciones_medicas}</p>}
      <p><b>Emergencia 1:</b> {k.contacto_emergencia_nombre || "—"} · {k.contacto_emergencia_telefono || "—"}</p>
      {(k.contacto_emergencia_2_nombre || k.contacto_emergencia_2_telefono) && <p><b>Emergencia 2:</b> {k.contacto_emergencia_2_nombre || "—"} · {k.contacto_emergencia_2_telefono || "—"}</p>}
      <p><b>Recogida:</b> {autorizados.length ? autorizados.map(a => `${a.nombre} (DNI ${a.dni || "—"}, ${a.telefono || "—"}${a.parentesco ? `, ${a.parentesco}` : ""})`).join(" · ") : "Solo el responsable legal"}</p>
      <p><b>Consentimiento salud:</b> {k.consentimiento_salud ? "Sí" : "No consta"} · <b>Imagen:</b> {k.autorizacion_imagen === "si" ? "Sí autoriza" : k.autorizacion_imagen === "no" ? "No autoriza" : "Pendiente"}</p>
      {k.observaciones_admin && <p className="text-slate-500"><b>Nota interna:</b> {k.observaciones_admin}</p>}
    </div>
  );
}