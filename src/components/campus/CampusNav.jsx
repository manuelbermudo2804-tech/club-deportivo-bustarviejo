import React from "react";

const SECTIONS = [
  { key: "resumen", label: "Resumen", help: "Lo que necesita tu atención y cómo van las plazas cada semana.", tabs: [["resumen", "Resumen"]] },
  { key: "familias", label: "Familias", help: "Cada inscripción: estado, pago, contacto y ficha de salud de los menores.", tabs: [["inscripciones", "Familias"]] },
  { key: "grupos", label: "Participantes y grupos", help: "Busca menores, haz grupos y descarga listados en PDF.", tabs: [["organizacion", "Participantes"]] },
  { key: "espera", label: "Lista de espera", help: "Abre o cierra la lista de espera y gestiona las solicitudes por orden.", tabs: [["lista_espera", "Lista de espera"]] },
  { key: "comunicaciones", label: "Comunicaciones", help: "Envía correos o WhatsApp a una familia o a varias a la vez.", tabs: [["comunicaciones", "Comunicaciones"]] },
  { key: "equipo", label: "Monitores y asistencia", help: "Da acceso a los monitores y pasa lista durante el campus.", tabs: [["asistencia", "Pasar lista"], ["monitores", "Accesos de monitores"]] },
  { key: "ajustes", label: "Ajustes", help: "Se configura una vez: fechas de lanzamiento, plazas por semana y precios.", tabs: [["campana", "Lanzamiento"], ["plazas", "Plazas y monitores"], ["configuracion", "Precios"]] },
];

export default function CampusNav({ tab, setTab }) {
  const current = SECTIONS.find(s => s.tabs.some(([k]) => k === tab)) || SECTIONS[0];
  return (
    <nav aria-label="Secciones del Campus" className="sticky top-2 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setTab(s.tabs[0][0])} aria-current={current.key === s.key ? "page" : undefined}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition ${current.key === s.key ? "border-orange-600 bg-orange-600 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-200 hover:bg-orange-50"}`}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <p className="text-sm text-slate-600">{current.help}</p>
        {current.tabs.length > 1 && (
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {current.tabs.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${tab === k ? "bg-white text-orange-700 shadow" : "text-slate-600"}`}>{label}</button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}