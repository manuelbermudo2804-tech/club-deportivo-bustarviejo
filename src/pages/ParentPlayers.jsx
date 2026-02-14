import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { useActiveSeason } from "../components/season/SeasonProvider";

import PlayerCard from "../components/players/PlayerCard";
import PlayerFormWizard from "../components/players/PlayerFormWizard";
import PlayerForm from "../components/players/PlayerForm";
import FullscreenFormModal from "../components/players/FullscreenFormModal";
import ContactCard from "../components/ContactCard";
import AchievementsBadges from "../components/dashboard/AchievementsBadges";
import PlayerCardSkeleton from "../components/skeletons/PlayerCardSkeleton";
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";
import { usePageTutorial } from "../components/tutorials/useTutorial";
import InscriptionPaymentFlow from "../components/inscriptions/InscriptionPaymentFlow";
import InscriptionSuccessScreen from "../components/inscriptions/InscriptionSuccessScreen";
import ShareFormButton from "../components/players/ShareFormButton";


export default function ParentPlayers() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [showPaymentFlow, setShowPaymentFlow] = useState(false);
  const [pendingPlayerData, setPendingPlayerData] = useState(null);
  const [showInscriptionSuccess, setShowInscriptionSuccess] = useState(false);
  const [inscriptionSuccessData, setInscriptionSuccessData] = useState(null);
  const [isAdultPlayerSelfRegistration, setIsAdultPlayerSelfRegistration] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Tutorial interactivo para primera visita
  usePageTutorial("parent_players");

  // Detectar si debe abrir el formulario de registro automáticamente (onboarding)
  useEffect(() => {
    const checkAutoOpenForm = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.debe_mostrar_registro_jugador === true) {
          console.log('📝 [ParentPlayers] Auto-abriendo formulario de registro (onboarding)');
          setShowForm(true);
          setEditingPlayer(null);
          setSuggestedCategory(null);
          
          // Limpiar el flag
          await base44.auth.updateMe({ debe_mostrar_registro_jugador: false });
        }
      } catch (error) {
        console.error('Error checking auto-open form:', error);
      }
    };
    
    checkAutoOpenForm();
  }, []);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });
  const isPlayerUser = user?.tipo_panel === 'jugador_adulto' || user?.es_jugador === true;

  const { activeSeason: currentSeason, seasonConfig } = useActiveSeason();

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs', seasonConfig?.temporada],
    queryFn: async () => {
      if (!seasonConfig?.temporada) return [];
      const configs = await base44.entities.CategoryConfig.filter({ 
        temporada: seasonConfig.temporada,
        activa: true 
      });
      console.log('📊 [ParentPlayers] CategoryConfigs cargadas:', configs.length, configs.map(c => c.nombre));
      return configs;
    },
    enabled: !!seasonConfig?.temporada,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['myPlayers', user?.email, seasonConfig?.permitir_renovaciones],
    queryFn: async () => {
      if (!user?.email) return [];
      const myPlayers = await base44.entities.Player.filter({
        $or: [
          { email_padre: user.email },
          { email_tutor_2: user.email }
        ]
      });
      
      console.log('🔍 [ParentPlayers] Mis jugadores encontrados:', myPlayers.length, myPlayers.map(p => p.nombre));
      
      // Si permitir_renovaciones está activo, mostrar activos + pendientes (NO los que dijeron no_renueva)
      // Si no, solo mostrar los ACTIVOS
      if (seasonConfig?.permitir_renovaciones) {
        // Mostrar: activos + pendientes de renovar (pero NO los que dijeron "no_renueva")
        return myPlayers.filter(p => 
          p.activo === true || 
          (p.estado_renovacion === "pendiente" && p.temporada_renovacion === seasonConfig?.temporada)
        );
      }
      return myPlayers.filter(p => p.activo === true);
    },
    enabled: !!user?.email,
    staleTime: 60000, // 1 minuto
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // This query was removed to prevent permission issues for non-admin users.

  const { data: schedules } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list('-fecha_evaluacion'),
    initialData: [],
    staleTime: 300000, // 5 minutos
    gcTime: 600000,
    refetchOnWindowFocus: false,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
    staleTime: 60000, // 1 minuto
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
    staleTime: 60000, // 1 minuto
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  const createPlayerMutation = useMutation({
    mutationFn: async ({ playerData, paymentsData }) => {
      const currentUser = await base44.auth.me();
      const dataWithParentEmail = {
        ...playerData,
        email_padre: currentUser?.email || playerData.email_padre
      };
      const newPlayer = await base44.entities.Player.create(dataWithParentEmail);

      // Crear pagos automáticamente si se seleccionó modalidad
      if (paymentsData?.payments) {
        for (const payment of paymentsData.payments) {
          await base44.entities.Payment.create({
            ...payment,
            jugador_id: newPlayer.id,
            jugador_nombre: newPlayer.nombre
          });
        }
      }

      // AUTO-CREAR SOCIO: Al inscribir un jugador, el padre automáticamente se convierte en socio pagado
      // (la cuota de socio está incluida en la inscripción del jugador)
      try {
        const existingMember = await base44.entities.ClubMember.filter({
          email: dataWithParentEmail.email_padre,
          temporada: seasonConfig?.temporada
        });

        if (existingMember.length === 0) {
          console.log('🎫 [ParentPlayers] Creando socio automáticamente para:', dataWithParentEmail.email_padre);
          await base44.entities.ClubMember.create({
            email: dataWithParentEmail.email_padre,
            nombre_completo: dataWithParentEmail.nombre_tutor_legal || currentUser?.full_name || "",
            telefono: dataWithParentEmail.telefono || "",
            direccion: dataWithParentEmail.direccion || "",
            temporada: seasonConfig?.temporada || new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
            estado_pago: "Pagado",
            fecha_pago: new Date().toISOString(),
            metodo_pago: "Incluido en inscripción jugador",
            notas: `Cuota de socio incluida automáticamente en inscripción de ${newPlayer.nombre}`,
            referido_por: null
          });
          console.log('✅ [ParentPlayers] Socio creado automáticamente');
        } else {
          console.log('ℹ️ [ParentPlayers] Socio ya existe, no se crea duplicado');
        }
      } catch (memberError) {
        console.error('[ParentPlayers] Error creando socio automático:', memberError);
      }

      // DETECCIÓN AUTOMÁTICA DE JUGADOR +18
      // Si el jugador es mayor de 18 años y el email coincide con el usuario actual
      const calcularEdadJugador = (fechaNac) => {
        if (!fechaNac) return null;
        const hoy = new Date();
        const nacimiento = new Date(fechaNac);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        return edad;
      };

      const edadJugador = calcularEdadJugador(playerData.fecha_nacimiento);
      const esMayorDe18 = edadJugador >= 18 || playerData.es_mayor_edad === true;

      if (esMayorDe18 && dataWithParentEmail.email_padre === currentUser?.email) {
        // El usuario está registrando a sí mismo como jugador +18
        // Actualizar automáticamente su perfil de usuario
        try {
          await base44.auth.updateMe({
            es_jugador: true,
            player_id: newPlayer.id
          });
          console.log('✅ Usuario actualizado automáticamente como Jugador +18');

          // FORZAR RECARGA COMPLETA DE LA PÁGINA para que el Layout detecte el cambio
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } catch (error) {
          console.error('Error actualizando usuario como jugador +18:', error);
        }
      }
      
      // Recalcular descuentos de TODOS los hermanos de la familia
      try {
        const allPlayersInDB = await base44.entities.Player.list();
        const familyPlayers = allPlayersInDB.filter(p => 
          (p.email_padre === currentUser?.email || p.email_padre === dataWithParentEmail.email_padre) &&
          p.activo &&
          p.id !== newPlayer.id
        );
        
        if (familyPlayers.length > 0) {
          // Incluir el nuevo jugador en el cálculo
          const allFamilyBirthDates = [
            ...familyPlayers.map(p => ({ id: p.id, nombre: p.nombre, fecha: p.fecha_nacimiento })),
            { id: newPlayer.id, nombre: newPlayer.nombre, fecha: newPlayer.fecha_nacimiento }
          ].filter(p => p.fecha);
          
          // Ordenar por fecha (el mayor primero - fecha más antigua)
          allFamilyBirthDates.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
          
          // El mayor (primera posición) no tiene descuento, los demás sí
          const oldestPlayerId = allFamilyBirthDates[0]?.id;
          
          // Obtener todos los pagos pendientes de la familia
          const allPayments = await base44.entities.Payment.list();
          
          // Actualizar descuentos de todos los hermanos existentes
          for (const sibling of familyPlayers) {
            const shouldHaveDiscount = sibling.id !== oldestPlayerId;
            const currentHasDiscount = sibling.tiene_descuento_hermano === true;
            
            if (shouldHaveDiscount !== currentHasDiscount) {
              // Actualizar el jugador
              await base44.entities.Player.update(sibling.id, {
                tiene_descuento_hermano: shouldHaveDiscount,
                descuento_aplicado: shouldHaveDiscount ? 25 : 0
              });
              console.log(`📋 Descuento actualizado para ${sibling.nombre}: ${shouldHaveDiscount ? '25€' : 'sin descuento'}`);
              
              // Buscar dónde aplicar el descuento de 25€
              if (shouldHaveDiscount && !currentHasDiscount) {
                // El hermano ahora tiene derecho a descuento - buscar dónde aplicarlo
                
                // Primero intentar en Junio si está pendiente
                const junioPendiente = allPayments.find(p => 
                  p.jugador_id === sibling.id && 
                  p.estado === "Pendiente" &&
                  p.mes === "Junio"
                );
                
                if (junioPendiente) {
                  // Aplicar descuento en Junio
                  const newAmount = (junioPendiente.cantidad || 0) - 25;
                  if (newAmount > 0) {
                    await base44.entities.Payment.update(junioPendiente.id, {
                      cantidad: newAmount,
                      notas: `${junioPendiente.notas || ''} [Descuento hermano 25€ aplicado]`.trim()
                    });
                    console.log(`💰 Descuento aplicado en Junio de ${sibling.nombre}: -25€`);
                  }
                } else {
                  // Junio ya está pagado/en revisión - aplicar en siguiente cuota pendiente
                  const siguienteCuotaPendiente = allPayments.find(p => 
                    p.jugador_id === sibling.id && 
                    p.estado === "Pendiente" &&
                    (p.mes === "Septiembre" || p.mes === "Diciembre")
                  );
                  
                  if (siguienteCuotaPendiente) {
                    const newAmount = (siguienteCuotaPendiente.cantidad || 0) - 25;
                    if (newAmount > 0) {
                      await base44.entities.Payment.update(siguienteCuotaPendiente.id, {
                        cantidad: newAmount,
                        notas: `${siguienteCuotaPendiente.notas || ''} [Descuento hermano 25€ aplicado - trasladado de inscripción]`.trim()
                      });
                      console.log(`💰 Descuento trasladado a ${siguienteCuotaPendiente.mes} de ${sibling.nombre}: -25€`);
                    }
                  } else {
                    // No hay cuotas pendientes - guardar nota en el jugador para aplicar manualmente
                    console.log(`⚠️ ${sibling.nombre} tiene derecho a 25€ de descuento pero no hay cuotas pendientes`);
                  }
                }
              }
            }
          }
          
          // Actualizar el nuevo jugador si corresponde
          const newPlayerShouldHaveDiscount = newPlayer.id !== oldestPlayerId;
          if (newPlayerShouldHaveDiscount !== newPlayer.tiene_descuento_hermano) {
            await base44.entities.Player.update(newPlayer.id, {
              tiene_descuento_hermano: newPlayerShouldHaveDiscount,
              descuento_aplicado: newPlayerShouldHaveDiscount ? 25 : 0
            });
          }
        }
      } catch (error) {
        console.error("Error recalculando descuentos familiares:", error);
      }
      
      // AVISO AL SEGUNDO PROGENITOR (email informativo, sin enlaces ni tokens)
      if (dataWithParentEmail.email_tutor_2 && dataWithParentEmail.email_tutor_2.trim()) {
        try {
          const email2 = dataWithParentEmail.email_tutor_2.trim().toLowerCase();

          // Evitar avisos duplicados si ya figura como segundo progenitor en cualquier jugador
          const allPlayersForCheck = await base44.entities.Player.list();
          const alreadyRegistered = allPlayersForCheck.some(p =>
            p.email_tutor_2?.toLowerCase() === email2
          );

          if (!alreadyRegistered) {
            const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

            await base44.functions.invoke('sendEmail', {
              to: email2,
              subject: `👨‍👩‍👧 Has sido añadido como segundo progenitor - CD Bustarviejo`,
              html: `<!DOCTYPE html>
      <html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"></head>
      <body style=\"margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;\">
      <table role=\"presentation\" width=\"100%\" style=\"max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;\">
      <tr>
      <td style=\"background:#ea580c;padding:24px;text-align:center;\">
        <img src=\"${CLUB_LOGO_URL}\" alt=\"CD Bustarviejo\" width=\"72\" height=\"72\" style=\"border-radius:12px;border:3px solid #fff\" />
        <h1 style=\"color:#fff;margin:12px 0 0;font-size:22px;\">CD Bustarviejo</h1>
      </td>
      </tr>
      <tr>
      <td style=\"padding:28px;\">
        <h2 style=\"margin:0 0 12px 0;color:#0f172a;font-size:20px;\">Invitación como segundo progenitor</h2>
        <p style=\"margin:0 0 12px 0;color:#334155;font-size:14px;\">
          ${currentUser?.full_name || 'Un familiar'} te ha añadido como <strong>segundo progenitor/tutor</strong> del jugador <strong>${dataWithParentEmail.nombre}</strong>.
        </p>
        <p style=\"margin:0 0 16px 0;color:#334155;font-size:14px;\">
          En breve recibirás un correo para iniciar sesión en la app. Cuando accedas con este email, se activará tu acceso y verás un breve onboarding específico para segundos progenitores.
        </p>
        <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:8px;\">
          <ul style=\"margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.6;\">
            <li>Convocatorias y calendario</li>
            <li>Pagos y documentos</li>
            <li>Chat con entrenadores y coordinador</li>
          </ul>
        </div>
        <p style=\"margin:16px 0 0 0;color:#64748b;font-size:12px;\">Si no esperabas este mensaje, simplemente ignóralo.</p>
      </td>
      </tr>
      <tr>
      <td style=\"background:#1e293b;padding:16px;text-align:center;\">
        <p style=\"color:#94a3b8;font-size:12px;margin:0;\">cdbustarviejo@gmail.com</p>
      </td>
      </tr>
      </table>
      </body></html>`
            });
            console.log('✅ Email informativo enviado al segundo progenitor:', email2);
          } else {
            console.log('ℹ️ Segundo progenitor ya existente, no se reenvía aviso:', email2);
          }
        } catch (invError) {
          console.error('Error enviando aviso a segundo progenitor:', invError);
        }

        // Invitar al segundo progenitor (el backend gestiona el flujo: intenta directo → fallback a solicitud admin)
        try {
          const email2 = dataWithParentEmail.email_tutor_2.trim().toLowerCase();
          const result = await base44.functions.invoke('inviteSecondParent', {
            email: email2,
            playerName: newPlayer.nombre,
            inviterName: currentUser?.full_name || '',
            playerId: newPlayer.id
          });
          if (result.data?.alreadyExists) {
            console.log('ℹ️ Segundo progenitor ya tiene cuenta:', email2);
          } else if (result.data?.needsAdmin) {
            console.log('📨 Solicitud de invitación creada para admin:', email2);
          } else {
            console.log('✅ Invitación enviada a segundo progenitor:', email2);
          }
        } catch (e) {
          console.error('Error invitando a segundo progenitor:', e);
        }
      }
      
      // ⚽👧 BONUS FÚTBOL FEMENINO - Detectar si el padre que inscribe fue referido y la jugadora es femenina
      try {
        if (seasonConfig?.programa_referidos_activo && seasonConfig?.bonus_femenino_activo && playerData.deporte === "Fútbol Femenino") {
          console.log('⚽👧 [ParentPlayers] Detectada inscripción de jugadora FEMENINA');
          
          // Buscar si este padre fue referido por alguien (tiene un registro en ClubMember con referido_por)
          const allMembers = await base44.entities.ClubMember.list();
          const myMembership = allMembers.find(m => m.email?.toLowerCase() === currentUser?.email?.toLowerCase() && m.temporada === seasonConfig?.temporada);
          
          if (myMembership?.referido_por) {
            console.log('🎯 [ParentPlayers] Padre fue referido por:', myMembership.referido_por);
            
            // Buscar al referidor por nombre
            const allUsers = await base44.entities.User.list();
            const referrer = allUsers.find(u => 
              u.full_name?.toLowerCase() === myMembership.referido_por?.toLowerCase()
            );
            
            if (referrer) {
              console.log('✨ [ParentPlayers] Aplicando BONUS FEMENINO a:', referrer.full_name);
              
              const bonusCredito = seasonConfig.bonus_femenino_credito || 10;
              const bonusSorteos = seasonConfig.bonus_femenino_sorteos || 2;
              
              // Crear registro de reward con bonus femenino
              await base44.entities.ReferralReward.create({
                referrer_email: referrer.email,
                referrer_name: referrer.full_name,
                referred_member_id: myMembership.id,
                referred_member_name: myMembership.nombre_completo,
                referred_player_id: newPlayer.id,
                referred_player_name: playerData.nombre,
                referred_player_category: playerData.deporte,
                is_femenino_bonus: true,
                temporada: seasonConfig?.temporada,
                clothing_credit_earned: bonusCredito,
                raffle_entries_earned: bonusSorteos
              });
              
              // Actualizar crédito del referidor
              const newCredit = (referrer.clothing_credit_balance || 0) + bonusCredito;
              const newRaffles = (referrer.raffle_entries_total || 0) + bonusSorteos;
              const newFemeninoCount = (referrer.femenino_referrals_count || 0) + 1;
              
              await base44.entities.User.update(referrer.id, {
                clothing_credit_balance: newCredit,
                raffle_entries_total: newRaffles,
                femenino_referrals_count: newFemeninoCount
              });
              
              console.log(`✅ [ParentPlayers] BONUS FEMENINO aplicado: +${bonusCredito}€ +${bonusSorteos} sorteos a ${referrer.full_name}`);
              
              // Notificar al referidor por email
              if (referrer.email) {
                await base44.functions.invoke('sendEmail', {
                  to: referrer.email,
                  subject: "⚽👧 ¡BONUS FÚTBOL FEMENINO! Has ganado premios extra",
                  html: `¡Enhorabuena ${referrer.full_name}!<br><br>

🎉 El socio que trajiste (${myMembership.nombre_completo}) ha inscrito una jugadora en el FÚTBOL FEMENINO: ${playerData.nombre}<br><br>

Por apoyar el crecimiento del fútbol femenino, ¡has ganado un BONUS EXTRA!<br><br>

🎁 BONUS ESPECIAL:<br>
• +${bonusCredito}€ de crédito en ropa (EXTRA)<br>
• +${bonusSorteos} participaciones en sorteos (EXTRA)<br><br>

💰 Tu saldo actualizado:<br>
• Crédito en ropa: ${newCredit}€<br>
• Participaciones en sorteos: ${newRaffles}<br><br>

¡Gracias por ayudar a crecer el fútbol femenino en Bustarviejo! ⚽💪<br><br>

Un abrazo,<br>
CD Bustarviejo`
                });
              }
            }
          }
        }
      } catch (bonusError) {
        console.error('[ParentPlayers] Error aplicando bonus femenino:', bonusError);
      }

      try {
        if (seasonConfig?.notificaciones_admin_email) {
          console.log('📧 [ParentPlayers] Enviando notificación de inscripción a admin');
          await base44.functions.invoke('sendEmail', {
          to: "cdbustarviejo@gmail.com",
          subject: `Nueva Inscripción de Jugador - ${playerData.nombre}`,
          html: `
            <h2>Nueva Inscripción Recibida</h2>
            <p><strong>Tipo:</strong> ${playerData.tipo_inscripcion}</p>
            <p><strong>Jugador:</strong> ${playerData.nombre}</p>
            <p><strong>Deporte/Categoría:</strong> ${playerData.deporte}</p>
            <p><strong>Fecha de Nacimiento:</strong> ${new Date(playerData.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
            <hr>
            <h3>Datos de Contacto:</h3>
            <p><strong>Email Padre/Tutor 1:</strong> ${playerData.email_padre}</p>
            <p><strong>Teléfono:</strong> ${playerData.telefono}</p>
            ${playerData.email_tutor_2 ? `<p><strong>Email Padre/Tutor 2:</strong> ${playerData.email_tutor_2}</p>` : ''}
            ${playerData.telefono_tutor_2 ? `<p><strong>Teléfono Tutor 2:</strong> ${playerData.telefono_tutor_2}</p>` : ''}
            ${playerData.email_jugador ? `<p><strong>Email Jugador:</strong> ${playerData.email_jugador} (Acceso autorizado)</p>` : ''}
            <p><strong>Dirección:</strong> ${playerData.direccion}</p>
            <hr>
            <h3>Autorizaciones:</h3>
            <p><strong>Política de Privacidad:</strong> ${playerData.acepta_politica_privacidad ? 'Aceptada ✅' : 'No aceptada'}</p>
            <p><strong>Fotografías/Videos:</strong> ${playerData.autorizacion_fotografia}</p>
            <p><strong>Acceso del Jugador a la App:</strong> ${playerData.acceso_jugador_autorizado ? 'Autorizado ✅' : 'No autorizado'}</p>
            ${playerData.observaciones ? `<hr><h3>Observaciones:</h3><p>${playerData.observaciones}</p>` : ''}
            <hr>
            <p style="font-size: 12px; color: #666;">Inscripción registrada el ${new Date().toLocaleString('es-ES')}</p>
          `
          });
        }
        // Send confirmation to parents
        try {
          console.log('📧 [ParentPlayers] Enviando confirmación de inscripción a padres:', { padre: playerData.email_padre, tutor2: playerData.email_tutor_2 });
          
          const emailBody = `Estimados padres/tutores,<br><br>

Confirmamos que hemos recibido correctamente la inscripcion de ${playerData.nombre}.<br><br>

DATOS DE LA INSCRIPCION<br>
Tipo: ${playerData.tipo_inscripcion}<br>
Jugador: ${playerData.nombre}<br>
Deporte/Categoria: ${playerData.deporte}<br>
Fecha de Nacimiento: ${new Date(playerData.fecha_nacimiento).toLocaleDateString('es-ES')}<br><br>

En breve procesaremos la informacion y podran acceder a todos los servicios del club a traves de la aplicacion.<br><br>

Atentamente,<br><br>

CD Bustarviejo<br>
Equipo de Administracion<br><br>

Datos de contacto:<br>
Email: cdbustarviejo@gmail.com
          `;
          
          console.log('📤 [ParentPlayers] Enviando a padre:', playerData.email_padre);
          await base44.functions.invoke('sendEmail', {
            to: playerData.email_padre,
            subject: "Inscripción Recibida - CD Bustarviejo",
            html: emailBody
          });
          console.log('✅ [ParentPlayers] Email enviado a padre');
          
          if (playerData.email_tutor_2) {
            console.log('📤 [ParentPlayers] Enviando a tutor 2:', playerData.email_tutor_2);
            await base44.functions.invoke('sendEmail', {
              to: playerData.email_tutor_2,
              subject: "Inscripción Recibida - CD Bustarviejo",
              html: emailBody
            });
            console.log('✅ [ParentPlayers] Email enviado a tutor 2');
          }
        } catch (error) {
          console.error("Error sending confirmation emails:", error);
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
      
      return { player: newPlayer, paymentsData };
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['allPlayersForRenewal'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      setShowForm(false);
      setEditingPlayer(null);
      
      // Si se generaron pagos, mostrar pantalla de éxito con instrucciones
      if (data.paymentsData?.payments) {
        setInscriptionSuccessData({
          player: data.player,
          tipoPago: data.paymentsData.tipoPago,
          cuotasGeneradas: data.paymentsData.payments,
          descuentoHermano: data.paymentsData.descuentoHermano || 0
        });
        setShowInscriptionSuccess(true);
      } else {
        // Inscripción sin pagos (caso legacy)
        setSuccessMessage("¡Jugador registrado!");
        setShowSuccess(true);
        setTimeout(() => toast.success("Jugador registrado correctamente"), 2000);
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      console.error("Error creating player:", error);
      toast.error("Error al registrar el jugador");
    }
  });

  const updatePlayerMutation = useMutation({
            mutationFn: async ({ id, playerData }) => {
              const safeData = {
                ...playerData,
                email_padre: editingPlayer?.email_padre || user?.email,
              };

              const prevEmail2 = (editingPlayer?.email_tutor_2 || '').trim().toLowerCase();
              const nextEmail2 = (safeData.email_tutor_2 || '').trim().toLowerCase();
              const email2Changed = nextEmail2 && nextEmail2 !== prevEmail2;

              const updated = await base44.entities.Player.update(id, safeData);

              if (email2Changed) {
                try {
                  await base44.functions.invoke('sendEmail', {
                    to: nextEmail2,
                    subject: '👨‍👩‍👧 Has sido añadido como segundo progenitor - CD Bustarviejo',
                    html: `<div style="font-family:Arial,sans-serif;line-height:1.5">
                      <h2>Invitación como segundo progenitor</h2>
                      <p>Te han añadido como segundo progenitor de <strong>${safeData.nombre || editingPlayer?.nombre || ''}</strong> en el CD Bustarviejo.</p>
                      <p>Este correo es informativo. El club te enviará la invitación definitiva para acceder a la app.</p>
                      <p style="color:#64748b;font-size:12px">Si no esperabas este mensaje, puedes ignorarlo.</p>
                    </div>`
                  });
                } catch (e) {
                  console.log('Error enviando email informativo segundo progenitor:', e);
                }

                // Invitar al segundo progenitor (backend gestiona flujo directo o solicitud admin)
                try {
                  const result = await base44.functions.invoke('inviteSecondParent', {
                    email: nextEmail2,
                    playerName: safeData.nombre || editingPlayer?.nombre || '',
                    inviterName: user?.full_name || '',
                    playerId: id
                  });
                  if (result.data?.needsAdmin) {
                    console.log('📨 Solicitud creada para admin:', nextEmail2);
                  } else {
                    console.log('✅ Invitación procesada para:', nextEmail2);
                  }
                } catch (e) {
                  console.log('Error invitando a segundo progenitor:', e);
                }
              }

              return updated;
            },
            onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setShowForm(false);
      setEditingPlayer(null);
      setSuccessMessage("¡Datos actualizados!");
      setShowSuccess(true);
      setTimeout(() => toast.success("Jugador actualizado correctamente"), 2000);
    },
    onError: (error) => {
      console.error("Error updating player:", error);
      toast.error("Error al actualizar el jugador");
    }
  });

  const handleSubmit = async (playerData) => {
    if (!editingPlayer && (user?.tipo_panel === 'jugador_adulto' || user?.es_jugador === true)) {
      toast.info('Como jugador no puedes registrar otros jugadores');
      return;
    }
    if (editingPlayer) {
      updatePlayerMutation.mutate({ id: editingPlayer.id, playerData });
    } else {
      // REFETCH FORZADO para obtener jugadores más actuales (evitar cache)
      console.log('🔄 [ParentPlayers] Refrescando lista de jugadores antes de calcular descuentos...');
      const currentUserForSubmit = await base44.auth.me();
      const todosJugadoresBD = await base44.entities.Player.filter({
        '$or': [
          { email_padre: currentUserForSubmit.email },
          { email_tutor_2: currentUserForSubmit.email }
        ]
      });
      
      // Calcular descuento por hermano ANTES de mostrar el flujo
      // INCLUIR TODOS LOS JUGADORES DE LA FAMILIA (activos o no, porque pueden estar en proceso de renovación)
      const hermanos = todosJugadoresBD.filter(p => 
        p.fecha_nacimiento &&
        p.id !== playerData.id // Excluir al jugador actual si es edición
      );

      console.log('👨‍👩‍👧 [ParentPlayers] Hermanos encontrados en BD:', hermanos.length);
      hermanos.forEach(h => console.log('  -', h.nombre, '| Fecha:', h.fecha_nacimiento, '| Email padre:', h.email_padre));

      const todosHermanos = [
        { id: 'nuevo', fecha_nacimiento: playerData.fecha_nacimiento, nombre: playerData.nombre },
        ...hermanos.map(p => ({ id: p.id, fecha_nacimiento: p.fecha_nacimiento, nombre: p.nombre }))
      ].filter(p => p.fecha_nacimiento);

      // Ordenar por fecha de nacimiento (el MAYOR es el de fecha MÁS ANTIGUA)
      todosHermanos.sort((a, b) => new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento));
      
      console.log('📊 [ParentPlayers] Orden de hermanos por edad (mayor a menor):');
      todosHermanos.forEach((h, i) => console.log(`  ${i + 1}. ${h.nombre} (${h.fecha_nacimiento})`));
      
      const esMayor = todosHermanos[0]?.id === 'nuevo';
      const descuentoCalculado = esMayor ? 0 : 25;

      console.log('💰 [ParentPlayers] Descuento calculado para', playerData.nombre, ':', descuentoCalculado, '€', esMayor ? '(ES EL MAYOR)' : '(NO ES EL MAYOR)');

      // Guardar datos con descuento ya calculado
      setPendingPlayerData({
        ...playerData,
        tiene_descuento_hermano: !esMayor,
        descuento_aplicado: descuentoCalculado,
        _descuentoCalculado: descuentoCalculado
      });
      setShowForm(false);
      setShowPaymentFlow(true);
    }
  };

  const renewPlayerMutation = useMutation({
    mutationFn: async ({ playerData, paymentsData }) => {
      // Actualizar jugador existente con nueva temporada y estado renovado
      const updatedPlayer = await base44.entities.Player.update(playerData.id, {
        deporte: playerData.deporte,
        tipo_inscripcion: "Renovación",
        estado_renovacion: "renovado",
        activo: true,
        temporada_renovacion: seasonConfig?.temporada,
        fecha_renovacion: new Date().toISOString()
      });

      // Crear pagos para la nueva temporada
      if (paymentsData?.payments) {
        for (const payment of paymentsData.payments) {
          await base44.entities.Payment.create({
            ...payment,
            jugador_id: updatedPlayer.id,
            jugador_nombre: updatedPlayer.nombre
          });
        }
      }

      return { player: updatedPlayer, paymentsData };
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      
      // Mostrar pantalla de éxito con instrucciones de pago
      if (data.paymentsData?.payments) {
        setInscriptionSuccessData({
          player: data.player,
          tipoPago: data.paymentsData.tipoPago,
          cuotasGeneradas: data.paymentsData.payments,
          descuentoHermano: data.paymentsData.descuentoHermano || 0
        });
        setShowInscriptionSuccess(true);
      } else {
        toast.success("¡Jugador renovado correctamente!");
      }
    },
    onError: (error) => {
      setIsProcessing(false);
      console.error("Error renewing player:", error);
      toast.error("Error al renovar el jugador");
    }
  });

  const handlePaymentFlowContinue = (paymentsData) => {
    const descuentoCalculado = pendingPlayerData._descuentoCalculado || 0;

    setIsProcessing(true);

    console.log('✅ [handlePaymentFlowContinue] Continuando con pago:', {
      jugador: pendingPlayerData.nombre,
      descuento: descuentoCalculado,
      tipoPago: paymentsData.tipoPago,
      esRenovacion: pendingPlayerData._isRenewal
    });

    // Si es renovación, usar la mutación de renovación
    if (pendingPlayerData._isRenewal) {
      renewPlayerMutation.mutate({
        playerData: pendingPlayerData,
        paymentsData: {
          ...paymentsData,
          descuentoHermano: descuentoCalculado
        }
      });
    } else {
      // Inscripción nueva
      createPlayerMutation.mutate({
        playerData: {
          ...pendingPlayerData,
          tiene_descuento_hermano: descuentoCalculado > 0,
          descuento_aplicado: descuentoCalculado
        },
        paymentsData: {
          ...paymentsData,
          descuentoHermano: descuentoCalculado
        }
      });
    }

    setShowPaymentFlow(false);
    setPendingPlayerData(null);
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setSuggestedCategory(null);
    setShowForm(true);
  };

  const handleRenew = (player, newCategory) => {
    // Preparar datos del jugador para renovación con flujo de pago
    const currentYear = new Date().getFullYear();
    const defaultSeason = `${currentYear}/${currentYear + 1}`;
    
    // Si newCategory es null, el jugador eligió mantener su categoría actual
    // Si es string, es la categoría seleccionada del dropdown
    const playerDataForRenewal = {
      ...player,
      deporte: newCategory || player.deporte,
      tipo_inscripcion: "Renovación",
      estado_renovacion: "renovado",
      activo: true,
      temporada_renovacion: seasonConfig?.temporada || defaultSeason,
      _isRenewal: true, // Flag para identificar que es renovación
      _descuentoCalculado: player.descuento_aplicado || 0
    };
    
    // Abrir flujo de pago para renovación
    setPendingPlayerData(playerDataForRenewal);
    setShowPaymentFlow(true);
  };

  const handleMarkNotRenewing = async (player) => {
    try {
      const currentYear = new Date().getFullYear();
      const defaultSeason = `${currentYear}/${currentYear + 1}`;
      
      await base44.entities.Player.update(player.id, {
        estado_renovacion: "no_renueva",
        fecha_renovacion: new Date().toISOString(),
        temporada_renovacion: seasonConfig?.temporada || defaultSeason
      });
      
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      
      toast.success(`${player.nombre} marcado como NO RENUEVA para la próxima temporada`);
    } catch (error) {
      console.error("Error marking player as not renewing:", error);
      toast.error("Error al actualizar el jugador");
    }
  };

  const futbolPlayers = players.filter(p => 
    p.deporte?.includes("Fútbol") && !p.deporte?.includes("Femenino") && !p.deporte?.includes("+40")
  );
  const futbolFemeninoPlayers = players.filter(p => p.deporte === "Fútbol Femenino");
  const baloncestoPlayers = players.filter(p => p.deporte?.includes("Baloncesto"));
  const actividadesComplementarias = players.filter(p => 
    p.deporte === "Multideporte" || p.deporte === "Preparacion física" || p.deporte?.includes("+40")
  );
  
  // Detectar jugadores con renovación pendiente
  const playersToRenew = players.filter(p => p.estado_renovacion === "pendiente");
  
  // Important banner conditions
  const hasPlayers = players.length > 0;
  const hasSecondParentLinked = players.some(p => p.email_tutor_2 && p.email_tutor_2.trim() !== "");
  const showImportantBanner = !(hasPlayers && hasSecondParentLinked);

  return (
    <>
      <CheckmarkAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={successMessage}
      />

      {/* Flujo de pago para nueva inscripción */}
      {showPaymentFlow && pendingPlayerData && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <InscriptionPaymentFlow
              playerData={pendingPlayerData}
              seasonConfig={seasonConfig}
              categoryConfigs={categoryConfigs}
              descuentoHermano={pendingPlayerData._descuentoCalculado || 0}
              onContinue={handlePaymentFlowContinue}
            />
          </div>
        </div>
      )}

      {/* Pantalla de éxito inscripción */}
      {showInscriptionSuccess && inscriptionSuccessData && (
        <InscriptionSuccessScreen
          player={inscriptionSuccessData.player}
          tipoPago={inscriptionSuccessData.tipoPago}
          cuotasGeneradas={inscriptionSuccessData.cuotasGeneradas}
          descuentoHermano={inscriptionSuccessData.descuentoHermano}
          onClose={() => setShowInscriptionSuccess(false)}
        />
      )}

      {isProcessing && (
        <div className="fixed inset-0 z-[160] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 text-center shadow-xl">
            <div className="spinner-elegant mx-auto mb-3" />
            <p className="text-slate-800 font-semibold">Procesando la inscripción...</p>
            <p className="text-slate-500 text-xs mt-1">Generando cuotas y preparando la confirmación</p>
          </div>
        </div>
      )}

      <div className="p-4 lg:p-8 space-y-4 lg:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 lg:gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Mis Jugadores</h1>
          <p className="text-slate-600 mt-1 text-sm lg:text-base">Gestiona la información de tus jugadores</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <ShareFormButton />
          {!isPlayerUser && players.length > 0 && (
            <Button
              onClick={() => {
                setEditingPlayer(null);
                setSuggestedCategory(null);
                setIsAdultPlayerSelfRegistration(false);
                setShowForm(!showForm);
              }}
              className="bg-orange-600 hover:bg-orange-700 shadow-lg flex-1 md:flex-none"
            >
              <Plus className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
              <span className="text-sm lg:text-base">Registrar Jugador</span>
            </Button>
          )}
        </div>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 ml-6 text-xs lg:text-sm">
          <strong>Protección de datos:</strong> Puedes editar la información de contacto y detalles de tus jugadores. 
          Los campos críticos como <strong>deporte y categoría</strong> solo pueden ser modificados por el administrador.
          <br />
          <span className="text-[10px] lg:text-xs text-blue-600 mt-1 block">
            ⚠️ No es posible eliminar jugadores. Si necesitas dar de baja a un jugador, contacta con el administrador.
          </span>
        </AlertDescription>
      </Alert>

      {showImportantBanner && (
        <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-2 border-orange-500 rounded-2xl p-4 lg:p-6 shadow-glow-orange">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">!</div>
            <div className="flex-1">
              <h3 className="text-orange-900 font-extrabold text-base lg:text-lg">IMPORTANTE</h3>
              <ul className="mt-2 space-y-2 text-sm lg:text-base text-slate-800">
                <li>• Añade el email del segundo progenitor; le enviaremos una invitación y, al aceptarla, ambos veréis y gestionaréis la misma ficha del jugador.</li>
                <li>• Familias con varios hijos: inscribe primero al hermano MAYOR; el descuento de 25€ se aplicará automáticamente a los menores. Si te equivocas, el sistema lo recalcula solo.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-6">
        <div className="bg-white rounded-xl shadow-lg p-3 lg:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-sm text-slate-600 mb-1">Total Jugadores</p>
              <p className="text-xl lg:text-3xl font-bold text-slate-900">{players.length}</p>
            </div>
            <span className="text-2xl lg:text-4xl">👥</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 lg:p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-sm text-slate-600 mb-1">Fútbol</p>
              <p className="text-xl lg:text-3xl font-bold text-blue-700">
                {futbolPlayers.length + futbolFemeninoPlayers.length}
              </p>
            </div>
            <span className="text-2xl lg:text-4xl">⚽</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-3 lg:p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] lg:text-sm text-slate-600 mb-1">Baloncesto</p>
              <p className="text-xl lg:text-3xl font-bold text-orange-700">{baloncestoPlayers.length}</p>
            </div>
            <span className="text-2xl lg:text-4xl">🏀</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="mb-6">
            {/* Banner para auto-registro de jugador +18 */}
            {isAdultPlayerSelfRegistration && (
              <div className="mb-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-xl p-4">
                <p className="text-sm font-bold text-green-900 mb-2">
                  👤 Auto-registro como Jugador Mayor de 18 años
                </p>
                <p className="text-xs text-green-800 mb-3 leading-relaxed">
                  Estás registrándote <strong>a ti mismo</strong> como jugador del club. 
                  Completa tus datos personales. Al finalizar, tu panel se convertirá automáticamente en <strong>"Panel Jugador"</strong>.
                </p>
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-xs text-green-700">
                    ℹ️ <strong>Importante:</strong> Los campos de "tutor legal" no son necesarios ya que eres mayor de edad. 
                    Introduce tu propio email y teléfono en los campos principales.
                  </p>
                </div>
              </div>
            )}
            {suggestedCategory && (
              <div className="mb-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-400 rounded-xl p-4 animate-pulse">
                <p className="text-sm font-bold text-purple-900 mb-2">
                  💡 Sugerencia de Cambio de Categoría
                </p>
                <p className="text-xs text-purple-800 mb-3 leading-relaxed">
                  Hemos actualizado automáticamente la categoría de <strong>{editingPlayer?.nombre}</strong> a <strong>{suggestedCategory}</strong> según su edad. Revisa los datos y confirma la renovación.
                </p>
              </div>
            )}
            {editingPlayer && editingPlayer.tipo_inscripcion === "Renovación" && !suggestedCategory && (
              <div className="mb-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-xl p-4">
                <p className="text-sm font-bold text-blue-900 mb-2">
                  🔄 Renovación de Jugador
                </p>
                <p className="text-xs text-blue-800 mb-3 leading-relaxed">
                  Estás renovando a <strong>{editingPlayer?.nombre}</strong>. Revisa que todos los datos estén actualizados y completa la renovación.
                </p>
              </div>
            )}
            {editingPlayer ? (
              <PlayerForm
                player={editingPlayer}
                allPlayers={players}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingPlayer(null);
                  setSuggestedCategory(null);
                  setIsAdultPlayerSelfRegistration(false);
                }}
                isSubmitting={createPlayerMutation.isPending || updatePlayerMutation.isPending}
                isParent={true}
                parentEmail={user?.email}
                isAdultPlayerSelfRegistration={isAdultPlayerSelfRegistration}
              />
            ) : (
              <PlayerFormWizard
                player={null}
                allPlayers={players}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingPlayer(null);
                  setSuggestedCategory(null);
                  setIsAdultPlayerSelfRegistration(false);
                }}
                isSubmitting={createPlayerMutation.isPending || updatePlayerMutation.isPending}
                isParent={true}
                isAdultPlayerSelfRegistration={isAdultPlayerSelfRegistration}
              />
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Alerta de Jugadores Pendientes de Renovación - Solo si permitir_renovaciones está activo */}
      {seasonConfig?.permitir_renovaciones && playersToRenew.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-400 rounded-xl p-4 mb-6 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-900 mb-2 text-lg">⚠️ ¡Acción Requerida! Renovación de Jugadores</h3>
              <p className="text-sm text-red-800 mb-3 leading-relaxed">
                Tienes <strong>{playersToRenew.length} jugador(es)</strong> pendientes de renovar para la próxima temporada. 
                <strong> El sistema detectará automáticamente si necesitan cambiar de categoría según su edad.</strong>
              </p>
              <div className="space-y-2 mb-4">
                {playersToRenew.map(player => (
                  <div key={player.id} className="bg-white rounded-lg p-3 border-2 border-red-200">
                    <p className="text-sm font-semibold text-slate-900">{player.nombre}</p>
                    <p className="text-xs text-slate-600">{player.deporte}</p>
                  </div>
                ))}
              </div>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
                <p className="text-xs text-blue-900 font-bold mb-2">📋 ¿Cómo renovar?</p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Busca la tarjeta del jugador más abajo (con badge rojo "⚠️ RENOVAR JUGADOR")</li>
                  <li>Haz clic en el botón <strong>naranja "🔄 Renovar Jugador"</strong> o <strong>morado "✨ Renovar con Nueva Categoría"</strong></li>
                  <li><strong className="text-green-700">Al renovar, el jugador se marca automáticamente como ACTIVO ✅</strong></li>
                  <li>El sistema te mostrará los datos actualizados (el cambio de categoría ya estará sugerido si corresponde)</li>
                  <li>Revisa y confirma los datos para completar la renovación</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alerta de renovaciones pendientes */}
      {seasonConfig?.permitir_renovaciones && players.some(p => !p.activo) && playersToRenew.length === 0 && (
        <Alert className="bg-yellow-50 border-yellow-300">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 ml-6 text-xs lg:text-sm">
            <strong>🔄 ¡Periodo de renovaciones abierto!</strong> Tienes jugadores de la temporada anterior pendientes de renovar.
            Haz clic en <strong>"Registrar Jugador"</strong> → <strong>"Renovación"</strong> para renovar a cada jugador.
            <br />
            <span className="text-[10px] lg:text-xs text-yellow-700 mt-1 block">
              ⚠️ Los jugadores marcados con <span className="bg-yellow-200 px-1 rounded">PENDIENTE RENOVAR</span> no están activos hasta que completes su renovación.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <PlayerCardSkeleton key={i} />
          ))}
        </div>
      ) : players.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-12 h-12 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No hay jugadores registrados</h2>
          <p className="text-slate-600 mb-6">Empieza registrando tu primer jugador</p>
          {!isPlayerUser && (
            <Button
              onClick={() => {
                setEditingPlayer(null);
                setSuggestedCategory(null);
                setIsAdultPlayerSelfRegistration(false);
                setShowForm(true);
              }}
              className="bg-orange-600 hover:bg-orange-700 shadow-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Registrar Primer Jugador
            </Button>
          )}
          {isPlayerUser && (
            <p className="text-sm text-yellow-700 mt-2">Como jugador, tu registro es personal y único.</p>
          )}
        </div>
      ) : (
        <>
          {isPlayerUser && (
            <Alert className="bg-yellow-50 border-yellow-300 mb-4">
              <AlertDescription className="text-yellow-800 text-sm">
                Como jugador mayor de edad, no puedes dar de alta otros jugadores desde tu cuenta.
              </AlertDescription>
            </Alert>
          )}
          {/* Jugadores de Fútbol */}
          {futbolPlayers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚽</span> Fútbol
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {futbolPlayers.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        onRenew={handleRenew}
                        onMarkNotRenewing={handleMarkNotRenewing}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                        seasonConfig={seasonConfig}
                        callups={callups}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Jugadores de Fútbol Femenino */}
          {futbolFemeninoPlayers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>⚽</span> Fútbol Femenino
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {futbolFemeninoPlayers.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        onRenew={handleRenew}
                        onMarkNotRenewing={handleMarkNotRenewing}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                        seasonConfig={seasonConfig}
                        callups={callups}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Jugadores de Baloncesto */}
          {baloncestoPlayers.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>🏀</span> Baloncesto
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {baloncestoPlayers.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        onRenew={handleRenew}
                        onMarkNotRenewing={handleMarkNotRenewing}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                        seasonConfig={seasonConfig}
                        callups={callups}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Actividades Complementarias */}
          {actividadesComplementarias.length > 0 && (
            <div className="space-y-3 lg:space-y-4">
              <h2 className="text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span>💪</span> Actividades Complementarias
              </h2>
              <div className="space-y-6">
                <AnimatePresence>
                  {actividadesComplementarias.map((player) => (
                    <div key={player.id} className="space-y-4">
                      <PlayerCard 
                        player={player} 
                        onEdit={handleEdit}
                        onRenew={handleRenew}
                        onMarkNotRenewing={handleMarkNotRenewing}
                        isParent={true}
                        schedules={schedules}
                        payments={payments}
                        seasonConfig={seasonConfig}
                        callups={callups}
                      />
                      <AchievementsBadges 
                        player={player} 
                        attendances={attendances}
                        evaluations={evaluations}
                      />
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </>
      )}

      <ContactCard />
    </div>
  </>
  );
}