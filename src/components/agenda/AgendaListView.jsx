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
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
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
        <div key={iso}>
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2 capitalize">
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