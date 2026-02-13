import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, CheckCircle2, Users, ChevronDown, ChevronUp } from "lucide-react";

export default function OpportunityCard({ opp, signups = [], alreadySignedUp, isCreator, isStaff, onSignup, onEdit, onDelete }) {
  const [showPeople, setShowPeople] = useState(false);
  const catLabels = { evento: 'Evento', dia_a_dia: 'Día a día', logistica: 'Logística', comunicacion: 'Comunicación', otro: 'Otro' };

  const count = signups.length;
  const plazas = opp.plazas || 0;
  const isFull = plazas > 0 && count >= plazas;
  const progress = plazas > 0 ? Math.min((count / plazas) * 100, 100) : 0;

  // Estado visual
  const isCompleta = opp.estado === "completa" || isFull;
  const isCerrada = opp.estado === "cerrada";

  return (
    <Card className={`bg-white/90 ${isCompleta ? 'ring-2 ring-green-400' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-bold">{opp.titulo}</CardTitle>
            {opp.descripcion && <p className="mt-1 text-sm text-slate-600 line-clamp-2">{opp.descripcion}</p>}
          </div>
          <div className="flex gap-1.5 items-center flex-shrink-0 flex-wrap justify-end">
            <Badge className={opp.categoria === 'evento' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
              {catLabels[opp.categoria] || opp.categoria}
            </Badge>
            {isCompleta && <Badge className="bg-green-500 text-white">✅ Completa</Badge>}
            {isCerrada && <Badge className="bg-slate-400 text-white">Cerrada</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Fecha, hora, lugar */}
        <div className="text-sm text-slate-600 flex flex-wrap gap-3">
          {opp.fecha && <span>📅 {opp.fecha}</span>}
          {opp.hora && <span>⏰ {opp.hora}</span>}
          {opp.ubicacion && <span>📍 {opp.ubicacion}</span>}
        </div>

        {/* Barra de progreso de plazas */}
        {plazas > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">
                👥 {count} de {plazas} plazas cubiertas
              </span>
              {isFull && <span className="text-green-600 font-bold text-xs">🎉 ¡Completo!</span>}
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-green-500' : progress > 50 ? 'bg-orange-400' : 'bg-orange-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {!isFull && plazas - count <= 2 && (
              <p className="text-xs text-orange-600 font-medium">⚡ ¡Solo quedan {plazas - count} plaza{plazas - count !== 1 ? 's' : ''}!</p>
            )}
          </div>
        )}

        {/* Sin plazas definidas - solo contador */}
        {!plazas && count > 0 && (
          <div className="text-sm text-slate-600 font-medium">
            👥 {count} persona{count !== 1 ? 's' : ''} apuntada{count !== 1 ? 's' : ''}
          </div>
        )}

        {/* Lista de apuntados (expandible) */}
        {count > 0 && (
          <div>
            <button
              onClick={() => setShowPeople(!showPeople)}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Ver quién se ha apuntado</span>
              {showPeople ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showPeople && (
              <div className="mt-2 space-y-1 bg-slate-50 rounded-lg p-3">
                {signups.map((s, i) => (
                  <div key={s.id || i} className="flex items-center gap-2 text-sm">
                    <span className="text-green-500">✅</span>
                    <span className="font-medium text-slate-800">{s.nombre}</span>
                    {s.relacion && s.relacion !== "yo" && (
                      <span className="text-xs text-slate-500">({s.relacion})</span>
                    )}
                    {s.mensaje && (
                      <span className="text-xs text-slate-400 italic truncate max-w-[150px]">— {s.mensaje}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex gap-2">
            {(isCreator || isStaff) && onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-1" /> Editar
              </Button>
            )}
            {(isCreator || isStaff) && onDelete && (
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar
              </Button>
            )}
          </div>
          <div>
            {alreadySignedUp ? (
              <Badge className="bg-green-100 text-green-700 py-1.5 px-3">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Ya estás apuntado
              </Badge>
            ) : isFull ? (
              <Badge className="bg-slate-100 text-slate-500 py-1.5 px-3">
                Plazas cubiertas
              </Badge>
            ) : isCerrada ? null : onSignup ? (
              <Button onClick={onSignup} className="bg-green-600 hover:bg-green-700">
                ✅ ¡Me apunto!
              </Button>
            ) : null}
          </div>
        </div>

        {/* Info organizador */}
        {opp.creado_por_nombre && (
          <p className="text-xs text-slate-400">Organiza: {opp.creado_por_nombre}</p>
        )}
      </CardContent>
    </Card>
  );
}