import React from "react";

export default function CampusFichaMenor({ k }) {
  const autorizados = k.autorizados_recogida || [];
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
      <p className="text-sm font-bold text-slate-900">{k.nombre}</p>
      <p><b>Alergias:</b> {k.alergias || "No indicado"}</p>
      <p><b>Intolerancias:</b> {k.intolerancias || "No indicado"}</p>
      <p><b>Medicación:</b> {k.medicacion || "No indicada"}</p>
      <p><b>Observaciones:</b> {k.observaciones_medicas || "Ninguna"}</p>
      <p><b>Emergencia 1:</b> {k.contacto_emergencia_nombre || "—"} · {k.contacto_emergencia_telefono || "—"}</p>
      <p><b>Emergencia 2:</b> {k.contacto_emergencia_2_nombre || "—"} · {k.contacto_emergencia_2_telefono || "—"}</p>
      <p><b>Recogida:</b> {autorizados.length ? autorizados.map(a => `${a.nombre} (DNI ${a.dni}, ${a.telefono}${a.parentesco ? `, ${a.parentesco}` : ""})`).join(" · ") : "Sin personas adicionales"}</p>
      <p><b>Consentimiento salud:</b> {k.consentimiento_salud ? "Sí" : "No consta"} · <b>Imagen:</b> {k.autorizacion_imagen === "si" ? "Sí autoriza" : k.autorizacion_imagen === "no" ? "No autoriza" : "Pendiente"}</p>
    </div>
  );
}