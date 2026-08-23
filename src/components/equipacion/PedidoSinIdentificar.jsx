import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function PedidoSinIdentificar({ pedido, players, onAssign }) {
  const [sel, setSel] = useState("");
  const candidatos = pedido.candidatos || [];

  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 truncate">{pedido.cliente_nombre || "Sin nombre"}</p>
          <p className="text-xs text-slate-500 truncate">{pedido.cliente_email}</p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">#{pedido.numero_pedido}</Badge>
      </div>
      <p className="text-xs text-slate-400">
        {pedido.fecha_pedido ? format(new Date(pedido.fecha_pedido), "dd/MM/yyyy") : ""} · {pedido.asunto}
      </p>

      {candidatos.length > 0 && (
        <p className="text-xs text-orange-600">
          Posibles: {candidatos.map((c) => c.jugador_nombre).join(", ")}
        </p>
      )}

      <div className="flex gap-2">
        <Select value={sel} onValueChange={setSel}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Asignar a jugador..." /></SelectTrigger>
          <SelectContent>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!sel} onClick={() => onAssign(pedido, sel)}>Asignar</Button>
      </div>
    </div>
  );
}