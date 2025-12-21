import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Users, UserPlus, UserMinus, Repeat } from "lucide-react";

export default function RetentionAnalysis({ allSeasons, allPlayers }) {
  const retentionData = useMemo(() => {
    const seasons = allSeasons
      .filter(s => s.temporada)
      .sort((a, b) => a.temporada.localeCompare(b.temporada));

    return seasons.map((season, idx) => {
      const seasonPlayers = allPlayers.filter(p => {
        // Jugadores activos en esta temporada (por inscripción o renovación)
        return p.temporada_renovacion === season.temporada || 
               (p.tipo_inscripcion === "Nueva Inscripción" && p.created_date && 
                new Date(p.created_date).getFullYear().toString() === season.temporada.split('/')[0]);
      });

      const nuevos = seasonPlayers.filter(p => p.tipo_inscripcion === "Nueva Inscripción").length;
      const renovaciones = seasonPlayers.filter(p => p.estado_renovacion === "renovado").length;
      const total = seasonPlayers.length;

      // Calcular tasa de retención comparando con temporada anterior
      let retencionRate = 0;
      if (idx > 0) {
        const prevSeason = seasons[idx - 1];
        const prevPlayers = allPlayers.filter(p => 
          p.temporada_renovacion === prevSeason.temporada
        ).length;
        retencionRate = prevPlayers > 0 ? (renovaciones / prevPlayers) * 100 : 0;
      }

      return {
        temporada: season.temporada,
        total,
        nuevos,
        renovaciones,
        retencionRate,
        porcentajeNuevos: total > 0 ? (nuevos / total) * 100 : 0
      };
    });
  }, [allSeasons, allPlayers]);

  const avgRetention = retentionData.length > 0 
    ? retentionData.reduce((sum, d) => sum + d.retencionRate, 0) / retentionData.length 
    : 0;

  const currentSeason = retentionData[retentionData.length - 1];

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-indigo-600" />
          Análisis de Retención de Jugadores
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 text-center border-2 border-indigo-200">
            <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-indigo-600 font-medium">Total Jugadores</p>
            <p className="text-3xl font-bold text-indigo-700">{currentSeason?.total || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border-2 border-green-200">
            <UserPlus className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-xs text-green-600 font-medium">Nuevos</p>
            <p className="text-3xl font-bold text-green-700">{currentSeason?.nuevos || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border-2 border-blue-200">
            <Repeat className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-xs text-blue-600 font-medium">Renovaciones</p>
            <p className="text-3xl font-bold text-blue-700">{currentSeason?.renovaciones || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border-2 border-purple-200">
            <Repeat className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-xs text-purple-600 font-medium">Tasa Retención Media</p>
            <p className="text-3xl font-bold text-purple-700">{avgRetention.toFixed(1)}%</p>
          </div>
        </div>

        {/* Gráfico de evolución */}
        <div>
          <h4 className="font-bold text-slate-900 mb-3">Evolución de Jugadores</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="temporada" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} name="Total" />
              <Line yAxisId="left" type="monotone" dataKey="nuevos" stroke="#22c55e" strokeWidth={2} name="Nuevos" />
              <Line yAxisId="left" type="monotone" dataKey="renovaciones" stroke="#3b82f6" strokeWidth={2} name="Renovaciones" />
              <Line yAxisId="right" type="monotone" dataKey="retencionRate" stroke="#a855f7" strokeWidth={2} name="% Retención" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico composición nuevos vs renovaciones */}
        <div>
          <h4 className="font-bold text-slate-900 mb-3">Composición: Nuevos vs Renovaciones</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={retentionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="temporada" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="nuevos" stackId="a" fill="#22c55e" name="Nuevos" />
              <Bar dataKey="renovaciones" stackId="a" fill="#3b82f6" name="Renovaciones" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
          <p className="font-bold text-indigo-900 mb-2">💡 Insights de Retención</p>
          <ul className="space-y-1 text-sm text-indigo-800">
            <li>• Tasa de retención promedio: <strong>{avgRetention.toFixed(1)}%</strong></li>
            <li>• {currentSeason?.porcentajeNuevos.toFixed(1)}% de jugadores son nuevos esta temporada</li>
            {avgRetention >= 70 && <li>✅ Excelente retención de jugadores - el club es estable</li>}
            {avgRetention < 50 && <li>⚠️ Baja retención - revisar causas de abandono</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}