import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Trophy, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

import MatchAppLink from "../components/MatchAppLink";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function ParentDashboard() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p =>
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      const playerIds = players.map(p => p.id);
      return allPayments.filter(payment => playerIds.includes(payment.jugador_id));
    },
    enabled: players.length > 0,
    initialData: [],
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

  const pendingPayments = payments.filter(p => p.estado === "Pendiente").length;
  
  const myGroupSports = [...new Set(players.map(p => p.deporte))];
  const unreadMessages = messages.filter(m => 
    !m.leido && 
    m.tipo === "admin_a_grupo" && 
    myGroupSports.includes(m.grupo_id || m.deporte)
  ).length;

  // Calculate pending callups
  const pendingCallupsCount = () => {
    if (!user || players.length === 0) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    let pending = 0;
    
    callups.forEach(callup => {
      if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
        callup.jugadores_convocados?.forEach(jugador => {
          const isMyPlayer = players.some(p => p.id === jugador.jugador_id);
          if (isMyPlayer && jugador.confirmacion === "pendiente") {
            pending++;
          }
        });
      }
    });
    
    return pending;
  };

  const menuItems = [
    {
      title: "Mis Jugadores",
      icon: Users,
      url: createPageUrl("ParentPlayers"),
      gradient: "from-orange-600 to-orange-700",
      badge: players.length,
      badgeLabel: "registrados"
    },
    {
      title: "Horarios",
      icon: Clock,
      url: createPageUrl("ParentTrainingSchedules"),
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
      url: createPageUrl("ParentGallery"),
      gradient: "from-pink-600 to-pink-700",
    },
    {
      title: "🏆 Convocatorias",
      icon: ClipboardCheck,
      url: createPageUrl("ParentCallups"),
      gradient: "from-yellow-600 to-yellow-700",
      badge: pendingCallupsCount(),
      badgeLabel: "pendientes"
    },
    {
      title: "Chat Grupo",
      icon: MessageCircle,
      url: createPageUrl("ParentChat"),
      gradient: "from-indigo-600 to-indigo-700",
      badge: unreadMessages,
      badgeLabel: "nuevos"
    },
    {
      title: "Mis Pagos",
      icon: CreditCard,
      url: createPageUrl("ParentPayments"),
      gradient: "from-orange-600 to-red-700",
      badge: pendingPayments,
      badgeLabel: "pendientes"
    },
    {
      title: "Pedidos Ropa",
      icon: ShoppingBag,
      url: createPageUrl("ClothingOrders"),
      gradient: "from-teal-600 to-teal-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 lg:p-6 shadow-2xl">
        <div className="flex items-center justify-center gap-3">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl shadow-2xl ring-4 ring-white/50" />
          <div className="text-white text-center">
            <h1 className="text-2xl lg:text-3xl font-bold">CD Bustarviejo</h1>
            <p className="text-orange-100 text-xs lg:text-sm">Panel de Familias</p>
          </div>
        </div>
      </div>

      {/* MatchApp Card */}
      <div className="px-4 lg:px-8 pt-6 pb-4">
        <Card className="border-none shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
          <CardContent className="relative z-10 py-4 px-4 lg:py-6 lg:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 lg:w-16 lg:h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg lg:text-2xl font-bold mb-1">Horarios y Resultados</h3>
                  <p className="text-slate-300 text-xs lg:text-sm">
                    📱 Descarga MatchApp • Ver partidos en directo
                  </p>
                </div>
              </div>
              <MatchAppLink className="w-full md:w-auto py-3 lg:py-4 px-6 lg:px-8 text-sm lg:text-base" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Menu Grid */}
      <div className="px-4 lg:px-8 py-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className="relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 border-slate-700 hover:border-orange-500">
                {/* Background Image Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700/50 to-black/80 opacity-60"></div>
                
                {/* Gradient Corner */}
                <div className={`absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl ${item.gradient} opacity-30 blur-2xl`}></div>
                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${item.gradient} opacity-20 blur-xl`}></div>
                
                {/* Content */}
                <div className="relative z-10 p-6 lg:p-8 flex flex-col items-center justify-center min-h-[180px] lg:min-h-[200px]">
                  {/* Icon */}
                  <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-300`}>
                    <item.icon className="w-8 h-8 lg:w-10 lg:h-10 text-white" />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-white font-bold text-center text-base lg:text-lg mb-2">
                    {item.title}
                  </h3>
                  
                  {/* Badge */}
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

      {/* Stats Footer */}
      <div className="px-4 lg:px-8 pb-8">
        <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500 mb-1">
                {players.length}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Mis Jugadores</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-red-500 mb-1">
                {pendingPayments}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Pagos Pendientes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-green-500 mb-1">
                {payments.filter(p => p.estado === "Pagado").length}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Pagos Realizados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-500 mb-1">
                {unreadMessages}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Mensajes Nuevos</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="px-4 lg:px-8 pb-8">
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-3xl p-6 shadow-2xl text-white text-center">
          <h3 className="text-xl font-bold mb-2">¿Necesitas ayuda?</h3>
          <p className="text-orange-100 mb-4">Contacta con el club</p>
          <div className="space-y-2">
            <a href="mailto:CDBUSTARVIEJO@GMAIL.COM" className="block text-white font-semibold hover:text-orange-100 transition-colors">
              📧 CDBUSTARVIEJO@GMAIL.COM
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}