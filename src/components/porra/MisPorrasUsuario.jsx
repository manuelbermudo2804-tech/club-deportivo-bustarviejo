import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Trophy, ArrowRight, CheckCircle2, Clock, Plus, BarChart3, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lista las porras del usuario logueado (detectadas por su email) con acceso directo
// a cada una (vía token mágico) + accesos rápidos al ranking y a crear nueva porra.
export default function MisPorrasUsuario({ onCrearNueva }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [misPorras, setMisPorras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (cancel) return;
        setUser(me);
        if (me?.email) {
          const porras = await base44.entities.PorraParticipante.filter({ email: me.email });
          if (!cancel) setMisPorras(porras || []);
        }
      } catch {
        // usuario no autenticado o sin porras
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  if (loading) return null;
  if (!user) return null;

  // Si no tiene porras todavía, mostrar CTA de bienvenida personalizado
  if (misPorras.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-6">
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-5 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-lg text-slate-900">¡Hola, {user.full_name?.split(' ')[0] || 'jugador'}!</h3>
              <p className="text-slate-600 text-sm mb-3">
                Todavía no tienes ninguna porra. Apúntate con tu email <span className="font-bold">{user.email}</span> y empieza a competir.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={onCrearNueva} className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
                  <Plus className="w-4 h-4 mr-1" /> Crear mi porra
                </Button>
                <Button onClick={() => navigate('/PorraRanking?from=app')} variant="outline" className="font-bold">
                  <BarChart3 className="w-4 h-4 mr-1" /> Ver ranking
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const abrirMiPorra = (token) => {
    // Navegación INTERNA: mismo entorno autenticado, con marcador from=app
    // para que la página sepa que debe volver a /MiPorra (no a la web pública)
    navigate(`/PorraMiPorra?token=${token}&from=app`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6">
      <div className="bg-white border-2 border-orange-200 rounded-2xl p-5 lg:p-6 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-orange-600" />
              Mis Porras ({misPorras.length})
            </h3>
            <p className="text-xs text-slate-500">Detectadas por tu email: {user.email}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/PorraRanking?from=app')} variant="outline" size="sm" className="font-bold">
              <BarChart3 className="w-4 h-4 mr-1" /> Ranking
            </Button>
            <Button onClick={onCrearNueva} size="sm" className="bg-orange-600 hover:bg-orange-700 text-white font-bold">
              <Plus className="w-4 h-4 mr-1" /> Nueva porra
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {misPorras.map((p) => {
            const pagado = p.estado_pago === 'pagado';
            const completado = p.porcentaje_completado || 0;
            return (
              <button
                key={p.id}
                onClick={() => abrirMiPorra(p.token_acceso)}
                className="text-left bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 hover:border-orange-400 hover:shadow-md rounded-xl p-4 transition-all group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-slate-900 truncate">{p.alias_equipo || 'Sin alias'}</p>
                    <p className="text-xs text-slate-500 truncate">{p.nombre}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-orange-600 flex-shrink-0" />
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {pagado ? (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Pagada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                      <Clock className="w-3 h-3" /> Pendiente
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                    {completado}% completada
                  </span>
                  {typeof p.posicion_ranking === 'number' && p.posicion_ranking > 0 && (
                    <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">
                      🏆 #{p.posicion_ranking}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{p.puntos_total || 0} pts</span>
                  <span className="text-orange-600 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Abrir <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}