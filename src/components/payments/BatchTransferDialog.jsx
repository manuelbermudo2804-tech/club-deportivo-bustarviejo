import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function BatchTransferDialog({ open, onClose, concept, total, onConfirm }) {
  const [file, setFile] = useState(null);
  return (
    <Dialog open={open} onOpenChange={(v)=>{ if(!v) onClose(); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-slate-900 text-white p-4">
          <h3 className="text-lg font-bold">Transferencia bancaria</h3>
          <p className="text-sm opacity-90">Concepto: {concept}</p>
          <p className="text-sm">Importe total: {total.toFixed(2)}€</p>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-sm text-slate-700">Sube un único justificante para este lote.</p>
          <input type="file" accept="image/*,application/pdf" onChange={(e)=> setFile(e.target.files?.[0] || null)} />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => file && onConfirm(file)} disabled={!file} className="bg-orange-600 hover:bg-orange-700">Enviar justificante</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}