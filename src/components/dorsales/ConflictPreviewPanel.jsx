import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trophy } from "lucide-react";
import { calcularCategoriaParaTemporada, resolverPrioridad } from "./dorsalHelpers";

// Panel de "Previsión de Conflictos" entre temporadas.
// Detecta jugadores que van a coincidir en la misma categoría/dorsal la próxima temporada.
export default function ConflictPreviewPanel({ players = [], currentAssignments = [], nextSeason }) {
  const conflicts = useMemo(() => {
    if (!players.length || !nextSeason) return [];

    // Por cada jugador, calcular dónde va a estar y con qué dorsal lo pediría
    const previsiones = players
      .filter((p) => p.activo !== false && p.fecha_nacimiento)
      .map((p) => {
        const nuevaCategoria = calcularCategoriaParaTemporada(p.fecha_nacimiento, nextSeason);
        // Buscar el dorsal "deseado": preferente > último que llevó
        const ultimaAsig = currentAssignments.find((a) => a.jugador_id === p.id && a.estado === "asignado");
        const dorsalDeseado = p.dorsal_preferente || ultimaAsig?.dorsal || null;
        // Historial mínimo necesario para priorizar
        const historial = currentAssignments
          .filter((a) => a.jugador_id === p.id && a.estado === "asignado")
          .sort((a, b) => String(b.temporada).localeCompare(String(a.temporada)));
        return {
          jugadorId: p.id,
          nombre: p.nombre,
          fechaNacimiento: p.fecha_nacimiento,
          categoria: nuevaCategoria,
          dorsal: dorsalDeseado,
          historial,
        };
      })
      .filter((x) => x.dorsal && x.categoria);

    // Agrupar por (categoria + dorsal)
    const grupos = {};
    previsiones.forEach((x) => {
      const key = `${x.categoria}__${x.dorsal}`;
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(x);
    });

    // Quedarnos solo con los que tienen >1 candidato (conflicto real)
    return Object.entries(grupos)
      .filter(([, arr]) => arr.length > 1)
      .map(([key, candidatos]) => {
        const [categoria, dorsal] = key.split("__");
        const ganador = resolverPrioridad(candidatos);
        return { categoria, dorsal: Number(dorsal), candidatos, ganador };
      })
      .sort((a, b) => a.categoria.localeCompare(b.categoria));
  }, [players, currentAssignments, nextSeason]);

  if (conflicts.length === 0) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="font-semibold text-green-800">Sin conflictos previstos</div>
          <div className="text-sm text-green-700 mt-1">
            No se han detectado choques de dorsales para la temporada {nextSeason}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 font-semibold text-amber-900">
          <AlertTriangle className="w-5 h-5" />
          {conflicts.length} conflicto{conflicts.length > 1 ? "s" : ""} previsto{conflicts.length > 1 ? "s" : ""} para {nextSeason}
        </div>
        <div className="text-sm text-amber-800 mt-1">
          El sistema te recomienda quién debe quedarse con cada dorsal según antigüedad.
        </div>
      </div>

      {conflicts.map((c, i) => (
        <Card key={i} className="border-amber-300">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Badge variant="outline" className="mr-2">{c.categoria}</Badge>
                <span className="font-bold text-2xl text-orange-600">#{c.dorsal}</span>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                {c.candidatos.length} jugadores
              </Badge>
            </div>
            <div className="space-y-2">
              {c.candidatos.map((cand) => {
                const isWinner = cand.jugadorId === c.ganador?.jugadorId;
                return (
                  <div
                    key={cand.jugadorId}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      isWinner ? "bg-green-50 border border-green-300" : "bg-slate-50 border border-slate-200"
                    }`}
                  >
                    {isWinner ? (
                      <Trophy className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{cand.nombre}</div>
                      <div className="text-xs text-slate-500">
                        {cand.historial.length} temporada{cand.historial.length !== 1 ? "s" : ""} en el club
                        {cand.historial[0]?.dorsal === cand.dorsal && (
                          <> · ya llevaba el #{cand.dorsal} en {cand.historial[0].temporada}</>
                        )}
                      </div>
                    </div>
                    {isWinner && (
                      <Badge className="bg-green-600 text-white text-xs">Recomendado</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}