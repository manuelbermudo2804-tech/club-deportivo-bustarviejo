import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import PlantillaEditor from "./PlantillaEditor";
import ImportarPlantillasDialog from "./ImportarPlantillasDialog";

// Gestiona las plantillas (jugadores) de todos los equipos de una categoría.
export default function PlantillasManager({ torneo, categoria, equipos, jugadores }) {
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["torneo-full", torneo.id] });

  const equiposCat = equipos.filter((e) => e.categoria_id === categoria.id)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  if (equiposCat.length === 0) {
    return <p className="text-center text-slate-400 text-sm py-6">Añade equipos primero en la pestaña "Equipos".</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500 flex-1">
          Carga los jugadores de cada equipo. Luego, al guardar un resultado, podrás marcar quién anotó para la Bota de Oro.
        </p>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => setImportOpen(true)}>
          <FileSpreadsheet className="w-4 h-4 mr-1.5 text-green-600" /> Importar Excel
        </Button>
      </div>

      <ImportarPlantillasDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        torneo={torneo}
        categoria={categoria}
        equipos={equipos}
        onDone={invalidate}
      />

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