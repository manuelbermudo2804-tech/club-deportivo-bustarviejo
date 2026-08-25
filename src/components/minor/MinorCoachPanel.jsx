import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { AVISO_PRACTICAS } from "@/components/practicas/permisosPracticas";

const TOOLS = [
  { key: "ver_horarios", emoji: "🕐", titulo: "Horarios", subtitulo: "Mi equipo", href: () => createPageUrl("CalendarAndSchedules"), color: "from-blue-600 to-cyan-700" },
  { key: "ver_convocatorias", emoji: "📋", titulo: "Convocatorias", subtitulo: (p) => (p.crear_convocatorias ? "Crear y editar" : "Solo lectura"), href: (p) => (p.crear_convocatorias ? createPageUrl("CoachCallups") : "/MinorCoachCallups"), color: "from-green-600 to-emerald-700" },
  { key: "asistencia", emoji: "✅", titulo: "Asistencia", subtitulo: () => "Pasar lista", href: () => createPageUrl("CoachAttendance"), color: "from-teal-600 to-emerald-700" },
  { key: "evaluaciones", emoji: "📝", titulo: "Evaluaciones", subtitulo: () => "Equipo", href: () => createPageUrl("PlayerEvaluations"), color: "from-indigo-600 to-blue-700" },
  { key: "chat_staff", emoji: "💬", titulo: "Chat técnico", subtitulo: () => "Cuerpo técnico", href: () => createPageUrl("StaffChat"), color: "from-slate-700 to-slate-900" },
  { key: "ejercicios", emoji: "📚", titulo: "Ejercicios", subtitulo: () => "Biblioteca", href: () => createPageUrl("ExerciseLibrary"), color: "from-orange-500 to-amber-600" },
  { key: "pizarra", emoji: "🎯", titulo: "Pizarra", subtitulo: () => "Táctica", href: () => createPageUrl("TacticsBoard"), color: "from-purple-600 to-violet-700" },
  { key: "competicion", emoji: "🏆", titulo: "Competición", subtitulo: () => "Clasificación", href: () => createPageUrl("CentroCompeticion"), color: "from-yellow-500 to-orange-600" },
];

export default function MinorCoachPanel({ player }) {
  const p = player?.entrenador_practicas;
  if (!p?.activo || !p?.categoria) return null;

  const tools = TOOLS.filter((t) => p[t.key] === true);

  return (
    <div className="space-y-2">
      <Card className="border-none shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900 text-sm">🧢 Entrenador en prácticas · {p.categoria}</p>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">{AVISO_PRACTICAS}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {tools.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {tools.map((t) => (
            <Link key={t.key} to={typeof t.href === "function" ? t.href(p) : t.href}>
              <Card className={`border-none shadow-lg bg-gradient-to-br ${t.color} h-full`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                      {t.emoji}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm truncate leading-tight">{t.titulo}</h3>
                      <p className="text-white/60 text-[10px] truncate">
                        {typeof t.subtitulo === "function" ? t.subtitulo(p) : t.subtitulo}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}