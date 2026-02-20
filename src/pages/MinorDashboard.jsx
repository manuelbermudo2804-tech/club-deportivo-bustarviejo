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
import MinorChatPhotos from "@/components/minor/MinorChatPhotos";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 p-6 shadow-2xl"
    >
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-cyan-500/5 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 flex items-center gap-4">
        {player?.foto_url ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="relative"
          >
            <img
              src={player.foto_url}
              alt={player.nombre}
              className="w-20 h-20 rounded-2xl object-cover ring-4 ring-orange-500/50 shadow-xl"
            />
            <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow">
              {player.posicion !== "Sin asignar" ? player.posicion : "⚽"}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-green-500 flex items-center justify-center text-4xl shadow-xl ring-4 ring-orange-500/50"
          >
            ⚽
          </motion.div>
        )}
        <div className="flex-1 min-w-0">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-orange-300 text-sm font-medium"
          >
            {saludo} 👋
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-black text-white truncate"
          >
            {firstName}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2 mt-1"
          >
            {player?.categoria_principal && (
              <Badge className="bg-orange-500/80 text-white text-xs border-none">
                {player.categoria_principal}
              </Badge>
            )}
            {edad && (
              <Badge variant="outline" className="text-green-300 border-green-500/50 text-xs">
                {edad} años
              </Badge>
            )}
          </motion.div>
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
  if (!callup) return null;

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
        <NextCallupBanner callup={nextCallup} />

        {/* Goles marcados */}
        {linkedPlayer?.nombre && playerCategory && (
          <MinorGoalsCard playerName={linkedPlayer.nombre} playerCategory={playerCategory} />
        )}

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
          <QuickActionCard
            emoji="📋"
            title="Convocatorias"
            subtitle="Confirma tu asistencia a partidos"
            href={createPageUrl("ParentCallups")}
            color="from-green-600 to-emerald-700"
            badge={pendingCallups}
            delay={0.1}
          />
          <QuickActionCard
            emoji="📅"
            title="Calendario"
            subtitle="Horarios de entrenamiento y partidos"
            href={createPageUrl("CalendarAndSchedules")}
            color="from-blue-600 to-cyan-700"
            delay={0.15}
          />
          <QuickActionCard
            emoji="🏆"
            title="Competición"
            subtitle="Clasificaciones y resultados"
            href={createPageUrl("CentroCompeticion")}
            color="from-yellow-500 to-orange-600"
            delay={0.2}
          />
          <QuickActionCard
            emoji="📢"
            title="Anuncios"
            subtitle="Noticias y comunicados del club"
            href={createPageUrl("Announcements")}
            color="from-pink-500 to-rose-600"
            badge={unreadAnnouncements}
            delay={0.25}
          />
          <QuickActionCard
            emoji="🎉"
            title="Eventos"
            subtitle="Fiestas, torneos y actividades"
            href={createPageUrl("ParentEventRSVP")}
            color="from-purple-500 to-violet-600"
            delay={0.3}
          />
          <QuickActionCard
            emoji="📊"
            title="Mis Valoraciones"
            subtitle="Notas de tu entrenador sobre cómo juegas"
            href={createPageUrl("PlayerEvaluations")}
            color="from-indigo-500 to-blue-600"
            delay={0.35}
          />
          <QuickActionCard
            emoji="🖼️"
            title="Galería"
            subtitle="Fotos de partidos y eventos"
            href={createPageUrl("Gallery")}
            color="from-teal-500 to-cyan-600"
            delay={0.4}
          />
          <QuickActionCard
            emoji="✉️"
            title="Mi Buzón"
            subtitle="Cuéntanos lo que quieras, tu voz importa"
            href={createPageUrl("JuniorMailbox")}
            color="from-pink-500 to-purple-600"
            badge={unreadMailbox}
            delay={0.45}
          />
          <QuickActionCard
            emoji="📋"
            title="Encuestas"
            subtitle="Tu opinión nos importa"
            href={createPageUrl("Surveys")}
            color="from-orange-500 to-amber-600"
            delay={0.5}
          />
        </div>

        {/* Chat photos from coaches */}
        {playerCategory && (
          <MinorChatPhotos playerCategory={playerCategory} />
        )}

        {/* Attendance section */}
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