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
  Clover,
  CreditCard,
  RefreshCw
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

export default function SeasonManager() {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
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
  
  const [resetConfig, setResetConfig] = useState({
    tipoReinicio: "completo",
    nombreTemporada: "",
    mesApertura: "9",
    mesCierre: "6",
    generarBackup: true,
    notificarAdmins: true,
    notificarPadres: false,
    mensajePadres: "¡Bienvenidos a la nueva temporada! La aplicación ha sido actualizada. Por favor, revisa los datos de tus jugadores.",
    borrarAsistencias: true,
    borrarEvaluaciones: true,
    borrarHorarios: true,
    borrarCalendario: true,
    borrarAnuncios: true,
    borrarGaleria: true,
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

  const [securityCheck, setSecurityCheck] = useState({
    emailConfirmacion: "",
    aceptoTerminos: false,
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
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
      data: { ...activeSeason, loteria_navidad_abierta: !activeSeason.loteria_navidad_abierta }
    });
  };

  const toggleClothingStore = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, tienda_ropa_abierta: !activeSeason.tienda_ropa_abierta }
    });
  };

  const toggleBizum = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, bizum_activo: !activeSeason.bizum_activo }
    });
  };

  const toggleRenewalMode = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, permitir_renovaciones: !activeSeason.permitir_renovaciones }
    });
  };

  const toggleLotteryPaymentRequired = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, loteria_requiere_pago_adelantado: !activeSeason.loteria_requiere_pago_adelantado }
    });
  };

  const toggleSponsorBanner = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, mostrar_patrocinadores: !activeSeason.mostrar_patrocinadores }
    });
  };

  const toggleAdminEmailNotifications = async () => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, notificaciones_admin_email: !activeSeason.notificaciones_admin_email }
    });
  };

  const updateBizumPhone = async (phone) => {
    if (!activeSeason) return;
    await updateSeasonMutation.mutateAsync({
      id: activeSeason.id,
      data: { ...activeSeason, bizum_telefono: phone }
    });
  };

  const generateBackup = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    const paymentsCSV = [
      ['ID', 'Jugador', 'Mes', 'Temporada', 'Cantidad', 'Estado', 'Fecha Pago', 'Método'],
      ...payments.map(p => [p.id, p.jugador_nombre, p.mes, p.temporada, p.cantidad, p.estado, p.fecha_pago || '', p.metodo_pago || ''])
    ].map(row => row.join(',')).join('\n');

    const playersCSV = [
      ['ID', 'Nombre', 'Deporte', 'Categoría', 'Email', 'Email Padre', 'Activo'],
      ...players.map(p => [p.id, p.nombre, p.deporte, p.categoria, p.email || '', p.email_padre || '', p.activo])
    ].map(row => row.join(',')).join('\n');

    const ordersCSV = [
      ['ID', 'Cliente', 'Email', 'Total', 'Estado', 'Fecha'],
      ...orders.map(o => [o.id, o.cliente_nombre, o.cliente_email || '', o.total, o.estado, o.created_date])
    ].map(row => row.join(',')).join('\n');

    downloadCSV(paymentsCSV, `backup_pagos_${timestamp}.csv`);
    downloadCSV(playersCSV, `backup_jugadores_${timestamp}.csv`);
    downloadCSV(ordersCSV, `backup_pedidos_${timestamp}.csv`);

    toast.success("✅ Backup generado y descargado");
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

  const getNextSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    if (currentMonth <= 8) {
      return `${currentYear}/${currentYear + 1}`;
    }
    return `${currentYear + 1}/${currentYear + 2}`;
  };

  const handleOpenResetDialog = () => {
    setResetConfig({
      ...resetConfig,
      nombreTemporada: getNextSeason(),
    });
    setShowResetDialog(true);
  };

  const handleProceedToConfirmation = () => {
    if (!resetConfig.nombreTemporada) {
      toast.error("Por favor, ingresa el nombre de la temporada");
      return;
    }
    setShowResetDialog(false);
    setShowConfirmation(true);
  };

  const handleExecuteReset = async () => {
    if (!currentUser) {
      toast.error("❌ Error: No se pudo verificar el usuario");
      return;
    }

    if (securityCheck.emailConfirmacion !== currentUser.email) {
      toast.error(`❌ El email de confirmación no coincide. Escribe: ${currentUser.email}`);
      return;
    }

    if (!securityCheck.aceptoTerminos) {
      toast.error("❌ Debes aceptar los términos para continuar");
      return;
    }

    setIsProcessing(true);
    toast.info("🚀 Iniciando reinicio de temporada...");

    try {
      if (resetConfig.generarBackup) {
        toast.info("📦 Generando backup...");
        generateBackup();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const cuotasTemporadaAnterior = {
        cuota_unica: activeSeason?.cuota_unica || 150,
        cuota_tres_meses: activeSeason?.cuota_tres_meses || 55,
      };

      if (resetConfig.tipoReinicio === "completo" || resetConfig.tipoReinicio === "solo_archivar") {
        toast.info(`📁 Archivando ${payments.length} pagos...`);
        for (const payment of payments) {
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
        }
        toast.success(`✅ ${payments.length} pagos archivados`);

        toast.info(`🗑️ Eliminando ${reminders.length} recordatorios...`);
        for (const reminder of reminders) {
          try {
            await base44.entities.Reminder.delete(reminder.id);
          } catch (error) {
            console.error(`Error deleting reminder ${reminder.id}:`, error);
          }
        }
        toast.success(`✅ ${reminders.length} recordatorios eliminados`);

        if (activeSeason) {
          toast.info("🔚 Cerrando temporada anterior...");
          await base44.entities.SeasonConfig.update(activeSeason.id, { ...activeSeason, activa: false });
          toast.success("✅ Temporada anterior cerrada");
        }
      }

      if (resetConfig.tipoReinicio === "completo") {
        // Archive orders
        const ordersToArchive = orders.filter(o => o.estado !== "Entregado");
        for (const order of ordersToArchive) {
          try {
            await base44.entities.Order.update(order.id, { ...order, estado: "Archivado" });
          } catch (error) {
            console.error(`Error archiving order ${order.id}:`, error);
          }
        }

        // Mark players as pending renewal
        for (const player of players) {
          try {
            await base44.entities.Player.update(player.id, {
              ...player,
              activo: false,
              estado_renovacion: "pendiente",
              temporada_renovacion: resetConfig.nombreTemporada,
              enlace_firma_jugador: "",
              enlace_firma_tutor: "",
              firma_jugador_completada: false,
              firma_tutor_completada: false
            });
          } catch (error) {
            console.error(`Error updating player ${player.id}:`, error);
          }
        }

        // Delete data based on config
        if (resetConfig.borrarAsistencias) {
          for (const a of attendances) { try { await base44.entities.Attendance.delete(a.id); } catch {} }
        }
        if (resetConfig.borrarEvaluaciones) {
          for (const e of evaluations) { try { await base44.entities.PlayerEvaluation.delete(e.id); } catch {} }
        }
        if (resetConfig.borrarHorarios) {
          for (const s of schedules) { try { await base44.entities.TrainingSchedule.delete(s.id); } catch {} }
        }
        if (resetConfig.borrarCalendario) {
          for (const e of events) { try { await base44.entities.Event.delete(e.id); } catch {} }
        }
        if (resetConfig.borrarAnuncios) {
          for (const a of announcements) { try { await base44.entities.Announcement.delete(a.id); } catch {} }
        }
        if (resetConfig.borrarGaleria) {
          for (const g of gallery) { try { await base44.entities.PhotoGallery.delete(g.id); } catch {} }
        }
        if (resetConfig.borrarConvocatorias) {
          for (const c of callups) { try { await base44.entities.Convocatoria.delete(c.id); } catch {} }
        }
        if (resetConfig.borrarChats) {
          for (const c of chats) { try { await base44.entities.ChatMessage.delete(c.id); } catch {} }
        }
        if (resetConfig.borrarEncuestas) {
          for (const s of surveys) { try { await base44.entities.Survey.delete(s.id); } catch {} }
          for (const r of surveyResponses) { try { await base44.entities.SurveyResponse.delete(r.id); } catch {} }
        }
        if (resetConfig.borrarResultados) {
          for (const r of matchResults) { try { await base44.entities.MatchResult.delete(r.id); } catch {} }
        }
        if (resetConfig.borrarPedidosRopa) {
          for (const o of clothingOrders) { try { await base44.entities.ClothingOrder.delete(o.id); } catch {} }
        }
        if (resetConfig.borrarPedidosLoteria) {
          for (const o of lotteryOrders) { try { await base44.entities.LotteryOrder.delete(o.id); } catch {} }
        }
        if (resetConfig.borrarCertificados) {
          for (const c of certificates) { try { await base44.entities.Certificate.delete(c.id); } catch {} }
        }
        if (resetConfig.borrarNotasInternas) {
          for (const n of memberNotes) { try { await base44.entities.MemberNote.delete(n.id); } catch {} }
        }
        if (resetConfig.borrarNotificaciones) {
          for (const n of appNotifications) { try { await base44.entities.AppNotification.delete(n.id); } catch {} }
        }

        // Create new season
        const nuevaTemporada = {
          temporada: resetConfig.nombreTemporada,
          activa: true,
          cuota_unica: cuotasTemporadaAnterior.cuota_unica,
          cuota_tres_meses: cuotasTemporadaAnterior.cuota_tres_meses,
          fecha_inicio: `${new Date().getFullYear()}-${resetConfig.mesApertura.padStart(2, '0')}-01`,
          fecha_fin: `${new Date().getFullYear() + 1}-${resetConfig.mesCierre.padStart(2, '0')}-30`,
          tienda_ropa_abierta: false,
          loteria_navidad_abierta: false,
          notas: `Temporada creada el ${new Date().toLocaleDateString('es-ES')}`
        };
        await base44.entities.SeasonConfig.create(nuevaTemporada);

        // Save reset history
        await base44.entities.ResetHistory.create({
          fecha_reset: new Date().toISOString(),
          temporada_anterior: activeSeason?.temporada,
          temporada_nueva: resetConfig.nombreTemporada,
          usuario_responsable: currentUser.email,
          datos_borrados: {
            pagos: payments.length,
            recordatorios: reminders.length,
            asistencias: resetConfig.borrarAsistencias ? attendances.length : 0,
            evaluaciones: resetConfig.borrarEvaluaciones ? evaluations.length : 0,
          },
          backup_generado: resetConfig.generarBackup,
          notas: `Reset ejecutado por ${currentUser.full_name}`
        });
      }

      // Send notifications
      if (resetConfig.notificarAdmins) {
        try {
          await base44.integrations.Core.SendEmail({
            to: currentUser.email,
            subject: `✅ Reinicio Completado - ${resetConfig.nombreTemporada}`,
            body: `<h2>Reinicio de Temporada Completado</h2><p>Nueva Temporada: ${resetConfig.nombreTemporada}</p>`
          });
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });

      toast.success("✅ ¡Temporada cerrada con éxito!", { duration: 5000 });
      
      setShowConfirmation(false);
      setConfirmText("");
      setSecurityCheck({ emailConfirmacion: "", aceptoTerminos: false });
    } catch (error) {
      console.error("Error executing season reset:", error);
      toast.error("❌ Error al ejecutar el reinicio.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectBackupFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      if (!backupData.fecha_exportacion) {
        toast.error("❌ Archivo no válido");
        return;
      }
      setBackupToRestore(backupData);
      setShowRestoreDialog(true);
    } catch (error) {
      toast.error("❌ Error al leer el archivo.");
    } finally {
      event.target.value = "";
    }
  };

  const handleExecuteRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoring(true);
    setShowRestoreDialog(false);

    try {
      if (restoreOptions.pagos && backupToRestore.pagos?.length > 0) {
        for (const pago of backupToRestore.pagos) {
          const { id, created_date, updated_date, created_by, ...pagoData } = pago;
          await base44.entities.Payment.create(pagoData);
        }
        queryClient.invalidateQueries({ queryKey: ['payments'] });
      }

      if (restoreOptions.recordatorios && backupToRestore.recordatorios?.length > 0) {
        for (const reminder of backupToRestore.recordatorios) {
          const { id, created_date, updated_date, created_by, ...reminderData } = reminder;
          await base44.entities.Reminder.create(reminderData);
        }
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
      }

      toast.success("✅ Restauración completada");
      setBackupToRestore(null);
    } catch (error) {
      toast.error("❌ Error al restaurar.");
    } finally {
      setIsRestoring(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Export All Data Button */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">💾 Backup Completo</h3>
              <p className="text-sm text-blue-700 mt-1">Exportar toda la información antes de resetear</p>
            </div>
            <div className="flex gap-2 flex-wrap">
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
                {isRestoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {isRestoring ? "Restaurando..." : "Restaurar Backup"}
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

      {/* Main Reset Button */}
      <Card className="border-none shadow-2xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"></div>
        <CardContent className="relative z-10 py-8 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                <Sparkles className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold mb-2">🟢 Iniciar Nueva Temporada</h2>
                <p className="text-lg text-green-100">Proceso automático con backup y opciones configurables</p>
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

      {/* Feature Controls */}
      {activeSeason && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Renewal Mode */}
          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-purple-900 text-base">
                <RefreshCw className="w-5 h-5" />
                🔄 Permitir Renovaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {activeSeason.permitir_renovaciones ? "✅ Habilitadas" : "🔒 Solo nuevas"}
                </span>
                <Badge className={activeSeason.permitir_renovaciones ? "bg-purple-600" : "bg-slate-400"}>
                  {activeSeason.permitir_renovaciones ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </div>
              <Button onClick={toggleRenewalMode} className={`w-full ${activeSeason.permitir_renovaciones ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}`}>
                {activeSeason.permitir_renovaciones ? "🔒 Desactivar" : "🔄 Activar"}
              </Button>
            </CardContent>
          </Card>

          {/* Bizum Control */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-900 text-base">📱 Control de Bizum</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {activeSeason.bizum_activo ? "✅ Disponible" : "🔒 Deshabilitado"}
                </span>
                <Badge className={activeSeason.bizum_activo ? "bg-blue-600" : "bg-slate-400"}>
                  {activeSeason.bizum_activo ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </div>
              <Input
                type="tel"
                placeholder="Teléfono Bizum"
                defaultValue={activeSeason.bizum_telefono || ""}
                onBlur={(e) => {
                  if (e.target.value !== activeSeason.bizum_telefono) {
                    updateBizumPhone(e.target.value);
                  }
                }}
              />
              <Button onClick={toggleBizum} className={`w-full ${activeSeason.bizum_activo ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                {activeSeason.bizum_activo ? "🔒 Desactivar" : "📱 Activar"}
              </Button>
            </CardContent>
          </Card>

          {/* Sponsor Banner */}
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-amber-900 text-base">💰 Banner Patrocinadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {activeSeason.mostrar_patrocinadores ? "✅ Visible" : "🔒 Oculto"}
                </span>
                <Badge className={activeSeason.mostrar_patrocinadores ? "bg-amber-600" : "bg-slate-400"}>
                  {activeSeason.mostrar_patrocinadores ? "VISIBLE" : "OCULTO"}
                </Badge>
              </div>
              <Button onClick={toggleSponsorBanner} className={`w-full ${activeSeason.mostrar_patrocinadores ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}>
                {activeSeason.mostrar_patrocinadores ? "🔒 Ocultar" : "💰 Mostrar"}
              </Button>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card className="border-2 border-indigo-200 bg-indigo-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-indigo-900 text-base">
                <Mail className="w-5 h-5" />
                📧 Emails Admin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {activeSeason.notificaciones_admin_email ? "✅ Activados" : "🔒 Desactivados"}
                </span>
                <Badge className={activeSeason.notificaciones_admin_email ? "bg-indigo-600" : "bg-slate-400"}>
                  {activeSeason.notificaciones_admin_email ? "ACTIVO" : "INACTIVO"}
                </Badge>
              </div>
              <Button onClick={toggleAdminEmailNotifications} className={`w-full ${activeSeason.notificaciones_admin_email ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                {activeSeason.notificaciones_admin_email ? "🔒 Desactivar" : "📧 Activar"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lottery and Clothing Store */}
      {activeSeason && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-900 text-base">
                <Clover className="w-5 h-5" />
                🍀 Lotería de Navidad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {activeSeason.loteria_navidad_abierta ? "✅ Abierta" : "🔒 Cerrada"}
                </span>
                <Badge className={activeSeason.loteria_navidad_abierta ? "bg-green-600" : "bg-slate-400"}>
                  {activeSeason.loteria_navidad_abierta ? "ABIERTA" : "CERRADA"}
                </Badge>
              </div>
              <Button onClick={toggleLottery} className={`w-full ${activeSeason.loteria_navidad_abierta ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}>
                {activeSeason.loteria_navidad_abierta ? "🔒 Cerrar" : "🍀 Abrir"}
              </Button>
              <Button onClick={toggleLotteryPaymentRequired} variant="outline" className="w-full border-2" disabled={!activeSeason.loteria_navidad_abierta}>
                {activeSeason.loteria_requiere_pago_adelantado ? "👨‍🏫 Pago al Recibir" : "💳 Pago Adelantado"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-900 text-base">
                <ShoppingBag className="w-5 h-5" />
                🛍️ Tienda de Ropa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  {activeSeason.tienda_ropa_abierta ? "✅ Abierta" : "🔒 Cerrada"}
                </span>
                <Badge className={activeSeason.tienda_ropa_abierta ? "bg-orange-600" : "bg-slate-400"}>
                  {activeSeason.tienda_ropa_abierta ? "ABIERTA" : "CERRADA"}
                </Badge>
              </div>
              <Button onClick={toggleClothingStore} className={`w-full ${activeSeason.tienda_ropa_abierta ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}`}>
                {activeSeason.tienda_ropa_abierta ? "🔒 Cerrar" : "🛍️ Abrir"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Season Info */}
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
                <Badge className="bg-blue-100 text-blue-700 text-lg px-3 py-1">{payments.length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Recordatorios Activos</span>
                <Badge className="bg-orange-100 text-orange-700 text-lg px-3 py-1">{reminders.filter(r => !r.enviado).length}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600">Jugadores Activos</span>
                <Badge className="bg-green-100 text-green-700 text-lg px-3 py-1">{players.filter(p => p.activo).length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Season History */}
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
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
            </div>
          ) : seasons.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No hay temporadas registradas</p>
          ) : (
            <div className="space-y-3">
              {seasons.map(season => (
                <div key={season.id} className={`p-4 rounded-lg border-2 ${season.activa ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-slate-900">Temporada {season.temporada}</p>
                        {season.activa && <Badge className="bg-green-600 text-white">Activa</Badge>}
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-slate-600">
                        <span>Única: <strong>{season.cuota_unica}€</strong></span>
                        <span>Fraccionada: <strong>{season.cuota_tres_meses}€/mes</strong></span>
                      </div>
                    </div>
                    {!season.activa && (
                      <Button size="sm" variant="outline" onClick={() => exportSeasonBackup(season.temporada)} className="border-blue-300 hover:bg-blue-50">
                        <Download className="w-4 h-4 mr-1" />
                        Exportar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
                      <p className="font-semibold text-purple-900">{reset.temporada_anterior} → {reset.temporada_nueva}</p>
                      <p className="text-sm text-slate-600">{new Date(reset.fecha_reset).toLocaleDateString('es-ES')}</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-800">{reset.usuario_responsable?.split('@')[0]}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Config Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Settings className="w-6 h-6 text-green-600" />
              Configuración de Reinicio
            </DialogTitle>
            <DialogDescription>Configura las opciones. Se generará un backup automático antes de proceder.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tipo de Reinicio */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Tipo de Reinicio</Label>
              <RadioGroup value={resetConfig.tipoReinicio} onValueChange={(value) => setResetConfig({...resetConfig, tipoReinicio: value})}>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="completo" id="completo" />
                  <Label htmlFor="completo" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Reinicio Completo</div>
                    <div className="text-sm text-slate-600">Cierra temporada, archiva pagos, marca jugadores como pendientes</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="parcial" id="parcial" />
                  <Label htmlFor="parcial" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Reinicio Parcial</div>
                    <div className="text-sm text-slate-600">Solo resetea importes de pagos pendientes</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="solo_archivar" id="solo_archivar" />
                  <Label htmlFor="solo_archivar" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Solo Archivar</div>
                    <div className="text-sm text-slate-600">Mueve pagos y recordatorios al histórico</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Nueva Temporada */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Nueva Temporada</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Nombre *</Label>
                  <Input placeholder="Ej: 2025/2026" value={resetConfig.nombreTemporada} onChange={(e) => setResetConfig({...resetConfig, nombreTemporada: e.target.value})} />
                </div>
                <div>
                  <Label className="text-sm">Mes Apertura</Label>
                  <Input type="number" min="1" max="12" value={resetConfig.mesApertura} onChange={(e) => setResetConfig({...resetConfig, mesApertura: e.target.value})} />
                </div>
                <div>
                  <Label className="text-sm">Mes Cierre</Label>
                  <Input type="number" min="1" max="12" value={resetConfig.mesCierre} onChange={(e) => setResetConfig({...resetConfig, mesCierre: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Backup */}
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Checkbox id="backup" checked={resetConfig.generarBackup} onCheckedChange={(checked) => setResetConfig({...resetConfig, generarBackup: checked})} />
              <Label htmlFor="backup" className="text-sm cursor-pointer flex-1">
                <div className="font-medium">Generar backup automático (Recomendado)</div>
              </Label>
            </div>

            {/* Datos a Eliminar */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Datos a Eliminar</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: 'borrarAsistencias', label: '📋 Asist.', count: attendances.length },
                  { key: 'borrarEvaluaciones', label: '⭐ Eval.', count: evaluations.length },
                  { key: 'borrarHorarios', label: '⏰ Horar.', count: schedules.length },
                  { key: 'borrarCalendario', label: '📅 Event.', count: events.length },
                  { key: 'borrarAnuncios', label: '📢 Anunc.', count: announcements.length },
                  { key: 'borrarGaleria', label: '🖼️ Galer.', count: gallery.length },
                  { key: 'borrarConvocatorias', label: '🎓 Conv.', count: callups.length },
                  { key: 'borrarChats', label: '💬 Mens.', count: chats.length },
                  { key: 'borrarEncuestas', label: '📋 Encues.', count: surveys.length },
                  { key: 'borrarPedidosRopa', label: '👕 Ropa', count: clothingOrders.length },
                  { key: 'borrarPedidosLoteria', label: '🍀 Loter.', count: lotteryOrders.length },
                  { key: 'borrarCertificados', label: '📜 Certif.', count: certificates.length },
                ].map(item => (
                  <div key={item.key} className="flex items-center space-x-2 p-2 rounded-lg border">
                    <Checkbox id={item.key} checked={resetConfig[item.key]} onCheckedChange={(checked) => setResetConfig({...resetConfig, [item.key]: checked})} />
                    <Label htmlFor={item.key} className="text-xs cursor-pointer">{item.label} ({item.count})</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancelar</Button>
            <Button onClick={handleProceedToConfirmation} disabled={!resetConfig.nombreTemporada} className="bg-green-600 hover:bg-green-700">
              <Shield className="w-4 h-4 mr-2" />
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Confirmation Dialog */}
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
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <Label className="text-base font-bold text-red-900 mb-3 block">
                    ⚠️ Escribe exactamente: <span className="font-mono bg-red-600 text-white px-3 py-1 rounded">CONFIRMAR</span>
                  </Label>
                  <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value.trim())} placeholder="Escribe CONFIRMAR" className="text-lg font-bold" />
                </div>

                <div>
                  <Label className="text-sm font-medium">Confirma tu email *</Label>
                  <Input type="email" placeholder={currentUser?.email} value={securityCheck.emailConfirmacion} onChange={(e) => setSecurityCheck({...securityCheck, emailConfirmacion: e.target.value})} className="mt-1" />
                </div>

                <div className="flex items-center space-x-2 p-3 border-2 rounded-lg">
                  <Checkbox id="accept" checked={securityCheck.aceptoTerminos} onCheckedChange={(checked) => setSecurityCheck({...securityCheck, aceptoTerminos: checked})} />
                  <Label htmlFor="accept" className="text-sm cursor-pointer">Acepto ejecutar el reinicio. Entiendo que es irreversible.</Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowConfirmation(false); setConfirmText(""); setSecurityCheck({ emailConfirmacion: "", aceptoTerminos: false }); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteReset}
              disabled={isProcessing || confirmText !== "CONFIRMAR" || securityCheck.emailConfirmacion !== currentUser?.email || !securityCheck.aceptoTerminos}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Ejecutar Reinicio</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Upload className="w-6 h-6 text-orange-600" />
              Restaurar Backup
            </DialogTitle>
          </DialogHeader>

          {backupToRestore && (
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-sm"><strong>Temporada:</strong> {backupToRestore.temporada || 'No especificada'}</p>
                  <p className="text-sm"><strong>Fecha:</strong> {new Date(backupToRestore.fecha_exportacion).toLocaleString('es-ES')}</p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Datos a restaurar:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {backupToRestore.pagos?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox id="restore-pagos" checked={restoreOptions.pagos} onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, pagos: checked})} />
                      <Label htmlFor="restore-pagos" className="text-sm cursor-pointer">💰 Pagos ({backupToRestore.pagos.length})</Label>
                    </div>
                  )}
                  {backupToRestore.recordatorios?.length > 0 && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg border">
                      <Checkbox id="restore-recordatorios" checked={restoreOptions.recordatorios} onCheckedChange={(checked) => setRestoreOptions({...restoreOptions, recordatorios: checked})} />
                      <Label htmlFor="restore-recordatorios" className="text-sm cursor-pointer">🔔 Recordatorios ({backupToRestore.recordatorios.length})</Label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRestoreDialog(false); setBackupToRestore(null); }}>Cancelar</Button>
            <Button onClick={handleExecuteRestore} className="bg-orange-600 hover:bg-orange-700" disabled={!backupToRestore}>
              <Upload className="w-4 h-4 mr-2" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}