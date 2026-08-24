import React from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Check, Minus } from "lucide-react";

export default function DirectorioTabla({ contactos = [] }) {
  if (contactos.length === 0) {
    return <div className="text-center py-12 text-slate-500 text-sm">No hay contactos que coincidan.</div>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {contactos.map((c) => (
        <div key={c.key} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-900 truncate">{c.nombre || "Sin nombre"}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
              {c.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" /> {c.email}
                </span>
              )}
              {c.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {c.telefono}
                </span>
              )}
            </div>
            {c.detalles.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{c.detalles.join(" · ")}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 sm:justify-end sm:w-72 shrink-0">
            {c.origenes.map((o) => (
              <Badge key={o} variant="secondary" className="text-xs">
                {o}
              </Badge>
            ))}
            {c.acepta_promociones || c.acepta_patrocinadores ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                <Check className="w-3 h-3 mr-1" /> Consiente
              </Badge>
            ) : (
              <Badge variant="outline" className="text-slate-400 text-xs">
                <Minus className="w-3 h-3 mr-1" /> Sin permiso
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}