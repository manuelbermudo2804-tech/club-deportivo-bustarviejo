import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Construye el mensaje de WhatsApp listo para enviar a la familia
function buildWhatsAppMessage({ jugador_nombre, dorsal, categoria, temporada, tiendaUrl }) {
  const appUrl = "https://cdbustarviejo.base44.app";
  const lines = [
    `⚽ ¡Hola! Ya tenemos asignado el dorsal de *${jugador_nombre}* para la temporada *${temporada}* 🎉`,
    "",
    `🔢 *Dorsal #${dorsal}*`,
    `🏆 ${categoria}`,
    "",
    `👕 *¿Cómo pedir la equipación?*`,
    `1️⃣ Abre la app del club: ${appUrl}`,
    `2️⃣ Entra en *Tienda y Equipación*`,
    `3️⃣ Elige las prendas e indica el *#${dorsal}* en personalización`,
  ];
  if (tiendaUrl) {
    lines.push("", `🛍️ También puedes ir directo a la tienda: ${tiendaUrl}`);
  }
  lines.push(
    "",
    `⚠️ *Importante:* asegúrate de poner el dorsal *#${dorsal}* al hacer el pedido. Una vez personalizada, la equipación no admite cambios.`,
    "",
    `¿Dudas? Respóndenos por aquí o escribe al coordinador desde la app.`,
    "",
    `¡Nos vemos en el campo! 💪🟢⚫`,
    `*CD Bustarviejo*`
  );
  return lines.join("\n");
}

// Limpia un teléfono y lo prepara para wa.me (E.164 sin +)
function normalizePhoneForWhatsApp(raw) {
  if (!raw) return "";
  let p = String(raw).replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  // Si parece un móvil español sin prefijo internacional, anteponemos 34
  if (p.length === 9 && /^[6-9]/.test(p)) p = "34" + p;
  return p;
}

// Diálogo de detalle de un dorsal ya asignado: enviar/reenviar email, WhatsApp, liberar dorsal
export default function AssignmentDetailDialog({ open, onOpenChange, assignment, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [player, setPlayer] = useState(null);
  const [tiendaUrl, setTiendaUrl] = useState("");

  useEffect(() => {
    if (!open || !assignment) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await base44.entities.Player.get(assignment.jugador_id);
        if (!cancelled) setPlayer(p || null);
      } catch { /* ignore */ }
      try {
        const configs = await base44.entities.DorsalConfig.filter({
          temporada: assignment.temporada,
          categoria: assignment.categoria,
        });
        let url = configs?.[0]?.tienda_url || "";
        if (!url) {
          const seasons = await base44.entities.SeasonConfig.filter({ activa: true });
          url = seasons?.[0]?.tienda_ropa_url || "";
        }
        if (!cancelled) setTiendaUrl(url);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open, assignment]);

  if (!assignment) return null;

  const phone = normalizePhoneForWhatsApp(player?.telefono);

  const handleResendEmail = async () => {
    setBusy(true);
    try {
      await base44.functions.invoke("sendDorsalAssignmentEmail", { assignment_id: assignment.id });
      toast.success("Email enviado a la familia ✉️");
      onChanged?.();
    } catch {
      toast.error("Error al enviar el email");
    } finally {
      setBusy(false);
    }
  };

  const handleWhatsApp = async () => {
    const msg = buildWhatsAppMessage({
      jugador_nombre: assignment.jugador_nombre,
      dorsal: assignment.dorsal,
      categoria: assignment.categoria,
      temporada: assignment.temporada,
      tiendaUrl,
    });
    const text = encodeURIComponent(msg);
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener,noreferrer");
    // Registrar que se ha abierto WhatsApp para avisar
    try {
      await base44.entities.DorsalAssignment.update(assignment.id, {
        whatsapp_enviado: true,
        fecha_whatsapp: new Date().toISOString(),
      });
      onChanged?.();
    } catch { /* ignore */ }
  };

  const handleFree = async () => {
    if (!confirm(`¿Liberar el dorsal #${assignment.dorsal} de ${assignment.jugador_nombre}? Quedará pendiente.`)) return;
    setBusy(true);
    try {
      await base44.entities.DorsalAssignment.update(assignment.id, { estado: "pendiente" });
      toast.success("Dorsal liberado");
      onChanged?.();
      onOpenChange(false);
    } catch {
      toast.error("Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Dorsal #{assignment.dorsal}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-xs text-slate-500 uppercase">Jugador</div>
            <div className="text-lg font-semibold">{assignment.jugador_nombre}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">{assignment.categoria}</Badge>
            <Badge variant="outline">{assignment.temporada}</Badge>
            <Badge className="bg-green-100 text-green-800 border-green-300">{assignment.estado}</Badge>
          </div>
          <div className="text-sm text-slate-600">
            <div>Origen: <strong>{assignment.origen || "manual"}</strong></div>
            <div>Email familia: {assignment.email_enviado ? <span className="text-green-600 font-semibold">✓ Enviado</span> : <span className="text-orange-600 font-semibold">Pendiente</span>}</div>
            {assignment.fecha_email && (
              <div className="text-xs text-slate-400">Último envío: {new Date(assignment.fecha_email).toLocaleString()}</div>
            )}
            <div className="mt-2">
              Teléfono familia: {phone ? <span className="font-mono">+{phone}</span> : <span className="text-slate-400">No registrado</span>}
            </div>
            <div>WhatsApp familia: {assignment.whatsapp_enviado ? <span className="text-green-600 font-semibold">✓ Enviado</span> : <span className="text-orange-600 font-semibold">Pendiente</span>}</div>
            {assignment.fecha_whatsapp && (
              <div className="text-xs text-slate-400">Último WhatsApp: {new Date(assignment.fecha_whatsapp).toLocaleString()}</div>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleResendEmail} disabled={busy} className="gap-2">
            <Mail className="w-4 h-4" />
            {assignment.email_enviado ? "Reenviar email" : "Enviar email"}
          </Button>
          <Button
            variant="outline"
            onClick={handleWhatsApp}
            disabled={busy}
            className="gap-2 text-green-700 hover:text-green-800 border-green-300 hover:bg-green-50"
          >
            <MessageCircle className="w-4 h-4" />
            {phone ? "Enviar por WhatsApp" : "Abrir WhatsApp"}
          </Button>
          <Button variant="outline" onClick={handleFree} disabled={busy} className="gap-2 text-red-600 hover:text-red-700">
            <Trash2 className="w-4 h-4" />
            Liberar dorsal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}