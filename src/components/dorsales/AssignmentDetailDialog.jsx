import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Diálogo de detalle de un dorsal ya asignado: reenviar email, liberar dorsal, etc.
export default function AssignmentDetailDialog({ open, onOpenChange, assignment, onChanged }) {
  const [busy, setBusy] = useState(false);
  if (!assignment) return null;

  const handleResendEmail = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("sendDorsalAssignmentEmail", { assignment_id: assignment.id });
      toast.success("Email reenviado a la familia ✉️");
      onChanged?.();
    } catch {
      toast.error("Error al reenviar el email");
    } finally {
      setBusy(false);
    }
  };

  const handleFree = async () => {
    if (!confirm(`¿Liberar el dorsal #${assignment.dorsal} de ${assignment.jugador_nombre}? Quedará pendiente.`)) return;
    setBusy(true);
    try {
      await base44.entities.DorsalAssignment.update(assignment.id, { estado: "pendiente" });
      toast.success("Dorsal liberado");
      onChanged?.();
      onOpenChange(false);
    } catch {
      toast.error("Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dorsal #{assignment.dorsal}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500 uppercase">Jugador</div>
            <div className="text-lg font-semibold">{assignment.jugador_nombre}</div>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{assignment.categoria}</Badge>
            <Badge variant="outline">{assignment.temporada}</Badge>
            <Badge className="bg-green-100 text-green-800 border-green-300">{assignment.estado}</Badge>
          </div>
          <div className="text-sm text-slate-600">
            <div>Origen: <strong>{assignment.origen || "manual"}</strong></div>
            <div>Email familia: {assignment.email_enviado ? <span className="text-green-600 font-semibold">✓ Enviado</span> : <span className="text-orange-600 font-semibold">Pendiente</span>}</div>
            {assignment.fecha_email && (
              <div className="text-xs text-slate-400">Último envío: {new Date(assignment.fecha_email).toLocaleString()}</div>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleResendEmail} disabled={busy} className="gap-2">
            <Mail className="w-4 h-4" />
            {assignment.email_enviado ? "Reenviar email" : "Enviar email"}
          </Button>
          <Button variant="outline" onClick={handleFree} disabled={busy} className="gap-2 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
            Liberar dorsal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}