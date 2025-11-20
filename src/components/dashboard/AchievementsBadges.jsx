import React from "react";
import { Trophy, Star, Flame, Award, Target, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AchievementsBadges({ player, attendances, evaluations }) {
  const achievements = [];

  // Calcular asistencias del jugador
  const playerAttendances = attendances.filter(a => 
    a.asistencias?.some(asist => asist.jugador_id === player.id)
  );

  const totalAttendances = playerAttendances.length;
  const presentCount = playerAttendances.filter(a => 
    a.asistencias?.find(asist => asist.jugador_id === player.id)?.estado === "presente"
  ).length;

  const attendanceRate = totalAttendances > 0 ? (presentCount / totalAttendances) * 100 : 0;

  // Evaluaciones del jugador
  const playerEvaluations = evaluations.filter(e => e.jugador_id === player.id);
  const avgTecnica = playerEvaluations.length > 0 
    ? playerEvaluations.reduce((sum, e) => sum + (e.tecnica || 0), 0) / playerEvaluations.length 
    : 0;
  const avgActitud = playerEvaluations.length > 0 
    ? playerEvaluations.reduce((sum, e) => sum + (e.actitud || 0), 0) / playerEvaluations.length 
    : 0;

  // 🔥 RACHA DE ASISTENCIA
  if (attendanceRate >= 90) {
    achievements.push({
      icon: Flame,
      title: "¡Racha de Fuego! 🔥",
      description: `${attendanceRate.toFixed(0)}% de asistencia`,
      color: "from-orange-500 to-red-600",
      level: "gold"
    });
  } else if (attendanceRate >= 75) {
    achievements.push({
      icon: Flame,
      title: "¡Constante! 💪",
      description: `${attendanceRate.toFixed(0)}% de asistencia`,
      color: "from-blue-500 to-blue-600",
      level: "silver"
    });
  }

  // ⭐ ESTRELLA TÉCNICA
  if (avgTecnica >= 4.5) {
    achievements.push({
      icon: Star,
      title: "Estrella Técnica ⭐",
      description: `Media de ${avgTecnica.toFixed(1)}/5 en técnica`,
      color: "from-yellow-400 to-yellow-600",
      level: "gold"
    });
  }

  // 🏆 ACTITUD EJEMPLAR
  if (avgActitud >= 4.5) {
    achievements.push({
      icon: Trophy,
      title: "Actitud Ejemplar 🏆",
      description: `Media de ${avgActitud.toFixed(1)}/5 en actitud`,
      color: "from-green-500 to-green-600",
      level: "gold"
    });
  }

  // ⚡ RENDIMIENTO COMPLETO
  if (avgTecnica >= 4 && avgActitud >= 4 && attendanceRate >= 80) {
    achievements.push({
      icon: Zap,
      title: "Jugador Completo ⚡",
      description: "Excelente en todos los aspectos",
      color: "from-purple-500 to-purple-700",
      level: "platinum"
    });
  }

  // 🎯 COMPROMISO TOTAL
  if (presentCount >= 20) {
    achievements.push({
      icon: Target,
      title: "Compromiso Total 🎯",
      description: `${presentCount} entrenamientos completados`,
      color: "from-cyan-500 to-cyan-700",
      level: "gold"
    });
  }

  // 🏅 VETERANO
  if (presentCount >= 50) {
    achievements.push({
      icon: Award,
      title: "Veterano del Club 🏅",
      description: `+50 entrenamientos`,
      color: "from-indigo-500 to-indigo-700",
      level: "platinum"
    });
  }

  if (achievements.length === 0) {
    return (
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-100 to-slate-200">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-2">🌟</div>
          <p className="text-slate-600 text-sm">
            ¡Sigue entrenando para desbloquear logros!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-black">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Logros de {player.nombre}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`relative bg-gradient-to-br ${achievement.color} rounded-2xl p-4 shadow-lg overflow-hidden`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-bl-full"></div>
              <div className="relative z-10 flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                  <achievement.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-sm mb-1">
                    {achievement.title}
                  </h3>
                  <p className="text-white/80 text-xs">
                    {achievement.description}
                  </p>
                  <Badge className="mt-2 bg-white/20 text-white text-[10px]">
                    {achievement.level === "platinum" ? "PLATINO" : 
                     achievement.level === "gold" ? "ORO" : "PLATA"}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}