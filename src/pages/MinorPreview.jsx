import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Trophy, Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import MinorCommitmentLevel from "@/components/minor/MinorCommitmentLevel";
import MinorChallenges from "@/components/minor/MinorChallenges";
import MinorStreakWidget from "@/components/minor/MinorStreakWidget";
import MinorBadgesWidget from "@/components/minor/MinorBadgesWidget";
import MinorMotivationalQuote from "@/components/minor/MinorMotivationalQuote";

// Fake player ID for demo
const FAKE_PLAYER_ID = "demo-player-123";

// Generate fake attendance data
function generateFakeAttendances() {
  const attendances = [];
  const today = new Date();
  for (let i = 0; i < 25; i++) {
    const fecha = new Date(today);
    fecha.setDate(fecha.getDate() - i * 3); // every 3 days
    const isPresent = i < 8 || Math.random() > 0.2; // streak of 8 + random
    attendances.push({
      id: `att-${i}`,
      fecha: fecha.toISOString().split("T")[0],
      categoria: "Pádel",
      asistencias: [
        {
          jugador_id: FAKE_PLAYER_ID,
          jugador_nombre: "Laura García",
          estado: isPresent ? (Math.random() > 0.85 ? "tardanza" : "presente") : "ausente",
        },
      ],
    });
  }
  return attendances;
}

const FAKE_ATTENDANCES = generateFakeAttendances();

const SectionHeader = ({ icon: SIcon, title, color = "text-slate-500" }) => (
  <div className="flex items-center gap-2 px-1 pt-3 pb-1">
    <SIcon className={`w-4 h-4 ${color}`} />
    <h2 className="font-bold text-slate-600 text-xs uppercase tracking-widest">{title}</h2>
    <div className="flex-1 h-px bg-slate-200 ml-2" />
  </div>
);

export default function MinorPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto p-4 space-y-3 pb-24">

        {/* Banner informativo */}
        <Card className="border-2 border-dashed border-orange-300 bg-orange-50">
          <CardContent className="p-4">
            <p className="text-sm font-bold text-orange-800 mb-1">👀 Vista previa — Panel Juvenil Complementario</p>
            <p className="text-xs text-orange-700">
              Esto es lo que vería un menor (13-17 años) inscrito en una <strong>actividad complementaria</strong> (Pádel, Voleibol, Multideporte, Prep. Física). 
              Los datos son ficticios para demostración.
            </p>
          </CardContent>
        </Card>

        {/* HERO simulado */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 p-6 pb-5 shadow-2xl">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-teal-500/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">👋</span>
              <span className="text-teal-300 font-semibold text-base">Buenas tardes</span>
              <span className="text-lg">⚡</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl ring-4 ring-teal-400/60">
                <span className="text-4xl">🏸</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-black text-white truncate leading-tight">Laura</h1>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge className="bg-teal-500/90 text-white text-xs border-none shadow-md">🏸 Pádel</Badge>
                  <Badge variant="outline" className="text-cyan-300 border-cyan-400/50 text-xs">🎂 15 años</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PRÓXIMO ENTRENAMIENTO */}
        <SectionHeader icon={Zap} title="Lo próximo" color="text-orange-500" />
        <Card className="border-none shadow-lg bg-gradient-to-r from-teal-500 to-cyan-600 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-2xl">🏸</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-xs font-semibold">Próxima sesión</p>
                <h3 className="font-bold text-white text-lg">Miércoles · 18:00</h3>
                <p className="text-white/80 text-sm">Pistas municipales</p>
              </div>
              <ChevronRight className="w-5 h-5 text-white/60" />
            </div>
          </CardContent>
        </Card>

        {/* MI PROGRESO */}
        <SectionHeader icon={Trophy} title="Mi progreso" color="text-yellow-500" />

        {/* Nivel de compromiso */}
        <MinorCommitmentLevel attendances={FAKE_ATTENDANCES} playerId={FAKE_PLAYER_ID} />

        {/* Racha (full width for complementary) */}
        <div className="grid grid-cols-1 gap-3">
          <MinorStreakWidget attendances={FAKE_ATTENDANCES} playerId={FAKE_PLAYER_ID} />
        </div>

        {/* Retos */}
        <MinorChallenges attendances={FAKE_ATTENDANCES} playerId={FAKE_PLAYER_ID} />

        {/* Insignias adaptadas */}
        <MinorBadgesWidget
          attendances={FAKE_ATTENDANCES}
          playerId={FAKE_PLAYER_ID}
          goles={0}
          convocatorias={0}
          metas={2}
          metasCompletadas={1}
          isComplementaria={true}
          numCategorias={2}
        />

        {/* ACCESO RÁPIDO (sin competitivas) */}
        <SectionHeader icon={ChevronRight} title="Acceso rápido" color="text-blue-500" />
        <div className="grid grid-cols-2 gap-2">
          {[
            { emoji: "📅", title: "Calendario", subtitle: "Horarios", color: "from-blue-600 to-cyan-700" },
            { emoji: "📢", title: "Anuncios", subtitle: "Noticias", color: "from-pink-500 to-rose-600" },
            { emoji: "🎉", title: "Eventos", subtitle: "Actividades", color: "from-purple-500 to-violet-600" },
            { emoji: "🖼️", title: "Galería", subtitle: "Fotos", color: "from-teal-500 to-cyan-600" },
            { emoji: "✉️", title: "Mi Buzón", subtitle: "Tu voz", color: "from-pink-500 to-purple-600" },
            { emoji: "📋", title: "Encuestas", subtitle: "Opina", color: "from-orange-500 to-amber-600" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className={`border-none shadow-lg bg-gradient-to-br ${item.color} h-full`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl flex-shrink-0">
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm truncate leading-tight">{item.title}</h3>
                      <p className="text-white/60 text-[10px] truncate">{item.subtitle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* MI ASISTENCIA */}
        <SectionHeader icon={CheckCircle2} title="Mi asistencia" color="text-green-500" />
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-black text-green-600">88%</div>
              <p className="text-xs text-green-700 font-medium">Asistencia</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-black text-blue-600">25</div>
              <p className="text-xs text-blue-700 font-medium">Sesiones</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-amber-50">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-black text-orange-600">22</div>
              <p className="text-xs text-orange-700 font-medium">Asistidas</p>
            </CardContent>
          </Card>
        </div>

        {/* Motivación */}
        <MinorMotivationalQuote />

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[10px] text-slate-300">CD Bustarviejo · Vista Previa Panel Juvenil Complementario</p>
        </div>
      </div>
    </div>
  );
}