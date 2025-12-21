import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Users, TrendingUp, BarChart } from "lucide-react";

const COLORS = ['#3b82f6', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];

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
      
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );

      const allMonths = ["Junio", "Septiembre", "Diciembre"];

      if (hasPagoUnico) {
        const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
        categories[categoria].esperado += pagoUnico.cantidad || 0;
        if (pagoUnico.estado === "Pagado") {
          categories[categoria].cobrado += pagoUnico.cantidad || 0;
        } else if (pagoUnico.estado === "En revisión") {
          categories[categoria].enRevision += pagoUnico.cantidad || 0;
        }
      } else {
        allMonths.forEach(mes => {
          const importe = getImportePorMes(player.deporte, mes);
          categories[categoria].esperado += importe;

          const pago = playerPayments.find(p => p.mes === mes);
          if (pago) {
            if (pago.estado === "Pagado") {
              categories[categoria].cobrado += pago.cantidad || 0;
            } else if (pago.estado === "En revisión") {
              categories[categoria].enRevision += pago.cantidad || 0;
            }
          } else {
            categories[categoria].pendiente += importe;
          }
        });
      }
    });

    return Object.values(categories).sort((a, b) => b.esperado - a.esperado);
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
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
              <Legend />
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
                      <p className="text-xs text-slate-600">Cobrado</p>
                      <p className="font-bold text-green-700">{cat.cobrado.toFixed(0)}€</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2">
                      <p className="text-xs text-slate-600">En Revisión</p>
                      <p className="font-bold text-orange-700">{cat.enRevision.toFixed(0)}€</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-2">
                      <p className="text-xs text-slate-600">Pendiente</p>
                      <p className="font-bold text-red-700">{cat.pendiente.toFixed(0)}€</p>
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