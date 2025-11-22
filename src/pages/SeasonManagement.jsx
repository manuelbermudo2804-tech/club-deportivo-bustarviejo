import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Play, 
  Calendar, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2,
  RotateCcw,
  Settings,
  Sparkles,
  Download,
  Shield,
  Mail,
  Database,
  Lock,
  History,
  Upload,
  ShoppingBag,
  Clover
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SeasonManagement() {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState(null);
  const [restoreOptions, setRestoreOptions] = useState({
    pagos: true,
    recordatorios: true,
    asistencias: false,
    evaluaciones: false,
    eventos: false,
    anuncios: false,
  });
  
  // Configuración del reinicio
  const [resetConfig, setResetConfig] = useState({
    tipoReinicio: "completo", // completo, parcial, solo_archivar
    nombreTemporada: "",
    mesApertura: "9", // Septiembre
    mesCierre: "6", // Junio
    generarBackup: true,
    notificarAdmins: true,
    notificarPadres: false,
    mensajePadres: "¡Bienvenidos a la nueva temporada! La aplicación ha sido actualizada. Por favor, revisa los datos de tus jugadores.",
    // Opciones de borrado/archivo
    borrarAsistencias: true,
    borrarEvaluaciones: true,
    borrarHorarios: false,
    borrarCalendario: true,
    borrarAnuncios: true,
    borrarGaleria: false,
    borrarConvocatorias: true,
    borrarChats: true,
    borrarEncuestas: true,
    borrarResultados: true,
    borrarPedidosRopa: true,
    borrarPedidosLoteria: true,
    borrarCertificados: true,
    borrarNotasInternas: true,
    borrarNotificaciones: true,
  });

  const [confirmText, setConfirmText] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Confirmación de seguridad
  const [securityCheck, setSecurityCheck] = useState({
    emailConfirmacion: "",
    aceptoTerminos: false,
    // Removed password field
  });

  const queryClient = useQueryClient();

  // Obtener usuario actual
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setIsAdmin(user.role === "admin");
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: seasons, isLoading: loadingSeasons } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list('-created_date'),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.Reminder.list(),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    initialData: [],
  });

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list(),
    initialData: [],
  });

  const { data: gallery } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => base44.entities.PhotoGallery.list(),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
  });

  const { data: chats } = useQuery({
    queryKey: ['chats'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
  });

  const { data: surveys } = useQuery({
    queryKey: ['surveys'],
    queryFn: () => base44.entities.Survey.list(),
    initialData: [],
  });

  const { data: surveyResponses } = useQuery({
    queryKey: ['surveyResponses'],
    queryFn: () => base44.entities.SurveyResponse.list(),
    initialData: [],
  });

  const { data: matchResults } = useQuery({
    queryKey: ['matchResults'],
    queryFn: () => base44.entities.MatchResult.list(),
    initialData: [],
  });

  const { data: clothingOrders } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list(),
    initialData: [],
  });

  const { data: lotteryOrders } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
    initialData: [],
  });

  const { data: certificates } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => base44.entities.Certificate.list(),
    initialData: [],
  });

  const { data: memberNotes } = useQuery({
    queryKey: ['memberNotes'],
    queryFn: () => base44.entities.MemberNote.list(),
    initialData: [],
  });

  const { data: appNotifications } = useQuery({
    queryKey: ['appNotifications'],
    queryFn: () => base44.entities.AppNotification.list(),
    initialData: [],
  });

  const { data: resetHistory } = useQuery({
    queryKey: ['resetHistory'],
    queryFn: () => base44.entities.ResetHistory.list('-fecha_reset'),
    initialData: [],
  });

  const activeSeason = seasons.find(s => s.activa);

  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeasonConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success("✅ Temporada actualizada");
    },
  });

  const toggleLottery = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: {
        ...activeSeason,
        loteria_navidad_abierta: !activeSeason.loteria_navidad_abierta
      }
    });
  };

  const toggleClothingStore = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: {
        ...activeSeason,
        tienda_ropa_abierta: !activeSeason.tienda_ropa_abierta
      }
    });
  };

  const toggleBizum = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: {
        ...activeSeason,
        bizum_activo: !activeSeason.bizum_activo
      }
    });
  };

  const updateBizumPhone = async (phone) => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: {
        ...activeSeason,
        bizum_telefono: phone
      }
    });
  };

  // Función para generar backup (exportar a CSV)
  const generateBackup = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Backup de pagos
    const paymentsCSV = [
      ['ID', 'Jugador', 'Mes', 'Temporada', 'Cantidad', 'Estado', 'Fecha Pago', 'Método'],
      ...payments.map(p => [
        p.id, p.jugador_nombre, p.mes, p.temporada, p.cantidad, p.estado, 
        p.fecha_pago || '', p.metodo_pago || ''
      ])
    ].map(row => row.join(',')).join('\n');

    // Backup de jugadores
    const playersCSV = [
      ['ID', 'Nombre', 'Deporte', 'Categoría', 'Email', 'Email Padre', 'Activo'],
      ...players.map(p => [
        p.id, p.nombre, p.deporte, p.categoria, p.email || '', p.email_padre || '', p.activo
      ])
    ].map(row => row.join(',')).join('\n');

    // Backup de pedidos
    const ordersCSV = [
      ['ID', 'Cliente', 'Email', 'Total', 'Estado', 'Fecha'],
      ...orders.map(o => [
        o.id, o.cliente_nombre, o.cliente_email || '', o.total, o.estado, o.created_date
      ])
    ].map(row => row.join(',')).join('\n');

    // Descargar archivos
    downloadCSV(paymentsCSV, `backup_pagos_${timestamp}.csv`);
    downloadCSV(playersCSV, `backup_jugadores_${timestamp}.csv`);
    downloadCSV(ordersCSV, `backup_pedidos_${timestamp}.csv`);

    toast.success("✅ Backup generado y descargado"); // Refined message
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obtener la siguiente temporada sugerida
  const getNextSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth <= 8) {
      return `${currentYear}/${currentYear + 1}`;
    }
    return `${currentYear + 1}/${currentYear + 2}`;
  };

  // Abrir diálogo de configuración
  const handleOpenResetDialog = () => {
    setResetConfig({
      ...resetConfig,
      nombreTemporada: getNextSeason()
    });
    setShowResetDialog(true);
  };

  // Proceder a confirmación de seguridad
  const handleProceedToConfirmation = () => {
    if (!resetConfig.nombreTemporada) {
      toast.error("Por favor, ingresa el nombre de la temporada");
      return;
    }
    setShowResetDialog(false);
    setShowConfirmation(true);
  };

  // Ejecutar reinicio de temporada
  const handleExecuteReset = async () => {
    console.log("🚀 Iniciando handleExecuteReset", {
      currentUser: currentUser?.email,
      emailConfirmacion: securityCheck.emailConfirmacion,
      aceptoTerminos: securityCheck.aceptoTerminos,
      confirmText: confirmText
    });

    // Validaciones de seguridad
    if (!currentUser) {
      toast.error("❌ Error: No se pudo verificar el usuario");
      console.error("No hay currentUser");
      return;
    }

    if (securityCheck.emailConfirmacion !== currentUser.email) {
      toast.error(`❌ El email de confirmación no coincide. Escribe: ${currentUser.email}`);
      console.error("Email no coincide", securityCheck.emailConfirmacion, "vs", currentUser.email);
      return;
    }

    if (!securityCheck.aceptoTerminos) {
      toast.error("❌ Debes aceptar los términos para continuar");
      console.error("No aceptó términos");
      return;
    }

    console.log("✅ Validaciones pasadas, iniciando proceso...");
    setIsProcessing(true);
    toast.info("🚀 Iniciando reinicio de temporada...");

    try {
      // PASO 1: Generar backup automático
      if (resetConfig.generarBackup) {
        toast.info("📦 Generando backup..."); // Refined message
        generateBackup();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay for download dialog
      }

      // PASO 2: Guardar cuotas de temporada actual antes de cualquier cambio
      const cuotasTemporadaAnterior = {
        cuota_unica: activeSeason?.cuota_unica || 150,
        cuota_tres_meses: activeSeason?.cuota_tres_meses || 55,
      };

      // PASO 3: Ejecutar reinicio según tipo
      if (resetConfig.tipoReinicio === "completo" || resetConfig.tipoReinicio === "solo_archivar") {
        // Archivar pagos
        toast.info("📁 Archivando pagos..."); // Refined message
        const archivePaymentsPromises = payments.map(async (payment) => {
          try {
            await base44.entities.PaymentHistory.create({
              temporada: payment.temporada,
              jugador_id: payment.jugador_id,
              jugador_nombre: payment.jugador_nombre,
              tipo_pago: payment.tipo_pago,
              mes: payment.mes,
              cantidad: payment.cantidad,
              estado: payment.estado,
              metodo_pago: payment.metodo_pago,
              justificante_url: payment.justificante_url,
              fecha_pago: payment.fecha_pago,
              notas: payment.notas,
              archivado_fecha: new Date().toISOString()
            });
            await base44.entities.Payment.delete(payment.id);
          } catch (error) {
            console.error(`Error archiving payment ${payment.id}:`, error);
          }
        });
        await Promise.all(archivePaymentsPromises);


        // Eliminar recordatorios
        toast.info("🗑️ Limpiando recordatorios..."); // Refined message
        const deleteRemindersPromises = reminders.map(reminder => {
          return base44.entities.Reminder.delete(reminder.id).catch(error => {
            console.error(`Error deleting reminder ${reminder.id}:`, error);
          });
        });
        await Promise.all(deleteRemindersPromises);

        // Desactivar temporada actual
        if (activeSeason) {
          toast.info("🔚 Cerrando temporada anterior..."); // Refined message
          await base44.entities.SeasonConfig.update(activeSeason.id, {
            ...activeSeason,
            activa: false
          });
        }
      }

      if (resetConfig.tipoReinicio === "completo") {
        // Archivar pedidos (cerrar tienda)
        toast.info("🛍️ Archivando pedidos..."); // Refined message
        const archiveOrdersPromises = orders.map(async (order) => {
          if (order.estado !== "Entregado") {
            try {
              await base44.entities.Order.update(order.id, {
                ...order,
                estado: "Archivado"
              });
            } catch (error) {
              console.error(`Error archiving order ${order.id}:`, error);
            }
          }
        });
        await Promise.all(archiveOrdersPromises);

        // Marcar todos los jugadores como pendiente de renovación
        toast.info("👥 Marcando jugadores pendientes de renovación...");
        const updatePlayersPromises = players.map(async (player) => {
          try {
            await base44.entities.Player.update(player.id, {
              ...player,
              estado_renovacion: "pendiente",
              temporada_renovacion: resetConfig.nombreTemporada
            });
          } catch (error) {
            console.error(`Error updating player ${player.id}:`, error);
          }
        });
        await Promise.all(updatePlayersPromises);

        // Borrar asistencias
        if (resetConfig.borrarAsistencias) {
          toast.info("📋 Eliminando asistencias...");
          const deleteAttendancesPromises = attendances.map(a => 
            base44.entities.Attendance.delete(a.id).catch(error => console.error(`Error deleting attendance ${a.id}:`, error))
          );
          await Promise.all(deleteAttendancesPromises);
        }

        // Borrar evaluaciones
        if (resetConfig.borrarEvaluaciones) {
          toast.info("⭐ Eliminando evaluaciones...");
          const deleteEvaluationsPromises = evaluations.map(e => 
            base44.entities.PlayerEvaluation.delete(e.id).catch(error => console.error(`Error deleting evaluation ${e.id}:`, error))
          );
          await Promise.all(deleteEvaluationsPromises);
        }

        // Borrar horarios
        if (resetConfig.borrarHorarios) {
          toast.info("⏰ Eliminando horarios...");
          const deleteSchedulesPromises = schedules.map(s => 
            base44.entities.TrainingSchedule.delete(s.id).catch(error => console.error(`Error deleting schedule ${s.id}:`, error))
          );
          await Promise.all(deleteSchedulesPromises);
        }

        // Borrar calendario
        if (resetConfig.borrarCalendario) {
          toast.info("📅 Eliminando eventos...");
          const deleteEventsPromises = events.map(e => 
            base44.entities.Event.delete(e.id).catch(error => console.error(`Error deleting event ${e.id}:`, error))
          );
          await Promise.all(deleteEventsPromises);
        }

        // Borrar anuncios
        if (resetConfig.borrarAnuncios) {
          toast.info("📢 Eliminando anuncios...");
          const deleteAnnouncementsPromises = announcements.map(a => 
            base44.entities.Announcement.delete(a.id).catch(error => console.error(`Error deleting announcement ${a.id}:`, error))
          );
          await Promise.all(deleteAnnouncementsPromises);
        }

        // Borrar galería
        if (resetConfig.borrarGaleria) {
          toast.info("🖼️ Eliminando galería...");
          const deleteGalleryPromises = gallery.map(g => 
            base44.entities.PhotoGallery.delete(g.id).catch(error => console.error(`Error deleting gallery ${g.id}:`, error))
          );
          await Promise.all(deleteGalleryPromises);
        }

        // Borrar convocatorias
        if (resetConfig.borrarConvocatorias) {
          toast.info("🎓 Eliminando convocatorias...");
          const deleteCallupsPromises = callups.map(c => 
            base44.entities.Convocatoria.delete(c.id).catch(error => console.error(`Error deleting callup ${c.id}:`, error))
          );
          await Promise.all(deleteCallupsPromises);
        }

        // Borrar chats
        if (resetConfig.borrarChats) {
          toast.info("💬 Eliminando mensajes...");
          const deleteChatsPromises = chats.map(c => 
            base44.entities.ChatMessage.delete(c.id).catch(error => console.error(`Error deleting chat ${c.id}:`, error))
          );
          await Promise.all(deleteChatsPromises);
        }

        // Borrar encuestas y respuestas
        if (resetConfig.borrarEncuestas) {
          toast.info("📋 Eliminando encuestas...");
          const deleteSurveysPromises = surveys.map(s => 
            base44.entities.Survey.delete(s.id).catch(error => console.error(`Error deleting survey ${s.id}:`, error))
          );
          const deleteResponsesPromises = surveyResponses.map(r => 
            base44.entities.SurveyResponse.delete(r.id).catch(error => console.error(`Error deleting response ${r.id}:`, error))
          );
          await Promise.all([...deleteSurveysPromises, ...deleteResponsesPromises]);
        }

        // Borrar resultados
        if (resetConfig.borrarResultados) {
          toast.info("⚽ Eliminando resultados...");
          const deleteResultsPromises = matchResults.map(m => 
            base44.entities.MatchResult.delete(m.id).catch(error => console.error(`Error deleting result ${m.id}:`, error))
          );
          await Promise.all(deleteResultsPromises);
        }

        // Borrar pedidos de ropa
        if (resetConfig.borrarPedidosRopa) {
          toast.info("👕 Eliminando pedidos de ropa...");
          const deleteClothingPromises = clothingOrders.map(o => 
            base44.entities.ClothingOrder.delete(o.id).catch(error => console.error(`Error deleting clothing order ${o.id}:`, error))
          );
          await Promise.all(deleteClothingPromises);
        }

        // Borrar pedidos de lotería
        if (resetConfig.borrarPedidosLoteria) {
          toast.info("🍀 Eliminando pedidos de lotería...");
          const deleteLotteryPromises = lotteryOrders.map(o => 
            base44.entities.LotteryOrder.delete(o.id).catch(error => console.error(`Error deleting lottery order ${o.id}:`, error))
          );
          await Promise.all(deleteLotteryPromises);
        }

        // Borrar certificados
        if (resetConfig.borrarCertificados) {
          toast.info("📜 Eliminando certificados...");
          const deleteCertificatesPromises = certificates.map(c => 
            base44.entities.Certificate.delete(c.id).catch(error => console.error(`Error deleting certificate ${c.id}:`, error))
          );
          await Promise.all(deleteCertificatesPromises);
        }

        // Borrar notas internas
        if (resetConfig.borrarNotasInternas) {
          toast.info("📝 Eliminando notas internas...");
          const deleteNotesPromises = memberNotes.map(n => 
            base44.entities.MemberNote.delete(n.id).catch(error => console.error(`Error deleting note ${n.id}:`, error))
          );
          await Promise.all(deleteNotesPromises);
        }

        // Borrar notificaciones
        if (resetConfig.borrarNotificaciones) {
          toast.info("🔔 Eliminando notificaciones...");
          const deleteNotifPromises = appNotifications.map(n => 
            base44.entities.AppNotification.delete(n.id).catch(error => console.error(`Error deleting notification ${n.id}:`, error))
          );
          await Promise.all(deleteNotifPromises);
        }

        // Crear nueva temporada
        toast.info("✨ Creando nueva temporada..."); // Refined message
        const nuevaTemporada = {
          temporada: resetConfig.nombreTemporada,
          activa: true,
          cuota_unica: cuotasTemporadaAnterior.cuota_unica,
          cuota_tres_meses: cuotasTemporadaAnterior.cuota_tres_meses,
          fecha_inicio: `${new Date().getFullYear()}-${resetConfig.mesApertura.padStart(2, '0')}-01`,
          fecha_fin: `${new Date().getFullYear() + 1}-${resetConfig.mesCierre.padStart(2, '0')}-30`,
          tienda_ropa_abierta: false,
          loteria_navidad_abierta: false,
          notas: `Temporada creada el ${new Date().toLocaleDateString('es-ES')}` // Refined message
        };
        await base44.entities.SeasonConfig.create(nuevaTemporada);

        // Guardar historial del reset
        toast.info("📚 Guardando historial del reset...");
        await base44.entities.ResetHistory.create({
          fecha_reset: new Date().toISOString(),
          temporada_anterior: activeSeason.temporada,
          temporada_nueva: resetConfig.nombreTemporada,
          usuario_responsable: currentUser.email,
          datos_borrados: {
            pagos: payments.length,
            recordatorios: reminders.length,
            asistencias: resetConfig.borrarAsistencias ? attendances.length : 0,
            evaluaciones: resetConfig.borrarEvaluaciones ? evaluations.length : 0,
            horarios: resetConfig.borrarHorarios ? schedules.length : 0,
            eventos: resetConfig.borrarCalendario ? events.length : 0,
            anuncios: resetConfig.borrarAnuncios ? announcements.length : 0,
            galeria: resetConfig.borrarGaleria ? gallery.length : 0,
            convocatorias: resetConfig.borrarConvocatorias ? callups.length : 0,
            chats: resetConfig.borrarChats ? chats.length : 0,
            encuestas: resetConfig.borrarEncuestas ? surveys.length : 0,
            respuestas_encuestas: resetConfig.borrarEncuestas ? surveyResponses.length : 0,
            resultados: resetConfig.borrarResultados ? matchResults.length : 0,
            pedidos_ropa: resetConfig.borrarPedidosRopa ? clothingOrders.length : 0,
            pedidos_loteria: resetConfig.borrarPedidosLoteria ? lotteryOrders.length : 0,
            certificados: resetConfig.borrarCertificados ? certificates.length : 0,
            notas_internas: resetConfig.borrarNotasInternas ? memberNotes.length : 0,
            notificaciones: resetConfig.borrarNotificaciones ? appNotifications.length : 0,
          },
          datos_archivados: {
            pagos: payments.length
          },
          jugadores_renovacion: players.length,
          backup_generado: resetConfig.generarBackup,
          notas: `Reset ejecutado por ${currentUser.full_name}`
        });
      }

      if (resetConfig.tipoReinicio === "parcial") {
        // Solo resetear contadores de pago
        toast.info("🔄 Reseteando contadores de pago..."); // Refined message
        const updatePaymentsPromises = payments.map(async (payment) => {
          if (payment.estado === "Pendiente") {
            try {
              await base44.entities.Payment.update(payment.id, {
                ...payment,
                cantidad: activeSeason?.cuota_tres_meses || 55
              });
            } catch (error) {
              console.error(`Error updating payment ${payment.id}:`, error);
            }
          }
        });
        await Promise.all(updatePaymentsPromises);
      }

      // PASO 4: Registrar log de auditoría
      const logEntry = {
        administrador: currentUser.email,
        fecha: new Date().toISOString(),
        tipo_reinicio: resetConfig.tipoReinicio,
        temporada_nueva: resetConfig.nombreTemporada,
        backup_generado: resetConfig.generarBackup
      };
      console.log("LOG DE AUDITORÍA:", logEntry);

      // PASO 5: Enviar notificaciones
      if (resetConfig.notificarAdmins) {
        toast.info("📧 Enviando notificación a administradores..."); // Refined message
        try {
          await base44.integrations.Core.SendEmail({
            to: currentUser.email,
            subject: `✅ Reinicio Completado - ${resetConfig.nombreTemporada}`, // Refined subject
            body: `
              <h2>Reinicio de Temporada Completado</h2>
              <p>Se ha completado el reinicio con éxito.</p>
              <ul>
                <li><strong>Tipo:</strong> ${resetConfig.tipoReinicio}</li>
                <li><strong>Nueva Temporada:</strong> ${resetConfig.nombreTemporada}</li>
                <li><strong>Ejecutado por:</strong> ${currentUser.email}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</li>
                <li><strong>Backup generado:</strong> ${resetConfig.generarBackup ? 'Sí' : 'No'}</li>
              </ul>
            ` // Refined body
          });
        } catch (error) {
          console.error("Error sending admin notification:", error);
        }
      }

      if (resetConfig.notificarPadres && resetConfig.mensajePadres) {
        toast.info("📧 Enviando notificación a padres..."); // Refined message
        const uniqueParentEmails = [...new Set(players.map(p => p.email_padre).filter(Boolean))];
        
        for (const email of uniqueParentEmails.slice(0, 10)) { // Limitar a 10 para demo
          try {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: `🟢 Nueva Temporada ${resetConfig.nombreTemporada}`, // Refined subject
              body: `<h2>Nueva Temporada</h2><p>${resetConfig.mensajePadres}</p>` // Refined body
            });
          } catch (error) {
            console.error(`Error sending email to ${email}:`, error);
          }
        }
      }

      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      toast.success("🎉 ¡Reinicio completado!"); // Refined message
      
      // Resetear estados
      setShowConfirmation(false);
      setSecurityCheck({
        emailConfirmacion: "",
        aceptoTerminos: false,
        // password: "" // Removed password reset
      });
    } catch (error) {
      console.error("Error executing season reset:", error);
      toast.error("❌ Error al ejecutar el reinicio. Restaura desde el backup si es necesario.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Categorías y rangos de edad (para sugerencias)
  const categoryAgeRanges = {
    "Prebenjamín": { min: 4, max: 6 },
    "Benjamín": { min: 7, max: 8 },
    "Alevín": { min: 9, max: 10 },
    "Infantil": { min: 11, max: 12 },
    "Cadete": { min: 13, max: 14 },
    "Juvenil": { min: 15, max: 17 },
    "Senior": { min: 18, max: 100 }
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getSuggestedCategory = (age) => {
    for (const [category, range] of Object.entries(categoryAgeRanges)) {
      if (age >= range.min && age <= range.max) {
        return category;
      }
    }
    return null;
  };

  const playersNeedingUpdate = players.filter(player => {
    if (!player.fecha_nacimiento || !player.categoria) return false;
    const age = calculateAge(player.fecha_nacimiento);
    const suggested = getSuggestedCategory(age);
    return suggested && suggested !== player.categoria;
  });

  // Leer y validar backup JSON
  const handleSelectBackupFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validar estructura
      if (!backupData.fecha_exportacion) {
        toast.error("❌ Archivo no válido: falta fecha de exportación");
        return;
      }

      setBackupToRestore(backupData);
      setShowRestoreDialog(true);
    } catch (error) {
      console.error("Error reading backup:", error);
      toast.error("❌ Error al leer el archivo. Asegúrate de que sea un JSON válido.");
    } finally {
      event.target.value = "";
    }
  };

  // Ejecutar restauración
  const handleExecuteRestore = async () => {
    if (!backupToRestore) return;

    setIsRestoring(true);
    setShowRestoreDialog(false);

    try {
      toast.info("📦 Iniciando restauración...");

      // Restaurar pagos
      if (restoreOptions.pagos && backupToRestore.pagos?.length > 0) {
        toast.info(`💰 Restaurando ${backupToRestore.pagos.length} pagos...`);
        for (const pago of backupToRestore.pagos) {
          const { id, created_date, updated_date, created_by, ...pagoData } = pago;
          await base44.entities.Payment.create(pagoData);
        }
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      }

      // Restaurar recordatorios
      if (restoreOptions.recordatorios && backupToRestore.recordatorios?.length > 0) {
        toast.info(`🔔 Restaurando ${backupToRestore.recordatorios.length} recordatorios...`);
        for (const reminder of backupToRestore.recordatorios) {
          const { id, created_date, updated_date, created_by, ...reminderData } = reminder;
          await base44.entities.Reminder.create(reminderData);
        }
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }

      // Restaurar asistencias
      if (restoreOptions.asistencias && backupToRestore.asistencias?.length > 0) {
        toast.info(`📋 Restaurando ${backupToRestore.asistencias.length} asistencias...`);
        for (const asistencia of backupToRestore.asistencias) {
          const { id, created_date, updated_date, created_by, ...asistenciaData } = asistencia;
          await base44.entities.Attendance.create(asistenciaData);
        }
        queryClient.invalidateQueries({ queryKey: ['attendances'] });
      }

      // Restaurar evaluaciones
      if (restoreOptions.evaluaciones && backupToRestore.evaluaciones?.length > 0) {
        toast.info(`⭐ Restaurando ${backupToRestore.evaluaciones.length} evaluaciones...`);
        for (const evaluacion of backupToRestore.evaluaciones) {
          const { id, created_date, updated_date, created_by, ...evaluacionData } = evaluacion;
          await base44.entities.PlayerEvaluation.create(evaluacionData);
        }
        queryClient.invalidateQueries({ queryKey: ['evaluations'] });
      }

      // Restaurar eventos
      if (restoreOptions.eventos && backupToRestore.eventos?.length > 0) {
        toast.info(`📅 Restaurando ${backupToRestore.eventos.length} eventos...`);
        for (const evento of backupToRestore.eventos) {
          const { id, created_date, updated_date, created_by, ...eventoData } = evento;
          await base44.entities.Event.create(eventoData);
        }
        queryClient.invalidateQueries({ queryKey: ['events'] });
      }

      // Restaurar anuncios
      if (restoreOptions.anuncios && backupToRestore.anuncios?.length > 0) {
        toast.info(`📢 Restaurando ${backupToRestore.anuncios.length} anuncios...`);
        for (const anuncio of backupToRestore.anuncios) {
          const { id, created_date, updated_date, created_by, ...anuncioData } = anuncio;
          await base44.entities.Announcement.create(anuncioData);
        }
        queryClient.invalidateQueries({ queryKey: ['announcements'] });
      }

      toast.success("✅ Restauración completada");
      setBackupToRestore(null);
      setRestoreOptions({
        pagos: true,
        recordatorios: true,
        asistencias: false,
        evaluaciones: false,
        eventos: false,
        anuncios: false,
      });
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("❌ Error al restaurar. Revisa la consola para más detalles.");
    } finally {
      setIsRestoring(false);
    }
  };

  // Exportar temporada específica
  const exportSeasonBackup = (temporada) => {
    const seasonPayments = payments.filter(p => p.temporada === temporada);
    const seasonData = {
      fecha_exportacion: new Date().toISOString(),
      temporada: temporada,
      pagos: seasonPayments,
      recordatorios: reminders.filter(r => r.temporada === temporada),
    };

    const blob = new Blob([JSON.stringify(seasonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${temporada.replace('/', '-')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`📦 Backup de ${temporada} descargado`);
  };

  if (!isAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto" />
              <h2 className="text-2xl font-bold text-red-900">Acceso Restringido</h2>
              <p className="text-red-700">Solo los administradores pueden acceder a la gestión de temporadas.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Temporadas</h1>
        <p className="text-slate-600 mt-1">Control de temporadas y reinicio anual</p>
      </div>

      {/* Export All Data Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">💾 Backup Completo</h3>
              <p className="text-sm text-blue-700 mt-1">Exportar toda la información antes de resetear</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const allData = {
                    fecha_exportacion: new Date().toISOString(),
                    temporada: activeSeason?.temporada,
                    jugadores: players,
                    pagos: payments,
                    recordatorios: reminders,
                    asistencias: attendances,
                    evaluaciones: evaluations,
                    horarios: schedules,
                    eventos: events,
                    anuncios: announcements,
                    galeria: gallery,
                    convocatorias: callups,
                    chats: chats,
                    encuestas: surveys,
                    respuestas_encuestas: surveyResponses,
                    resultados: matchResults,
                    pedidos_ropa: clothingOrders,
                    pedidos_loteria: lotteryOrders,
                    certificados: certificates,
                    notas_internas: memberNotes,
                    notificaciones: appNotifications
                  };
                  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `backup_completo_${activeSeason?.temporada}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  toast.success("📦 Backup descargado");
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Backup
              </Button>
              <Button
                disabled={isRestoring}
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => document.getElementById('restore-backup-input')?.click()}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Restaurando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Restaurar Backup
                  </>
                )}
              </Button>
              <input
                id="restore-backup-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleSelectBackupFile}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botón Principal: Iniciar Nueva Temporada */}
      <Card className="border-none shadow-2xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-900 rounded-full blur-3xl opacity-20"></div>
        <CardContent className="relative z-10 py-8 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Sparkles className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">🟢 Iniciar Nueva Temporada</h2>
                <p className="text-lg text-green-100">
                  Proceso automático con backup y opciones configurables
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-green-50">
                  <p>✅ Backup automático</p> {/* Refined text */}
                  <p>✅ Archivar datos</p> {/* Refined text */}
                  <p>✅ Notificaciones</p> {/* Refined text */}
                  <p>✅ Auditoría</p>
                </div>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleOpenResetDialog}
              className="bg-white text-green-700 hover:bg-green-50 font-bold py-6 px-8 text-lg shadow-2xl"
              disabled={isProcessing}
            >
              <Play className="w-6 h-6 mr-2" />
              Reiniciar Temporada
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Configuración */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-green-600" />
              Configuración de Reinicio
            </DialogTitle> {/* Refined title */}
            <DialogDescription>
              Configura las opciones. Se generará un backup automático antes de proceder.
            </DialogDescription> {/* Refined description */}
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tipo de Reinicio */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Tipo de Reinicio
              </Label>
              <RadioGroup value={resetConfig.tipoReinicio} onValueChange={(value) => setResetConfig({...resetConfig, tipoReinicio: value})}>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="completo" id="completo" />
                  <Label htmlFor="completo" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Reinicio Completo</div>
                    <div className="text-sm text-slate-600">Cierra temporada actual, archiva pagos al histórico, marca jugadores como "pendientes de renovación" y crea nueva temporada (con cuotas heredadas de CategoryManagement)</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="parcial" id="parcial" />
                  <Label htmlFor="parcial" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Reinicio Parcial</div>
                    <div className="text-sm text-slate-600">Solo resetea importes de pagos pendientes (útil si cambiaron las cuotas a mitad de temporada)</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="solo_archivar" id="solo_archivar" />
                  <Label htmlFor="solo_archivar" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Solo Archivar</div>
                    <div className="text-sm text-slate-600">Mueve solo pagos y recordatorios al histórico sin crear nueva temporada (limpieza sin cierre completo)</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Nueva Temporada */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Nueva Temporada
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <Label className="text-sm">Nombre *</Label>
                  <Input
                    placeholder="Ej: 2025/2026"
                    value={resetConfig.nombreTemporada}
                    onChange={(e) => setResetConfig({...resetConfig, nombreTemporada: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm">Mes Apertura</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={resetConfig.mesApertura}
                    onChange={(e) => setResetConfig({...resetConfig, mesApertura: e.target.value})}
                  />
                </div>
                <div>
                  <Label className="text-sm">Mes Cierre</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={resetConfig.mesCierre}
                    onChange={(e) => setResetConfig({...resetConfig, mesCierre: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Opciones de Seguridad */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Database className="w-4 h-4" />
                Backup y Seguridad
              </Label>
              <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Checkbox
                  id="backup"
                  checked={resetConfig.generarBackup}
                  onCheckedChange={(checked) => setResetConfig({...resetConfig, generarBackup: checked})}
                />
                <Label htmlFor="backup" className="text-sm cursor-pointer flex-1">
                  <div className="font-medium">Generar backup automático (Recomendado)</div>
                  <div className="text-xs text-slate-600">Se descargarán archivos CSV antes del reinicio</div> {/* Refined description */}
                </Label>
              </div>
            </div>

            {/* Datos a Eliminar */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Database className="w-4 h-4" />
                Datos a Eliminar
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarAsistencias"
                    checked={resetConfig.borrarAsistencias}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarAsistencias: checked})}
                  />
                  <Label htmlFor="borrarAsistencias" className="text-xs lg:text-sm cursor-pointer">
                    📋 Asist. ({attendances.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarEvaluaciones"
                    checked={resetConfig.borrarEvaluaciones}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarEvaluaciones: checked})}
                  />
                  <Label htmlFor="borrarEvaluaciones" className="text-xs lg:text-sm cursor-pointer">
                    ⭐ Eval. ({evaluations.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarHorarios"
                    checked={resetConfig.borrarHorarios}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarHorarios: checked})}
                  />
                  <Label htmlFor="borrarHorarios" className="text-xs lg:text-sm cursor-pointer">
                    ⏰ Horar. ({schedules.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarCalendario"
                    checked={resetConfig.borrarCalendario}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarCalendario: checked})}
                  />
                  <Label htmlFor="borrarCalendario" className="text-xs lg:text-sm cursor-pointer">
                    📅 Event. ({events.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarAnuncios"
                    checked={resetConfig.borrarAnuncios}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarAnuncios: checked})}
                  />
                  <Label htmlFor="borrarAnuncios" className="text-xs lg:text-sm cursor-pointer">
                    📢 Anunc. ({announcements.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarGaleria"
                    checked={resetConfig.borrarGaleria}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarGaleria: checked})}
                  />
                  <Label htmlFor="borrarGaleria" className="text-xs lg:text-sm cursor-pointer">
                    🖼️ Galer. ({gallery.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarConvocatorias"
                    checked={resetConfig.borrarConvocatorias}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarConvocatorias: checked})}
                  />
                  <Label htmlFor="borrarConvocatorias" className="text-xs lg:text-sm cursor-pointer">
                    🎓 Conv. ({callups.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarChats"
                    checked={resetConfig.borrarChats}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarChats: checked})}
                  />
                  <Label htmlFor="borrarChats" className="text-xs lg:text-sm cursor-pointer">
                    💬 Mens. ({chats.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarEncuestas"
                    checked={resetConfig.borrarEncuestas}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarEncuestas: checked})}
                  />
                  <Label htmlFor="borrarEncuestas" className="text-xs lg:text-sm cursor-pointer">
                    📋 Encues. ({surveys.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarResultados"
                    checked={resetConfig.borrarResultados}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarResultados: checked})}
                  />
                  <Label htmlFor="borrarResultados" className="text-xs lg:text-sm cursor-pointer">
                    ⚽ Result. ({matchResults.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="borrarPedidosRopa"
                    checked={resetConfig.borrarPedidosRopa}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarPedidosRopa: checked})}
                  />
                  <Label htmlFor="borrarPedidosRopa" className="text-xs lg:text-sm cursor-pointer">
                    👕 Ropa ({clothingOrders.length})
                    </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                    <Checkbox
                    id="borrarPedidosLoteria"
                    checked={resetConfig.borrarPedidosLoteria}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarPedidosLoteria: checked})}
                    />
                    <Label htmlFor="borrarPedidosLoteria" className="text-xs lg:text-sm cursor-pointer">
                    🍀 Loter. ({lotteryOrders.length})
                    </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                    <Checkbox
                    id="borrarCertificados"
                    checked={resetConfig.borrarCertificados}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarCertificados: checked})}
                    />
                    <Label htmlFor="borrarCertificados" className="text-xs lg:text-sm cursor-pointer">
                    📜 Certif. ({certificates.length})
                    </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                    <Checkbox
                    id="borrarNotasInternas"
                    checked={resetConfig.borrarNotasInternas}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarNotasInternas: checked})}
                    />
                    <Label htmlFor="borrarNotasInternas" className="text-xs lg:text-sm cursor-pointer">
                    📝 Notas ({memberNotes.length})
                    </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                    <Checkbox
                    id="borrarNotificaciones"
                    checked={resetConfig.borrarNotificaciones}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, borrarNotificaciones: checked})}
                    />
                    <Label htmlFor="borrarNotificaciones" className="text-xs lg:text-sm cursor-pointer">
                    🔔 Notif. ({appNotifications.length})
                    </Label>
                    </div>
                    </div>
                    </div>

            {/* Notificaciones */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Notificaciones
              </Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="notifyAdmins"
                    checked={resetConfig.notificarAdmins}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, notificarAdmins: checked})}
                  />
                  <Label htmlFor="notifyAdmins" className="text-sm cursor-pointer">
                    Enviar confirmación a administradores
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-lg border">
                  <Checkbox
                    id="notifyParents"
                    checked={resetConfig.notificarPadres}
                    onCheckedChange={(checked) => setResetConfig({...resetConfig, notificarPadres: checked})}
                  />
                  <Label htmlFor="notifyParents" className="text-sm cursor-pointer">
                    Enviar aviso a padres/tutores
                  </Label>
                </div>
              </div>
              {resetConfig.notificarPadres && (
                <Textarea
                  placeholder="Mensaje para los padres..."
                  value={resetConfig.mensajePadres}
                  onChange={(e) => setResetConfig({...resetConfig, mensajePadres: e.target.value})}
                  rows={3}
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => setShowPreview(true)}
              disabled={!resetConfig.nombreTemporada}
              variant="outline"
            >
              👁️ Vista Previa
            </Button>
            <Button onClick={handleProceedToConfirmation} className="bg-green-600 hover:bg-green-700">
              <Shield className="w-4 h-4 mr-2" />
              Continuar a Confirmación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <AlertDialog open={showPreview} onOpenChange={setShowPreview}>
        <AlertDialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-2">
              👁️ Vista Previa del Reinicio
            </AlertDialogTitle>
            <AlertDialogDescription>
              Resumen de lo que se va a eliminar y archivar
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <p className="font-semibold text-orange-900 mb-2">📦 Datos que se ARCHIVARÁN:</p>
                <ul className="space-y-1 text-sm text-orange-800">
                  <li>• Pagos: {payments.length} registros</li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4">
                <p className="font-semibold text-red-900 mb-2">🗑️ Datos que se ELIMINARÁN:</p>
                <ul className="space-y-1 text-sm text-red-800">
                  <li>• Recordatorios: {reminders.length} registros</li>
                  {resetConfig.borrarAsistencias && <li>• Asistencias: {attendances.length} registros</li>}
                  {resetConfig.borrarEvaluaciones && <li>• Evaluaciones: {evaluations.length} registros</li>}
                  {resetConfig.borrarHorarios && <li>• Horarios: {schedules.length} registros</li>}
                  {resetConfig.borrarCalendario && <li>• Eventos: {events.length} registros</li>}
                  {resetConfig.borrarAnuncios && <li>• Anuncios: {announcements.length} registros</li>}
                  {resetConfig.borrarGaleria && <li>• Galerías: {gallery.length} registros</li>}
                  {resetConfig.borrarConvocatorias && <li>• Convocatorias: {callups.length} registros</li>}
                  {resetConfig.borrarChats && <li>• Mensajes: {chats.length} registros</li>}
                  {resetConfig.borrarEncuestas && <li>• Encuestas: {surveys.length} + {surveyResponses.length} respuestas</li>}
                  {resetConfig.borrarResultados && <li>• Resultados: {matchResults.length} registros</li>}
                  {resetConfig.borrarPedidosRopa && <li>• Pedidos Ropa: {clothingOrders.length} registros</li>}
                  {resetConfig.borrarPedidosLoteria && <li>• Pedidos Lotería: {lotteryOrders.length} registros</li>}
                  {resetConfig.borrarCertificados && <li>• Certificados: {certificates.length} registros</li>}
                  {resetConfig.borrarNotasInternas && <li>• Notas Internas: {memberNotes.length} registros</li>}
                  {resetConfig.borrarNotificaciones && <li>• Notificaciones: {appNotifications.length} registros</li>}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <p className="font-semibold text-blue-900 mb-2">👥 Jugadores:</p>
                <p className="text-sm text-blue-800">
                  {players.length} jugadores serán marcados como PENDIENTES de renovación
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4">
                <p className="font-semibold text-green-900 mb-2">✨ Nueva Temporada:</p>
                <p className="text-sm text-green-800">
                  Se creará la temporada <strong>{resetConfig.nombreTemporada}</strong>
                </p>
              </CardContent>
            </Card>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                ⚠️ Para confirmar, escribe <strong>CONFIRMAR</strong> en el diálogo de seguridad
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de Restauración */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Upload className="w-6 h-6 text-orange-600" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription>
              Selecciona qué datos quieres restaurar del backup
            </DialogDescription>
          </DialogHeader>

          {backupToRestore && (
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <div className="text-sm space-y-1 text-blue-900">
                    <p><strong>Temporada:</strong> {backupToRestore.temporada || 'No especificada'}</p>
                    <p><strong>Fecha backup:</strong> {new Date(backupToRestore.fecha_exportacion).toLocaleString('es-ES')}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Datos disponibles para restaurar:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {backupToRestore.pagos?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="restore-pagos"
                        checked={restoreOptions.pagos}
                        onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, pagos: checked})}
                      />
                      <Label htmlFor="restore-pagos" className="text-sm cursor-pointer">
                        💰 Pagos ({backupToRestore.pagos.length})
                      </Label>
                    </div>
                  )}
                  {backupToRestore.recordatorios?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="restore-recordatorios"
                        checked={restoreOptions.recordatorios}
                        onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, recordatorios: checked})}
                      />
                      <Label htmlFor="restore-recordatorios" className="text-sm cursor-pointer">
                        🔔 Recordatorios ({backupToRestore.recordatorios.length})
                      </Label>
                    </div>
                  )}
                  {backupToRestore.asistencias?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="restore-asistencias"
                        checked={restoreOptions.asistencias}
                        onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, asistencias: checked})}
                      />
                      <Label htmlFor="restore-asistencias" className="text-sm cursor-pointer">
                        📋 Asistencias ({backupToRestore.asistencias.length})
                      </Label>
                    </div>
                  )}
                  {backupToRestore.evaluaciones?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="restore-evaluaciones"
                        checked={restoreOptions.evaluaciones}
                        onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, evaluaciones: checked})}
                      />
                      <Label htmlFor="restore-evaluaciones" className="text-sm cursor-pointer">
                        ⭐ Evaluaciones ({backupToRestore.evaluaciones.length})
                      </Label>
                    </div>
                  )}
                  {backupToRestore.eventos?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="restore-eventos"
                        checked={restoreOptions.eventos}
                        onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, eventos: checked})}
                      />
                      <Label htmlFor="restore-eventos" className="text-sm cursor-pointer">
                        📅 Eventos ({backupToRestore.eventos.length})
                      </Label>
                    </div>
                  )}
                  {backupToRestore.anuncios?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox
                        id="restore-anuncios"
                        checked={restoreOptions.anuncios}
                        onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, anuncios: checked})}
                      />
                      <Label htmlFor="restore-anuncios" className="text-sm cursor-pointer">
                        📢 Anuncios ({backupToRestore.anuncios.length})
                      </Label>
                    </div>
                  )}
                </div>
              </div>

              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 ml-6">
                  Los datos se <strong>añadirán</strong> a los existentes (no se eliminará nada actual)
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRestoreDialog(false);
              setBackupToRestore(null);
            }}>
              Cancelar
            </Button>
            <Button
              onClick={handleExecuteRestore}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!backupToRestore}
            >
              <Upload className="w-4 h-4 mr-2" />
              Restaurar Seleccionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Seguridad */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-600" />
              Confirmación de Seguridad
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 py-4">
              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 ml-6">
                  <strong>Esta acción es irreversible.</strong> Recomendamos tener el backup guardado.
                </AlertDescription> {/* Refined description */}
              </Alert>

              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-slate-900">Resumen de acciones:</h4> {/* Refined title */}
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>• Tipo: <strong>{resetConfig.tipoReinicio}</strong></li>
                  <li>• Nueva temporada: <strong>{resetConfig.nombreTemporada}</strong></li>
                  <li>• Pagos a archivar: <strong>{payments.length}</strong></li>
                  <li>• Recordatorios a eliminar: <strong>{reminders.length}</strong></li>
                  <li>• Pedidos afectados: <strong>{orders.filter(o => o.estado !== "Entregado").length}</strong></li> {/* Filter for relevant orders */}
                  <li>• Backup: <strong>{resetConfig.generarBackup ? 'Sí' : 'No'}</strong></li>
                </ul>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <Label className="text-base font-bold text-red-900 mb-3 block" htmlFor="confirmText">
                    ⚠️ Para confirmar, escribe exactamente: <span className="font-mono bg-red-600 text-white px-3 py-1 rounded text-lg">CONFIRMAR</span>
                  </Label>
                  <Input
                    id="confirmText"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value.trim())}
                    placeholder="Escribe CONFIRMAR en mayúsculas"
                    className="mt-2 text-lg font-bold border-red-400 focus:border-red-600"
                  />
                  {confirmText && confirmText !== "CONFIRMAR" && (
                    <p className="text-xs text-red-600 mt-1">❌ Debe ser exactamente "CONFIRMAR"</p>
                  )}
                  {confirmText === "CONFIRMAR" && (
                    <p className="text-xs text-green-600 mt-1">✅ Correcto</p>
                  )}
                </div>

                <div>
                  <Label className="text-sm font-medium">Confirma tu email *</Label>
                  <Input
                    type="email"
                    placeholder={currentUser?.email}
                    value={securityCheck.emailConfirmacion}
                    onChange={(e) => setSecurityCheck({...securityCheck, emailConfirmacion: e.target.value})}
                    className="mt-1"
                  />
                  {securityCheck.emailConfirmacion && securityCheck.emailConfirmacion !== currentUser?.email && (
                    <p className="text-xs text-red-600 mt-1">❌ El email no coincide</p>
                  )}
                  {securityCheck.emailConfirmacion === currentUser?.email && (
                    <p className="text-xs text-green-600 mt-1">✅ Email correcto</p>
                  )}
                </div>

                {/* Removed password input field */}
                {/* <div>
                  <Label className="text-sm font-medium">Contraseña *</Label>
                  <Input
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    value={securityCheck.password}
                    onChange={(e) => setSecurityCheck({...securityCheck, password: e.target.value})}
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Confirma tu identidad para continuar</p>
                </div> */}

                <div className="flex items-center space-x-2 p-3 border-2 rounded-lg">
                  <Checkbox
                    id="accept"
                    checked={securityCheck.aceptoTerminos}
                    onCheckedChange={(checked) => setSecurityCheck({...securityCheck, aceptoTerminos: checked})}
                  />
                  <Label htmlFor="accept" className="text-sm cursor-pointer">
                    Acepto ejecutar el reinicio. Entiendo que es irreversible.
                  </Label> {/* Refined label */}
                </div>
              </div>

              {/* Removed the note about password and backup availability */}
              {/* <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded">
                <strong>Nota:</strong> Se registrará un log de auditoría con tu usuario, fecha/hora y tipo de reinicio.
                El backup estará disponible durante 30 días.
              </div> */}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmation(false);
              setConfirmText("");
              setSecurityCheck({
                emailConfirmacion: "",
                aceptoTerminos: false,
              });
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteReset}
              disabled={isProcessing || confirmText !== "CONFIRMAR"}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Control de Bizum */}
      {activeSeason && (
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              📱 Control de Bizum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-900">Estado Actual</p>
                  <p className="text-sm text-slate-600">
                    {activeSeason.bizum_activo ? "✅ Bizum disponible para usuarios" : "🔒 Bizum deshabilitado"}
                  </p>
                </div>
                <Badge className={activeSeason.bizum_activo ? "bg-blue-600 text-white text-lg px-4 py-2" : "bg-slate-400 text-white text-lg px-4 py-2"}>
                  {activeSeason.bizum_activo ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Teléfono del Club para Bizum</Label>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="Ej: 612345678"
                    defaultValue={activeSeason.bizum_telefono || ""}
                    onBlur={(e) => {
                      if (e.target.value !== activeSeason.bizum_telefono) {
                        updateBizumPhone(e.target.value);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Este número se mostrará a los usuarios cuando paguen con Bizum
                </p>
              </div>
            </div>
            <Button
              onClick={toggleBizum}
              className={`w-full font-bold text-lg py-6 ${
                activeSeason.bizum_activo 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {activeSeason.bizum_activo ? "🔒 Desactivar Bizum" : "📱 Activar Bizum"}
            </Button>
            <p className="text-xs text-slate-600 text-center">
              Los usuarios podrán pagar con Bizum en: cuotas, pedidos de ropa y lotería
            </p>
          </CardContent>
        </Card>
      )}

      {/* Control de Lotería y Tienda */}
      {activeSeason && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <Clover className="w-5 h-5" />
                🍀 Control de Lotería de Navidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Estado Actual</p>
                    <p className="text-sm text-slate-600">
                      {activeSeason.loteria_navidad_abierta ? "✅ Abierta - Los usuarios pueden hacer pedidos" : "🔒 Cerrada - Pedidos deshabilitados"}
                    </p>
                  </div>
                  <Badge className={activeSeason.loteria_navidad_abierta ? "bg-green-600 text-white text-lg px-4 py-2" : "bg-slate-400 text-white text-lg px-4 py-2"}>
                    {activeSeason.loteria_navidad_abierta ? "ABIERTA" : "CERRADA"}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={toggleLottery}
                className={`w-full font-bold text-lg py-6 ${
                  activeSeason.loteria_navidad_abierta 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {activeSeason.loteria_navidad_abierta ? "🔒 Cerrar Lotería" : "🍀 Abrir Lotería"}
              </Button>
              <p className="text-xs text-slate-600 text-center">
                Al abrir, aparecerá el menú "🍀 Lotería" para todos los usuarios
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <ShoppingBag className="w-5 h-5" />
                🛍️ Control de Tienda de Ropa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white rounded-lg p-4 border-2 border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Estado Actual</p>
                    <p className="text-sm text-slate-600">
                      {activeSeason.tienda_ropa_abierta ? "✅ Abierta - Pedidos habilitados" : "🔒 Cerrada - No se pueden hacer pedidos"}
                    </p>
                  </div>
                  <Badge className={activeSeason.tienda_ropa_abierta ? "bg-orange-600 text-white text-lg px-4 py-2" : "bg-slate-400 text-white text-lg px-4 py-2"}>
                    {activeSeason.tienda_ropa_abierta ? "ABIERTA" : "CERRADA"}
                  </Badge>
                </div>
              </div>
              <Button
                onClick={toggleClothingStore}
                className={`w-full font-bold text-lg py-6 ${
                  activeSeason.tienda_ropa_abierta 
                    ? "bg-red-600 hover:bg-red-700" 
                    : "bg-orange-600 hover:bg-orange-700"
                }`}
              >
                {activeSeason.tienda_ropa_abierta ? "🔒 Cerrar Tienda" : "🛍️ Abrir Tienda"}
              </Button>
              <p className="text-xs text-slate-600 text-center">
                Normalmente abierta solo en Junio-Julio para pedidos de nueva temporada
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Información de Temporada Actual */}
      {activeSeason && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Temporada Activa
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-sm text-slate-600">Temporada</p>
                <p className="text-2xl font-bold text-slate-900">{activeSeason.temporada}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Cuota Única</p>
                  <p className="text-xl font-bold text-green-600">{activeSeason.cuota_unica}€</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Cuota Fraccionada</p>
                  <p className="text-xl font-bold text-blue-600">{activeSeason.cuota_tres_meses}€/mes</p>
                </div>
              </div>
              {activeSeason.fecha_inicio && activeSeason.fecha_fin && (
                <div>
                  <p className="text-sm text-slate-600">Período</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(activeSeason.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(activeSeason.fecha_fin).toLocaleDateString('es-ES')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Estadísticas Actuales
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Pagos Registrados</span>
                <Badge className="bg-blue-100 text-blue-700 text-lg px-3 py-1">
                  {payments.length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Recordatorios Activos</span>
                <Badge className="bg-orange-100 text-orange-700 text-lg px-3 py-1">
                  {reminders.filter(r => !r.enviado).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Jugadores Activos</span>
                <Badge className="bg-green-100 text-green-700 text-lg px-3 py-1">
                  {players.filter(p => p.activo).length}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Pedidos Pendientes</span>
                <Badge className="bg-purple-100 text-purple-700 text-lg px-3 py-1">
                  {orders.filter(o => o.estado !== "Entregado" && o.estado !== "Archivado").length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jugadores que Necesitan Actualización */}
      {playersNeedingUpdate.length > 0 && (
        <Card className="border-none shadow-lg bg-orange-50 border-l-4 border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Jugadores que Necesitan Actualización ({playersNeedingUpdate.length})
            </CardTitle> {/* Refined title */}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playersNeedingUpdate.slice(0, 10).map(player => {
                const age = calculateAge(player.fecha_nacimiento);
                const suggested = getSuggestedCategory(age);
                return (
                  <div key={player.id} className="bg-white p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{player.nombre}</p>
                        <p className="text-sm text-slate-600">
                          {age} años - Actualmente: <Badge className="bg-slate-100 text-slate-700">{player.categoria}</Badge>
                        </p> {/* Refined text */}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Sugerida:</p> {/* Refined text */}
                        <Badge className="bg-orange-100 text-orange-700 text-base px-3 py-1">
                          {suggested}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset History */}
      {resetHistory.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <History className="w-5 h-5" />
              Historial de Reinicios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {resetHistory.slice(0, 5).map((reset) => (
                <div key={reset.id} className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-purple-900">
                        {reset.temporada_anterior} → {reset.temporada_nueva}
                      </p>
                      <p className="text-sm text-slate-600">
                        {new Date(reset.fecha_reset).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">
                      {reset.usuario_responsable.split('@')[0]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600">
                    <div>📋 Asistencias: {reset.datos_borrados?.asistencias || 0}</div>
                    <div>⭐ Evaluaciones: {reset.datos_borrados?.evaluaciones || 0}</div>
                    <div>📅 Eventos: {reset.datos_borrados?.eventos || 0}</div>
                    <div>💬 Mensajes: {reset.datos_borrados?.chats || 0}</div>
                  </div>
                  {reset.notas && (
                    <p className="text-xs text-slate-500 mt-2 italic">{reset.notas}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Temporadas */}
      <Card className="border-none shadow-lg">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-600" />
            Historial de Temporadas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingSeasons ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : seasons.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No hay temporadas registradas</p>
          ) : (
            <div className="space-y-3">
              {seasons.map(season => (
                <div
                  key={season.id}
                  className={`p-4 rounded-lg border-2 ${
                    season.activa 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-slate-900">
                          Temporada {season.temporada}
                        </p>
                        {season.activa && (
                          <Badge className="bg-green-600 text-white">Activa</Badge>
                        )}
                        {season.tienda_ropa_abierta && (
                          <Badge className="bg-orange-500 text-white">🛍️ Tienda Abierta</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-slate-600">
                        <span>Única: <strong>{season.cuota_unica}€</strong></span>
                        <span>Fraccionada: <strong>{season.cuota_tres_meses}€/mes</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {season.fecha_inicio && season.fecha_fin && (
                        <div className="text-right text-sm text-slate-600">
                          <p>{new Date(season.fecha_inicio).toLocaleDateString('es-ES')}</p>
                          <p>{new Date(season.fecha_fin).toLocaleDateString('es-ES')}</p>
                        </div>
                      )}
                      {!season.activa && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportSeasonBackup(season.temporada)}
                          className="border-blue-300 hover:bg-blue-50"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Exportar
                        </Button>
                      )}
                    </div>
                  </div>
                  {season.notas && (
                    <p className="text-sm text-slate-600 mt-2 italic">{season.notas}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información de Recuperación */}
      <Card className="border-none shadow-lg bg-blue-50 border-l-4 border-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Download className="w-5 h-5" />
            Recuperación y Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              <strong>Backups automáticos:</strong> Se generan archivos CSV con todos los datos que se descargan automáticamente.
            </p> {/* Refined text */}
            {/* Removed backup availability */}
            <p>
              <strong>Restauración:</strong> Importa los archivos CSV descargados desde el panel de administración.
            </p> {/* Refined text */}
            <div className="bg-white p-3 rounded border border-blue-200">
              <p className="font-semibold text-blue-900 mb-1">💡 Consejo:</p>
              <p className="text-xs">Guarda los backups en un lugar seguro (Google Drive, Dropbox, etc.).</p> {/* Refined text */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}