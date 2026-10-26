import React from "react";

// Control independiente del pago anticipado de nuevas inscripciones.
export default function RenewalPrepagoCell({ cat, onUpdate }) {
  const enabled = cat.pago_adelantado_renovaciones === true;
  const test = cat.pago_adelantado_renovaciones_prueba === true;
  const state = !enabled ? "no" : test ? "test" : "active";
  const next = () => {
    if (state === "no") {
      onUpdate({ pago_adelantado_renovaciones: true, pago_adelantado_renovaciones_prueba: true });
    } else if (state === "test") {
      if (window.confirm(`¿Activar el pago anticipado de renovaciones para TODAS las familias de ${cat.nombre}?\n\nSe cobrará con tarjeta el pago único o la primera cuota mediante Stripe.`)) {
        onUpdate({ pago_adelantado_renovaciones: true, pago_adelantado_renovaciones_prueba: false });
      }
    } else {
      onUpdate({ pago_adelantado_renovaciones: false, pago_adelantado_renovaciones_prueba: false });
    }
  };
  const styles = {
    no: "bg-slate-100 text-slate-500 hover:bg-slate-200",
    test: "bg-amber-100 text-amber-700 hover:bg-amber-200",
    active: "bg-red-100 text-red-700 hover:bg-red-200",
  };
  const labels = { no: "Renov. no", test: "Renov. 🧪", active: "Renov. 💳" };
  return <button type="button" onClick={next} title="Pago anticipado de renovaciones (independiente de nuevas inscripciones)" className={`px-2 py-1 rounded-full text-[10px] font-bold transition-colors ${styles[state]}`}>{labels[state]}</button>;
}
