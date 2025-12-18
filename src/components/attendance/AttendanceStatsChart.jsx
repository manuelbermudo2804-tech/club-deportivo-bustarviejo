import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";

const COLORS = {
  presente: '#16a34a',
  ausente: '#dc2626',
  justificado: '#3b82f6',
  tardanza: '#f59e0b'
};

const ICONS = {
  presente: CheckCircle2,
  ausente: XCircle,
  justificado: AlertCircle,
  tardanza: Clock
};

export default function AttendanceStatsChart({ attendances, categoryPlayers }) {
  const stats = React.useMemo(() => {
    const totals = {
      presente: 0,
      ausente: 0,
      justificado: 0,
      tardanza: 0
    };

    attendances.forEach(att => {
      att.asistencias?.forEach(a => {
        totals[a.estado] = (totals[a.estado] || 0) + 1;
      });
    });

    const total = Object.values(totals).reduce((sum, val) => sum + val, 0);
    
    return {
      totals,
      total,
      porcentajes: {
        presente: total > 0 ? ((totals.presente / total) * 100).toFixed(0) : 0,
        ausente: total > 0 ? ((totals.ausente / total) * 100).toFixed(0) : 0,
        justificado: total > 0 ? ((totals.justificado / total) * 100).toFixed(0) : 0,
        tardanza: total > 0 ? ((totals.tardanza / total) * 100).toFixed(0) : 0
      }
    };
  }, [attendances]);

  const chartData = [
    { name: 'Presentes', value: stats.totals.presente, color: COLORS.presente },
    { name: 'Ausentes', value: stats.totals.ausente, color: COLORS.ausente },
    { name: 'Justificados', value: stats.totals.justificado, color: COLORS.justificado },
    { name: 'Tardanzas', value: stats.totals.tardanza, color: COLORS.tardanza }
  ].filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">No hay datos de asistencia aún</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          Estadísticas de Asistencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(stats.totals).map(([estado, count]) => {
            const Icon = ICONS[estado];
            const labels = {
              presente: 'Presentes',
              ausente: 'Ausentes',
              justificado: 'Justificados',
              tardanza: 'Tardanzas'
            };
            
            return (
              <Card key={estado} className="border-none shadow-md">
                <CardContent className="pt-4 text-center">
                  <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: COLORS[estado] }} />
                  <p className="text-2xl font-bold" style={{ color: COLORS[estado] }}>
                    {stats.porcentajes[estado]}%
                  </p>
                  <p className="text-xs text-slate-600">{labels[estado]}</p>
                  <p className="text-xs text-slate-400">({count})</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} sesiones`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>

        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Tasa de Asistencia:</span>
            <span className="text-2xl font-bold text-green-600">
              {stats.porcentajes.presente}%
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 mt-2">
            <div 
              className="h-3 rounded-full bg-green-500"
              style={{ width: `${stats.porcentajes.presente}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}