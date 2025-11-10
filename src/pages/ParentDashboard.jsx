
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock, User, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import ContactCard from "../components/ContactCard";

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
        p.email_padre === user?.email || p.email === user?.email
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

  const pendingPayments = payments.filter(p => p.estado === "Pendiente");
  const inReviewPayments = payments.filter(p => p.estado === "En revisión");
  const paidPayments = payments.filter(p => p.estado === "Pagado");
  const totalPaid = paidPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);

  // Contar por deporte
  const futbolPlayers = players.filter(p => p.deporte === "Fútbol");
  const baloncestoPlayers = players.filter(p => p.deporte === "Baloncesto");

  // Próximos vencimientos (pagos pendientes)
  const upcomingPayments = payments
    .filter(p => p.estado === "Pendiente")
    .sort((a, b) => {
      const monthOrder = { "Septiembre": 1, "Noviembre": 2, "Diciembre": 3 };
      return (monthOrder[a.mes] || 0) - (monthOrder[b.mes] || 0);
    })
    .slice(0, 5);

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  const stats = [
    {
      title: "Mis Jugadores",
      value: players.length,
      icon: User,
      color: "orange"
    },
    {
      title: "Pagos Pendientes",
      value: pendingPayments.length,
      icon: Clock,
      color: "red"
    },
    {
      title: "En Revisión",
      value: inReviewPayments.length,
      icon: AlertTriangle,
      color: "amber"
    },
    {
      title: "Total Pagado",
      value: `${totalPaid}€`,
      icon: CheckCircle2,
      color: "green"
    }
  ];

  const colorClasses = {
    orange: "bg-orange-500 text-orange-500",
    red: "bg-red-500 text-red-500",
    amber: "bg-amber-500 text-amber-500",
    green: "bg-green-500 text-green-500"
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Bienvenido al Panel de Padres
        </h1>
        <p className="text-slate-600 text-lg">
          Gestión de tus jugadores y pagos
        </p>
      </div>

      {/* Mensaje de Bienvenida Temporada */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-900 rounded-full blur-3xl opacity-20"></div>
        <CardContent className="relative z-10 py-8 px-6">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">¡Bienvenidos al Club Deportivo Bustarviejo!</h2>
            <p className="text-xl text-orange-50">
              Comienza la temporada 2025/26, llena de ilusión, deporte y compañerismo.
            </p>
            <p className="text-lg text-orange-100">
              Gracias por formar parte de nuestra familia deportiva. 💪⚽🏀
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-xl ${colorClasses[stat.color].split(' ')[0]} bg-opacity-10`}>
                  <stat.icon className={`w-5 h-5 ${colorClasses[stat.color].split(' ')[1]}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingPlayers || loadingPayments ? (
                <Skeleton className="h-10 w-20" />
              ) : (
                <div className="text-3xl font-bold text-slate-900">
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Mis Jugadores por Deporte */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Fútbol */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="border-b border-green-100">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">⚽</span>
                Fútbol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingPlayers ? (
                <Skeleton className="h-20 w-full" />
              ) : futbolPlayers.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  No hay jugadores de fútbol
                </p>
              ) : (
                <div className="space-y-3">
                  {futbolPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="p-3 rounded-lg bg-white border border-green-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        {player.foto_url ? (
                          <img
                            src={player.foto_url}
                            alt={player.nombre}
                            className="w-12 h-12 rounded-full object-cover border-2 border-green-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-green-700" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-900">{player.nombre}</h3>
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            {player.categoria}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Baloncesto */}
          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="border-b border-orange-100">
              <CardTitle className="flex items-center gap-2 text-xl">
                <span className="text-3xl">🏀</span>
                Baloncesto
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingPlayers ? (
                <Skeleton className="h-20 w-full" />
              ) : baloncestoPlayers.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  No hay jugadores de baloncesto
                </p>
              ) : (
                <div className="space-y-3">
                  {baloncestoPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="p-3 rounded-lg bg-white border border-orange-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-3">
                        {player.foto_url ? (
                          <img
                            src={player.foto_url}
                            alt={player.nombre}
                            className="w-12 h-12 rounded-full object-cover border-2 border-orange-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-orange-700" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-900">{player.nombre}</h3>
                          <Badge className="bg-orange-100 text-orange-700 text-xs">
                            {player.categoria}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <ContactCard />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Próximos Vencimientos */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="w-5 h-5 text-red-600" />
              Próximos Vencimientos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingPayments ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : upcomingPayments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No hay pagos pendientes 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-red-50 border border-red-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔴</span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {payment.jugador_nombre}
                        </p>
                        <p className="text-sm text-slate-600">
                          Vencimiento: {payment.mes} 30
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700 text-lg">
                        {payment.cantidad}€
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historial de Pagos Recientes */}
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="w-5 h-5 text-orange-600" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingPayments ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No hay pagos registrados
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {payments.slice(0, 10).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {statusEmojis[payment.estado] || "🔴"}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {payment.jugador_nombre}
                        </p>
                        <p className="text-sm text-slate-500">
                          {payment.mes} {payment.temporada}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {payment.cantidad}€
                      </p>
                      <p className={`text-xs ${
                        payment.estado === "Pagado" 
                          ? "text-green-600" 
                          : payment.estado === "En revisión"
                          ? "text-orange-600"
                          : "text-red-600"
                      }`}>
                        {payment.estado}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Accesos Rápidos */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link to={createPageUrl("ParentPlayers")}>
            <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 font-medium shadow-md py-6 text-base">
              <Users className="w-5 h-5 mr-2" />
              Gestionar Mis Jugadores
            </Button>
          </Link>
          <Link to={createPageUrl("ParentPayments")}>
            <Button className="w-full bg-white/90 text-orange-700 hover:bg-white font-medium shadow-md py-6 text-base">
              <CreditCard className="w-5 h-5 mr-2" />
              Ver Mis Pagos
            </Button>
          </Link>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mt-4">
            <h3 className="font-bold text-lg mb-2">💡 Recordatorio</h3>
            <p className="text-white/90 text-sm">
              No olvides subir los justificantes de pago para que sean verificados por el administrador
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
