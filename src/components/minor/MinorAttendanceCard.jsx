import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const STATUS_CONFIG = {
  presente: { emoji: "✅", label: "Presente", color: "bg-green-100 text-green-700" },
  ausente: { emoji: "❌", label: "Ausente", color: "bg-red-100 text-red-700" },
  justificado: { emoji: "📝", label: "Justificado", color: "bg-blue-100 text-blue-700" },
  tardanza: { emoji: "⏰", label: "Tardanza", color: "bg-yellow-100 text-yellow-700" },
};

export default function MinorAttendanceCard({ attendances, playerId }) {
  const myRecords = useMemo(() => {
    if (!attendances || !playerId) return [];
    const records = [];
    attendances.forEach((att) => {
      const me = att.asistencias?.find((a) => a.jugador_id === playerId);
      if (me) {
        records.push({
          fecha: att.fecha,
          estado: me.estado,
          observaciones: me.observaciones,
          categoria: att.categoria,
        });
      }
    });
    return records.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [attendances, playerId]);

  const stats = useMemo(() => {
    const total = myRecords.length;
    const presente = myRecords.filter((r) => r.estado === "presente").length;
    const tardanza = myRecords.filter((r) => r.estado === "tardanza").length;
    const porcentaje = total > 0 ? Math.round(((presente + tardanza) / total) * 100) : 0;
    return { total, presente, tardanza, porcentaje };
  }, [myRecords]);

  if (myRecords.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-slate-600 font-medium">Aún no hay registros de asistencia</p>
          <p className="text-slate-400 text-sm mt-1">Tu entrenador los registrará en cada entrenamiento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-green-600">{stats.porcentaje}%</div>
            <p className="text-xs text-green-700 font-medium">Asistencia</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-blue-600">{stats.total}</div>
            <p className="text-xs text-blue-700 font-medium">Entrenamientos</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-amber-50">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-orange-600">{stats.presente}</div>
            <p className="text-xs text-orange-700 font-medium">Asistidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance progress bar */}
      <Card className="border-none shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-700">Tu racha de asistencia</span>
            <span className="text-sm font-bold text-green-600">{stats.porcentaje}%</span>
          </div>
          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.porcentaje}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${
                stats.porcentaje >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                stats.porcentaje >= 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" :
                "bg-gradient-to-r from-red-400 to-red-500"
              }`}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {stats.porcentaje >= 80 ? "💪 ¡Excelente asistencia! ¡Sigue así!" :
             stats.porcentaje >= 60 ? "👍 Bien, pero puedes mejorar" :
             "⚠️ Intenta no faltar a los entrenamientos"}
          </p>
        </CardContent>
      </Card>

      {/* Recent records */}
      <div className="space-y-2">
        <p className="text-sm font-bold text-slate-600 px-1">Últimos entrenamientos</p>
        {myRecords.slice(0, 10).map((record, idx) => {
          const statusConf = STATUS_CONFIG[record.estado] || STATUS_CONFIG.ausente;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card className="border-none shadow-sm">
                <CardContent className="p-3 flex items-center gap-3">
                  <span className="text-2xl">{statusConf.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {format(new Date(record.fecha), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    {record.observaciones && (
                      <p className="text-xs text-slate-500 truncate">{record.observaciones}</p>
                    )}
                  </div>
                  <Badge className={`${statusConf.color} border-none text-xs`}>
                    {statusConf.label}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}