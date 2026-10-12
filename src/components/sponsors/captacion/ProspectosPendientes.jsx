import React from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function ProspectosPendientes({ sponsors, onPropuesta }) {
  const pendientes = sponsors.filter(s => ["prospecto", "contactado"].includes(s.etapa_crm) && !s.activo);
  if (!pendientes.length) return null;
  return (
    <div>
      <p className="text-sm font-semibold text-slate-700 mb-2">Empresas guardadas sin propuesta ({pendientes.length})</p>
      <div className="flex flex-wrap gap-2">
        {pendientes.map(s => (
          <Button key={s.id} size="sm" variant="outline" onClick={() => onPropuesta(s)}>
            <Send className="w-3 h-3 mr-1" />{s.nombre}
          </Button>
        ))}
      </div>
    </div>
  );
}