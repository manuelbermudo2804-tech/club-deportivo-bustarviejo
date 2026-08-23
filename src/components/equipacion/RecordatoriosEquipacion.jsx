import React from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function RecordatoriosEquipacion({ textoWhatsApp }) {
  const enviar = useMutation({
    mutationFn: () => base44.functions.invoke("recordatoriosEquipacion", {}),
    onSuccess: (res) => {
      const d = res.data || {};
      toast.success(`${d.enviados || 0} recordatorios enviados por email`);
    },
    onError: (e) => toast.error(e.message || "No se pudieron enviar los recordatorios"),
  });

  return (
    <div className="rounded-lg border bg-slate-50 p-3 space-y-2">
      <p className="text-sm font-semibold">Recordatorios</p>
      <p className="text-xs text-slate-600">
        Cada lunes a las 10:00 se envía automáticamente un email a las familias con el pedido pendiente.
        También puedes enviarlo ahora. WhatsApp no permite envíos automáticos: usa el botón para abrirlo con el mensaje ya escrito.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button size="sm" onClick={() => enviar.mutate()} disabled={enviar.isPending}>
          <Mail className="w-4 h-4 mr-2" />
          {enviar.isPending ? "Enviando..." : "Enviar recordatorio por email ahora"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(textoWhatsApp)}`, "_blank")}
        >
          <MessageCircle className="w-4 h-4 mr-2" /> Abrir WhatsApp con el mensaje
        </Button>
      </div>
    </div>
  );
}