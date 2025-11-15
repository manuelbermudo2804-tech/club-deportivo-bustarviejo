import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Users, TrendingUp, Award, Target, Calendar, CheckCircle2 } from "lucide-react";

export default function ClubStats() {
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
  });

  // Players by category
  const playersByCategory = () => {
    const categoryData = {};
    players.forEach(p => {
      if (p.activo) {
        categoryData[p.deporte] = (categoryData[p.deporte] || 0) + 1;
      }
    });
    
    return Object.keys(categoryData).map(c => ({
      name: c.length > 20 ? c.substring(0, 20) + '...' : c,
      value: categoryData[c],
      fullName: c
    }));
  };

  // Payment status by category
  const paymentsByCategory = () => {
    const categoryData = {};
    players.forEach(player => {
      if (!categoryData[player.deporte]) {
        categoryData[player.deporte] = { pagado: 0, pendiente: 0, revision: 0, total: 0 };
      }
      
      const playerPayments = payments.filter(p => p.jugador_id === player.id);
      playerPayments.forEach(p => {
        categoryData[player.deporte].total++;
        if (p.estado === "Pagado") categoryData[player.deporte].pagado++;
        else if (p.estado === "En revisión") categoryData[player.deporte].revision++;
        else categoryData[player.deporte].pendiente++;
      });
    });
    
    return Object.keys(categoryData).map(c => ({
      categoria: c.length > 15 ? c.substring(0, 15) + '...' : c,
      Pagado: categoryData[c].pagado,
      Pendiente: categoryData[c].pendiente,
      Revisión: categoryData[c].revision
    }));
  };

  // Attendance statistics
  const attendanceStats = () => {
    const categoryData = {};
    attendances.forEach(att => {
      if (!categoryData[att.categoria]) {
        categoryData[att.categoria] = { presente: 0, ausente: 0, justificado: 0 };
      }
      
      att.asistencias.forEach(a => {
        if (a.estado === "presente") categoryData[att.categoria].presente++;
        else if (a.estado === "ausente") categoryData[att.categoria].ausente++;
        else if (a.estado === "justificado") categoryData[att.categoria].justificado++;
      });
    });
    
    return Object.keys(categoryData).map(c => {
      const total = categoryData[c].presente + categoryData[c].ausente + categoryData[c].justificado;
      const percentage = total > 0 ? ((categoryData[c].presente / total) * 100).toFixed(0) : 0;
      return {
        categoria: c.length > 15 ? c.substring(0, 15) + '...' : c,
        Presente: categoryData[c].presente,
        Ausente: categoryData[c].ausente,
        Justificado: categoryData[c].justificado,
        Porcentaje: parseInt(percentage)
      };
    });
  };

  // Evaluation averages by category
  const evaluationAverages = () => {
    const categoryData = {};
    evaluations.forEach(e => {
      if (!categoryData[e.categoria]) {
        categoryData[e.categoria] = { sum: 0, count: 0 };
      }
      const avg = (e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5;
      categoryData[e.categoria].sum += avg;
      categoryData[e.categoria].count++;
    });
    
    return Object.keys(categoryData).map(c => ({
      categoria: c.length > 15 ? c.substring(0, 15) + '...' : c,
      Promedio: (categoryData[c].sum / categoryData[c].count).toFixed(1)
    }));
  };

  // Monthly trends
  const monthlyTrends = () => {
    const monthlyData = {};
    
    players.forEach(p => {
      const month = p.created_date?.substring(0, 7);
      if (month) {
        if (!monthlyData[month]) monthlyData[month] = { jugadores: 0, pagos: 0 };
        monthlyData[month].jugadores++;
      }
    });
    
    payments.forEach(p => {
      const month = p.created_date?.substring(0, 7);
      if (month && p.estado === "Pagado") {
        if (!monthlyData[month]) monthlyData[month] = { jugadores: 0, pagos: 0 };
        monthlyData[month].pagos++;
      }
    });
    
    return Object.keys(monthlyData).slice(-6).map(m => ({
      mes: m.substring(5),
      Jugadores: monthlyData[m].jugadores,
      Pagos: monthlyData[m].pagos
    }));
  };

  const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#ef4444'];

  const totalPlayers = players.filter(p => p.activo).length;
  const totalPayments = payments.length;
  const paidPayments = payments.filter(p => p.estado === "Pagado").length;
  const avgAttendance = attendanceStats().reduce((sum, cat) => sum + cat.Porcentaje, 0) / (attendanceStats().length || 1);
  const avgEvaluation = evaluationAverages().reduce((sum, cat) => sum + parseFloat(cat.Promedio), 0) / (evaluationAverages().length || 1);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">📊 Estadísticas del Club</h1>
        <p className="text-slate-600 mt-1">Análisis completo de datos y rendimiento</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 lg:p-6">
            <Users className="w-6 h-6 lg:w-8 lg:h-8 text-orange-600 mb-2" />
            <div className="text-2xl lg:text-3xl font-bold text-orange-900">{totalPlayers}</div>
            <div className="text-xs lg:text-sm text-orange-700">Jugadores</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 lg:p-6">
            <CheckCircle2 className="w-6 h-6 lg:w-8 lg:h-8 text-green-600 mb-2" />
            <div className="text-2xl lg:text-3xl font-bold text-green-900">{paidPayments}</div>
            <div className="text-xs lg:text-sm text-green-700">Pagos</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 lg:p-6">
            <TrendingUp className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 mb-2" />
            <div className="text-2xl lg:text-3xl font-bold text-blue-900">{avgAttendance.toFixed(0)}%</div>
            <div className="text-xs lg:text-sm text-blue-700">Asistencia</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4 lg:p-6">
            <Award className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600 mb-2" />
            <div className="text-2xl lg:text-3xl font-bold text-purple-900">{avgEvaluation.toFixed(1)}</div>
            <div className="text-xs lg:text-sm text-purple-700">Evaluación</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-4 lg:p-6">
            <Calendar className="w-6 h-6 lg:w-8 lg:h-8 text-indigo-600 mb-2" />
            <div className="text-2xl lg:text-3xl font-bold text-indigo-900">{callups.length}</div>
            <div className="text-xs lg:text-sm text-indigo-700">Convocatorias</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="players">Jugadores</TabsTrigger>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Jugadores por Categoría</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={playersByCategory()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {playersByCategory().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {playersByCategory().map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl">
              <CardHeader>
                <CardTitle className="text-lg">Tendencia Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyTrends()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Jugadores" stroke="#f97316" strokeWidth={2} />
                    <Line type="monotone" dataKey="Pagos" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6 mt-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Estado de Pagos por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={paymentsByCategory()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} style={{ fontSize: '11px' }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Pagado" fill="#16a34a" />
                  <Bar dataKey="Pendiente" fill="#dc2626" />
                  <Bar dataKey="Revisión" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6 mt-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Asistencia por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={attendanceStats()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} style={{ fontSize: '11px' }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Presente" fill="#16a34a" />
                  <Bar dataKey="Ausente" fill="#dc2626" />
                  <Bar dataKey="Justificado" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-6 mt-6">
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Promedio de Evaluaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={evaluationAverages()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} style={{ fontSize: '11px' }} />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="Promedio" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}