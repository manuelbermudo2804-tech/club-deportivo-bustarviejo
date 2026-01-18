import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function CompleteTaskDialog({ open, task, onCancel, onConfirm }) {
  const [mensaje, setMensaje] = React.useState("");
  React.useEffect(()=>{ if(open){ setMensaje(""); } }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-4" onClick={(e)=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-1">Marcar como hecha</h3>
        <p className="text-sm text-slate-600 mb-3">Escribe una breve explicación para que la Junta lo vea:</p>
        <Textarea value={mensaje} onChange={(e)=>setMensaje(e.target.value)} placeholder="Descripción de lo realizado, enlaces, incidencias…" className="min-h-[120px]" />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button className="bg-green-600 hover:bg-green-700" onClick={()=>onConfirm(mensaje)}>Guardar y marcar hecha</Button>
        </div>
      </div>
    </div>
  );
}