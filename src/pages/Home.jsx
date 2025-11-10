import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, ShoppingBag, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: players, isLoading: loadingPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    initialData: [],
  });

  const activePlayers = players.filter(p => p.activo).length;
  const pendingPayments = payments.filter(p => p.estado === "Pendiente" || p.estado === "Atrasado").length;
  const totalRevenue = payments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const activeProducts = products.filter(p => p.activo).length;

  const stats = [
    {
      title: "Jugadores Activos",
      value: activePlayers,
      icon: Users,
      color: "orange",
      link: createPageUrl("Players"),
      linkText: "Ver jugadores"
    },
    {
      title: "Pagos Pendientes",
      value: pendingPayments,
      icon: AlertCircle,
      color: "red",
      link: createPageUrl("Payments"),
      linkText: "Gestionar pagos"
    },
    {
      title: "Ingresos del Mes",
      value: `${totalRevenue}€`,
      icon: TrendingUp,
      color: "slate",
      link: createPageUrl("Payments"),
      linkText: "Ver detalles"
    },
    {
      title: "Productos Disponibles",
      value: activeProducts,
      icon: ShoppingBag,
      color: "amber",
      link: createPageUrl("Store"),
      linkText: "Ver tienda"
    }
  ];

  const recentPayments = payments
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Bienvenido al Club
        </h1>
        <p className="text-slate-600 text-lg">
          Gestión integral del CF Bustarviejo
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const colorClasses = {
            orange: "bg-orange-500 text-orange-500",
            red: "bg-red-500 text-red-500",
            slate: "bg-slate-800 text-slate-800",
            amber: "bg-amber-500 text-amber-500"
          };

          return (
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
                {loadingPlayers || loadingPayments || loadingProducts ? (
                  <Skeleton className="h-10 w-20" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-slate-900 mb-3">
                      {stat.value}
                    </div>
                    <Link to={stat.link}>
                      <Button variant="ghost" size="sm" className="text-xs hover:bg-slate-100">
                        {stat.linkText} →
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="w-5 h-5 text-orange-600" />
              Últimos Pagos Registrados
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingPayments ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recentPayments.length === 0 ? (
              <p className="text-center text-slate-500 py-8">
                No hay pagos registrados aún
              </p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {payment.estado === "Pagado" ? (
                        <CheckCircle2 className="w-5 h-5 text-orange-500" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-slate-900">
                          {payment.jugador_nombre}
                        </p>
                        <p className="text-sm text-slate-500">
                          {payment.mes} {payment.año}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {payment.cantidad}€
                      </p>
                      <p className={`text-xs ${
                        payment.estado === "Pagado" 
                          ? "text-orange-600" 
                          : payment.estado === "Atrasado"
                          ? "text-red-600"
                          : "text-amber-600"
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

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Accesos Rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={createPageUrl("Players")}>
              <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 font-medium shadow-md py-6 text-base">
                <Users className="w-5 h-5 mr-2" />
                Registrar Nuevo Jugador
              </Button>
            </Link>
            <Link to={createPageUrl("Payments")}>
              <Button className="w-full bg-white/90 text-orange-700 hover:bg-white font-medium shadow-md py-6 text-base">
                <CreditCard className="w-5 h-5 mr-2" />
                Registrar Pago
              </Button>
            </Link>
            <Link to={createPageUrl("Store")}>
              <Button className="w-full bg-white/80 text-orange-700 hover:bg-white/90 font-medium shadow-md py-6 text-base">
                <ShoppingBag className="w-5 h-5 mr-2" />
                Gestionar Tienda
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}