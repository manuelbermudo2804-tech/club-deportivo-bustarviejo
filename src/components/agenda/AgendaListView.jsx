import React from "react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import AgendaItemCard from "./AgendaItemCard";

function etiquetaDia(iso) {
  const d = parseISO(iso);
  if (isToday(d)) return "Hoy";
  if (isTomorrow(d)) return "Mañana";
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

export default function AgendaListView({ items }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-slate-500">No hay nada programado en estas fechas</p>
      </div>
    );
  }

  const porDia = items.reduce((acc, item) => {
    (acc[item.date] = acc[item.date] || []).push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.keys(porDia).sort().map((iso) => (
        <div key={iso} className="min-w-0">
          <h3 className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold uppercase tracking-wide text-slate-700 capitalize"><span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />
            {etiquetaDia(iso)}
          </h3>
          <div className="space-y-2">
            {porDia[iso].map((item) => (
              <AgendaItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}