import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Banknote } from "lucide-react";

export default function CobroEfectivoDialog({ open, onOpenChange, payment, playerName, onConfirm, isSubmitting }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [nota, setNota] = useState("");
  const [reciboFile, setReciboFile] = useState(null);

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
            {playerName} · {payment.mes} · <strong>{payment.cantidad}€</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
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
            onClick={() => onConfirm({ fecha, nota: nota.trim(), reciboFile })}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 font-bold"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
            ) : (
              <>Confirmar cobro en efectivo</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}