import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function MembershipStatsPanel({ members = [], seasonConfig }) {
  const currentSeason = seasonConfig?.temporada;

  // Obtener todas las temporadas únicas
  const seasons = useMemo(() => {
    const uniqueSeasons = [...new Set(members.map(m => m.temporada).filter(Boolean))];
    return uniqueSeasons.sort().reverse();
  }, [members]);

  // Filtrar miembros de la temporada actual
  const currentSeasonMembers = useMemo(() => {
    return members.filter(m => m.temporada === currentSeason);
  }, [members, currentSeason]);

  // 1. Evolución de socios por temporada
  const evolutionData = useMemo(() => {
    const byTemporada = {};
    members.forEach(m => {
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
  }, [members]);

  // 2. Origen de socios (referidos vs directos)
  const originData = useMemo(() => {
    const referidos = currentSeasonMembers.filter(m => m.referido_por).length;
    const directos = currentSeasonMembers.length - referidos;
    return [
      { name: 'Directos', value: directos, color: '#3b82f6' },
      { name: 'Referidos', value: referidos, color: '#22c55e' }
    ];
  }, [currentSeasonMembers]);

  // 3. Total cuotas recaudadas por temporada
  const revenueData = useMemo(() => {
    const byTemporada = {};
    members.forEach(m => {
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
  }, [members]);

  // 4. Desglose por municipio
  const municipioData = useMemo(() => {
    const byMunicipio = {};
    currentSeasonMembers.forEach(m => {
      const municipio = m.municipio?.trim() || 'Sin especificar';
      if (!byMunicipio[municipio]) {
        byMunicipio[municipio] = 0;
      }
      byMunicipio[municipio]++;
    });
    return Object.entries(byMunicipio)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [currentSeasonMembers]);

  // 5. Tasa de renovación entre temporadas
  const renewalRates = useMemo(() => {
    if (seasons.length < 2) return [];
    
    const rates = [];
    for (let i = 0; i < seasons.length - 1; i++) {
      const currentSeasonName = seasons[i];
      const previousSeason = seasons[i + 1];
      
      const previousMembers = members.filter(m => m.temporada === previousSeason);
      const currentMembers = members.filter(m => m.temporada === currentSeasonName);
      
      const previousEmails = new Set(previousMembers.map(m => m.email?.toLowerCase()));
      const renewed = currentMembers.filter(m => previousEmails.has(m.email?.toLowerCase())).length;
      
      const rate = previousMembers.length > 0 ? ((renewed / previousMembers.length) * 100).toFixed(1) : 0;
      
      rates.push({
        periodo: `${previousSeason.split('/')[0]} → ${currentSeasonName.split('/')[0]}`,
        previousCount: previousMembers.length,
        renewed,
        newMembers: currentMembers.length - renewed,
        rate: parseFloat(rate)
      });
    }
    return rates.reverse();
  }, [members, seasons]);

  // Estadísticas generales temporada actual
  const stats = useMemo(() => {
    const total = currentSeasonMembers.length;
    const pagados = currentSeasonMembers.filter(m => m.estado_pago === "Pagado").length;
    const referidos = currentSeasonMembers.filter(m => m.referido_por).length;
    const renovaciones = currentSeasonMembers.filter(m => m.tipo_inscripcion === "Renovación").length;
    const recaudado = pagados * CUOTA_SOCIO;
    const segundosProgenitores = currentSeasonMembers.filter(m => m.es_segundo_progenitor).length;

    return {
      total,
      pagados,
      referidos,
      renovaciones,
      recaudado,
      segundosProgenitores,
      tasaReferidos: total > 0 ? ((referidos / total) * 100).toFixed(1) : 0
    };
  }, [currentSeasonMembers]);

  // Comparativa con temporada anterior
  const comparison = useMemo(() => {
    if (seasons.length < 2) return null;
    
    const currentIndex = seasons.indexOf(currentSeason);
    if (currentIndex === -1 || currentIndex === seasons.length - 1) return null;
    
    const previousSeason = seasons[currentIndex + 1];
    const previousMembers = members.filter(m => m.temporada === previousSeason);
    
    const diff = currentSeasonMembers.length - previousMembers.length;
    const percentage = previousMembers.length > 0 
      ? (((currentSeasonMembers.length - previousMembers.length) / previousMembers.length) * 100).toFixed(1)
      : 0;
    
    return { diff, percentage, previousSeason, previousCount: previousMembers.length };
  }, [members, currentSeasonMembers, currentSeason, seasons]);

  return (
    <div className="space-y-6">
      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Total Socios</p>
                <p className="text-2xl font-bold text-orange-900">{stats.total}</p>
                {comparison && (
                  <div className={`flex items-center gap-1 text-xs mt-1 ${comparison.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.diff >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {comparison.diff >= 0 ? '+' : ''}{comparison.diff} vs anterior
                  </div>
                )}
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Recaudado</p>
                <p className="text-2xl font-bold text-green-900">{stats.recaudado}€</p>
                <p className="text-xs text-green-600 mt-1">{stats.pagados} pagados</p>
              </div>
              <CreditCard className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 font-medium">Por Referidos</p>
                <p className="text-2xl font-bold text-purple-900">{stats.referidos}</p>
                <p className="text-xs text-purple-600 mt-1">{stats.tasaReferidos}% del total</p>
              </div>
              <Gift className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">Renovaciones</p>
                <p className="text-2xl font-bold text-blue-900">{stats.renovaciones}</p>
                <p className="text-xs text-blue-600 mt-1">{stats.total - stats.renovaciones} nuevos</p>
              </div>
              <RefreshCw className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas en grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Evolución por temporada */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              Evolución por Temporada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temporada" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#f97316" fill="#fed7aa" strokeWidth={2} />
                  <Area type="monotone" dataKey="pagados" name="Pagados" stroke="#22c55e" fill="#bbf7d0" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-10 text-sm">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Origen de socios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              Origen de Socios ({currentSeason})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={150}>
                <RechartsPie>
                  <Pie
                    data={originData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {originData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Directos: <strong>{originData[0]?.value || 0}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Referidos: <strong>{originData[1]?.value || 0}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-400" />
                  <span className="text-sm">2º Prog: <strong>{stats.segundosProgenitores}</strong></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos por temporada */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-600" />
              Cuotas por Temporada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temporada" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => `${v}€`} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => `${value}€`} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="recaudado" name="Recaudado" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pendiente" name="Pendiente" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-10 text-sm">Sin datos</p>
            )}
          </CardContent>
        </Card>

        {/* Distribución por municipio */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Top Municipios ({currentSeason})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {municipioData.length > 0 ? (
              <div className="space-y-2">
                {municipioData.map((m, idx) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm truncate max-w-[120px]">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${(m.value / currentSeasonMembers.length) * 100}%`,
                            backgroundColor: COLORS[idx % COLORS.length]
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{m.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-10 text-sm">Sin datos</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasa de renovación */}
      {renewalRates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-orange-600" />
              Tasa de Renovación entre Temporadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renewalRates.map((r) => (
                <div key={r.periodo} className="p-3 bg-slate-50 rounded-xl border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-slate-900">{r.periodo}</span>
                    <Badge className={`${r.rate >= 50 ? 'bg-green-500' : r.rate >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                      {r.rate}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-slate-500">Anterior</p>
                      <p className="font-semibold">{r.previousCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500">Renovaron</p>
                      <p className="font-semibold text-green-600">{r.renewed}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500">Nuevos</p>
                      <p className="font-semibold text-blue-600">{r.newMembers}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}