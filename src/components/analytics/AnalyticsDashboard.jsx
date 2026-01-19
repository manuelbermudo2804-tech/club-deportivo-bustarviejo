import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, TrendingUp, Users, Zap, BarChart3, CheckCircle2, Clock, CreditCard, Database, MessageCircle, Plug, Mail, Download, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import PredictiveAlerts from './PredictiveAlerts';
import AutomationActions from './AutomationActions';
import { TrendChart, CategoryChart, SeverityChart, ComparisonChart } from './AnalyticsCharts';

export default function AnalyticsDashboard() {
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroSeveridad, setFiltroSeveridad] = useState('all');
  const [analysisType, setAnalysisType] = useState('all');

  // Obtener alertas
  const { data: alertas = [], isLoading: alertasLoading } = useQuery({
    queryKey: ['system_alerts'],
    queryFn: () => base44.asServiceRole.entities.SystemAlert.filter({ estado: 'activo' })
  });

  // Análisis integral
  const { data: comprehensiveAnalysis = {}, isLoading: analysisLoading } = useQuery({
    queryKey: ['comprehensive_analysis', analysisType],
    queryFn: async () => {
      const response = await base44.functions.invoke('comprehensiveAnalytics', { analysisType });
      return response.data;
    },
    staleTime: 5 * 60 * 1000
  });

  // Obtener eventos
  const { data: eventos = [], isLoading: eventosLoading } = useQuery({
    queryKey: ['analytics_events'],
    queryFn: async () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return base44.asServiceRole.entities.AnalyticsEvent.filter({});
    }
  });

  // Calcular métricas
  const metricas = {
    alertasCriticas: alertas.filter(a => a.severidad === 'critical').length,
    alertasAltas: alertas.filter(a => a.severidad === 'high').length,
    erroresHoy: eventos.filter(e => e.evento_tipo === 'error').length,
    usuariosActivos: new Set(eventos.map(e => e.usuario_email)).size,
    paginasMasLentas: calcularPaginasMasLentas(eventos),
    dispositivosDistribucion: calcularDistribucion(eventos, 'dispositivo')
  };

  const alertasFiltradas = alertas
    .filter(a => filtroCategoria === 'all' || a.categoria === filtroCategoria)
    .filter(a => filtroSeveridad === 'all' || a.severidad === filtroSeveridad)
    .sort((a, b) => (b.prioridad_score || 0) - (a.prioridad_score || 0));

  if (alertasLoading || eventosLoading || analysisLoading) {
    return <div className="p-6 text-center">Cargando dashboard...</div>;
  }

  // Agrupar alertas por análisis
  const alertasPorAnalisis = {
    stripe: comprehensiveAnalysis.stripe?.alerts || [],
    users: comprehensiveAnalysis.users?.alerts || [],
    data: comprehensiveAnalysis.data?.alerts || [],
    chats: comprehensiveAnalysis.chats?.alerts || [],
    performance: comprehensiveAnalysis.performance?.alerts || [],
    integrations: comprehensiveAnalysis.integrations?.alerts || [],
    email: comprehensiveAnalysis.email?.alerts || []
  };

  const allAnalysisAlerts = Object.values(alertasPorAnalisis).flat();
  const alertasTotal = [...alertas, ...allAnalysisAlerts];

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-slate-900">📊 Centro de Análisis Integral</h1>
        <p className="text-slate-600">Monitor en tiempo real de errores, rendimiento, usuarios, pagos y más</p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon={<AlertCircle className="w-6 h-6" />}
          titulo="Alertas Críticas"
          valor={metricas.alertasCriticas}
          color="red"
        />
        <KPICard
          icon={<AlertCircle className="w-6 h-6" />}
          titulo="Alertas Altas"
          valor={metricas.alertasAltas}
          color="orange"
        />
        <KPICard
          icon={<Zap className="w-6 h-6" />}
          titulo="Errores Hoy"
          valor={metricas.erroresHoy}
          color="yellow"
        />
        <KPICard
          icon={<Users className="w-6 h-6" />}
          titulo="Usuarios Activos"
          valor={metricas.usuariosActivos}
          color="blue"
        />
        <KPICard
          icon={<TrendingUp className="w-6 h-6" />}
          titulo="Total Alertas"
          valor={alertasTotal.length}
          color="purple"
        />
      </div>

      {/* ANÁLISIS POR MÓDULO */}
      <Card className="border-2 border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle>🔍 Análisis por Módulo</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { type: 'all', label: 'Todo', icon: BarChart3 },
              { type: 'stripe', label: 'Pagos', icon: CreditCard },
              { type: 'users', label: 'Usuarios', icon: Users },
              { type: 'data', label: 'Datos', icon: Database },
              { type: 'chats', label: 'Chats', icon: MessageCircle },
              { type: 'performance', label: 'Performance', icon: Zap },
              { type: 'integrations', label: 'Integraciones', icon: Plug }
            ].map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant={analysisType === type ? 'default' : 'outline'}
                onClick={() => setAnalysisType(type)}
                size="sm"
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ALERTAS ACTIVAS */}
      <Card className="border-2 border-slate-200">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            Problemas Detectados ({alertasFiltradas.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={filtroCategoria === 'all' ? 'default' : 'outline'}
              onClick={() => setFiltroCategoria('all')}
              size="sm"
            >
              Todas
            </Button>
            {['error', 'performance', 'data_integrity', 'inconsistency', 'behavior', 'stripe', 'users', 'communication'].map(cat => (
              <Button
                key={cat}
                variant={filtroCategoria === cat ? 'default' : 'outline'}
                onClick={() => setFiltroCategoria(cat)}
                size="sm"
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Lista de alertas */}
          <div className="space-y-3">
            {alertasFiltradas.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-slate-600">¡Excelente! No hay problemas detectados</p>
              </div>
            ) : (
              alertasFiltradas.map((alerta, idx) => (
                <motion.div
                  key={alerta.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="border-l-4 border-slate-300 bg-slate-50 p-4 rounded-lg hover:shadow-md transition"
                  style={{
                    borderLeftColor: getSeverityColor(alerta.severidad),
                    backgroundColor: getSeverityBg(alerta.severidad)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{alerta.titulo}</h3>
                      <p className="text-sm text-slate-700 mt-1">{alerta.descripcion}</p>

                      {alerta.solucion_sugerida && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-800">
                          💡 <strong>Solución:</strong> {alerta.solucion_sugerida}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Badge variant="outline">{alerta.categoria}</Badge>
                        <Badge variant={getSeverityBadge(alerta.severidad)}>
                          {alerta.severidad.toUpperCase()}
                        </Badge>
                        {alerta.ocurrencias > 1 && (
                          <Badge variant="secondary">
                            {alerta.ocurrencias} ocurrencias
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          Score: {alerta.prioridad_score || 50}/100
                        </Badge>
                      </div>
                    </div>

                    <div className="ml-4 flex flex-col items-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsResolved(alerta.id)}
                      >
                        Resolver
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* ANÁLISIS POR MÓDULO - DETALLE */}
      {analysisType !== 'all' && comprehensiveAnalysis[analysisType]?.stats && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">📊 Estadísticas - {analysisType.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(comprehensiveAnalysis[analysisType].stats).map(([key, value]) => (
                <div key={key} className="p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs text-slate-600 capitalize">{key}</p>
                  <p className="text-2xl font-bold text-blue-600">{typeof value === 'number' ? value : JSON.stringify(value).substring(0, 20)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MÉTRICAS ADICIONALES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Páginas más lentas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              ⏱️ Páginas Más Lentas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metricas.paginasMasLentas.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.pagina}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-500"
                        style={{ width: `${Math.min((item.duracion / 5000) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-600">{item.duracion}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de dispositivos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              📱 Dispositivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metricas.dispositivosDistribucion).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{device}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${
                            (count /
                              Object.values(metricas.dispositivosDistribucion).reduce(
                                (a, b) => a + b,
                                0
                              )) *
                            100
                          }%`
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ icon, titulo, valor, color }) {
  const colorClasses = {
    red: 'bg-red-50 text-red-600 border-red-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={`${colorClasses[color]} border-2 p-4 rounded-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">{titulo}</p>
          <p className="text-3xl font-bold">{valor}</p>
        </div>
        {icon}
      </div>
    </motion.div>
  );
}

function getSeverityColor(severity) {
  const colors = { critical: '#dc2626', high: '#ea580c', medium: '#eab308', low: '#3b82f6' };
  return colors[severity] || '#64748b';
}

function getSeverityBg(severity) {
  const bgs = {
    critical: '#fecaca',
    high: '#fed7aa',
    medium: '#fef08a',
    low: '#dbeafe'
  };
  return bgs[severity] || '#f1f5f9';
}

function getSeverityBadge(severity) {
  const badges = {
    critical: 'destructive',
    high: 'secondary',
    medium: 'outline',
    low: 'outline'
  };
  return badges[severity] || 'outline';
}

function calcularPaginasMasLentas(eventos) {
  const paginas = {};
  eventos
    .filter(e => e.duracion_ms && e.duracion_ms > 500)
    .forEach(e => {
      if (!paginas[e.pagina]) paginas[e.pagina] = [];
      paginas[e.pagina].push(e.duracion_ms);
    });

  return Object.entries(paginas)
    .map(([pagina, duraciones]) => ({
      pagina,
      duracion: Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length)
    }))
    .sort((a, b) => b.duracion - a.duracion);
}

function calcularDistribucion(eventos, campo) {
  const distribucion = {};
  eventos.forEach(e => {
    const valor = e[campo] || 'desconocido';
    distribucion[valor] = (distribucion[valor] || 0) + 1;
  });
  return distribucion;
}

async function markAsResolved(alertaId) {
  try {
    await base44.asServiceRole.entities.SystemAlert.update(alertaId, {
      estado: 'resuelto'
    });
    window.location.reload();
  } catch (e) {
    console.error('Error marcando como resuelto:', e);
  }
}