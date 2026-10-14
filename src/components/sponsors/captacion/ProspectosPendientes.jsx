import React from "react";
import { Button } from "@/components/ui/button";
import { Send, Clock3, Phone, MapPin } from "lucide-react";

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {pendientes.map(s => (
            <article key={s.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 break-words">{s.nombre}</p>
                {s.sector && <p className="text-xs text-slate-500">{s.sector}</p>}
              </div>
              {s.direccion && <p className="flex items-start gap-1.5 text-xs text-slate-600"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{s.direccion}</span></p>}
              {s.contacto_telefono && <a href={`tel:${String(s.contacto_telefono).replace(/[^+\d]/g, "")}`} className="flex items-center gap-1.5 text-sm text-blue-700 hover:underline"><Phone className="h-3.5 w-3.5" />{s.contacto_telefono}</a>}
              <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => onPropuesta(s)}>
                <Send className="w-3.5 h-3.5 mr-1.5" />Preparar propuesta
              </Button>
            </article>
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