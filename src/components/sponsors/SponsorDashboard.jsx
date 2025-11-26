import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Euro, TrendingUp, Users, AlertTriangle, Building2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = {
  "Principal": "#f59e0b",
  "Oro": "#eab308",
  "Plata": "#94a3b8",
  "Bronce": "#ea580c",
  "Colaborador": "#3b82f6"
};

export default function SponsorDashboard({ sponsors }) {
  const activeSponsors = sponsors.filter(s => s.estado === "Activo");
  const pendingSponsors = sponsors.filter(s => s.estado === "Pendiente");

  // Ingresos totales activos
  const totalActiveIncome = activeSponsors.reduce((sum, s) => {
    let annual = s.monto || 0;
    if (s.frecuencia_pago === "Mensual") annual *= 12;
    else if (s.frecuencia_pago === "Trimestral") annual *= 4;
    return sum + annual;
  }, 0);

  // Ingresos por nivel
  const incomeByLevel = Object.entries(
    activeSponsors.reduce((acc, s) => {
      let annual = s.monto || 0;
      if (s.frecuencia_pago === "Mensual") annual *= 12;
      else if (s.frecuencia_pago === "Trimestral") annual *= 4;
      acc[s.nivel_patrocinio] = (acc[s.nivel_patrocinio] || 0) + annual;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Patrocinios próximos a vencer (30 días)
  const expiringSponsors = activeSponsors.filter(s => {
    if (!s.fecha_fin) return false;
    const daysUntilExpiry = differenceInDays(new Date(s.fecha_fin), new Date());
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  // Distribución por nivel
  const distributionByLevel = Object.entries(
    activeSponsors.reduce((acc, s) => {
      acc[s.nivel_patrocinio] = (acc[s.nivel_patrocinio] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value, color: COLORS[name] }));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-600 rounded-xl">
                <Euro className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-700 font-medium">Ingresos Anuales</p>
                <p className="text-2xl font-bold text-green-800">
                  {totalActiveIncome.toLocaleString('es-ES')}€
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-600 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">Patrocinadores Activos</p>
                <p className="text-2xl font-bold text-amber-800">{activeSponsors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-700 font-medium">Pendientes</p>
                <p className="text-2xl font-bold text-blue-800">{pendingSponsors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-none shadow-lg ${expiringSponsors.length > 0 ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${expiringSponsors.length > 0 ? 'bg-red-600' : 'bg-slate-600'}`}>
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className={`text-xs font-medium ${expiringSponsors.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                  Próximos a Vencer
                </p>
                <p className={`text-2xl font-bold ${expiringSponsors.length > 0 ? 'text-red-800' : 'text-slate-800'}`}>
                  {expiringSponsors.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos por nivel */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">💶 Ingresos por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByLevel.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={incomeByLevel}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${value.toLocaleString('es-ES')}€`} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                No hay datos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribución por nivel */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">📊 Distribución por Nivel</CardTitle>
          </CardHeader>
          <CardContent>
            {distributionByLevel.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={distributionByLevel}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {distributionByLevel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {distributionByLevel.map(item => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-slate-600">{item.name}</span>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-slate-400">
                No hay datos
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Próximos a vencer */}
      {expiringSponsors.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-700">⚠️ Patrocinios Próximos a Vencer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringSponsors.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.nombre} className="w-10 h-10 object-contain rounded" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-red-200 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900">{s.nombre}</p>
                      <p className="text-xs text-slate-600">{s.nivel_patrocinio} • {s.monto?.toLocaleString('es-ES')}€</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-500 text-white">
                      Vence: {format(new Date(s.fecha_fin), "d MMM yyyy", { locale: es })}
                    </Badge>
                    <p className="text-xs text-red-600 mt-1">
                      {differenceInDays(new Date(s.fecha_fin), new Date())} días restantes
                    </p>
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