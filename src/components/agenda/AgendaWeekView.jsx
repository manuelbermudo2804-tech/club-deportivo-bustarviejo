import React from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { fechaISO } from "@/lib/sinEntrenamiento";
import { KIND_STYLES } from "./AgendaItemCard";

export default function AgendaWeekView({ items, referenceDate, onSelectDay }) {
  const lunes = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const dias = Array.from({ length: 7 }, (_, i) => addDays(lunes, i));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
      {dias.map((day) => {
        const iso = fechaISO(day);
        const delDia = items.filter((i) => i.date === iso);
        const hoy = isSameDay(day, new Date());

        return (
          <div
            key={iso}
            onClick={() => onSelectDay?.(day)}
            className={`rounded-xl border-2 p-2 min-h-[130px] cursor-pointer transition-colors ${
              hoy ? "bg-orange-50 border-orange-400" : "bg-white border-slate-200 hover:border-orange-300"
            }`}
          >
            <p className={`text-xs font-bold uppercase mb-2 ${hoy ? "text-orange-700" : "text-slate-500"}`}>
              {format(day, "EEE d", { locale: es })}
            </p>
            <div className="space-y-1.5">
              {delDia.length === 0 && <p className="text-xs text-slate-300">—</p>}
              {delDia.map((item) => {
                const style = KIND_STYLES[item.kind] || KIND_STYLES.evento;
                return (
                  <div
                    key={item.id}
                    className={`text-xs rounded-md px-1.5 py-1 ${style.chip} ${item.cancelado ? "line-through opacity-60" : ""}`}
                  >
                    {item.hora && <span className="font-bold">{item.hora} </span>}
                    <span className="break-words">{item.titulo}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}