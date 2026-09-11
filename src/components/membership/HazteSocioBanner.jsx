import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Gift, Ticket, Sparkles } from "lucide-react";

/**
 * Banner de "Hazte Socio" en el panel de familias.
 * Si el programa "Trae un socio amigo" está activo, cambia por completo:
 * pasa a ser un banner de premio irresistible con el sorteo destacado.
 */
export default function HazteSocioBanner({ seasonConfig }) {
  const programaActivo = seasonConfig?.programa_referidos_activo === true;
  const precio = seasonConfig?.precio_socio || 25;
  const premio = seasonConfig?.sorteo_premio_principal_nombre;
  const premioFoto = seasonConfig?.sorteo_premio_principal_foto;

  if (!programaActivo) {
    return (
      <Link to={createPageUrl("ClubMembership")}>
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-xl p-3 shadow-lg transition-all hover:scale-105 active:scale-95 border border-pink-400">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-white flex-shrink-0" />
              <p className="text-white font-bold text-sm">❤️ Hazte Socio • {precio}€/temporada</p>
            </div>
            <span className="text-white text-lg">→</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={createPageUrl("ClubMembership")} className="block">
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300 shadow-xl bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 transition-all hover:scale-[1.02] active:scale-95">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/15 rounded-full blur-xl" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-white/10 rounded-full blur-xl" />

        <div className="relative p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-white text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide animate-pulse">
              Sorteo en marcha
            </span>
            <Sparkles className="w-4 h-4 text-yellow-200" />
          </div>

          <div className="flex items-center gap-3">
            {premioFoto ? (
              <img src={premioFoto} alt={premio || "Premio"} className="w-16 h-16 rounded-xl object-cover border-2 border-white/50 flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-7 h-7 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base leading-tight">
                ¡Trae un socio amigo y gana!
              </p>
              <p className="text-white/90 text-xs mt-0.5">
                {premio
                  ? <>Cada amigo = 1 papeleta para el sorteo de <strong>{premio}</strong></>
                  : <>Cada amigo que traes = 1 papeleta para el sorteo</>}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Ticket className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <p className="text-slate-800 text-xs font-semibold truncate">
                Ser socio: solo {precio}€/temporada
              </p>
            </div>
            <span className="text-orange-700 font-black text-sm whitespace-nowrap">Ver cómo →</span>
          </div>
        </div>
      </div>
    </Link>
  );
}