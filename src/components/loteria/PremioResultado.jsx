import React from "react";
import { PartyPopper, Heart } from "lucide-react";

// Bloque de resultado del sorteo en la página pública.
// Solo se muestra cuando el club publica el resultado desde el panel.
export default function PremioResultado({ campana }) {
  const premiado = campana.resultado_premiado === true;
  const importe = Number(campana.resultado_premio_decimo) || 0;

  if (premiado) {
    return (
      <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-400/25 to-amber-600/10 p-6 text-center space-y-3 shadow-2xl">
        <PartyPopper className="w-10 h-10 text-amber-300 mx-auto" />
        <p className="text-amber-200 uppercase tracking-[0.2em] text-xs font-bold">
          ¡Tenemos premio!
        </p>
        <p className="text-3xl font-black text-white leading-tight">
          El {campana.numero} ha sido premiado
        </p>
        {campana.resultado_tipo_premio && (
          <p className="text-amber-100 font-semibold">{campana.resultado_tipo_premio}</p>
        )}
        {importe > 0 && (
          <p className="text-5xl font-black text-amber-300">
            {importe.toLocaleString("es-ES")} €
            <span className="block text-sm font-semibold text-amber-100/80 tracking-normal mt-1">
              por décimo
            </span>
          </p>
        )}
        {campana.resultado_mensaje && (
          <p className="text-amber-50 whitespace-pre-line leading-relaxed">
            {campana.resultado_mensaje}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-400/40 bg-white/5 backdrop-blur p-6 text-center space-y-3">
      <Heart className="w-8 h-8 text-emerald-300 mx-auto" />
      <p className="text-xl font-black text-white">
        Este año el {campana.numero} no ha sido premiado
      </p>
      <p className="text-emerald-100/90 whitespace-pre-line leading-relaxed">
        {campana.resultado_mensaje ||
          "Gracias de corazón a todas las familias y comercios que han participado. Lo importante es que cada décimo ha ayudado al club. ¡El año que viene volvemos a intentarlo!"}
      </p>
    </div>
  );
}