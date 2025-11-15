import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, CreditCard, ShoppingBag, Calendar, Megaphone, Image, Clock, MessageCircle, Bell, Settings, ClipboardCheck, CheckCircle2, Star, TrendingUp, AlertCircle, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import Onboarding from "../components/Onboarding";
import AutomaticReminders from "../components/AutomaticReminders";
import ActivityTimeline from "../components/ActivityTimeline";

const CLUB_LOGO_URL = "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png";

export default function Home() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [userRole, setUserRole] = useState("parent");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const adminCheck = currentUser.role === "admin";
        const coachCheck = currentUser.es_entrenador === true && !adminCheck;
        setIsAdmin(adminCheck);
        setIsCoach(coachCheck);

        if (adminCheck) setUserRole("admin");
        else if (coachCheck) setUserRole("coach");
        else setUserRole("parent");

        if (adminCheck || currentUser.es_entrenador) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayers = allPlayers.filter(p => 
            p.email_padre === currentUser.email || 
            p.email_tutor_2 === currentUser.email
          );
          setHasPlayers(myPlayers.length > 0);
        }
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

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list('-created_date'),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-created_date'),
    initialData: [],
  });

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.ClothingOrder.list('-created_date'),
    initialData: [],
  });

  const activePlayers = players.filter(p => p.activo).length;
  const pendingPayments = payments.filter(p => p.estado === "Pendiente").length;
  const unreadMessages = messages.filter(m => !m.leido && m.tipo === "padre_a_grupo").length;

  const today = new Date().toISOString().split('T')[0];
  const pendingCallupsCount = () => {
    if (!user || !hasPlayers) return 0;
    
    const myPlayers = players.filter(p => 
      p.email_padre === user.email || 
      p.email_tutor_2 === user.email
    );
    
    let pending = 0;
    callups.forEach(callup => {
      if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
        callup.jugadores_convocados?.forEach(jugador => {
          const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
          if (isMyPlayer && jugador.confirmacion === "pendiente") {
            pending++;
          }
        });
      }
    });
    return pending;
  };

  // Admin stats and charts
  const paymentsByMonth = {};
  payments.forEach(p => {
    const month = p.created_date ? p.created_date.substring(0, 7) : 'Unknown';
    if (!paymentsByMonth[month]) {
      paymentsByMonth[month] = { Pagado: 0, Pendiente: 0, EnRevision: 0 };
    }
    if (p.estado === "Pagado") paymentsByMonth[month].Pagado++;
    else if (p.estado === "Pendiente") paymentsByMonth[month].Pendiente++;
    else paymentsByMonth[month].EnRevision++;
  });

  const paymentChartData = Object.keys(paymentsByMonth)
    .sort()
    .slice(-6)
    .map(month => ({
      mes: month.substring(5),
      Pagado: paymentsByMonth[month].Pagado,
      Pendiente: paymentsByMonth[month].Pendiente,
      "En Revisión": paymentsByMonth[month].EnRevision
    }));

  const playersByCategory = {};
  players.filter(p => p.activo).forEach(p => {
    const cat = p.deporte || "Sin categoría";
    playersByCategory[cat] = (playersByCategory[cat] || 0) + 1;
  });

  const categoryChartData = Object.keys(playersByCategory).map(cat => ({
    name: cat.replace("Fútbol ", "").replace(" (Mixto)", ""),
    value: playersByCategory[cat]
  }));

  const COLORS = ['#f97316', '#16a34a', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

  const attendanceStats = {};
  attendances.forEach(att => {
    att.asistencias.forEach(a => {
      if (!attendanceStats[a.jugador_id]) {
        attendanceStats[a.jugador_id] = { presente: 0, ausente: 0, total: 0 };
      }
      attendanceStats[a.jugador_id].total++;
      if (a.estado === "presente") attendanceStats[a.jugador_id].presente++;
      else if (a.estado === "ausente") attendanceStats[a.jugador_id].ausente++;
    });
  });

  const avgAttendance = Object.values(attendanceStats).length > 0
    ? (Object.values(attendanceStats).reduce((sum, s) => sum + (s.presente / s.total) * 100, 0) / Object.values(attendanceStats).length).toFixed(0)
    : 0;

  // Recent activity for timeline
  const recentActivity = [];
  
  players.slice(0, 5).forEach(p => {
    if (p.created_date) {
      recentActivity.push({
        type: "player_new",
        date: p.created_date,
        title: "Nuevo jugador registrado",
        description: `${p.nombre} - ${p.deporte}`,
        badge: "Nuevo",
        badgeColor: "bg-blue-500"
      });
    }
  });

  payments.slice(0, 5).forEach(p => {
    recentActivity.push({
      type: "payment",
      date: p.created_date,
      title: `Pago ${p.estado.toLowerCase()}`,
      description: `${p.jugador_nombre} - ${p.mes} (${p.cantidad}€)`,
      badge: p.estado,
      badgeColor: p.estado === "Pagado" ? "bg-green-500" : "bg-orange-500"
    });
  });

  callups.slice(0, 3).forEach(c => {
    if (c.created_date) {
      recentActivity.push({
        type: "callup",
        date: c.created_date,
        title: "Nueva convocatoria",
        description: `${c.titulo} - ${c.categoria}`,
        badge: "Convocatoria",
        badgeColor: "bg-orange-500"
      });
    }
  });

  recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

  const buildMenuItems = () => {
    const items = [
      {
        title: "Jugadores",
        icon: Users,
        url: createPageUrl("Players"),
        gradient: "from-orange-600 to-orange-700",
        badge: activePlayers,
        badgeLabel: "activos"
      }
    ];

    if (isCoach) {
      items.push(
        {
          title: "🎓 Plantillas",
          icon: Users,
          url: createPageUrl("TeamRosters"),
          gradient: "from-blue-600 to-blue-700",
        },
        {
          title: "✅ Asistencia",
          icon: CheckCircle2,
          url: createPageUrl("CoachAttendance"),
          gradient: "from-green-600 to-green-700",
        },
        {
          title: "⭐ Evaluaciones",
          icon: Star,
          url: createPageUrl("PlayerEvaluations"),
          gradient: "from-purple-600 to-purple-700",
        }
      );
    }

    items.push(
      {
        title: "Horarios",
        icon: Clock,
        url: createPageUrl("TrainingSchedules"),
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
        url: createPageUrl("AdminGallery"),
        gradient: "from-pink-600 to-pink-700",
      },
      {
        title: "🎓 Crear Convocatorias",
        icon: Bell,
        url: createPageUrl("CoachCallups"),
        gradient: "from-yellow-600 to-yellow-700",
      }
    );

    if (hasPlayers) {
      items.push({
        title: "👨‍👩‍👧 Mis Convocatorias",
        icon: ClipboardCheck,
        url: createPageUrl("ParentCallups"),
        gradient: "from-green-600 to-green-700",
        badge: pendingCallupsCount(),
        badgeLabel: "pendientes"
      });
    }

    items.push(
      {
        title: "Pagos",
        icon: CreditCard,
        url: isCoach && hasPlayers ? createPageUrl("Payments") + "?register=true" : createPageUrl("Payments"),
        gradient: "from-orange-600 to-red-700",
        badge: pendingPayments,
        badgeLabel: "pendientes"
      }
    );

    if (isAdmin) {
      items.push(
        {
          title: "⭐ Evaluaciones",
          icon: Star,
          url: createPageUrl("PlayerEvaluations"),
          gradient: "from-purple-600 to-purple-700",
        },
        {
          title: "📊 Estadísticas",
          icon: TrendingUp,
          url: createPageUrl("ClubStats"),
          gradient: "from-indigo-600 to-indigo-700",
        },
        {
          title: "Recordatorios",
          icon: Bell,
          url: createPageUrl("Reminders"),
          gradient: "from-red-600 to-orange-700",
        }
      );
    }

    items.push({
      title: "Pedidos Ropa",
      icon: ShoppingBag,
      url: createPageUrl("ClothingOrders"),
      gradient: "from-teal-600 to-teal-700",
    });

    if (isAdmin) {
      items.push({
        title: "Chat Grupos",
        icon: MessageCircle,
        url: createPageUrl("AdminChat"),
        gradient: "from-indigo-600 to-indigo-700",
        badge: unreadMessages,
        badgeLabel: "nuevos"
      });
    } else if (isCoach) {
      items.push({
        title: "Chat Equipos",
        icon: MessageCircle,
        url: createPageUrl("CoachChat"),
        gradient: "from-blue-600 to-blue-700",
        badge: unreadMessages,
        badgeLabel: "nuevos"
      });
    }

    if (isAdmin) {
      items.push({
        title: "Configuración",
        icon: Settings,
        url: createPageUrl("SeasonManagement"),
        gradient: "from-slate-600 to-slate-700",
      });
    }

    return items;
  };

  const menuItems = buildMenuItems();

  const getPanelTitle = () => {
    if (isAdmin) return "Panel de Administración";
    if (isCoach) return "Panel de Entrenadores";
    return "Panel de Gestión";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      {user && <Onboarding userRole={userRole} />}
      <AutomaticReminders />
      
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 lg:p-6 shadow-2xl">
        <div className="flex items-center justify-center gap-3">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl shadow-2xl ring-4 ring-white/50" />
          <div className="text-white text-center">
            <h1 className="text-2xl lg:text-3xl font-bold">CD Bustarviejo</h1>
            <p className="text-orange-100 text-xs lg:text-sm">{getPanelTitle()}</p>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-6 space-y-6">
        {/* Admin Dashboard Stats */}
        {isAdmin && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-700 font-medium">Jugadores</p>
                      <p className="text-3xl font-bold text-orange-900">{activePlayers}</p>
                      <p className="text-xs text-orange-600">Activos</p>
                    </div>
                    <Users className="w-12 h-12 text-orange-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-700 font-medium">Pagos</p>
                      <p className="text-3xl font-bold text-red-900">{pendingPayments}</p>
                      <p className="text-xs text-red-600">Pendientes</p>
                    </div>
                    <AlertCircle className="w-12 h-12 text-red-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Asistencia</p>
                      <p className="text-3xl font-bold text-green-900">{avgAttendance}%</p>
                      <p className="text-xs text-green-600">Promedio</p>
                    </div>
                    <CheckCircle2 className="w-12 h-12 text-green-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 font-medium">Mensajes</p>
                      <p className="text-3xl font-bold text-blue-900">{unreadMessages}</p>
                      <p className="text-xs text-blue-600">Sin leer</p>
                    </div>
                    <MessageCircle className="w-12 h-12 text-blue-600 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">📊 Pagos - Últimos 6 Meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={paymentChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Pagado" fill="#16a34a" />
                      <Bar dataKey="Pendiente" fill="#f97316" />
                      <Bar dataKey="En Revisión" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">👥 Jugadores por Categoría</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Activity Timeline */}
            <ActivityTimeline activities={recentActivity.slice(0, 10)} />
          </>
        )}

        {/* Menu Grid */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">🎯 Accesos Rápidos</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
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

        {/* Bottom Stats for non-admins */}
        {!isAdmin && (
          <div className="bg-slate-800 rounded-3xl p-6 shadow-2xl border-2 border-slate-700">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-orange-500 mb-1">
                  {activePlayers}
                </div>
                <div className="text-slate-400 text-xs lg:text-sm">Jugadores Activos</div>
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
                <div className="text-slate-400 text-xs lg:text-sm">Pagos Confirmados</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-blue-500 mb-1">
                  {unreadMessages}
                </div>
                <div className="text-slate-400 text-xs lg:text-sm">Mensajes Nuevos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}