import React from "react";

const WEEK_KEYS = ["S1", "S2", "S3", "S4", "S5"];

export default function CampusPlazasResumen({ groupStats, participants, maxTotal }) {
  const weeklyTotals = WEEK_KEYS.map(w => ({ w, n: participants.filter(p => (p.semanas_ocupadas || []).includes(w)).length }));
  const peakTotal = weeklyTotals.reduce((a, b) => (b.n > a.n ? b : a), { w: "—", n: 0 });
  const perWeekByGroups = groupStats.reduce((s, g) => s + g.capacity, 0);

  return (
    <>
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[.18em] text-orange-600">Organización de plazas</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Capacidad y edades</h2>
      </div>
      <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-700">
        <p className="font-black text-slate-900">Cómo funcionan las plazas</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Cada grupo de edad tiene un número de plazas <b>en cada semana</b>. Ej.: 20 plazas de Iniciación en la semana 1, otras 20 en la semana 2, etc.</li>
          <li>El <b>máximo general</b> es el tope de menores en total en <b>una misma semana</b>, sumando los tres grupos.</li>
          <li>Un menor apuntado a una quincena o al mes ocupa plaza en <b>cada una</b> de sus semanas.</li>
          <li>Cuando una casilla grupo/semana se llena, el formulario público <b>no deja</b> apuntar a más menores de ese grupo en esa semana.</li>
          <li>El grupo de edad se decide por la edad que tenga el menor el primer día del Campus.</li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">El detalle semana a semana está en el calendario de ocupación de la pestaña Resumen.</p>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="text-xs font-semibold text-slate-300">Menores inscritos (sin repetir)</p><p className="mt-1 text-3xl font-black">{participants.length}</p></div>
        <div className="rounded-2xl bg-orange-600 p-4 text-white"><p className="text-xs font-semibold text-orange-100">Semana más llena</p><p className="mt-1 text-3xl font-black">{peakTotal.n}{maxTotal > 0 && <span className="text-lg"> / {maxTotal}</span>}</p><p className="text-xs text-orange-100">{peakTotal.n > 0 ? peakTotal.w.replace("S", "Semana ") : "Sin inscritos"} · máximo general por semana</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Plazas de los 3 grupos en una semana</p><p className="mt-1 text-2xl font-black text-slate-950">{perWeekByGroups > 0 ? perWeekByGroups : "Sin definir"}</p>{maxTotal > 0 && perWeekByGroups > maxTotal && <p className="text-xs text-amber-700">Supera el máximo general ({maxTotal}): este será el que limite.</p>}</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {groupStats.map(g => {
          const full = g.capacity > 0 && g.peak >= g.capacity;
          return (
            <div key={g.key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-slate-700">{g.label}</p><p className="text-xs text-slate-500">{g.range}</p>
              <p className="mt-3 text-sm text-slate-600"><b className="text-2xl font-black text-slate-950">{g.count}</b> menores en total</p>
              <p className="mt-2 text-xs font-semibold text-slate-500">Plazas por semana: {g.capacity || "sin límite"}</p>
              <div className="mt-2 flex gap-1">
                {WEEK_KEYS.map((w, i) => {
                  const n = g.weekly[i];
                  const color = !(g.capacity > 0) ? "bg-slate-100 text-slate-700" : n >= g.capacity ? "bg-red-100 text-red-800" : n / g.capacity >= 0.75 ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800";
                  return <div key={w} className={`flex-1 rounded-lg p-1.5 text-center ${color}`}><p className="text-[10px] font-bold">S{i + 1}</p><p className="text-sm font-black">{n}</p></div>;
                })}
              </div>
              <p className={`mt-2 text-xs font-semibold ${full ? "text-red-700" : "text-slate-500"}`}>{full ? "Hay alguna semana completa" : g.capacity > 0 ? `Semana más llena: ${g.peak} de ${g.capacity}` : "Sin límite configurado"}</p>
            </div>
          );
        })}
      </div>
      {maxTotal > 0 && peakTotal.n > maxTotal && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">Atención: en la {peakTotal.w.replace("S", "semana ")} se supera el máximo general en {peakTotal.n - maxTotal} menor(es).</div>}
    </>
  );
}