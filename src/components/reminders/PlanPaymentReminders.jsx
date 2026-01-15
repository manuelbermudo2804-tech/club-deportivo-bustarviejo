import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useActiveSeason } from "../season/SeasonProvider";

export default function PlanPaymentReminders({ user }) {
  const [processing, setProcessing] = useState(false);
  const lastRunRef = useRef(null);
  const { activeSeason } = useActiveSeason();

  useEffect(() => {
    if (!user) return;
    const isAuthorized = user.role === "admin" || user.es_tesorero === true;
    if (!isAuthorized || processing) return;
    
    // Ejecutar máximo 1 vez cada 5 minutos
    const now = Date.now();
    if (lastRunRef.current && (now - lastRunRef.current) < 5 * 60 * 1000) {
      return;
    }

    const run = async () => {
      try {
        setProcessing(true);
        lastRunRef.current = Date.now();
        const nowDate = new Date();
        const todayStr = nowDate.toDateString();

        // Reducir llamadas con filtros específicos y límites
        const [players, plans, reminders] = await Promise.all([
          base44.entities.Player.filter({ activo: true }, '-updated_date', 300),
          base44.entities.CustomPaymentPlan.filter({ estado: 'Activo' }, '-updated_date', 100),
          base44.entities.AutomaticReminder.list('-created_date', 200)
        ]);

        const playerById = Object.fromEntries(players.map(p => [p.id, p]));

        // Helper to check if dates are same (ignore time)
        const isSameDate = (a, b) => a.toDateString() === b.toDateString();

        let sent = 0;
        for (const plan of plans) {
          if (plan.estado !== "Activo" || !plan.cuotas || plan.cuotas.length === 0) continue;

          const player = playerById[plan.jugador_id];
          if (!player) continue;
          const familyEmail = player.email_padre;
          if (!familyEmail) continue;

          for (const cuota of plan.cuotas) {
            if (cuota.pagada === true) continue;
            if (!cuota.fecha_vencimiento) continue;

            const due = new Date(cuota.fecha_vencimiento);
            const dMinus15 = new Date(due); dMinus15.setDate(due.getDate() - 15);
            const dMinus7 = new Date(due); dMinus7.setDate(due.getDate() - 7);
            const dPlus2 = new Date(due); dPlus2.setDate(due.getDate() + 2);

            let tipo = null;
            if (isSameDate(nowDate, dMinus15)) tipo = "15_dias_antes";
            else if (isSameDate(nowDate, dMinus7)) tipo = "7_dias_antes";
            else if (isSameDate(nowDate, dPlus2)) tipo = "2_dias_despues";
            if (!tipo) continue;

            // Idempotencia por familia + cuota + tipo + día
            const already = reminders.find(r =>
              r.familia_email === familyEmail &&
              (r.temporada?.replace(/-/g, '/') === (activeSeason || plan.temporada)?.replace(/-/g, '/')) &&
              r.mes === `Cuota ${cuota.numero}` &&
              r.tipo_recordatorio === tipo &&
              r.fecha_envio && new Date(r.fecha_envio).toDateString() === todayStr
            );
            if (already) continue;

            const cantidad = cuota.cantidad || 0;
            const fechaLimiteStr = new Date(cuota.fecha_vencimiento).toLocaleDateString('es-ES');

            let mensaje = `⏰ Recordatorio de Plan Especial (Cuota ${cuota.numero})\n\n`;
            mensaje += `Estimada familia,\n\n`;
            if (tipo === "15_dias_antes") mensaje += `Quedan 15 días para la fecha límite (${fechaLimiteStr}).\n\n`;
            if (tipo === "7_dias_antes") mensaje += `Queda 1 semana para la fecha límite (${fechaLimiteStr}).\n\n`;
            if (tipo === "2_dias_despues") mensaje += `El plazo ha vencido el ${fechaLimiteStr}.\n\n`;
            mensaje += `Pagos pendientes:\n\n`;
            mensaje += `👤 ${player.nombre} (${player.deporte}): ${cantidad}€ (Cuota ${cuota.numero})\n\n`;
            mensaje += `📧 DATOS BANCARIOS:\n`;
            mensaje += `IBAN: ES82 0049 4447 38 2010604048\n`;
            mensaje += `Banco: Santander\n`;
            mensaje += `Beneficiario: CD Bustarviejo\n`;
            mensaje += `Concepto: ${player.nombre} + Cuota ${cuota.numero}\n\n`;
            mensaje += `Por favor, accede a la app (sección Pagos) para registrar el pago y subir el justificante.\n\n`;
            mensaje += `Si ya realizaste el pago, ignora este mensaje.\n\n`;
            mensaje += `Atentamente,\nCD Bustarviejo`;

            // Buscar/crear conversación "Mensajes del Club" (optimizado con filter)
            const existingConvs = await base44.entities.PrivateConversation.filter({ 
              participante_familia_email: familyEmail,
              participante_staff_email: 'sistema@cdbustarviejo.com'
            });
            let conv = existingConvs[0];
            if (!conv) {
              conv = await base44.entities.PrivateConversation.create({
                participante_familia_email: familyEmail,
                participante_familia_nombre: player.nombre_tutor_legal || "Familia",
                participante_staff_email: "sistema@cdbustarviejo.com",
                participante_staff_nombre: "🤖 Sistema de Recordatorios - Administración",
                participante_staff_rol: "admin",
                categoria: "Todos",
                jugadores_relacionados: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
                ultimo_mensaje: mensaje.substring(0, 100),
                ultimo_mensaje_fecha: new Date().toISOString(),
                ultimo_mensaje_de: "staff",
                no_leidos_familia: 1,
                archivada: false
              });
            }

            // Mensaje al chat
            await base44.entities.PrivateMessage.create({
              conversacion_id: conv.id,
              remitente_email: "sistema@cdbustarviejo.com",
              remitente_nombre: "🤖 Sistema de Recordatorios",
              remitente_tipo: "staff",
              mensaje,
              leido: false
            });
            await base44.entities.PrivateConversation.update(conv.id, {
              ultimo_mensaje: mensaje.substring(0, 100),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff",
              no_leidos_familia: (conv.no_leidos_familia || 0) + 1
            });

            // Centro de Alertas (AppNotification)
            await base44.entities.AppNotification.create({
              usuario_email: familyEmail,
              titulo: "💳 Recordatorio de Pagos (Plan Especial)",
              mensaje: `Cuota ${cuota.numero}: ${cantidad}€ · Vencimiento ${fechaLimiteStr}. Revisa Mensajes del Club.`,
              tipo: "importante",
              icono: "💳",
              enlace: "ParentSystemMessages",
              vista: false
            });
            if (player.email_tutor_2) {
              await base44.entities.AppNotification.create({
                usuario_email: player.email_tutor_2,
                titulo: "💳 Recordatorio de Pagos (Plan Especial)",
                mensaje: `Cuota ${cuota.numero}: ${cantidad}€ · Vencimiento ${fechaLimiteStr}. Revisa Mensajes del Club.`,
                tipo: "importante",
                icono: "💳",
                enlace: "ParentSystemMessages",
                vista: false
              });
            }

            // Email (remitente configurado en función)
            await base44.functions.invoke('sendEmail', {
              to: familyEmail,
              subject: `Plan Especial - Recordatorio Cuota ${cuota.numero}`,
              html: mensaje.replace(/\n/g, '<br>')
            });
            if (player.email_tutor_2) {
              await base44.functions.invoke('sendEmail', {
                to: player.email_tutor_2,
                subject: `Plan Especial - Recordatorio Cuota ${cuota.numero}`,
                html: mensaje.replace(/\n/g, '<br>')
              });
            }

            // Registrar recordatorio automático
            await base44.entities.AutomaticReminder.create({
              temporada: (activeSeason || plan.temporada)?.replace(/-/g, '/'),
              mes: `Cuota ${cuota.numero}`,
              tipo_recordatorio: tipo,
              familia_email: familyEmail,
              jugadores_incluidos: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
              total_recordado: cantidad,
              enviado_email: true,
              enviado_chat: true,
              fecha_envio: new Date().toISOString()
            });

            sent++;
          }
        }
        if (sent > 0) {
          console.log(`✅ [PlanPaymentReminders] Enviados ${sent} recordatorios de plan especial`);
        } else {
          console.log("⏰ [PlanPaymentReminders] Hoy no hay cuotas de plan especial para recordar");
        }
      } catch (err) {
        console.error("❌ [PlanPaymentReminders] Error:", err);
      } finally {
        setProcessing(false);
      }
    };

    run();
  }, [user, processing]);

  return null;
}