import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Users, Smartphone, Monitor, AlertTriangle, CheckCircle2, Search, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import PushCoverageByCategory from "../components/notifications/PushCoverageByCategory";
import PushUsersList from "../components/notifications/PushUsersList";

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#ec4899'];

function detectDevice(ua) {
  if (!ua) return 'Desconocido';
  const lower = ua.toLowerCase();
  if (lower.includes('iphone') || lower.includes('ipad')) return 'iOS';
  if (lower.includes('android')) return 'Android';
  if (lower.includes('windows')) return 'Windows';
  if (lower.includes('mac')) return 'Mac';
  if (lower.includes('linux')) return 'Linux';
  return 'Otro';
}

function detectBrowser(ua) {
  if (!ua) return 'Desconocido';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  return 'Otro';
}

export default function PushStats() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  const { data: pushSubs = [], isLoading: loadingSubs, refetch: refetchSubs } = useQuery({
    queryKey: ['pushStats-subs'],
    queryFn: () => base44.entities.PushSubscription.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 60000,
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['pushStats-users'],
    queryFn: () => base44.entities.User.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 60000,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['pushStats-players'],
    queryFn: () => base44.entities.Player.list('-created_date', 500),
    enabled: isAdmin,
    staleTime: 120000,
  });

  const stats = useMemo(() => {
    const activeSubs = pushSubs.filter(s => s.activa);
    const inactiveSubs = pushSubs.filter(s => !s.activa);
    
    // Unique emails with active subs
    const emailsWithPush = new Set(activeSubs.map(s => s.usuario_email));
    
    // All non-admin users (potential push recipients)
    const regularUsers = allUsers.filter(u => u.role !== 'tablet');
    const totalUsers = regularUsers.length;
    const usersWithPush = regularUsers.filter(u => emailsWithPush.has(u.email));
    const usersWithoutPush = regularUsers.filter(u => !emailsWithPush.has(u.email));
    
    // Coverage %
    const coveragePercent = totalUsers > 0 ? Math.round((usersWithPush.length / totalUsers) * 100) : 0;
    
    // Device breakdown
    const deviceCounts = {};
    activeSubs.forEach(s => {
      const dev = detectDevice(s.user_agent);
      deviceCounts[dev] = (deviceCounts[dev] || 0) + 1;
    });
    const deviceData = Object.entries(deviceCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Browser breakdown
    const browserCounts = {};
    activeSubs.forEach(s => {
      const br = detectBrowser(s.user_agent);
      browserCounts[br] = (browserCounts[br] || 0) + 1;
    });
    const browserData = Object.entries(browserCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Category coverage (users with players in each category)
    const categoryMap = {};
    players.forEach(p => {
      const cat = p.categoria_principal || p.deporte || 'Sin categoría';
      if (!categoryMap[cat]) categoryMap[cat] = { total: new Set(), withPush: new Set() };
      const emails = [p.email_padre, p.email_tutor_2, p.email_jugador].filter(Boolean);
      emails.forEach(e => {
        categoryMap[cat].total.add(e);
        if (emailsWithPush.has(e)) categoryMap[cat].withPush.add(e);
      });
    });
    const categoryData = Object.entries(categoryMap)
      .map(([cat, data]) => ({
        categoria: cat.replace('Fútbol ', '').replace(' (Mixto)', ''),
        categoriaFull: cat,
        total: data.total.size,
        conPush: data.withPush.size,
        sinPush: data.total.size - data.withPush.size,
        porcentaje: data.total.size > 0 ? Math.round((data.withPush.size / data.total.size) * 100) : 0,
      }))
      .sort((a, b) => a.porcentaje - b.porcentaje);
    
    // Multi-device users
    const subsPerUser = {};
    activeSubs.forEach(s => {
      subsPerUser[s.usuario_email] = (subsPerUser[s.usuario_email] || 0) + 1;
    });
    const multiDeviceCount = Object.values(subsPerUser).filter(c => c > 1).length;
    
    return {
      activeSubs: activeSubs.length,
      inactiveSubs: inactiveSubs.length,
      totalUsers,
      usersWithPush: usersWithPush.length,
      usersWithoutPush,
      coveragePercent,
      deviceData,
      browserData,
      categoryData,
      multiDeviceCount,
      emailsWithPush,
    };
  }, [pushSubs, allUsers, players]);

  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
        <p className="text-slate-600 mt-2">Solo administradores</p>
      </div>
    );
  }

  const isLoading = loadingSubs || loadingUsers;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-orange-600" />
            Estadísticas Push
          </h1>
          <p className="text-slate-600 mt-1">Cobertura y estado de notificaciones push</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetchSubs()} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs lg:text-sm text-green-700">Con Push</p>
                    <p className="text-2xl lg:text-3xl font-bold text-green-700">{stats.usersWithPush}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <BellOff className="w-8 h-8 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs lg:text-sm text-red-700">Sin Push</p>
                    <p className="text-2xl lg:text-3xl font-bold text-red-700">{stats.usersWithoutPush.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className={`border-2 ${stats.coveragePercent >= 70 ? 'border-green-300 bg-green-50' : stats.coveragePercent >= 40 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-slate-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs lg:text-sm text-slate-600">Cobertura</p>
                    <p className="text-2xl lg:text-3xl font-bold">{stats.coveragePercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs lg:text-sm text-slate-600">Suscripciones</p>
                    <p className="text-2xl lg:text-3xl font-bold text-indigo-700">{stats.activeSubs}</p>
                    <p className="text-xs text-slate-500">{stats.multiDeviceCount} multi-dispositivo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coverage progress bar */}
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Cobertura global</span>
                <span className="text-sm text-slate-600">{stats.usersWithPush} de {stats.totalUsers} usuarios</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all ${stats.coveragePercent >= 70 ? 'bg-green-500' : stats.coveragePercent >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${stats.coveragePercent}%` }}
                />
              </div>
              {stats.coveragePercent < 70 && (
                <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.coveragePercent < 40 ? 'Cobertura baja — muchos usuarios no recibirán notificaciones' : 'Cobertura mejorable — algunos usuarios no recibirán notificaciones'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Device breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📱 Por dispositivo</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {stats.deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-slate-500 text-sm py-8 text-center">Sin datos</p>}
              </CardContent>
            </Card>

            {/* Browser breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🌐 Por navegador</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.browserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.browserData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                        {stats.browserData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-slate-500 text-sm py-8 text-center">Sin datos</p>}
              </CardContent>
            </Card>
          </div>

          {/* Category coverage */}
          <PushCoverageByCategory data={stats.categoryData} />

          {/* Users without push */}
          <PushUsersList 
            usersWithoutPush={stats.usersWithoutPush}
            allUsers={allUsers}
            emailsWithPush={stats.emailsWithPush}
          />

          {/* Inactive subs info */}
          {stats.inactiveSubs > 0 && (
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-sm text-slate-600">
                  ⚠️ Hay <strong>{stats.inactiveSubs}</strong> suscripciones inactivas (expiradas o rechazadas). 
                  Estos usuarios dejaron de recibir push y necesitarían volver a activarlas.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}