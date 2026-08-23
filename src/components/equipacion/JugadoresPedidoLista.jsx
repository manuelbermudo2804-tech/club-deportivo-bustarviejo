import React from "react";
import JugadorPedidoRow from "./JugadorPedidoRow";

export default function JugadoresPedidoLista({ players, pedidosPorJugador, ultimosPorJugador = {}, enviandoId, onEmail, onWhatsApp }) {
  if (players.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-6">No hay jugadores con este filtro.</p>;
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
        />
      ))}
    </div>
  );
}