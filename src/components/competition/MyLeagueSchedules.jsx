import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import BustarviejoSchedule from "./BustarviejoSchedule";

export default function MyLeagueSchedules({ myCategories, isAdmin, isStaff }) {
  const { data: configs, isLoading } = useQuery({
    queryKey: ["standings-configs"],
    queryFn: () => base44.entities.StandingsConfig.list(),
    staleTime: 10 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 text-orange-600 mx-auto animate-spin" />
        <p className="text-sm text-slate-500 mt-2">Cargando jornadas de liga...</p>
      </div>
    );
  }

  if (!configs || configs.length === 0) {
    return (
      <Card className="border-2 border-dashed border-slate-200">
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">No hay datos de competición configurados.</p>
        </CardContent>
      </Card>
    );
  }

  // Filter configs: admin/staff sees all, others see only their categories
  const relevantConfigs = (isAdmin || isStaff)
    ? configs.filter(c => c.rfef_url)
    : configs.filter(c => {
        if (!c.rfef_url) return false;
        if (!myCategories || myCategories.length === 0) return false;
        // Match by partial category name
        const cat = (c.categoria || "").toLowerCase();
        return myCategories.some(mc => {
          const mcLower = (mc || "").toLowerCase();
          return cat.includes(mcLower) || mcLower.includes(cat);
        });
      });

  if (relevantConfigs.length === 0) {
    return (
      <Card className="border-2 border-dashed border-orange-200 bg-orange-50">
        <CardContent className="p-8 text-center">
          <p className="text-orange-800 font-semibold">No hay jornadas disponibles para tus categorías</p>
          <p className="text-sm text-orange-600 mt-1">Las jornadas de liga aparecerán aquí cuando se configuren para tus equipos.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {relevantConfigs.map(config => (
        <div key={config.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-orange-600 text-white">{config.categoria}</Badge>
            {config.grupo && <span className="text-xs text-slate-500">{config.grupo}</span>}
          </div>
          <BustarviejoSchedule config={config} />
        </div>
      ))}
    </div>
  );
}