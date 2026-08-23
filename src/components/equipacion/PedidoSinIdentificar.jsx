import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { format } from "date-fns";

export default function PedidoSinIdentificar({ pedido, players, onAssign }) {
  const [seleccionados, setSeleccionados] = useState([]);
  const candidatos = pedido.candidatos || [];

  const add = (id) => setSeleccionados((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const remove = (id) => setSeleccionados((prev) => prev.filter((x) => x !== id));
  const nombre = (id) => players.find((p) => p.id === id)?.nombre || "";

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
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-slate-500 self-center">Posibles:</span>
          {candidatos.map((c) => (
            <button
              key={c.jugador_id}
              onClick={() => add(c.jugador_id)}
              className="text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200"
            >
              + {c.jugador_nombre}
            </button>
          ))}
        </div>
      )}

      {seleccionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {seleccionados.map((id) => (
            <span key={id} className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
              {nombre(id)}
              <X className="w-3 h-3 cursor-pointer" onClick={() => remove(id)} />
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Select value="" onValueChange={add}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Añadir jugador..." /></SelectTrigger>
          <SelectContent>
            {players.filter((p) => !seleccionados.includes(p.id)).map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!seleccionados.length} onClick={() => onAssign(pedido, seleccionados)}>
          Asignar{seleccionados.length > 1 ? ` (${seleccionados.length})` : ""}
        </Button>
      </div>
    </div>
  );
}