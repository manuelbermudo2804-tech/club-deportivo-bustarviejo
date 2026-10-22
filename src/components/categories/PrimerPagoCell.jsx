import React from "react";

// Celda de la tabla de categorías: activar el PAGO POR ADELANTADO en la inscripción.
// Si está activado, en una NUEVA inscripción de esa categoría se pide pagar con tarjeta
// justo después de elegir la categoría (pago único o, en tres plazos, la cuota de junio)
// y después se completa el formulario habitual.
export default function PrimerPagoCell({ cat, onUpdate }) {
  const activo = cat.pago_adelantado === true;
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={() => onUpdate({ pago_adelantado: !activo })}
        title="Pago por adelantado con tarjeta al inscribirse (nuevas inscripciones)"
        className={`px-2 py-1 rounded-full text-xs font-bold transition-colors ${activo ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
      >
        {activo ? '💳 Adelantado' : 'No'}
      </button>
    </div>
  );
}
