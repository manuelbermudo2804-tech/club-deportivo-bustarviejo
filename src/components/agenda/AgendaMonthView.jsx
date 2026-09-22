import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { fechaISO } from "@/lib/sinEntrenamiento";
import { KIND_STYLES } from "./AgendaItemCard";

const ORDEN_KIND = ["convocatoria", "partido", "evento", "entrenamiento"];

export default function AgendaMonthView({ items, referenceDate, onSelectDay }) {
  const dias = eachDayOfInterval({ start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) });
  const huecosIniciales = dias[0].getDay() === 0 ? 6 : dias[0].getDay() - 1;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="grid grid-cols-7 gap-1 lg:gap-2">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="text-center text-xs font-bold text-slate-600 py-1.5 bg-slate-50 rounded">
            {d}
          </div>
        ))}

        {Array.from({ length: huecosIniciales }).map((_, i) => (
          <div key={`hueco-${i}`} className="min-h-[70px]" />
        ))}

        {dias.map((day) => {
          const iso = fechaISO(day);
          const delDia = items.filter((i) => i.date === iso);
          const hoy = isSameDay(day, new Date());
          const kinds = ORDEN_KIND.filter((k) => delDia.some((i) => i.kind === k));

          return (
            <div
              key={iso}
              onClick={() => delDia.length > 0 && onSelectDay?.(day)}
              className={`min-h-[70px] lg:min-h-[90px] rounded-lg border-2 p-1.5 transition-colors ${
                hoy ? "bg-orange-50 border-orange-400" : "bg-white border-slate-200"
              } ${delDia.length > 0 ? "cursor-pointer hover:border-orange-300" : ""}`}
            >
              <p className={`text-sm font-bold mb-1 ${hoy ? "text-orange-600" : "text-slate-800"}`}>
                {format(day, "d")}
              </p>
              <div className="flex flex-wrap gap-1 mb-1">
                {kinds.map((k) => (
                  <span key={k} className={`w-2 h-2 rounded-full ${KIND_STYLES[k].dot}`} />
                ))}
              </div>
              {delDia.slice(0, 2).map((item) => (
                <p key={item.id} className="text-[10px] leading-tight text-slate-600 truncate">
                  {item.hora ? `${item.hora} ` : ""}
                  {item.titulo}
                </p>
              ))}
              {delDia.length > 2 && (
                <p className="text-[10px] text-slate-400 font-semibold">+{delDia.length - 2} más</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}