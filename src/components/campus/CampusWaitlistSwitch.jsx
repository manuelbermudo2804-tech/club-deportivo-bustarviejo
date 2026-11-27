import React from "react";

export default function CampusWaitlistSwitch({ active, saving, onToggle }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-5 flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-2xl">
        <h2 className="text-lg font-black text-slate-950">Formulario de lista de espera en la web</h2>
        <p className="mt-1 text-sm text-slate-600">Enciéndelo cuando quieras recibir solicitudes. Apagado, el formulario no se muestra y no entran nuevas; las que ya hay se conservan.</p>
        <p className={`mt-2 text-sm font-black ${active ? "text-emerald-700" : "text-slate-500"}`}>{active ? "● ABIERTA" : "● CERRADA"}</p>
      </div>
      <button type="button" role="switch" aria-checked={active} onClick={() => onToggle(!active)} disabled={saving}
        className={`relative inline-flex h-10 w-[76px] shrink-0 items-center rounded-full p-1 transition disabled:opacity-50 ${active ? "bg-emerald-600" : "bg-slate-300"}`}>
        <span className={`h-8 w-8 rounded-full bg-white shadow transition-transform ${active ? "translate-x-9" : "translate-x-0"}`} />
        <span className="sr-only">Abrir lista de espera</span>
      </button>
    </div>
  );
}