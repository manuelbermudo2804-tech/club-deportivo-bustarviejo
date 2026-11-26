import React from "react";

const WEEKS = ["S1", "S2", "S3", "S4", "S5"];

export default function CampusListadosRapidos({ groupStats, onPick }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-5">
      <h2 className="text-xl font-black">Listados rápidos</h2>
      <p className="mt-1 text-sm text-slate-600">Pulsa una casilla para ver los niños de ese grupo en esa semana. Abajo podrás exportarlos a PDF o repartirlos en subgrupos (por ejemplo, "Iniciación S1 · Grupo A").</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500"><th className="p-2">Grupo</th>{WEEKS.map((w, i) => <th key={w} className="p-2 text-center">Semana {i + 1}</th>)}</tr></thead>
        <tbody>{groupStats.map(g => (
          <tr key={g.key}><td className="p-2 font-semibold">{g.label}<div className="text-xs font-normal text-slate-500">{g.range}</div></td>
            {WEEKS.map((w, i) => <td key={w} className="p-1"><button onClick={() => onPick(w, g.key)} disabled={!g.weekly[i]} className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 font-black hover:border-orange-400 hover:bg-orange-50 disabled:opacity-40">{g.weekly[i]} <span className="text-xs font-normal text-slate-500">niños</span></button></td>)}
          </tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}