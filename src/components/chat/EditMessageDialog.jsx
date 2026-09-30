import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Ventana común para editar un mensaje propio en cualquier chat
export default function EditMessageDialog({ message, onClose, onSave }) {
  const [texto, setTexto] = useState("");
  useEffect(() => { setTexto(message?.mensaje || ""); }, [message]);
  const cambiado = texto.trim() && texto.trim() !== (message?.mensaje || "").trim();

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Editar mensaje</DialogTitle></DialogHeader>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} autoFocus />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!cambiado} className="bg-orange-600 hover:bg-orange-700"
            onClick={() => { onSave(message, texto.trim()); onClose(); }}>
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}