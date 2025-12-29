import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Line, Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

export default function CashFlowAnalysis({ payments, transactions, clothingOrders, lotteryOrders, clubMembers, sponsors, activeSeason }) {
  const monthlyData = useMemo(() => {
    const months = ['Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'];
    
    return months.map(mes => {
      // Ingresos
      const cuotas = payments.filter(p => 
        p.mes === mes && 
        p.estado === "Pagado" && 
        p.temporada === activeSeason?.temporada
      ).reduce((sum, p) => sum + (p.cantidad || 0), 0);

      const ropa = clothingOrders.filter(o => {
        if (!o.fecha_pago || o.temporada !== activeSeason?.temporada) return false;
        const month = new Date(o.fecha_pago).toLocaleString('es-ES', { month: 'long' });
        return month.charAt(0).toUpperCase() + month.slice(1) === mes;
      }).reduce((sum, o) => sum + (o.precio_final || 0), 0);

      const loteria = lotteryOrders.filter(o => {
        if (!o.fecha_pago || o.temporada !== activeSeason?.temporada) return false;
        const month = new Date(o.fecha_pago).toLocaleString('es-ES', { month: 'long' });
        return month.charAt(0).toUpperCase() + month.slice(1) === mes;
      }).reduce((sum, o) => sum + (o.total || 0), 0);

      const socios = clubMembers.filter(m => {
        if (!m.fecha_pago || m.temporada !== activeSeason?.temporada) return false;
        const month = new Date(m.fecha_pago).toLocaleString('es-ES', { month: 'long' });
        return month.charAt(0).toUpperCase() + month.slice(1) === mes;
      }).reduce((sum, m) => sum + (m.cuota_pagada || 0), 0);

      // Gastos
      const gastos = transactions.filter(t => {
        if (t.tipo !== "Gasto" || !t.fecha) return false;
        const month = new Date(t.fecha).toLocaleString('es-ES', { month: 'long' });
        return month.charAt(0).toUpperCase() + month.slice(1) === mes;
      }).reduce((sum, t) => sum + (t.cantidad || 0), 0);

      const ingresos = cuotas + ropa + loteria + socios;
      const flujo = ingresos - gastos;

      return {
        mes,
        ingresos,
        gastos,
        flujo,
        cuotas,
        ropa,
        loteria,
        socios
      };
    });
  }, [payments, transactions, clothingOrders, lotteryOrders, clubMembers, activeSeason]);

  const totalIngresos = monthlyData.reduce((sum, m) => sum + m.ingresos, 0);
  const totalGastos = monthlyData.reduce((sum, m) => sum + m.gastos, 0);
  const flujoNeto = totalIngresos - totalGastos;

  const formatCurrency = (value) => {
    const num = Math.abs(value);
    if (num >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Flujo de Caja Mensual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resumen */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-green-50 rounded-xl p-3 md:p-4 text-center border-2 border-green-200">
            <p className="text-[10px] md:text-xs text-green-600 font-medium mb-1">Total Ingresos</p>
            <p className="text-lg md:text-2xl font-bold text-green-700">
              +{formatCurrency(totalIngresos)}€
            </p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 md:p-4 text-center border-2 border-red-200">
            <p className="text-[10px] md:text-xs text-red-600 font-medium mb-1">Total Gastos</p>
            <p className="text-lg md:text-2xl font-bold text-red-700">
              -{formatCurrency(totalGastos)}€
            </p>
          </div>
          <div className={`rounded-xl p-3 md:p-4 text-center border-2 ${
            flujoNeto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'
          }`}>
            <p className={`text-[10px] md:text-xs font-medium mb-1 ${flujoNeto >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Flujo Neto
            </p>
            <p className={`text-lg md:text-2xl font-bold ${flujoNeto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {flujoNeto >= 0 ? '+' : ''}{formatCurrency(flujoNeto)}€
            </p>
          </div>
        </div>

        {/* Gráfico flujo mensual */}
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="mes" 
              angle={-45} 
              textAnchor="end" 
              height={80}
              tick={{ fontSize: 11 }}
            />
            <YAxis 
              tickFormatter={(value) => `${formatCurrency(value)}€`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip 
              formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
            <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
            <Line type="monotone" dataKey="flujo" stroke="#3b82f6" strokeWidth={3} name="Flujo Neto" />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Desglose de ingresos */}
        <div>
          <h4 className="font-bold text-slate-900 mb-3">Desglose de Ingresos por Mes</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mes" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tickFormatter={(value) => `${formatCurrency(value)}€`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value) => `${value.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}€`}
                contentStyle={{ fontSize: 12 }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="cuotas" stackId="a" fill="#3b82f6" name="Cuotas" />
              <Bar dataKey="ropa" stackId="a" fill="#f97316" name="Ropa" />
              <Bar dataKey="loteria" stackId="a" fill="#22c55e" name="Lotería" />
              <Bar dataKey="socios" stackId="a" fill="#6366f1" name="Socios" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}