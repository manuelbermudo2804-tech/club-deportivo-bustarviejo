import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, Award, Users } from "lucide-react";

export default function SeasonComparison({ open, onClose, currentSeason, allSeasons }) {
  const { data: allPayments = [] } = useQuery({
    queryKey: ['allPayments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allClothing = [] } = useQuery({
    queryKey: ['allClothing'],
    queryFn: () => base44.entities.ClothingOrder.list(),
  });

  const { data: allLottery = [] } = useQuery({
    queryKey: ['allLottery'],
    queryFn: () => base44.entities.LotteryOrder.list(),
  });

  const { data: allMembers = [] } = useQuery({
    queryKey: ['allMembers'],
    queryFn: () => base44.entities.ClubMember.list(),
  });

  const comparisonData = useMemo(() => {
    const seasons = allSeasons
      .filter(s => s.temporada)
      .sort((a, b) => b.temporada.localeCompare(a.temporada))
      .slice(0, 3);

    return seasons.map(season => {
      const seasonPayments = allPayments.filter(p => p.temporada === season.temporada && p.is_deleted !== true);
      const seasonPlayers = allPlayers.filter(p => p.activo === true);
      const seasonClothing = allClothing.filter(o => o.temporada === season.temporada);
      const seasonLottery = allLottery.filter(o => o.temporada === season.temporada);
      const seasonMembers = allMembers.filter(m => m.temporada === season.temporada);

      const ingresoCuotas = seasonPayments.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0);
      const ingresoRopa = seasonClothing.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.precio_final || 0), 0);
      const ingresoLoteria = seasonLottery.filter(o => o.pagado === true).reduce((sum, o) => sum + (o.total || 0), 0);
      const ingresoSocios = seasonMembers.filter(m => m.estado_pago === "Pagado").reduce((sum, m) => sum + (m.cuota_pagada || 0), 0);

      const totalIngresos = ingresoCuotas + ingresoRopa + ingresoLoteria + ingresoSocios;
      const playerCount = seasonPlayers.length;

      return {
        temporada: season.temporada,
        totalIngresos,
        ingresoCuotas,
        ingresoRopa,
        ingresoLoteria,
        ingresoSocios,
        playerCount,
        ingresoMedio: playerCount > 0 ? totalIngresos / playerCount : 0,
      };
    });
  }, [allSeasons, allPayments, allPlayers, allClothing, allLottery, allMembers]);

  if (comparisonData.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Comparación entre Temporadas</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-center py-8">No hay suficientes datos para comparar temporadas</p>
        </DialogContent>
      </Dialog>
    );
  }

  const currentSeasonData = comparisonData[0];
  const previousSeasonData = comparisonData[1];

  const growthRate = previousSeasonData 
    ? ((currentSeasonData.totalIngresos - previousSeasonData.totalIngresos) / previousSeasonData.totalIngresos) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">📊 Comparación entre Temporadas</DialogTitle>
        </DialogHeader>

        {/* Resumen de crecimiento */}
        {previousSeasonData && (
          <Card className={`border-2 ${growthRate >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {growthRate >= 0 ? (
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <p className="text-sm text-slate-600">Crecimiento vs temporada anterior</p>
                    <p className={`text-3xl font-bold ${growthRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Diferencia absoluta</p>
                  <p className={`text-2xl font-bold ${growthRate >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {growthRate >= 0 ? '+' : ''}{(currentSeasonData.totalIngresos - previousSeasonData.totalIngresos).toFixed(2)}€
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comparativa de ingresos totales */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              💰 Ingresos Totales por Temporada
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="temporada" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Bar dataKey="totalIngresos" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Desglose por concepto */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">📋 Desglose por Concepto</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="temporada" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                <Legend />
                <Bar dataKey="ingresoCuotas" fill="#3b82f6" name="Cuotas" />
                <Bar dataKey="ingresoRopa" fill="#f97316" name="Ropa" />
                <Bar dataKey="ingresoLoteria" fill="#22c55e" name="Lotería" />
                <Bar dataKey="ingresoSocios" fill="#6366f1" name="Socios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparativa jugadores e ingreso medio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Jugadores por Temporada
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temporada" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="playerCount" stroke="#3b82f6" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Ingreso Medio por Jugador
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="temporada" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                  <Line type="monotone" dataKey="ingresoMedio" stroke="#a855f7" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabla resumen */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-bold mb-4">📊 Tabla Comparativa</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="p-3 text-left">Temporada</th>
                    <th className="p-3 text-right">Jugadores</th>
                    <th className="p-3 text-right">Cuotas</th>
                    <th className="p-3 text-right">Ropa</th>
                    <th className="p-3 text-right">Lotería</th>
                    <th className="p-3 text-right">Socios</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-right">Medio/Jugador</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((season, idx) => (
                    <tr key={season.temporada} className={idx === 0 ? "bg-green-50 font-semibold" : ""}>
                      <td className="p-3">
                        {season.temporada}
                        {idx === 0 && <Badge className="ml-2 bg-green-600">Actual</Badge>}
                      </td>
                      <td className="p-3 text-right">{season.playerCount}</td>
                      <td className="p-3 text-right">{season.ingresoCuotas.toFixed(2)}€</td>
                      <td className="p-3 text-right">{season.ingresoRopa.toFixed(2)}€</td>
                      <td className="p-3 text-right">{season.ingresoLoteria.toFixed(2)}€</td>
                      <td className="p-3 text-right">{season.ingresoSocios.toFixed(2)}€</td>
                      <td className="p-3 text-right font-bold text-green-700">{season.totalIngresos.toFixed(2)}€</td>
                      <td className="p-3 text-right text-purple-700">{season.ingresoMedio.toFixed(2)}€</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}