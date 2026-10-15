import React from "react";

// Celda de la tabla de categorías: exigir el primer pago para confirmar plaza
// y, opcionalmente, que ese primer pago sea solo con tarjeta.
export default function PrimerPagoCell({ cat, onUpdate }) {
  const exige = cat.exigir_primer_pago === true;
  const soloTarjeta = cat.primer_pago_solo_tarjeta === true;
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onUpdate({ exigir_primer_pago: !exige })}
        className={`px-2 py-1 rounded-full text-xs font-bold transition-colors ${exige ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
      >
        {exige ? '🔒 Exigido' : 'No'}
      </button>
      {exige && (
        <button
          onClick={() => onUpdate({ primer_pago_solo_tarjeta: !soloTarjeta })}
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${soloTarjeta ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {soloTarjeta ? '💳 Solo tarjeta' : '💳/🏦 Tarjeta o transf.'}
        </button>
      )}
    </div>
  );
}