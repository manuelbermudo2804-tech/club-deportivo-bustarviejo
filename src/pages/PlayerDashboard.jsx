import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Megaphone, Image, Clock, MessageCircle, Trophy, User as UserIcon, ClipboardCheck, Clover } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import MatchAppLink from "../components/MatchAppLink";
import SocialLinks from "../components/SocialLinks";

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

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: Infinity,
  });

  const unreadMessages = messages.filter(m => 
    !m.leido && 
    m.tipo === "admin_a_grupo" && 
    (m.deporte === player?.deporte || m.grupo_id === player?.deporte)
  ).length;

  const pendingCallupsCount = () => {
    if (!player) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    let pending = 0;
    
    callups.forEach(callup => {
      if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
        const myConfirmation = callup.jugadores_convocados?.find(j => j.jugador_id === player.id);
        if (myConfirmation && myConfirmation.confirmacion === "pendiente") {
          pending++;
        }
      }
    });
    
    return pending;
  };

  const loteriaVisible = seasonConfig?.loteria_navidad_abierta === true;

  const menuItems = [
    {
      title: "Mi Perfil",
      icon: UserIcon,
      url: createPageUrl("PlayerProfile"),
      gradient: "from-orange-600 to-orange-700",
    },
    {
      title: "🏆 Convocatorias",
      icon: ClipboardCheck,
      url: createPageUrl("PlayerCallups"),
      gradient: "from-yellow-600 to-yellow-700",
      badge: pendingCallupsCount(),
      badgeLabel: "pendientes"
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
    ...(loteriaVisible ? [{
      title: "🍀 Lotería Navidad",
      icon: Clover,
      url: createPageUrl("ParentLottery"),
      gradient: "from-green-600 to-red-600",
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black pt-4 lg:pt-0">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-3 lg:p-6 shadow-2xl">
        <div className="flex items-center justify-center gap-2 lg:gap-3">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-10 h-10 lg:w-16 lg:h-16 rounded-2xl shadow-2xl ring-4 ring-white/50" />
          <div className="text-white text-center">
            <h1 className="text-xl lg:text-3xl font-bold">CD Bustarviejo</h1>
            <p className="text-orange-100 text-[10px] lg:text-sm">Panel de Jugador</p>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 space-y-4 lg:space-y-6">
        <SocialLinks />

        <Card className="border-none shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
          <CardContent className="relative z-10 py-3 px-3 lg:py-6 lg:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="w-10 h-10 lg:w-16 lg:h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-5 h-5 lg:w-8 lg:h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-base lg:text-2xl font-bold mb-1">Horarios y Resultados</h3>
                  <p className="text-slate-300 text-[10px] lg:text-sm">
                    📱 Descarga MatchApp • Ver partidos en directo
                  </p>
                </div>
              </div>
              <MatchAppLink className="w-full md:w-auto py-2 lg:py-4 px-4 lg:px-8 text-xs lg:text-base" />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl`}></div>
                
                <div className="relative z-10 p-4 lg:p-8 flex flex-col items-center justify-center min-h-[140px] lg:min-h-[200px]">
                  <div className={`w-12 h-12 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-3 lg:mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-6 h-6 lg:w-10 lg:h-10 text-white" />
                  </div>
                  
                  <h3 className="text-white font-bold text-center text-sm lg:text-lg mb-2">
                    {item.title}
                  </h3>
                  
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <p className="text-white text-[10px] lg:text-xs font-semibold">
                        {item.badge} {item.badgeLabel}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-3xl p-4 lg:p-6 shadow-2xl text-white">
          <h3 className="text-lg lg:text-xl font-bold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-yellow-300" />
            Valores del Deportista
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 text-center">
            <div>
              <div className="text-2xl lg:text-3xl mb-1">💪</div>
              <p className="text-[10px] lg:text-xs text-orange-100">Esfuerzo</p>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl mb-1">🤝</div>
              <p className="text-[10px] lg:text-xs text-orange-100">Compañerismo</p>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl mb-1">🎯</div>
              <p className="text-[10px] lg:text-xs text-orange-100">Disciplina</p>
            </div>
            <div>
              <div className="text-2xl lg:text-3xl mb-1">❤️</div>
              <p className="text-[10px] lg:text-xs text-orange-100">Pasión</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}