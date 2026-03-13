import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, X, Clock } from "lucide-react";

export default function MatchMinutesForm({ callup, existingRecord, onSave, onCancel, isSaving }) {
  const [duracion, setDuracion] = useState(existingRecord?.duracion_partido || 70);
  const [notas, setNotas] = useState(existingRecord?.notas || "");
  const [jugadores, setJugadores] = useState(() => {
    if (existingRecord?.minutos_jugadores) {
      return existingRecord.minutos_jugadores;
    }
    return (callup.jugadores_convocados || []).map(j => ({
      jugador_id: j.jugador_id,
      jugador_nombre: j.jugador_nombre,
      minutos: 0
    }));
  });

  const handleMinutosChange = (idx, value) => {
    const val = Math.max(0, Math.min(Number(value) || 0, duracion));
    setJugadores(prev => prev.map((j, i) => i === idx ? { ...j, minutos: val } : j));
  };

  const handleSave = () => {
    onSave({
      convocatoria_id: callup.id,
      categoria: callup.categoria,
      rival: callup.rival || callup.titulo,
      fecha_partido: callup.fecha_partido,
      duracion_partido: duracion,
      minutos_jugadores: jugadores,
      notas
    });
  };

  const totalMinutos = jugadores.reduce((s, j) => s + j.minutos, 0);
  const maxPosible = duracion * jugadores.length;

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            {callup.rival ? `vs ${callup.rival}` : callup.titulo}
            <span className="text-sm font-normal text-slate-500">
              ({callup.fecha_partido})
            </span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <label className="text-sm text-slate-600">Duración partido (min):</label>
          <Input
            type="number"
            value={duracion}
            onChange={e => setDuracion(Math.max(1, Number(e.target.value) || 70))}
            className="w-24"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Cuadrante de jugadores */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="grid grid-cols-[1fr_100px] bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            <span>Jugador</span>
            <span className="text-center">Minutos</span>
          </div>
          <div className="divide-y">
            {jugadores.map((j, idx) => {
              const pct = duracion > 0 ? Math.round((j.minutos / duracion) * 100) : 0;
              return (
                <div key={j.jugador_id} className="grid grid-cols-[1fr_100px] items-center px-4 py-2 hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{j.jugador_nombre}</span>
                    {pct > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        pct >= 75 ? 'bg-green-100 text-green-700' :
                        pct >= 40 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min={0}
                    max={duracion}
                    value={j.minutos || ""}
                    onChange={e => handleMinutosChange(idx, e.target.value)}
                    className="h-9 text-center"
                    placeholder="0"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2 text-sm">
          <span className="text-slate-600">
            Total minutos repartidos: <strong>{totalMinutos}</strong> / {maxPosible} posibles
          </span>
        </div>

        {/* Notas */}
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          placeholder="Notas del partido (opcional)..."
          className="w-full border rounded-lg p-3 text-sm resize-none h-20"
        />

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Guardando..." : existingRecord ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}