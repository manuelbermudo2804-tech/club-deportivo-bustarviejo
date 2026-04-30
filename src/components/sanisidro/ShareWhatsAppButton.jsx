import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";

// Botón unificado: abre un diálogo con el texto, lo puede copiar o compartir directamente por WhatsApp
export default function ShareWhatsAppButton({ buildText, label = "Compartir lista", count = 0 }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState("");

  const handleOpen = () => {
    setText(buildText());
    setCopied(false);
    setOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Texto copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Selecciona y copia manualmente.");
    }
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <>
      <Button
        size="sm"
        onClick={handleOpen}
        disabled={count === 0}
        className="gap-1 bg-green-600 hover:bg-green-700 text-white"
      >
        <MessageCircle className="w-4 h-4" /> {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-green-600" />
              {label}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-slate-600">
            Revisa el mensaje (puedes editarlo) y elige cómo compartirlo:
          </p>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            className="font-mono text-xs"
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleCopy}
              className="flex-1 gap-2"
            >
              {copied ? <><Check className="w-4 h-4 text-green-600" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar texto</>}
            </Button>
            <Button
              onClick={handleWhatsApp}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="w-4 h-4" /> Abrir WhatsApp
            </Button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Al pulsar "Abrir WhatsApp" se abrirá el selector de contacto/grupo donde quieras enviar el mensaje.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}