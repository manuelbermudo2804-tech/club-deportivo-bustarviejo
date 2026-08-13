import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { DECISION_LABELS } from "@/lib/meteoRules";

export default function MeteoHistorial() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    base44.entities.MeteoDecision.list("-fecha", 100).then(setItems).catch(() => setItems([]));
  }, []);

  if (items === null) return <p className="text-slate-500">Cargando historial...</p>;
  if (!items.length) return <p className="text-slate-500">Todavía no hay decisiones registradas.</p>;

  return (
    <div className="space-y-2">
      {items.map((d) => (
        <Card key={d.id}>
          <CardContent className="p-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{d.categoria}</p>
              <p className="text-sm text-slate-600">{d.fecha} · {d.hora_inicio || "—"}</p>
              {d.motivo && <p className="text-sm text-slate-500">{d.motivo}</p>}
              <p className="text-xs text-slate-400 mt-1">
                {d.decidido_por_nombre || "—"}
                {d.datos_meteo ? ` · viento ${Math.round(d.datos_meteo.viento || 0)} km/h · lluvia ${Math.round(d.datos_meteo.lluvia || 0)}%` : ""}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{DECISION_LABELS[d.decision]}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}