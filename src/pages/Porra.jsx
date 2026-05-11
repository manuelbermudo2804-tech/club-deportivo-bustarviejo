import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Trophy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import PorraHeroLanding from "@/components/porra/PorraHeroLanding";
import PorraComoFunciona from "@/components/porra/PorraComoFunciona";
import PorraGruposPreview from "@/components/porra/PorraGruposPreview";

// Landing pública de la Porra Mundial 2026
// Accesible vía /Porra sin login
export default function Porra() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [stats, setStats] = useState({ participantes: 0, bote: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Porra Mundial 2026 — by CD Bustarviejo";
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [configs, eqs, participantes] = await Promise.all([
        base44.entities.PorraConfig.list().catch(() => []),
        base44.entities.PorraEquipo.list().catch(() => []),
        base44.entities.PorraParticipante.filter({ estado_pago: 'pagado' }).catch(() => []),
      ]);
      const cfg = configs[0] || null;
      setConfig(cfg);
      setEquipos(eqs);
      const precio = cfg?.precio_entrada || 15;
      setStats({
        participantes: participantes.length,
        bote: participantes.length * precio,
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
      <PorraHeroLanding 
        config={config}
        onCrearPorra={handleCrearPorra}
        totalParticipantes={stats.participantes}
        bote={stats.bote}
      />
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
        <Button 
          onClick={handleCrearPorra}
          className="bg-white text-red-700 hover:bg-yellow-100 font-black text-xl px-12 py-7 rounded-2xl shadow-2xl hover:scale-105 transition-all"
        >
          <Trophy className="w-6 h-6 mr-2" />
          APUNTAR MI PORRA
        </Button>
      </div>

      {/* Footer simple */}
      <div className="bg-slate-900 text-white/70 py-6 text-center text-sm">
        <p>© {new Date().getFullYear()} CD Bustarviejo · Porra Mundial 2026</p>
        <p className="mt-1 text-xs">El {config?.comision_club_porcentaje || 10}% de cada entrada va destinado a {config?.destino_comision_club || 'el club'} 💚</p>
      </div>
    </div>
  );
}