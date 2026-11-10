import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";

// Aviso al volver de Stripe en una renovación con pago anticipado.
// Solo lee el estado: la renovación la confirma el servidor (webhook de Stripe).
export default function RenewalPrepagoReturn({ onConfirmed }) {
  const [estado, setEstado] = useState(null); // comprobando | confirmado | en_proceso | cancelado
  const [prepago, setPrepago] = useState(null);

  const [retorno] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { id: params.get("renovacion_prepago"), cancelado: params.get("renovacion_cancelada") };
  });

  useEffect(() => {
    const { id, cancelado } = retorno;
    if (!id && !cancelado) return;
    window.history.replaceState({}, "", window.location.pathname);
    if (cancelado) { setEstado("cancelado"); return; }

    let intentos = 0;
    let parar = false;
    setEstado("comprobando");
    const comprobar = async () => {
      if (parar) return;
      intentos++;
      const res = await base44.functions.invoke("prepagoInscripcion", { action: "consultar", prepago_id: id });
      const p = res.data?.prepago;
      setPrepago(p || null);
      if (p?.estado === "Consumido") { setEstado("confirmado"); onConfirmed?.(); return; }
      if (intentos >= 8) { setEstado("en_proceso"); return; }
      setTimeout(comprobar, 2500);
    };
    comprobar().catch(() => setEstado("en_proceso"));
    return () => { parar = true; };
  }, []);

  if (!estado) return null;
  const cerrar = () => setEstado(null);

  const vista = {
    comprobando: { icon: <Loader2 className="w-14 h-14 text-orange-600 animate-spin mx-auto" />, titulo: "Comprobando tu pago...", texto: "Estamos confirmando el cobro con el banco. Tarda unos segundos." },
    confirmado: { icon: <CheckCircle2 className="w-14 h-14 text-green-600 mx-auto" />, titulo: "Pago recibido, renovación confirmada", texto: `${prepago?.jugador_nombre || "El jugador"} queda renovado en ${prepago?.categoria || "su categoría"}. ${prepago?.tipo_pago === "Tres meses" ? "Las cuotas de septiembre y diciembre quedan pendientes en Pagos." : "El pago único cubre toda la temporada."}` },
    en_proceso: { icon: <Clock className="w-14 h-14 text-amber-500 mx-auto" />, titulo: "Pago en proceso", texto: "Tu pago se está procesando. La renovación se confirmará sola en unos minutos; no hace falta volver a pagar." },
    cancelado: { icon: <XCircle className="w-14 h-14 text-slate-400 mx-auto" />, titulo: "Pago no realizado", texto: "No se ha cobrado nada. El jugador sigue pendiente de renovar; puedes intentarlo de nuevo cuando quieras." },
  }[estado];

  return (
    <Dialog open onOpenChange={(o) => !o && estado !== "comprobando" && cerrar()}>
      <DialogContent className="max-w-sm text-center space-y-3">
        {vista.icon}
        <h2 className="text-xl font-bold text-slate-900">{vista.titulo}</h2>
        <p className="text-slate-600 text-sm">{vista.texto}</p>
        {estado !== "comprobando" && <Button onClick={cerrar} className="w-full bg-orange-600 hover:bg-orange-700">Entendido</Button>}
      </DialogContent>
    </Dialog>
  );
}