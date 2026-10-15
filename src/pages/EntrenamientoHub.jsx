import React from "react";
import { Link } from "react-router-dom";
import { CloudSun, ClipboardCheck, Dumbbell, PenTool, FileText, ArrowUpRight, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  { to: "/MeteoClub", icon: CloudSun, titulo: "Avisar a las familias", desc: "Tiempo, cambio de campo, recoger antes...", color: "text-sky-600 bg-sky-50" },
  { to: "/TeamAttendanceEvaluation", icon: ClipboardCheck, titulo: "Asistencia y evaluación", desc: "Pasar lista y evaluar jugadores", color: "text-green-600 bg-green-50" },
  { to: "/ExerciseLibrary", icon: Dumbbell, titulo: "Biblioteca de ejercicios e IA", desc: "Busca ejercicios, crea variantes y genera sesiones personalizadas con IA.", color: "text-orange-600 bg-orange-50" },
  { to: "/TrainingPlanHistory", icon: History, titulo: "Planificador e historial", desc: "Consulta tus sesiones guardadas, programa fechas y registra cómo han ido.", color: "text-indigo-600 bg-indigo-50" },
  { to: "/TacticsBoard", icon: PenTool, titulo: "Pizarra táctica", desc: "Dibuja jugadas y sistemas", color: "text-purple-600 bg-purple-50" },
  { to: "/CoachEvaluationReports", icon: FileText, titulo: "Reportes de entrenadores", desc: "Informes de evaluación del equipo", color: "text-blue-600 bg-blue-50" },
];

export default function EntrenamientoHub() {
  return (
    <main className="mx-auto box-border w-full min-w-0 max-w-[1200px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:space-y-6 sm:px-5 lg:px-8 lg:pt-7">
      <header className="relative isolate overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/30 sm:h-16 sm:w-16">
            <Dumbbell className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Área técnica · C.D. Bustarviejo</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Entrenamiento</h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">Todo lo que necesitas para preparar y gestionar el día a día de tu equipo.</p>
          </div>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Herramientas del entrenador</h2>
            <p className="mt-1 text-sm text-slate-500">Acceso rápido a tus herramientas habituales.</p>
          </div>
          <span className="shrink-0 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">{ITEMS.length} herramientas</span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
          {ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className="group block min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2">
              <Card className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-orange-200 group-hover:shadow-lg">
                <CardContent className="flex min-w-0 items-start gap-3 p-4 sm:p-5">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 ${item.color}`}>
                    <item.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold leading-snug text-slate-900">{item.titulo}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-orange-600" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}