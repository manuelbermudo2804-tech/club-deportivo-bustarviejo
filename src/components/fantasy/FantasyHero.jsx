import React from "react";
import { Trophy, Users, Calendar } from "lucide-react";

export default function FantasyHero({ totalParticipantes, fechaLimite, precio }) {
  const fechaLimiteFmt = fechaLimite ? new Date(fechaLimite).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }) : 'Antes del inicio del Mundial';
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, #fbbf24 0%, transparent 50%), radial-gradient(circle at 70% 80%, #ec4899 0%, transparent 50%)' }} />
      <div className="relative max-w-5xl mx-auto px-6 py-12 lg:py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-400 text-yellow-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
          <Trophy className="w-4 h-4" /> Fantasy Mundial CDB
        </div>
        <h1 className="text-4xl lg:text-6xl font-black mb-4 tracking-tight">
          Acierta el Mundial.
          <br />
          <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">Llévate el premio.</span>
        </h1>
        <p className="text-lg lg:text-xl text-white/80 max-w-2xl mx-auto mb-8">
          Predice el campeón, los semifinalistas, el goleador y mucho más. ¡Cuantos más jugamos, más grande es el premio!
        </p>
        <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
            <Users className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
            <div className="text-2xl lg:text-3xl font-black">{totalParticipantes}</div>
            <div className="text-xs text-white/70">Participantes</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
            <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
            <div className="text-2xl lg:text-3xl font-black">{precio}€</div>
            <div className="text-xs text-white/70">Inscripción</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
            <div className="text-sm lg:text-base font-bold leading-tight">{fechaLimiteFmt}</div>
            <div className="text-xs text-white/70">Fecha límite</div>
          </div>
        </div>
      </div>
    </div>
  );
}