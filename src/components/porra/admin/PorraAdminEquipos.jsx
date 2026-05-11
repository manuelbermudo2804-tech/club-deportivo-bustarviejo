import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function PorraAdminEquipos({ equipos = [], onUpdate }) {
  const porGrupo = GRUPOS.reduce((acc, g) => {
    acc[g] = equipos.filter(e => e.grupo === g).sort((a, b) => (a.orden_grupo || 0) - (b.orden_grupo || 0));
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏳️ Equipos del Mundial 2026</CardTitle>
        <p className="text-sm text-slate-500">48 selecciones distribuidas en 12 grupos. Sorteo oficial FIFA.</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {GRUPOS.map(g => (
            <div key={g} className="border-2 border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-2 font-bold">
                Grupo {g}
              </div>
              <div className="p-2 space-y-1">
                {(porGrupo[g] || []).map(eq => (
                  <div key={eq.id} className="flex items-center gap-2 text-sm px-2 py-1">
                    <span className="text-xl">{eq.bandera_emoji}</span>
                    <span className="font-medium">{eq.nombre}</span>
                    <span className="ml-auto text-xs text-slate-400">{eq.codigo}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}