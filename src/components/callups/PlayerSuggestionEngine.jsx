import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Calendar,
  Star,
  RotateCcw,
  Info
} from "lucide-react";

export default function PlayerSuggestionEngine({ 
  players, 
  category, 
  matchDate,
  onSuggestPlayers, 
  selectedPlayers,
  isEnabled,
  onToggleEnabled
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showDetails, setShowDetails] = useState(false);

  const calculatePlayerScore = async (player, attendances, evaluations, callups) => {
    let score = 0;
    const details = {
      asistencia: 0,
      rendimiento: 0,
      rotacion: 0,
      disponibilidad: true
    };

    // 1. DISPONIBILIDAD (filtro excluyente)
    if (player.lesionado || player.sancionado) {
      details.disponibilidad = false;
      return { score: -1, details, excluded: true, reason: player.lesionado ? "Lesionado" : "Sancionado" };
    }

    // Verificar fecha de disponibilidad
    if (player.fecha_disponibilidad && matchDate) {
      const disponibilidadDate = new Date(player.fecha_disponibilidad);
      const partidoDate = new Date(matchDate);
      if (disponibilidadDate > partidoDate) {
        details.disponibilidad = false;
        return { score: -1, details, excluded: true, reason: `No disponible hasta ${disponibilidadDate.toLocaleDateString('es-ES')}` };
      }
    }

    // 2. ASISTENCIA (peso 50%) - Últimas 8 semanas
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    
    const playerAttendances = attendances.filter(a => 
      a.categoria === category &&
      new Date(a.fecha) >= eightWeeksAgo
    );

    let totalSessions = 0;
    let attendedSessions = 0;

    playerAttendances.forEach(attendance => {
      const playerRecord = attendance.asistencias?.find(a => a.jugador_id === player.id);
      if (playerRecord) {
        totalSessions++;
        if (playerRecord.estado === "presente" || playerRecord.estado === "tardanza") {
          attendedSessions++;
        }
      }
    });

    if (totalSessions > 0) {
      details.asistencia = Math.round((attendedSessions / totalSessions) * 100);
      score += (details.asistencia / 100) * 50; // 50 puntos máx
    } else {
      details.asistencia = 50; // Sin datos, puntuación media
      score += 25;
    }

    // 3. RENDIMIENTO (peso 30%) - Última evaluación
    const playerEvaluations = evaluations
      .filter(e => e.jugador_id === player.id)
      .sort((a, b) => new Date(b.fecha_evaluacion) - new Date(a.fecha_evaluacion));

    if (playerEvaluations.length > 0) {
      const lastEval = playerEvaluations[0];
      const avgScore = (
        (lastEval.tecnica || 3) +
        (lastEval.tactica || 3) +
        (lastEval.fisica || 3) +
        (lastEval.actitud || 3) +
        (lastEval.trabajo_equipo || 3)
      ) / 5;
      details.rendimiento = Math.round((avgScore / 5) * 100);
      score += (avgScore / 5) * 30; // 30 puntos máx
    } else {
      details.rendimiento = 60; // Sin datos, puntuación media-baja
      score += 18;
    }

    // 4. ROTACIÓN (peso 20%) - Últimas 4 convocatorias
    const recentCallups = callups
      .filter(c => c.categoria === category && c.publicada)
      .sort((a, b) => new Date(b.fecha_partido) - new Date(a.fecha_partido))
      .slice(0, 4);

    let callupsCount = 0;
    recentCallups.forEach(callup => {
      const wasConvoked = callup.jugadores_convocados?.some(j => j.jugador_id === player.id);
      if (wasConvoked) callupsCount++;
    });

    // Menos convocatorias recientes = más prioridad
    if (recentCallups.length > 0) {
      const rotationScore = 1 - (callupsCount / recentCallups.length);
      details.rotacion = Math.round(rotationScore * 100);
      score += rotationScore * 20; // 20 puntos máx
    } else {
      details.rotacion = 100; // Sin convocatorias previas, máxima prioridad
      score += 20;
    }

    return { score: Math.round(score), details, excluded: false };
  };

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    try {
      // Cargar datos necesarios
      const [attendances, evaluations, callups] = await Promise.all([
        base44.entities.Attendance.list(),
        base44.entities.PlayerEvaluation.list(),
        base44.entities.Convocatoria.list()
      ]);

      // Calcular puntuación para cada jugador
      const scoredPlayers = await Promise.all(
        players.map(async (player) => {
          const result = await calculatePlayerScore(player, attendances, evaluations, callups);
          return {
            ...player,
            suggestionScore: result.score,
            suggestionDetails: result.details,
            excluded: result.excluded,
            exclusionReason: result.reason
          };
        })
      );

      // Separar excluidos y ordenar por puntuación
      const availablePlayers = scoredPlayers
        .filter(p => !p.excluded)
        .sort((a, b) => b.suggestionScore - a.suggestionScore);

      const excludedPlayers = scoredPlayers.filter(p => p.excluded);

      setSuggestions({
        available: availablePlayers,
        excluded: excludedPlayers
      });

    } catch (error) {
      console.error("Error generando sugerencias:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestions = () => {
    if (suggestions.available) {
      // Seleccionar todos los disponibles (política: que jueguen todos)
      const suggestedIds = suggestions.available.map(p => p.id);
      onSuggestPlayers(suggestedIds);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-blue-600 bg-blue-100";
    if (score >= 40) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  if (!isEnabled) {
    return (
      <Card className="border-2 border-dashed border-slate-300 bg-slate-50">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-medium text-slate-700">Sugerencia Automática de Jugadores</p>
                <p className="text-sm text-slate-500">Desactivada - Selecciona jugadores manualmente</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="enable-suggestions" className="text-sm text-slate-600">Activar</Label>
              <Switch
                id="enable-suggestions"
                checked={isEnabled}
                onCheckedChange={onToggleEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 bg-purple-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Sugerencia Automática de Jugadores
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="toggle-suggestions" className="text-sm text-slate-600">Activo</Label>
            <Switch
              id="toggle-suggestions"
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              className="data-[state=checked]:bg-purple-600"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-purple-100 border-purple-300">
          <Info className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-purple-800 text-sm">
            <strong>Criterios:</strong> Asistencia (50%) → Rendimiento (30%) → Rotación (20%)
            <br />
            <strong>Política del club:</strong> Que jueguen todos los disponibles
          </AlertDescription>
        </Alert>

        {!suggestions.available ? (
          <Button
            onClick={generateSuggestions}
            disabled={isLoading || !matchDate}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analizando jugadores...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generar Sugerencias
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Jugadores excluidos */}
            {suggestions.excluded.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  No disponibles ({suggestions.excluded.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.excluded.map(player => (
                    <Badge 
                      key={player.id} 
                      variant="outline"
                      className="bg-red-50 border-red-300 text-red-700"
                    >
                      {player.nombre} - {player.exclusionReason}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Jugadores sugeridos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Disponibles ({suggestions.available.length})
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs"
                >
                  {showDetails ? "Ocultar detalles" : "Ver detalles"}
                </Button>
              </div>

              {showDetails ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {suggestions.available.map((player, idx) => (
                    <div 
                      key={player.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-500 w-6">#{idx + 1}</span>
                        <span className="font-medium">{player.nombre}</span>
                        {player.posicion && player.posicion !== "Sin asignar" && (
                          <Badge variant="outline" className="text-xs">{player.posicion}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="w-3 h-3 text-blue-500" />
                          <span>{player.suggestionDetails.asistencia}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span>{player.suggestionDetails.rendimiento}%</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                          <RotateCcw className="w-3 h-3 text-green-500" />
                          <span>{player.suggestionDetails.rotacion}%</span>
                        </div>
                        <Badge className={`${getScoreColor(player.suggestionScore)} text-xs`}>
                          {player.suggestionScore}pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {suggestions.available.slice(0, 10).map(player => (
                    <Badge 
                      key={player.id} 
                      variant="outline"
                      className="bg-green-50 border-green-300 text-green-700"
                    >
                      {player.nombre}
                    </Badge>
                  ))}
                  {suggestions.available.length > 10 && (
                    <Badge variant="outline" className="bg-slate-100">
                      +{suggestions.available.length - 10} más
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <Button
                onClick={handleApplySuggestions}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Aplicar Sugerencia ({suggestions.available.length} jugadores)
              </Button>
              <Button
                variant="outline"
                onClick={() => setSuggestions([])}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {!matchDate && (
          <p className="text-xs text-amber-600 text-center">
            ⚠️ Selecciona la fecha del partido para generar sugerencias
          </p>
        )}
      </CardContent>
    </Card>
  );
}