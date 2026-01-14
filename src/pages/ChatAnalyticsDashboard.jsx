import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { AlertCircle, TrendingUp, Users, MessageSquare, Download, AlertTriangle, Clock, FileText, Zap, Eye, Heart, Smile, ArrowUpRight, CheckCircle2, Timer } from 'lucide-react';
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

  // Datos para comparativa semanal
  const weeklyData = (analytics.weeklyTrend || []).map(item => ({
    semana: `Sem ${item.week}`,
    mensajes: item.messageCount,
    usuarios: item.activeUsers
  }));

  // Datos de tiempo de respuesta
  const responseTimeData = (analytics.responseTime || []).map(item => ({
    categoria: item.categoria || 'Coordinador',
    tiempoPromedio: Math.round(item.avgResponseTime || 0)
  }));

  // Actividad por equipo
  const teamActivityData = (analytics.teamActivity || []).map(item => ({
    equipo: item.team || item.categoria,
    mensajes: item.messageCount,
    usuarios: item.userCount
  }));

  // Datos de primera respuesta por rol
  const firstResponseData = analytics.firstResponseByRole ? [
    { rol: 'Coordinador', tiempo: analytics.firstResponseByRole.coordinador },
    { rol: 'Entrenador', tiempo: analytics.firstResponseByRole.entrenador },
    { rol: 'Staff', tiempo: analytics.firstResponseByRole.staff }
  ] : [];

  // Datos de escalados
  const escalationData = analytics.escalationHistory || [];
  const escalationStats = analytics.escalationStats || {};

  // Contenido compartido
  const sharedContentData = [
    { name: 'Archivos', value: analytics.summary.filesShared || 0, color: '#f97316' },
    { name: 'Ubicaciones', value: analytics.summary.locationsShared || 0, color: '#22c55e' },
    { name: 'Encuestas', value: analytics.summary.pollsCreated || 0, color: '#3b82f6' }
  ];

  // Análisis por usuario
  const userActivityData = (analytics.userActivity || []).slice(0, 10).map(item => ({
    usuario: item.name?.split(' ')[0] || 'Unknown',
    mensajes: item.messageCount,
    tiempoRespuesta: item.avgResponseTime || 0
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

      {/* NUEVA SECCIÓN: Tiempo de Primera Respuesta */}
      {firstResponseData.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <Timer className="w-5 h-5" /> ⏱️ Tiempo de Primera Respuesta por Rol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={firstResponseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rol" />
                <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value} min`} />
                <Bar dataKey="tiempo" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {firstResponseData.map(item => (
                <div key={item.rol} className="bg-white rounded-lg p-3 text-center border border-blue-200">
                  <p className="text-xs text-slate-600 mb-1">{item.rol}</p>
                  <p className="text-2xl font-bold text-blue-600">{item.tiempo}</p>
                  <p className="text-xs text-slate-500">minutos</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* NUEVA SECCIÓN: Historial de Escalados */}
      {escalationData.length > 0 && (
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5" /> 🔄 Historial de Escalados (últimos 20)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Resumen de escalados */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-lg p-3 text-center border border-orange-200">
                  <p className="text-xs text-slate-600 mb-1">Total</p>
                  <p className="text-2xl font-bold text-orange-600">{escalationStats.total}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-blue-200">
                  <p className="text-xs text-slate-600 mb-1">Entren. → Coord.</p>
                  <p className="text-2xl font-bold text-blue-600">{escalationStats.entrenadorACoordinador}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-purple-200">
                  <p className="text-xs text-slate-600 mb-1">Coord. → Admin</p>
                  <p className="text-2xl font-bold text-purple-600">{escalationStats.coordinadorAAdmin}</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center border border-green-200">
                  <p className="text-xs text-slate-600 mb-1">Resueltos</p>
                  <p className="text-2xl font-bold text-green-600">{escalationStats.resueltos}</p>
                </div>
              </div>

              {/* Tiempo promedio de resolución */}
              {escalationStats.tiempoPromedioResolucion > 0 && (
                <div className="bg-white rounded-lg p-4 mb-4 border border-orange-200">
                  <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    Tiempo Promedio de Resolución
                  </p>
                  <p className="text-3xl font-bold text-orange-600">{escalationStats.tiempoPromedioResolucion} min</p>
                </div>
              )}

              {/* Lista de escalados */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {escalationData.map((escalation, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-orange-200">
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={escalation.tipo.includes('Admin') ? 'bg-purple-600' : 'bg-blue-600'}>
                        {escalation.tipo}
                      </Badge>
                      {escalation.resuelto ? (
                        <Badge className="bg-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Resuelto
                        </Badge>
                      ) : (
                        <Badge className="bg-red-600">Pendiente</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 font-medium mb-1">{escalation.categoria}</p>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-2">{escalation.mensaje_original}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(escalation.fecha_escalado).toLocaleDateString('es-ES')}</span>
                      {escalation.tiempo_resolucion_minutos && (
                        <span className="text-green-600 font-medium">
                          Resuelto en {escalation.tiempo_resolucion_minutos} min
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
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

       {/* Comparativa semanal */}
       {weeklyData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>📈 Evolución Semanal</CardTitle>
           </CardHeader>
           <CardContent>
             <ResponsiveContainer width="100%" height={300}>
               <LineChart data={weeklyData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="semana" />
                 <YAxis />
                 <Tooltip />
                 <Legend />
                 <Line type="monotone" dataKey="mensajes" stroke="#f97316" strokeWidth={2} />
                 <Line type="monotone" dataKey="usuarios" stroke="#22c55e" strokeWidth={2} />
               </LineChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
       )}

       {/* Tiempo de respuesta */}
       {responseTimeData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>⏱️ Tiempo Promedio de Respuesta</CardTitle>
           </CardHeader>
           <CardContent>
             <ResponsiveContainer width="100%" height={300}>
               <BarChart data={responseTimeData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="categoria" />
                 <YAxis label={{ value: 'Minutos', angle: -90, position: 'insideLeft' }} />
                 <Tooltip formatter={(value) => `${value} min`} />
                 <Bar dataKey="tiempoPromedio" fill="#3b82f6" />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
       )}

       {/* Actividad por equipo */}
       {teamActivityData.length > 0 && (
         <Card>
           <CardHeader>
             <CardTitle>🏆 Actividad por Equipo/Categoría</CardTitle>
           </CardHeader>
           <CardContent>
             <ResponsiveContainer width="100%" height={300}>
               <BarChart data={teamActivityData} layout="vertical">
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis type="number" />
                 <YAxis dataKey="equipo" type="category" width={120} />
                 <Tooltip />
                 <Legend />
                 <Bar dataKey="mensajes" fill="#f97316" />
                 <Bar dataKey="usuarios" fill="#22c55e" />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
       )}

       {/* Contenido compartido */}
       {sharedContentData.some(item => item.value > 0) && (
         <Card>
           <CardHeader>
             <CardTitle>📎 Contenido Compartido</CardTitle>
           </CardHeader>
           <CardContent>
             <ResponsiveContainer width="100%" height={300}>
               <BarChart data={sharedContentData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" />
                 <YAxis />
                 <Tooltip />
                 <Bar dataKey="value" fill="#8b5cf6" />
               </BarChart>
             </ResponsiveContainer>
           </CardContent>
         </Card>
       )}
      </div>

      {/* Análisis por usuario */}
      {userActivityData.length > 0 && (
       <Card>
         <CardHeader>
           <CardTitle>👥 Análisis Individual de Usuarios (Top 10)</CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-3">
             {userActivityData.map((user, idx) => (
               <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                 <div className="flex items-center gap-3">
                   <span className="text-sm font-bold text-orange-600">#{idx + 1}</span>
                   <div>
                     <p className="font-medium text-slate-900">{user.usuario}</p>
                     <p className="text-xs text-slate-500">{user.mensajes} mensajes</p>
                   </div>
                 </div>
                 <Badge className="bg-blue-600">{Math.round(user.tiempoRespuesta)} min promedio</Badge>
               </div>
             ))}
           </div>
         </CardContent>
       </Card>
      )}

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

      {/* Mensajes sin respuesta */}
      {analytics.unansweredMessages && analytics.unansweredMessages.length > 0 && (
       <Card className="border-yellow-200 bg-yellow-50">
         <CardHeader>
           <CardTitle className="text-yellow-700 flex items-center gap-2">
             <Eye className="w-5 h-5" /> Mensajes Sin Respuesta
           </CardTitle>
         </CardHeader>
         <CardContent>
           <div className="space-y-2 max-h-80 overflow-y-auto">
             {analytics.unansweredMessages.slice(0, 15).map((msg, idx) => (
               <div key={idx} className="p-3 bg-white rounded border border-yellow-200">
                 <p className="text-sm text-slate-900"><strong>{msg.sender}</strong> - {msg.category}</p>
                 <p className="text-xs text-slate-600 mt-1 line-clamp-2">{msg.content}</p>
                 <p className="text-xs text-yellow-700 mt-2">Sin respuesta hace {msg.daysUnanswered} días</p>
               </div>
             ))}
           </div>
           <p className="text-xs text-slate-600 mt-3 p-2 bg-slate-100 rounded">
             ℹ️ Se muestran los últimos 15 mensajes sin respuesta. Recomendación: Contactar con los remitentes.
           </p>
         </CardContent>
       </Card>
      )}

      {/* ANÁLISIS DE SENTIMIENTO */}
      {analytics.sentiment && (
        <div className="space-y-6 border-t-2 border-orange-200 pt-6">
          <h2 className="text-2xl font-bold text-slate-900">😊 Análisis de Sentimiento</h2>

          {/* KPIs Sentimiento */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={analytics.sentiment.healthScore >= 70 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Heart className="w-4 h-4" /> Salud Comunicación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${analytics.sentiment.healthScore >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.round(analytics.sentiment.healthScore)}%
                </div>
                <p className="text-xs text-slate-600 mt-2">{analytics.sentiment.healthScore >= 70 ? 'Muy buena' : 'Necesita mejora'}</p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700">✅ Mensajes Positivos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{analytics.sentiment.positive}</div>
                <p className="text-xs text-slate-600 mt-2">{((analytics.sentiment.positive / (analytics.sentiment.positive + analytics.sentiment.negative + analytics.sentiment.neutral)) * 100).toFixed(1)}% del total</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-red-700">❌ Mensajes Negativos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{analytics.sentiment.negative}</div>
                <p className="text-xs text-slate-600 mt-2">{((analytics.sentiment.negative / (analytics.sentiment.positive + analytics.sentiment.negative + analytics.sentiment.neutral)) * 100).toFixed(1)}% del total</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">➖ Mensajes Neutrales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-600">{analytics.sentiment.neutral}</div>
                <p className="text-xs text-slate-600 mt-2">{((analytics.sentiment.neutral / (analytics.sentiment.positive + analytics.sentiment.negative + analytics.sentiment.neutral)) * 100).toFixed(1)}% del total</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de distribución de sentimiento */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Distribución de Sentimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positivos', value: analytics.sentiment.positive, color: '#22c55e' },
                      { name: 'Negativos', value: analytics.sentiment.negative, color: '#ef4444' },
                      { name: 'Neutrales', value: analytics.sentiment.neutral, color: '#94a3b8' }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    dataKey="value"
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                    <Cell fill="#94a3b8" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Palabras clave positivas y negativas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {analytics.sentiment.positivePhrases && analytics.sentiment.positivePhrases.length > 0 && (
              <Card className="border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-700">✨ Palabras Positivas Frecuentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analytics.sentiment.positivePhrases.map((phrase, idx) => (
                      <Badge key={idx} className="bg-green-100 text-green-800 border border-green-300">
                        {phrase}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {analytics.sentiment.negativePhrases && analytics.sentiment.negativePhrases.length > 0 && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700">⚠️ Palabras Negativas Frecuentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analytics.sentiment.negativePhrases.map((phrase, idx) => (
                      <Badge key={idx} className="bg-red-100 text-red-800 border border-red-300">
                        {phrase}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sentimiento por categoría - MEJORADO */}
          {Object.keys(analytics.sentiment.byCategory).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>🎯 Sentimiento por Equipo/Categoría</CardTitle>
                <p className="text-sm text-slate-600 mt-1">Identifica áreas de mejora en la comunicación</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.sentiment.byCategory)
                    .sort(([, a], [, b]) => {
                      const totalA = a.positive + a.negative + a.neutral;
                      const totalB = b.positive + b.negative + b.neutral;
                      const ratioA = totalA > 0 ? a.negative / totalA : 0;
                      const ratioB = totalB > 0 ? b.negative / totalB : 0;
                      return ratioB - ratioA; // Ordenar por negatividad (peores primero)
                    })
                    .map(([category, sentiments], idx) => {
                      const total = sentiments.positive + sentiments.negative + sentiments.neutral;
                      const positiveRatio = ((sentiments.positive / total) * 100).toFixed(1);
                      const negativeRatio = ((sentiments.negative / total) * 100).toFixed(1);
                      const needsAttention = parseFloat(negativeRatio) > 30 || parseFloat(positiveRatio) < 50;

                      return (
                        <div key={category} className={`p-4 rounded-lg border-2 ${needsAttention ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {needsAttention && <AlertTriangle className="w-4 h-4 text-red-600" />}
                              <p className="font-medium text-slate-900">{category}</p>
                            </div>
                            <Badge className={parseFloat(positiveRatio) >= 60 ? 'bg-green-600' : parseFloat(positiveRatio) >= 40 ? 'bg-orange-600' : 'bg-red-600'}>
                              {positiveRatio}% positivos
                            </Badge>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3 flex overflow-hidden shadow-inner">
                            <div className="bg-green-500" style={{ width: `${positiveRatio}%` }}></div>
                            <div className="bg-red-500" style={{ width: `${negativeRatio}%` }}></div>
                            <div className="bg-slate-400" style={{ width: `${((sentiments.neutral / total) * 100).toFixed(1)}%` }}></div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-600">
                              ✅ {sentiments.positive} | ❌ {sentiments.negative} | ➖ {sentiments.neutral}
                            </p>
                            {needsAttention && (
                              <p className="text-xs font-bold text-red-700">⚠️ Requiere atención</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

       {/* KPIs de Tendencias */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Tendencia Participación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.participationTrend || '↑'}</div>
            <p className="text-xs text-slate-500 mt-2">vs semana anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Horario Pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.peakHour || 'N/A'}</div>
            <p className="text-xs text-slate-500 mt-2">Mayor actividad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Velocidad Respuesta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.avgResponseTime || '--'} min</div>
            <p className="text-xs text-slate-500 mt-2">Promedio global</p>
          </CardContent>
        </Card>
       </div>

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