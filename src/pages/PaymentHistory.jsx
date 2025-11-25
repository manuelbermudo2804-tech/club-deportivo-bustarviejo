import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FileText, Calendar, TrendingUp, Archive } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PaymentHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");

  const { data: paymentHistory, isLoading } = useQuery({
    queryKey: ['paymentHistory'],
    queryFn: () => base44.entities.PaymentHistory.list('-archivado_fecha'),
    initialData: [],
  });

  const filteredHistory = paymentHistory.filter(payment => {
    const matchesSearch = 
      payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.mes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeason = seasonFilter === "all" || payment.temporada === seasonFilter;
    return matchesSearch && matchesSeason;
  });

  // Obtener temporadas únicas
  const seasons = [...new Set(paymentHistory.map(p => p.temporada))].sort().reverse();

  // Estadísticas por temporada
  const seasonStats = seasons.map(season => {
    const seasonPayments = paymentHistory.filter(p => p.temporada === season);
    const paid = seasonPayments.filter(p => p.estado === "Pagado");
    const totalAmount = paid.reduce((sum, p) => sum + (p.cantidad || 0), 0);
    return {
      season,
      total: seasonPayments.length,
      paid: paid.length,
      amount: totalAmount
    };
  });

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  const paymentsByPlayerSeason = filteredHistory.reduce((acc, payment) => {
    const key = `${payment.jugador_id}-${payment.temporada}`;
    if (!acc[key]) {
      acc[key] = {
        jugador_id: payment.jugador_id,
        jugador_nombre: payment.jugador_nombre,
        temporada: payment.temporada,
        payments: [],
        total: 0,
      };
    }
    acc[key].payments.push(payment);
    if (payment.estado === 'Pagado') {
      acc[key].total += payment.cantidad || 0;
    }
    return acc;
  }, {});

  const playerSummaries = Object.values(paymentsByPlayerSeason).sort((a,b) => b.temporada.localeCompare(a.temporada) || a.jugador_nombre.localeCompare(b.jugador_nombre));

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Histórico de Pagos</h1>
        <p className="text-slate-600 mt-1">Consulta pagos de temporadas anteriores agrupados por jugador</p>
      </div>

      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl">Filtros</CardTitle>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por jugador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={seasonFilter} onValueChange={setSeasonFilter} className="w-full md:w-auto">
                <TabsList className="bg-white border">
                  <TabsTrigger value="all">Todas las temporadas</TabsTrigger>
                  {seasons.map(season => (
                    <TabsTrigger key={season} value={season}>{season}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {isLoading ? (
        <div className="p-6 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : playerSummaries.length === 0 ? (
        <div className="text-center py-12">
          <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No se encontraron pagos archivados para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="space-y-6">
          {playerSummaries.map(summary => (
            <Card key={`${summary.jugador_id}-${summary.temporada}`} className="border-none shadow-lg">
              <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{summary.jugador_nombre}</CardTitle>
                  <p className="text-sm text-slate-500">Temporada {summary.temporada}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-green-600">Total Pagado</p>
                    <p className="text-2xl font-bold text-green-700">{summary.total.toFixed(2)}€</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Archivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{payment.mes}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.tipo_pago}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">{payment.cantidad}€</TableCell>
                        <TableCell>
                          {payment.metodo_pago && <Badge variant="outline">{payment.metodo_pago}</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            payment.estado === "Pagado" ? "bg-green-100 text-green-700" :
                            payment.estado === "En revisión" ? "bg-orange-100 text-orange-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {statusEmojis[payment.estado]} {payment.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.archivado_fecha ? new Date(payment.archivado_fecha).toLocaleDateString('es-ES') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}