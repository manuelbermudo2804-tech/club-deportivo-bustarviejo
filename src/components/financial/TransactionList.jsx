import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  FileText, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Filter,
  Download,
  Trash2
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function TransactionList({ 
  transactions = [], 
  onDelete,
  onExport 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");
  const [filterTipoDoc, setFilterTipoDoc] = useState("all");
  const [filterSubtipoDoc, setFilterSubtipoDoc] = useState("all");

  const categorias = [...new Set(transactions.map(t => t.categoria))].filter(Boolean);
  const tiposDocumento = [...new Set(transactions.map(t => t.tipo_documento))].filter(Boolean);
  const subtiposDocumento = [...new Set(transactions.map(t => t.subtipo_documento))].filter(Boolean);

  const filteredTransactions = transactions.filter(t => {
    const matchSearch = !searchTerm || 
      t.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.proveedor_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.numero_factura?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.palabras_clave?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchTipo = filterTipo === "all" || t.tipo === filterTipo;
    const matchCategoria = filterCategoria === "all" || t.categoria === filterCategoria;
    const matchEstado = filterEstado === "all" || t.estado === filterEstado;
    const matchTipoDoc = filterTipoDoc === "all" || t.tipo_documento === filterTipoDoc;
    const matchSubtipoDoc = filterSubtipoDoc === "all" || t.subtipo_documento === filterSubtipoDoc;

    return matchSearch && matchTipo && matchCategoria && matchEstado && matchTipoDoc && matchSubtipoDoc;
  });

  const totales = {
    ingresos: filteredTransactions.filter(t => t.tipo === "Ingreso").reduce((sum, t) => sum + (t.cantidad || 0), 0),
    gastos: filteredTransactions.filter(t => t.tipo === "Gasto").reduce((sum, t) => sum + (t.cantidad || 0), 0)
  };

  const getEstadoBadge = (estado, tipo) => {
    const colors = {
      "Pendiente": "bg-yellow-100 text-yellow-800",
      "Pagado": "bg-green-100 text-green-800",
      "Cobrado": "bg-green-100 text-green-800",
      "Anulado": "bg-slate-100 text-slate-800"
    };
    return colors[estado] || "bg-slate-100 text-slate-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Movimientos Financieros
            <Badge variant="outline">{filteredTransactions.length}</Badge>
          </CardTitle>
          <Button variant="outline" onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por concepto, proveedor, factura..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ingreso">Ingresos</SelectItem>
              <SelectItem value="Gasto">Gastos</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Pendiente">Pendiente</SelectItem>
              <SelectItem value="Pagado">Pagado</SelectItem>
              <SelectItem value="Cobrado">Cobrado</SelectItem>
              <SelectItem value="Anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>

          {tiposDocumento.length > 0 && (
            <Select value={filterTipoDoc} onValueChange={setFilterTipoDoc}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Tipo Doc." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los docs.</SelectItem>
                {tiposDocumento.map(tipo => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {subtiposDocumento.length > 0 && (
            <Select value={filterSubtipoDoc} onValueChange={setFilterSubtipoDoc}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Subtipo Doc." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos subtipos</SelectItem>
                {subtiposDocumento.map(subtipo => (
                  <SelectItem key={subtipo} value={subtipo}>{subtipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Resumen rápido */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 font-medium">Ingresos</p>
            <p className="text-lg font-bold text-green-700">+{totales.ingresos.toLocaleString()}€</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 font-medium">Gastos</p>
            <p className="text-lg font-bold text-red-700">-{totales.gastos.toLocaleString()}€</p>
          </div>
          <div className={`rounded-lg p-3 text-center ${totales.ingresos - totales.gastos >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
            <p className={`text-xs font-medium ${totales.ingresos - totales.gastos >= 0 ? "text-blue-600" : "text-orange-600"}`}>Balance</p>
            <p className={`text-lg font-bold ${totales.ingresos - totales.gastos >= 0 ? "text-blue-700" : "text-orange-700"}`}>
              {(totales.ingresos - totales.gastos).toLocaleString()}€
            </p>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Proveedor/Cliente</TableHead>
                <TableHead className="text-right">Importe</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Doc.</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    No hay movimientos que coincidan con los filtros
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">
                      {t.fecha ? format(new Date(t.fecha), "dd/MM/yy", { locale: es }) : "-"}
                    </TableCell>
                    <TableCell>
                      {t.tipo === "Ingreso" ? (
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Ingreso
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Gasto
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{t.concepto}</p>
                        {t.numero_factura && (
                          <p className="text-xs text-slate-500">Ref: {t.numero_factura}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{t.categoria}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{t.proveedor_cliente || "-"}</TableCell>
                    <TableCell className={`text-right font-bold ${t.tipo === "Ingreso" ? "text-green-600" : "text-red-600"}`}>
                      {t.tipo === "Ingreso" ? "+" : "-"}{t.cantidad?.toLocaleString()}€
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoBadge(t.estado, t.tipo)}>
                        {t.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {t.documento_url ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(t.documento_url, '_blank')}
                            title={t.tipo_documento || "Ver documento"}
                          >
                            <ExternalLink className="h-4 w-4 text-blue-600" />
                          </Button>
                          {t.tipo_documento && (
                            <Badge variant="outline" className="text-[10px] hidden md:inline-flex">
                              {t.tipo_documento}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => onDelete(t.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}