import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, TrendingUp, Award } from "lucide-react";

export default function AttendanceStats({ players, attendances, categoryFilter }) {
  const getPlayerStats = () => {
    const stats = players.map(player => {
      const playerAttendances = attendances.filter(att => 
        att.asistencias.some(a => a.jugador_id === player.id)
      );
      
      const totalSessions = playerAttendances.length;
      const presente = playerAttendances.filter(att => 
        att.asistencias.find(a => a.jugador_id === player.id)?.estado === "presente"
      ).length;
      const ausente = playerAttendances.filter(att => 
        att.asistencias.find(a => a.jugador_id === player.id)?.estado === "ausente"
      ).length;
      const justificado = playerAttendances.filter(att => 
        att.asistencias.find(a => a.jugador_id === player.id)?.estado === "justificado"
      ).length;
      
      const attendanceRate = totalSessions > 0 ? Math.round((presente / totalSessions) * 100) : 0;
      
      return {
        player,
        totalSessions,
        presente,
        ausente,
        justificado,
        attendanceRate
      };
    });
    
    return stats.sort((a, b) => b.attendanceRate - a.attendanceRate);
  };

  const playerStats = getPlayerStats();
  const avgAttendance = playerStats.length > 0 
    ? Math.round(playerStats.reduce((acc, s) => acc + s.attendanceRate, 0) / playerStats.length) 
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Asistencia Promedio</p>
                <p className="text-2xl font-bold text-slate-900">{avgAttendance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Sesiones</p>
                <p className="text-2xl font-bold text-slate-900">{attendances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Mejor Asistencia</p>
                <p className="text-2xl font-bold text-slate-900">
                  {playerStats.length > 0 ? `${playerStats[0].attendanceRate}%` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Asistencia por Jugador</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {playerStats.map(stat => (
              <div key={stat.player.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {stat.player.foto_url ? (
                      <img src={stat.player.foto_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                        {stat.player.nombre.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{stat.player.nombre}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {stat.presente}
                    </span>
                    <span className="text-red-600 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> {stat.ausente}
                    </span>
                    <span className="font-bold text-slate-900">{stat.attendanceRate}%</span>
                  </div>
                </div>
                <Progress value={stat.attendanceRate} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}