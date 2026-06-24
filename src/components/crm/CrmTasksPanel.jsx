import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { getSponsorAlert } from "./crmConfig";

// Lista de tareas/alertas automáticas detectadas sobre el pipeline.
export default function CrmTasksPanel({ sponsors = [], onSelect }) {
  const tareas = useMemo(() => {
    return sponsors
      .map(s => ({ sponsor: s, alert: getSponsorAlert(s) }))
      .filter(t => t.alert)
      .sort((a, b) => {
        // Rojos primero
        const order = { vencido: 0, seguimiento: 1, renovacion: 2, sin_contacto: 3 };
        return (order[a.alert.tipo] ?? 9) - (order[b.alert.tipo] ?? 9);
      });
  }, [sponsors]);

  if (tareas.length === 0) {
    return (
      <Card className="p-5 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <p className="text-sm font-medium text-slate-700">Todo al día</p>
        <p className="text-xs text-slate-400 mt-1">No hay seguimientos ni renovaciones pendientes</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
        🔔 Tareas pendientes
        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{tareas.length}</span>
      </h3>
      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {tareas.map(({ sponsor, alert }) => (
          <button
            key={sponsor.id}
            onClick={() => onSelect(sponsor)}
            className="w-full text-left flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 border border-slate-100 transition-colors"
          >
            <span className="text-lg shrink-0">{alert.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{sponsor.nombre}</p>
              <p className="text-xs text-slate-500">{alert.label}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}