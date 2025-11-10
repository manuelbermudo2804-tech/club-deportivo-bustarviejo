import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function ParentPayments() {
  const [uploadingPaymentId, setUploadingPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p => 
        p.email_padre === user?.email || p.email === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      const playerIds = players.map(p => p.id);
      return allPayments.filter(payment => playerIds.includes(payment.jugador_id));
    },
    enabled: players.length > 0,
    initialData: [],
  });

  const uploadJustificanteMutation = useMutation({
    mutationFn: async ({ paymentId, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const payment = payments.find(p => p.id === paymentId);
      await base44.entities.Payment.update(paymentId, {
        ...payment,
        justificante_url: file_url,
        estado: "En revisión"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      toast.success("Justificante subido correctamente. El pago está en revisión.");
      setUploadingPaymentId(null);
    },
    onError: () => {
      toast.error("Error al subir el justificante");
      setUploadingPaymentId(null);
    }
  });

  const handleFileUpload = async (paymentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPaymentId(paymentId);
    uploadJustificanteMutation.mutate({ paymentId, file });
  };

  const filteredPayments = payments.filter(payment =>
    payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.mes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  const pendingCount = payments.filter(p => p.estado === "Pendiente").length;
  const inReviewCount = payments.filter(p => p.estado === "En revisión").length;
  const paidCount = payments.filter(p => p.estado === "Pagado").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Mis Pagos</h1>
        <p className="text-slate-600 mt-1">Gestiona tus cuotas y justificantes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-red-600">{pendingCount}</p>
              </div>
              <span className="text-4xl">🔴</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">En Revisión</p>
                <p className="text-3xl font-bold text-orange-600">{inReviewCount}</p>
              </div>
              <span className="text-4xl">🟠</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pagados</p>
                <p className="text-3xl font-bold text-green-600">{paidCount}</p>
              </div>
              <span className="text-4xl">🟢</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card className="border-none shadow-lg bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl">Detalle de Pagos</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
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
                    <TableHead>Período</TableHead>
                    <TableHead>Temporada</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Justificante</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{payment.jugador_nombre}</TableCell>
                      <TableCell>{payment.mes}</TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {payment.temporada}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {payment.cantidad}€
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        Día 30 de {payment.mes}
                      </TableCell>
                      <TableCell>
                        {payment.justificante_url ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={payment.justificante_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                            >
                              <FileText className="w-4 h-4" />
                              <span className="text-xs">Ver</span>
                            </a>
                          </div>
                        ) : payment.estado === "Pagado" ? (
                          <span className="text-xs text-slate-400">-</span>
                        ) : (
                          <>
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileUpload(payment.id, e)}
                              className="hidden"
                              id={`upload-${payment.id}`}
                              disabled={uploadingPaymentId === payment.id}
                            />
                            <label htmlFor={`upload-${payment.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={uploadingPaymentId === payment.id}
                                onClick={() => document.getElementById(`upload-${payment.id}`).click()}
                                className="text-xs"
                              >
                                {uploadingPaymentId === payment.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Subiendo...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Subir
                                  </>
                                )}
                              </Button>
                            </label>
                          </>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="border-none shadow-lg bg-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg text-orange-900">ℹ️ Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>• <strong>Pagos Pendientes (🔴):</strong> Sube el justificante de pago (Bizum o transferencia) haciendo clic en "Subir"</p>
          <p>• <strong>En Revisión (🟠):</strong> El administrador está verificando tu pago</p>
          <p>• <strong>Pagado (🟢):</strong> El pago ha sido confirmado por el administrador</p>
          <p className="pt-2 border-t border-orange-200">
            <strong>Importante:</strong> Sube el justificante lo antes posible para que tu pago pueda ser verificado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}