import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RaffleSorteoFields({ activeSeason, update }) {
  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Fecha y hora del sorteo</Label>
          <Input
            key={`sorteo-fecha-${activeSeason.id}`}
            type="datetime-local"
            defaultValue={activeSeason.sorteo_fecha || ""}
            onBlur={(e) => {
              if (e.target.value !== (activeSeason.sorteo_fecha || "")) {
                update({ sorteo_fecha: e.target.value });
              }
            }}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Dónde se celebra</Label>
          <Input
            key={`sorteo-lugar-${activeSeason.id}`}
            defaultValue={activeSeason.sorteo_lugar || ""}
            onBlur={(e) => {
              if (e.target.value !== (activeSeason.sorteo_lugar || "")) {
                update({ sorteo_lugar: e.target.value });
              }
            }}
            placeholder="Ej: Torneo de fin de temporada"
            className="mt-1"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Los socios verán una cuenta atrás hasta esa fecha. Si la dejas vacía, no se muestra ninguna cuenta atrás.
      </p>
    </div>
  );
}