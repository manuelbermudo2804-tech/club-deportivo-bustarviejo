import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, CheckCircle2, AlertTriangle, Clock, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
          Bienvenido, {user?.full_name || 'Padre/Tutor'}
        </h1>
        <p className="text-slate-600 text-lg">
          Panel de seguimiento de pagos y jugadores
        </p>
      </div>

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

      {/* Mis Jugadores */}
      <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="w-5 h-5 text-orange-600" />
            Mis Jugadores Inscritos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingPlayers ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : players.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              No tienes jugadores registrados
            </p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-slate-50 border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    {player.foto_url ? (
                      <img
                        src={player.foto_url}
                        alt={player.nombre}
                        className="w-14 h-14 rounded-full object-cover border-2 border-orange-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-orange-200 flex items-center justify-center">
                        <User className="w-7 h-7 text-orange-700" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{player.nombre}</h3>
                      <Badge className="bg-orange-100 text-orange-700 text-xs mt-1">
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

      {/* Instrucciones de Pago */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl">Métodos de Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <h3 className="font-bold text-lg mb-2">💳 Bizum</h3>
            <p className="text-white/90">Envía tu pago al número del club y sube el comprobante</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
            <h3 className="font-bold text-lg mb-2">🏦 Transferencia Bancaria</h3>
            <p className="text-white/90">Realiza la transferencia a nuestra cuenta y adjunta el justificante</p>
          </div>
          <p className="text-sm text-white/80 pt-2">
            ⚠️ Recuerda subir el justificante de pago en la sección de "Mis Pagos" para que el administrador pueda verificarlo
          </p>
        </CardContent>
      </Card>
    </div>
  );
}