import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getCuotasPorCategoriaSync } from "../payments/paymentAmounts";

// Motor de recordatorios automáticos de pago
export default function AutomaticPaymentReminders({ user }) {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || processing) return;
    
    // Solo ejecutar para admins o tesoreros
    const isAuthorized = user.role === "admin" || user.es_tesorero === true;
    if (!isAuthorized) return;

    const checkAndSendReminders = async () => {
      try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDay = now.getDate();
        const currentYear = now.getFullYear();
        
        // Determinar temporada actual
        const currentSeason = currentMonth >= 9 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
        
        // Determinar si estamos en inicio de mes de pago (días 1-5)
        let mesRecordatorio = null;
        if (currentMonth === 6 && currentDay <= 5) {
          mesRecordatorio = "Junio";
        } else if (currentMonth === 9 && currentDay <= 5) {
          mesRecordatorio = "Septiembre";
        } else if (currentMonth === 12 && currentDay <= 5) {
          mesRecordatorio = "Diciembre";
        }
        
        if (!mesRecordatorio) {
          console.log("⏰ [AutomaticPaymentReminders] No es inicio de mes de pago");
          return;
        }
        
        console.log(`🔔 [AutomaticPaymentReminders] Verificando recordatorios para ${mesRecordatorio} ${currentSeason}`);
        
        setProcessing(true);
        
        // Verificar si ya se enviaron recordatorios este mes/temporada
        const existingReminders = await base44.entities.AutomaticReminder.list();
        const alreadySentToday = existingReminders.filter(r => 
          r.temporada === currentSeason &&
          r.mes === mesRecordatorio &&
          r.fecha_envio &&
          new Date(r.fecha_envio).toDateString() === now.toDateString()
        );
        
        if (alreadySentToday.length > 0) {
          console.log(`✅ [AutomaticPaymentReminders] Ya se enviaron ${alreadySentToday.length} recordatorios hoy`);
          setProcessing(false);
          return;
        }
        
        // Obtener datos
        const [allPlayers, allPayments, categoryConfigs] = await Promise.all([
          base44.entities.Player.list(),
          base44.entities.Payment.list(),
          base44.entities.CategoryConfig.list()
        ]);
        
        const activePlayers = allPlayers.filter(p => p.activo === true);
        
        // Agrupar por familia con pagos pendientes de este mes
        const familiesWithPending = {};
        
        activePlayers.forEach(player => {
          const playerPayments = allPayments.filter(p => 
            p.jugador_id === player.id && 
            p.temporada.replace(/-/g, '/') === currentSeason
          );
          
          // Verificar si tiene pago único ya pagado
          const hasPagoUnico = playerPayments.some(p => 
            (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
            (p.estado === "Pagado" || p.estado === "En revisión")
          );
          
          if (hasPagoUnico) return; // Ya pagó todo
          
          // Verificar si tiene el pago de este mes pendiente
          const pagoMesPagado = playerPayments.find(p => 
            p.mes === mesRecordatorio && (p.estado === "Pagado" || p.estado === "En revisión")
          );
          
          if (pagoMesPagado) return; // Ya pagó este mes
          
          // Este jugador debe el pago de este mes
          const cuotas = getCuotasPorCategoriaSync(player.deporte);
          const cantidad = mesRecordatorio === "Junio" ? cuotas.inscripcion : 
                          mesRecordatorio === "Septiembre" ? cuotas.segunda : 
                          cuotas.tercera;
          
          const familyEmail = player.email_padre;
          if (!familyEmail) return;
          
          if (!familiesWithPending[familyEmail]) {
            familiesWithPending[familyEmail] = {
              email: familyEmail,
              nombre_tutor: player.nombre_tutor_legal || "Familia",
              email_tutor_2: player.email_tutor_2,
              jugadores: []
            };
          }
          
          familiesWithPending[familyEmail].jugadores.push({
            jugador_id: player.id,
            jugador_nombre: player.nombre,
            deporte: player.deporte,
            cantidad
          });
        });
        
        const familiesToNotify = Object.values(familiesWithPending);
        
        if (familiesToNotify.length === 0) {
          console.log(`✅ [AutomaticPaymentReminders] No hay familias con pagos pendientes para ${mesRecordatorio}`);
          setProcessing(false);
          return;
        }
        
        console.log(`📤 [AutomaticPaymentReminders] Enviando ${familiesToNotify.length} recordatorios para ${mesRecordatorio}`);
        
        // Enviar recordatorios
        let sent = 0;
        for (const family of familiesToNotify) {
          try {
            const totalFamilia = family.jugadores.reduce((sum, j) => sum + j.cantidad, 0);
            
            // Construir mensaje
            let mensaje = `🔔 RECORDATORIO AUTOMÁTICO DE PAGO - ${mesRecordatorio}\n\n`;
            mensaje += `Estimada familia,\n\n`;
            mensaje += `Les recordamos que tienen los siguientes pagos pendientes para ${mesRecordatorio}:\n\n`;
            
            family.jugadores.forEach(jugador => {
              mensaje += `👤 ${jugador.jugador_nombre} (${jugador.deporte}): ${jugador.cantidad}€\n`;
            });
            
            mensaje += `\nTotal a pagar: ${totalFamilia}€\n\n`;
            mensaje += `📧 DATOS BANCARIOS:\n`;
            mensaje += `IBAN: ES82 0049 4447 38 2010604048\n`;
            mensaje += `Banco: Santander\n`;
            mensaje += `Beneficiario: CD Bustarviejo\n\n`;
            mensaje += `Por favor, accede a la app en la sección "💳 Pagos" para registrar tu pago.\n\n`;
            mensaje += `Atentamente,\nCD Bustarviejo`;
            
            // Buscar o crear conversación privada
            const allConvs = await base44.entities.PrivateConversation.list();
            let conv = allConvs.find(c => 
              c.participante_familia_email === family.email &&
              c.participante_staff_email === 'sistema@cdbustarviejo.com'
            );
            
            if (!conv) {
              conv = await base44.entities.PrivateConversation.create({
                participante_familia_email: family.email,
                participante_familia_nombre: family.nombre_tutor,
                participante_staff_email: "sistema@cdbustarviejo.com",
                participante_staff_nombre: "🤖 Sistema de Recordatorios - Administración",
                participante_staff_rol: "admin",
                categoria: "Todos",
                jugadores_relacionados: family.jugadores.map(j => ({ 
                  jugador_id: j.jugador_id, 
                  jugador_nombre: j.jugador_nombre 
                })),
                ultimo_mensaje: mensaje.substring(0, 100),
                ultimo_mensaje_fecha: new Date().toISOString(),
                ultimo_mensaje_de: "staff",
                no_leidos_familia: 1,
                archivada: false
              });
            }
            
            // Crear mensaje en chat privado
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
            
            // Enviar email
            await base44.integrations.Core.SendEmail({
              from_name: "CD Bustarviejo - Recordatorio Automático",
              to: family.email,
              subject: `Recordatorio de Pago ${mesRecordatorio} - CD Bustarviejo`,
              body: mensaje
            });
            
            if (family.email_tutor_2) {
              await base44.integrations.Core.SendEmail({
                from_name: "CD Bustarviejo - Recordatorio Automático",
                to: family.email_tutor_2,
                subject: `Recordatorio de Pago ${mesRecordatorio} - CD Bustarviejo`,
                body: mensaje
              });
            }
            
            // Registrar que se envió
            await base44.entities.AutomaticReminder.create({
              temporada: currentSeason,
              mes: mesRecordatorio,
              familia_email: family.email,
              jugadores_incluidos: family.jugadores,
              total_recordado: totalFamilia,
              enviado_email: true,
              enviado_chat: true,
              fecha_envio: new Date().toISOString()
            });
            
            sent++;
            console.log(`✅ [AutomaticPaymentReminders] Enviado a ${family.email}`);
            
            // Esperar 1 segundo entre envíos
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(`❌ [AutomaticPaymentReminders] Error enviando a ${family.email}:`, error);
          }
        }
        
        console.log(`✅ [AutomaticPaymentReminders] Proceso completado: ${sent} recordatorios enviados`);
        setProcessing(false);
        
      } catch (error) {
        console.error("❌ [AutomaticPaymentReminders] Error general:", error);
        setProcessing(false);
      }
    };
    
    // Ejecutar al montar y luego cada hora
    checkAndSendReminders();
    const interval = setInterval(checkAndSendReminders, 60 * 60 * 1000); // 1 hora
    
    return () => clearInterval(interval);
  }, [user, processing]);

  return null; // Componente invisible
}