import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Search, FileText, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

export default function PaymentTable({ payments, isLoading, onEdit, onStatusChange }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const user = await base44.auth.me();
        setIsAdmin(user.role === "admin");
      } catch (error) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, []);

  const filteredPayments = payments.filter(payment =>
    payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusConfig = {
    "Pendiente": {
      icon: Clock,
      color: "bg-amber-100 text-amber-700 border-amber-200",
      iconColor: "text-amber-600"
    },
    "En revisión": {
      icon: AlertTriangle,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      iconColor: "text-blue-600"
    },
    "Pagado": {
      icon: CheckCircle2,
      color: "bg-green-100 text-green-700 border-green-200",
      iconColor: "text-green-600"
    }
  };

  return (
    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-xl">Registro de Pagos</CardTitle>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por jugador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No se encontraron pagos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jugador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Justificante</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const status = statusConfig[payment.estado] || statusConfig["Pendiente"];
                  const StatusIcon = status.icon;

                  return (
                    <TableRow key={payment.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{payment.jugador_nombre}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {payment.tipo_pago || "Único"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.mes} {payment.año}
                      </TableCell>
                      <TableCell className="font-semibold">
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
                          <span className="text-xs text-slate-400">Sin justificante</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isAdmin ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${status.color} hover:opacity-80 transition-opacity`}>
                                <StatusIcon className={`w-3 h-3 ${status.iconColor}`} />
                                {payment.estado}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onStatusChange(payment, "Pendiente")}>
                                <Clock className="w-4 h-4 mr-2 text-amber-600" />
                                Pendiente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onStatusChange(payment, "En revisión")}>
                                <AlertTriangle className="w-4 h-4 mr-2 text-blue-600" />
                                En revisión
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onStatusChange(payment, "Pagado")}>
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                                Pagado
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge className={status.color}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${status.iconColor}`} />
                            {payment.estado}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(payment)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}