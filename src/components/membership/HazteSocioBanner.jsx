import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Gift, ArrowRight } from "lucide-react";

/**
 * Banner compacto de "Hazte Socio" en el panel de familias.
 * Al activar "Trae un socio amigo" se convierte en una llamada visual
 * a participar, sin fotografías para que se lea bien en móvil.
 */
export default function HazteSocioBanner({ seasonConfig }) {
  const programaActivo = seasonConfig?.programa_referidos_activo === true;
  const precio = seasonConfig?.precio_socio || 25;
  const premio = seasonConfig?.sorteo_premio_principal_nombre;

  if (!programaActivo) {
    return (
      <Link to={createPageUrl("ClubMembership")} className="block">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-xl p-3 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] border border-pink-400">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Heart className="w-5 h-5 text-white flex-shrink-0" />
              <p className="text-white font-bold text-sm">Hazte socio · {precio}€/temporada</p>
            </div>
            <ArrowRight className="w-5 h-5 text-white flex-shrink-0" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`${createPageUrl("ClubMembership")}?focus=referidos`} className="block">
      <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-3.5 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
            <Gift className="h-7 w-7 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/90">
              Programa activo · Trae un socio amigo
            </p>
            <p className="mt-0.5 text-base font-black leading-tight text-white">
              ¡Invita y gana{premio ? ` ${premio}` : " premios"}!
            </p>
            <p className="mt-1 text-xs font-medium leading-tight text-white/95">
              1 nuevo socio que paga = 1 papeleta · Alta {precio}€
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-lg bg-white px-2.5 py-2 text-orange-700 shadow-sm">
            <span className="text-[10px] font-black uppercase leading-none">Invita</span>
            <ArrowRight className="mt-1 h-4 w-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}