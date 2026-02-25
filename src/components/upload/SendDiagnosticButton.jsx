import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bug, CheckCircle2, Loader2 } from "lucide-react";
import { sendDiagnosticReport } from "../utils/uploadLogger";
import { toast } from "sonner";

/**
 * Botón para que el usuario envíe su historial de subidas al servidor.
 * Pensado para colocar en zonas de error o en configuración.
 */
export default function SendDiagnosticButton({ variant = "outline", size = "sm", className = "" }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState(null);

  const handleSend = async () => {
    setSending(true);
    const result = await sendDiagnosticReport();
    setSending(false);
    
    if (result.success) {
      setSent(true);
      setCode(result.code);
      toast.success(`Diagnóstico enviado (${result.eventCount} eventos). Código: ${result.code}`);
    } else {
      toast.error("No se pudo enviar el diagnóstico. Inténtalo de nuevo.");
    }
  };

  if (sent) {
    return (
      <div className={`flex items-center gap-2 text-green-700 bg-green-50 rounded-xl px-3 py-2 text-sm ${className}`}>
        <CheckCircle2 className="w-4 h-4" />
        <span>Enviado · Código: <strong>{code}</strong></span>
      </div>
    );
  }

  return (
    <Button variant={variant} size={size} onClick={handleSend} disabled={sending} className={className}>
      {sending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bug className="w-4 h-4 mr-1" />}
      {sending ? "Enviando..." : "Enviar diagnóstico"}
    </Button>
  );
}