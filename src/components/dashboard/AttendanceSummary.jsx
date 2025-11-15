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
    <Card className="border-none shadow-xl bg-gradient-to-br from-green-50 to-green-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <TrendingUp className="w-5 h-5" />
          Asistencia de {player.nombre}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-5xl font-bold text-green-600 mb-2">{percentage}%</div>
          <p className="text-sm text-green-700">Asistencia Total</p>
        </div>

        <Progress value={percentage} className="h-3 bg-white" />

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 text-center">
            <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{presente}</div>
            <div className="text-xs text-slate-600">Presente</div>
          </div>

          <div className="bg-white rounded-xl p-3 text-center">
            <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{ausente}</div>
            <div className="text-xs text-slate-600">Ausente</div>
          </div>

          <div className="bg-white rounded-xl p-3 text-center">
            <AlertCircle className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-900">{justificado}</div>
            <div className="text-xs text-slate-600">Justificado</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-xs text-slate-600">Total de sesiones registradas</p>
          <p className="text-xl font-bold text-slate-900">{total}</p>
        </div>
      </CardContent>
    </Card>
  );
}