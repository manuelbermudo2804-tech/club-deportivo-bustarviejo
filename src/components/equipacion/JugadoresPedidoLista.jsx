import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";

export default function JugadoresPedidoLista({ players, pedidosPorJugador }) {
  if (players.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">No hay jugadores con este filtro.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {players.map((p) => {
        const pedidos = pedidosPorJugador[p.id] || [];
        const tiene = pedidos.length > 0;
        return (
          <div key={p.id} className="flex items-center gap-3 py-2.5">
            {tiene
              ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{p.nombre}</p>
              <p className="text-xs text-slate-500 truncate">{p.categoria_principal || p.deporte || ""}</p>
            </div>
            {tiene ? (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs shrink-0">
                {pedidos.length > 1 ? `${pedidos.length} pedidos` : `#${pedidos[0].numero_pedido || "ok"}`}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-slate-500 shrink-0">Falta</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
}