import React from "react";

const cellStyle = (count, cap) => {
  if (!(cap > 0)) return "border-slate-200 bg-slate-50 text-slate-700";
  if (count >= cap) return "border-red-300 bg-red-50 text-red-800";
  if (count / cap >= 0.75) return "border-amber-300 bg-amber-50 text-amber-800";
  return "border-emerald-200 bg-emerald-50 text-emerald-800";
};

function Cell({ count, cap }) {
  const full = cap > 0 && count >= cap;
  return (
    <td className="p-1.5">
      <div className={`rounded-xl border p-3 text-center ${cellStyle(count, cap)}`}>
        <p className="text-xl font-black">{count}{cap > 0 && <span className="text-sm font-bold opacity-70"> / {cap}</span>}</p>
        <p className="text-[11px] font-bold uppercase tracking-wide">
          {!(cap > 0) ? "sin límite" : full ? (count > cap ? `Superado +${count - cap}` : "Completo") : `${cap - count} libres`}
        </p>
      </div>
    </td>
  );
}

export default function CampusOccupancyCalendar({ groups, weeks, participants, settings, groupFor }) {
  const capField = { "6-8": "plazas_6_8", "9-11": "plazas_9_11", "12-16": "plazas_12_16" };
  const total = Number(settings?.maximo_total || 0);
  const countFor = (week, group) => participants.filter(p => (p.semanas_ocupadas || []).includes(week) && (!group || groupFor(p) === group)).length;

  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="text-xl font-black">Calendario de ocupación</h2>
      <p className="mb-4 mt-1 text-sm text-slate-500">Las plazas se cuentan por grupo y por semana: cada casilla indica cuántos menores tiene ese grupo esa semana y cuántas plazas tiene. Las quincenas y el mes completo ocupan plaza en todas sus semanas.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs uppercase tracking-wide text-slate-500">Grupo</th>
              {weeks.map(w => <th key={w.key} className="p-2 text-center"><p className="font-black text-slate-900">{w.label}</p><p className="text-xs font-normal text-slate-500">{w.dates}</p></th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.key}>
                <td className="p-2"><p className="font-bold text-slate-900">{g.label}</p><p className="text-xs text-slate-500">{g.range}</p></td>
                {weeks.map(w => <Cell key={w.key} count={countFor(w.key, g.key)} cap={Number(settings?.[capField[g.key]] || 0)} />)}
              </tr>
            ))}
            <tr>
              <td className="border-t p-2"><p className="font-black text-slate-900">Total semana</p><p className="text-xs text-slate-500">Máximo general</p></td>
              {weeks.map(w => <Cell key={w.key} count={countFor(w.key)} cap={total} />)}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-200" />Hay plazas</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-200" />Casi lleno (75 % o más)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-200" />Completo</span>
      </div>
    </section>
  );
}