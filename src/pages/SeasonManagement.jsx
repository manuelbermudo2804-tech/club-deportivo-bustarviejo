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
import FeatureControlSection from "../components/season/FeatureControlSection";
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
  // Garantiza que solo una temporada quede como `activa`.
  const createActiveSeasonQuickly = async () => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const seasonName = `${currentYear}-${currentYear + 1}`;
      const existing = await base44.entities.SeasonConfig.filter({ temporada: seasonName });

      // Desactivar cualquier otra activa que no sea la que vamos a marcar
      const allActives = await base44.entities.SeasonConfig.filter({ activa: true });
      for (const s of allActives) {
        if (s.temporada !== seasonName) {
          try { await base44.entities.SeasonConfig.update(s.id, { activa: false }); } catch {}
        }
      }

      if (existing.length > 0 && existing[0].activa) {
        toast.success(`La temporada ${seasonName} ya está activa`);
        await queryClient.invalidateQueries({ queryKey: ['seasons'] });
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
    setProcessingProgress(10);
    setShowSecurityDialog(false);
    setProcessingStep("Ejecutando reset en el servidor (puede tardar 1-2 min)...");

    try {
      // Backend hace TODO con service role: sin rate limit, en lotes paralelos
      const { data } = await base44.functions.invoke('executeSeasonReset', { config: resetConfig });
      
      if (data?.error) throw new Error(data.error);
      
      setProcessingProgress(95);
      console.log('🎉 Reset completado:', data);
      console.log('📋 Log:', data?.log);
      
      if (resetConfig.notifyParents) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: "cdbustarviejo@gmail.com",
            subject: `🔄 Nueva Temporada ${data?.newSeason} Iniciada`,
            html: `<h2>Reset Completado</h2><p>${data?.previousSeason} → ${data?.newSeason} (${data?.durationSec}s)</p><ul>${(data?.log || []).map(l => `<li>${l}</li>`).join('')}</ul>`
          });
        } catch (e) { console.error("Email error:", e); }
      }
      
      queryClient.invalidateQueries();
      setProcessingProgress(100);
      toast.success(`¡Temporada ${data?.newSeason} iniciada! ${data?.log?.length || 0} acciones en ${data?.durationSec}s`, { duration: 8000 });
      // Aviso explícito para otros dispositivos / pestañas
      toast.info(
        "ℹ️ Si tienes la app abierta en otros dispositivos o pestañas, refrescarán automáticamente. Si no, pídeles que recarguen.",
        { duration: 12000 }
      );
    } catch (error) {
      console.error("Error reset:", error);
      toast.error(`Error: ${error.message}`);
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
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-2xl p-5 lg:p-7 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Settings className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">Gestión de Temporadas</h1>
            <p className="text-slate-300 mt-1 text-sm">Configuración de temporadas, categorías y características del club</p>
          </div>
        </div>
      </div>

      {/* Aviso si no hay temporada activa */}
      {!activeSeason && (
        <Card className="border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 shadow-md">
          <CardContent className="py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <p className="font-semibold text-amber-900">No hay temporada activa</p>
                <p className="text-sm text-amber-800">Crea una temporada activa para poder activar renovaciones y configurar cuotas.</p>
              </div>
            </div>
            <Button onClick={createActiveSeasonQuickly} className="bg-amber-600 hover:bg-amber-700 shadow-md flex-shrink-0">
              Crear temporada activa
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ─── BLOQUE 1: ESTADO ACTUAL ─────────────────────── */}
      {activeSeason && (
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Estado Actual</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300" />
        </div>
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

      {/* ─── BLOQUE 2: CONFIGURACIÓN ─────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Configuración</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300" />
      </div>

      {/* Sección: Control de Características */}
      <FeatureControlSection
        activeSeason={activeSeason}
        expanded={expandedSections.features}
        onToggleExpanded={() => toggleSection('features')}
        toggleFeature={toggleFeature}
        updateSeasonMutation={updateSeasonMutation}
      />

      {/* Sección: Programa de Referidos */}
      {activeSeason && (
        <ReferralConfigCard
          seasonConfig={activeSeason}
          onUpdate={(data) => updateSeasonMutation.mutate({ id: activeSeason.id, data })}
          isUpdating={updateSeasonMutation.isPending}
        />
      )}

      {/* ─── BLOQUE 3: MANTENIMIENTO ─────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mantenimiento</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300" />
      </div>

      {/* Sección: Limpieza de Categorías DUPLICADAS */}
      <CategoryCleanupTool />

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

      {/* ─── BLOQUE 4: ZONA PELIGROSA ─────────────────────── */}
      {isAdmin && (
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-300" />
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">⚠️ Zona Peligrosa</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-300" />
        </div>
      )}

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

      {/* ─── BLOQUE 5: HISTÓRICO ─────────────────────── */}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-300" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Histórico</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-300" />
      </div>

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