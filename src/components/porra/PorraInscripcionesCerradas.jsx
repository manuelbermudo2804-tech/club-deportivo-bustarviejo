import React from "react";
import { useNavigate } from "react-router-dom";
import { Trophy, Lock, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pantalla mostrada cuando el plazo de inscripciones ha cerrado.
// Reemplaza el CTA de "apuntar" por accesos a ranking y recuperación de porras.
export default function PorraInscripcionesCerradas({ stats = {}, onRecuperar, fechaInicioMundial }) {
  const navigate = useNavigate();
  const participantes = stats.participantes || 0;
  const bote = stats.bote || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-orange-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full text-center text-white">
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-40 animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-red-700 to-orange-700 rounded-full p-6 border-4 border-yellow-400 shadow-2xl">
            <Lock className="w-16 h-16 text-yellow-300" />
          </div>
        </div>

        <span className="inline-block bg-yellow-400 text-red-900 font-black px-4 py-1.5 rounded-full text-xs tracking-wider uppercase shadow-xl border-2 border-white/40 mb-3">
          🌎 Mundial FIFA 2026
        </span>

        <h1 className="text-4xl md:text-5xl font-black mb-3 drop-shadow-lg">
          ¡Inscripciones cerradas!
        </h1>
        <p className="text-lg text-white/85 mb-6 max-w-md mx-auto">
          El plazo para apuntar nuevas porras ha terminado. Que ruede el balón 🎉
        </p>

        {(participantes > 0 || bote > 0) && (
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-7">
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border-2 border-yellow-400/40">
              <div className="text-3xl font-black text-yellow-300">{participantes}</div>
              <div className="text-[10px] uppercase tracking-wider text-white/80 font-bold">Participantes</div>
            </div>
            <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border-2 border-yellow-400/40">
              <div className="text-3xl font-black text-yellow-300">{Number(bote).toFixed(0)}€</div>
              <div className="text-[10px] uppercase tracking-wider text-white/80 font-bold">Bote total</div>
            </div>
          </div>
        )}

        {fechaInicioMundial && (
          <p className="text-sm text-white/70 mb-6">
            🏟️ El Mundial arranca el{' '}
            <strong className="text-yellow-200">
              {new Date(fechaInicioMundial).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </strong>
          </p>
        )}

        <div className="space-y-3">
          <Button
            onClick={() => navigate('/PorraRanking')}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black text-lg px-8 py-7 rounded-2xl shadow-[0_0_30px_rgba(255,200,0,0.4)] hover:scale-105 transition-all border-2 border-white/40"
          >
            <Trophy className="w-6 h-6 mr-2" />
            VER RANKING EN VIVO
          </Button>

          {onRecuperar && (
            <button
              onClick={onRecuperar}
              className="w-full inline-flex items-center justify-center gap-2 text-white/90 hover:text-white underline text-sm font-medium py-2"
            >
              <Mail className="w-4 h-4" />
              ¿Ya juegas? Recupera tus porras por email
            </button>
          )}

          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Volver a la app del club
          </Button>
        </div>
      </div>
    </div>
  );
}