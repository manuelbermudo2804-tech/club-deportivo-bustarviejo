import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from "lucide-react";

const fecha = (f) => (f ? new Date(f).toLocaleDateString("es-ES") : "—");

export default function ConsentimientosTabla({ items = [], onRevocar, onReactivar }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 text-sm">
        Todavía no hay consentimientos registrados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase">
            <th className="py-3 px-3">Contacto</th>
            <th className="py-3 px-3">Origen</th>
            <th className="py-3 px-3">Acepta</th>
            <th className="py-3 px-3">Fecha</th>
            <th className="py-3 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr
              key={c.id}
              className={`border-b border-slate-100 ${c.revocado ? "opacity-50" : ""}`}
            >
              <td className="py-3 px-3">
                <p className="font-medium text-slate-900">{c.nombre || "Sin nombre"}</p>
                <p className="text-xs text-slate-500">{c.email || c.telefono || "—"}</p>
              </td>
              <td className="py-3 px-3 text-slate-600">{c.origen}</td>
              <td className="py-3 px-3">
                <div className="flex flex-wrap gap-1">
                  {c.acepta_promociones && <Badge variant="secondary">Club</Badge>}
                  {c.acepta_patrocinadores && <Badge variant="secondary">Patrocinadores</Badge>}
                </div>
              </td>
              <td className="py-3 px-3 text-slate-500 text-xs">{fecha(c.fecha)}</td>
              <td className="py-3 px-3 text-right">
                {c.revocado ? (
                  <Button size="sm" variant="ghost" onClick={() => onReactivar(c)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Reactivar
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => onRevocar(c)}>
                    <X className="w-3 h-3 mr-1" /> Dar de baja
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}