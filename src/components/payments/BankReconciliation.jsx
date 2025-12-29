import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import BankStatementUpload from "../financial/BankStatementUpload";
import AutoMatchEngine from "../financial/AutoMatchEngine";

export default function BankReconciliation({ payments, players, onReconcile }) {
  const queryClient = useQueryClient();
  const [bankMovements, setBankMovements] = useState([]);
  const [sessionData, setSessionData] = useState(null);

  const { data: sessions = [] } = useQuery({
    queryKey: ['reconciliationSessions'],
    queryFn: () => base44.entities.ReconciliationSession.list('-created_date', 20),
    initialData: [],
  });

  const { data: allBankMovements = [] } = useQuery({
    queryKey: ['bankMovements'],
    queryFn: () => base44.entities.BankMovement.list('-fecha', 1000),
    initialData: [],
  });

  const handleUploadComplete = async (movements, dateRange) => {
    try {
      const currentUser = await base44.auth.me();
      
      // Crear sesión de reconciliación
      const session = await base44.entities.ReconciliationSession.create({
        movimientos_totales: movements.length,
        movimientos_pendientes: movements.length,
        admin_email: currentUser.email,
        fecha_inicio: dateRange.start,
        fecha_fin: dateRange.end,
        extracto_url: "uploaded_csv"
      });

      // Guardar movimientos bancarios
      const savedMovements = await base44.entities.BankMovement.bulkCreate(
        movements.map(m => ({
          ...m,
          session_id: session.id
        }))
      );

      setBankMovements(savedMovements);
      setSessionData(session);
      queryClient.invalidateQueries({ queryKey: ['bankMovements'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliationSessions'] });
    } catch (error) {
      console.error("Error saving movements:", error);
      toast.error("Error al guardar movimientos");
    }
  };

  const reconcileMutation = useMutation({
    mutationFn: async ({ movement, payment }) => {
      const currentUser = await base44.auth.me();
      
      // Actualizar movimiento bancario
      await base44.entities.BankMovement.update(movement.id, {
        reconciliado: true,
        payment_id: payment.id,
        jugador_nombre: payment.jugador_nombre,
        revisado_por: currentUser.email,
        fecha_reconciliacion: new Date().toISOString()
      });

      // Actualizar pago
      await base44.entities.Payment.update(payment.id, {
        estado: "Pagado",
        reconciliado_banco: true,
        fecha_reconciliacion: new Date().toISOString(),
        fecha_pago: movement.fecha
      });

      // Actualizar sesión
      if (sessionData) {
        await base44.entities.ReconciliationSession.update(sessionData.id, {
          movimientos_reconciliados: (sessionData.movimientos_reconciliados || 0) + 1,
          movimientos_pendientes: sessionData.movimientos_pendientes - 1
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      queryClient.invalidateQueries({ queryKey: ['bankMovements'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliationSessions'] });
      toast.success("✅ Reconciliado correctamente");
      if (onReconcile) onReconcile();
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (movement) => {
      const currentUser = await base44.auth.me();
      await base44.entities.BankMovement.update(movement.id, {
        notas_reconciliacion: "Omitido manualmente - no corresponde a ningún pago",
        revisado_por: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankMovements'] });
      toast.success("Movimiento omitido");
    },
  });

  const pendingPayments = payments.filter(p => 
    p.estado === "Pendiente" && !p.reconciliado_banco
  );

  const unreconciledMovements = allBankMovements.filter(m => !m.reconciliado);

  return (
    <div className="space-y-6">
      {/* Historial de sesiones */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📁 Sesiones Anteriores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.slice(0, 5).map(session => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{new Date(session.created_date).toLocaleDateString('es-ES')}</p>
                    <p className="text-xs text-slate-600">
                      {session.movimientos_reconciliados}/{session.movimientos_totales} reconciliados
                    </p>
                  </div>
                  <Badge variant={session.completada ? "default" : "outline"}>
                    {session.completada ? "Completada" : "En proceso"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subir extracto */}
      <BankStatementUpload onUploadComplete={handleUploadComplete} />

      {/* Motor de matching */}
      {bankMovements.length > 0 && (
        <AutoMatchEngine
          movements={bankMovements}
          payments={pendingPayments}
          onMatch={(movement, payment) => reconcileMutation.mutate({ movement, payment })}
          onSkip={(movement) => skipMutation.mutate(movement)}
        />
      )}

      {/* Resumen de estado */}
      {unreconciledMovements.length > 0 && bankMovements.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-300">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Movimientos sin reconciliar</p>
                <p className="text-sm text-yellow-800 mt-1">
                  Hay {unreconciledMovements.length} movimientos bancarios pendientes de revisar de sesiones anteriores
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}