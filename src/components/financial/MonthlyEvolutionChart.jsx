import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

export default function MonthlyEvolutionChart({ payments, clothingOrders, lotteryOrders, clubMembers, sponsors, activeSeason }) {
  const monthlyData = useMemo(() => {
    if (!activeSeason) return [];

    const months = [
      { key: 'jun', label: 'Jun', fullName: 'Junio' },
      { key: 'jul', label: 'Jul', fullName: 'Julio' },
      { key: 'ago', label: 'Ago', fullName: 'Agosto' },
      { key: 'sep', label: 'Sep', fullName: 'Septiembre' },
      { key: 'oct', label: 'Oct', fullName: 'Octubre' },
      { key: 'nov', label: 'Nov', fullName: 'Noviembre' },
      { key: 'dic', label: 'Dic', fullName: 'Diciembre' },
      { key: 'ene', label: 'Ene', fullName: 'Enero' },
      { key: 'feb', label: 'Feb', fullName: 'Febrero' },
      { key: 'mar', label: 'Mar', fullName: 'Marzo' },
      { key: 'abr', label: 'Abr', fullName: 'Abril' },
      { key: 'may', label: 'May', fullName: 'Mayo' }
    ];

    const currentSeasonPayments = payments.filter(p => p.temporada === activeSeason.temporada && p.is_deleted !== true && p.estado === "Pagado");
    const currentSeasonClothing = clothingOrders.filter(o => o.temporada === activeSeason.temporada && o.pagado === true);
    const currentSeasonLottery = lotteryOrders.filter(o => o.temporada === activeSeason.temporada && o.pagado === true);
    const currentSeasonMembers = clubMembers.filter(m => m.temporada === activeSeason.temporada && m.estado_pago === "Pagado");
    const currentSeasonSponsors = sponsors.filter(s => s.estado === "Activo" && s.temporada === activeSeason.temporada);

    return months.map(month => {
      // Pagos de cuotas por mes
      const cuotasMes = currentSeasonPayments
        .filter(p => p.mes === month.fullName || (p.fecha_pago && new Date(p.fecha_pago).getMonth() === months.findIndex(m => m.key === month.key)))
        .reduce((sum, p) => sum + (p.cantidad || 0), 0);

      // Ropa por mes (fecha_pago)
      const ropaMes = currentSeasonClothing
        .filter(o => o.fecha_pago && new Date(o.fecha_pago).getMonth() === months.findIndex(m => m.key === month.key))
        .reduce((sum, o) => sum + (o.precio_final || 0), 0);

      // Lotería por mes
      const loteriaMes = currentSeasonLottery
        .filter(o => o.fecha_pago && new Date(o.fecha_pago).getMonth() === months.findIndex(m => m.key === month.key))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      // Socios por mes
      const sociosMes = currentSeasonMembers
        .filter(m => m.fecha_pago && new Date(m.fecha_pago).getMonth() === months.findIndex(m => m.key === month.key))
        .reduce((sum, m) => sum + (m.cuota_pagada || 0), 0);

      // Patrocinios (distribuir por meses si tienen fecha)
      const patrociniosMes = currentSeasonSponsors
        .filter(s => !s.fecha_inicio || (s.fecha_inicio && new Date(s.fecha_inicio).getMonth() === months.findIndex(m => m.key === month.key)))
        .reduce((sum, s) => sum + (s.monto || 0), 0);

      const total = cuotasMes + ropaMes + loteriaMes + sociosMes + patrociniosMes;

      return {
        mes: month.label,
        Cuotas: cuotasMes,
        Ropa: ropaMes,
        Lotería: loteriaMes,
        Socios: sociosMes,
        Patrocinios: patrociniosMes,
        Total: total
      };
    });
  }, [payments, clothingOrders, lotteryOrders, clubMembers, sponsors, activeSeason]);

  const totalIngresos = monthlyData.reduce((sum, m) => sum + m.Total, 0);
  const promedioMensual = totalIngresos / 12;

  const formatCurrency = (value) => {
    const num = Math.abs(value);
    if (num >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  return (
    <Card className="border-none shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg md:text-xl">Evolución Mensual de Ingresos</CardTitle>
              <p className="text-xs md:text-sm text-slate-600 mt-1">
                Promedio: <span className="font-bold text-blue-700">{formatCurrency(promedioMensual)}€/mes</span>
              </p>
            </div>
          </div>
          <Badge className="bg-blue-600 text-white w-fit">
            Total: {formatCurrency(totalIngresos)}€
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="mes" 
              stroke="#64748b"
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              stroke="#64748b"
              tickFormatter={(value) => `${formatCurrency(value)}€`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€`}
              contentStyle={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
            <Line type="monotone" dataKey="Cuotas" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Ropa" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Lotería" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Socios" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Patrocinios" stroke="#a855f7" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}