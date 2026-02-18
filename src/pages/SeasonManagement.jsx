import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Settings, AlertTriangle, CheckCircle2, Clock, Download, Upload,
  RefreshCw, Trash2, Archive, Users, CreditCard, ShoppingBag, Bell, 
  Clover, Building2, FileText, Shield, Lock, Unlock, Eye, EyeOff,
  ChevronDown, ChevronUp, Info, Smartphone, Mail, Image, Edit, Gift
} from "lucide-react";
import ReferralConfigCard from "../components/referrals/ReferralConfigCard";
import CategoryCleanupTool from "../components/financial/CategoryCleanupTool";
import { Euro } from "lucide-react";

import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SeasonManagement() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados para diálogos y configuración
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showEditQuotasDialog, setShowEditQuotasDialog] = useState(false);
  const [editingQuotas, setEditingQuotas] = useState({ cuota_unica: 0, cuota_tres_meses: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [securityCode, setSecurityCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [backupData, setBackupData] = useState(null);
  const [restoreSelections, setRestoreSelections] = useState({
    players: true,
    payments: true,
    reminders: true,
    attendances: true,
    evaluations: true,
    callups: true,
    clothingOrders: true,
    lotteryOrders: true
  });
  
  // Configuración del reset
  const [resetConfig, setResetConfig] = useState({
    archivePayments: true,
    deleteReminders: true,
    resetPlayerStatus: true,
    resetPlayerSignatures: true, // Resetear enlaces y estados de firma
    deleteAttendances: true,
    deleteEvaluations: true,
    deleteCallups: true,
    deleteClothingOrders: true,
    deleteLotteryOrders: true,
    deleteTrainingSchedules: true,
    deletePhotoGallery: true,
    deleteEvents: true,
    deleteAnnouncements: true,
    deleteChatMessages: true,
    deleteConvocatorias: true,
    deleteSurveys: true,
    deleteSurveyResponses: true,
    deleteMatchResults: true,
    deleteMedicalRecords: false,
    deleteDocuments: false,
    deletePrivateMessages: true,
    deletePrivateConversations: true, // Conversaciones privadas coordinador y entrenador
    deleteCoordinatorChats: true, // Chat coordinador específicamente
    deleteReferralRewards: true, // Referidos de la temporada
    resetUserReferrals: true, // Resetear contadores de referidos de usuarios
    resetClubMembers: true, // Desactivar socios de temporada anterior
    deleteCertificates: false, // Carnets/certificados - OPCIONAL (por si quieres mantener histórico)
    deleteAppNotifications: true, // Notificaciones app - eliminar
    newSeasonName: "",
    cuotaUnica: 200,
    cuotaTresMeses: 75,
    notifyParents: true
  });

  // Secciones expandidas
  const [expandedSections, setExpandedSections] = useState({
    backup: false,
    reset: false,
    features: true,
    history: false
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        // Permitir acceso a admin Y tesoreros
        setIsAdmin(currentUser.role === "admin" || currentUser.es_tesorero === true);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  // Queries para datos
  const { data: seasons = [] } = useQuery({
    queryKey: ['seasons'],
    queryFn: () => base44.entities.SeasonConfig.list('-created_date'),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', expandedSections.reset],
    queryFn: () => base44.entities.Payment.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players', expandedSections.reset],
    queryFn: () => base44.entities.Player.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', expandedSections.reset],
    queryFn: () => base44.entities.Reminder.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders', expandedSections.reset],
    queryFn: () => base44.entities.ClothingOrder.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders', expandedSections.reset],
    queryFn: () => base44.entities.LotteryOrder.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: resetHistory = [] } = useQuery({
    queryKey: ['resetHistory', expandedSections.history],
    queryFn: () => base44.entities.ResetHistory.list('-created_date'),
    enabled: expandedSections.history,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });



  const activeSeason = useMemo(() => {
    console.log('🔍 Buscando temporada activa en:', seasons);
    const active = seasons.find(s => s.activa === true);
    console.log('✅ Temporada activa encontrada:', active);
    return active;
  }, [seasons]);



  // Mutación para actualizar configuración de temporada
  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('🔄 Actualizando temporada:', id, data);
      return base44.entities.SeasonConfig.update(id, data);
    },
    onSuccess: async (result, variables) => {
      console.log('✅ Actualización exitosa:', result);
      await queryClient.invalidateQueries({ queryKey: ['seasons'] });
      await queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      toast.success("✅ Actualizado correctamente");
    },
    onError: (error) => {
      console.error("❌ Error actualizando:", error);
      toast.error("Error: " + error.message);
    }
  });

  // Funciones de toggle para características
  const toggleFeature = async (feature, value) => {
    if (!activeSeason || !activeSeason.id) {
      console.error('❌ No hay temporada activa', activeSeason);
      toast.error('No hay temporada activa');
      return;
    }
    console.log(`🔄 Toggle ${feature}:`, value, 'ID:', activeSeason.id);
    
    try {
      await updateSeasonMutation.mutateAsync({ 
        id: activeSeason.id, 
        data: { [feature]: value } 
      });
    } catch (error) {
      console.error('❌ Error en toggleFeature:', error);
      toast.error('Error al actualizar: ' + error.message);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Crear temporada activa rápidamente (fallback si el reset no llegó a crearla)
  const createActiveSeasonQuickly = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const seasonName = `${currentYear}-${currentYear + 1}`;
      const existing = await base44.entities.SeasonConfig.filter({ temporada: seasonName });
      if (existing.length > 0 && existing[0].activa) {
        toast.success(`La temporada ${seasonName} ya está activa`);
        return;
      }
      if (existing.length > 0) {
        await base44.entities.SeasonConfig.update(existing[0].id, { activa: true });
      } else {
        await base44.entities.SeasonConfig.create({
          temporada: seasonName,
          activa: true,
          cuota_unica: resetConfig.cuotaUnica || 200,
          cuota_tres_meses: resetConfig.cuotaTresMeses || 75,
          fecha_inicio: now.toISOString().split('T')[0],
          permitir_renovaciones: false,
          tienda_ropa_abierta: false,
          loteria_navidad_abierta: false
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast.success(`Temporada ${seasonName} creada/activada`);
    } catch (e) {
      console.error('Error creando temporada activa:', e);
      toast.error('No se pudo crear la temporada');
    }
  };

  // Función para descargar backup completo
  const downloadFullBackup = async () => {
    try {
      setIsProcessing(true);
      setProcessingStep("Recopilando datos...");
      
      const [
        allPayments,
        allPlayers,
        allReminders,
        allAttendances,
        allEvaluations,
        allCallups,
        allClothingOrders,
        allLotteryOrders,
        allSeasons
      ] = await Promise.all([
        base44.entities.Payment.list(),
        base44.entities.Player.list(),
        base44.entities.Reminder.list(),
        base44.entities.Attendance.list(),
        base44.entities.PlayerEvaluation.list(),
        base44.entities.Convocatoria.list(),
        base44.entities.ClothingOrder.list(),
        base44.entities.LotteryOrder.list(),
        base44.entities.SeasonConfig.list()
      ]);

      const backup = {
        exportDate: new Date().toISOString(),
        exportedBy: user?.email,
        version: "2.0",
        data: {
          payments: allPayments,
          players: allPlayers,
          reminders: allReminders,
          attendances: allAttendances,
          evaluations: allEvaluations,
          callups: allCallups,
          clothingOrders: allClothingOrders,
          lotteryOrders: allLotteryOrders,
          seasons: allSeasons
        }
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_cdbustarviejo_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Backup descargado correctamente");
    } catch (error) {
      console.error("Error creating backup:", error);
      toast.error("Error al crear el backup");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  };

  // Función para restaurar backup
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.data || !data.version) {
          toast.error("Formato de backup no válido");
          return;
        }
        setBackupData(data);
        setShowRestoreDialog(true);
      } catch (error) {
        toast.error("Error al leer el archivo");
      }
    };
    reader.readAsText(file);
  };

  const executeRestore = async () => {
    if (!backupData) return;
    
    setIsProcessing(true);
    setProcessingProgress(0);
    setShowRestoreDialog(false);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    try {
      const totalSteps = Object.keys(restoreSelections).filter(k => restoreSelections[k]).length;
      let currentStep = 0;

      if (restoreSelections.players && backupData.data.players?.length > 0) {
        setProcessingStep(`Restaurando jugadores (${backupData.data.players.length})...`);
        let success = 0;
        let failed = 0;
        for (const player of backupData.data.players) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = player;
            await base44.entities.Player.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando jugador:", err);
            failed++;
          }
        }
        console.log(`✅ Jugadores: ${success} restaurados, ${failed} fallidos`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.payments && backupData.data.payments?.length > 0) {
        setProcessingStep(`Restaurando pagos (${backupData.data.payments.length})...`);
        let success = 0;
        let failed = 0;
        for (const payment of backupData.data.payments) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = payment;
            await base44.entities.Payment.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando pago:", err);
            failed++;
          }
        }
        console.log(`✅ Pagos: ${success} restaurados, ${failed} fallidos`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.reminders && backupData.data.reminders?.length > 0) {
        setProcessingStep(`Restaurando recordatorios (${backupData.data.reminders.length})...`);
        let success = 0;
        let failed = 0;
        for (const reminder of backupData.data.reminders) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = reminder;
            await base44.entities.Reminder.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando recordatorio:", err);
            failed++;
          }
        }
        console.log(`✅ Recordatorios: ${success} restaurados, ${failed} fallidos`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.attendances && backupData.data.attendances?.length > 0) {
        setProcessingStep(`Restaurando asistencias (${backupData.data.attendances.length})...`);
        let success = 0;
        let failed = 0;
        for (const attendance of backupData.data.attendances) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = attendance;
            await base44.entities.Attendance.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando asistencia:", err);
            failed++;
          }
        }
        console.log(`✅ Asistencias: ${success} restauradas, ${failed} fallidas`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.evaluations && backupData.data.evaluations?.length > 0) {
        setProcessingStep(`Restaurando evaluaciones (${backupData.data.evaluations.length})...`);
        let success = 0;
        let failed = 0;
        for (const evaluation of backupData.data.evaluations) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = evaluation;
            await base44.entities.PlayerEvaluation.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando evaluación:", err);
            failed++;
          }
        }
        console.log(`✅ Evaluaciones: ${success} restauradas, ${failed} fallidas`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.callups && backupData.data.callups?.length > 0) {
        setProcessingStep(`Restaurando convocatorias (${backupData.data.callups.length})...`);
        let success = 0;
        let failed = 0;
        for (const callup of backupData.data.callups) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = callup;
            await base44.entities.Convocatoria.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando convocatoria:", err);
            failed++;
          }
        }
        console.log(`✅ Convocatorias: ${success} restauradas, ${failed} fallidas`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.clothingOrders && backupData.data.clothingOrders?.length > 0) {
        setProcessingStep(`Restaurando pedidos de ropa (${backupData.data.clothingOrders.length})...`);
        let success = 0;
        let failed = 0;
        for (const order of backupData.data.clothingOrders) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = order;
            await base44.entities.ClothingOrder.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando pedido ropa:", err);
            failed++;
          }
        }
        console.log(`✅ Pedidos ropa: ${success} restaurados, ${failed} fallidos`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.lotteryOrders && backupData.data.lotteryOrders?.length > 0) {
        setProcessingStep(`Restaurando pedidos de lotería (${backupData.data.lotteryOrders.length})...`);
        let success = 0;
        let failed = 0;
        for (const order of backupData.data.lotteryOrders) {
          try {
            const { id, created_date, updated_date, created_by, ...data } = order;
            await base44.entities.LotteryOrder.create(data);
            success++;
          } catch (err) {
            console.error("Error restaurando pedido lotería:", err);
            failed++;
          }
        }
        console.log(`✅ Pedidos lotería: ${success} restaurados, ${failed} fallidos`);
        totalSuccess += success;
        totalFailed += failed;
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      queryClient.invalidateQueries();
      
      if (totalFailed > 0) {
        toast.warning(`Restauración completada: ${totalSuccess} registros restaurados, ${totalFailed} fallidos. Revisa la consola para detalles.`, { duration: 8000 });
      } else {
        toast.success(`✅ Backup restaurado: ${totalSuccess} registros recuperados correctamente`);
      }
      
      setBackupData(null);
    } catch (error) {
      console.error("Error crítico restaurando backup:", error);
      toast.error(`Error al restaurar el backup: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
      setProcessingProgress(0);
    }
  };

  // Función para iniciar el reset de temporada
  const initiateSeasonReset = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    
    setResetConfig(prev => ({
      ...prev,
      newSeasonName: `${currentYear}-${nextYear}`
    }));
    
    setShowConfigDialog(true);
  };

  const proceedToPreview = () => {
    setShowConfigDialog(false);
    setShowPreviewDialog(true);
  };

  const proceedToSecurity = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setExpectedCode(code);
    setSecurityCode("");
    setShowPreviewDialog(false);
    setShowSecurityDialog(true);
  };

  const executeSeasonReset = async () => {
    if (securityCode !== expectedCode) {
      toast.error("Código de seguridad incorrecto");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setShowSecurityDialog(false);

    try {
      const totalSteps = 8;
      let currentStep = 0;

      // 1. Archivar TODOS los datos financieros y resetear a CERO
      if (resetConfig.archivePayments) {
        setProcessingStep("Archivando pagos y reseteando datos financieros...");
        
        // Archivar pagos
        for (const payment of payments) {
          const { id, created_date, updated_date, ...data } = payment;
          await base44.entities.PaymentHistory.create({
            ...data,
            archivado_fecha: new Date().toISOString()
          });
          await base44.entities.Payment.delete(payment.id);
        }
        
        // Resetear patrocinadores (marcarlos como "Pendiente" con monto en 0 hasta que paguen)
        const allSponsors = await base44.entities.Sponsor.list();
        for (const sponsor of allSponsors.filter(s => s.estado === "Activo")) {
          await base44.entities.Sponsor.update(sponsor.id, {
            estado: "Pendiente",
            monto: 0, // CLAVE: resetear monto a 0 hasta que paguen
            temporada_anterior: activeSeason?.temporada || "",
            temporada: resetConfig.newSeasonName,
            notas: `${sponsor.notas || ''}\n[Renovación pendiente para temporada ${resetConfig.newSeasonName} - Monto resetado a 0€]`.trim()
          });
        }
        
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 2. Eliminar recordatorios
      if (resetConfig.deleteReminders) {
        setProcessingStep("Eliminando recordatorios...");
        for (const reminder of reminders) {
          await base44.entities.Reminder.delete(reminder.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 3. Resetear estado de jugadores - MARCARLOS COMO INACTIVOS HASTA QUE SE RENUEVEN
      if (resetConfig.resetPlayerStatus) {
        setProcessingStep("Desactivando jugadores de temporada anterior...");
        for (const player of players.filter(p => p.activo)) {
          const updateData = {
            activo: false, // CLAVE: desactivar para que no aparezcan en paneles
            estado_renovacion: "pendiente",
            temporada_renovacion: resetConfig.newSeasonName,
            temporada_anterior: activeSeason?.temporada || ""
          };
          
          // Opcionalmente resetear firmas de federación
          if (resetConfig.resetPlayerSignatures) {
            updateData.enlace_firma_jugador = "";
            updateData.enlace_firma_tutor = "";
            updateData.firma_jugador_completada = false;
            updateData.firma_tutor_completada = false;
          }
          
          await base44.entities.Player.update(player.id, updateData);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 4. Eliminar convocatorias
      if (resetConfig.deleteCallups || resetConfig.deleteConvocatorias) {
        setProcessingStep("Eliminando convocatorias...");
        for (const callup of convocatorias) {
          await base44.entities.Convocatoria.delete(callup.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 5. Eliminar lotería
      if (resetConfig.deleteLotteryOrders) {
        setProcessingStep("Eliminando pedidos de lotería...");
        for (const order of lotteryOrders) {
          await base44.entities.LotteryOrder.delete(order.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 6. Eliminar asistencias
      if (resetConfig.deleteAttendances) {
        setProcessingStep("Eliminando registros de asistencia...");
        for (const attendance of attendances) {
          await base44.entities.Attendance.delete(attendance.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 7. Eliminar evaluaciones
      if (resetConfig.deleteEvaluations) {
        setProcessingStep("Eliminando evaluaciones de jugadores...");
        for (const evaluation of evaluations) {
          await base44.entities.PlayerEvaluation.delete(evaluation.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 8. Eliminar horarios de entrenamiento
      if (resetConfig.deleteTrainingSchedules) {
        setProcessingStep("Eliminando horarios de entrenamiento...");
        for (const schedule of trainingSchedules) {
          await base44.entities.TrainingSchedule.delete(schedule.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 9. Eliminar galería de fotos
      if (resetConfig.deletePhotoGallery) {
        setProcessingStep("Eliminando álbumes de fotos...");
        for (const album of photoGallery) {
          await base44.entities.PhotoGallery.delete(album.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 10. Eliminar eventos
      if (resetConfig.deleteEvents) {
        setProcessingStep("Eliminando eventos del calendario...");
        for (const event of events) {
          await base44.entities.Event.delete(event.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 11. Eliminar anuncios
      if (resetConfig.deleteAnnouncements) {
        setProcessingStep("Eliminando anuncios...");
        for (const announcement of announcements) {
          await base44.entities.Announcement.delete(announcement.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 12. Eliminar mensajes de chat
      if (resetConfig.deleteChatMessages) {
        setProcessingStep("Eliminando mensajes de chat...");
        for (const message of chatMessages) {
          await base44.entities.ChatMessage.delete(message.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 12.1 Eliminar conversaciones y mensajes de coordinador y entrenador
      if (resetConfig.deletePrivateConversations) {
        setProcessingStep("Eliminando conversaciones de coordinador y entrenador...");
        const coordinatorConvs = await base44.entities.CoordinatorConversation.list();
        for (const conv of coordinatorConvs) {
          await base44.entities.CoordinatorConversation.delete(conv.id);
        }
        const coordinatorMsgs = await base44.entities.CoordinatorMessage.list();
        for (const msg of coordinatorMsgs) {
          await base44.entities.CoordinatorMessage.delete(msg.id);
        }
        
        // Eliminar StaffConversation y StaffMessage
        try {
          const staffConvs = await base44.entities.StaffConversation.list();
          for (const conv of staffConvs) { await base44.entities.StaffConversation.delete(conv.id); }
          const staffMsgs = await base44.entities.StaffMessage.list();
          for (const msg of staffMsgs) { await base44.entities.StaffMessage.delete(msg.id); }
        } catch (e) { console.log('⚠️ StaffConversation/Message skip:', e.message); }

        // Eliminar AdminConversation y AdminMessage
        try {
          const adminConvs = await base44.entities.AdminConversation.list();
          for (const conv of adminConvs) { await base44.entities.AdminConversation.delete(conv.id); }
          const adminMsgs = await base44.entities.AdminMessage.list();
          for (const msg of adminMsgs) { await base44.entities.AdminMessage.delete(msg.id); }
        } catch (e) { console.log('⚠️ AdminConversation/Message skip:', e.message); }

        // Eliminar PrivateConversation y PrivateMessage
        for (const conv of privateConversations) {
          await base44.entities.PrivateConversation.delete(conv.id);
        }
        for (const msg of privateMessages) {
          await base44.entities.PrivateMessage.delete(msg.id);
        }
      }

      // 12.2 Eliminar AppNotifications
      if (resetConfig.deleteAppNotifications) {
        setProcessingStep("Eliminando notificaciones de la app...");
        for (const notif of appNotifications) {
          await base44.entities.AppNotification.delete(notif.id);
        }
      }

      // 12.3 Eliminar Certificados (OPCIONAL - solo si el admin quiere)
      if (resetConfig.deleteCertificates) {
        setProcessingStep("Eliminando certificados y carnets...");
        for (const cert of certificates) {
          await base44.entities.Certificate.delete(cert.id);
        }
      }

      // 12.4 Eliminar entidades adicionales de temporada
      setProcessingStep("Eliminando datos adicionales de temporada...");
      const safeDeleteAll = async (entityName) => {
        try {
          const items = await base44.entities[entityName].list();
          for (const item of items) { await base44.entities[entityName].delete(item.id); }
          return items.length;
        } catch (e) { console.log(`⚠️ ${entityName} skip:`, e.message); return 0; }
      };
      // AutomaticReminder (recordatorios automáticos)
      await safeDeleteAll('AutomaticReminder');
      // CustomPaymentPlan (planes especiales de pago)
      await safeDeleteAll('CustomPaymentPlan');
      // ExtraCharge y ExtraChargePayment (cobros extra)
      await safeDeleteAll('ExtraChargePayment');
      await safeDeleteAll('ExtraCharge');
      // BatchPayment (pagos por lotes)
      await safeDeleteAll('BatchPayment');
      // Voluntariado
      await safeDeleteAll('VolunteerSignup');
      await safeDeleteAll('VolunteerOpportunity');
      // Mercadillo
      await safeDeleteAll('MarketReservation');
      await safeDeleteAll('MarketListing');
      // Tareas de Junta
      await safeDeleteAll('BoardTask');
      // Feedback
      await safeDeleteAll('Feedback');
      // Competición
      await safeDeleteAll('Clasificacion');
      await safeDeleteAll('Resultado');
      await safeDeleteAll('Goleador');
      await safeDeleteAll('MatchObservation');
      await safeDeleteAll('CompetitionAsset');
      // Pizarra táctica y ejercicios
      await safeDeleteAll('TacticaPizarra');
      await safeDeleteAll('Exercise');
      // Logs de chat
      await safeDeleteAll('CommunicationLog');
      await safeDeleteAll('CoordinatorChatLog');
      await safeDeleteAll('CoachChatLog');
      await safeDeleteAll('ChatbotLog');
      // ReferralReward y ReferralHistory
      await safeDeleteAll('ReferralReward');
      await safeDeleteAll('ReferralHistory');
      // FemeninoInterest
      await safeDeleteAll('FemeninoInterest');
      // StripePaymentLog
      await safeDeleteAll('StripePaymentLog');
      // PushNotification / PushSubscription se mantienen (son de dispositivo, no de temporada)

      // 13. Eliminar encuestas y respuestas
      if (resetConfig.deleteSurveys) {
        setProcessingStep("Eliminando encuestas...");
        for (const response of surveyResponses) {
          await base44.entities.SurveyResponse.delete(response.id);
        }
        for (const survey of surveys) {
          await base44.entities.Survey.delete(survey.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 14. Eliminar resultados de partidos
      if (resetConfig.deleteMatchResults) {
        setProcessingStep("Eliminando resultados de partidos...");
        for (const result of matchResults) {
          await base44.entities.MatchResult.delete(result.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 15. Eliminar documentos (opcional - normalmente no se borran)
      if (resetConfig.deleteDocuments) {
        setProcessingStep("Eliminando documentos...");
        for (const doc of documents) {
          await base44.entities.Document.delete(doc.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 16. Eliminar mensajes privados - SKIP: ya eliminados en paso 12.1 (deletePrivateConversations)
      // No duplicar borrado de PrivateMessage
      currentStep++;
      setProcessingProgress((currentStep / totalSteps) * 100);

      // 17. Eliminar pedidos de ropa
      if (resetConfig.deleteClothingOrders) {
        setProcessingStep("Eliminando pedidos de ropa...");
        for (const order of clothingOrders) {
          await base44.entities.ClothingOrder.delete(order.id);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 18. Desactivar socios de temporada anterior (NO se eliminan, se desactivan)
      if (resetConfig.resetClubMembers) {
        setProcessingStep("Desactivando socios de temporada anterior...");
        for (const member of clubMembers.filter(m => m.activo !== false)) {
          await base44.entities.ClubMember.update(member.id, {
            activo: false,
            temporada_anterior: activeSeason?.temporada || ""
          });
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 19. RESETEAR CONTADORES DE REFERIDOS Y SORTEOS (manteniendo créditos de ropa)
      if (resetConfig.resetUserReferrals) {
        setProcessingStep("Reseteando contadores de referidos y sorteos...");
        const allUsers = await base44.entities.User.list();
        for (const user of allUsers) {
          if (user.referrals_count > 0 || user.referidos_list?.length > 0 || user.raffle_entries_total > 0) {
            await base44.entities.User.update(user.id, {
              referrals_count: 0, // Resetear contador de referidos
              referidos_list: [], // Vaciar lista de referidos
              raffle_entries_total: 0, // RESETEAR participaciones en sorteos
              // MANTENER clothing_credit_balance (NO se resetea - persiste entre temporadas)
            });
          }
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 6. Desactivar temporada actual
      setProcessingStep("Configurando nueva temporada...");
      if (activeSeason) {
        await base44.entities.SeasonConfig.update(activeSeason.id, { activa: false });
      }
      currentStep++;
      setProcessingProgress((currentStep / totalSteps) * 100);

      // 7. Crear nueva temporada
      await base44.entities.SeasonConfig.create({
        temporada: resetConfig.newSeasonName,
        activa: true,
        cuota_unica: resetConfig.cuotaUnica,
        cuota_tres_meses: resetConfig.cuotaTresMeses,
        fecha_inicio: new Date().toISOString().split('T')[0],
        permitir_renovaciones: true,
        tienda_ropa_abierta: false,
        loteria_navidad_abierta: false,
        bizum_activo: activeSeason?.bizum_activo || false,
        bizum_telefono: activeSeason?.bizum_telefono || "",
        mostrar_patrocinadores: activeSeason?.mostrar_patrocinadores || false,
        notificaciones_admin_email: activeSeason?.notificaciones_admin_email || true,
        programa_referidos_activo: activeSeason?.programa_referidos_activo || false
      });
      currentStep++;
      setProcessingProgress((currentStep / totalSteps) * 100);

      // 7.1 IMPORTANTE: Crear CategoryConfig para la nueva temporada copiando con precios actuales
      setProcessingStep("Preparando las 9 categorías BASE para nueva temporada...");
      const BASE_CATEGORIES = [
        "Fútbol Pre-Benjamín (Mixto)",
        "Fútbol Benjamín (Mixto)",
        "Fútbol Alevín (Mixto)",
        "Fútbol Infantil (Mixto)",
        "Fútbol Cadete",
        "Fútbol Juvenil",
        "Fútbol Aficionado",
        "Fútbol Femenino",
        "Baloncesto (Mixto)"
      ];
      
      const allExistingCategories = await base44.entities.CategoryConfig.list();
      const newSeasonCategories = allExistingCategories.filter(c => c.temporada === resetConfig.newSeasonName);
      
      // Si la nueva temporada YA tiene categorías, solo verificar que estén las 9 BASE
      if (newSeasonCategories.length > 0) {
        for (const baseName of BASE_CATEGORIES) {
          const exists = newSeasonCategories.some(c => c.nombre === baseName);
          if (!exists) {
            const sourceCategory = allExistingCategories.find(c => c.nombre === baseName && c.es_base === true);
            if (sourceCategory) {
              const { id, created_date, updated_date, ...catData } = sourceCategory;
              await base44.entities.CategoryConfig.create({
                ...catData,
                temporada: resetConfig.newSeasonName,
                activa: true
              });
              console.log(`✅ Categoría faltante añadida: ${baseName}`);
            }
          }
        }
      } else {
        // Copiar las 9 categorías BASE de la temporada actual
        for (const baseName of BASE_CATEGORIES) {
          const sourceCategory = allExistingCategories.find(c => c.nombre === baseName && c.es_base === true);
          if (sourceCategory) {
            const { id, created_date, updated_date, ...catData } = sourceCategory;
            await base44.entities.CategoryConfig.create({
              ...catData,
              temporada: resetConfig.newSeasonName,
              es_base: true,
              activa: true
            });
          } else {
            // Fallback: crear con precios por defecto si no existe
            const DEFAULT_QUOTAS = {
              "Fútbol Pre-Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75 },
              "Fútbol Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75 },
              "Fútbol Alevín (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83 },
              "Fútbol Infantil (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83 },
              "Fútbol Cadete": { inscripcion: 135, segunda: 100, tercera: 95 },
              "Fútbol Juvenil": { inscripcion: 135, segunda: 100, tercera: 95 },
              "Fútbol Aficionado": { inscripcion: 165, segunda: 100, tercera: 95 },
              "Fútbol Femenino": { inscripcion: 135, segunda: 100, tercera: 95 },
              "Baloncesto (Mixto)": { inscripcion: 50, segunda: 50, tercera: 50 }
            };
            const cuotas = DEFAULT_QUOTAS[baseName];
            await base44.entities.CategoryConfig.create({
              nombre: baseName,
              deporte: baseName.includes("Baloncesto") ? "Baloncesto" : "Fútbol",
              cuota_inscripcion: cuotas.inscripcion,
              cuota_segunda: cuotas.segunda,
              cuota_tercera: cuotas.tercera,
              cuota_total: cuotas.inscripcion + cuotas.segunda + cuotas.tercera,
              temporada: resetConfig.newSeasonName,
              es_base: true,
              activa: true
            });
          }
        }
        console.log('✅ 9 categorías BASE creadas para nueva temporada con sus precios actuales');
      }

      // 8. Registrar en historial
      await base44.entities.ResetHistory.create({
        fecha_reset: new Date().toISOString(),
        temporada_anterior: activeSeason?.temporada || "Desconocida",
        temporada_nueva: resetConfig.newSeasonName,
        realizado_por: user?.email,
        acciones: JSON.stringify(resetConfig),
        pagos_archivados: payments.length,
        recordatorios_eliminados: reminders.length,
        jugadores_actualizados: players.filter(p => p.activo).length
      });
      currentStep++;
      setProcessingProgress(100);

      // Notificar
      if (resetConfig.notifyParents) {
        setProcessingStep("Enviando notificaciones...");
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: "cdbustarviejo@gmail.com",
            subject: `🔄 Nueva Temporada ${resetConfig.newSeasonName} Iniciada`,
            body: `
              <h2>Reset de Temporada Completado</h2>
              <p>La temporada ${resetConfig.newSeasonName} ha sido iniciada correctamente.</p>
              <ul>
                <li>Pagos archivados: ${payments.length}</li>
                <li>Recordatorios eliminados: ${reminders.length}</li>
                <li>Jugadores actualizados: ${players.filter(p => p.activo).length}</li>
              </ul>
              <p>Realizado por: ${user?.email}</p>
            `
          });
        } catch (e) {
          console.error("Error sending notification:", e);
        }
      }

      queryClient.invalidateQueries();
      toast.success(`¡Temporada ${resetConfig.newSeasonName} iniciada correctamente!`);

    } catch (error) {
      console.error("Error in season reset:", error);
      toast.error("Error durante el reset de temporada");
      // Registrar intento de reset aunque falle, para trazabilidad
      try {
        await base44.entities.ResetHistory.create({
          fecha_reset: new Date().toISOString(),
          temporada_anterior: activeSeason?.temporada || "Desconocida",
          temporada_nueva: resetConfig?.newSeasonName || "",
          realizado_por: user?.email,
          acciones: JSON.stringify({ ...resetConfig, error: String(error?.message || error) }),
          pagos_archivados: payments?.length || 0,
          recordatorios_eliminados: reminders?.length || 0,
          jugadores_actualizados: players?.filter?.(p => p.activo)?.length || 0
        });
      } catch (e) {
        console.error('No se pudo registrar ResetHistory tras error:', e);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
      setProcessingProgress(0);
    }
  };

  // Queries adicionales para estadísticas
  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances', expandedSections.reset],
    queryFn: () => base44.entities.Attendance.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ['evaluations', expandedSections.reset],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: trainingSchedules = [] } = useQuery({
    queryKey: ['trainingSchedules', expandedSections.reset],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: photoGallery = [] } = useQuery({
    queryKey: ['photoGallery', expandedSections.reset],
    queryFn: () => base44.entities.PhotoGallery.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events', expandedSections.reset],
    queryFn: () => base44.entities.Event.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements', expandedSections.reset],
    queryFn: () => base44.entities.Announcement.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chatMessages', expandedSections.reset],
    queryFn: () => base44.entities.ChatMessage.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: surveys = [] } = useQuery({
    queryKey: ['surveys', expandedSections.reset],
    queryFn: () => base44.entities.Survey.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: surveyResponses = [] } = useQuery({
    queryKey: ['surveyResponses', expandedSections.reset],
    queryFn: () => base44.entities.SurveyResponse.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: matchResults = [] } = useQuery({
    queryKey: ['matchResults', expandedSections.reset],
    queryFn: () => base44.entities.MatchResult.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', expandedSections.reset],
    queryFn: () => base44.entities.Document.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: privateMessages = [] } = useQuery({
    queryKey: ['privateMessages', expandedSections.reset],
    queryFn: () => base44.entities.PrivateMessage.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: convocatorias = [] } = useQuery({
    queryKey: ['convocatorias', expandedSections.reset],
    queryFn: () => base44.entities.Convocatoria.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: clubMembers = [] } = useQuery({
    queryKey: ['clubMembers', expandedSections.reset],
    queryFn: () => base44.entities.ClubMember.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: appNotifications = [] } = useQuery({
    queryKey: ['appNotifications', expandedSections.reset],
    queryFn: () => base44.entities.AppNotification.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', expandedSections.reset],
    queryFn: () => base44.entities.Certificate.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversations', expandedSections.reset],
    queryFn: () => base44.entities.PrivateConversation.list(),
    enabled: expandedSections.reset,
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Estadísticas actuales
  const currentStats = {
    payments: payments.length,
    pendingPayments: payments.filter(p => p.estado === "Pendiente").length,
    players: players.filter(p => p.activo).length,
    reminders: reminders.length,
    clothingOrders: clothingOrders.length,
    lotteryOrders: lotteryOrders.length,
    attendances: attendances.length,
    evaluations: evaluations.length,
    trainingSchedules: trainingSchedules.length,
    photoGallery: photoGallery.length,
    events: events.length,
    announcements: announcements.length,
    chatMessages: chatMessages.length,
    surveys: surveys.length,
    surveyResponses: surveyResponses.length,
    matchResults: matchResults.length,
    documents: documents.length,
    privateMessages: privateMessages.length,
    convocatorias: convocatorias.length,
    clubMembers: clubMembers.filter(m => m.activo !== false).length,
    appNotifications: appNotifications.length,
    certificates: certificates.length,
    privateConversations: privateConversations.length
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            No tienes permisos para acceder a esta sección.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">⚙️ Gestión de Temporadas y Categorías</h1>
          <p className="text-slate-600 mt-1">Configuración de temporadas y características del club</p>
        </div>
      </div>

      {/* Aviso si no hay temporada activa */}
      {!activeSeason && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="py-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-900">No hay temporada activa</p>
              <p className="text-sm text-amber-800">Crea una temporada activa para poder activar renovaciones y configurar cuotas.</p>
            </div>
            <Button onClick={createActiveSeasonQuickly} className="bg-amber-600 hover:bg-amber-700">
              Crear temporada activa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Temporada Activa */}
      {activeSeason && (
        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-green-900">
                    Temporada {activeSeason.temporada}
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Temporada activa actualmente
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-600 text-white text-sm px-3 py-1">
                <CheckCircle2 className="w-4 h-4 mr-1" /> Activa
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Acceso a Gestión de Categorías y Cuotas */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 shadow-sm border-2 border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Euro className="w-8 h-8 text-orange-600" />
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">💰 Cuotas por Categoría</h3>
                    <p className="text-sm text-slate-600">Edita los 9 precios de cuotas, o añade categorías extras si necesitas</p>
                  </div>
                </div>
                <Link to={createPageUrl("CategoryConfigAdmin")}>
                  <Button className="bg-orange-600 hover:bg-orange-700">
                    <Edit className="w-4 h-4 mr-2" />
                    Gestionar Cuotas
                  </Button>
                </Link>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-3 shadow-sm border">
                <p className="text-xs text-slate-600">Jugadores Activos</p>
                <p className="text-lg font-bold text-blue-700">{currentStats.players}</p>
              </div>
              <div className="bg-white rounded-lg p-3 shadow-sm border">
                <p className="text-xs text-slate-600">Pagos Registrados</p>
                <p className="text-lg font-bold text-orange-700">{currentStats.payments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sección: Control de Características */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('features')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-orange-600" />
              <CardTitle className="text-lg">Control de Características</CardTitle>
            </div>
            {expandedSections.features ? <ChevronUp /> : <ChevronDown />}
          </div>
        </CardHeader>
        {expandedSections.features && (
          <CardContent className="space-y-4">
            {/* Renovaciones */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium">Permitir Renovaciones</p>
                  <p className="text-xs text-slate-600">Los padres pueden renovar jugadores de temporadas anteriores</p>
                  <p className="text-xs text-blue-600 font-medium mt-1">⚠️ Activar DESPUÉS de resetear la temporada</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.permitir_renovaciones || false}
                onCheckedChange={(checked) => toggleFeature('permitir_renovaciones', checked)}
              />
            </div>

            {/* Bizum */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-medium">Bizum Activo</p>
                  <p className="text-xs text-slate-600">Permitir pagos con Bizum</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.bizum_activo || false}
                onCheckedChange={(checked) => toggleFeature('bizum_activo', checked)}
              />
            </div>

            {activeSeason?.bizum_activo && (
              <div className="ml-8 flex items-center gap-2">
                <Label className="text-sm">Teléfono Bizum:</Label>
                <Input
                  value={activeSeason?.bizum_telefono || ""}
                  onChange={(e) => {
                    if (activeSeason) {
                      updateSeasonMutation.mutate({
                        id: activeSeason.id,
                        data: { bizum_telefono: e.target.value }
                      });
                    }
                  }}
                  placeholder="Ej: 612345678"
                  className="w-40"
                />
              </div>
            )}

            {/* Tienda de Ropa */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="font-medium">Tienda de Ropa</p>
                  <p className="text-xs text-slate-600">Permitir pedidos de equipación</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.tienda_ropa_abierta || false}
                onCheckedChange={(checked) => toggleFeature('tienda_ropa_abierta', checked)}
              />
            </div>

            {/* Config URLs Tienda */}
            <div className="ml-8 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm">URL Tienda Equipación:</Label>
                <Input
                  value={activeSeason?.tienda_ropa_url || ""}
                  onChange={(e) => {
                    if (activeSeason) {
                      updateSeasonMutation.mutate({ id: activeSeason.id, data: { tienda_ropa_url: e.target.value } });
                    }
                  }}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">URL Merchandising:</Label>
                <Input
                  value={activeSeason?.tienda_merch_url || ""}
                  onChange={(e) => {
                    if (activeSeason) {
                      updateSeasonMutation.mutate({ id: activeSeason.id, data: { tienda_merch_url: e.target.value } });
                    }
                  }}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Lotería */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Clover className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Lotería de Navidad</p>
                  <p className="text-xs text-slate-600">Permitir pedidos de lotería</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.loteria_navidad_abierta || false}
                onCheckedChange={(checked) => toggleFeature('loteria_navidad_abierta', checked)}
              />
            </div>

            {/* Lotería Pago Adelantado - Solo visible si lotería está activa */}
            {activeSeason?.loteria_navidad_abierta && (
              <div className="ml-8 flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium">Lotería: Requiere Pago Adelantado</p>
                    <p className="text-xs text-slate-600">
                      {activeSeason?.loteria_requiere_pago_adelantado 
                        ? "Los padres deben pagar por transferencia/Bizum y subir justificante"
                        : "Los padres pagan al entrenador cuando reciben los décimos"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={activeSeason?.loteria_requiere_pago_adelantado || false}
                  onCheckedChange={(checked) => toggleFeature('loteria_requiere_pago_adelantado', checked)}
                />
              </div>
            )}

            {/* Precio décimo lotería - Solo visible si lotería está activa */}
            {activeSeason?.loteria_navidad_abierta && (
              <div className="ml-8 space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Precio del décimo (€):</Label>
                  <Input
                    type="number"
                    value={activeSeason?.precio_decimo_loteria || 22}
                    onChange={(e) => {
                      if (activeSeason) {
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { precio_decimo_loteria: Number(e.target.value) }
                        });
                      }
                    }}
                    placeholder="22"
                    className="w-24"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Décimos disponibles para vender:</Label>
                  <Input
                    type="number"
                    min="0"
                    value={activeSeason?.loteria_max_decimos ?? ""}
                    onChange={(e) => {
                      if (activeSeason) {
                        const value = e.target.value;
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { loteria_max_decimos: value === "" ? null : parseInt(value, 10) }
                        });
                      }
                    }}
                    onBlur={(e) => {
                      // Si está vacío al perder foco, establecer null
                      if (activeSeason && e.target.value === "") {
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { loteria_max_decimos: null }
                        });
                      }
                    }}
                    placeholder="Sin límite"
                    className="w-32"
                  />
                  <Info className="w-4 h-4 text-slate-400" title="La tienda se cerrará automáticamente al vender todos" />
                </div>
                <p className="text-xs text-slate-500 ml-2">
                  💡 La lotería se cerrará automáticamente cuando se alcance este límite. Deja vacío para sin límite.
                </p>
              </div>
            )}

            {/* Plan Mensual */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-medium">Plan Mensual (Domiciliación Tarjeta)</p>
                  <p className="text-xs text-slate-600">Permite pago inicial + mensualidades automáticas por tarjeta</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.permitir_plan_mensual || false}
                onCheckedChange={(checked) => toggleFeature('permitir_plan_mensual', checked)}
              />
            </div>

            {activeSeason?.permitir_plan_mensual && (
              <div className="ml-8 space-y-3 bg-emerald-50 rounded-xl p-4 border-2 border-emerald-200">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">💰 % Pago Inicial (Junio):</Label>
                  <Input
                    type="number"
                    min={10}
                    max={90}
                    value={activeSeason?.plan_mensual_porcentaje_inicial || 60}
                    onChange={(e) => {
                      if (activeSeason) {
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { plan_mensual_porcentaje_inicial: Number(e.target.value) }
                        });
                      }
                    }}
                    className="w-20"
                  />
                  <span className="text-sm text-slate-600">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">📅 Último mes de cobro:</Label>
                  <select
                    value={activeSeason?.plan_mensual_mes_fin || "Mayo"}
                    onChange={(e) => {
                      if (activeSeason) {
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { plan_mensual_mes_fin: e.target.value }
                        });
                      }
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="Enero">Enero</option>
                    <option value="Febrero">Febrero</option>
                    <option value="Marzo">Marzo</option>
                    <option value="Abril">Abril</option>
                    <option value="Mayo">Mayo</option>
                    <option value="Junio">Junio</option>
                  </select>
                </div>
                <p className="text-xs text-emerald-700">
                  💡 El padre paga el {activeSeason?.plan_mensual_porcentaje_inicial || 60}% en Junio. El resto se divide en mensualidades automáticas (Sept → {activeSeason?.plan_mensual_mes_fin || "Mayo"}) cobradas por tarjeta vía Stripe.
                </p>
              </div>
            )}

            {/* Patrocinadores */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Image className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="font-medium">Banner Patrocinadores</p>
                  <p className="text-xs text-slate-600">Mostrar patrocinadores en la app</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.mostrar_patrocinadores || false}
                onCheckedChange={(checked) => toggleFeature('mostrar_patrocinadores', checked)}
              />
            </div>

            {/* Notificaciones Email */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-medium">Notificaciones por Email</p>
                  <p className="text-xs text-slate-600">Enviar emails automáticos al admin</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.notificaciones_admin_email || false}
                onCheckedChange={(checked) => toggleFeature('notificaciones_admin_email', checked)}
              />
            </div>

            {/* Programa de Socios */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium">Programa de Socios</p>
                  <p className="text-xs text-slate-600">Carnets digitales con descuentos en comercios</p>
                </div>
              </div>
              <Switch
                checked={activeSeason?.programa_socios_activo || false}
                onCheckedChange={(checked) => toggleFeature('programa_socios_activo', checked)}
              />
            </div>

            {/* Configuración del Programa de Socios */}
            {activeSeason?.programa_socios_activo && (
              <div className="ml-8 space-y-4 bg-green-50 rounded-xl p-4 border-2 border-green-200">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">💰 Precio anual socio (€):</Label>
                  <Input
                    type="number"
                    value={activeSeason?.precio_socio || 25}
                    onChange={(e) => {
                      if (activeSeason) {
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { precio_socio: Number(e.target.value) }
                        });
                      }
                    }}
                    className="w-24"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">⏰ Días de gracia:</Label>
                  <Input
                    type="number"
                    value={activeSeason?.dias_gracia_carnet || 15}
                    onChange={(e) => {
                      if (activeSeason) {
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { dias_gracia_carnet: Number(e.target.value) }
                        });
                      }
                    }}
                    className="w-24"
                  />
                  <Info className="w-4 h-4 text-slate-400" title="Días después de fecha límite antes de carnet rojo" />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-bold text-green-900">🏪 Comercios con Descuentos</Label>
                    <Button
                      size="sm"
                      onClick={() => {
                        const newCommerce = {
                          nombre: "",
                          descuento: "",
                          direccion: "",
                          telefono: "",
                          categoria: "Restaurantes"
                        };
                        const updated = [...(activeSeason?.comercios_descuento || []), newCommerce];
                        updateSeasonMutation.mutate({
                          id: activeSeason.id,
                          data: { comercios_descuento: updated }
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      + Añadir Comercio
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {(activeSeason?.comercios_descuento || []).map((comercio, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border shadow-sm space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Nombre comercio"
                            value={comercio.nombre}
                            onChange={(e) => {
                              const updated = [...activeSeason.comercios_descuento];
                              updated[index].nombre = e.target.value;
                              updateSeasonMutation.mutate({
                                id: activeSeason.id,
                                data: { comercios_descuento: updated }
                              });
                            }}
                            className="flex-1"
                          />
                          <Input
                            placeholder="10%"
                            value={comercio.descuento}
                            onChange={(e) => {
                              const updated = [...activeSeason.comercios_descuento];
                              updated[index].descuento = e.target.value;
                              updateSeasonMutation.mutate({
                                id: activeSeason.id,
                                data: { comercios_descuento: updated }
                              });
                            }}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const updated = activeSeason.comercios_descuento.filter((_, i) => i !== index);
                              updateSeasonMutation.mutate({
                                id: activeSeason.id,
                                data: { comercios_descuento: updated }
                              });
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <select
                          value={comercio.categoria || "Restaurantes"}
                          onChange={(e) => {
                            const updated = [...activeSeason.comercios_descuento];
                            updated[index].categoria = e.target.value;
                            updateSeasonMutation.mutate({
                              id: activeSeason.id,
                              data: { comercios_descuento: updated }
                            });
                          }}
                          className="w-full text-sm border rounded px-2 py-1"
                        >
                          <option value="Restaurantes">Restaurantes</option>
                          <option value="Tiendas">Tiendas</option>
                          <option value="Servicios">Servicios</option>
                          <option value="Ocio">Ocio</option>
                          <option value="Salud">Salud</option>
                          <option value="Otro">Otro</option>
                        </select>
                        <Input
                          placeholder="Dirección (opcional)"
                          value={comercio.direccion || ""}
                          onChange={(e) => {
                            const updated = [...activeSeason.comercios_descuento];
                            updated[index].direccion = e.target.value;
                            updateSeasonMutation.mutate({
                              id: activeSeason.id,
                              data: { comercios_descuento: updated }
                            });
                          }}
                          className="text-sm"
                        />
                        <Input
                          placeholder="Teléfono (opcional)"
                          value={comercio.telefono || ""}
                          onChange={(e) => {
                            const updated = [...activeSeason.comercios_descuento];
                            updated[index].telefono = e.target.value;
                            updateSeasonMutation.mutate({
                              id: activeSeason.id,
                              data: { comercios_descuento: updated }
                            });
                          }}
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  {(activeSeason?.comercios_descuento || []).length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">
                      No hay comercios añadidos. Pulsa "+ Añadir Comercio"
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Sección: Limpieza de Categorías DUPLICADAS */}
      <CategoryCleanupTool />

      {/* Sección: Programa de Referidos */}
      {activeSeason && (
        <ReferralConfigCard
          seasonConfig={activeSeason}
          onUpdate={(data) => updateSeasonMutation.mutate({ id: activeSeason.id, data })}
          isUpdating={updateSeasonMutation.isPending}
        />
      )}



      {/* Sección: Backup y Restauración */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('backup')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Archive className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-lg">Backup y Restauración</CardTitle>
            </div>
            {expandedSections.backup ? <ChevronUp /> : <ChevronDown />}
          </div>
        </CardHeader>
        {expandedSections.backup && (
          <CardContent className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 ml-2">
                <strong>Recomendación:</strong> Descarga un backup completo antes de realizar cualquier cambio importante o reset de temporada.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={downloadFullBackup}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Backup Completo
              </Button>

              <div>
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Restaurar desde Backup
                </Button>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <Alert className="bg-red-50 border-red-200 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 ml-2 text-sm">
                  <strong>⚠️ Limpieza de Históricos:</strong> Elimina datos archivados de temporadas antiguas para liberar espacio.
                </AlertDescription>
              </Alert>
              <Button
                onClick={async () => {
                  if (!confirm("⚠️ ¿ELIMINAR TODOS LOS HISTÓRICOS?\n\nEsto eliminará:\n• PaymentHistory (pagos archivados)\n• PlayerHistory (jugadores archivados)\n• ResetHistory (historial de resets)\n\nEsta acción es IRREVERSIBLE. ¿Continuar?")) return;
                  
                  try {
                    setIsProcessing(true);
                    setProcessingStep("Eliminando históricos...");
                    
                    const [paymentHistory, playerHistory, resetHist] = await Promise.all([
                      base44.entities.PaymentHistory.list(),
                      base44.entities.PlayerHistory.list(),
                      base44.entities.ResetHistory.list()
                    ]);
                    
                    let deleted = 0;
                    for (const record of paymentHistory) {
                      await base44.entities.PaymentHistory.delete(record.id);
                      deleted++;
                    }
                    for (const record of playerHistory) {
                      await base44.entities.PlayerHistory.delete(record.id);
                      deleted++;
                    }
                    for (const record of resetHist) {
                      await base44.entities.ResetHistory.delete(record.id);
                      deleted++;
                    }
                    
                    queryClient.invalidateQueries();
                    toast.success(`✅ ${deleted} registros históricos eliminados`);
                  } catch (error) {
                    console.error("Error eliminando históricos:", error);
                    toast.error("Error al eliminar históricos");
                  } finally {
                    setIsProcessing(false);
                    setProcessingStep("");
                  }
                }}
                disabled={isProcessing}
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Todos los Históricos
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Sección: Reset de Temporada */}
      {isAdmin && (
        <Card className="border-2 border-red-200">
          <CardHeader 
            className="cursor-pointer hover:bg-red-50 transition-colors"
            onClick={() => toggleSection('reset')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <CardTitle className="text-lg text-red-900">Reset de Temporada</CardTitle>
              </div>
              {expandedSections.reset ? <ChevronUp /> : <ChevronDown />}
            </div>
          </CardHeader>
          {expandedSections.reset && (
            <CardContent className="space-y-4">
              <Alert className="bg-red-50 border-red-300">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-800 ml-2">
                  <strong>⚠️ Acción Irreversible:</strong> El reset de temporada archivará los pagos actuales, 
                  eliminará recordatorios y preparará el sistema para una nueva temporada. 
                  Asegúrate de descargar un backup antes de continuar.
                </AlertDescription>
              </Alert>

              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700 mb-2">Datos actuales en el sistema:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-green-600" />
                    <span>{currentStats.payments} pagos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bell className="w-3 h-3 text-yellow-600" />
                    <span>{currentStats.reminders} recordatorios</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-600" />
                    <span>{currentStats.players} jugadores</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3 text-orange-600" />
                    <span>{currentStats.clothingOrders} ropa</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clover className="w-3 h-3 text-green-600" />
                    <span>{currentStats.lotteryOrders} lotería</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-blue-600" />
                    <span>{currentStats.attendances} asistencias</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-purple-600" />
                    <span>{currentStats.evaluations} evaluaciones</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>{currentStats.trainingSchedules} horarios</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Image className="w-3 h-3 text-pink-600" />
                    <span>{currentStats.photoGallery} álbumes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-600" />
                    <span>{currentStats.events} eventos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bell className="w-3 h-3 text-pink-600" />
                    <span>{currentStats.announcements} anuncios</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-teal-600" />
                    <span>{currentStats.chatMessages} chats</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={initiateSeasonReset}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Iniciar Reset de Temporada
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Sección: Historial de Resets */}
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-slate-50 transition-colors"
          onClick={() => toggleSection('history')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-600" />
              <CardTitle className="text-lg">Historial de Temporadas</CardTitle>
            </div>
            {expandedSections.history ? <ChevronUp /> : <ChevronDown />}
          </div>
        </CardHeader>
        {expandedSections.history && (
          <CardContent className="space-y-4">
            {resetHistory.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No hay historial de resets</p>
            ) : (
              <div className="space-y-3">
                {resetHistory.map((record) => (
                  <div key={record.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{record.temporada_anterior} → {record.temporada_nueva}</Badge>
                      <span className="text-xs text-slate-500">
                        {record.fecha_reset ? format(new Date(record.fecha_reset), "d MMM yyyy", { locale: es }) : "-"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Realizado por: {record.realizado_por}
                    </p>
                    <div className="flex gap-2 mt-2 text-xs">
                      <Badge className="bg-blue-100 text-blue-700">{record.pagos_archivados || 0} pagos</Badge>
                      <Badge className="bg-yellow-100 text-yellow-700">{record.recordatorios_eliminados || 0} recordatorios</Badge>
                      <Badge className="bg-green-100 text-green-700">{record.jugadores_actualizados || 0} jugadores</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </CardContent>
        )}
      </Card>

      {/* Dialog: Editar Cuotas */}
      <Dialog open={showEditQuotasDialog} onOpenChange={setShowEditQuotasDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              💰 Editar Cuotas de la Temporada
            </DialogTitle>
            <DialogDescription>
              Modifica las cuotas para la temporada {activeSeason?.temporada}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 ml-2 text-sm">
                <strong>Nota:</strong> Los cambios en las cuotas solo afectan a los nuevos pagos. 
                Los pagos ya creados mantienen su importe original.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Cuota Única (€)</Label>
                <p className="text-xs text-slate-500 mb-2">Importe para pago único en Junio</p>
                <Input
                  type="number"
                  value={editingQuotas.cuota_unica}
                  onChange={(e) => setEditingQuotas(prev => ({ ...prev, cuota_unica: Number(e.target.value) }))}
                  className="text-xl font-bold"
                />
              </div>
              
              <div>
                <Label className="text-base font-medium">Cuota Fraccionada (€)</Label>
                <p className="text-xs text-slate-500 mb-2">Importe por cada pago (Junio, Septiembre, Diciembre)</p>
                <Input
                  type="number"
                  value={editingQuotas.cuota_tres_meses}
                  onChange={(e) => setEditingQuotas(prev => ({ ...prev, cuota_tres_meses: Number(e.target.value) }))}
                  className="text-xl font-bold"
                />
                <p className="text-sm text-blue-600 mt-2">
                  Total fraccionado: <strong>{editingQuotas.cuota_tres_meses * 3}€</strong> (3 pagos)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditQuotasDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (activeSeason) {
                  updateSeasonMutation.mutate({
                    id: activeSeason.id,
                    data: {
                      cuota_unica: editingQuotas.cuota_unica,
                      cuota_tres_meses: editingQuotas.cuota_tres_meses
                    }
                  });
                  setShowEditQuotasDialog(false);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              💾 Guardar Cuotas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configuración del Reset */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              Configurar Reset de Temporada
            </DialogTitle>
            <DialogDescription>
              Configura los parámetros para la nueva temporada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div>
              <Label>Nombre de la nueva temporada</Label>
              <Input
                value={resetConfig.newSeasonName}
                onChange={(e) => setResetConfig(prev => ({ ...prev, newSeasonName: e.target.value }))}
                placeholder="Ej: 2025-2026"
              />
            </div>

            <div className="space-y-4">
              <p className="font-medium text-sm">Selecciona qué datos eliminar:</p>

              {/* Sección: Datos Financieros */}
              <div className="bg-green-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-green-800 mb-2">💰 DATOS FINANCIEROS Y SOCIOS</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.archivePayments} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, archivePayments: c }))} />
                    <Label className="text-xs">Archivar pagos ({currentStats.payments})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteReminders} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteReminders: c }))} />
                    <Label className="text-xs">Eliminar recordatorios ({currentStats.reminders})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteClothingOrders} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteClothingOrders: c }))} />
                    <Label className="text-xs">Eliminar pedidos ropa ({currentStats.clothingOrders})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteLotteryOrders} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteLotteryOrders: c }))} />
                    <Label className="text-xs">Eliminar pedidos lotería ({currentStats.lotteryOrders})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.resetClubMembers} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, resetClubMembers: c }))} />
                    <Label className="text-xs">Desactivar socios ({currentStats.clubMembers})</Label>
                  </div>
                </div>
                <p className="text-xs text-green-700 mt-2">⚠️ Los socios se desactivan (no se eliminan) para permitir renovaciones en la nueva temporada</p>
              </div>

              {/* Sección: Datos Deportivos */}
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-blue-800 mb-2">⚽ DATOS DEPORTIVOS</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.resetPlayerStatus} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, resetPlayerStatus: c }))} />
                    <Label className="text-xs">Resetear estado jugadores ({currentStats.players})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteCallups} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteCallups: c }))} />
                    <Label className="text-xs">Eliminar convocatorias ({currentStats.convocatorias})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteAttendances} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteAttendances: c }))} />
                    <Label className="text-xs">Eliminar asistencias ({currentStats.attendances})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteEvaluations} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteEvaluations: c }))} />
                    <Label className="text-xs">Eliminar evaluaciones ({currentStats.evaluations})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteTrainingSchedules} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteTrainingSchedules: c }))} />
                    <Label className="text-xs">Eliminar horarios ({currentStats.trainingSchedules})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteMatchResults} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteMatchResults: c }))} />
                    <Label className="text-xs">Eliminar resultados partidos ({currentStats.matchResults})</Label>
                  </div>
                </div>
              </div>

              {/* Sección: Comunicaciones */}
              <div className="bg-purple-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-purple-800 mb-2">💬 COMUNICACIONES</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteChatMessages} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteChatMessages: c }))} />
                    <Label className="text-xs">Eliminar chat grupos ({currentStats.chatMessages})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deletePrivateMessages} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deletePrivateMessages: c }))} />
                    <Label className="text-xs">Eliminar chat privados ({currentStats.privateMessages})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteCoordinatorChats} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteCoordinatorChats: c, deletePrivateConversations: c }))} />
                    <Label className="text-xs">Eliminar chats coordinador/entrenador</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteAnnouncements} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteAnnouncements: c }))} />
                    <Label className="text-xs">Eliminar anuncios ({currentStats.announcements})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteSurveys} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteSurveys: c }))} />
                    <Label className="text-xs">Eliminar encuestas ({currentStats.surveys})</Label>
                  </div>
                </div>
              </div>

              {/* Sección: Contenido */}
              <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-bold text-orange-800 mb-2">📅 CONTENIDO Y EVENTOS</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteEvents} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteEvents: c }))} />
                    <Label className="text-xs">Eliminar eventos ({currentStats.events})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deletePhotoGallery} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deletePhotoGallery: c }))} />
                    <Label className="text-xs">Eliminar galería fotos ({currentStats.photoGallery})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteAppNotifications} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteAppNotifications: c }))} />
                    <Label className="text-xs">Eliminar notificaciones app ({currentStats.appNotifications})</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={resetConfig.deleteCertificates} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, deleteCertificates: c }))} />
                    <Label className="text-xs text-slate-500">Eliminar carnets/certificados ({currentStats.certificates})</Label>
                  </div>
                </div>
                <Alert className="bg-red-50 border-red-200 mt-2">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <AlertDescription className="text-red-700 ml-2 text-xs">
                    <strong>⚠️ NO SE TOCAN:</strong> Documentos del club, fichas médicas, históricos archivados (estos datos son críticos)
                  </AlertDescription>
                </Alert>
              </div>

              {/* Notificación */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Checkbox checked={resetConfig.notifyParents} onCheckedChange={(c) => setResetConfig(prev => ({ ...prev, notifyParents: c }))} />
                <Label className="text-sm font-medium">📧 Notificar al administrador por email</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={proceedToPreview} className="bg-orange-600 hover:bg-orange-700">
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vista Previa */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Vista Previa del Reset
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium text-blue-900 mb-2">Nueva temporada: {resetConfig.newSeasonName}</p>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Cuota única: {resetConfig.cuotaUnica}€</p>
                <p>• Cuota fraccionada: {resetConfig.cuotaTresMeses}€ x 3</p>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              <p className="font-medium text-orange-900 mb-2">Acciones que se realizarán:</p>
              <ul className="text-sm text-orange-700 space-y-1">
                {resetConfig.archivePayments && <li>✓ Archivar {currentStats.payments} pagos</li>}
                {resetConfig.deleteReminders && <li>✓ Eliminar {currentStats.reminders} recordatorios</li>}
                {resetConfig.resetPlayerStatus && <li>✓ Desactivar {currentStats.players} jugadores</li>}
                {resetConfig.resetClubMembers && <li>✓ Desactivar {currentStats.clubMembers} socios</li>}
                {resetConfig.deleteCallups && <li>✓ Eliminar {currentStats.convocatorias} convocatorias</li>}
                {resetConfig.deleteLotteryOrders && <li>✓ Eliminar {currentStats.lotteryOrders} pedidos lotería</li>}
                {resetConfig.deleteClothingOrders && <li>✓ Eliminar {currentStats.clothingOrders} pedidos ropa</li>}
                {resetConfig.deleteAttendances && <li>✓ Eliminar {currentStats.attendances} asistencias</li>}
                {resetConfig.deleteEvaluations && <li>✓ Eliminar {currentStats.evaluations} evaluaciones</li>}
                {resetConfig.deleteTrainingSchedules && <li>✓ Eliminar {currentStats.trainingSchedules} horarios</li>}
                {resetConfig.deletePhotoGallery && <li>✓ Eliminar {currentStats.photoGallery} álbumes</li>}
                {resetConfig.deleteEvents && <li>✓ Eliminar {currentStats.events} eventos</li>}
                {resetConfig.deleteAnnouncements && <li>✓ Eliminar {currentStats.announcements} anuncios</li>}
                {resetConfig.deleteChatMessages && <li>✓ Eliminar {currentStats.chatMessages} mensajes chat</li>}
                {resetConfig.deletePrivateMessages && <li>✓ Eliminar {currentStats.privateMessages} mensajes privados</li>}
                {resetConfig.deleteSurveys && <li>✓ Eliminar {currentStats.surveys} encuestas</li>}
                {resetConfig.deleteMatchResults && <li>✓ Eliminar {currentStats.matchResults} resultados</li>}
                {resetConfig.deleteAppNotifications && <li>✓ Eliminar {currentStats.appNotifications} notificaciones app</li>}
                {resetConfig.deleteCertificates && <li>✓ Eliminar {currentStats.certificates} carnets/certificados</li>}
              </ul>
            </div>
            <Alert className="bg-green-50 border-green-200 mt-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 ml-2 text-xs">
                <strong>✅ DATOS PROTEGIDOS:</strong> No se tocarán documentos del club, fichas médicas ni históricos archivados
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Volver
            </Button>
            <Button onClick={proceedToSecurity} className="bg-red-600 hover:bg-red-700">
              Confirmar y Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmación de Seguridad */}
      <Dialog open={showSecurityDialog} onOpenChange={setShowSecurityDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Shield className="w-5 h-5" />
              Confirmación de Seguridad
            </DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Escribe el código para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
              <p className="text-sm text-red-700 mb-2">Código de seguridad:</p>
              <p className="text-3xl font-mono font-bold text-red-900 tracking-widest">{expectedCode}</p>
            </div>

            <div>
              <Label>Escribe el código exactamente:</Label>
              <Input
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value.toUpperCase())}
                placeholder="Escribe el código aquí"
                className="text-center font-mono text-lg tracking-widest"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSecurityDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={executeSeasonReset}
              disabled={securityCode !== expectedCode}
              className="bg-red-600 hover:bg-red-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              Ejecutar Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Restaurar Backup */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Restaurar Backup
            </DialogTitle>
            <DialogDescription>
              Selecciona qué datos deseas restaurar
            </DialogDescription>
          </DialogHeader>

          {backupData && (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p><strong>Archivo:</strong> Backup del {backupData.exportDate ? format(new Date(backupData.exportDate), "d MMM yyyy HH:mm", { locale: es }) : "fecha desconocida"}</p>
                <p><strong>Exportado por:</strong> {backupData.exportedBy || "Desconocido"}</p>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 ml-2 text-xs">
                  <strong>Atención:</strong> La restauración creará registros duplicados. Asegúrate de haber limpiado los datos actuales si es necesario.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                {Object.entries({
                  players: `Jugadores (${backupData.data.players?.length || 0})`,
                  payments: `Pagos (${backupData.data.payments?.length || 0})`,
                  reminders: `Recordatorios (${backupData.data.reminders?.length || 0})`,
                  attendances: `Asistencias (${backupData.data.attendances?.length || 0})`,
                  evaluations: `Evaluaciones (${backupData.data.evaluations?.length || 0})`,
                  callups: `Convocatorias (${backupData.data.callups?.length || 0})`,
                  clothingOrders: `Pedidos Ropa (${backupData.data.clothingOrders?.length || 0})`,
                  lotteryOrders: `Pedidos Lotería (${backupData.data.lotteryOrders?.length || 0})`
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      checked={restoreSelections[key]}
                      onCheckedChange={(checked) => setRestoreSelections(prev => ({ ...prev, [key]: checked }))}
                    />
                    <Label className="text-sm">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRestoreDialog(false); setBackupData(null); }}>
              Cancelar
            </Button>
            <Button onClick={executeRestore} className="bg-blue-600 hover:bg-blue-700">
              Restaurar Seleccionados
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Overlay de Procesamiento */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-80">
            <CardContent className="pt-6 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="font-medium text-slate-900 mb-2">{processingStep}</p>
              {processingProgress > 0 && (
                <Progress value={processingProgress} className="h-2" />
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}