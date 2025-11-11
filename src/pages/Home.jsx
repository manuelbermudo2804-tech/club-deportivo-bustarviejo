import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, ShoppingBag, TrendingUp, AlertCircle, Heart, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import SocialLinks from "../components/SocialLinks";
import MatchAppLink from "../components/MatchAppLink";

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

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴",
    "Atrasado": "🔴"
  };

  const colorClasses = {
    orange: "bg-orange-500 text-orange-500",
    red: "bg-red-500 text-red-500",
    slate: "bg-slate-800 text-slate-800",
    amber: "bg-amber-500 text-amber-500"
  };

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

      {/* MatchApp Card */}
      <Card className="border-none shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
        <CardContent className="relative z-10 py-6 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Horarios y Resultados</h3>
                <p className="text-slate-300 text-sm">
                  📱 Descarga MatchApp • Ver partidos en directo
                </p>
              </div>
            </div>
            <MatchAppLink className="w-full md:w-auto py-6 px-8 text-lg" />
          </div>
        </CardContent>
      </Card>

      {/* Redes Sociales */}
      <SocialLinks />

      {/* Historia del Club */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-600 rounded-full blur-3xl opacity-10"></div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <Heart className="w-8 h-8 text-orange-500" />
            Nuestra Historia
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-4">
          <p className="text-lg leading-relaxed text-slate-100">
            El <span className="font-semibold text-orange-400">Club Deportivo Bustarviejo</span> nació en <span className="font-semibold text-orange-400">1989</span> con una idea clara: colaborar en el aprendizaje de cada uno de sus miembros a partir de la práctica deportiva en el entorno de nuestro municipio, el pequeño pueblo de la Sierra de Madrid, Bustarviejo.
          </p>
          <p className="text-lg leading-relaxed text-slate-100">
            A día de hoy el club sigue en la misma línea que hace 31 años, la de lograr que el fútbol, el baloncesto, el paddle, o el deporte que sea, resulte ser una actividad integradora, un deporte que eduque a los más pequeños, ayudados por el ejemplo que los más mayores les ofrecen, haciendo que cada final de temporada, madres, padres y resto de miembros se puedan sentir orgullosas de cada participante en las diferentes disciplinas.
          </p>
          <p className="text-lg leading-relaxed text-slate-100">
            <span className="font-semibold text-orange-400">Nuestro auténtico objetivo</span> es el formar personas que, el día de mañana, entenderán el deporte como un mundo repleto de valores. Por esto y más, os animamos a que subáis a conocernos, probéis en las categorías del club, os animéis a participar en las actividades ofrecidas y, sobre todo, os animéis a echar una mano, pues <span className="font-semibold text-orange-400">un club sin familias, no es un club</span>.
          </p>
          <div className="pt-4 border-t border-slate-700">
            <p className="text-lg leading-relaxed text-slate-200 italic">
              Ya solo queda que, desde aquí, y en nombre de toda la Junta Directiva, os agradezcamos cada granito de arena que aportáis al Club, ya que esto, sin ti, no sería lo mismo.
            </p>
            <p className="text-xl font-bold text-orange-400 mt-4">
              Un fuerte abrazo. 💛🖤
            </p>
          </div>
        </CardContent>
      </Card>

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
        ))}
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
                      <span className="text-2xl">
                        {statusEmojis[payment.estado] || "🔴"}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">
                          {payment.jugador_nombre}
                        </p>
                        <p className="text-sm text-slate-500">
                          {payment.mes} {payment.temporada || payment.año}
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