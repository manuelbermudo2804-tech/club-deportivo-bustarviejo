import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AutoMatchEngine from "../financial/AutoMatchEngine";

async function refreshSessionStats(sessionId) {
  if (!sessionId) return;
  const movements = await base44.entities.BankMovement.filter({ reconciliation_session_id: sessionId });
  const skipped = movements.filter((movement) => String(movement.notas_reconciliacion || "").includes("Omitido manualmente")).length;
  const reconciled = movements.filter((movement) => movement.reconciliado).length;
  const pending = movements.filter((movement) => !movement.reconciliado && !String(movement.notas_reconciliacion || "").includes("Omitido manualmente")).length;
  await base44.entities.ReconciliationSession.update(sessionId, {
    movimientos_totales: movements.length,
    movimientos_reconciliados: reconciled,
    movimientos_pendientes: pending,
    movimientos_omitidos: skipped
  });
}

export default function BankReconciliation({ payments, players, onReconcile }) {
  const queryClient = useQueryClient();
  const [transactionMatchSelection, setTransactionMatchSelection] = useState({});
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
  const { data: financialTransactions = [] } = useQuery({
    queryKey: ["financialTransactions"],
    queryFn: () => base44.entities.FinancialTransaction.list("-fecha", 500),
    initialData: []
  });

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
      if (movement.reconciliation_session_id) await refreshSessionStats(movement.reconciliation_session_id);

    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['cashForecastPayments'] });
      queryClient.invalidateQueries({ queryKey: ['bankMovements'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliationSessions'] });
      toast.success("✅ Reconciliado correctamente");
      if (onReconcile) onReconcile();
    },
  });

  const transactionMatchMutation = useMutation({
    mutationFn: async ({ movement, transaction }) => {
      const currentUser = await base44.auth.me();
      const now = new Date().toISOString();
      const conceptsMatch = String(movement.concepto || "").trim().toLowerCase() === String(transaction.concepto || "").trim().toLowerCase();
      await base44.entities.BankMovement.update(movement.id, {
        reconciliado: true,
        financial_transaction_id: transaction.id,
        revisado_por: currentUser?.email,
        confianza_match: conceptsMatch ? 95 : 75,
        fecha_reconciliacion: now,
        notas_reconciliacion: conceptsMatch
          ? "Vinculado manualmente a la transacción financiera."
          : "Vinculado manualmente por fecha e importe. Revisar descripción y categoría."
      });
      await base44.entities.FinancialTransaction.update(transaction.id, {
        estado: movement.tipo === "ingreso" ? "Cobrado" : "Pagado",
        bank_movement_id: movement.id,
        ...(conceptsMatch ? {} : { revisar_clasificacion: true }),
        notas: [transaction.notas, conceptsMatch ? "Conciliado manualmente con el banco." : "Conciliado por fecha e importe; revisar categoría y concepto."].filter(Boolean).join(" ")
      });
      if (movement.reconciliation_session_id) await refreshSessionStats(movement.reconciliation_session_id);
      if (transaction.temporada) {
        const budgets = await base44.entities.Budget.list("-created_date").catch(() => []);
        await Promise.all(
          budgets
            .filter((budget) => budget.activo !== false && budget.temporada === transaction.temporada)
            .map((budget) => base44.functions.invoke("updateBudgetExecuted", { budgetId: budget.id }).catch(() => null))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankMovements"] });
      queryClient.invalidateQueries({ queryKey: ["financialTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliationSessions"] });
      toast.success("Movimiento vinculado a la transacción financiera");
    },
    onError: (error) => {
      console.error("Error vinculando transacción financiera:", error);
      toast.error("No se pudo vincular la transacción");
    }
  });

  const skipMutation = useMutation({
    mutationFn: async (movement) => {
      const currentUser = await base44.auth.me();
      await base44.entities.BankMovement.update(movement.id, {
        notas_reconciliacion: "Omitido manualmente - no corresponde a ningún pago",
        revisado_por: currentUser.email
      });
      if (movement.reconciliation_session_id) await refreshSessionStats(movement.reconciliation_session_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bankMovements'] });
      queryClient.invalidateQueries({ queryKey: ['reconciliationSessions'] });
      toast.success("Movimiento omitido");
    },
  });

  const pendingPayments = payments.filter(p => 
    p.estado !== "Pagado" && p.estado !== "Anulado" && p.is_deleted !== true && !p.reconciliado_banco
  );

  const unreconciledMovements = allBankMovements.filter((m) =>
    !m.reconciliado &&
    !m.financial_transaction_id &&
    !String(m.notas_reconciliacion || "").includes("Omitido manualmente")
  );
  const movementsWithTransactionCandidates = unreconciledMovements.map((movement) => {
    const expectedType = String(movement.tipo || "").toLowerCase() === "ingreso" ? "Ingreso" : "Gasto";
    const candidates = financialTransactions.filter((transaction) =>
      !transaction.bank_movement_id &&
      !allBankMovements.some((item) => item.financial_transaction_id === transaction.id) &&
      transaction.estado !== "Anulado" &&
      transaction.tipo === expectedType &&
      transaction.fecha === movement.fecha &&
      Math.abs(Math.abs(Number(transaction.cantidad) || 0) - Math.abs(Number(movement.importe) || 0)) < 0.02
    );
    return { movement, candidates };
  }).filter((item) => item.candidates.length > 0);

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
                      {session.movimientos_reconciliados || 0}/{session.movimientos_totales} conciliados · {session.movimientos_pendientes || 0} pendientes · {session.movimientos_omitidos || 0} omitidos
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

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base">Importación bancaria centralizada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-900">
          <p>Para evitar extractos duplicados y mantener los saldos correctos, los nuevos extractos se cargan desde <strong>Panel financiero → Bancario</strong>.</p>
          <p>Esta pantalla sirve para revisar y vincular manualmente movimientos bancarios pendientes con cuotas de jugadores.</p>
        </CardContent>
      </Card>

      {movementsWithTransactionCandidates.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base">Vincular movimientos a transacciones existentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">Si la fecha y el importe coinciden con una transacción ya registrada, vincúlala aquí para no crear un duplicado.</p>
            {movementsWithTransactionCandidates.map(({ movement, candidates }) => (
              <div key={movement.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                <div>
                  <p className="text-sm font-medium">{movement.concepto}</p>
                  <p className="text-xs text-slate-500">{movement.fecha} · {Number(movement.importe || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
                </div>
                <Select value={transactionMatchSelection[movement.id] || ""} onValueChange={(value) => setTransactionMatchSelection((prev) => ({ ...prev, [movement.id]: value }))}>
                  <SelectTrigger><SelectValue placeholder="Elegir transacción existente" /></SelectTrigger>
                  <SelectContent>
                    {candidates.map((transaction) => (
                      <SelectItem key={transaction.id} value={transaction.id}>
                        {transaction.concepto} · {transaction.categoria} · {Number(transaction.cantidad || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!transactionMatchSelection[movement.id] || transactionMatchMutation.isPending} onClick={() => {
                  const transaction = candidates.find((item) => item.id === transactionMatchSelection[movement.id]);
                  if (transaction) transactionMatchMutation.mutate({ movement, transaction });
                }}>
                  <CheckCircle2 className="mr-1 h-4 w-4" />Vincular
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Motor de matching sobre los movimientos ya guardados en el registro bancario central */}
      {unreconciledMovements.length > 0 && (
        <AutoMatchEngine
          movements={unreconciledMovements}
          payments={pendingPayments}
          onMatch={(movement, payment) => reconcileMutation.mutate({ movement, payment })}
          onSkip={(movement) => skipMutation.mutate(movement)}
        />
      )}

      {/* Resumen de estado */}
      {unreconciledMovements.length > 0 && (
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