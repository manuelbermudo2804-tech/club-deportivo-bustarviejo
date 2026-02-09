import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, BarChart } from "lucide-react";

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

const formatCurrency = (value) => {
  const num = Math.abs(value);
  if (num >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
};

export default function CategoryBreakdown({ players, payments, activeSeason, getImportePorMes }) {
  const categoryStats = useMemo(() => {
    if (!activeSeason || !players.length) return [];

    const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true);
    const currentSeasonPlayers = players.filter(p => p.activo === true);

    // Agrupar por categoría
    const categories = {};
    
    currentSeasonPlayers.forEach(player => {
      const categoria = player.deporte || "Sin categoría";
      
      if (!categories[categoria]) {
        categories[categoria] = {
          nombre: categoria,
          jugadores: 0,
          esperado: 0,
          cobrado: 0,
          pendiente: 0,
          enRevision: 0
        };
      }

      categories[categoria].jugadores++;

      const playerPayments = currentSeasonPayments.filter(p => p.jugador_id === player.id);
      
      // Verificar si tiene pago único (independiente del estado)
      const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
      const hasPagoUnico = !!pagoUnico;

      const allMonths = ["Junio", "Septiembre", "Diciembre"];

      if (hasPagoUnico) {
        // PAGO ÚNICO: usar la cantidad del pago como esperado
        const importeEsperado = pagoUnico.cantidad || 0;
        categories[categoria].esperado += importeEsperado;
        
        if (pagoUnico.estado === "Pagado") {
          categories[categoria].cobrado += importeEsperado;
        } else if (pagoUnico.estado === "En revisión") {
          categories[categoria].enRevision += importeEsperado;
        } else {
          categories[categoria].pendiente += importeEsperado;
        }
      } else {
        // PAGO FRACCIONADO: calcular por cada mes
        allMonths.forEach(mes => {
          const importe = getImportePorMes(player.deporte, mes);
          categories[categoria].esperado += importe;

          const pago = playerPayments.find(p => p.mes === mes);
          if (pago) {
            if (pago.estado === "Pagado") {
              categories[categoria].cobrado += (pago.cantidad || 0);
            } else if (pago.estado === "En revisión") {
              categories[categoria].enRevision += (pago.cantidad || 0);
            } else {
              categories[categoria].pendiente += importe;
            }
          } else {
            categories[categoria].pendiente += importe;
          }
        });
      }
    });

// Normalización final para evitar tasas > 100% si los importes cobrados superan el esperado teórico
const normalized = Object.values(categories).map(c => {
  const sumActual = (c.cobrado || 0) + (c.enRevision || 0) + (c.pendiente || 0);
  const esperadoAjustado = Math.max(c.esperado || 0, sumActual);
  const pendienteAjustado = Math.max(0, esperadoAjustado - ((c.cobrado || 0) + (c.enRevision || 0)));
  return {
    ...c,
    esperado: esperadoAjustado,
    pendiente: pendienteAjustado,
  };
});

return normalized.sort((a, b) => b.esperado - a.esperado);
}, [players, payments, activeSeason, getImportePorMes]);

  const chartData = categoryStats.map(c => ({
    name: c.nombre.replace('Fútbol ', '').replace(' (Mixto)', ''),
    Cobrado: c.cobrado,
    Pendiente: c.pendiente,
    EnRevision: c.enRevision
  }));

  return (
    <div className="space-y-4">
      {/* Gráfico */}
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <BarChart className="w-5 h-5 text-purple-600" />
            Ingresos por Categoría Deportiva
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={300}>
            <ReBarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number"
                tickFormatter={(value) => `${formatCurrency(value)}€`}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Cobrado" fill="#22c55e" stackId="a" />
              <Bar dataKey="EnRevision" fill="#f59e0b" stackId="a" />
              <Bar dataKey="Pendiente" fill="#ef4444" stackId="a" />
            </ReBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla Detallada */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Detalle por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map((cat, index) => {
              const tasaCobro = cat.esperado > 0 ? ((cat.cobrado / cat.esperado) * 100) : 0;
              
              return (
                <div key={cat.nombre} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-10 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <div>
                        <h3 className="font-bold text-slate-900">{cat.nombre}</h3>
                        <p className="text-xs text-slate-500">{cat.jugadores} jugadores</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Tasa de cobro</p>
                      <p className={`text-xl font-bold ${tasaCobro >= 80 ? 'text-green-700' : tasaCobro >= 50 ? 'text-orange-700' : 'text-red-700'}`}>
                        {tasaCobro.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <Progress value={tasaCobro} className="h-2" />
                  </div>

                  {/* Desglose */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-green-50 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-slate-600">Cobrado</p>
                      <p className="font-bold text-green-700 text-sm md:text-base">{formatCurrency(cat.cobrado)}€</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-slate-600">En Revisión</p>
                      <p className="font-bold text-orange-700 text-sm md:text-base">{formatCurrency(cat.enRevision)}€</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-[10px] md:text-xs text-slate-600">Pendiente</p>
                      <p className="font-bold text-red-700 text-sm md:text-base">{formatCurrency(cat.pendiente)}€</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}