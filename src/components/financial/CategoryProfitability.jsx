import React, { useMemo } from "react";
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
        p.temporada === activeSeason?.temporada
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
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Rentabilidad por Categoría Deportiva
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
            <Legend />
            <Bar dataKey="ingresos" fill="#22c55e" name="Ingresos" />
            <Bar dataKey="gastos" fill="#ef4444" name="Gastos" />
            <Bar dataKey="beneficio" name="Beneficio Neto">
              {categoryData.map((entry, index) => (
                <Cell key={index} fill={entry.beneficio >= 0 ? "#3b82f6" : "#f97316"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-3">
          {categoryData.map(cat => (
            <div key={cat.categoria} className="border-2 rounded-xl p-4 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between mb-2">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
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