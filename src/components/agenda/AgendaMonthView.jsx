import React from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { fechaISO } from "@/lib/sinEntrenamiento";
import { KIND_STYLES } from "./AgendaItemCard";

const ORDEN_KIND = ["convocatoria", "partido", "evento", "entrenamiento"];

export default function AgendaMonthView({ items, referenceDate, onSelectDay }) {
  const dias = eachDayOfInterval({ start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) });
  const huecosIniciales = dias[0].getDay() === 0 ? 6 : dias[0].getDay() - 1;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
      <p className="mb-2 px-1 text-[10px] font-medium text-slate-400 sm:hidden">Desliza horizontalmente para ver todos los días →</p>
      <div className="min-w-0 overflow-x-auto pb-1">
      <div className="grid min-w-[500px] grid-cols-7 gap-1 sm:min-w-0 lg:gap-2">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <div key={d} className="rounded-lg bg-slate-100 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600 sm:text-xs">
            {d}
          </div>
        ))}

        {Array.from({ length: huecosIniciales }).map((_, i) => (
          <div key={`hueco-${i}`} aria-hidden="true" className="min-h-[70px] rounded-xl bg-slate-50/60 sm:min-h-[90px]" />
        ))}

        {dias.map((day) => {
          const iso = fechaISO(day);
          const delDia = items.filter((i) => i.date === iso);
          const hoy = isSameDay(day, new Date());
          const kinds = ORDEN_KIND.filter((k) => delDia.some((i) => i.kind === k));
          const entrenosCancelados = delDia.filter((i) => i.kind === "entrenamiento" && i.cancelado);
          const hayEntrenoActivo = delDia.some((i) => i.kind === "entrenamiento" && !i.cancelado);
          const diaSinEntrenoCompleto = entrenosCancelados.length > 0 && !hayEntrenoActivo;

          return (
            <div
              key={iso}
              onClick={() => delDia.length > 0 && onSelectDay?.(day)}
              role={delDia.length > 0 ? "button" : undefined}
              tabIndex={delDia.length > 0 ? 0 : undefined}
              onKeyDown={(event) => {
                if (delDia.length > 0 && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onSelectDay?.(day);
                }
              }}
              aria-label={delDia.length > 0 ? `${format(day, "d MMMM", { locale: es })}: ${delDia.length} actividades` : undefined}
              className={`relative min-w-0 min-h-[70px] overflow-hidden rounded-xl border p-1.5 transition-all sm:min-h-[90px] sm:p-2 ${
                diaSinEntrenoCompleto
                  ? "bg-rose-50 border-rose-300 ring-1 ring-rose-100"
                  : hoy ? "bg-orange-50 border-orange-300 ring-1 ring-orange-100" : "bg-white border-slate-200"
              } ${delDia.length > 0 ? "cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between gap-1">
                <p className={`text-sm font-bold ${diaSinEntrenoCompleto ? "text-rose-700" : hoy ? "text-orange-600" : "text-slate-800"}`}>
                  {format(day, "d")}
                </p>
                {diaSinEntrenoCompleto && <span title="Día sin entrenamiento" aria-label="Día sin entrenamiento" className="text-[10px] font-black leading-none text-rose-600">✕</span>}
              </div>
              {diaSinEntrenoCompleto && (
                <p className="mb-1 block w-full max-w-full overflow-hidden rounded-md border border-rose-200 bg-rose-100 px-0.5 py-1 text-center text-[7px] font-extrabold uppercase leading-tight tracking-normal break-words text-rose-700 sm:px-1 sm:text-[9px] sm:tracking-wide">
                  Sin entreno
                </p>
              )}
              <div className="flex flex-wrap gap-1 mb-1">
                {kinds.map((k) => (
                  <span key={k} className={`w-2 h-2 rounded-full ${KIND_STYLES[k].dot}`} />
                ))}
              </div>
              {delDia.slice(0, 2).map((item) => (
                <p key={item.id} className={`text-[10px] leading-tight truncate ${item.kind === "entrenamiento" && item.cancelado ? "text-rose-700 line-through decoration-rose-500 decoration-2" : "text-slate-600"}`} title={item.cancelado ? `${item.titulo} · Cancelado${item.motivoCancelacion ? `: ${item.motivoCancelacion}` : ""}` : item.titulo}>
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
    </div>
  );
}