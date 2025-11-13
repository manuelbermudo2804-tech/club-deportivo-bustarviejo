import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Megaphone, Image, Clock, MessageCircle, Trophy, User as UserIcon } from "lucide-react";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function PlayerDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: player, isLoading } = useQuery({
    queryKey: ['myPlayerProfile', user?.jugador_id],
    queryFn: async () => {
      if (!user?.jugador_id) return null;
      return await base44.entities.Player.list();
    },
    enabled: !!user?.jugador_id,
    select: (data) => data?.find(p => p.id === user?.jugador_id) || null,
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
  });

  const unreadMessages = messages.filter(m => 
    !m.leido && 
    m.tipo === "admin_a_grupo" && 
    (m.deporte === player?.deporte || m.grupo_id === player?.deporte)
  ).length;

  const menuItems = [
    {
      title: "Mi Perfil",
      icon: UserIcon,
      url: createPageUrl("PlayerProfile"),
      gradient: "from-orange-600 to-orange-700",
    },
    {
      title: "Horarios",
      icon: Clock,
      url: createPageUrl("PlayerSchedules"),
      gradient: "from-green-600 to-green-700",
    },
    {
      title: "Calendario",
      icon: Calendar,
      url: createPageUrl("Calendar"),
      gradient: "from-blue-600 to-blue-700",
    },
    {
      title: "Anuncios",
      icon: Megaphone,
      url: createPageUrl("Announcements"),
      gradient: "from-purple-600 to-purple-700",
    },
    {
      title: "Galería",
      icon: Image,
      url: createPageUrl("PlayerGallery"),
      gradient: "from-pink-600 to-pink-700",
    },
    {
      title: "Chat Equipo",
      icon: MessageCircle,
      url: createPageUrl("PlayerChat"),
      gradient: "from-indigo-600 to-indigo-700",
      badge: unreadMessages,
      badgeLabel: "nuevos"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 lg:p-8 shadow-2xl">
        <div className="flex items-center justify-center gap-4 mb-4">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl shadow-2xl ring-4 ring-white/50" />
          <div className="text-white text-center">
            <h1 className="text-3xl lg:text-4xl font-bold">CD Bustarviejo</h1>
            <p className="text-orange-100 text-sm lg:text-base">Panel de Jugador</p>
          </div>
        </div>
      </div>

      {/* Banner Welcome */}
      <div className="px-4 lg:px-8 py-6">
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white rounded-full blur-3xl opacity-10"></div>
          <div className="relative z-10 text-white text-center">
            <h2 className="text-2xl lg:text-3xl font-bold mb-2">
              ¡Hola {player?.nombre?.split(' ')[0] || user?.full_name?.split(' ')[0] || 'Jugador'}! 👋
            </h2>
            <p className="text-green-100 text-sm lg:text-base">
              {player?.deporte || 'Bienvenido al club'}
            </p>
            {player && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-300" />
                <p className="text-green-100 text-sm">
                  ¡Sigue entrenando y dando lo mejor de ti! 💪⚽
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="px-4 lg:px-8 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl`}></div>
                
                <div className="relative z-10 p-6 lg:p-8 flex flex-col items-center justify-center min-h-[180px] lg:min-h-[200px]">
                  <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                  </div>
                  
                  <h3 className="text-white font-bold text-center text-base lg:text-lg mb-2">
                    {item.title}
                  </h3>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <p className="text-white text-xs font-semibold">
                        {item.badge} {item.badgeLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Info Card */}
      <div className="px-4 lg:px-8 pb-8">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-3xl p-6 shadow-2xl text-white">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-300" />
            Valores del Deportista
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl mb-1">💪</div>
              <p className="text-xs text-orange-100">Esfuerzo</p>
            </div>
            <div>
              <div className="text-3xl mb-1">🤝</div>
              <p className="text-xs text-orange-100">Compañerismo</p>
            </div>
            <div>
              <div className="text-3xl mb-1">🎯</div>
              <p className="text-xs text-orange-100">Disciplina</p>
            </div>
            <div>
              <div className="text-3xl mb-1">❤️</div>
              <p className="text-xs text-orange-100">Pasión</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}