import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const PAGE_LABELS = {
  PublicSponsors: "Patrocinadores",
  PublicAccessRequest: "Solicitar Acceso",
  SanIsidroInscripcion: "San Isidro",
  PublicMemberCard: "Carnet Socio",
  FamilyPresentation: "Presentación Familias",
};

export default function PublicPageStats() {
  const [days, setDays] = useState(30);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["publicPageStats", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const events = await base44.entities.AnalyticsEvent.filter({
        evento_tipo: "public_view",
      }, "-timestamp", 5000);

      // Filtrar por rango de fechas en cliente
      const filtered = events.filter(e => {
        const t = new Date(e.timestamp || e.created_date);
        return t >= since;
      });

      // Agrupar por página
      const counts = {};
      const uniqueByPage = {};
      filtered.forEach(e => {
        const p = e.pagina || "desconocida";
        counts[p] = (counts[p] || 0) + 1;
        const fp = e.detalles?.device_fingerprint || "";
        if (fp) {
          if (!uniqueByPage[p]) uniqueByPage[p] = new Set();
          uniqueByPage[p].add(fp);
        }
      });

      return Object.entries(counts)
        .map(([pagina, total]) => ({
          pagina,
          total,
          unicos: uniqueByPage[pagina]?.size || 0,
        }))
        .sort((a, b) => b.total - a.total);
    },
    staleTime: 60000,
  });

  const totalViews = data?.reduce((s, x) => s + x.total, 0) || 0;

  return (
    <Card className="bg-white border-2 border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Visitas a páginas públicas
        </CardTitle>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={30}>Últimos 30 días</option>
            <option value={90}>Últimos 90 días</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-6">Cargando...</p>
        ) : !data || data.length === 0 ? (
          <div className="text-center py-6">
            <Eye className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Aún no hay visitas registradas</p>
            <p className="text-xs text-slate-400 mt-1">
              Las visitas se empezarán a registrar a partir de ahora
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700 font-semibold">Total visitas</p>
              <p className="text-2xl font-extrabold text-blue-900">{totalViews}</p>
            </div>
            <div className="space-y-2">
              {data.map((row) => {
                const max = data[0]?.total || 1;
                const pct = (row.total / max) * 100;
                return (
                  <div key={row.pagina} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-bold text-slate-900">
                        {PAGE_LABELS[row.pagina] || row.pagina}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                          {row.total} visitas
                        </span>
                        {row.unicos > 0 && (
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                            {row.unicos} únicos
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}