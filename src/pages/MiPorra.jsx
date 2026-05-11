import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import PorraHeroLanding from "@/components/porra/PorraHeroLanding";
import PorraComoFunciona from "@/components/porra/PorraComoFunciona";
import PorraGruposPreview from "@/components/porra/PorraGruposPreview";
import PorraEmailMagicoInfo from "@/components/porra/PorraEmailMagicoInfo";

// Versión INTERNA de la Porra (dentro de la app autenticada, con layout y menú lateral)
// La versión pública sigue en /Porra para embeber en la web externa del club.
export default function MiPorra() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [stats, setStats] = useState({ participantes: 0, bote: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Porra Mundial 2026";
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
      const aporteClub = Number(cfg?.aporte_inicial_club) || 0;
      setStats({
        participantes: participantes.length,
        bote: participantes.length * precio + aporteClub,
      });
    } catch (e) {
      console.error('Error cargando porra:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPorra = () => {
    // Abrir la página pública de creación en nueva pestaña (incluye flujo Stripe)
    window.open('/PorraCrear', '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Trophy className="w-12 h-12 animate-pulse text-orange-600" />
      </div>
    );
  }

  if (!config?.activa) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <div className="bg-gradient-to-br from-slate-100 to-orange-50 rounded-2xl p-10 border border-orange-200">
          <Trophy className="w-20 h-20 mx-auto text-yellow-500 mb-4 animate-pulse" />
          <h1 className="text-3xl font-black mb-2">Porra Mundial 2026</h1>
          <p className="text-lg text-slate-600 mb-4">🔒 La porra aún no está abierta</p>
          <p className="text-slate-500">Estamos preparándolo todo. ¡Vuelve pronto!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <PorraHeroLanding
        config={config}
        onCrearPorra={handleCrearPorra}
        totalParticipantes={stats.participantes}
        bote={stats.bote}
      />
      <PorraEmailMagicoInfo />
      <PorraComoFunciona config={config} />
      <PorraGruposPreview equipos={equipos} />

      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 py-12 px-4 text-center text-white">
        <Trophy className="w-14 h-14 mx-auto mb-3 text-yellow-200" />
        <h2 className="text-2xl md:text-4xl font-black mb-2">¿Listo para ganar?</h2>
        <p className="text-base md:text-lg mb-6 text-white/90 max-w-2xl mx-auto">
          {stats.participantes > 0
            ? `Ya hay ${stats.participantes} valientes apuntados. ¿Y tú?`
            : '¡Sé el primero en apuntarte!'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={handleCrearPorra}
            className="bg-white text-red-700 hover:bg-yellow-100 font-black text-lg px-10 py-6 rounded-2xl shadow-2xl hover:scale-105 transition-all"
          >
            <Trophy className="w-5 h-5 mr-2" />
            APUNTAR MI PORRA
          </Button>
          <Button
            onClick={() => navigate('/PorraRanking')}
            variant="outline"
            className="bg-white/10 border-2 border-white/40 text-white hover:bg-white/20 font-bold text-base px-8 py-6 rounded-2xl backdrop-blur"
          >
            🏆 Ver ranking
          </Button>
        </div>
      </div>
    </div>
  );
}