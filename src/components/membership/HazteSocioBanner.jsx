import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, Gift } from "lucide-react";

/**
 * Banner compacto de "Hazte Socio" en el panel de familias.
 * Si el programa "Trae un socio amigo" está activo, cambia el mensaje y el color
 * para destacar el sorteo, manteniendo el mismo tamaño que el banner normal.
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
    <Link to={`${createPageUrl("ClubMembership")}?focus=referidos`}>
      <div className="animate-pulse-soft bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 rounded-xl p-3 shadow-lg transition-all hover:scale-105 active:scale-95 border border-amber-300">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {premioFoto ? (
              <img
                src={premioFoto}
                alt={premio || "Premio"}
                className="w-9 h-9 rounded-lg object-cover border border-white/60 flex-shrink-0"
              />
            ) : (
              <Gift className="w-5 h-5 text-white flex-shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">
                🎟️ Trae un socio amigo y gana{premio ? ` ${premio}` : ""}
              </p>
              <p className="text-white/85 text-[11px] leading-tight">
                Cualquiera puede ser socio · 1 amigo = 1 papeleta · {precio}€
              </p>
            </div>
          </div>
          <span className="text-white text-lg flex-shrink-0">→</span>
        </div>
      </div>
    </Link>
  );
}