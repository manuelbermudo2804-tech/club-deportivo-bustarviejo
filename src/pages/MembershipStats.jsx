import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, TrendingUp, MapPin, RefreshCw, CreditCard, 
  UserPlus, Gift, BarChart3, PieChart, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1'];
const CUOTA_SOCIO = 25;

export default function MembershipStats() {
  const [selectedSeason, setSelectedSeason] = useState("all");

  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: ['allMembersStats'],
    queryFn: () => base44.entities.ClubMember.list(),
  });

  const { data: referralRewards = [] } = useQuery({
    queryKey: ['referralRewardsStats'],
    queryFn: () => base44.entities.ReferralReward.list(),
  });

  // Obtener todas las temporadas únicas
  const seasons = useMemo(() => {
    const uniqueSeasons = [...new Set(allMembers.map(m => m.temporada).filter(Boolean))];
    return uniqueSeasons.sort().reverse();
  }, [allMembers]);

  // Filtrar por temporada seleccionada
  const filteredMembers = useMemo(() => {
    if (selectedSeason === "all") return allMembers;
    return allMembers.filter(m => m.temporada === selectedSeason);
  }, [allMembers, selectedSeason]);

  // 1. Evolución de socios por temporada
  const evolutionData = useMemo(() => {
    const byTemporada = {};
    allMembers.forEach(m => {
      if (!m.temporada) return;
      if (!byTemporada[m.temporada]) {
        byTemporada[m.temporada] = { temporada: m.temporada, total: 0, pagados: 0 };
      }
      byTemporada[m.temporada].total++;
      if (m.estado_pago === "Pagado") {
        byTemporada[m.temporada].pagados++;
      }
    });
    return Object.values(byTemporada).sort((a, b) => a.temporada.localeCompare(b.temporada));
  }, [allMembers]);

  // 2. Origen de socios (referidos vs directos)
  const originData = useMemo(() => {
    const referidos = filteredMembers.filter(m => m.referido_por).length;
    const directos = filteredMembers.length - referidos;
    return [
      { name: 'Directos', value: directos, color: '#3b82f6' },
      { name: 'Referidos', value: referidos, color: '#22c55e' }
    ];
  }, [filteredMembers]);

  // 3. Total cuotas recaudadas por temporada
  const revenueData = useMemo(() => {
    const byTemporada = {};
    allMembers.forEach(m => {
      if (!m.temporada) return;
      if (!byTemporada[m.temporada]) {
        byTemporada[m.temporada] = { temporada: m.temporada, recaudado: 0, pendiente: 0 };
      }
      const cuota = m.cuota_socio || CUOTA_SOCIO;
      if (m.estado_pago === "Pagado") {
        byTemporada[m.temporada].recaudado += cuota;
      } else {
        byTemporada[m.temporada].pendiente += cuota;
      }
    });
    return Object.values(byTemporada).sort((a, b) => a.temporada.localeCompare(b.temporada));
  }, [allMembers]);

  // 4. Desglose por municipio
  const municipioData = useMemo(() => {
    const byMunicipio = {};
    filteredMembers.forEach(m => {
      const municipio = m.municipio?.trim() || 'Sin especificar';
      if (!byMunicipio[municipio]) {
        byMunicipio[municipio] = 0;
      }
      byMunicipio[municipio]++;
    });
    return Object.entries(byMunicipio)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 municipios
  }, [filteredMembers]);

  // 5. Tasa de renovación entre temporadas
  const renewalRates = useMemo(() => {
    if (seasons.length < 2) return [];
    
    const rates = [];
    for (let i = 0; i < seasons.length - 1; i++) {
      const currentSeason = seasons[i];
      const previousSeason = seasons[i + 1];
      
      const previousMembers = allMembers.filter(m => m.temporada === previousSeason);
      const currentMembers = allMembers.filter(m => m.temporada === currentSeason);
      
      // Buscar cuántos emails de la temporada anterior están en la actual
      const previousEmails = new Set(previousMembers.map(m => m.email?.toLowerCase()));
      const renewed = currentMembers.filter(m => previousEmails.has(m.email?.toLowerCase())).length;
      
      const rate = previousMembers.length > 0 ? ((renewed / previousMembers.length) * 100).toFixed(1) : 0;
      
      rates.push({
        periodo: `${previousSeason} → ${currentSeason}`,
        previousCount: previousMembers.length,
        renewed,
        newMembers: currentMembers.length - renewed,
        rate: parseFloat(rate)
      });
    }
    return rates.reverse();
  }, [allMembers, seasons]);

  // Estadísticas generales
  const stats = useMemo(() => {
    const total = filteredMembers.length;
    const pagados = filteredMembers.filter(m => m.estado_pago === "Pagado").length;
    const enRevision = filteredMembers.filter(m => m.estado_pago === "En revisión").length;
    const pendientes = filteredMembers.filter(m => m.estado_pago === "Pendiente").length;
    const referidos = filteredMembers.filter(m => m.referido_por).length;
    const renovaciones = filteredMembers.filter(m => m.tipo_inscripcion === "Renovación").length;
    const recaudado = pagados * CUOTA_SOCIO;
    const segundosProgenitores = filteredMembers.filter(m => m.es_segundo_progenitor).length;

    return {
      total,
      pagados,
      enRevision,
      pendientes,
      referidos,
      renovaciones,
      recaudado,
      segundosProgenitores,
      tasaPago: total > 0 ? ((pagados / total) * 100).toFixed(1) : 0,
      tasaReferidos: total > 0 ? ((referidos / total) * 100).toFixed(1) : 0
    };
  }, [filteredMembers]);

  // Comparativa con temporada anterior
  const comparison = useMemo(() => {
    if (selectedSeason === "all" || seasons.length < 2) return null;
    
    const currentIndex = seasons.indexOf(selectedSeason);
    if (currentIndex === seasons.length - 1) return null; // No hay temporada anterior
    
    const previousSeason = seasons[currentIndex + 1];
    const previousMembers = allMembers.filter(m => m.temporada === previousSeason);
    const currentMembers = filteredMembers;
    
    const diff = currentMembers.length - previousMembers.length;
    const percentage = previousMembers.length > 0 
      ? (((currentMembers.length - previousMembers.length) / previousMembers.length) * 100).toFixed(1)
      : 0;
    
    return { diff, percentage, previousSeason, previousCount: previousMembers.length };
  }, [allMembers, filteredMembers, selectedSeason, seasons]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-orange-600" />
            Estadísticas de Socios
          </h1>
          <p className="text-slate-600 mt-1">Análisis detallado de la evolución y composición de socios</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Temporada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las temporadas</SelectItem>
              {seasons.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Total Socios</p>
                <p className="text-3xl font-bold text-orange-900">{stats.total}</p>
                {comparison && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${comparison.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {comparison.diff >= 0 ? '+' : ''}{comparison.diff} ({comparison.percentage}%)
                  </div>
                )}
              </div>
              <Users className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Recaudado</p>
                <p className="text-3xl font-bold text-green-900">{stats.recaudado}€</p>
                <p className="text-xs text-green-600 mt-1">{stats.pagados} pagados ({stats.tasaPago}%)</p>
              </div>
              <CreditCard className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Por Referidos</p>
                <p className="text-3xl font-bold text-purple-900">{stats.referidos}</p>
                <p className="text-xs text-purple-600 mt-1">{stats.tasaReferidos}% del total</p>
              </div>
              <Gift className="w-10 h-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Renovaciones</p>
                <p className="text-3xl font-bold text-blue-900">{stats.renovaciones}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.total - stats.renovaciones} nuevos</p>
              </div>
              <RefreshCw className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas principales */}
      <Tabs defaultValue="evolucion" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
          <TabsTrigger value="evolucion" className="py-3">📈 Evolución</TabsTrigger>
          <TabsTrigger value="origen" className="py-3">🎯 Origen</TabsTrigger>
          <TabsTrigger value="ingresos" className="py-3">💰 Ingresos</TabsTrigger>
          <TabsTrigger value="municipios" className="py-3">📍 Municipios</TabsTrigger>
          <TabsTrigger value="renovacion" className="py-3">🔄 Renovación</TabsTrigger>
        </TabsList>

        {/* 1. Evolución por temporada */}
        <TabsContent value="evolucion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Evolución de Socios por Temporada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evolutionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="temporada" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="total" name="Total Socios" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
                    <Area type="monotone" dataKey="pagados" name="Pagados" stroke="#22c55e" fill="#bbf7d0" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-500 py-10">No hay datos suficientes</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Origen de socios */}
        <TabsContent value="origen">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-purple-600" />
                  Origen de Nuevos Socios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={originData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {originData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Desglose de Origen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserPlus className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-semibold text-blue-900">Socios Directos</p>
                        <p className="text-sm text-blue-700">Se inscribieron por su cuenta</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{originData[0]?.value || 0}</p>
                  </div>
                </div>
                
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gift className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Por Programa Referidos</p>
                        <p className="text-sm text-green-700">Invitados por otros socios</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{originData[1]?.value || 0}</p>
                  </div>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="font-semibold text-orange-900">Segundos Progenitores</p>
                        <p className="text-sm text-orange-700">Pareja de padre/madre inscrito</p>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-orange-900">{stats.segundosProgenitores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. Ingresos por temporada */}
        <TabsContent value="ingresos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-green-600" />
                Cuotas Recaudadas por Temporada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="temporada" />
                    <YAxis tickFormatter={(v) => `${v}€`} />
                    <Tooltip formatter={(value) => `${value}€`} />
                    <Legend />
                    <Bar dataKey="recaudado" name="Recaudado" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendiente" name="Pendiente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-slate-500 py-10">No hay datos suficientes</p>
              )}
              
              {/* Resumen de ingresos */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                  <p className="text-sm text-slate-600">Total Histórico</p>
                  <p className="text-2xl font-bold text-green-600">
                    {revenueData.reduce((acc, d) => acc + d.recaudado, 0)}€
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Pendiente Total</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {revenueData.reduce((acc, d) => acc + d.pendiente, 0)}€
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-600">Media por Temporada</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {revenueData.length > 0 
                      ? Math.round(revenueData.reduce((acc, d) => acc + d.recaudado, 0) / revenueData.length)
                      : 0}€
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Desglose por municipio */}
        <TabsContent value="municipios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Distribución Geográfica (Top 10 Municipios)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {municipioData.length > 0 ? (
                <div className="grid lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={municipioData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Bar dataKey="value" name="Socios" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {municipioData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-2">
                    {municipioData.map((m, idx) => (
                      <div key={m.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-medium">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{m.value} socios</Badge>
                          <span className="text-sm text-slate-500">
                            {((m.value / filteredMembers.length) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-10">No hay datos de municipios</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. Tasa de renovación */}
        <TabsContent value="renovacion">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-orange-600" />
                Tasa de Renovación entre Temporadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renewalRates.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={renewalRates}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodo" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="renewed" name="Renovaron" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="newMembers" name="Nuevos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="rate" name="Tasa %" stroke="#f97316" strokeWidth={3} dot={{ r: 6 }} />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <div className="mt-6 space-y-3">
                    {renewalRates.map((r, idx) => (
                      <div key={r.periodo} className="p-4 bg-slate-50 rounded-xl border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-slate-900">{r.periodo}</span>
                          <Badge className={`${r.rate >= 50 ? 'bg-green-500' : r.rate >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                            {r.rate}% renovación
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Temporada anterior</p>
                            <p className="font-semibold">{r.previousCount} socios</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Renovaron</p>
                            <p className="font-semibold text-green-600">{r.renewed} socios</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Nuevos</p>
                            <p className="font-semibold text-blue-600">{r.newMembers} socios</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-slate-500 py-10">Se necesitan al menos 2 temporadas para calcular tasas de renovación</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Estado de pagos actual */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Pagos {selectedSeason !== "all" ? `- ${selectedSeason}` : ""}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-3xl font-bold text-green-600">{stats.pagados}</p>
              <p className="text-sm text-green-700">Pagados</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.pagados / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-3xl font-bold text-yellow-600">{stats.enRevision}</p>
              <p className="text-sm text-yellow-700">En Revisión</p>
              <div className="w-full bg-yellow-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.enRevision / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
              <p className="text-3xl font-bold text-red-600">{stats.pendientes}</p>
              <p className="text-sm text-red-700">Pendientes</p>
              <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-red-500 h-2 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.pendientes / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}