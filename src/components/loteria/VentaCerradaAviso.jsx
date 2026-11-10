import React from "react";

export default function VentaCerradaAviso() {
  return (
    <section className="rounded-3xl border-2 border-amber-300 bg-red-950 p-6 text-center text-amber-100 shadow-2xl">
      <p className="text-4xl mb-2">🔒</p>
      <h2 className="text-2xl font-black text-amber-300">La venta de lotería ha terminado</h2>
      <p className="mt-2 text-sm font-semibold leading-relaxed">
        Gracias a todos los que habéis comprado y colaborado con el CD Bustarviejo. ¡Mucha suerte en el sorteo! 🍀
      </p>
    </section>
  );
}