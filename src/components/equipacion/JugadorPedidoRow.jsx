import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Mail, MessageCircle, Check, Undo2 } from "lucide-react";

const formatFecha = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) +
    " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

export default function JugadorPedidoRow({ player, pedidos, ultimo, enviando, onEmail, onWhatsApp, onMarcarManual, onDesmarcarManual }) {
  const tiene = pedidos.length > 0;
  const manual = pedidos.find((p) => p.metodo_match === "manual" && String(p.gmail_message_id || "").startsWith("manual-"));
  const tieneEmail = !!(player.email_padre || player.email_tutor_2);
  const tieneTel = !!(player.telefono || player.telefono_tutor_2);

  return (
    <div className="py-2.5 space-y-1.5">
      <div className="flex items-center gap-3">
        {tiene
          ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{player.nombre}</p>
          <p className="text-xs text-slate-500 truncate">{player.categoria_principal || player.deporte || ""}</p>
        </div>
        {tiene ? (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs shrink-0">
            {manual && pedidos.length === 1 ? "Marcado a mano" : pedidos.length > 1 ? `${pedidos.length} pedidos` : `#${pedidos[0].numero_pedido || "ok"}`}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-slate-500 shrink-0">Falta</Badge>
        )}
      </div>

      {!tiene && (
        <div className="pl-8 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!tieneEmail || enviando} onClick={() => onEmail(player)}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            {enviando ? "Enviando..." : "Recordar por email"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!tieneTel} onClick={() => onWhatsApp(player)}>
            <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> WhatsApp
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => onMarcarManual(player)}>
            <Check className="w-3.5 h-3.5 mr-1.5" /> Marcar como pedido
          </Button>
          <span className="text-xs text-slate-500">
            {ultimo ? `Último recordatorio: ${formatFecha(ultimo.fecha || ultimo.created_date)} (${ultimo.canal})` : "Sin recordatorios"}
          </span>
        </div>
      )}

      {manual && (
        <div className="pl-8 flex items-center gap-2">
          <span className="text-xs text-slate-500">Marcado a mano el {formatFecha(manual.fecha_pedido || manual.created_date)}</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-600" onClick={() => onDesmarcarManual(manual)}>
            <Undo2 className="w-3.5 h-3.5 mr-1.5" /> Deshacer
          </Button>
        </div>
      )}
    </div>
  );
}