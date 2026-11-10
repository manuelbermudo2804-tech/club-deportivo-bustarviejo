import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { eur } from "@/components/financial/panel/financeStats";

export default function MonthDetailDialog({ open, onClose, title, items }) {
  const sorted = [...(items || [])].sort((a, b) => b.importe - a.importe);
  const total = sorted.reduce((s, i) => s + i.importe, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-slate-500">{sorted.length} cobros · Total {eur(total)}</p>
        </DialogHeader>
        {sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No hay cobros registrados este mes.</p>
        ) : (
          <div className="max-h-[60vh] divide-y overflow-y-auto">
            {sorted.map((i, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{i.nombre || "Sin nombre"}</p>
                  <p className="text-xs text-slate-500">
                    {i.concepto}{i.fecha ? ` · ${new Date(i.fecha).toLocaleDateString("es-ES")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">{i.origen}</Badge>
                  <span className="font-semibold tabular-nums">{eur(i.importe)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}