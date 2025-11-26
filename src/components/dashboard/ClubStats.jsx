import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Users, DollarSign, Award, Calendar } from "lucide-react";

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#eab308'];

export default function ClubStats({ players = [], payments = [], attendances = [], evaluations = [] }) {
  
  // Calcular crecimiento de jugadores por mes
  const playerGrowth = useMemo(() => {
    const monthCounts = {};
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      monthCounts[monthKey] = 0;
    }

    players.forEach(player => {
      if (player.created_date) {
        const playerDate = new Date(player.created_date);
        const monthKey = playerDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        if (monthCounts[monthKey] !== undefined) {
          monthCounts[monthKey]++;
        }
      }
    });

    // Acumular para mostrar crecimiento
    let accumulated = 0;
    return Object.entries(monthCounts).map(([month, count]) => {
      accumulated += count;
      return { month, total: accumulated, nuevos: count };
    });
  }, [players]);

  // Ingresos por mes
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const months = [];
    
    // Crear array ordenado de los últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        date,
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        ingresos: 0
      });
    }

    // Sumar ingresos de pagos confirmados
    payments.forEach(payment => {
      if (payment.estado === "Pagado") {
        // Intentar obtener fecha del pago (fecha_pago o created_date)
        const dateStr = payment.fecha_pago || payment.created_date;
        if (!dateStr) return;
        
        const paymentDate = new Date(dateStr);
        if (isNaN(paymentDate.getTime())) return;
        
        const paymentKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        
        const monthData = months.find(m => m.key === paymentKey);
        if (monthData) {
          monthData.ingresos += Number(payment.cantidad) || 0;
        }
      }
    });

    return months.map(m => ({
      month: m.label,
      ingresos: Math.round(m.ingresos)
    }));
  }, [payments]);

  // Distribución por categorías
  const categoryDistribution = useMemo(() => {
    const categories = {};
    players.filter(p => p.activo).forEach(player => {
      const cat = player.deporte || "Sin categoría";
      categories[cat] = (categories[cat] || 0) + 1;
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [players]);

  // Estado de pagos
  const paymentStatus = useMemo(() => {
    const status = {
      "Pagado": 0,
      "Pendiente": 0,
      "En revisión": 0,
      "Anulado": 0
    };

    payments.forEach(payment => {
      const estado = payment.estado || "Pendiente";
      if (status[estado] !== undefined) {
        status[estado]++;
      } else {
        status["Pendiente"]++;
      }
    });

    // Filtrar estados con valor 0 para mejor visualización, excepto los principales
    return Object.entries(status)
      .filter(([name, value]) => value > 0 || name === "Pagado" || name === "Pendiente")
      .map(([name, value]) => ({ name, value }));
  }, [payments]);

  // Estadísticas rápidas
  const stats = useMemo(() => {
    const totalPlayers = players.filter(p => p.activo).length;
    const lastMonthPlayers = players.filter(p => {
      const created = new Date(p.created_date);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return created >= monthAgo && p.activo;
    }).length;

    const totalRevenue = payments
      .filter(p => p.estado === "Pagado")
      .reduce((sum, p) => sum + (p.cantidad || 0), 0);

    const lastMonthRevenue = payments
      .filter(p => {
        if (p.estado !== "Pagado" || !p.fecha_pago) return false;
        const paymentDate = new Date(p.fecha_pago);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return paymentDate >= monthAgo;
      })
      .reduce((sum, p) => sum + (p.cantidad || 0), 0);

    const avgAttendance = attendances.length > 0 
      ? (attendances.reduce((sum, a) => {
          const present = a.asistencias?.filter(ast => ast.estado === "presente").length || 0;
          const total = a.asistencias?.length || 1;
          return sum + (present / total);
        }, 0) / attendances.length * 100) 
      : 0;

    const avgEvaluation = evaluations.length > 0
      ? (evaluations.reduce((sum, e) => 
          sum + ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5), 0
        ) / evaluations.length)
      : 0;

    return {
      totalPlayers,
      lastMonthPlayers,
      totalRevenue,
      lastMonthRevenue,
      avgAttendance,
      avgEvaluation
    };
  }, [players, payments, attendances, evaluations]);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Jugadores Activos</p>
                <p className="text-3xl font-bold text-orange-900">{stats.totalPlayers}</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.lastMonthPlayers > 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-600 font-semibold">+{stats.lastMonthPlayers} este mes</span>
                    </>
                  ) : (
                    <span className="text-xs text-orange-600">Sin cambios</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
                <p className="text-3xl font-bold text-green-900">{Math.round(stats.totalRevenue)}€</p>
                <div className="flex items-center gap-1 mt-1">
                  {stats.lastMonthRevenue > 0 ? (
                    <span className="text-xs text-green-600 font-semibold">+{Math.round(stats.lastMonthRevenue)}€ este mes</span>
                  ) : (
                    <span className="text-xs text-green-600">--</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Asistencia Media</p>
                <p className="text-3xl font-bold text-blue-900">{stats.avgAttendance.toFixed(1)}%</p>
                <p className="text-xs text-blue-600 mt-1">En entrenamientos</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Evaluación Media</p>
                <p className="text-3xl font-bold text-purple-900">{stats.avgEvaluation.toFixed(1)}</p>
                <p className="text-xs text-purple-600 mt-1">de 5.0</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Crecimiento de jugadores */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Crecimiento de Jugadores (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={playerGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  name="Total Acumulado"
                  dot={{ fill: '#f97316', r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="nuevos" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Nuevos"
                  dot={{ fill: '#22c55e', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ingresos por mes */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Ingresos por Mes (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                  formatter={(value) => `${value}€`}
                />
                <Bar dataKey="ingresos" fill="#22c55e" radius={[8, 8, 0, 0]} name="Ingresos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por categorías */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Jugadores por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado de pagos */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Estado de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="value" fill="#a855f7" radius={[0, 8, 8, 0]} name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}