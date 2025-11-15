import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, Users, CheckCircle2, XCircle, CreditCard, Star, Calendar, Target } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

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

  // Filter by category
  const filteredPlayers = selectedCategory === "all" 
    ? players 
    : players.filter(p => p.deporte === selectedCategory);

  const categories = [...new Set(players.map(p => p.deporte))];

  // Players stats
  const activePlayers = filteredPlayers.filter(p => p.activo).length;
  const inactivePlayers = filteredPlayers.filter(p => !p.activo).length;

  // Payment stats by category
  const paymentsByCategory = {};
  payments.forEach(p => {
    const player = players.find(pl => pl.id === p.jugador_id);
    if (player && (selectedCategory === "all" || player.deporte === selectedCategory)) {
      const cat = player.deporte;
      if (!paymentsByCategory[cat]) {
        paymentsByCategory[cat] = { Pagado: 0, Pendiente: 0, EnRevision: 0, total: 0 };
      }
      paymentsByCategory[cat].total++;
      if (p.estado === "Pagado") paymentsByCategory[cat].Pagado++;
      else if (p.estado === "Pendiente") paymentsByCategory[cat].Pendiente++;
      else paymentsByCategory[cat].EnRevision++;
    }
  });

  const paymentCategoryData = Object.keys(paymentsByCategory).map(cat => ({
    categoria: cat.replace("Fútbol ", "").replace(" (Mixto)", ""),
    Pagado: paymentsByCategory[cat].Pagado,
    Pendiente: paymentsByCategory[cat].Pendiente,
    "En Revisión": paymentsByCategory[cat].EnRevision
  }));

  // Attendance stats by category
  const attendanceByCategory = {};
  attendances.forEach(att => {
    if (selectedCategory === "all" || att.categoria === selectedCategory) {
      const cat = att.categoria;
      if (!attendanceByCategory[cat]) {
        attendanceByCategory[cat] = { presente: 0, ausente: 0, total: 0 };
      }
      att.asistencias.forEach(a => {
        attendanceByCategory[cat].total++;
        if (a.estado === "presente") attendanceByCategory[cat].presente++;
        else if (a.estado === "ausente") attendanceByCategory[cat].ausente++;
      });
    }
  });

  const attendanceCategoryData = Object.keys(attendanceByCategory).map(cat => {
    const stats = attendanceByCategory[cat];
    const percentage = stats.total > 0 ? ((stats.presente / stats.total) * 100).toFixed(1) : 0;
    return {
      categoria: cat.replace("Fútbol ", "").replace(" (Mixto)", ""),
      Asistencia: parseFloat(percentage),
      Presente: stats.presente,
      Ausente: stats.ausente
    };
  });

  // Evaluation stats
  const evalsByCategory = {};
  evaluations.forEach(e => {
    if (selectedCategory === "all" || e.categoria === selectedCategory) {
      const cat = e.categoria;
      if (!evalsByCategory[cat]) {
        evalsByCategory[cat] = { count: 0, tecnica: 0, tactica: 0, fisica: 0, actitud: 0, equipo: 0 };
      }
      evalsByCategory[cat].count++;
      evalsByCategory[cat].tecnica += e.tecnica;
      evalsByCategory[cat].tactica += e.tactica;
      evalsByCategory[cat].fisica += e.fisica;
      evalsByCategory[cat].actitud += e.actitud;
      evalsByCategory[cat].equipo += e.trabajo_equipo;
    }
  });

  const evalCategoryData = Object.keys(evalsByCategory).map(cat => {
    const stats = evalsByCategory[cat];
    return {
      categoria: cat.replace("Fútbol ", "").replace(" (Mixto)", ""),
      Técnica: (stats.tecnica / stats.count).toFixed(1),
      Táctica: (stats.tactica / stats.count).toFixed(1),
      Física: (stats.fisica / stats.count).toFixed(1),
      Actitud: (stats.actitud / stats.count).toFixed(1),
      Equipo: (stats.equipo / stats.count).toFixed(1)
    };
  });

  // Overall evaluation radar
  const overallEvalStats = evaluations.length > 0 ? {
    tecnica: evaluations.reduce((sum, e) => sum + e.tecnica, 0) / evaluations.length,
    tactica: evaluations.reduce((sum, e) => sum + e.tactica, 0) / evaluations.length,
    fisica: evaluations.reduce((sum, e) => sum + e.fisica, 0) / evaluations.length,
    actitud: evaluations.reduce((sum, e) => sum + e.actitud, 0) / evaluations.length,
    equipo: evaluations.reduce((sum, e) => sum + e.trabajo_equipo, 0) / evaluations.length
  } : null;

  const radarData = overallEvalStats ? [
    { skill: "Técnica", value: parseFloat(overallEvalStats.tecnica.toFixed(1)) },
    { skill: "Táctica", value: parseFloat(overallEvalStats.tactica.toFixed(1)) },
    { skill: "Física", value: parseFloat(overallEvalStats.fisica.toFixed(1)) },
    { skill: "Actitud", value: parseFloat(overallEvalStats.actitud.toFixed(1)) },
    { skill: "Equipo", value: parseFloat(overallEvalStats.equipo.toFixed(1)) }
  ] : [];

  // Monthly trends
  const monthlyData = {};
  const last6Months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().substring(0, 7);
    last6Months.push(key);
    monthlyData[key] = { players: 0, payments: 0, evaluations: 0, attendances: 0 };
  }

  players.forEach(p => {
    if (p.created_date && (selectedCategory === "all" || p.deporte === selectedCategory)) {
      const month = p.created_date.substring(0, 7);
      if (monthlyData[month]) monthlyData[month].players++;
    }
  });

  payments.forEach(p => {
    if (p.created_date) {
      const player = players.find(pl => pl.id === p.jugador_id);
      if (player && (selectedCategory === "all" || player.deporte === selectedCategory)) {
        const month = p.created_date.substring(0, 7);
        if (monthlyData[month] && p.estado === "Pagado") monthlyData[month].payments++;
      }
    }
  });

  evaluations.forEach(e => {
    if (e.created_date && (selectedCategory === "all" || e.categoria === selectedCategory)) {
      const month = e.created_date.substring(0, 7);
      if (monthlyData[month]) monthlyData[month].evaluations++;
    }
  });

  attendances.forEach(a => {
    if (a.created_date && (selectedCategory === "all" || a.categoria === selectedCategory)) {
      const month = a.created_date.substring(0, 7);
      if (monthlyData[month]) monthlyData[month].attendances++;
    }
  });

  const trendData = last6Months.map(month => ({
    mes: month.substring(5),
    Jugadores: monthlyData[month].players,
    Pagos: monthlyData[month].payments,
    Evaluaciones: monthlyData[month].evaluations,
    Asistencias: monthlyData[month].attendances
  }));

  const COLORS = ['#f97316', '#16a34a', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444'];

  const totalPaid = payments.filter(p => p.estado === "Pagado").length;
  const totalPending = payments.filter(p => p.estado === "Pendiente").length;
  const totalInReview = payments.filter(p => p.estado === "En revisión").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">📊 Estadísticas del Club</h1>
        <p className="text-slate-600 mt-1">Análisis y métricas generales</p>
      </div>

      {/* Category Filter */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="all">Todas las Categorías</TabsTrigger>
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat}>
              {cat.replace("Fútbol ", "").replace(" (Mixto)", "")}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Overview Stats */}
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

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Pagos OK</p>
                <p className="text-3xl font-bold text-green-900">{totalPaid}</p>
                <p className="text-xs text-green-600">Completados</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Evaluaciones</p>
                <p className="text-3xl font-bold text-purple-900">{evaluations.length}</p>
                <p className="text-xs text-purple-600">Totales</p>
              </div>
              <Star className="w-12 h-12 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Asistencias</p>
                <p className="text-3xl font-bold text-blue-900">{attendances.length}</p>
                <p className="text-xs text-blue-600">Registradas</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment by Category */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">💰 Pagos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
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

        {/* Attendance by Category */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">✅ Asistencia por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="Asistencia" fill="#16a34a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evaluations Radar */}
        {radarData.length > 0 && (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">⭐ Promedio de Evaluaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis domain={[0, 5]} style={{ fontSize: '10px' }} />
                  <Radar name="Promedio" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trends */}
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">📈 Tendencias Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Jugadores" stroke="#f97316" strokeWidth={2} />
                <Line type="monotone" dataKey="Pagos" stroke="#16a34a" strokeWidth={2} />
                <Line type="monotone" dataKey="Evaluaciones" stroke="#a855f7" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evaluation Details by Category */}
      {evalCategoryData.length > 0 && (
        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">🎯 Evaluaciones Detalladas por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={evalCategoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" style={{ fontSize: '11px' }} angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 5]} style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Técnica" fill="#f97316" />
                <Bar dataKey="Táctica" fill="#16a34a" />
                <Bar dataKey="Física" fill="#3b82f6" />
                <Bar dataKey="Actitud" fill="#a855f7" />
                <Bar dataKey="Equipo" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}