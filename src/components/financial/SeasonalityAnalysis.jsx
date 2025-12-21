import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp } from "lucide-react";

export default function SeasonalityAnalysis({ payments, activeSeason }) {
  const monthlyPaymentData = useMemo(() => {
    const months = ['Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo'];
    
    return months.map(mes => {
      const monthPayments = payments.filter(p => 
        p.estado === "Pagado" && 
        p.temporada === activeSeason?.temporada &&
        p.fecha_pago
      );

      const pagosEnMes = monthPayments.filter(p => {
        const paymentMonth = new Date(p.fecha_pago).toLocaleString('es-ES', { month: 'long' });
        return paymentMonth.charAt(0).toUpperCase() + paymentMonth.slice(1) === mes;
      });

      const cantidad = pagosEnMes.reduce((sum, p) => sum + (p.cantidad || 0), 0);
      const numeroPagos = pagosEnMes.length;

      return {
        mes,
        cantidad,
        numeroPagos,
        promedio: numeroPagos > 0 ? cantidad / numeroPagos : 0
      };
    });
  }, [payments, activeSeason]);

  const mejorMes = monthlyPaymentData.reduce((max, m) => m.cantidad > max.cantidad ? m : max, monthlyPaymentData[0]);
  const peorMes = monthlyPaymentData.reduce((min, m) => m.cantidad < min.cantidad && m.cantidad > 0 ? m : min, monthlyPaymentData[0]);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-cyan-600" />
          Análisis de Estacionalidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
            <p className="text-xs text-green-600 font-medium mb-1">🏆 Mejor Mes</p>
            <p className="text-xl font-bold text-green-700">{mejorMes?.mes}</p>
            <p className="text-sm text-slate-600">{mejorMes?.cantidad.toFixed(2)}€</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-200">
            <p className="text-xs text-orange-600 font-medium mb-1">📉 Mes más Bajo</p>
            <p className="text-xl font-bold text-orange-700">{peorMes?.mes}</p>
            <p className="text-sm text-slate-600">{peorMes?.cantidad.toFixed(2)}€</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={monthlyPaymentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" angle={-45} textAnchor="end" height={80} />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="cantidad" fill="#22c55e" name="Cantidad Cobrada (€)" />
            <Bar yAxisId="right" dataKey="numeroPagos" fill="#3b82f6" name="Nº Pagos" />
          </BarChart>
        </ResponsiveContainer>

        <div className="bg-cyan-50 border-2 border-cyan-200 rounded-xl p-4">
          <p className="font-bold text-cyan-900 mb-2">💡 Patrones Identificados</p>
          <ul className="space-y-1 text-sm text-cyan-800">
            <li>• <strong>Picos de cobro:</strong> Junio (inscripciones) y Septiembre (inicio temporada)</li>
            <li>• <strong>Meses bajos:</strong> Agosto (vacaciones) y Diciembre-Enero (Navidad)</li>
            <li>• <strong>Recomendación:</strong> Intensificar recordatorios antes de meses de baja actividad</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}