import React from "react";
import { Button } from "@/components/ui/button";
import { Send, Clock3 } from "lucide-react";

export default function ProspectosPendientes({ sponsors, onPropuesta }) {
  const pendientes = sponsors.filter(s => ["prospecto", "contactado"].includes(s.etapa_crm) && !s.activo);
  const seguimientos = sponsors
    .filter(s => ["propuesta", "negociacion"].includes(s.etapa_crm) && !s.activo && s.proxima_accion_fecha)
    .sort((a, b) => String(a.proxima_accion_fecha).localeCompare(String(b.proxima_accion_fecha)));
  if (!pendientes.length && !seguimientos.length) return null;
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-4">
      {!!pendientes.length && <section>
        <p className="text-sm font-semibold text-slate-700 mb-2">Empresas guardadas sin propuesta ({pendientes.length})</p>
        <div className="flex flex-wrap gap-2">
          {pendientes.map(s => (
            <Button key={s.id} size="sm" variant="outline" onClick={() => onPropuesta(s)}>
              <Send className="w-3 h-3 mr-1" />{s.nombre}
            </Button>
          ))}
        </div>
      </section>}
      {!!seguimientos.length && <section>
        <p className="text-sm font-semibold text-slate-700 mb-2">Seguimientos de propuestas ({seguimientos.length})</p>
        <div className="space-y-2">
          {seguimientos.map(s => {
            const vencido = s.proxima_accion_fecha <= hoy;
            return <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-800">{s.nombre}</p>
                <p className="text-xs text-slate-500">{s.proxima_accion_texto || "Seguimiento pendiente"} · {s.proxima_accion_fecha}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs rounded-full px-2 py-1 ${vencido ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-600"}`}>
                  <Clock3 className="inline w-3 h-3 mr-1" />{vencido ? "Pendiente / vencido" : "Programado"}
                </span>
                <Button size="sm" variant="outline" onClick={() => onPropuesta(s)}>Abrir</Button>
              </div>
            </div>;
          })}
        </div>
      </section>}
    </div>
  );
}