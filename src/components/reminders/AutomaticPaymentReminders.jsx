import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getCuotasPorCategoriaSync } from "../payments/paymentAmounts";
import { useActiveSeason } from "../season/SeasonProvider";

// Motor de recordatorios automáticos de pago
export default function AutomaticPaymentReminders({ user }) {
  const [processing, setProcessing] = useState(false);
  const { activeSeason } = useActiveSeason();

  useEffect(() => {
    if (!user) return;
    
    // Solo ejecutar para admins o tesoreros
    const isAuthorized = user.role === "admin" || user.es_tesorero === true;
    if (!isAuthorized) return;

    // SOLO permitir ejecución si no está procesando (evitar múltiples ejecuciones)
    if (processing) {
      console.log("⏸️ [AutomaticPaymentReminders] Ya se está procesando, ignorando...");
      return;
    }

    const checkAndSendReminders = async () => {
      try {
        const now = new Date();
        const currentMonth = now.getMonth() + 1; // 1-12
        const currentDay = now.getDate();
        const currentYear = now.getFullYear();
        
        // Determinar temporada ACTIVA (SeasonProvider) con fallback por fecha
        const currentSeason = (activeSeason || (currentMonth >= 9 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`)).replace(/-/g, '/');
        
        // Determinar si estamos en fecha de envío de recordatorio
        // Fechas límite: Junio 30, Septiembre 15, Diciembre 15
        let mesRecordatorio = null;
        let tipoRecordatorio = null;
        
        if (currentMonth === 6) {
          if (currentDay === 15) {
            mesRecordatorio = "Junio";
            tipoRecordatorio = "15_dias_antes";
          } else if (currentDay === 23) {
            mesRecordatorio = "Junio";
            tipoRecordatorio = "7_dias_antes";
          }
        } else if (currentMonth === 7 && currentDay === 2) {
          mesRecordatorio = "Junio";
          tipoRecordatorio = "2_dias_despues";
        } else if (currentMonth === 9) {
          if (currentDay === 1) {
            mesRecordatorio = "Septiembre";
            tipoRecordatorio = "15_dias_antes";
          } else if (currentDay === 8) {
            mesRecordatorio = "Septiembre";
            tipoRecordatorio = "7_dias_antes";
          }
        } else if (currentMonth === 9 && currentDay === 17) {
          mesRecordatorio = "Septiembre";
          tipoRecordatorio = "2_dias_despues";
        } else if (currentMonth === 12) {
          if (currentDay === 1) {
            mesRecordatorio = "Diciembre";
            tipoRecordatorio = "15_dias_antes";
          } else if (currentDay === 8) {
            mesRecordatorio = "Diciembre";
            tipoRecordatorio = "7_dias_antes";
          } else if (currentDay === 17) {
            mesRecordatorio = "Diciembre";
            tipoRecordatorio = "2_dias_despues";
          }
        }
        
        if (!mesRecordatorio || !tipoRecordatorio) {
          console.log("⏰ [AutomaticPaymentReminders] No es fecha de recordatorio");
          return;
        }
        
        console.log(`🔔 [AutomaticPaymentReminders] Verificando recordatorios ${tipoRecordatorio} para ${mesRecordatorio} ${currentSeason}`);
        
        setProcessing(true);
        
        // VERIFICAR SI YA SE ENVIARON RECORDATORIOS HOY (más estricto)
        const existingReminders = await base44.entities.AutomaticReminder.list();
        const alreadySentToday = existingReminders.filter(r => 
          r.temporada === currentSeason &&
          r.mes === mesRecordatorio &&
          r.tipo_recordatorio === tipoRecordatorio &&
          r.fecha_envio &&
          new Date(r.fecha_envio).toDateString() === now.toDateString()
        );
        
        if (alreadySentToday.length > 0) {
          console.log(`✅ [AutomaticPaymentReminders] Ya se enviaron ${alreadySentToday.length} recordatorios hoy - ABORTANDO`);
          setProcessing(false);
          return;
        }
        
        // LOCK global para evitar ejecuciones simultáneas
        const lockKey = `payment_reminder_lock_${currentSeason}_${mesRecordatorio}_${tipoRecordatorio}`;
        const existingLock = sessionStorage.getItem(lockKey);
        if (existingLock) {
          console.log(`🔒 [AutomaticPaymentReminders] Ya hay un proceso en ejecución - ABORTANDO`);
          setProcessing(false);
          return;
        }
        
        // Establecer lock
        sessionStorage.setItem(lockKey, 'true');
        
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
            
            // Personalizar mensaje según tipo de recordatorio
            const fechasLimite = {
              "Junio": "30 de junio",
              "Septiembre": "15 de septiembre",
              "Diciembre": "15 de diciembre"
            };
            
            const mensajesTipo = {
              "15_dias_antes": {
                titulo: "📅 Recordatorio de Pago - Faltan 15 días",
                intro: `Les recordamos que la fecha límite de pago para ${mesRecordatorio} es el ${fechasLimite[mesRecordatorio]}. Todavía tienen tiempo suficiente para realizar el pago.`,
                urgencia: ""
              },
              "7_dias_antes": {
                titulo: "⏰ Recordatorio Importante - Falta 1 semana",
                intro: `Les recordamos que quedan solo 7 días para la fecha límite de pago de ${mesRecordatorio} (${fechasLimite[mesRecordatorio]}).`,
                urgencia: "\n⚠️ Por favor, realice el pago lo antes posible para evitar retrasos.\n"
              },
              "2_dias_despues": {
                titulo: "🔴 PAGO ATRASADO - Acción Requerida",
                intro: `El plazo de pago de ${mesRecordatorio} (${fechasLimite[mesRecordatorio]}) ha vencido. Es importante que regularice esta situación lo antes posible.`,
                urgencia: "\n⚠️ URGENTE: Contacte con el club si tiene algún problema para realizar el pago.\n"
              }
            };
            
            const mensajeTipo = mensajesTipo[tipoRecordatorio];
            
            // Construir mensaje
            let mensaje = `🔔 ${mensajeTipo.titulo}\n\n`;
            mensaje += `Estimada familia,\n\n`;
            mensaje += `${mensajeTipo.intro}\n\n`;
            mensaje += `Pagos pendientes:\n\n`;
            
            family.jugadores.forEach(jugador => {
              mensaje += `👤 ${jugador.jugador_nombre} (${jugador.deporte}): ${jugador.cantidad}€\n`;
            });
            
            mensaje += `\nTotal a pagar: ${totalFamilia}€\n`;
            mensaje += mensajeTipo.urgencia;
            mensaje += `\n📧 DATOS BANCARIOS:\n`;
            mensaje += `IBAN: ES82 0049 4447 38 2010604048\n`;
            mensaje += `Banco: Santander\n`;
            mensaje += `Beneficiario: CD Bustarviejo\n`;
            mensaje += `Concepto: Nombre del jugador + ${mesRecordatorio}\n\n`;
            mensaje += `📲 Por favor, accede a la app en la sección "💳 Pagos" para registrar tu pago y subir el justificante.\n\n`;
            mensaje += `Si ya realizaste el pago, ignora este mensaje.\n\n`;
            mensaje += `Atentamente,\nCD Bustarviejo`;
            
            // Buscar o crear conversación privada (usar filter en vez de list para rendimiento)
            const matchingConvs = await base44.entities.PrivateConversation.filter({
              participante_familia_email: family.email,
              participante_staff_email: 'sistema@cdbustarviejo.com'
            });
            let conv = matchingConvs[0];
            
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
            
            // Generar email HTML bonito
            const { scheduledPaymentReminderHtml } = await import('../emails/emailTemplates');
            const emailHtml = scheduledPaymentReminderHtml(
              tipoRecordatorio, mesRecordatorio, fechasLimite[mesRecordatorio],
              family.jugadores, totalFamilia
            );
            const subjectEmoji = tipoRecordatorio === '2_dias_despues' ? '🔴' : tipoRecordatorio === '7_dias_antes' ? '⚠️' : '📅';
            const emailSubject = `${subjectEmoji} ${mensajeTipo.titulo} - ${mesRecordatorio}`;

            // Enviar email
            await base44.functions.invoke('sendEmail', {
              to: family.email,
              subject: emailSubject,
              html: emailHtml
            });
            
            if (family.email_tutor_2) {
              await base44.functions.invoke('sendEmail', {
                to: family.email_tutor_2,
                subject: emailSubject,
                html: emailHtml
              });
            }
            
            // Crear notificación en Centro de Alertas
            await base44.entities.AppNotification.create({
              usuario_email: family.email,
              titulo: `💳 ${mensajeTipo.titulo}`,
              mensaje: `Tienes ${family.jugadores.length} pago(s) pendiente(s) de ${mesRecordatorio} por ${totalFamilia}€. Revisa Mensajes del Club.`,
              tipo: "importante",
              icono: "💳",
              enlace: "ParentSystemMessages",
              vista: false
            });
            if (family.email_tutor_2) {
              await base44.entities.AppNotification.create({
                usuario_email: family.email_tutor_2,
                titulo: `💳 ${mensajeTipo.titulo}`,
                mensaje: `Tienes ${family.jugadores.length} pago(s) pendiente(s) de ${mesRecordatorio} por ${totalFamilia}€. Revisa Mensajes del Club.`,
                tipo: "importante",
                icono: "💳",
                enlace: "ParentSystemMessages",
                vista: false
              });
            }
            
            // Registrar que se envió
            await base44.entities.AutomaticReminder.create({
              temporada: currentSeason,
              mes: mesRecordatorio,
              tipo_recordatorio: tipoRecordatorio,
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
        
        // Liberar lock
        sessionStorage.removeItem(lockKey);
        setProcessing(false);
        
      } catch (error) {
        console.error("❌ [AutomaticPaymentReminders] Error general:", error);
        // Liberar lock en caso de error
        sessionStorage.removeItem(lockKey);
        setProcessing(false);
      }
    };
    
    // EJECUTAR SOLO UNA VEZ al montar (sin interval para evitar duplicados)
    checkAndSendReminders();
    
  }, [user]);

  return null; // Componente invisible
}