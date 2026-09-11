import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock } from "lucide-react";
import { getNextTraining } from "@/lib/nextTraining";
import useSinEntrenamiento from "@/hooks/useSinEntrenamiento";

export default function MinorNextTraining({ playerCategory }) {
  const { data: schedules = [] } = useQuery({
    queryKey: ["minorSchedules", playerCategory],
    queryFn: () => base44.entities.TrainingSchedule.filter({ categoria: playerCategory, activo: true }),
    enabled: !!playerCategory,
    staleTime: 600000,
  });

  const diasSinEntreno = useSinEntrenamiento();

  if (!schedules.length) return null;

  const next = getNextTraining(schedules, new Date(), diasSinEntreno);
  if (!next) return null;

  const best = next.schedule;
  const daysUntil = next.daysUntil;
  const fechaEntreno = next.fecha;

  const dayLabel = daysUntil === 0
    ? "¡Hoy!"
    : daysUntil === 1
      ? "Mañana"
      : daysUntil < 7
        ? best.dia_semana
        : `${best.dia_semana} ${fechaEntreno.getDate()}/${fechaEntreno.getMonth() + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="border-none shadow-lg bg-gradient-to-r from-blue-600 to-cyan-600 overflow-hidden">
        <CardContent className="p-4 relative">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          </div>
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white/70 text-xs font-medium">Próximo entrenamiento</p>
              <h3 className="text-white font-black text-lg">{dayLabel}</h3>
              <p className="text-white/80 text-sm">
                {best.hora_inicio} - {best.hora_fin} {best.ubicacion ? `· ${best.ubicacion}` : ""}
              </p>
            </div>
            {daysUntil <= 1 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-3xl"
              >
                {daysUntil === 0 ? "🏃" : "⏰"}
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}