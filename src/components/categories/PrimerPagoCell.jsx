import React from "react";

// Celda de la tabla de categorías: PAGO POR ADELANTADO en la inscripción.
// Tres estados (cada clic pasa al siguiente):
//   No      → todo como siempre.
//   Prueba  → el aviso y el pago previo SOLO los ven los administradores (para probar).
//   Activo  → lo ven todas las familias en las nuevas inscripciones de esa categoría.
export default function PrimerPagoCell({ cat, onUpdate }) {
  const adelantado = cat.pago_adelantado === true;
  const prueba = cat.pago_adelantado_prueba === true;
  const estado = !adelantado ? "no" : prueba ? "prueba" : "activo";

  const siguiente = () => {
    if (estado === "no") {
      onUpdate({ pago_adelantado: true, pago_adelantado_prueba: true });
    } else if (estado === "prueba") {
      const ok = window.confirm(
        `¿Activar el pago por adelantado en "${cat.nombre}" para TODAS las familias?\n\n` +
        `Desde ese momento, quien se inscriba en esta categoría tendrá que pagar con tarjeta antes de rellenar el formulario.`
      );
      if (ok) onUpdate({ pago_adelantado: true, pago_adelantado_prueba: false });
    } else {
      onUpdate({ pago_adelantado: false, pago_adelantado_prueba: false });
    }
  };

  const estilos = {
    no: "bg-slate-100 text-slate-400 hover:bg-slate-200",
    prueba: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    activo: "bg-red-100 text-red-700 hover:bg-red-200",
  };
  const textos = { no: "No", prueba: "🧪 Prueba", activo: "💳 Activo" };
  const ayuda = {
    no: "Pago por adelantado desactivado. Clic: pasar a modo Prueba (solo administradores).",
    prueba: "Modo prueba: solo los administradores ven el pago por adelantado. Clic: activarlo para todas las familias.",
    activo: "Activo para todas las familias en nuevas inscripciones. Clic: desactivar.",
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={siguiente}
        title={ayuda[estado]}
        className={`px-2 py-1 rounded-full text-xs font-bold transition-colors ${estilos[estado]}`}
      >
        {textos[estado]}
      </button>
    </div>
  );
}
