import React from "react";
import { Link } from "react-router-dom";
import { CloudSun, ClipboardCheck, Dumbbell, PenTool, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  { to: "/MeteoClub", icon: CloudSun, titulo: "Avisar a las familias", desc: "Tiempo, cambio de campo, recoger antes...", color: "text-sky-600 bg-sky-50" },
  { to: "/TeamAttendanceEvaluation", icon: ClipboardCheck, titulo: "Asistencia y evaluación", desc: "Pasar lista y evaluar jugadores", color: "text-green-600 bg-green-50" },
  { to: "/ExerciseLibrary", icon: Dumbbell, titulo: "Biblioteca de ejercicios", desc: "Ejercicios y planes de entrenamiento", color: "text-orange-600 bg-orange-50" },
  { to: "/TacticsBoard", icon: PenTool, titulo: "Pizarra táctica", desc: "Dibuja jugadas y sistemas", color: "text-purple-600 bg-purple-50" },
  { to: "/CoachEvaluationReports", icon: FileText, titulo: "Reportes de entrenadores", desc: "Informes de evaluación del equipo", color: "text-blue-600 bg-blue-50" },
];

export default function EntrenamientoHub() {
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Entrenamiento</h1>
      <p className="text-sm text-slate-600 mb-6">Todo lo que necesitas para el día a día del equipo.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{item.titulo}</p>
                  <p className="text-xs text-slate-600">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}