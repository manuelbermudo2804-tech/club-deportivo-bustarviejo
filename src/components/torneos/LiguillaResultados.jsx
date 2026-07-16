import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import PartidoResultRow from "./PartidoResultRow";
import GrupoClasificacion from "./GrupoClasificacion";

// Genera y gestiona los partidos de liguilla (todos contra todos) por grupo,
// muestra resultados editables y la clasificación en vivo.
export default function LiguillaResultados({ torneo, categoria, grupos, equipos, partidos }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });

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
          .sort((a, b) => (a.fecha_hora || "").localeCompare(b.fecha_hora || ""));
        return (
          <div key={grupo.id} className="space-y-2">
            <GrupoClasificacion
              grupo={grupo} equipos={equipos} partidos={partidosCat} torneo={torneo}
            />
            {partidosGrupo.length > 0 && (
              <div className="space-y-1.5">
                {partidosGrupo.map((p) => (
                  <PartidoResultRow
                    key={p.id}
                    partido={p}
                    equipos={equipos}
                    torneo={torneo}
                    onSave={(partido, local, visit) => guardarResultado.mutate({ partido, local, visit })}
                    onSaveUbicacion={(partido, patch) => guardarUbicacion.mutate({ partido, patch })}
                    isSaving={guardarResultado.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}