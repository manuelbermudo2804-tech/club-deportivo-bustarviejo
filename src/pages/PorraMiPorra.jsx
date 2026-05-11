import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Loader2, Lock, AlertCircle, CheckCircle2, Save, Clock, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePorraEditor from "@/components/porra/editor/usePorraEditor";
import EditorGrupos from "@/components/porra/editor/EditorGrupos";
import EditorBracket from "@/components/porra/editor/EditorBracket";
import EditorEspeciales from "@/components/porra/editor/EditorEspeciales";

// Hub principal del editor de porra
// Lee ?token=XXX de la URL y muestra los 3 editores (grupos, bracket, especiales)
export default function PorraMiPorra() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  const {
    participante, config, equipos, partidos,
    loading, saving, error, isBlocked,
    setResultadoGrupo, setClasificacionGrupo,
    setEliminatoriaGanador, setEspecial,
  } = usePorraEditor(token);

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
            <h1 className="text-xl font-black mb-2">{error === 'Pago pendiente' ? 'Pago pendiente' : 'Acceso denegado'}</h1>
            <p className="text-white/70 text-sm mb-4">
              {error === 'Pago pendiente'
                ? 'Tu pago aún no se ha confirmado. Espera unos segundos y recarga.'
                : (error || 'No hemos podido cargar tu porra')}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.reload()} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                Recargar
              </Button>
              <Button onClick={() => navigate('/Porra')} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Home className="w-4 h-4 mr-1" /> Inicio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completado = participante.porcentaje_completado || 0;
  const fechaLimite = config?.fecha_limite_predicciones ? new Date(config.fecha_limite_predicciones) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header sticky */}
      <div className="bg-gradient-to-r from-red-600 via-orange-600 to-yellow-500 text-white sticky top-0 z-20 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Trophy className="w-7 h-7 text-yellow-300 flex-shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-black truncate">{participante.alias_equipo}</h1>
                <p className="text-[10px] md:text-xs text-white/80 truncate">
                  {participante.nombre} · {participante.puntos_total || 0} pts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Guardando
                </span>
              )}
              {!saving && completado > 0 && (
                <span className="text-xs bg-green-500/30 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                  <Save className="w-3 h-3" /> {completado}%
                </span>
              )}
            </div>
          </div>
          <div className="mt-2">
            <Progress value={completado} className="h-1.5 bg-white/20" />
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 md:px-4 py-4 space-y-4">
        {/* Aviso bloqueo */}
        {isBlocked && (
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="p-4 flex items-start gap-3">
              <Lock className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Porra bloqueada 🔒</p>
                <p className="text-sm text-red-700 mt-0.5">
                  El plazo de predicciones ha cerrado. Tu porra está guardada y empezará a sumar puntos cuando comiencen los partidos.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fecha límite */}
        {fechaLimite && !isBlocked && (
          <Card className="border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-3 flex items-center gap-3 text-sm">
              <Clock className="w-5 h-5 text-orange-600 flex-shrink-0" />
              <p className="text-yellow-900 flex-1">
                <strong>⏰ Cierre:</strong> {fechaLimite.toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Estado mini-resumen */}
        <div className="grid grid-cols-3 gap-2">
          <StatusCard ok={participante.completado_grupos} label="Grupos" icon="⚽" />
          <StatusCard ok={participante.completado_bracket} label="Bracket" icon="🏆" />
          <StatusCard ok={participante.completado_especiales} label="Especiales" icon="⭐" />
        </div>

        {/* Tabs editor */}
        <Tabs defaultValue="grupos">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-slate-200">
            <TabsTrigger value="grupos" className="py-2 text-xs md:text-sm font-bold">⚽ Grupos</TabsTrigger>
            <TabsTrigger value="bracket" className="py-2 text-xs md:text-sm font-bold">🏆 Bracket</TabsTrigger>
            <TabsTrigger value="especiales" className="py-2 text-xs md:text-sm font-bold">⭐ Especiales</TabsTrigger>
          </TabsList>

          <TabsContent value="grupos" className="mt-4">
            <EditorGrupos
              participante={participante}
              partidos={partidos}
              equipos={equipos}
              isBlocked={isBlocked}
              onSetResultado={setResultadoGrupo}
              onSetClasificacion={setClasificacionGrupo}
            />
          </TabsContent>
          <TabsContent value="bracket" className="mt-4">
            <EditorBracket
              participante={participante}
              partidos={partidos}
              equipos={equipos}
              isBlocked={isBlocked}
              onSetGanador={setEliminatoriaGanador}
            />
          </TabsContent>
          <TabsContent value="especiales" className="mt-4">
            <EditorEspeciales
              participante={participante}
              equipos={equipos}
              isBlocked={isBlocked}
              onSetEspecial={setEspecial}
            />
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center py-6 text-xs text-slate-500">
          💾 <strong>Auto-guardado activado.</strong> Tus cambios se guardan solos cada pocos segundos.
        </div>
      </div>
    </div>
  );
}

function StatusCard({ ok, label, icon }) {
  return (
    <div className={`rounded-lg p-2 md:p-3 text-center border-2 transition-colors ${
      ok ? 'bg-green-50 border-green-400' : 'bg-white border-slate-200'
    }`}>
      <div className="text-xl md:text-2xl">{icon}</div>
      <p className="text-[10px] md:text-xs font-bold text-slate-700 mt-0.5">{label}</p>
      <p className="text-[9px] md:text-[10px] text-slate-500">{ok ? '✅ Hecho' : 'Pendiente'}</p>
    </div>
  );
}