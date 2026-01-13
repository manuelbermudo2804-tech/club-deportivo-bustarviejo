import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { AlertCircle, TrendingUp, Users, MessageSquare, Download, AlertTriangle, Clock, FileText, Zap, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ChatAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await base44.functions.invoke('generateChatAnalytics');
        setAnalytics(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Error: {error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#8b5cf6'];

  // Preparar datos para gráficos
  const chatActivityData = [
    { name: 'Coordinador', value: analytics.chatActivity.coordinador },
    { name: 'Entrenador', value: analytics.chatActivity.entrenador },
    { name: 'Staff', value: analytics.chatActivity.staff },
    { name: 'Admin', value: analytics.chatActivity.admin }
  ];

  const hourlyData = Object.entries(analytics.hourlyActivity).map(([hour, count]) => ({
    hora: `${hour}:00`,
    mensajes: count
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">📊 Estadísticas de Chat</h1>
        <p className="text-slate-600">Monitoreo de participación y actividad en últimos 30 días</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Total Mensajes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{analytics.summary.totalMessages}</div>
            <p className="text-xs text-slate-500 mt-2">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{analytics.summary.activeUsers}</div>
            <p className="text-xs text-slate-500 mt-2">Usando chat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{analytics.summary.inactiveUsers}</div>
            <p className="text-xs text-slate-500 mt-2">Sin participación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600">Engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{analytics.engagementRate}</div>
            <p className="text-xs text-slate-500 mt-2">Tasa participación</p>
          </CardContent>
        </Card>
      </div>

      {/* ALERTA CRÍTICA: Entrenadores inactivos */}
      {analytics.inactiveCoaches.length > 0 && (
        <Alert className="border-red-300 bg-red-50">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>⚠️ {analytics.inactiveCoaches.length} entrenador(es) SIN participación en chat:</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {analytics.inactiveCoaches.map(coach => (
                <Badge key={coach.email} className="bg-red-600">
                  {coach.name}
                </Badge>
              ))}
            </div>
            <p className="text-sm mt-3">Acción recomendada: Contactar para reforzar uso de la app</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad por tipo de chat */}
        <Card>
          <CardHeader>
            <CardTitle>Mensajes por Tipo de Chat</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chatActivityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chatActivityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Horarios pico */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad por Hora</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="mensajes" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking entrenadores */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Entrenadores más Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.coachRanking.length > 0 ? (
              analytics.coachRanking.map((coach, idx) => (
                <div key={coach.email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-orange-600">#{idx + 1}</span>
                    <div>
                      <p className="font-medium text-slate-900">{coach.coach || coach.email}</p>
                      <p className="text-xs text-slate-500">{coach.email}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-600">{coach.messages} mensajes</Badge>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-4">Sin datos disponibles</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usuarios inactivos (toda la app) */}
      {analytics.inactiveUsers.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">🚨 Usuarios Completamente Inactivos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {analytics.inactiveUsers.map(user => (
                <div key={user.email} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Badge variant="outline" className="border-red-300 text-red-700">
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-4">
        <Button className="bg-orange-600 hover:bg-orange-700">
          <Download className="w-4 h-4 mr-2" />
          Descargar Reporte
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refrescar Datos
        </Button>
      </div>
    </div>
  );
}