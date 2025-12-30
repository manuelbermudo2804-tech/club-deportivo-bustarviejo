import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function WidgetPicker({ open, onClose, available, onAdd }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <div className="space-y-3">
          <h3 className="text-lg font-bold">Añadir widgets</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {available.map(w => (
              <button
                key={w.key}
                onClick={() => { onAdd(w); onClose(false); }}
                className="flex items-center gap-2 p-3 rounded-xl border hover:bg-slate-50 text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <w.icon className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <p className="font-semibold">{w.title}</p>
                  <p className="text-xs text-slate-500">{w.key}</p>
                </div>
              </button>
            ))}
          </div>
          {available.length === 0 && (
            <p className="text-sm text-slate-500">No hay más widgets disponibles</p>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onClose(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}