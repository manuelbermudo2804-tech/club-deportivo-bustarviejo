import React from "react";
import { Trophy, Calendar } from "lucide-react";
import { format } from "date-fns";

// Hero "estadio nocturno" para la página pública del torneo.
export default function TorneoHeroNight({ torneo }) {
  const cPrim = torneo.color_primario || "#1e40af";
  const cSec = torneo.color_secundario || "#f59e0b";

  return (
    <div className="relative overflow-hidden text-white">
      {/* Fondo base oscuro */}
      <div className="absolute inset-0 bg-[#0a0e1a]" />
      {/* Imagen hero difuminada */}
      {torneo.imagen_hero_url && (
        <img src={torneo.imagen_hero_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
      )}
      {/* Focos de estadio (glows radiales con colores del torneo) */}
      <div
        className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, ${cSec}, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-40 -right-24 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-40"
        style={{ background: `radial-gradient(circle, ${cPrim}, transparent 70%)` }}
      />
      {/* Degradado inferior para fundir con el contenido */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0e1a] to-transparent" />

      <div className="relative px-6 py-16 md:py-20 text-center max-w-4xl mx-auto">
        {torneo.logo_url && (
          <img
            src={torneo.logo_url}
            alt=""
            className="h-24 md:h-28 mx-auto mb-5 object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.25)]"
          />
        )}
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
          style={{ background: `${cSec}22`, color: cSec, border: `1px solid ${cSec}55` }}
        >
          <Trophy className="w-3.5 h-3.5" /> {torneo.deporte}
        </div>
        <h1
          className="text-4xl md:text-6xl font-black leading-tight tracking-tight"
          style={{ textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}
        >
          {torneo.nombre}
        </h1>
        {torneo.organizadores && (
          <p className="mt-3 text-white/70 text-sm md:text-base">{torneo.organizadores}</p>
        )}
        {torneo.fecha_inicio && (
          <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-sm text-white/90">
            <Calendar className="w-4 h-4" />
            {format(new Date(torneo.fecha_inicio), "dd/MM/yyyy")}
            {torneo.fecha_fin && ` – ${format(new Date(torneo.fecha_fin), "dd/MM/yyyy")}`}
          </div>
        )}
      </div>
    </div>
  );
}