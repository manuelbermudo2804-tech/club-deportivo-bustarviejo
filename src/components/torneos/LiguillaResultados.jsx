import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import PartidoResultRow from "./PartidoResultRow";
import GrupoClasificacion from "./GrupoClasificacion";
import GoleadoresDialog from "./GoleadoresDialog";

// Genera y gestiona los partidos de liguilla (todos contra todos) por grupo,
// muestra resultados editables y la clasificación en vivo.
export default function LiguillaResultados({ torneo, categoria, grupos, equipos, partidos, jugadores = [], goles = [] }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });
  const [golPartido, setGolPartido] = useState(null);

  const partidosCat = partidos.filter((p) => p.categoria_id === categoria.id && p.fase === "liguilla");

  // Genera todos-contra-todos dentro de cada grupo (solo grupos sin partidos aún)
  const generar = useMutation({
    mutationFn: async () => {
      const nuevos = [];
      for (const grupo of grupos) {
        const yaTiene = partidosCat.some((p) => p.grupo_id === grupo.id);
        if (yaTiene) continue;
        const eqs = equipos.filter((e) => e.grupo_id === grupo.id);
        for (let i = 0; i < eqs.length; i++) {
          for (let j = i + 1; j < eqs.length; j++) {
            nuevos.push({
              torneo_id: torneo.id, categoria_id: categoria.id, fase: "liguilla",
              grupo_id: grupo.id,
              equipo_local_id: eqs[i].id, equipo_visitante_id: eqs[j].id,
              finalizado: false,
            });
          }
        }
      }
      if (nuevos.length === 0) throw new Error("No hay partidos nuevos que generar");
      await base44.entities.TorneoPartido.bulkCreate(nuevos);
    },
    onSuccess: () => { invalidate(); toast.success("Calendario de liguilla generado"); },
    onError: (e) => toast.info(e.message),
  });

  const guardarResultado = useMutation({
    mutationFn: ({ partido, local, visit }) =>
      base44.entities.TorneoPartido.update(partido.id, {
        marcador_local: local, marcador_visitante: visit, finalizado: true,
      }),
    onSuccess: () => { invalidate(); toast.success("Resultado guardado"); },
    onError: () => toast.error("Error al guardar"),
  });

  const guardarUbicacion = useMutation({
    mutationFn: ({ partido, patch }) =>
      base44.entities.TorneoPartido.update(partido.id, patch),
    onSuccess: () => { invalidate(); },
    onError: () => toast.error("Error al guardar campo/hora"),
  });

  // Reordenar partidos dentro de un grupo (drag & drop). Persiste el orden en orden_bracket.
  const reordenar = useMutation({
    mutationFn: (partidosOrdenados) =>
      base44.entities.TorneoPartido.bulkUpdate(
        partidosOrdenados.map((p, i) => ({ id: p.id, orden_bracket: i }))
      ),
    onSuccess: () => { invalidate(); },
    onError: () => { invalidate(); toast.error("Error al reordenar"); },
  });

  const onDragEnd = (result, partidosGrupo) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const items = Array.from(partidosGrupo);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    reordenar.mutate(items);
  };

  if (grupos.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-6">Crea grupos y reparte los equipos primero.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => generar.mutate()} disabled={generar.isPending}>
          Generar calendario de liguilla
        </Button>
      </div>

      {grupos.map((grupo) => {
        const partidosGrupo = partidosCat.filter((p) => p.grupo_id === grupo.id)
          .sort((a, b) => {
            const oa = a.orden_bracket ?? 9999;
            const ob = b.orden_bracket ?? 9999;
            if (oa !== ob) return oa - ob;
            return (a.fecha_hora || "").localeCompare(b.fecha_hora || "");
          });
        return (
          <div key={grupo.id} className="space-y-2">
            <GrupoClasificacion
              grupo={grupo} equipos={equipos} partidos={partidosCat} torneo={torneo}
            />
            {partidosGrupo.length > 0 && (
              <DragDropContext onDragEnd={(r) => onDragEnd(r, partidosGrupo)}>
                <Droppable droppableId={`grupo-${grupo.id}`}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                      {partidosGrupo.map((p, index) => (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(prov, snapshot) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={`flex items-stretch gap-1 ${snapshot.isDragging ? "opacity-90" : ""}`}
                            >
                              <div
                                {...prov.dragHandleProps}
                                className="flex items-center px-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none"
                                title="Arrastrar para reordenar"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <PartidoResultRow
                                  partido={p}
                                  equipos={equipos}
                                  torneo={torneo}
                                  onSave={(partido, local, visit) => guardarResultado.mutate({ partido, local, visit })}
                                  onSaveUbicacion={(partido, patch) => guardarUbicacion.mutate({ partido, patch })}
                                  isSaving={guardarResultado.isPending}
                                  golesCount={goles.filter((g) => g.partido_id === p.id).reduce((s, g) => s + (g.goles || 1), 0)}
                                  onGoleadores={() => setGolPartido(p)}
                                />
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        );
      })}

      {golPartido && (
        <GoleadoresDialog
          open={!!golPartido}
          onOpenChange={(v) => !v && setGolPartido(null)}
          partido={golPartido}
          eqLocal={equipos.find((e) => e.id === golPartido.equipo_local_id)}
          eqVisit={equipos.find((e) => e.id === golPartido.equipo_visitante_id)}
          jugadores={jugadores}
          golesExistentes={goles.filter((g) => g.partido_id === golPartido.id)}
          torneo={torneo}
          categoria={categoria}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}