import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, MapPin, Calendar, Trash2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import TrainingScheduleForm from "../components/training/TrainingScheduleForm";

const DIAS_ORDEN = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5
};

export default function TrainingSchedules() {
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['trainingSchedules'],
    queryFn: () => base44.entities.TrainingSchedule.list(),
    initialData: [],
  });

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

  // Agrupar horarios por categoría
  const schedulesByCategory = schedules.reduce((acc, schedule) => {
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

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Horarios de Entrenamientos</h1>
          <p className="text-slate-600 mt-1">Gestiona los horarios de entrenamientos por categoría</p>
        </div>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Total Horarios</p>
                <p className="text-3xl font-bold text-orange-600">{schedules.length}</p>
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
                  {schedules.filter(s => s.activo).length}
                </p>
              </div>
              <MapPin className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
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
      ) : Object.keys(schedulesByCategory).length === 0 ? (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">No hay horarios registrados</p>
            <p className="text-sm text-slate-400 mt-2">Haz clic en "Nuevo Horario" para añadir uno</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.keys(schedulesByCategory).sort().map(categoria => (
            <Card key={categoria} className="border-none shadow-lg bg-white overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b-2 border-orange-200">
                <CardTitle className="text-xl text-orange-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {categoria}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schedulesByCategory[categoria].map(schedule => (
                    <div
                      key={schedule.id}
                      className="border-2 border-slate-200 rounded-lg p-4 hover:border-orange-300 transition-all bg-slate-50"
                    >
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
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                          <Clock className="w-4 h-4 text-orange-600" />
                          <span className="font-semibold">
                            {schedule.hora_inicio} - {schedule.hora_fin}
                          </span>
                        </div>

                        {schedule.ubicacion && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span>{schedule.ubicacion}</span>
                          </div>
                        )}

                        {schedule.notas && (
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <p className="text-xs text-slate-600 italic">{schedule.notas}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}