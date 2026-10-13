import React from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Check, Minus } from "lucide-react";

export default function DirectorioTabla({ contactos = [] }) {
  if (contactos.length === 0) {
    return <div className="text-center py-12 text-slate-500 text-sm">No hay contactos que coincidan.</div>;
  }

  return (
    <div className="space-y-2">
      {contactos.map((c, index) => (
        <div key={c.key} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-slate-300 hover:bg-slate-50/60 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-center">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">{String(index + 1).padStart(2, "0")}</div>
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold text-slate-900">{c.nombre || "Sin nombre"}</p>
              <div className="mt-1 flex flex-col gap-1 text-sm text-slate-600 sm:flex-row sm:flex-wrap sm:gap-x-4">
                {c.email && (
                  <span className="flex min-w-0 items-center gap-1.5 break-all">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {c.email}
                  </span>
                )}
                {c.telefono && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" /> {c.telefono}
                  </span>
                )}
              </div>
              {c.detalles.length > 0 && (
                <p className="mt-1 break-words text-xs leading-relaxed text-slate-500">{c.detalles.join(" · ")}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 lg:justify-end lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
            {c.origenes.map((o) => (
              <Badge key={o} variant="secondary" className="max-w-full break-words rounded-md bg-slate-100 text-xs font-medium text-slate-700 hover:bg-slate-100">
                {o}
              </Badge>
            ))}
            {c.acepta_promociones || c.acepta_patrocinadores ? (
              <Badge className="rounded-md bg-emerald-100 text-xs text-emerald-800 hover:bg-emerald-100">
                <Check className="mr-1 h-3 w-3" /> Consiente
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-md border-slate-200 text-xs text-slate-500">
                <Minus className="mr-1 h-3 w-3" /> Sin permiso
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}