import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, Users, Zap, Heart, Pencil, Trash2, ChevronDown, ChevronUp, Target, MapPin, Shuffle } from "lucide-react";

const intensityColors = {
  "Baja": "bg-green-100 text-green-800",
  "Media": "bg-yellow-100 text-yellow-800",
  "Alta": "bg-orange-100 text-orange-800",
  "Muy Alta": "bg-red-100 text-red-800",
};

const sportEmojis = {
  "Fútbol": "⚽",
  "Baloncesto": "🏀",
};

export default function ExerciseCard({ exercise, onEdit, onDelete, onToggleFavorite, onCreateVariant, canEdit }) {
  const [showDetails, setShowDetails] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <Card className={`group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-xl ${exercise.favorito ? 'ring-2 ring-pink-300' : ''}`}>
        <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-200" />
        <CardHeader className="pb-3 pt-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-2xl ring-1 ring-orange-100">
              {sportEmojis[exercise.deporte] || "🏃"}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge className={`rounded-full px-2.5 py-1 text-xs font-semibold ${intensityColors[exercise.intensidad] || "bg-slate-100 text-slate-800"}`}>
                  {exercise.intensidad || "Media"}
                </Badge>
                {exercise.favorito && <Badge className="rounded-full bg-pink-50 text-pink-700 hover:bg-pink-50">Favorito</Badge>}
              </div>
              <CardTitle className="break-words text-base font-bold leading-snug text-slate-900 sm:text-lg line-clamp-2">
                {exercise.nombre}
              </CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onToggleFavorite} aria-label={exercise.favorito ? "Quitar de favoritos" : "Añadir a favoritos"} className="h-10 w-10 shrink-0 rounded-xl hover:bg-pink-50">
              <Heart className={`h-5 w-5 ${exercise.favorito ? 'fill-pink-500 text-pink-500' : 'text-slate-400'}`} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex h-full flex-col space-y-4">
          {/* Category Badge */}
          <Badge variant="outline" className="text-xs">
            {exercise.categoria_ejercicio}
          </Badge>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:flex sm:flex-wrap sm:gap-3 sm:bg-transparent sm:p-0">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{exercise.duracion_minutos} min</span>
            </div>
            {(exercise.jugadores_min || exercise.jugadores_max) && (
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {exercise.jugadores_min || "?"}-{exercise.jugadores_max || "?"} jug.
                </span>
              </div>
            )}
            {exercise.espacio_necesario && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="truncate max-w-[80px]">{exercise.espacio_necesario}</span>
              </div>
            )}
          </div>

          {/* Description Preview */}
          <p className={`text-sm text-slate-600 ${expanded ? '' : 'line-clamp-2'}`}>
            {exercise.descripcion}
          </p>

          {exercise.descripcion?.length > 100 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              {expanded ? (
                <>Ver menos <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Ver más <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}

          {/* Materials */}
          {exercise.materiales?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {exercise.materiales.slice(0, 3).map((mat, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {mat}
                </Badge>
              ))}
              {exercise.materiales.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{exercise.materiales.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="h-10 flex-1 rounded-xl border-orange-200 font-semibold text-orange-700 hover:bg-orange-50 hover:text-orange-800"
            >
              Ver detalles
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateVariant?.(exercise)}
                  className="h-10 flex-1 rounded-xl border-orange-200 font-semibold text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                >
                  <Shuffle className="mr-1.5 h-4 w-4" /> Variante
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                  className="h-10 w-10 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-10 w-10 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {sportEmojis[exercise.deporte]} {exercise.nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={intensityColors[exercise.intensidad]}>
                Intensidad: {exercise.intensidad}
              </Badge>
              <Badge variant="outline">{exercise.categoria_ejercicio}</Badge>
              {exercise.nivel_edad?.map((edad, i) => (
                <Badge key={i} variant="secondary">{edad}</Badge>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Clock className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                <p className="text-lg font-bold">{exercise.duracion_minutos}'</p>
                <p className="text-xs text-slate-500">Duración</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Users className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                <p className="text-lg font-bold">{exercise.jugadores_min}-{exercise.jugadores_max}</p>
                <p className="text-xs text-slate-500">Jugadores</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <MapPin className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                <p className="text-sm font-bold truncate">{exercise.espacio_necesario || "Variable"}</p>
                <p className="text-xs text-slate-500">Espacio</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <Zap className="w-5 h-5 mx-auto text-slate-500 mb-1" />
                <p className="text-sm font-bold">{exercise.momento_sesion || "Flexible"}</p>
                <p className="text-xs text-slate-500">Momento</p>
              </div>
            </div>

            {/* Diagram */}
            {exercise.diagrama_ascii && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">📐 Diagrama</h4>
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs font-mono text-green-800 whitespace-pre leading-tight">
                    {exercise.diagrama_ascii}
                  </pre>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                  <span>🔴 Atacantes</span>
                  <span>🔵 Defensores</span>
                  <span>⚽ Balón</span>
                  <span>→ Movimiento</span>
                  <span>▢ Portería</span>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-2">📝 Descripción</h4>
              <p className="text-slate-700 whitespace-pre-line">{exercise.descripcion}</p>
            </div>

            {/* Instructions */}
            {exercise.instrucciones && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">📋 Instrucciones</h4>
                <p className="text-slate-700 whitespace-pre-line">{exercise.instrucciones}</p>
              </div>
            )}

            {/* Materials */}
            {exercise.materiales?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">🎒 Materiales</h4>
                <div className="flex flex-wrap gap-2">
                  {exercise.materiales.map((mat, i) => (
                    <Badge key={i} variant="outline">{mat}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Objectives */}
            {(exercise.objetivo_fisico?.length > 0 || exercise.objetivo_tecnico?.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                {exercise.objetivo_fisico?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">💪 Objetivos Físicos</h4>
                    <div className="flex flex-wrap gap-1">
                      {exercise.objetivo_fisico.map((obj, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-800">{obj}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.objetivo_tecnico?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">⚽ Objetivos Técnicos</h4>
                    <div className="flex flex-wrap gap-1">
                      {exercise.objetivo_tecnico.map((obj, i) => (
                        <Badge key={i} className="bg-green-100 text-green-800">{obj}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Variations */}
            {exercise.variaciones && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">🔄 Variaciones</h4>
                <p className="text-slate-700 whitespace-pre-line">{exercise.variaciones}</p>
              </div>
            )}

            {/* Tips */}
            {exercise.consejos && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Consejos</h4>
                <p className="text-yellow-700 whitespace-pre-line">{exercise.consejos}</p>
              </div>
            )}

            {/* Positions */}
            {exercise.posiciones_objetivo?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">🎯 Posiciones Objetivo</h4>
                <div className="flex flex-wrap gap-1">
                  {exercise.posiciones_objetivo.map((pos, i) => (
                    <Badge key={i} variant="secondary">{pos}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}