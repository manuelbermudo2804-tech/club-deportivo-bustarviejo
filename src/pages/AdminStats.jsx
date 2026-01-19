import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Users, CreditCard, Trophy, Activity } from "lucide-react";

export default function AdminStats() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: isAdmin,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
    enabled: isAdmin,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: matchResults } = useQuery({
    queryKey: ['matchResults'],
    queryFn: () => base44.entities.MatchResult.list('-fecha_partido'),
    initialData: [],
    enabled: isAdmin,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { data: medicalRecords } = useQuery({
    queryKey: ['medicalRecords'],
    queryFn: () => base44.entities.MedicalRecord.list(),
    initialData: [],
    enabled: isAdmin,
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="text-slate-600 mt-2">Solo administradores pueden ver esta página</p>
      </div>
    );
  }

  // Estadísticas de jugadores por categoría
  const playersByCategory = players.reduce((acc, player) => {
    const cat = player.deporte || "Sin categoría";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const playersData = Object.keys(playersByCategory).map(cat => ({
    name: cat.replace("Fútbol ", "").replace(" (Mixto)", ""),
    value: playersByCategory[cat]
  }));

  // Estadísticas de pagos
  const paymentsStats = {
    total: payments.reduce((sum, p) => sum + (p.cantidad || 0), 0),
    pagados: payments.filter(p => p.estado === "Pagado").length,
    pendientes: payments.filter(p => p.estado === "Pendiente").length,
    revision: payments.filter(p => p.estado === "En revisión").length,
  };

  const paymentsByMonth = payments.reduce((acc, payment) => {
    const month = payment.mes || "Otro";
    acc[month] = (acc[month] || 0) + (payment.cantidad || 0);
    return acc;
  }, {});

  const paymentsChartData = Object.keys(paymentsByMonth).map(month => ({
    mes: month,
    cantidad: paymentsByMonth[month]
  }));

  // Estadísticas de partidos
  const matchStats = {
    victorias: matchResults.filter(m => m.resultado === "Victoria").length,
    empates: matchResults.filter(m => m.resultado === "Empate").length,
    derrotas: matchResults.filter(m => m.resultado === "Derrota").length,
  };

  const matchStatsData = [
    { name: "Victorias", value: matchStats.victorias, color: "#10b981" },
    { name: "Empates", value: matchStats.empates, color: "#f59e0b" },
    { name: "Derrotas", value: matchStats.derrotas, color: "#ef4444" },
  ];

  // Estadísticas médicas
  const medicalStats = {
    activos: medicalRecords.filter(m => m.estado === "Activo").length,
    seguimiento: medicalRecords.filter(m => m.estado === "En Seguimiento").length,
    recuperados: medicalRecords.filter(m => m.estado === "Recuperado").length,
  };

  const COLORS = ['#ea580c', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-8 h-8 text-orange-600" />
          Estadísticas y Reportes
        </h1>
        <p className="text-slate-600 mt-1">Análisis completo del club</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Jugadores</p>
                <p className="text-3xl font-bold text-slate-900">{players.length}</p>
              </div>
              <Users className="w-12 h-12 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pagos Totales</p>
                <p className="text-3xl font-bold text-green-600">{paymentsStats.total.toFixed(0)}€</p>
              </div>
              <CreditCard className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Partidos Jugados</p>
                <p className="text-3xl font-bold text-blue-600">{matchResults.length}</p>
              </div>
              <Trophy className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Casos Médicos Activos</p>
                <p className="text-3xl font-bold text-red-600">{medicalStats.activos}</p>
              </div>
              <Activity className="w-12 h-12 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="players" className="space-y-4">
        <TabsList className="bg-white">
          <TabsTrigger value="players">Jugadores</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="matches">Resultados</TabsTrigger>
          <TabsTrigger value="medical">Médico</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Jugadores por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={playersData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {playersData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-green-700 mb-1">Pagos Completados</p>
                <p className="text-3xl font-bold text-green-700">{paymentsStats.pagados}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-orange-700 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-orange-700">{paymentsStats.pendientes}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-blue-700 mb-1">En Revisión</p>
                <p className="text-3xl font-bold text-blue-700">{paymentsStats.revision}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ingresos por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={paymentsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cantidad" fill="#ea580c" name="Cantidad (€)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resultados de Partidos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={matchStatsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {matchStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Últimos Resultados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {matchResults.slice(0, 5).map((match) => (
                  <div key={match.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">{match.titulo_partido}</p>
                      <p className="text-xs text-slate-600">{new Date(match.fecha_partido).toLocaleDateString('es-ES')}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        match.resultado === "Victoria" ? "text-green-600" :
                        match.resultado === "Empate" ? "text-orange-600" : "text-red-600"
                      }`}>
                        {match.goles_favor} - {match.goles_contra}
                      </p>
                      <p className="text-xs text-slate-600">{match.resultado}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-red-700 mb-1">Casos Activos</p>
                <p className="text-3xl font-bold text-red-700">{medicalStats.activos}</p>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-orange-700 mb-1">En Seguimiento</p>
                <p className="text-3xl font-bold text-orange-700">{medicalStats.seguimiento}</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-green-700 mb-1">Recuperados</p>
                <p className="text-3xl font-bold text-green-700">{medicalStats.recuperados}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Casos Médicos Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {medicalRecords.filter(m => m.estado !== "Recuperado").slice(0, 5).map((record) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{record.jugador_nombre}</p>
                    <p className="text-xs text-slate-600">{record.tipo_registro} - {record.gravedad}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    record.estado === "Activo" ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {record.estado}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}