import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Gift, ArrowRight, Ticket, Sparkles } from "lucide-react";

/**
 * Banner compacto de "Hazte Socio" en el panel de familias.
 * La versión de campaña usa los colores del club y destaca el sorteo
 * sin fotografías, optimizada para pantallas pequeñas.
 */
export default function HazteSocioBanner({ seasonConfig }) {
  const programaActivo = seasonConfig?.programa_referidos_activo === true;
  const precio = seasonConfig?.precio_socio || 25;
  const premio = seasonConfig?.sorteo_premio_principal_nombre;

  if (!programaActivo) {
    return (
      <Link to={createPageUrl("ClubMembership")} className="block">
        <div className="rounded-xl border border-orange-400 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 p-3 shadow-lg transition-transform active:scale-[0.99]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Heart className="h-6 w-6 flex-shrink-0 text-white" />
              <div className="min-w-0">
                <p className="text-sm font-black text-white">¡Hazte socio del CD Bustarviejo!</p>
                <p className="text-xs font-semibold text-white/90">{precio}€ por temporada</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 flex-shrink-0 text-white" />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`${createPageUrl("ClubMembership")}?focus=referidos`} className="block">
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-slate-950 p-3.5 shadow-xl transition-transform active:scale-[0.99]">
        <div className="pointer-events-none absolute -right-7 -top-10 h-28 w-28 rounded-full bg-orange-500/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-lg shadow-orange-500/30">
            <Gift className="h-8 w-8 text-slate-950" strokeWidth={2.6} />
            <Sparkles className="absolute -right-1 -top-1 h-5 w-5 fill-yellow-200 text-yellow-200" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-yellow-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-slate-950">
              <Ticket className="h-3 w-3" /> Sorteo activo
            </div>
            <p className="text-lg font-black uppercase leading-none tracking-tight text-white">
              ¡Invita y gana!
            </p>
            <p className="mt-1 truncate text-xs font-bold text-amber-300">
              {premio || "Consigue papeletas para el sorteo"}
            </p>
            <p className="mt-1 text-[10px] font-medium leading-tight text-white/80">
              Cada nuevo socio que paga = 1 papeleta · Alta {precio}€
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-xl bg-orange-500 px-2.5 py-2 text-white shadow-lg shadow-orange-500/20">
            <span className="text-[10px] font-black uppercase leading-none">¡Vamos!</span>
            <ArrowRight className="mt-1 h-5 w-5" />
          </div>
        </div>
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-yellow-300 via-orange-400 to-amber-300" />
        </div>
      </div>
    </Link>
  );
}
