import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Award, Star, Target, TrendingUp, Zap, Medal, Crown } from "lucide-react";

export default function PlayerAchievements({ player, attendances, evaluations, callups }) {
  const achievements = [];

  // Attendance badges
  const playerAttendances = attendances.filter(att => 
    att.asistencias.some(a => a.jugador_id === player.id)
  );
  
  let presente = 0;
  playerAttendances.forEach(att => {
    const record = att.asistencias.find(a => a.jugador_id === player.id);
    if (record?.estado === "presente") presente++;
  });

  const attendancePercentage = playerAttendances.length > 0 ? 
    ((presente / playerAttendances.length) * 100) : 0;

  if (attendancePercentage >= 95) {
    achievements.push({
      icon: Trophy,
      title: "Asistencia Perfecta",
      description: "95%+ de asistencia",
      color: "text-yellow-600 bg-yellow-50",
      rarity: "legendary"
    });
  } else if (attendancePercentage >= 85) {
    achievements.push({
      icon: Star,
      title: "Compromiso Total",
      description: "85%+ de asistencia",
      color: "text-orange-600 bg-orange-50",
      rarity: "epic"
    });
  } else if (attendancePercentage >= 75) {
    achievements.push({
      icon: Target,
      title: "Asistencia Destacada",
      description: "75%+ de asistencia",
      color: "text-blue-600 bg-blue-50",
      rarity: "rare"
    });
  }

  // Evaluation badges
  const playerEvals = evaluations.filter(e => e.jugador_id === player.id && e.visible_para_padres);
  
  if (playerEvals.length > 0) {
    const latestEval = playerEvals[0];
    const avgScore = (latestEval.tecnica + latestEval.tactica + latestEval.fisica + 
                      latestEval.actitud + latestEval.trabajo_equipo) / 5;

    if (avgScore >= 4.5) {
      achievements.push({
        icon: Crown,
        title: "Excelencia Deportiva",
        description: "Evaluación 4.5+",
        color: "text-purple-600 bg-purple-50",
        rarity: "legendary"
      });
    } else if (avgScore >= 4.0) {
      achievements.push({
        icon: Award,
        title: "Rendimiento Sobresaliente",
        description: "Evaluación 4.0+",
        color: "text-indigo-600 bg-indigo-50",
        rarity: "epic"
      });
    }

    // Check for improvement
    if (playerEvals.length >= 3) {
      const last3 = playerEvals.slice(0, 3);
      const avgs = last3.map(e => 
        (e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5
      );
      
      if (avgs[0] > avgs[1] && avgs[1] > avgs[2]) {
        achievements.push({
          icon: TrendingUp,
          title: "En Progreso",
          description: "Mejora constante",
          color: "text-green-600 bg-green-50",
          rarity: "rare"
        });
      }
    }

    // Specific skill badges
    if (latestEval.actitud === 5) {
      achievements.push({
        icon: Star,
        title: "Actitud Ejemplar",
        description: "Actitud perfecta",
        color: "text-pink-600 bg-pink-50",
        rarity: "epic"
      });
    }

    if (latestEval.trabajo_equipo === 5) {
      achievements.push({
        icon: Award,
        title: "Espíritu de Equipo",
        description: "Trabajo en equipo 5/5",
        color: "text-teal-600 bg-teal-50",
        rarity: "rare"
      });
    }
  }

  // Callup badges
  const playerCallups = callups.filter(c => 
    c.jugadores_convocados?.some(j => j.jugador_id === player.id)
  );

  if (playerCallups.length >= 20) {
    achievements.push({
      icon: Medal,
      title: "Veterano del Club",
      description: "20+ convocatorias",
      color: "text-amber-600 bg-amber-50",
      rarity: "legendary"
    });
  } else if (playerCallups.length >= 10) {
    achievements.push({
      icon: Zap,
      title: "Jugador Habitual",
      description: "10+ convocatorias",
      color: "text-cyan-600 bg-cyan-50",
      rarity: "epic"
    });
  }

  // New player badge
  const daysSinceCreation = player.created_date ? 
    Math.floor((new Date() - new Date(player.created_date)) / (1000 * 60 * 60 * 24)) : 999;
  
  if (daysSinceCreation <= 30) {
    achievements.push({
      icon: Star,
      title: "Nuevo Fichaje",
      description: "Bienvenido al club",
      color: "text-blue-600 bg-blue-50",
      rarity: "common"
    });
  }

  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  achievements.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);

  if (achievements.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-orange-600" />
            Logros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-slate-600 text-sm">
              ¡Sigue entrenando para desbloquear logros!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-orange-600" />
          Logros ({achievements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {achievements.map((achievement, idx) => {
            const Icon = achievement.icon;
            return (
              <div 
                key={idx}
                className={`${achievement.color} rounded-xl p-4 text-center hover:scale-105 transition-transform cursor-pointer`}
              >
                <Icon className="w-8 h-8 mx-auto mb-2" />
                <p className="font-bold text-sm mb-1">{achievement.title}</p>
                <p className="text-xs opacity-80">{achievement.description}</p>
                {achievement.rarity === "legendary" && (
                  <Badge className="mt-2 bg-yellow-500 text-white text-xs">
                    ⭐ Legendario
                  </Badge>
                )}
                {achievement.rarity === "epic" && (
                  <Badge className="mt-2 bg-purple-500 text-white text-xs">
                    ✨ Épico
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}