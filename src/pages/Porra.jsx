import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Trophy, ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import PorraHeroLanding from "@/components/porra/PorraHeroLanding";
import PorraComoFunciona from "@/components/porra/PorraComoFunciona";
import PorraGruposPreview from "@/components/porra/PorraGruposPreview";
import PorraVolverAppButton from "@/components/porra/PorraVolverAppButton";
import PorraEmailMagicoInfo from "@/components/porra/PorraEmailMagicoInfo";
import PorraRecuperarAccesosModal from "@/components/porra/PorraRecuperarAccesosModal";

// Landing pública de la Porra Mundial 2026
// Accesible vía /Porra sin login
export default function Porra() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [stats, setStats] = useState({ participantes: 0, bote: 0 });
  const [loading, setLoading] = useState(true);
  const [showRecuperar, setShowRecuperar] = useState(false);

  useEffect(() => {
    document.title = "Porra Mundial 2026 — by CD Bustarviejo";
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const res = await base44.functions.invoke('porraPublicLanding', {});
      const d = res.data || {};
      setConfig(d.config);
      setEquipos(d.equipos || []);
      setStats({
        participantes: d.stats?.total_participantes || 0,
        bote: d.stats?.bote || 0,
      });
    } catch (e) {
      console.error('Error cargando porra:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPorra = () => {
    navigate('/PorraCrear');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600">
        <div className="text-white text-center">
          <Trophy className="w-16 h-16 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-bold">Cargando porra...</p>
        </div>
      </div>
    );
  }

  // Si la porra no está activa
  if (!config?.activa) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-orange-900 flex items-center justify-center p-4">
        <div className="max-w-md text-center text-white">
          <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-6 animate-pulse" />
          <h1 className="text-4xl font-black mb-3">Porra Mundial 2026</h1>
          <p className="text-xl text-white/80 mb-6">
            🔒 La porra aún no está abierta
          </p>
          <p className="text-white/60 mb-8">
            Estamos preparándolo todo. ¡Vuelve pronto para apuntarte y ganar premios!
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Volver a la app del club
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <PorraVolverAppButton />
      <PorraHeroLanding 
        config={config}
        onCrearPorra={handleCrearPorra}
        totalParticipantes={stats.participantes}
        bote={stats.bote}
      />
      <PorraEmailMagicoInfo />
      <PorraComoFunciona config={config} />
      <PorraGruposPreview equipos={equipos} />

      {/* CTA final */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 py-16 px-4 text-center text-white">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-200" />
        <h2 className="text-3xl md:text-5xl font-black mb-3">¿Listo para ganar?</h2>
        <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
          {stats.participantes > 0 
            ? `Ya hay ${stats.participantes} valientes apuntados. ¿Y tú?`
            : '¡Sé el primero en apuntarte!'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button 
            onClick={handleCrearPorra}
            className="bg-white text-red-700 hover:bg-yellow-100 font-black text-xl px-12 py-7 rounded-2xl shadow-2xl hover:scale-105 transition-all"
          >
            <Trophy className="w-6 h-6 mr-2" />
            APUNTAR MI PORRA
          </Button>
          <Button 
            onClick={() => navigate('/PorraRanking')}
            variant="outline"
            className="bg-white/10 border-2 border-white/40 text-white hover:bg-white/20 font-bold text-lg px-8 py-7 rounded-2xl backdrop-blur"
          >
            🏆 Ver ranking
          </Button>
        </div>
        <button
          onClick={() => setShowRecuperar(true)}
          className="mt-6 inline-flex items-center gap-2 text-white/90 hover:text-white underline text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          ¿Ya juegas? Recupera tus porras por email
        </button>
      </div>

      <PorraRecuperarAccesosModal open={showRecuperar} onOpenChange={setShowRecuperar} />

      {/* Footer simple */}
      <div className="bg-slate-900 text-white/70 py-6 text-center text-sm">
        <p>© {new Date().getFullYear()} CD Bustarviejo · Porra Mundial 2026</p>
        <p className="mt-1 text-xs">El {config?.comision_club_porcentaje || 10}% de cada entrada va para apoyar a los equipos del CD Bustarviejo 💚</p>
      </div>
    </div>
  );
}