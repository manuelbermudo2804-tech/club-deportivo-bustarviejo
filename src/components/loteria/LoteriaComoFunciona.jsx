import React from "react";

const PASOS = [
  { emoji: "🏪", titulo: "En los comercios del pueblo", texto: "Pásate por cualquiera de los comercios colaboradores y pide tu décimo." },
  { emoji: "📱", titulo: "O desde casa con TuLotero", texto: "Compra tu décimo online en un minuto, sin salir de casa." },
  { emoji: "🎁", titulo: "Y a esperar el sorteo", texto: "Cada décimo ayuda al club y a sus equipos. ¡Mucha suerte!" },
];

export default function LoteriaComoFunciona({ textoPersonalizado }) {
  if (textoPersonalizado) {
    return (
      <div className="bg-white/95 rounded-2xl p-5 shadow-lg">
        <h2 className="text-lg font-bold text-slate-900 mb-2">¿Cómo funciona?</h2>
        <p className="text-slate-700 whitespace-pre-line">{textoPersonalizado}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 rounded-2xl p-5 shadow-lg">
      <h2 className="text-lg font-bold text-slate-900 mb-4">¿Cómo funciona?</h2>
      <div className="space-y-4">
        {PASOS.map((p, i) => (
          <div key={i} className="flex gap-3">
            <div className="text-2xl shrink-0">{p.emoji}</div>
            <div>
              <p className="font-semibold text-slate-900">{p.titulo}</p>
              <p className="text-sm text-slate-600">{p.texto}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}