import React, { useMemo } from "react";
import { sameSeason } from "@/lib/sameSeason";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default function CategoryProfitability({ payments, transactions, players, activeSeason }) {
  const categoryData = useMemo(() => {
    const categories = {};

    // Calcular ingresos por categoría
    players.filter(p => p.activo).forEach(player => {
      const cat = player.deporte;
      if (!categories[cat]) {
        categories[cat] = { 
          categoria: cat, 
          ingresos: 0, 
          gastos: 0, 
          jugadores: 0 
        };
      }
      categories[cat].jugadores++;

      const playerPayments = payments.filter(p => 
        p.jugador_id === player.id && 
        p.estado === "Pagado" &&
        sameSeason(p.temporada, activeSeason?.temporada)
      );
      categories[cat].ingresos += playerPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);
    });

    // Calcular gastos por categoría (si hay transacciones con categoría deportiva)
    transactions.filter(t => t.tipo === "Gasto" && t.categoria_deportiva).forEach(t => {
      if (categories[t.categoria_deportiva]) {
        categories[t.categoria_deportiva].gastos += t.cantidad || 0;
      }
    });

    return Object.values(categories).map(cat => ({
      ...cat,
      beneficio: cat.ingresos - cat.gastos,
      margen: cat.ingresos > 0 ? ((cat.ingresos - cat.gastos) / cat.ingresos) * 100 : 0,
      ingresoPorJugador: cat.jugadores > 0 ? cat.ingresos / cat.jugadores : 0
    })).sort((a, b) => b.beneficio - a.beneficio);
  }, [payments, transactions, players, activeSeason]);

  return (
    <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <CardHeader className="space-y-1 p-4 sm:p-6">
        <CardTitle className="flex min-w-0 items-start gap-2 text-base leading-snug sm:text-lg">
          <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <span>Rentabilidad por Categoría Deportiva</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4 p-3 sm:space-y-6 sm:p-6">
        <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-100 bg-white p-1 sm:p-3">
          <ResponsiveContainer width="100%" height={categoryData.length > 6 ? 390 : 320}>
            <BarChart data={categoryData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="categoria" interval={0} tick={{ fontSize: 11 }} tickMargin={10} angle={categoryData.length > 4 ? -35 : 0} textAnchor={categoryData.length > 4 ? "end" : "middle"} height={categoryData.length > 4 ? 100 : 42} />
              <YAxis width={48} tick={{ fontSize: 11 }} tickFormatter={(value) => value.toLocaleString("es-ES", { maximumFractionDigits: 0 })} />
              <Tooltip formatter={(value) => `${Number(value || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[3, 3, 0, 0]} />
              <Bar dataKey="beneficio" name="Beneficio Neto" radius={[3, 3, 0, 0]}>
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={entry.beneficio >= 0 ? "#3b82f6" : "#f97316"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {categoryData.map(cat => (
            <div key={cat.categoria} className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3 sm:p-4">
              <div className="mb-2 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900">{cat.categoria}</h4>
                  <Badge variant="outline">{cat.jugadores} jugadores</Badge>
                </div>
                <div className="flex items-center gap-2">
                  {cat.beneficio >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-xl font-bold ${cat.beneficio >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {cat.beneficio >= 0 ? '+' : ''}{cat.beneficio.toFixed(2)}€
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-slate-600">Ingresos</p>
                  <p className="font-bold text-green-700">{cat.ingresos.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-slate-600">Gastos</p>
                  <p className="font-bold text-red-700">{cat.gastos.toFixed(2)}€</p>
                </div>
                <div>
                  <p className="text-slate-600">Margen</p>
                  <p className={`font-bold ${cat.margen >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                    {cat.margen.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-slate-600">Ingreso/Jugador</p>
                  <p className="font-bold text-purple-700">{cat.ingresoPorJugador.toFixed(2)}€</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}