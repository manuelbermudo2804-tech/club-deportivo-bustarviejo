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
  Lock
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState(null);
  
  // Configuración del reinicio
  const [resetConfig, setResetConfig] = useState({
    tipoReinicio: "completo", // completo, parcial, solo_archivar
    nombreTemporada: "",
    mesApertura: "9", // Septiembre
    mesCierre: "6", // Junio
    generarBackup: true,
    notificarAdmins: true,
    notificarPadres: false, // Changed to false
    mensajePadres: "¡Bienvenidos a la nueva temporada! La aplicación ha sido actualizada. Por favor, revisa los datos de tus jugadores.", // Updated message
  });

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

  const activeSeason = seasons.find(s => s.activa);

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
    // Validaciones de seguridad
    if (!currentUser) {
      toast.error("Error: No se pudo verificar el usuario");
      return;
    }

    if (securityCheck.emailConfirmacion !== currentUser.email) {
      toast.error("El email de confirmación no coincide");
      return;
    }

    if (!securityCheck.aceptoTerminos) {
      toast.error("Debes aceptar los términos");
      return;
    }

    // Removed password check
    // if (!securityCheck.password) {
    //   toast.error("Debes ingresar tu contraseña");
    //   return;
    // }

    setIsProcessing(true);

    try {
      // PASO 1: Generar backup automático
      if (resetConfig.generarBackup) {
        toast.info("📦 Generando backup..."); // Refined message
        generateBackup();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay for download dialog
      }

      // PASO 2: Ejecutar reinicio según tipo
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

        // Crear nueva temporada
        toast.info("✨ Creando nueva temporada..."); // Refined message
        const nuevaTemporada = {
          temporada: resetConfig.nombreTemporada,
          activa: true,
          cuota_unica: activeSeason?.cuota_unica || 150,
          cuota_tres_meses: activeSeason?.cuota_tres_meses || 55,
          fecha_inicio: `${new Date().getFullYear()}-${resetConfig.mesApertura.padStart(2, '0')}-01`,
          fecha_fin: `${new Date().getFullYear() + 1}-${resetConfig.mesCierre.padStart(2, '0')}-30`,
          notas: `Temporada creada el ${new Date().toLocaleDateString('es-ES')}` // Refined message
        };
        await base44.entities.SeasonConfig.create(nuevaTemporada);
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

      // PASO 3: Registrar log de auditoría
      const logEntry = {
        administrador: currentUser.email,
        fecha: new Date().toISOString(),
        tipo_reinicio: resetConfig.tipoReinicio,
        temporada_nueva: resetConfig.nombreTemporada,
        backup_generado: resetConfig.generarBackup
      };
      console.log("LOG DE AUDITORÍA:", logEntry);

      // PASO 4: Enviar notificaciones
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

  const updateSeasonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SeasonConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      setShowEditDialog(false);
      setEditForm(null);
      toast.success("Temporada actualizada correctamente");
    },
  });

  const handleEditSeason = (season) => {
    setEditForm(season);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    updateSeasonMutation.mutate({
      id: editForm.id,
      data: editForm
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Temporadas</h1>
        <p className="text-slate-600 mt-1">Control de temporadas y reinicio anual</p>
      </div>

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
                    <div className="text-sm text-slate-600">Archiva temporada, resetea pagos, cierra tienda y crea nueva temporada</div> {/* Refined description */}
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="parcial" id="parcial" />
                  <Label htmlFor="parcial" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Reinicio Parcial</div>
                    <div className="text-sm text-slate-600">Solo resetea contadores de pago</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-4 border-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="solo_archivar" id="solo_archivar" />
                  <Label htmlFor="solo_archivar" className="flex-1 cursor-pointer">
                    <div className="font-semibold">Solo Archivar</div>
                    <div className="text-sm text-slate-600">Mueve registros al histórico</div> {/* Refined description */}
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
            <Button onClick={handleProceedToConfirmation} className="bg-green-600 hover:bg-green-700">
              <Shield className="w-4 h-4 mr-2" />
              Continuar a Confirmación
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

              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Confirma tu email *</Label>
                  <Input
                    type="email"
                    placeholder={currentUser?.email}
                    value={securityCheck.emailConfirmacion}
                    onChange={(e) => setSecurityCheck({...securityCheck, emailConfirmacion: e.target.value})}
                    className="mt-1"
                  />
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
              setSecurityCheck({
                emailConfirmacion: "",
                aceptoTerminos: false,
                // password: "" // Removed password reset
              });
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteReset}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
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
                      <Button
                        onClick={() => handleEditSeason(season)}
                        variant="outline"
                        size="sm"
                        className="ml-4"
                      >
                        Editar
                      </Button>
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

      {/* Diálogo de Edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Temporada</DialogTitle>
            <DialogDescription>
              Modifica las cuotas y configuraciones de la temporada
            </DialogDescription>
          </DialogHeader>

          {editForm && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Cuota Única (€)</Label>
                  <Input
                    type="number"
                    value={editForm.cuota_unica || ""}
                    onChange={(e) => setEditForm({...editForm, cuota_unica: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <Label>Cuota Fraccionada (€)</Label>
                  <Input
                    type="number"
                    value={editForm.cuota_tres_meses || ""}
                    onChange={(e) => setEditForm({...editForm, cuota_tres_meses: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notas">Notas</Label>
                <Textarea
                  id="edit-notas"
                  value={editForm.notas || ""}
                  onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-lg p-4">
                <Checkbox
                  id="edit-tienda-abierta"
                  checked={editForm.tienda_ropa_abierta || false}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, tienda_ropa_abierta: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="edit-tienda-abierta" className="font-semibold text-orange-900 cursor-pointer">
                    🛍️ Tienda de Ropa Abierta
                  </Label>
                  <p className="text-xs text-orange-700 mt-1">
                    Control manual para abrir/cerrar pedidos de ropa (independiente del calendario)
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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