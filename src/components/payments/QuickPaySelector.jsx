import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, FileText, Info } from "lucide-react";

export default function QuickPaySelector({ open, onClose, onChooseCard, onChooseTransfer }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="w-[92vw] max-w-md p-0 overflow-hidden rounded-2xl">
        <div className="p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl">Pagar / Registrar</DialogTitle>
          </DialogHeader>

          <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-500 mt-0.5" />
            <p>
              Si quieres pagar con tarjeta, usa el botón "Pagar" junto a cada cuota o selecciona varias cuotas y usa la barra inferior.
            </p>
          </div>

          <div className="grid gap-2">
            <Button
              className="w-full bg-orange-600 hover:bg-orange-700"
              onClick={() => {
                onChooseCard?.();
                onClose?.();
              }}
            >
              <CreditCard className="w-4 h-4 mr-2" /> Pagar con tarjeta
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onChooseTransfer?.();
              }}
            >
              <FileText className="w-4 h-4 mr-2" /> Registrar transferencia
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}