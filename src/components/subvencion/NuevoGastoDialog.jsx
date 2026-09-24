import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import TransactionForm from "@/components/financial/TransactionForm";
import { toast } from "sonner";

export default function NuevoGastoDialog({ open, onClose, temporada, expedienteId, onCreated }) {
  const [saving, setSaving] = useState(false);

  const submit = async (data) => {
    setSaving(true);
    const created = await base44.entities.FinancialTransaction.create({
      ...data,
      fecha_factura: data.tipo === "Gasto" ? data.fecha : undefined,
      subvencion_expediente_id: data.tipo === "Gasto" ? expedienteId : undefined,
    });
    setSaving(false);
    toast.success("Movimiento registrado");
    onCreated(created);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <TransactionForm temporada={temporada} onSubmit={submit} onCancel={onClose} isSubmitting={saving} />
      </DialogContent>
    </Dialog>
  );
}