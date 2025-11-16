import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Calendar, Bell, MessageCircle, CreditCard, Image, Megaphone, Clock, ShoppingBag, FileText, Award, AlertCircle, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import SocialLinks from "../components/SocialLinks";
import PushNotificationManager from "../components/push/PushNotificationManager";
import ActivityTimeline from "../components/dashboard/ActivityTimeline";
import UpcomingEvents from "../components/dashboard/UpcomingEvents";

export default function ParentDashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
  });

  const { data: directMessages } = useQuery({
    queryKey: ['directMessages'],
    queryFn: () => base44.entities.DirectMessage.list('-created_date'),
    initialData: [],
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
  });

  const { data: seasonConfigs } = useQuery({
    queryKey: ['seasonConfigs'],
    queryFn: () => base44.entities.SeasonConfig.list(),
    initialData: [],
  });

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myPayments = payments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id)
  );

  const unreadMessages = messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo") {
      const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
      return myGroupSports.includes(m.grupo_id || m.deporte);
    }
    return false;
  }).length;

  const unreadDirectMessages = user ? directMessages.filter(m => 
    m.destinatario_email === user.email && !m.leido
  ).length : 0;

  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = callups.filter(c => 
    c.publicada && c.fecha_partido >= today && !c.cerrada
  );

  let pendingCallups = 0;
  upcomingCallups.forEach(callup => {
    callup.jugadores_convocados?.forEach(jugador => {
      const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
      if (isMyPlayer && jugador.confirmacion === "pendiente") {
        pendingCallups++;
      }
    });
  });

  // Calcular pagos pendientes solo de jugadores que YA hayan registrado pagos
  const calculatePendingPayments = () => {
    const activeSeason = seasonConfigs.find(s => s.activa);
    if (!activeSeason) return myPayments.filter(p => p.estado === "Pendiente").length;

    const currentMonth = new Date().getMonth() + 1; // 1-12
    let expectedPayments = 0;

    myPlayers.forEach(player => {
      // Buscar pagos de este jugador para la temporada activa
      const playerPayments = myPayments.filter(p => 
        p.jugador_id === player.id && p.temporada === activeSeason.temporada
      );

      // Si NO tiene pagos registrados, no contamos nada (no sabemos su modalidad)
      if (playerPayments.length === 0) return;

      // Si tiene pago único, solo debe haber 1 pago (Junio)
      const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único");
      if (pagoUnico) {
        if (pagoUnico.estado !== "Pagado") {
          expectedPayments++;
        }
      } else {
        // Si tiene pagos fraccionados (Junio, Septiembre, Diciembre)
        const mesesRequeridos = ["Junio", "Septiembre", "Diciembre"];
        mesesRequeridos.forEach(mes => {
          const mesNum = mes === "Junio" ? 6 : mes === "Septiembre" ? 9 : 12;
          
          // Solo contar si ya pasó el mes o estamos en el mes
          if (currentMonth >= mesNum) {
            const pagoMes = playerPayments.find(p => p.mes === mes);
            if (!pagoMes || pagoMes.estado !== "Pagado") {
              expectedPayments++;
            }
          }
        });
      }
    });

    return expectedPayments;
  };

  const pendingPayments = calculatePendingPayments();
  const hasUnregisteredPayments = myPlayers.length > 0 && myPayments.length === 0;

  const menuItems = [
    {
      title: "Mis Jugadores",
      icon: Users,
      url: createPageUrl("ParentPlayers"),
      gradient: "from-orange-600 to-orange-700",
      badge: myPlayers.length,
      badgeLabel: "registrados"
    },
    {
      title: "💬 Mensajes Privados",
      icon: Mail,
      url: createPageUrl("DirectMessages"),
      gradient: "from-purple-600 to-purple-700",
      badge: unreadDirectMessages,
      badgeLabel: "nuevos",
      urgent: unreadDirectMessages > 0
    },
    {
      title: "🏆 Convocatorias",
      icon: Bell,
      url: createPageUrl("ParentCallups"),
      gradient: "from-yellow-600 to-yellow-700",
      badge: pendingCallups,
      badgeLabel: "pendientes"
    },
    {
      title: "Pagos",
      icon: CreditCard,
      url: createPageUrl("ParentPayments"),
      gradient: "from-green-600 to-green-700",
      badge: pendingPayments,
      badgeLabel: "pendientes"
    },
    {
      title: "Certificados",
      icon: FileText,
      url: createPageUrl("Certificates"),
      gradient: "from-blue-600 to-blue-700",
    },
    {
      title: "Carnets",
      icon: Award,
      url: createPageUrl("PlayerCards"),
      gradient: "from-indigo-600 to-indigo-700",
    },
    {
      title: "Horarios",
      icon: Clock,
      url: createPageUrl("ParentTrainingSchedules"),
      gradient: "from-blue-600 to-blue-700",
    },
    {
      title: "Calendario",
      icon: Calendar,
      url: createPageUrl("Calendar"),
      gradient: "from-purple-600 to-purple-700",
    },
    {
      title: "Anuncios",
      icon: Megaphone,
      url: createPageUrl("Announcements"),
      gradient: "from-pink-600 to-pink-700",
    },
    {
      title: "Galería",
      icon: Image,
      url: createPageUrl("ParentGallery"),
      gradient: "from-indigo-600 to-indigo-700",
    },
    {
      title: "Chat Equipo",
      icon: MessageCircle,
      url: createPageUrl("ParentChat"),
      gradient: "from-teal-600 to-teal-700",
      badge: unreadMessages,
      badgeLabel: "nuevos"
    },
    {
      title: "Pedidos Ropa",
      icon: ShoppingBag,
      url: createPageUrl("ClothingOrders"),
      gradient: "from-red-600 to-red-700",
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-6">
        <SocialLinks />

        <div className="lg:hidden relative z-50">
          <PushNotificationManager />
        </div>

        {hasUnregisteredPayments && (
          <div className="bg-orange-500/20 border-2 border-orange-500 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">
                💰 Recuerda registrar los pagos de tus jugadores
              </p>
              <p className="text-orange-100 text-xs mt-1">
                Ve a la sección "Pagos" para registrar las cuotas de la temporada actual
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivityTimeline 
            payments={myPayments}
            callups={upcomingCallups}
            messages={messages.filter(m => !m.leido)}
          />
          
          <UpcomingEvents 
            events={events}
            myPlayers={myPlayers}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.url} className="group">
              <div className={`relative bg-slate-800 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-2 ${
                item.urgent ? 'border-purple-500 ring-2 ring-purple-400 animate-pulse' : 'border-slate-700 hover:border-orange-500'
              }`}>
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
                    <div className={`${item.urgent ? 'bg-purple-500 ring-2 ring-purple-300' : 'bg-white/20'} backdrop-blur-sm px-3 py-1 rounded-full`}>
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

        <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border-2 border-slate-700">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-orange-500 mb-1">
                {myPlayers.length}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Jugadores</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-red-500 mb-1">
                {pendingPayments}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Pagos Pendientes</div>
              <div className="text-slate-500 text-[10px] mt-1">
                (solo registrados)
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-yellow-500 mb-1">
                {pendingCallups}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Convocatorias</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-blue-500 mb-1">
                {unreadMessages}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Mensajes Grupo</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-purple-500 mb-1">
                {unreadDirectMessages}
              </div>
              <div className="text-slate-400 text-xs lg:text-sm">Mensajes Privados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}