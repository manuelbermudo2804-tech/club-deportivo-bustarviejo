import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, MapPin, Calendar, Trash2, ExternalLink, Info } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

import TrainingScheduleForm from "../components/training/TrainingScheduleForm";
import ContactCard from "../components/ContactCard";

const DIAS_ORDEN = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5
};

const DAY_COLORS = {
  "Lunes": "from-blue-600 to-blue-700",
  "Martes": "from-green-600 to-green-700",
  "Miércoles": "from-orange-600 to-orange-700",
  "Jueves": "from-purple-600 to-purple-700",
  "Viernes": "from-pink-600 to-pink-700"
};

const UBICACION_MAPS_URL = "https://www.google.com/maps/place/Campo+de+F%C3%BAtbol+Municipal+Bustarviejo/@40.8569444,-3.7230556,17z";

export default function Schedules() {
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState("parent"); // admin, coach, parent, player
  const [myCategories, setMyCategories] = useState([]);
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (currentUser.role === "admin") {
          setUserRole("admin");
        } else if (currentUser.role === "jugador") {
          setUserRole("player");
        } else if (currentUser.es_entrenador || currentUser.es_coordinador) {
          setUserRole("coach");
        } else {
          setUserRole("parent");
        }
      } catch (error) {
        console.error("Error checking permissions:", error);
      }
    };
    checkPermissions();
  }, []);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      
      if (userRole === "player") {
        return allPlayers.filter(p => p.id === user?.jugador_id);
      } else {
        return allPlayers.filter(p => 
          (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo
        );
      }
    },
    enabled: !!user?.email && (userRole === "parent" || userRole === "player"),
    initialData: [],
  });

  useEffect(() => {
    if (players.length > 0) {
      const categories = [...new Set(players.map(p => p.deporte))];
      setMyCategories(categories);
    }
  }, [players]);

  const createScheduleMutation = useMutation({
    mutationFn: (scheduleData) => base44.entities.TrainingSchedule.create(scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingSchedules'] });
      setShowForm(false);
      setEditingSchedule(null);
      toast.success("Horario creado correctamente");
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: ({ id, scheduleData }) => base44.entities.TrainingSchedule.update(id, scheduleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingSchedules'] });
      setShowForm(false);
      setEditingSchedule(null);
      toast.success("Horario actualizado correctamente");
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingSchedule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingSchedules'] });
      toast.success("Horario eliminado correctamente");
    },
  });

  const handleSubmit = async (scheduleData) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, scheduleData });
    } else {
      createScheduleMutation.mutate(scheduleData);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setShowForm(true);
  };

  const handleDelete = (schedule) => {
    if (confirm(`¿Eliminar el horario de ${schedule.categoria} - ${schedule.dia_semana}?`)) {
      deleteScheduleMutation.mutate(schedule.id);
    }
  };

  // Filtrar horarios según el rol
  const filteredSchedules = (() => {
    if (userRole === "admin") {
      return schedules;
    } else if (userRole === "coach") {
      // Coaches ven todos los horarios activos
      return schedules.filter(s => s.activo);
    } else {
      // Padres y jugadores ven solo sus categorías
      return schedules.filter(s => s.activo && myCategories.includes(s.categoria));
    }
  })();

  // Agrupar horarios por categoría
  const schedulesByCategory = filteredSchedules.reduce((acc, schedule) => {
    if (!acc[schedule.categoria]) {
      acc[schedule.categoria] = [];
    }
    acc[schedule.categoria].push(schedule);
    return acc;
  }, {});

  // Ordenar horarios dentro de cada categoría por día
  Object.keys(schedulesByCategory).forEach(categoria => {
    schedulesByCategory[categoria].sort((a, b) => DIAS_ORDEN[a.dia_semana] - DIAS_ORDEN[b.dia_semana]);
  });

  const canEdit = userRole === "admin";
  const isParentOrPlayer = userRole === "parent" || userRole === "player";

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {userRole === "player" ? "Mis Horarios" : "Horarios de Entrenamientos"}
          </h1>
          <p className="text-slate-600 mt-1">
            {canEdit 
              ? "Gestiona los horarios de entrenamientos por categoría" 
              : userRole === "player" 
                ? `Entrenamientos de ${myCategories[0] || "tu equipo"}`
                : "Consulta los horarios de entrenamientos"}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={() => {
              setEditingSchedule(null);
              setShowForm(!showForm);
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Horario
          </Button>
        )}
      </div>

      {/* Ubicación del Campo */}
      <Card className="border-none shadow-lg bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <MapPin className="w-6 h-6 text-green-700 mt-1" />
              <div>
                <p className="text-sm text-green-800 mb-1">📍 Ubicación de Entrenamientos:</p>
                <p className="text-lg font-bold text-green-900">Campo Municipal de Bustarviejo</p>
                {isParentOrPlayer && (
                  <p className="text-sm text-green-700 mt-1">Todos los entrenamientos se realizan en esta ubicación</p>
                )}
              </div>
            </div>
            <a href={UBICACION_MAPS_URL} target="_blank" rel="noopener noreferrer">
              <Button className="bg-green-600 hover:bg-green-700 shadow-lg">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver en Google Maps
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Info Alert for Parents/Players */}
      {isParentOrPlayer && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>ℹ️ Información:</strong> Aquí puedes ver los horarios de entrenamientos de las categorías en las que participan tus jugadores.
          </AlertDescription>
        </Alert>
      )}

      {/* Players Summary for Parents */}
      {userRole === "parent" && players.length > 0 && (
        <Card className="border-none shadow-lg bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="text-lg text-orange-900">Tus Jugadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {players.map(player => (
                <Badge key={player.id} className="bg-orange-600 text-white">
                  {player.nombre} - {player.deporte}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats - Only for Admin/Coach */}
      {(userRole === "admin" || userRole === "coach") && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Horarios</p>
                  <p className="text-3xl font-bold text-orange-600">{filteredSchedules.length}</p>
                </div>
                <Calendar className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Categorías con Horarios</p>
                  <p className="text-3xl font-bold text-green-600">
                    {Object.keys(schedulesByCategory).length}
                  </p>
                </div>
                <Clock className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Horarios Activos</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {filteredSchedules.filter(s => s.activo).length}
                  </p>
                </div>
                <MapPin className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && canEdit && (
          <TrainingScheduleForm
            schedule={editingSchedule}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingSchedule(null);
            }}
            isSubmitting={createScheduleMutation.isPending || updateScheduleMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Schedules by Category */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : (userRole === "parent" || userRole === "player") && players.length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No tienes jugadores registrados</p>
            <p className="text-sm text-slate-400 mt-2">Registra un jugador para ver sus horarios de entrenamientos</p>
          </CardContent>
        </Card>
      ) : Object.keys(schedulesByCategory).length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay horarios disponibles</p>
            <p className="text-sm text-slate-400 mt-2">
              {canEdit 
                ? 'Haz clic en "Nuevo Horario" para añadir uno'
                : 'Los horarios de entrenamientos aún no han sido configurados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(schedulesByCategory).sort().map(categoria => {
            const playersInCategory = players.filter(p => p.deporte === categoria);
            
            return (
              <Card key={categoria} className="border-none shadow-lg bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b-2 border-orange-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl text-orange-900 flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5" />
                        {categoria}
                      </CardTitle>
                      {isParentOrPlayer && playersInCategory.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {playersInCategory.map(player => (
                            <Badge key={player.id} variant="outline" className="text-orange-700 border-orange-300">
                              {player.nombre}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedulesByCategory[categoria].map(schedule => (
                      <div
                        key={schedule.id}
                        className={`border-2 rounded-lg p-4 transition-all ${
                          isParentOrPlayer 
                            ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50 hover:shadow-md'
                            : 'border-slate-200 bg-slate-50 hover:border-orange-300'
                        }`}
                      >
                        {/* Day color bar for player view */}
                        {userRole === "player" && (
                          <div className={`h-1 -mt-4 -mx-4 mb-3 bg-gradient-to-r ${DAY_COLORS[schedule.dia_semana]}`}></div>
                        )}
                        
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-600 text-white">
                              {schedule.dia_semana}
                            </Badge>
                            {!schedule.activo && (
                              <Badge variant="outline" className="text-slate-500">
                                Inactivo
                              </Badge>
                            )}
                          </div>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(schedule)}
                                className="h-8 w-8 p-0"
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(schedule)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-slate-700">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <span className={isParentOrPlayer ? "font-bold text-lg" : "font-semibold"}>
                              {schedule.hora_inicio} - {schedule.hora_fin}
                            </span>
                          </div>

                          {isParentOrPlayer ? (
                            <a
                              href={UBICACION_MAPS_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-start gap-2 text-slate-600 bg-green-50 rounded-lg p-2 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
                            >
                              <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs font-medium">{schedule.ubicacion}</span>
                              </div>
                              <ExternalLink className="w-3 h-3 text-green-600 flex-shrink-0" />
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-600">
                              <MapPin className="w-4 h-4 text-green-600" />
                              <span className="text-xs">{schedule.ubicacion}</span>
                            </div>
                          )}

                          {schedule.notas && (
                            <div className={`mt-2 pt-2 border-t ${isParentOrPlayer ? 'border-orange-200 bg-blue-50 rounded-lg p-2' : 'border-slate-200'}`}>
                              <p className={`text-xs ${isParentOrPlayer ? 'text-blue-800' : 'text-slate-600 italic'}`}>
                                {isParentOrPlayer && <strong>📝 Nota:</strong>} {schedule.notas}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Player reminder */}
      {userRole === "player" && Object.keys(schedulesByCategory).length > 0 && (
        <Card className="border-none shadow-lg bg-green-50 border-2 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                <span className="text-xl">💪</span>
              </div>
              <div>
                <p className="font-bold text-green-900 mb-1">Recuerda</p>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>✅ Llega 10 minutos antes del entrenamiento</li>
                  <li>✅ Trae tu equipación completa</li>
                  <li>✅ Hidratación y actitud positiva</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isParentOrPlayer && <ContactCard />}
    </div>
  );
}