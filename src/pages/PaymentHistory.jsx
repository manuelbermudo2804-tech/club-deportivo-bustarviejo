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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Histórico de Pagos</h1>
        <p className="text-slate-600 mt-1">Consulta pagos de temporadas anteriores</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-gradient-to-br from-orange-500 to-orange-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Total Archivado</p>
                <p className="text-3xl font-bold">{paymentHistory.length}</p>
              </div>
              <Archive className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-green-500 to-green-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Temporadas</p>
                <p className="text-3xl font-bold">{seasons.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Total Recaudado</p>
                <p className="text-3xl font-bold">
                  {paymentHistory.filter(p => p.estado === "Pagado").reduce((sum, p) => sum + (p.cantidad || 0), 0)}€
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen por Temporada */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {seasonStats.map(stat => (
          <Card key={stat.season} className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{stat.season}</span>
                <Badge className="bg-orange-100 text-orange-700">
                  {stat.paid}/{stat.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Total Pagos:</span>
                  <span className="font-semibold">{stat.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Pagados:</span>
                  <span className="font-semibold text-green-600">{stat.paid}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-600">Recaudado:</span>
                  <span className="font-bold text-lg text-slate-900">{stat.amount}€</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl">Detalle de Pagos Archivados</CardTitle>
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={seasonFilter} onValueChange={setSeasonFilter} className="w-full md:w-auto">
                <TabsList className="bg-white border">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  {seasons.slice(0, 3).map(season => (
                    <TabsTrigger key={season} value={season}>{season}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12">
              <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron pagos archivados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Justificante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Archivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium text-orange-700">
                        {payment.temporada}
                      </TableCell>
                      <TableCell className="font-medium">{payment.jugador_nombre}</TableCell>
                      <TableCell>{payment.mes}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {payment.tipo_pago}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {payment.cantidad}€
                      </TableCell>
                      <TableCell>
                        {payment.metodo_pago && (
                          <Badge variant="outline" className="text-xs">
                            {payment.metodo_pago}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.justificante_url ? (
                          <a
                            href={payment.justificante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">Ver</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          payment.estado === "Pagado" 
                            ? "bg-green-100 text-green-700" 
                            : payment.estado === "En revisión"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-red-100 text-red-700"
                        }>
                          <span className="mr-1">{statusEmojis[payment.estado]}</span>
                          {payment.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {payment.archivado_fecha ? 
                          new Date(payment.archivado_fecha).toLocaleDateString('es-ES') 
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}