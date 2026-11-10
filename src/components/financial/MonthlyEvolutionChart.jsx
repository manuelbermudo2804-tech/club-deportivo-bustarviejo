import React, { useMemo } from "react";
import { sameSeason } from "@/lib/sameSeason";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { getPaymentCollected } from "@/components/payments/paymentHelpers";

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

    const t = activeSeason.temporada;
    // Índice del mes en la temporada (junio = 0 ... mayo = 11), o -1 si no hay fecha válida
    const idxOf = (date) => {
      if (!date) return -1;
      const d = new Date(date);
      return isNaN(d) ? -1 : (d.getMonth() + 7) % 12;
    };
    const paymentIdx = (p) => {
      const byDate = idxOf(p.fecha_pago);
      if (byDate >= 0) return byDate;
      const byName = months.findIndex(m => m.fullName === p.mes);
      return byName >= 0 ? byName : idxOf(p.created_date);
    };

    const totals = months.map(() => ({ Cuotas: 0, Ropa: 0, Lotería: 0, Socios: 0, Patrocinios: 0 }));
    const add = (i, key, amount) => { if (i >= 0) totals[i][key] += Number(amount) || 0; };

    payments
      .filter(p => sameSeason(p.temporada, t) && p.is_deleted !== true)
      .forEach(p => add(paymentIdx(p), 'Cuotas', getPaymentCollected(p)));
    clothingOrders
      .filter(o => sameSeason(o.temporada, t) && o.pagado === true)
      .forEach(o => add(idxOf(o.fecha_pago || o.created_date), 'Ropa', o.precio_final));
    lotteryOrders
      .filter(o => sameSeason(o.temporada, t) && o.pagado === true)
      .forEach(o => add(idxOf(o.fecha_pago || o.created_date), 'Lotería', o.total));
    clubMembers
      .filter(m => sameSeason(m.temporada, t) && m.estado_pago === "Pagado")
      .forEach(m => add(idxOf(m.fecha_pago || m.created_date), 'Socios', m.cuota_pagada));
    sponsors.forEach(s => (s.pagos_temporadas || [])
      .filter(x => sameSeason(x.temporada, t))
      .forEach(x => add(idxOf(x.fecha_pago), 'Patrocinios', x.importe)));

    return months.map((month, i) => {
      const r = totals[i];
      return { mes: month.label, ...r, Total: r.Cuotas + r.Ropa + r.Lotería + r.Socios + r.Patrocinios };
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