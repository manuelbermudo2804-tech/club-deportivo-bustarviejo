import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GitCompare, Loader2 } from "lucide-react";

const ESTADOS = {
  activa: { label: "Ficha ACTIVA en Federación · marcar firmada", cls: "bg-green-100 text-green-800" },
  tramitacion: { label: "En tramitación (ya firmada)", cls: "bg-blue-100 text-blue-800" },
  pte_documentacion: { label: "Falta firma/documentación", cls: "bg-yellow-100 text-yellow-800" },
  no_aparece: { label: "No aparece en Federación", cls: "bg-slate-100 text-slate-700" },
};
const ORDEN = ["activa", "tramitacion", "pte_documentacion", "no_aparece"];

export default function ComparativaFederacion() {
  const [loading, setLoading] = useState(false);
  const [lista, setLista] = useState(null);

  const comparar = async () => {
    setLoading(true);
    const { data } = await base44.functions.invoke("rffmSyncReconocimientos", { comparar: true });
    setLista((data.jugadores || []).sort((a, b) => ORDEN.indexOf(a.estado) - ORDEN.indexOf(b.estado)));
    setLoading(false);
  };

  return (
    <Card className="border-2 border-indigo-100">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-slate-700"><b>Comparar con la Federación:</b> firmas pendientes en la app vs. estado real de la ficha.</p>
          <Button size="sm" onClick={comparar} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <GitCompare className="w-4 h-4 mr-1" />}Comparar
          </Button>
        </div>
        {lista && lista.length === 0 && <p className="text-sm text-green-700">No hay firmas pendientes en la app.</p>}
        {lista?.map((j) => (
          <div key={j.jugador_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t pt-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{j.nombre}</p>
              <p className="text-xs text-slate-500 truncate">{j.equipo_fed || j.categoria}</p>
            </div>
            <Badge className={`${ESTADOS[j.estado].cls} text-xs whitespace-normal`}>{ESTADOS[j.estado].label}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}