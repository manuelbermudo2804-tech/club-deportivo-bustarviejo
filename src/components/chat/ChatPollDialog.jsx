import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { toast } from "sonner";

// Diálogo común de "Crear encuesta" para todos los chats
export default function ChatPollDialog({ open, onOpenChange, onSend }) {
  const [pregunta, setPregunta] = useState("");
  const [opciones, setOpciones] = useState(["", ""]);

  const enviar = () => {
    const validas = opciones.filter(o => o.trim());
    if (!pregunta.trim() || validas.length < 2) return toast.error("Necesitas una pregunta y al menos 2 opciones");
    onSend({ mensaje: "📊 Encuesta", adjuntos: [], encuesta: { pregunta, opciones: validas, votos: [], cerrada: false } });
    onOpenChange(false);
    setPregunta(""); setOpciones(["", ""]);
    toast.success("Encuesta enviada");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>📊 Crear Encuesta Rápida</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Pregunta" value={pregunta} onChange={(e) => setPregunta(e.target.value)} />
          {opciones.map((opt, idx) => (
            <div key={idx} className="flex gap-2">
              <Input placeholder={`Opción ${idx + 1}`} value={opt} onChange={(e) => setOpciones(opciones.map((o, i) => i === idx ? e.target.value : o))} />
              {opciones.length > 2 && (
                <Button size="icon" variant="ghost" onClick={() => setOpciones(opciones.filter((_, i) => i !== idx))}><X className="w-4 h-4" /></Button>
              )}
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setOpciones([...opciones, ""])}>+ Agregar opción</Button>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={enviar}>Enviar Encuesta</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}