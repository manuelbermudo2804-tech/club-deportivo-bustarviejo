import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Loader2, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Página privada para que un participante acceda a SU porra con su token mágico
// /PorraMiPorra?token=XXXXXX
export default function PorraMiPorra() {
  const [participante, setParticipante] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "Mi Porra — Mundial 2026";
    cargar();
  }, []);

  const cargar = async () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError('Falta el token de acceso en la URL');
      setLoading(false);
      return;
    }
    try {
      const [parts, configs] = await Promise.all([
        base44.entities.PorraParticipante.filter({ token_acceso: token }),
        base44.entities.PorraConfig.list(),
      ]);
      const p = parts[0];
      if (!p) {
        setError('Token no válido o porra no encontrada');
      } else {
        setParticipante(p);
        setConfig(configs[0] || null);
      }
    } catch (e) {
      setError('Error al cargar tu porra');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600">
        <Loader2 className="w-10 h-10 animate-spin text-white" />
      </div>
    );
  }

  if (error || !participante) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 mx-auto text-red-400 mb-3" />
            <h1 className="text-xl font-black mb-2">Acceso denegado</h1>
            <p className="text-white/70 text-sm">{error || 'No hemos podido cargar tu porra'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no ha pagado
  if (participante.estado_pago !== 'pagado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-4">
        <Card className="max-w-md bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
            <h1 className="text-xl font-black mb-2">Pago pendiente</h1>
            <p className="text-white/70 text-sm mb-4">Tu pago aún no se ha confirmado. Si acabas de pagar, espera unos segundos y recarga.</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
              Recargar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completado = participante.porcentaje_completado || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Trophy className="w-8 h-8 text-yellow-300 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-black truncate">{participante.alias_equipo}</h1>
                <p className="text-xs text-white/80 truncate">{participante.nombre} · {participante.puntos_total || 0} pts</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-white/80">Completado</p>
              <p className="text-xl font-black">{completado}%</p>
            </div>
          </div>
          <div className="mt-3">
            <Progress value={completado} className="h-2 bg-white/20" />
          </div>
        </div>
      </div>

      {/* Content placeholder - Fase 3 */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <Card className="border-2 border-orange-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-3" />
            <h2 className="text-2xl font-black text-slate-900 mb-2">¡Estás dentro! 🎉</h2>
            <p className="text-slate-600 mb-6">
              Tu porra está lista. <strong>Pronto activaremos el editor de predicciones</strong> para que metas tus pronósticos de los 12 grupos, eliminatorias y predicciones especiales.
            </p>

            <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
              <div className={`p-3 rounded-lg ${participante.completado_grupos ? 'bg-green-100 border-2 border-green-400' : 'bg-slate-100 border-2 border-slate-200'}`}>
                <div className="text-2xl">⚽</div>
                <div className="text-xs font-bold mt-1">Grupos</div>
                <div className="text-[10px] text-slate-500">{participante.completado_grupos ? '✅ Hecho' : 'Pendiente'}</div>
              </div>
              <div className={`p-3 rounded-lg ${participante.completado_bracket ? 'bg-green-100 border-2 border-green-400' : 'bg-slate-100 border-2 border-slate-200'}`}>
                <div className="text-2xl">🏆</div>
                <div className="text-xs font-bold mt-1">Bracket</div>
                <div className="text-[10px] text-slate-500">{participante.completado_bracket ? '✅ Hecho' : 'Pendiente'}</div>
              </div>
              <div className={`p-3 rounded-lg ${participante.completado_especiales ? 'bg-green-100 border-2 border-green-400' : 'bg-slate-100 border-2 border-slate-200'}`}>
                <div className="text-2xl">⭐</div>
                <div className="text-xs font-bold mt-1">Especiales</div>
                <div className="text-[10px] text-slate-500">{participante.completado_especiales ? '✅ Hecho' : 'Pendiente'}</div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-left text-sm">
              <p className="font-bold text-blue-900 mb-2">📌 Guarda tu acceso</p>
              <p className="text-blue-800">
                <strong>Añade esta página a favoritos</strong> o guarda el email que te hemos enviado. Es tu único acceso a tu porra (no usamos contraseñas).
              </p>
            </div>
          </CardContent>
        </Card>

        {config?.fecha_limite_predicciones && (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-yellow-900">
                <strong>⏰ Fecha límite:</strong> {new Date(config.fecha_limite_predicciones).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}