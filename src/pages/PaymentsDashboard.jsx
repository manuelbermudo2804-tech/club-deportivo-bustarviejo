import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Users, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const COLORS = {
  pagado: '#16a34a',
  pendiente: '#dc2626',
  revision: '#f59e0b'
};

export default function PaymentsDashboard() {
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

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <p className="text-slate-600">Solo administradores pueden acceder a este dashboard</p>
        </div>
      </div>
    );
  }

  // Calculate stats
  const totalPaid = payments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const totalPending = payments.filter(p => p.estado === "Pendiente").reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const totalInReview = payments.filter(p => p.estado === "En revisión").reduce((sum, p) => sum + (p.cantidad || 0), 0);
  const totalExpected = totalPaid + totalPending + totalInReview;

  const paymentRate = totalExpected > 0 ? ((totalPaid / totalExpected) * 100).toFixed(1) : 0;

  // Payment status distribution
  const statusData = [
    { name: 'Pagado', value: payments.filter(p => p.estado === "Pagado").length, color: COLORS.pagado },
    { name: 'Pendiente', value: payments.filter(p => p.estado === "Pendiente").length, color: COLORS.pendiente },
    { name: 'En Revisión', value: payments.filter(p => p.estado === "En revisión").length, color: COLORS.revision }
  ];

  // Payment by month
  const monthlyData = [
    {
      mes: 'Junio',
      pagado: payments.filter(p => p.mes === "Junio" && p.estado === "Pagado").reduce((sum, p) => sum + p.cantidad, 0),
      pendiente: payments.filter(p => p.mes === "Junio" && p.estado === "Pendiente").reduce((sum, p) => sum + p.cantidad, 0),
      revision: payments.filter(p => p.mes === "Junio" && p.estado === "En revisión").reduce((sum, p) => sum + p.cantidad, 0)
    },
    {
      mes: 'Septiembre',
      pagado: payments.filter(p => p.mes === "Septiembre" && p.estado === "Pagado").reduce((sum, p) => sum + p.cantidad, 0),
      pendiente: payments.filter(p => p.mes === "Septiembre" && p.estado === "Pendiente").reduce((sum, p) => sum + p.cantidad, 0),
      revision: payments.filter(p => p.mes === "Septiembre" && p.estado === "En revisión").reduce((sum, p) => sum + p.cantidad, 0)
    },
    {
      mes: 'Diciembre',
      pagado: payments.filter(p => p.mes === "Diciembre" && p.estado === "Pagado").reduce((sum, p) => sum + p.cantidad, 0),
      pendiente: payments.filter(p => p.mes === "Diciembre" && p.estado === "Pendiente").reduce((sum, p) => sum + p.cantidad, 0),
      revision: payments.filter(p => p.mes === "Diciembre" && p.estado === "En revisión").reduce((sum, p) => sum + p.cantidad, 0)
    }
  ];

  // Payment by method
  const methodData = [
    { name: 'Transferencia', value: payments.filter(p => p.metodo_pago === "Transferencia").length },
    { name: 'Efectivo', value: payments.filter(p => p.metodo_pago === "Efectivo").length }
  ];

  // Payment completion rate over time
  const completionTrend = monthlyData.map(month => ({
    mes: month.mes,
    tasa: month.pagado + month.pendiente + month.revision > 0 
      ? ((month.pagado / (month.pagado + month.pendiente + month.revision)) * 100).toFixed(1)
      : 0
  }));

  // Top payers by category
  const categoryStats = {};
  payments.forEach(p => {
    const player = players.find(pl => pl.id === p.jugador_id);
    if (player?.deporte) {
      if (!categoryStats[player.deporte]) {
        categoryStats[player.deporte] = { paid: 0, pending: 0, total: 0 };
      }
      if (p.estado === "Pagado") categoryStats[player.deporte].paid += p.cantidad;
      if (p.estado === "Pendiente") categoryStats[player.deporte].pending += p.cantidad;
      categoryStats[player.deporte].total += p.cantidad;
    }
  });

  const categoryData = Object.entries(categoryStats).map(([category, stats]) => ({
    categoria: category.split(' ').slice(1).join(' '),
    cobrado: stats.paid,
    pendiente: stats.pending,
    total: stats.total
  }));

  return (
    <div className="min-h-screen overflow-y-auto p-6 lg:p-8 space-y-6 pb-28">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">📊 Dashboard de Pagos</h1>
        <p className="text-slate-600 mt-1">Análisis completo de la situación financiera del club</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-green-900">Total Cobrado</CardTitle>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{totalPaid.toFixed(2)}€</div>
            <p className="text-xs text-green-600 mt-1">{payments.filter(p => p.estado === "Pagado").length} pagos confirmados</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-red-900">Pendiente</CardTitle>
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{totalPending.toFixed(2)}€</div>
            <p className="text-xs text-red-600 mt-1">{payments.filter(p => p.estado === "Pendiente").length} pagos sin realizar</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-900">En Revisión</CardTitle>
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">{totalInReview.toFixed(2)}€</div>
            <p className="text-xs text-orange-600 mt-1">{payments.filter(p => p.estado === "En revisión").length} pendientes de verificar</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">Tasa de Cobro</CardTitle>
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{paymentRate}%</div>
            <p className="text-xs text-blue-600 mt-1">de {totalExpected.toFixed(2)}€ esperados</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="overview">General</TabsTrigger>
          <TabsTrigger value="monthly">Por Mes</TabsTrigger>
          <TabsTrigger value="categories">Por Categoría</TabsTrigger>
          <TabsTrigger value="methods">Métodos de Pago</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Estado de Pagos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion Trend */}
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Tasa de Cobro por Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={completionTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line type="monotone" dataKey="tasa" stroke="#16a34a" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Ingresos por Mes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pagado" stackId="a" fill={COLORS.pagado} name="Pagado" />
                  <Bar dataKey="revision" stackId="a" fill={COLORS.revision} name="En Revisión" />
                  <Bar dataKey="pendiente" stackId="a" fill={COLORS.pendiente} name="Pendiente" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {monthlyData.map((month) => (
              <Card key={month.mes} className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">{month.mes}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Cobrado:</span>
                    <Badge className="bg-green-500 text-white">{month.pagado.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">En Revisión:</span>
                    <Badge className="bg-orange-500 text-white">{month.revision.toFixed(2)}€</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Pendiente:</span>
                    <Badge className="bg-red-500 text-white">{month.pendiente.toFixed(2)}€</Badge>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-900">Total:</span>
                      <span className="text-lg font-bold">{(month.pagado + month.revision + month.pendiente).toFixed(2)}€</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Ingresos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cobrado" fill={COLORS.pagado} name="Cobrado" />
                  <Bar dataKey="pendiente" fill={COLORS.pendiente} name="Pendiente" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Métodos de Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={methodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#16a34a" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Desglose por Método</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {methodData.map((method) => (
                  <div key={method.name} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-slate-900">{method.name}</span>
                      <Badge>{method.value} pagos</Badge>
                    </div>
                    <div className="text-sm text-slate-600">
                      {method.name === "Transferencia" ? "💳 Pago bancario con justificante" : "💵 Pago presencial en el club"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}