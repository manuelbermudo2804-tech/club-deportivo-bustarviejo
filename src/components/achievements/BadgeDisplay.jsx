import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Target, Zap, Award, TrendingUp, CheckCircle2, Crown } from "lucide-react";

const BADGE_TYPES = {
  // Attendance badges
  perfect_attendance: {
    icon: CheckCircle2,
    color: "from-green-500 to-green-600",
    title: "Asistencia Perfecta",
    description: "100% de asistencia este mes"
  },
  consistent_player: {
    icon: Target,
    color: "from-blue-500 to-blue-600",
    title: "Jugador Constante",
    description: "90%+ asistencia en 3 meses"
  },
  
  // Evaluation badges
  top_performer: {
    icon: Trophy,
    color: "from-orange-500 to-orange-600",
    title: "Mejor Rendimiento",
    description: "Evaluación promedio 4.5+"
  },
  most_improved: {
    icon: TrendingUp,
    color: "from-purple-500 to-purple-600",
    title: "Mayor Progreso",
    description: "+1 punto en evaluaciones"
  },
  excellence: {
    icon: Star,
    color: "from-yellow-500 to-yellow-600",
    title: "Excelencia",
    description: "5 puntos en alguna área"
  },
  
  // Participation badges
  active_member: {
    icon: Zap,
    color: "from-pink-500 to-pink-600",
    title: "Miembro Activo",
    description: "10+ convocatorias confirmadas"
  },
  team_player: {
    icon: Award,
    color: "from-indigo-500 to-indigo-600",
    title: "Espíritu de Equipo",
    description: "4.5+ en trabajo en equipo"
  },
  
  // Special badges
  club_legend: {
    icon: Crown,
    color: "from-orange-600 to-red-600",
    title: "Leyenda del Club",
    description: "3+ temporadas en el club"
  }
};

export function calculateBadges(player, attendances, evaluations, callups) {
  const badges = [];
  
  if (!player) return badges;

  // Attendance badges
  const playerAttendances = attendances.filter(att => 
    att.asistencias.some(a => a.jugador_id === player.id)
  );

  let presente = 0, total = 0;
  playerAttendances.forEach(att => {
    const record = att.asistencias.find(a => a.jugador_id === player.id);
    if (record) {
      total++;
      if (record.estado === "presente") presente++;
    }
  });

  const attendanceRate = total > 0 ? (presente / total) * 100 : 0;

  if (attendanceRate === 100 && total >= 4) {
    badges.push('perfect_attendance');
  }
  if (attendanceRate >= 90 && total >= 10) {
    badges.push('consistent_player');
  }

  // Evaluation badges
  const playerEvals = evaluations.filter(e => 
    e.jugador_id === player.id && e.visible_para_padres
  );

  if (playerEvals.length > 0) {
    const avgScore = playerEvals.reduce((sum, e) => 
      sum + (e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5, 0
    ) / playerEvals.length;

    if (avgScore >= 4.5) {
      badges.push('top_performer');
    }

    // Check for excellence (any 5)
    const hasExcellence = playerEvals.some(e => 
      e.tecnica === 5 || e.tactica === 5 || e.fisica === 5 || 
      e.actitud === 5 || e.trabajo_equipo === 5
    );
    if (hasExcellence) {
      badges.push('excellence');
    }

    // Team player
    const avgTeamwork = playerEvals.reduce((sum, e) => sum + e.trabajo_equipo, 0) / playerEvals.length;
    if (avgTeamwork >= 4.5) {
      badges.push('team_player');
    }

    // Most improved (if has at least 2 evaluations)
    if (playerEvals.length >= 2) {
      const recent = playerEvals.slice(0, 2);
      const oldAvg = (recent[1].tecnica + recent[1].tactica + recent[1].fisica + recent[1].actitud + recent[1].trabajo_equipo) / 5;
      const newAvg = (recent[0].tecnica + recent[0].tactica + recent[0].fisica + recent[0].actitud + recent[0].trabajo_equipo) / 5;
      if (newAvg - oldAvg >= 1) {
        badges.push('most_improved');
      }
    }
  }

  // Participation badges
  const playerCallups = callups.filter(c => 
    c.jugadores_convocados?.some(j => j.jugador_id === player.id && j.confirmacion === "asistire")
  );

  if (playerCallups.length >= 10) {
    badges.push('active_member');
  }

  // Club legend (3+ years)
  if (player.created_date) {
    const joinDate = new Date(player.created_date);
    const now = new Date();
    const yearsDiff = now.getFullYear() - joinDate.getFullYear();
    if (yearsDiff >= 3) {
      badges.push('club_legend');
    }
  }

  return badges;
}

export default function BadgeDisplay({ badges = [], size = "md" }) {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20"
  };

  const iconSizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9"
  };

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {badges.map((badgeKey) => {
        const badge = BADGE_TYPES[badgeKey];
        if (!badge) return null;

        const Icon = badge.icon;

        return (
          <div key={badgeKey} className="group relative">
            <div className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${badge.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 cursor-pointer`}>
              <Icon className={`${iconSizeClasses[size]} text-white`} />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                <p className="font-bold">{badge.title}</p>
                <p className="text-slate-300 text-xs">{badge.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}