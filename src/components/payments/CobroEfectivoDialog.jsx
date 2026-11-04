import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Banknote } from "lucide-react";

export default function CobroEfectivoDialog({ open, onOpenChange, payment, playerName, onConfirm, isSubmitting }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState("");
  const [importe, setImporte] = useState("");
  const [reciboFile, setReciboFile] = useState(null);
  const cobrado = Number(payment?.importe_cobrado ?? (payment?.estado === "Pagado" ? payment?.cantidad : 0)) || 0;
  const pendiente = Math.max(0, Number(payment?.cantidad || 0) - cobrado);
  useEffect(() => {
    if (open && payment) {
      setImporte(pendiente.toFixed(2));
      setNota("");
      setReciboFile(null);
      setFecha(new Date().toISOString().split("T")[0]);
    }
  }, [open, payment?.id]);

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-green-600" />
            Cobro en efectivo
          </DialogTitle>
          <DialogDescription>
            {playerName} · {payment.mes} · Total {Number(payment.cantidad).toFixed(2)}€ · Pendiente {pendiente.toFixed(2)}€
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <Label htmlFor="ef-importe">Importe recibido (€)</Label>
            <Input id="ef-importe" type="number" min="0.01" max={pendiente} step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} />
            <p className="mt-1 text-xs text-slate-500">Ya cobrado: {cobrado.toFixed(2)}€ · Quedará pendiente: {Math.max(0, pendiente - (Number(importe) || 0)).toFixed(2)}€</p>
          </div>
          <div>
            <Label htmlFor="ef-fecha">Fecha del cobro</Label>
            <Input id="ef-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ef-nota">Anotación (quién lo entregó, quién lo recibió...)</Label>
            <Textarea
              id="ef-nota"
              rows={3}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Ej: Entregado por la madre en el entrenamiento, recibido por Juan"
            />
          </div>
          <div>
            <Label htmlFor="ef-recibo">Adjuntar recibo (opcional)</Label>
            <Input
              id="ef-recibo"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setReciboFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              Puedes adjuntar un PDF o una foto del recibo. Si no adjuntas nada, se generará automáticamente.
            </p>
          </div>
          <Button
            onClick={() => onConfirm({ fecha, nota: nota.trim(), reciboFile, importe: Number(importe) })}
            disabled={isSubmitting || !Number.isFinite(Number(importe)) || Number(importe) <= 0 || Number(importe) > pendiente + 0.001}
            className="w-full bg-green-600 hover:bg-green-700 font-bold"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            ) : (
              <>Registrar {Number(importe || 0).toFixed(2)}€ en efectivo</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}