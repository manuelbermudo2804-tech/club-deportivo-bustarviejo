import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import AttendanceSheet from "../components/attendance/AttendanceSheet";

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth <= 8) {
    return `${currentYear - 1}/${currentYear}`;
  }
  return `${currentYear}/${currentYear + 1}`;
};

export default function AdminAttendance() {
  const currentSeason = getCurrentSeason();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("");
  
  const queryClient = useQueryClient();

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: attendances } = useQuery({
    queryKey: ['attendances', selectedDate, selectedCategory],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    initialData: [],
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceData) => {
      // Buscar si ya existe un registro para este jugador en esta fecha
      const existing = attendances.find(
        a => a.fecha === attendanceData.fecha && 
             a.jugador_id === attendanceData.jugador_id
      );

      if (existing) {
        return await base44.entities.Attendance.update(existing.id, attendanceData);
      } else {
        return await base44.entities.Attendance.create(attendanceData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
    },
  });

  const categories = [
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

  const categoryPlayers = selectedCategory 
    ? players.filter(p => p.deporte === selectedCategory && p.activo)
    : [];

  const todayAttendances = attendances.filter(
    a => a.fecha === selectedDate && a.categoria === selectedCategory
  );

  const handleSaveAttendance = async (playerId, playerName, asistio, justificado, motivo, notas) => {
    const attendanceData = {
      fecha: selectedDate,
      categoria: selectedCategory,
      jugador_id: playerId,
      jugador_nombre: playerName,
      asistio,
      justificado: asistio ? false : justificado,
      motivo_ausencia: asistio ? "" : motivo,
      notas: notas || "",
      temporada: currentSeason
    };

    await saveAttendanceMutation.mutateAsync(attendanceData);
  };

  // Calcular estadísticas
  const totalAsistencias = todayAttendances.filter(a => a.asistio).length;
  const totalFaltas = todayAttendances.filter(a => !a.asistio && !a.justificado).length;
  const totalJustificadas = todayAttendances.filter(a => !a.asistio && a.justificado).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">✅ Control de Asistencia</h1>
        <p className="text-slate-600 mt-1">Registra la asistencia a entrenamientos</p>
      </div>

      {/* Estadísticas rápidas */}
      {selectedCategory && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Total Jugadores</p>
                  <p className="text-2xl font-bold text-slate-900">{categoryPlayers.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Asistencias</p>
                  <p className="text-2xl font-bold text-green-600">{totalAsistencias}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Faltas</p>
                  <p className="text-2xl font-bold text-red-600">{totalFaltas}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Justificadas</p>
                  <p className="text-2xl font-bold text-orange-600">{totalJustificadas}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Selecciona Entrenamiento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha del Entrenamiento</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.includes("Baloncesto") ? "🏀" : "⚽"} {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedCategory && (
            <p className="text-sm text-slate-600">
              📅 Pasando lista para: <strong>{selectedCategory}</strong> el{" "}
              <strong>{format(new Date(selectedDate), "d 'de' MMMM, yyyy", { locale: es })}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Hoja de asistencia */}
      {selectedCategory ? (
        <AttendanceSheet
          players={categoryPlayers}
          attendances={todayAttendances}
          onSaveAttendance={handleSaveAttendance}
          isSaving={saveAttendanceMutation.isPending}
        />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Selecciona una fecha y categoría para comenzar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}