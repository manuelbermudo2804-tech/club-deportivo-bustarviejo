import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell, Calendar, Trophy, Megaphone, Image, Star, PartyPopper, ClipboardList, ChevronRight, Zap, CheckCircle2
} from "lucide-react";
import MinorAttendanceCard from "@/components/minor/MinorAttendanceCard";
import MinorGoalsCard from "@/components/minor/MinorGoalsCard";
import { MinorAgeTransitionBanner } from "@/components/transitions/AgeTransitionBanner";
import MinorStreakWidget from "@/components/minor/MinorStreakWidget";
import MinorEvalWidget from "@/components/minor/MinorEvalWidget";
import MinorGoalsWidget from "@/components/minor/MinorGoalsWidget";
import MinorBadgesWidget from "@/components/minor/MinorBadgesWidget";
import MinorNextTraining from "@/components/minor/MinorNextTraining";
import MinorMotivationalQuote from "@/components/minor/MinorMotivationalQuote";
import MinorBirthdayBanner from "@/components/minor/MinorBirthdayBanner";


const CLUB_LOGO_URL = `https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg`;

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

function HeroSection({ player, user }) {
  const firstName = player?.nombre?.split(" ")[0] || user?.full_name?.split(" ")[0] || "Jugador";
  const edad = calcularEdad(player?.fecha_nacimiento);
  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";
  const saludoEmoji = hora < 12 ? "☀️" : hora < 20 ? "⚡" : "🌙";

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-6 pb-5 shadow-2xl"
    >
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-20 -right-20 w-72 h-72 bg-orange-500/15 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-24 -left-24 w-72 h-72 bg-green-500/15 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-0 right-0 w-40 h-40 bg-cyan-400/10 rounded-full blur-2xl"
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Sparkle dots */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{ left: `${15 + i * 18}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* Greeting with animated emoji */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-4"
        >
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0], y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
          >
            👋
          </motion.span>
          <span className="text-orange-300 font-semibold text-base">{saludo}</span>
          <motion.span
            className="text-lg"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
          >
            {saludoEmoji}
          </motion.span>
        </motion.div>

        <div className="flex items-center gap-4">
          {player?.foto_url ? (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.3, bounce: 0.5 }}
              className="relative flex-shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-green-500 rounded-2xl blur-md opacity-50 scale-105" />
              <img
                src={player.foto_url}
                alt={player.nombre}
                className="relative w-22 h-22 rounded-2xl object-cover ring-4 ring-orange-400/60 shadow-2xl"
                style={{ width: 88, height: 88 }}
              />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.6, bounce: 0.6 }}
                className="absolute -bottom-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow-lg border-2 border-slate-900"
              >
                {player.posicion !== "Sin asignar" ? player.posicion : "⚽"}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", delay: 0.3, bounce: 0.5 }}
              className="w-22 h-22 rounded-2xl bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center shadow-2xl ring-4 ring-orange-400/60"
              style={{ width: 88, height: 88 }}
            >
              <motion.span
                className="text-4xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                ⚽
              </motion.span>
            </motion.div>
          )}
          <div className="flex-1 min-w-0">
            <motion.h1
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, type: "spring" }}
              className="text-3xl font-black text-white truncate leading-tight"
            >
              {firstName}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 }}
              className="flex flex-wrap items-center gap-2 mt-2"
            >
              {player?.categoria_principal && (
                <Badge className="bg-orange-500/90 text-white text-xs border-none shadow-md">
                  ⚽ {player.categoria_principal}
                </Badge>
              )}
              {edad && (
                <Badge variant="outline" className="text-green-300 border-green-400/50 text-xs">
                  🎂 {edad} años
                </Badge>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionCard({ icon: Icon, title, subtitle, href, color, badge, delay = 0, emoji }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileTap={{ scale: 0.97 }}
    >
      <Link to={href}>
        <Card className={`border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer bg-gradient-to-br ${color}`}>
          <CardContent className="p-4 flex items-center gap-4 relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-base truncate">{title}</h3>
              <p className="text-white/70 text-xs truncate">{subtitle}</p>
            </div>
            {badge > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2"
              >
                <Badge className="bg-red-500 text-white border-none text-xs font-bold animate-pulse shadow-lg">
                  {badge}
                </Badge>
              </motion.div>
            )}
            <ChevronRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

function NextCallupBanner({ callup }) {
  if (!callup) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
        <Link to={createPageUrl("CalendarAndSchedules")}>
          <Card className="border-none shadow-lg bg-gradient-to-r from-slate-100 to-green-50 overflow-hidden">
            <CardContent className="p-4 relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-700 text-sm">No estás convocado aún</h3>
                  <p className="text-slate-500 text-xs">Toca para ver los partidos del club →</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  }

  const fecha = new Date(callup.fecha_partido);
  const hoy = new Date();
  const diff = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
  const diasTexto = diff === 0 ? "¡HOY!" : diff === 1 ? "Mañana" : `En ${diff} días`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
    >
      <Link to={createPageUrl("ParentCallups")}>
        <Card className="border-none shadow-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 overflow-hidden">
          <CardContent className="p-4 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22%20fill%3D%22rgba(255%2C255%2C255%2C0.1)%22%2F%3E%3C%2Fsvg%3E')] opacity-50" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-3xl">🏟️</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-white text-red-600 font-bold text-xs border-none">
                    <Zap className="w-3 h-3 mr-1" />{diasTexto}
                  </Badge>
                  <span className="text-white/70 text-[10px] font-semibold">¡Estás convocado!</span>
                </div>
                <h3 className="font-black text-white text-lg truncate">{callup.titulo}</h3>
                <p className="text-white/80 text-sm">
                  {callup.hora_partido} · {callup.ubicacion?.split(",")[0]}
                </p>
              </div>
              <ChevronRight className="w-6 h-6 text-white/60" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function MinorDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: linkedPlayer } = useQuery({
    queryKey: ["minorPlayer", user?.email],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({
        acceso_menor_email: user.email,
        acceso_menor_autorizado: true,
        activo: true,
      });
      return players[0] || null;
    },
    enabled: !!user?.email,
  });

  const playerCategory = linkedPlayer?.categoria_principal || linkedPlayer?.deporte;

  const { data: callups = [] } = useQuery({
    queryKey: ["minorCallups", linkedPlayer?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const all = await base44.entities.Convocatoria.list("-fecha_partido", 20);
      return all.filter(
        (c) =>
          c.publicada &&
          !c.cerrada &&
          c.fecha_partido >= today &&
          c.jugadores_convocados?.some((j) => j.jugador_id === linkedPlayer.id)
      );
    },
    enabled: !!linkedPlayer?.id,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["minorAnnouncements"],
    queryFn: async () => {
      const all = await base44.entities.Announcement.filter({ publicado: true });
      return all.filter((a) => {
        if (a.destinatarios_tipo === "Todos") return true;
        return a.destinatarios_tipo === playerCategory;
      }).slice(0, 3);
    },
    enabled: !!user,
  });

  const pendingCallups = callups.filter((c) =>
    c.jugadores_convocados?.some(
      (j) => j.jugador_id === linkedPlayer?.id && j.confirmacion === "pendiente"
    )
  ).length;

  // Fetch attendance records for this player's category
  const { data: attendances = [] } = useQuery({
    queryKey: ["minorAttendance", playerCategory],
    queryFn: () => base44.entities.Attendance.filter({ categoria: playerCategory }, "-fecha", 50),
    enabled: !!playerCategory,
  });

  const { data: mailboxMessages = [] } = useQuery({
    queryKey: ["minorMailbox", user?.email],
    queryFn: () => base44.entities.JuniorMailbox.filter({ jugador_email: user.email, estado: "respondido", leido_por_jugador: false }),
    enabled: !!user?.email,
  });

  // Goals for badges
  const { data: playerGoals = [] } = useQuery({
    queryKey: ["minorPlayerGoals", linkedPlayer?.id],
    queryFn: () => base44.entities.PlayerGoal.filter({ jugador_id: linkedPlayer.id }),
    enabled: !!linkedPlayer?.id,
  });

  // Scorers for badge count
  const { data: scorers = [] } = useQuery({
    queryKey: ["minorScorersBadge", playerCategory],
    queryFn: () => base44.entities.Goleador.filter({ categoria: playerCategory, equipo: "C.D. BUSTARVIEJO" }),
    enabled: !!playerCategory,
    staleTime: 300000,
  });

  const myGolesCount = React.useMemo(() => {
    if (!linkedPlayer?.nombre || !scorers.length) return 0;
    const norm = (n) => n?.toLowerCase().trim().replace(/,\s*/g, " ").split(" ").reverse().join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ") || "";
    const found = scorers.find(s => norm(s.jugador_nombre) === norm(linkedPlayer.nombre));
    return found?.goles || 0;
  }, [linkedPlayer?.nombre, scorers]);

  const unreadAnnouncements = announcements.filter((a) => {
    const leido = (a.leido_por || []).some((l) => l.email === user?.email);
    return !leido;
  }).length;

  const unreadMailbox = mailboxMessages.length;

  const nextCallup = callups[0] || null;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        <HeroSection player={linkedPlayer} user={user} />
        {linkedPlayer && <MinorAgeTransitionBanner player={linkedPlayer} />}

        {/* Cumpleaños */}
        {linkedPlayer && <MinorBirthdayBanner player={linkedPlayer} />}

        {/* Frase motivacional diaria */}
        <MinorMotivationalQuote />

        {/* === SECCIÓN 1: Lo urgente === */}
        <NextCallupBanner callup={nextCallup} />

        {/* Próximo entrenamiento */}
        {playerCategory && <MinorNextTraining playerCategory={playerCategory} />}

        {/* Racha de entrenamientos */}
        {linkedPlayer?.id && attendances.length > 0 && (
          <MinorStreakWidget attendances={attendances} playerId={linkedPlayer.id} />
        )}

        {/* Goles marcados */}
        {linkedPlayer?.nombre && playerCategory && (
          <MinorGoalsCard playerName={linkedPlayer.nombre} playerCategory={playerCategory} />
        )}

        {/* === SECCIÓN 2: Mi progreso === */}
        {/* Mini evaluación */}
        {linkedPlayer?.id && <MinorEvalWidget playerId={linkedPlayer.id} />}

        {/* Mis metas personales */}
        {linkedPlayer?.id && (
          <MinorGoalsWidget
            playerId={linkedPlayer.id}
            playerName={linkedPlayer.nombre}
            userEmail={user.email}
            userName={user.full_name}
          />
        )}

        {/* Logros / Insignias */}
        {linkedPlayer?.id && (
          <MinorBadgesWidget
            attendances={attendances}
            playerId={linkedPlayer.id}
            goles={myGolesCount}
            convocatorias={callups.length}
            metas={playerGoals.length}
            metasCompletadas={playerGoals.filter(g => g.completada).length}
          />
        )}

        {/* === SECCIÓN 3: Acceso rápido === */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-1"
        >
          <Zap className="w-4 h-4 text-orange-500" />
          <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Acceso rápido</h2>
        </motion.div>

        <div className="grid gap-3">
          <QuickActionCard emoji="📋" title="Convocatorias" subtitle="Confirma tu asistencia a partidos" href={createPageUrl("ParentCallups")} color="from-green-600 to-emerald-700" badge={pendingCallups} delay={0.1} />
          <QuickActionCard emoji="📅" title="Calendario" subtitle="Horarios de entrenamiento y partidos" href={createPageUrl("CalendarAndSchedules")} color="from-blue-600 to-cyan-700" delay={0.15} />
          <QuickActionCard emoji="🏆" title="Competición" subtitle="Clasificaciones y resultados" href={createPageUrl("CentroCompeticion")} color="from-yellow-500 to-orange-600" delay={0.2} />
          <QuickActionCard emoji="📢" title="Anuncios" subtitle="Noticias y comunicados del club" href={createPageUrl("Announcements")} color="from-pink-500 to-rose-600" badge={unreadAnnouncements} delay={0.25} />
          <QuickActionCard emoji="🎉" title="Eventos" subtitle="Fiestas, torneos y actividades" href={createPageUrl("ParentEventRSVP")} color="from-purple-500 to-violet-600" delay={0.3} />
          <QuickActionCard emoji="📊" title="Mis Valoraciones" subtitle="Notas de tu entrenador sobre cómo juegas" href={createPageUrl("PlayerEvaluations")} color="from-indigo-500 to-blue-600" delay={0.35} />
          <QuickActionCard emoji="🖼️" title="Galería" subtitle="Fotos de partidos y eventos" href={createPageUrl("Gallery")} color="from-teal-500 to-cyan-600" delay={0.4} />
          <QuickActionCard emoji="✉️" title="Mi Buzón" subtitle="Cuéntanos lo que quieras, tu voz importa" href={createPageUrl("JuniorMailbox")} color="from-pink-500 to-purple-600" badge={unreadMailbox} delay={0.45} />
          <QuickActionCard emoji="📋" title="Encuestas" subtitle="Tu opinión nos importa" href={createPageUrl("Surveys")} color="from-orange-500 to-amber-600" delay={0.5} />
        </div>

        {/* === SECCIÓN 4: Mi asistencia detallada === */}
        {linkedPlayer?.id && attendances.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center gap-2 px-1 pt-2"
            >
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Mi Asistencia</h2>
            </motion.div>
            <MinorAttendanceCard attendances={attendances} playerId={linkedPlayer.id} />
          </>
        )}

        {/* Footer motivacional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center py-6"
        >
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-12 h-12 mx-auto rounded-xl opacity-30 object-cover mb-2" />
          <p className="text-xs text-slate-400">CD Bustarviejo · Acceso Juvenil</p>
        </motion.div>
      </div>
    </div>
  );
}