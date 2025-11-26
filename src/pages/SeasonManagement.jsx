import React, { useState, useEffect, useRef } from "react";
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
  ChevronDown, ChevronUp, Info, Smartphone, Mail, Image, Edit
} from "lucide-react";
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
    deleteAttendances: false,
    deleteEvaluations: false,
    deleteCallups: true,
    deleteClothingOrders: false,
    deleteLotteryOrders: true,
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
        setIsAdmin(currentUser.role === "admin");
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
  });

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.Reminder.list(),
  });

  const { data: clothingOrders = [] } = useQuery({
    queryKey: ['clothingOrders'],
    queryFn: () => base44.entities.ClothingOrder.list(),
  });

  const { data: lotteryOrders = [] } = useQuery({
    queryKey: ['lotteryOrders'],
    queryFn: () => base44.entities.LotteryOrder.list(),
  });

  const { data: resetHistory = [] } = useQuery({
    queryKey: ['resetHistory'],
    queryFn: () => base44.entities.ResetHistory.list('-created_date'),
  });

  const activeSeason = seasons.find(s => s.activa === true);

  // Mutación para actualizar configuración de temporada
  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeasonConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      toast.success("Configuración actualizada");
    },
    onError: (error) => {
      console.error("Error:", error);
      toast.error("Error al actualizar");
    }
  });

  // Funciones de toggle para características
  const toggleFeature = (feature, value) => {
    if (!activeSeason) return;
    updateSeasonMutation.mutate({ 
      id: activeSeason.id, 
      data: { [feature]: value } 
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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
    
    try {
      const totalSteps = Object.keys(restoreSelections).filter(k => restoreSelections[k]).length;
      let currentStep = 0;

      if (restoreSelections.payments && backupData.data.payments) {
        setProcessingStep("Restaurando pagos...");
        for (const payment of backupData.data.payments) {
          const { id, created_date, updated_date, ...data } = payment;
          await base44.entities.Payment.create(data);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      if (restoreSelections.reminders && backupData.data.reminders) {
        setProcessingStep("Restaurando recordatorios...");
        for (const reminder of backupData.data.reminders) {
          const { id, created_date, updated_date, ...data } = reminder;
          await base44.entities.Reminder.create(data);
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      queryClient.invalidateQueries();
      toast.success("Backup restaurado correctamente");
      setShowRestoreDialog(false);
      setBackupData(null);
    } catch (error) {
      console.error("Error restoring backup:", error);
      toast.error("Error al restaurar el backup");
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

      // 1. Archivar pagos
      if (resetConfig.archivePayments) {
        setProcessingStep("Archivando pagos...");
        for (const payment of payments) {
          const { id, created_date, updated_date, ...data } = payment;
          await base44.entities.PaymentHistory.create({
            ...data,
            archivado_fecha: new Date().toISOString()
          });
          await base44.entities.Payment.delete(payment.id);
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

      // 3. Resetear estado de jugadores
      if (resetConfig.resetPlayerStatus) {
        setProcessingStep("Actualizando jugadores...");
        for (const player of players.filter(p => p.activo)) {
          await base44.entities.Player.update(player.id, {
            estado_renovacion: "pendiente",
            temporada_renovacion: resetConfig.newSeasonName
          });
        }
        currentStep++;
        setProcessingProgress((currentStep / totalSteps) * 100);
      }

      // 4. Eliminar convocatorias
      if (resetConfig.deleteCallups) {
        setProcessingStep("Eliminando convocatorias...");
        const callups = await base44.entities.Convocatoria.list();
        for (const callup of callups) {
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
        notificaciones_admin_email: activeSeason?.notificaciones_admin_email || true
      });
      currentStep++;
      setProcessingProgress((currentStep / totalSteps) * 100);

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
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
      setProcessingProgress(0);
    }
  };

  // Estadísticas actuales
  const currentStats = {
    payments: payments.length,
    pendingPayments: payments.filter(p => p.estado === "Pendiente").length,
    players: players.filter(p => p.activo).length,
    reminders: reminders.length,
    clothingOrders: clothingOrders.length,
    lotteryOrders: lotteryOrders.length
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
          <h1 className="text-3xl font-bold text-slate-900">⚙️ Gestión de Temporadas</h1>
          <p className="text-slate-600 mt-1">Configura la temporada activa y gestiona el ciclo de vida del club</p>
        </div>
      </div>

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
            {/* Cuotas con botón de editar */}
            <div className="bg-white rounded-xl p-4 shadow-sm border-2 border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  💰 Cuotas de la Temporada
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingQuotas({
                      cuota_unica: activeSeason.cuota_unica || 200,
                      cuota_tres_meses: activeSeason.cuota_tres_meses || 75
                    });
                    setShowEditQuotasDialog(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Cuotas
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200 text-center">
                  <p className="text-xs text-green-700 font-medium mb-1">Cuota Única</p>
                  <p className="text-3xl font-bold text-green-800">{activeSeason.cuota_unica}€</p>
                  <p className="text-[10px] text-green-600 mt-1">Pago único en Junio</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200 text-center">
                  <p className="text-xs text-blue-700 font-medium mb-1">Cuota Fraccionada</p>
                  <p className="text-3xl font-bold text-blue-800">{activeSeason.cuota_tres_meses}€</p>
                  <p className="text-[10px] text-blue-600 mt-1">x3 meses (Jun/Sep/Dic)</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200 text-center">
                  <p className="text-xs text-purple-700 font-medium mb-1">Descuento Hermano</p>
                  <p className="text-3xl font-bold text-purple-800">25€</p>
                  <p className="text-[10px] text-purple-600 mt-1">Se aplica automáticamente</p>
                </div>
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
          </CardContent>
        )}
      </Card>

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
                <p className="text-sm font-medium text-slate-700 mb-2">Datos actuales que serán afectados:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>{currentStats.payments} pagos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-yellow-600" />
                    <span>{currentStats.reminders} recordatorios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-green-600" />
                    <span>{currentStats.players} jugadores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                    <span>{currentStats.clothingOrders} pedidos ropa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clover className="w-4 h-4 text-green-600" />
                    <span>{currentStats.lotteryOrders} pedidos lotería</span>
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
          <CardContent>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-600" />
              Configurar Reset de Temporada
            </DialogTitle>
            <DialogDescription>
              Configura los parámetros para la nueva temporada
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre de la nueva temporada</Label>
              <Input
                value={resetConfig.newSeasonName}
                onChange={(e) => setResetConfig(prev => ({ ...prev, newSeasonName: e.target.value }))}
                placeholder="Ej: 2025-2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cuota Única (€)</Label>
                <Input
                  type="number"
                  value={resetConfig.cuotaUnica}
                  onChange={(e) => setResetConfig(prev => ({ ...prev, cuotaUnica: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Cuota Fraccionada (€)</Label>
                <Input
                  type="number"
                  value={resetConfig.cuotaTresMeses}
                  onChange={(e) => setResetConfig(prev => ({ ...prev, cuotaTresMeses: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-medium text-sm">Acciones a realizar:</p>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={resetConfig.archivePayments}
                  onCheckedChange={(checked) => setResetConfig(prev => ({ ...prev, archivePayments: checked }))}
                />
                <Label className="text-sm">Archivar pagos actuales</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={resetConfig.deleteReminders}
                  onCheckedChange={(checked) => setResetConfig(prev => ({ ...prev, deleteReminders: checked }))}
                />
                <Label className="text-sm">Eliminar recordatorios</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={resetConfig.resetPlayerStatus}
                  onCheckedChange={(checked) => setResetConfig(prev => ({ ...prev, resetPlayerStatus: checked }))}
                />
                <Label className="text-sm">Resetear estado de renovación de jugadores</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={resetConfig.deleteCallups}
                  onCheckedChange={(checked) => setResetConfig(prev => ({ ...prev, deleteCallups: checked }))}
                />
                <Label className="text-sm">Eliminar convocatorias</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={resetConfig.deleteLotteryOrders}
                  onCheckedChange={(checked) => setResetConfig(prev => ({ ...prev, deleteLotteryOrders: checked }))}
                />
                <Label className="text-sm">Eliminar pedidos de lotería</Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={resetConfig.notifyParents}
                  onCheckedChange={(checked) => setResetConfig(prev => ({ ...prev, notifyParents: checked }))}
                />
                <Label className="text-sm">Notificar al administrador</Label>
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

            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="font-medium text-orange-900 mb-2">Acciones que se realizarán:</p>
              <ul className="text-sm text-orange-700 space-y-1">
                {resetConfig.archivePayments && <li>✓ Archivar {currentStats.payments} pagos</li>}
                {resetConfig.deleteReminders && <li>✓ Eliminar {currentStats.reminders} recordatorios</li>}
                {resetConfig.resetPlayerStatus && <li>✓ Actualizar {currentStats.players} jugadores</li>}
                {resetConfig.deleteCallups && <li>✓ Eliminar convocatorias</li>}
                {resetConfig.deleteLotteryOrders && <li>✓ Eliminar {currentStats.lotteryOrders} pedidos de lotería</li>}
              </ul>
            </div>
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

              <div className="space-y-2">
                {Object.entries({
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