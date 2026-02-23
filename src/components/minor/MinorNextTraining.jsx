import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock } from "lucide-react";

const DIAS_MAP = {
  "Lunes": 1, "Martes": 2, "Miércoles": 3, "Jueves": 4, "Viernes": 5,
};

const DIAS_NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function MinorNextTraining({ playerCategory }) {
  const { data: schedules = [] } = useQuery({
    queryKey: ["minorSchedules", playerCategory],
    queryFn: () => base44.entities.TrainingSchedule.filter({ categoria: playerCategory, activo: true }),
    enabled: !!playerCategory,
    staleTime: 600000,
  });

  if (!schedules.length) return null;

  // Find next training from now
  const now = new Date();
  const todayDow = now.getDay(); // 0=Sun
  const currentTime = now.getHours() * 60 + now.getMinutes();

  let best = null;
  let bestDiff = Infinity;

  for (const s of schedules) {
    const dow = DIAS_MAP[s.dia_semana];
    if (dow === undefined) continue;

    const [h, m] = (s.hora_inicio || "18:00").split(":").map(Number);
    const trainTime = h * 60 + m;

    // Days until this training
    let diff = dow - todayDow;
    if (diff < 0) diff += 7;
    if (diff === 0 && currentTime >= trainTime) diff = 7; // Already passed today

    if (diff < bestDiff) {
      bestDiff = diff;
      best = s;
    }
  }

  if (!best) return null;

  const dow = DIAS_MAP[best.dia_semana];
  let daysUntil = dow - todayDow;
  if (daysUntil < 0) daysUntil += 7;
  const [h, m] = (best.hora_inicio || "18:00").split(":").map(Number);
  if (daysUntil === 0 && currentTime >= h * 60 + m) daysUntil = 7;

  const dayLabel = daysUntil === 0 ? "¡Hoy!" : daysUntil === 1 ? "Mañana" : `${best.dia_semana}`;

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