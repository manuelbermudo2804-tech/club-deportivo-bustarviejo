import React from "react";

const WEEKS = ["S1", "S2", "S3", "S4", "S5"];
const RATIO_FIELD = { "6-8": "ratio_6_8", "9-11": "ratio_9_11", "12-16": "ratio_12_16" };

export default function CampusMonitorPlanner({ groupStats, settings, updateSetting }) {
  const ready = groupStats.every(g => g.ratio > 0);
  const need = (n, ratio) => (ratio > 0 && n > 0 ? Math.ceil(n / ratio) : 0);
  const weekTotals = WEEKS.map((_, i) => groupStats.reduce((s, g) => s + need(g.weekly[i], g.ratio), 0));
  const peak = Math.max(0, ...weekTotals);
  const available = Number(settings?.monitores_disponibles || 0);

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-black text-slate-900">¿Cuántos monitores necesito?</h3>
      <p className="mt-1 text-sm text-slate-600"><b>Paso 1:</b> indica cuántos niños puede llevar <b>un</b> monitor en cada grupo (por ejemplo, 8 los pequeños y 12 los mayores).</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {groupStats.map(g => (
          <label key={g.key} className="rounded-xl bg-slate-50 p-3 text-sm font-bold">{g.label} · {g.range}
            <div className="mt-1 flex items-center gap-2"><span className="text-xs font-normal text-slate-500">1 monitor por cada</span>
              <input type="number" min="1" value={settings?.[RATIO_FIELD[g.key]] ?? ""} onChange={e => updateSetting(RATIO_FIELD[g.key], e.target.value)} className="w-20 rounded-lg border bg-white p-2" placeholder="10" />
              <span className="text-xs font-normal text-slate-500">niños</span></div>
          </label>
        ))}
      </div>
      <p className="mt-5 text-sm text-slate-600"><b>Paso 2:</b> el sistema mira cuántos niños hay inscritos cada semana y calcula los monitores necesarios.</p>
      {!ready ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Rellena los tres números del paso 1 para ver el cálculo.</p> : (
        <div className="mt-3 overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b text-left text-slate-500"><th className="p-2">Grupo</th>{WEEKS.map((w, i) => <th key={w} className="p-2 text-center">Semana {i + 1}</th>)}</tr></thead>
          <tbody>
            {groupStats.map(g => <tr key={g.key} className="border-b"><td className="p-2 font-semibold">{g.label}</td>{g.weekly.map((n, i) => <td key={i} className="p-2 text-center"><b>{need(n, g.ratio)}</b> <span className="text-xs text-slate-400">({n} niños)</span></td>)}</tr>)}
            <tr className="bg-orange-50 font-black"><td className="p-2">Total monitores</td>{weekTotals.map((t, i) => <td key={i} className={`p-2 text-center ${available > 0 && t > available ? "text-red-700" : ""}`}>{t}</td>)}</tr>
          </tbody>
        </table></div>
      )}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-orange-600 p-4 text-white"><p className="text-xs font-semibold text-orange-100">Monitores que necesitas como mínimo</p><p className="mt-1 text-4xl font-black">{ready ? peak : "—"}</p><p className="text-xs text-orange-100">Los de la semana con más niños</p></div>
        <label className="rounded-xl border p-4 text-sm font-bold">Paso 3 (opcional): monitores que ya tienes
          <input type="number" min="0" value={settings?.monitores_disponibles ?? ""} onChange={e => updateSetting("monitores_disponibles", e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal" placeholder="Ej. 6" />
          {ready && available > 0 && <p className={`mt-2 text-sm ${available >= peak ? "text-emerald-700" : "text-red-700"}`}>{available >= peak ? "Tienes suficientes monitores todas las semanas." : `Te faltan ${peak - available} en la semana más llena (las semanas en rojo).`}</p>}
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">Cálculo orientativo: no sustituye la normativa de ratios ni los turnos o necesidades especiales.</p>
    </div>
  );
}