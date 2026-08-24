import React from "react";
import JugadorPedidoRow from "./JugadorPedidoRow";

export default function JugadoresPedidoLista({
  players,
  pedidosPorJugador,
  ultimosPorJugador,
  enviandoId,
  onEmail,
  onWhatsApp,
  onMarcarManual,
  onDesmarcarManual,
}) {
  if (!players.length) {
    return <p className="text-sm text-slate-500 py-4 text-center">No hay jugadores con este filtro</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {players.map((p) => (
        <JugadorPedidoRow
          key={p.id}
          player={p}
          pedidos={pedidosPorJugador[p.id] || []}
          ultimo={ultimosPorJugador[p.id]}
          enviando={enviandoId === p.id}
          onEmail={onEmail}
          onWhatsApp={onWhatsApp}
          onMarcarManual={onMarcarManual}
          onDesmarcarManual={onDesmarcarManual}
        />
      ))}
    </div>
  );
}