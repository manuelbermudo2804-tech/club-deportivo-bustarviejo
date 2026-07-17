import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import PlantillaEditor from "./PlantillaEditor";

// Gestiona las plantillas (jugadores) de todos los equipos de una categoría.
export default function PlantillasManager({ torneo, categoria, equipos, jugadores }) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });

  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (equiposCat.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-6">Añade equipos primero en la pestaña "Equipos".</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Carga los jugadores de cada equipo. Luego, al guardar un resultado, podrás marcar quién anotó para la Bota de Oro.
      </p>
      {equiposCat.map((eq) => (
        <PlantillaEditor
          key={eq.id}
          torneo={torneo}
          categoria={categoria}
          equipo={eq}
          jugadores={jugadores}
          onChange={invalidate}
        />
      ))}
    </div>
  );
}