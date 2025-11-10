import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sparkles
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function SeasonManagement() {
  const [isResetting, setIsResetting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showNewSeasonForm, setShowNewSeasonForm] = useState(false);
  const [newSeasonData, setNewSeasonData] = useState({
    temporada: "",
    cuota_unica: 0,
    cuota_tres_meses: 0,
    fecha_inicio: "",
    fecha_fin: "",
    notas: ""
  });

  const queryClient = useQueryClient();

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

  const activeSeason = seasons.find(s => s.activa);

  const createSeasonMutation = useMutation({
    mutationFn: (seasonData) => base44.entities.SeasonConfig.create(seasonData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });

  // Iniciar Nueva Temporada (Septiembre)
  const handleStartNewSeason = async () => {
    setIsStarting(true);
    try {
      // Paso 1: Archivar pagos de temporada anterior
      toast.info("Archivando pagos de temporada anterior...");
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

      // Paso 2: Eliminar recordatorios antiguos
      toast.info("Limpiando recordatorios antiguos...");
      for (const reminder of reminders) {
        try {
          await base44.entities.Reminder.delete(reminder.id);
        } catch (error) {
          console.error(`Error deleting reminder ${reminder.id}:`, error);
        }
      }

      // Paso 3: Desactivar temporada actual
      if (activeSeason) {
        toast.info("Cerrando temporada anterior...");
        await base44.entities.SeasonConfig.update(activeSeason.id, {
          ...activeSeason,
          activa: false
        });
      }

      // Paso 4: Mostrar formulario para nueva temporada
      setShowNewSeasonForm(true);
      toast.success("¡Sistema preparado! Ahora configura la nueva temporada");
    } catch (error) {
      console.error("Error starting new season:", error);
      toast.error("Error al iniciar nueva temporada");
    } finally {
      setIsResetting(false);
      setIsStarting(false);
    }
  };

  // Crear la nueva temporada
  const handleCreateNewSeason = async (e) => {
    e.preventDefault();
    
    try {
      await createSeasonMutation.mutateAsync({
        ...newSeasonData,
        activa: true
      });

      toast.success("¡Nueva temporada creada y activada!");
      setShowNewSeasonForm(false);
      setNewSeasonData({
        temporada: "",
        cuota_unica: 0,
        cuota_tres_meses: 0,
        fecha_inicio: "",
        fecha_fin: "",
        notas: ""
      });
      
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    } catch (error) {
      console.error("Error creating season:", error);
      toast.error("Error al crear la temporada");
    }
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

  // Categorías y rangos de edad
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
                  Proceso automático de septiembre: archiva pagos, reinicia sistema y configura nueva temporada
                </p>
                <div className="mt-3 space-y-1 text-sm text-green-50">
                  <p>✅ Archiva pagos antiguos al histórico</p>
                  <p>✅ Elimina recordatorios vencidos</p>
                  <p>✅ Cierra temporada anterior</p>
                  <p>✅ Prepara sistema para inscripciones</p>
                </div>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-white text-green-700 hover:bg-green-50 font-bold py-6 px-8 text-lg shadow-2xl"
                  disabled={isStarting || isResetting}
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="w-6 h-6 mr-2" />
                      Iniciar Nueva Temporada
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl">🟢 ¿Iniciar Nueva Temporada?</AlertDialogTitle>
                  <AlertDialogDescription className="text-base space-y-3 py-4">
                    <p className="font-semibold text-slate-900">
                      Este proceso realizará las siguientes acciones automáticamente:
                    </p>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Archivar</strong> todos los pagos de la temporada anterior al histórico</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Eliminar</strong> todos los recordatorios antiguos</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Cerrar</strong> la temporada actual</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span><strong>Preparar</strong> el sistema para configurar la nueva temporada</span>
                      </li>
                    </ul>
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded mt-4">
                      <p className="text-orange-800 font-medium flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        Esta acción no se puede deshacer. Todos los pagos se moverán al histórico.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleStartNewSeason}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Sí, Iniciar Nueva Temporada
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Nueva Temporada */}
      {showNewSeasonForm && (
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="border-b border-blue-100">
            <CardTitle className="text-2xl text-blue-900 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              Configurar Nueva Temporada
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateNewSeason} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Temporada *</Label>
                  <Input
                    placeholder="Ej: 2025/2026"
                    value={newSeasonData.temporada}
                    onChange={(e) => setNewSeasonData({...newSeasonData, temporada: e.target.value})}
                    required
                  />
                  <p className="text-xs text-slate-500">Sugerencia: {getNextSeason()}</p>
                </div>

                <div className="space-y-2">
                  <Label>Cuota Única (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 150"
                    value={newSeasonData.cuota_unica}
                    onChange={(e) => setNewSeasonData({...newSeasonData, cuota_unica: parseFloat(e.target.value) || 0})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cuota Fraccionada por Mes (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 55"
                    value={newSeasonData.cuota_tres_meses}
                    onChange={(e) => setNewSeasonData({...newSeasonData, cuota_tres_meses: parseFloat(e.target.value) || 0})}
                    required
                  />
                  <p className="text-xs text-slate-500">Pagos en Junio, Septiembre y Diciembre</p>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Inicio *</Label>
                  <Input
                    type="date"
                    value={newSeasonData.fecha_inicio}
                    onChange={(e) => setNewSeasonData({...newSeasonData, fecha_inicio: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Fin *</Label>
                  <Input
                    type="date"
                    value={newSeasonData.fecha_fin}
                    onChange={(e) => setNewSeasonData({...newSeasonData, fecha_fin: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Notas sobre la temporada..."
                  value={newSeasonData.notas}
                  onChange={(e) => setNewSeasonData({...newSeasonData, notas: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSeasonForm(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={createSeasonMutation.isPending}
                >
                  {createSeasonMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Crear y Activar Temporada
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
              Jugadores que Necesitan Actualización de Categoría ({playersNeedingUpdate.length})
            </CardTitle>
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
                          {age} años - Actualmente en: <Badge className="bg-slate-100 text-slate-700">{player.categoria}</Badge>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">Categoría sugerida:</p>
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
                    <div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg text-slate-900">
                          Temporada {season.temporada}
                        </p>
                        {season.activa && (
                          <Badge className="bg-green-600 text-white">Activa</Badge>
                        )}
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-slate-600">
                        <span>Única: <strong>{season.cuota_unica}€</strong></span>
                        <span>Fraccionada: <strong>{season.cuota_tres_meses}€/mes</strong></span>
                      </div>
                    </div>
                    {season.fecha_inicio && season.fecha_fin && (
                      <div className="text-right text-sm text-slate-600">
                        <p>{new Date(season.fecha_inicio).toLocaleDateString('es-ES')}</p>
                        <p>{new Date(season.fecha_fin).toLocaleDateString('es-ES')}</p>
                      </div>
                    )}
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
    </div>
  );
}