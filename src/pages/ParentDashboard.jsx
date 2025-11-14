import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Calendar, Bell, MessageCircle, CreditCard, TrendingUp, CheckCircle2, XCircle, AlertCircle, Clock, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

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
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-fecha_evaluacion'),
    initialData: [],
  });

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-fecha'),
    initialData: [],
  });

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myPayments = payments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id)
  );

  const myEvaluations = evaluations.filter(e => 
    myPlayers.some(player => player.id === e.jugador_id) && e.visible_para_padres
  );

  const unreadMessages = messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo") {
      const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];
      return myGroupSports.includes(m.grupo_id || m.deporte);
    }
    return false;
  }).length;

  // Callups stats
  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = callups.filter(c => 
    c.publicada && c.fecha_partido >= today && !c.cerrada
  );

  let pendingCallups = 0;
  let confirmedCallups = 0;
  upcomingCallups.forEach(callup => {
    callup.jugadores_convocados?.forEach(jugador => {
      const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
      if (isMyPlayer) {
        if (jugador.confirmacion === "pendiente") pendingCallups++;
        if (jugador.confirmacion === "asistire") confirmedCallups++;
      }
    });
  });

  // Payment stats
  const pendingPayments = myPayments.filter(p => p.estado === "Pendiente").length;
  const paidPayments = myPayments.filter(p => p.estado === "Pagado").length;

  // Attendance stats per player
  const getAttendanceStats = (playerId) => {
    const playerAttendances = attendances.filter(att => 
      att.asistencias.some(a => a.jugador_id === playerId)
    );
    
    let presente = 0, ausente = 0, justificado = 0;
    playerAttendances.forEach(att => {
      const record = att.asistencias.find(a => a.jugador_id === playerId);
      if (record) {
        if (record.estado === "presente") presente++;
        else if (record.estado === "ausente") ausente++;
        else if (record.estado === "justificado") justificado++;
      }
    });
    
    const total = presente + ausente + justificado;
    const percentage = total > 0 ? ((presente / total) * 100).toFixed(0) : 0;
    
    return { presente, ausente, justificado, total, percentage };
  };

  // Evaluation trends per player
  const getEvaluationTrend = (playerId) => {
    const playerEvals = myEvaluations.filter(e => e.jugador_id === playerId).slice(0, 5).reverse();
    return playerEvals.map(e => ({
      fecha: format(new Date(e.fecha_evaluacion), "dd/MM", { locale: es }),
      promedio: ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5).toFixed(1)
    }));
  };

  // Recent activity
  const recentActivity = [];
  
  // Recent payments
  myPayments.slice(0, 3).forEach(p => {
    recentActivity.push({
      type: "payment",
      date: p.created_date,
      icon: CreditCard,
      color: p.estado === "Pagado" ? "text-green-600" : "text-orange-600",
      text: `Pago ${p.estado.toLowerCase()}: ${p.jugador_nombre} - ${p.mes}`,
      status: p.estado
    });
  });

  // Recent callups
  upcomingCallups.slice(0, 3).forEach(c => {
    const myPlayerInCallup = c.jugadores_convocados?.find(j => 
      myPlayers.some(p => p.id === j.jugador_id)
    );
    if (myPlayerInCallup) {
      recentActivity.push({
        type: "callup",
        date: c.created_date,
        icon: Bell,
        color: myPlayerInCallup.confirmacion === "pendiente" ? "text-red-600" : "text-green-600",
        text: `Convocatoria: ${c.titulo}`,
        status: myPlayerInCallup.confirmacion
      });
    }
  });

  // Recent events
  const upcomingEvents = events.filter(e => e.publicado && e.fecha >= today).slice(0, 3);
  upcomingEvents.forEach(e => {
    recentActivity.push({
      type: "event",
      date: e.created_date,
      icon: Calendar,
      color: "text-blue-600",
      text: `Evento: ${e.titulo}`,
      date_event: e.fecha
    });
  });

  recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));

  const quickActions = [
    { 
      title: "Confirmar Convocatorias", 
      icon: "🏆", 
      url: createPageUrl("ParentCallups"),
      badge: pendingCallups,
      color: "from-orange-600 to-orange-700"
    },
    { 
      title: "Ver Pagos", 
      icon: "💰", 
      url: createPageUrl("ParentPayments"),
      badge: pendingPayments,
      color: "from-green-600 to-green-700"
    },
    { 
      title: "Chat Equipo", 
      icon: "💬", 
      url: createPageUrl("ParentChat"),
      badge: unreadMessages,
      color: "from-blue-600 to-blue-700"
    },
    { 
      title: "Calendario", 
      icon: "📅", 
      url: createPageUrl("Calendar"),
      badge: 0,
      color: "from-purple-600 to-purple-700"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">👋 Bienvenido, {user?.full_name}</h1>
        <p className="text-slate-600 mt-1">Resumen de la actividad de tus jugadores</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, idx) => (
          <Link key={idx} to={action.url}>
            <Card className="border-2 border-transparent hover:border-orange-500 transition-all hover:shadow-lg cursor-pointer group h-full">
              <CardContent className="p-4 text-center space-y-2">
                <div className="text-4xl group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">
                  {action.title}
                </p>
                {action.badge > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {action.badge}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Convocatorias</p>
                <p className="text-3xl font-bold text-orange-900">{pendingCallups}</p>
                <p className="text-xs text-orange-600">Pendientes</p>
              </div>
              <Bell className="w-12 h-12 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Pagos</p>
                <p className="text-3xl font-bold text-green-900">{paidPayments}</p>
                <p className="text-xs text-green-600">Completados</p>
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
                <p className="text-xs text-blue-600">No leídos</p>
              </div>
              <MessageCircle className="w-12 h-12 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Jugadores</p>
                <p className="text-3xl font-bold text-purple-900">{myPlayers.length}</p>
                <p className="text-xs text-purple-600">Registrados</p>
              </div>
              <Users className="w-12 h-12 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Players Progress */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">👥 Progreso de Jugadores</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {myPlayers.map(player => {
            const attStats = getAttendanceStats(player.id);
            const evalTrend = getEvaluationTrend(player.id);
            const latestEval = myEvaluations.find(e => e.jugador_id === player.id);

            return (
              <Card key={player.id} className="border-none shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {player.foto_url ? (
                        <img src={player.foto_url} alt={player.nombre} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                          {player.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{player.nombre}</CardTitle>
                        <p className="text-sm text-slate-600">{player.deporte}</p>
                      </div>
                    </div>
                    <Link to={createPageUrl("ParentPlayers")}>
                      <Button variant="ghost" size="sm">Ver detalles</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Attendance */}
                  {attStats.total > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-slate-700">Asistencia</p>
                        <p className="text-sm font-bold text-green-600">{attStats.percentage}%</p>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                          style={{ width: `${attStats.percentage}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-green-600">✓ {attStats.presente}</span>
                        <span className="text-red-600">✗ {attStats.ausente}</span>
                        <span className="text-blue-600">◆ {attStats.justificado}</span>
                      </div>
                    </div>
                  )}

                  {/* Evaluations Trend */}
                  {evalTrend.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-2">Evolución</p>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={evalTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="fecha" style={{ fontSize: '10px' }} />
                          <YAxis domain={[0, 5]} style={{ fontSize: '10px' }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="promedio" stroke="#f97316" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Latest Evaluation */}
                  {latestEval && (
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-orange-900">Última Evaluación</p>
                        <Badge className="bg-orange-600 text-white">
                          {((latestEval.tecnica + latestEval.tactica + latestEval.fisica + latestEval.actitud + latestEval.trabajo_equipo) / 5).toFixed(1)}/5
                        </Badge>
                      </div>
                      <p className="text-xs text-orange-700">
                        {format(new Date(latestEval.fecha_evaluacion), "dd 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-none shadow-xl">
        <CardHeader>
          <CardTitle>⏱️ Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.slice(0, 8).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <activity.icon className={`w-5 h-5 ${activity.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{activity.text}</p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(activity.date), "dd MMM, HH:mm", { locale: es })}
                  </p>
                </div>
                {activity.status && (
                  <Badge variant="outline" className="text-xs">
                    {activity.status}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}