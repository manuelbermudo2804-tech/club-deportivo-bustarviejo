import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

export default function IncomeDistributionPie({ stats }) {
  const data = [
    { name: 'Cuotas', value: stats.cuotasPagadas, color: '#3b82f6' },
    { name: 'Ropa', value: stats.ropaPagada, color: '#f97316' },
    { name: 'Lotería', value: stats.loteriaPagada, color: '#22c55e' },
    { name: 'Socios', value: stats.sociosPagados, color: '#6366f1' },
    { name: 'Patrocinios', value: stats.patrociniosTotal, color: '#a855f7' },
  ].filter(d => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-purple-600" />
          Distribución de Ingresos Cobrados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-slate-600">Total Cobrado</p>
              <p className="text-3xl font-bold text-slate-900">{total.toFixed(2)}€</p>
            </div>
            {data.map(item => (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{item.value.toFixed(2)}€</p>
                  <p className="text-xs text-slate-500">
                    {((item.value / total) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}