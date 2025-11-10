import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCw, Archive, Calendar, DollarSign, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
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

export default function SeasonManagement() {
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newSeasonConfig, setNewSeasonConfig] = useState({
    temporada: "",
    cuota_unica: 0,
    cuota_tres_meses: 0,
    fecha_inicio: "",
    fecha_fin: "",
    notas: ""
  });

  const queryClient = useQueryClient();

  const { data: seasonConfigs } = useQuery({
    queryKey: ['seasonConfigs'],
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

  const createSeasonConfigMutation = useMutation({
    mutationFn: (configData) => base44.entities.SeasonConfig.create(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasonConfigs'] });
      setShowConfigForm(false);
      toast.success("Configuración de temporada creada");
    },
  });

  const activeSeason = seasonConfigs.find(s => s.activa);
  const totalPayments = payments.length;
  const totalReminders = reminders.length;

  const handleResetSeason = async () => {
    setResetting(true);
    try {
      // 1. Archivar pagos actuales
      const archivePromises = payments.map(payment => 
        base44.entities.PaymentHistory.create({
          temporada: activeSeason?.temporada || "Sin temporada",
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
        })
      );
      await Promise.all(archivePromises);

      // 2. Eliminar pagos actuales
      const deletePaymentPromises = payments.map(payment => 
        base44.entities.Payment.delete(payment.id)
      );
      await Promise.all(deletePaymentPromises);

      // 3. Eliminar recordatorios actuales
      const deleteReminderPromises = reminders.map(reminder => 
        base44.entities.Reminder.delete(reminder.id)
      );
      await Promise.all(deleteReminderPromises);

      // 4. Desactivar temporada anterior
      if (activeSeason) {
        await base44.entities.SeasonConfig.update(activeSeason.id, {
          ...activeSeason,
          activa: false
        });
      }

      // 5. Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['seasonConfigs'] });

      toast.success(`¡Temporada reseteada! Se archivaron ${totalPayments} pagos y se eliminaron ${totalReminders} recordatorios`);
      setShowResetDialog(false);
    } catch (error) {
      toast.error("Error al resetear la temporada");
      console.error(error);
    } finally {
      setResetting(false);
    }
  };

  const handleCreateSeasonConfig = async (e) => {
    e.preventDefault();
    
    // Desactivar todas las temporadas anteriores
    const deactivatePromises = seasonConfigs.map(config => 
      base44.entities.SeasonConfig.update(config.id, {
        ...config,
        activa: false
      })
    );
    await Promise.all(deactivatePromises);

    // Crear nueva temporada activa
    createSeasonConfigMutation.mutate({
      ...newSeasonConfig,
      activa: true
    });
  };

  const categoryAges = {
    "Prebenjamín": { min: 4, max: 5 },
    "Benjamín": { min: 6, max: 7 },
    "Alevín": { min: 8, max: 9 },
    "Infantil": { min: 10, max: 11 },
    "Cadete": { min: 12, max: 13 },
    "Juvenil": { min: 14, max: 17 },
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

  const suggestCategory = (birthDate) => {
    const age = calculateAge(birthDate);
    for (const [category, range] of Object.entries(categoryAges)) {
      if (age >= range.min && age <= range.max) {
        return category;
      }
    }
    return "Senior";
  };

  const playersNeedingUpdate = players.filter(player => {
    if (!player.fecha_nacimiento) return false;
    const suggested = suggestCategory(player.fecha_nacimiento);
    return suggested !== player.categoria;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Temporadas</h1>
        <p className="text-slate-600 mt-1">Control y reseteo del ciclo anual</p>
      </div>

      {/* Temporada Activa */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-orange-500 to-orange-700 text-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            Temporada Activa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSeason ? (
            <>
              <div className="text-4xl font-bold">{activeSeason.temporada}</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-orange-100 text-sm">Cuota Única</p>
                  <p className="text-2xl font-bold">{activeSeason.cuota_unica}€</p>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <p className="text-orange-100 text-sm">Cuota Fraccionada</p>
                  <p className="text-2xl font-bold">{activeSeason.cuota_tres_meses}€/mes</p>
                </div>
              </div>
              {activeSeason.notas && (
                <div className="bg-white/10 rounded-lg p-3 text-sm">
                  {activeSeason.notas}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-orange-100">No hay temporada activa configurada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pagos Actuales</p>
                <p className="text-3xl font-bold text-slate-900">{totalPayments}</p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Recordatorios</p>
                <p className="text-3xl font-bold text-slate-900">{totalReminders}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Jugadores a Actualizar</p>
                <p className="text-3xl font-bold text-slate-900">{playersNeedingUpdate.length}</p>
              </div>
              <RefreshCw className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jugadores que Necesitan Actualización */}
      {playersNeedingUpdate.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertCircle className="w-5 h-5" />
              Jugadores con Categoría a Actualizar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {playersNeedingUpdate.slice(0, 5).map(player => {
              const suggested = suggestCategory(player.fecha_nacimiento);
              return (
                <div key={player.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{player.nombre}</p>
                    <p className="text-sm text-slate-600">
                      Categoría actual: {player.categoria} → Sugerida: {suggested}
                    </p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-700">
                    {calculateAge(player.fecha_nacimiento)} años
                  </Badge>
                </div>
              );
            })}
            {playersNeedingUpdate.length > 5 && (
              <p className="text-sm text-slate-500 text-center pt-2">
                Y {playersNeedingUpdate.length - 5} más...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Acciones */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Nueva Temporada */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              Configurar Nueva Temporada
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showConfigForm ? (
              <Button
                onClick={() => setShowConfigForm(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Nueva Temporada
              </Button>
            ) : (
              <form onSubmit={handleCreateSeasonConfig} className="space-y-4">
                <div className="space-y-2">
                  <Label>Temporada (ej: 2025-2026)</Label>
                  <Input
                    placeholder="2025-2026"
                    value={newSeasonConfig.temporada}
                    onChange={(e) => setNewSeasonConfig({...newSeasonConfig, temporada: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cuota Única (€)</Label>
                    <Input
                      type="number"
                      placeholder="120"
                      value={newSeasonConfig.cuota_unica}
                      onChange={(e) => setNewSeasonConfig({...newSeasonConfig, cuota_unica: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cuota Fraccionada (€)</Label>
                    <Input
                      type="number"
                      placeholder="45"
                      value={newSeasonConfig.cuota_tres_meses}
                      onChange={(e) => setNewSeasonConfig({...newSeasonConfig, cuota_tres_meses: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={newSeasonConfig.fecha_inicio}
                      onChange={(e) => setNewSeasonConfig({...newSeasonConfig, fecha_inicio: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin</Label>
                    <Input
                      type="date"
                      value={newSeasonConfig.fecha_fin}
                      onChange={(e) => setNewSeasonConfig({...newSeasonConfig, fecha_fin: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    placeholder="Información adicional sobre la temporada..."
                    value={newSeasonConfig.notas}
                    onChange={(e) => setNewSeasonConfig({...newSeasonConfig, notas: e.target.value})}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowConfigForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                    Crear Temporada
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Resetear Temporada */}
        <Card className="border-none shadow-lg border-l-4 border-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Archive className="w-5 h-5" />
              Resetear Temporada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-red-800 font-medium">⚠️ Esta acción:</p>
              <ul className="text-xs text-red-700 space-y-1 ml-4">
                <li>• Archiva todos los pagos actuales ({totalPayments})</li>
                <li>• Elimina todos los recordatorios ({totalReminders})</li>
                <li>• Mantiene los jugadores registrados</li>
                <li>• Prepara el sistema para la nueva temporada</li>
              </ul>
            </div>
            <Button
              onClick={() => setShowResetDialog(true)}
              disabled={!activeSeason || totalPayments === 0}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Archive className="w-4 h-4 mr-2" />
              Iniciar Reseteo de Temporada
            </Button>
            {!activeSeason && (
              <p className="text-xs text-slate-500 text-center">
                Configura una temporada activa primero
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Historial de Temporadas */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-slate-600" />
            Historial de Temporadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {seasonConfigs.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No hay temporadas configuradas</p>
          ) : (
            <div className="space-y-2">
              {seasonConfigs.map(config => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-900">{config.temporada}</p>
                    <p className="text-sm text-slate-600">
                      Única: {config.cuota_unica}€ | Fraccionada: {config.cuota_tres_meses}€
                    </p>
                  </div>
                  {config.activa && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Activa
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmación */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Confirmar Reseteo de Temporada</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Esta acción es <strong>irreversible</strong> y realizará lo siguiente:</p>
              <ul className="space-y-2 text-sm">
                <li>✅ Archivará <strong>{totalPayments} pagos</strong> en el histórico</li>
                <li>🗑️ Eliminará <strong>{totalReminders} recordatorios</strong></li>
                <li>👥 Mantendrá <strong>{players.length} jugadores</strong> registrados</li>
                <li>🔄 Desactivará la temporada <strong>{activeSeason?.temporada}</strong></li>
              </ul>
              <p className="text-red-600 font-medium">
                ¿Estás seguro de que quieres continuar?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetSeason}
              disabled={resetting}
              className="bg-red-600 hover:bg-red-700"
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reseteando...
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  Sí, Resetear Temporada
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}