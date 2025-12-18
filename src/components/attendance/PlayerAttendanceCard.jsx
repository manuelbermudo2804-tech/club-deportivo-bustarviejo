import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, TrendingDown, Minus, Send } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const ATTENDANCE_COLORS = {
  presente: '#16a34a',
  ausente: '#dc2626',
  justificado: '#3b82f6',
  tardanza: '#f59e0b'
};

export default function PlayerAttendanceCard({ 
  player, 
  evaluations, 
  onViewDetails, 
  onSendReport 
}) {
  const stats = React.useMemo(() => {
    const sortedEvals = [...evaluations].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    
    const actitudSum = evaluations.reduce((sum, ev) => sum + (ev.actitud || 0), 0);
    const promedioActitud = evaluations.length > 0 ? (actitudSum / evaluations.length).toFixed(1) : 0;
    
    const attendanceStats = {
      presente: 0,
      ausente: 0,
      justificado: 0,
      tardanza: 0
    };

    evaluations.forEach(ev => {
      attendanceStats[ev.estado] = (attendanceStats[ev.estado] || 0) + 1;
    });

    const totalSesiones = Object.values(attendanceStats).reduce((sum, val) => sum + val, 0);
    const tasaAsistencia = totalSesiones > 0 
      ? (((attendanceStats.presente + attendanceStats.tardanza) / totalSesiones) * 100).toFixed(0)
      : 0;
    
    let tendencia = "estable";
    if (sortedEvals.length >= 6) {
      const primeros3 = sortedEvals.slice(0, 3).reduce((sum, ev) => sum + (ev.actitud || 0), 0) / 3;
      const ultimos3 = sortedEvals.slice(-3).reduce((sum, ev) => sum + (ev.actitud || 0), 0) / 3;
      if (ultimos3 > primeros3 + 0.5) tendencia = "mejorando";
      else if (ultimos3 < primeros3 - 0.5) tendencia = "bajando";
    }
    
    return {
      totalSesiones,
      promedioActitud,
      tasaAsistencia,
      tendencia,
      attendanceStats
    };
  }, [evaluations]);

  const chartData = Object.entries(stats.attendanceStats)
    .filter(([_, value]) => value > 0)
    .map(([estado, value]) => ({
      name: estado,
      value,
      color: ATTENDANCE_COLORS[estado]
    }));

  return (
    <Card className="hover:shadow-2xl transition-all cursor-pointer group border-2 hover:border-orange-400">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          {player.foto_url ? (
            <img src={player.foto_url} className="w-14 h-14 rounded-full object-cover ring-4 ring-orange-100 group-hover:ring-orange-300 transition-all" alt="" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold ring-4 ring-orange-100 group-hover:ring-orange-300 transition-all">
              {player.nombre.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <CardTitle className="text-base">{player.nombre}</CardTitle>
            <p className="text-xs text-slate-500">{stats.totalSesiones} sesiones</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-orange-50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xl font-bold text-orange-600">{stats.promedioActitud}</span>
              <span className="text-xs text-slate-400">/5</span>
            </div>
            <p className="text-xs text-slate-600">Actitud</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-green-600 mb-1">{stats.tasaAsistencia}%</p>
            <p className="text-xs text-slate-600">Asistencia</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2">
          {stats.tendencia === "mejorando" && (
            <>
              <TrendingUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-bold text-green-600">Mejorando</span>
            </>
          )}
          {stats.tendencia === "bajando" && (
            <>
              <TrendingDown className="w-5 h-5 text-red-600" />
              <span className="text-sm font-bold text-red-600">Bajando</span>
            </>
          )}
          {stats.tendencia === "estable" && (
            <>
              <Minus className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-bold text-slate-600">Estable</span>
            </>
          )}
        </div>

        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={50}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails();
            }}
            size="sm"
            className="flex-1 bg-orange-600 hover:bg-orange-700"
          >
            Ver Evolución
          </Button>
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              onSendReport();
            }}
            size="sm"
            variant="outline"
            title="Enviar reporte privado"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}