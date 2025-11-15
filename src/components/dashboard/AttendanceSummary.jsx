import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function AttendanceSummary({ player, attendances }) {
  if (!player) return null;

  const playerAttendances = attendances.filter(att => 
    att.categoria === player.deporte && 
    att.asistencias.some(a => a.jugador_id === player.id)
  );

  let presente = 0, ausente = 0, justificado = 0;
  playerAttendances.forEach(att => {
    const record = att.asistencias.find(a => a.jugador_id === player.id);
    if (record) {
      if (record.estado === "presente") presente++;
      else if (record.estado === "ausente") ausente++;
      else if (record.estado === "justificado") justificado++;
    }
  });

  const total = presente + ausente + justificado;
  const percentage = total > 0 ? Math.round((presente / total) * 100) : 0;

  return (
    <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-green-900 text-base">
          <TrendingUp className="w-4 h-4" />
          Asistencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600 mb-1">{percentage}%</div>
          <p className="text-xs text-green-700">{player.nombre}</p>
        </div>

        <Progress value={percentage} className="h-2 bg-white" />

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-lg p-2 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-900">{presente}</div>
            <div className="text-xs text-slate-600">Presente</div>
          </div>

          <div className="bg-white rounded-lg p-2 text-center">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-900">{ausente}</div>
            <div className="text-xs text-slate-600">Ausente</div>
          </div>

          <div className="bg-white rounded-lg p-2 text-center">
            <AlertCircle className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-lg font-bold text-slate-900">{justificado}</div>
            <div className="text-xs text-slate-600">Justificado</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-xs text-slate-600">Total sesiones</p>
          <p className="text-base font-bold text-slate-900">{total}</p>
        </div>
      </CardContent>
    </Card>
  );
}