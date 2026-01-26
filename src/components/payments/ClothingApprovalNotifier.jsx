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

    for (const to of recipients) {
      await base44.functions.invoke("sendEmail", {
        to,
        subject: "✅ Pedido de equipación aprobado",
        html: `
          <h2 style="color:#16a34a;">✅ Pedido de equipación aprobado</h2>
          <p>Tu pedido de equipación para <strong>${order.jugador_nombre}</strong> ha sido aprobado.</p>
          <p><strong>Importe:</strong> ${order.precio_final || order.precio_total || 0}€</p>
          <p><strong>Estado:</strong> ${order.estado || (order.pagado ? "Pagado" : "Pendiente")}</p>
          <p>Te avisaremos cuando esté listo para recoger. ¡Gracias!</p>
          <br/>
          <p style="color:#64748b;font-size:12px;">CD Bustarviejo</p>
        `,
      });
    }
  };

  return null;
}