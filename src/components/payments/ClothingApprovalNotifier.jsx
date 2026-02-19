import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Detecta aprobaciones de pedidos de ropa y notifica por email a las familias
 * - Envía email cuando pagado cambia de false->true o estado pasa a "Confirmado"
 */
export default function ClothingApprovalNotifier({ isAdmin }) {
  const prevRef = useRef(null);

  const { data: orders = [] } = useQuery({
    queryKey: ["clothingNotifier"],
    queryFn: () => base44.entities.ClothingOrder.list("-updated_date"),
    refetchInterval: 15000,
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin || !orders || orders.length === 0) return;

    if (!prevRef.current) {
      prevRef.current = orders;
      return;
    }

    const prev = prevRef.current;

    orders.forEach((curr) => {
      const old = prev.find((o) => o.id === curr.id);
      if (!old) return;

      const approved = (old.pagado === false && curr.pagado === true) ||
        (old.estado !== "Confirmado" && curr.estado === "Confirmado");

      if (approved) {
        notify(curr).catch((e) => console.error("[ClothingApprovalNotifier] email error", e));
      }
    });

    prevRef.current = orders;
  }, [orders, isAdmin]);

  const notify = async (order) => {
    // Emails destino
    const recipients = [];
    if (order.email_padre) recipients.push(order.email_padre);

    try {
      if (order.jugador_id) {
        const players = await base44.entities.Player.filter({ id: order.jugador_id });
        const player = players?.[0];
        if (player?.email_tutor_2 && !recipients.includes(player.email_tutor_2)) {
          recipients.push(player.email_tutor_2);
        }
      }
    } catch {}

    const { clothingOrderApprovedHtml } = await import("../emails/emailTemplates");
    const html = clothingOrderApprovedHtml(
      order.jugador_nombre,
      order.precio_final || order.precio_total || 0,
      order.estado || (order.pagado ? "Pagado" : "Pendiente")
    );

    for (const to of recipients) {
      await base44.functions.invoke("sendEmail", {
        to,
        subject: `✅ Pedido de equipación aprobado - ${order.jugador_nombre}`,
        html,
      });
    }
  };

  return null;
}