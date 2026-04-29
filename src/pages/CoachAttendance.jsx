import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, XCircle, Clock, User, Save, AlertCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import AttendanceStats from "../components/coach/AttendanceStats";
import ExportButton from "../components/ExportButton";
import { playerInCategory } from "../components/utils/playerCategoryFilter";
import { useStaffPlayers } from "../hooks/useStaffPlayers";

export default function CoachAttendance() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState({});
  const [activeTab, setActiveTab] = useState("attendance");
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Combinar entrenador + coordinador (algunos son ambos)
      const cats = [...new Set([
        ...(currentUser.categorias_entrena || []),
        ...(currentUser.categorias_coordina || [])
      ])];
      if (cats.length > 0) setSelectedCategory(cats[0]);
    };
    fetchUser();
  }, []);

  const userCategories = React.useMemo(() => {
    if (!user) return [];
    return [...new Set([
      ...(user.categorias_entrena || []),
      ...(user.categorias_coordina || [])
    ])];
  }, [user]);

  const { data: players } = useStaffPlayers(user);

  const { data: attendances } = useQuery({
    queryKey: ['attendances', selectedCategory, selectedDate],
    queryFn: () => base44.entities.Attendance.list(),
    initialData: [],
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (data) => {
      const existing = attendances.find(a => 
        a.categoria === selectedCategory && 
        a.fecha === selectedDate
      );
      
      if (existing) {
        return base44.entities.Attendance.update(existing.id, data);
      } else {
        return base44.entities.Attendance.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendances'] });
      setHasUnsavedChanges(false);
      setLastSavedData(attendanceData);
      toast.success("✅ Asistencia guardada correctamente");
    },
    onError: () => {
      toast.error("❌ Error al guardar la asistencia");
    }
  });

  const categoryPlayers = players.filter(p => 
    p.activo !== false && playerInCategory(p, selectedCategory)
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const categoryAttendances = attendances.filter(a => 
    a.categoria === selectedCategory
  );

  useEffect(() => {
    const existing = attendances.find(a => 
      a.categoria === selectedCategory && 
      a.fecha === selectedDate
    );
    
    if (existing) {
      const data = {};
      existing.asistencias.forEach(a => {
        data[a.jugador_id] = a.estado;
      });
      setAttendanceData(data);
      setLastSavedData(data);
      setHasUnsavedChanges(false);
    } else {
      setAttendanceData({});
      setLastSavedData({});
      setHasUnsavedChanges(false);
    }
  }, [selectedCategory, selectedDate, attendances]);

  const handleAttendanceChange = (playerId, status) => {
    setAttendanceData(prev => {
      const newData = {
        ...prev,
        [playerId]: status
      };
      setHasUnsavedChanges(true);
      return newData;
    });
  };

  const handleSave = () => {
    const asistencias = categoryPlayers.map(p => ({
      jugador_id: p.id,
      jugador_nombre: p.nombre,
      estado: attendanceData[p.id] || "ausente",
      observaciones: ""
    }));

    const data = {
      fecha: selectedDate,
      categoria: selectedCategory,
      entrenador_email: user.email,
      entrenador_nombre: user.full_name,
      asistencias
    };

    saveAttendanceMutation.mutate(data);
  };

  const getStatusCount = (status) => {
    return categoryPlayers.filter(p => attendanceData[p.id] === status).length;
  };

  const prepareExportData = () => {
    return categoryAttendances.map(att => ({
      Fecha: att.fecha,
      Entrenador: att.entrenador_nombre,
      Presentes: att.asistencias.filter(a => a.estado === "presente").length,
      Ausentes: att.asistencias.filter(a => a.estado === "ausente").length,
      Justificados: att.asistencias.filter(a => a.estado === "justificado").length,
      Tardanzas: att.asistencias.filter(a => a.estado === "tardanza").length,
      Total: att.asistencias.length
    }));
  };

  const statusConfig = {
    presente: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Presente" },
    ausente: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Ausente" },
    justificado: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "Justificado" },
    tardanza: { icon: Clock, color: "text-orange-600", bg: "bg-orange-100", label: "Tardanza" }
  };

  if (!user || userCategories.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tienes equipos asignados</p>
        </div>
      </div>
    );
  }

  const existing = attendances.find(a => 
    a.categoria === selectedCategory && 
    a.fecha === selectedDate
  );

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">✅ Control de Asistencia</h1>
          <p className="text-slate-600 mt-1 text-sm">Registra la asistencia de tus entrenamientos</p>
        </div>
        {existing && activeTab === "attendance" && (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            ✅ Guardado {format(new Date(existing.updated_date), "dd/MM HH:mm")}
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="attendance">
            <Calendar className="w-4 h-4 mr-2" />
            Registro
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4 mt-4">
          {hasUnsavedChanges && (
            <Card className="border-2 border-orange-500 bg-orange-50">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-2 text-orange-900">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Tienes cambios sin guardar</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Object.entries(statusConfig).map(([status, config]) => {
              const Icon = config.icon;
              return (
                <Card key={status} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${config.color}`} />
                      <div>
                        <p className="text-xs text-slate-500">{config.label}</p>
                        <p className="text-2xl font-bold text-slate-900">{getStatusCount(status)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="border shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Equipo</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {userCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {categoryPlayers.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl shadow-md">
              <p className="text-slate-500 text-sm">No hay jugadores en este equipo</p>
            </div>
          ) : (
            <Card className="border shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {categoryPlayers.length} Jugadores
                  </CardTitle>
                  <Button 
                    onClick={handleSave} 
                    disabled={!hasUnsavedChanges || saveAttendanceMutation.isPending}
                    className={`h-8 text-sm transition-all ${
                      hasUnsavedChanges 
                        ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' 
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saveAttendanceMutation.isPending ? 'Guardando...' : hasUnsavedChanges ? 'Guardar Cambios' : 'Guardado'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryPlayers.map(player => (
                    <div key={player.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {player.foto_url ? (
                          <img src={player.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                            {player.nombre.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium text-sm">{player.nombre}</span>
                      </div>
                      <div className="flex gap-1">
                        {Object.entries(statusConfig).map(([status, config]) => {
                          const Icon = config.icon;
                          const isSelected = attendanceData[player.id] === status;
                          return (
                            <button
                              key={status}
                              onClick={() => handleAttendanceChange(player.id, status)}
                              className={`p-2 rounded-lg transition-all ${
                                isSelected 
                                  ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-${config.color.split('-')[1]}-400 scale-110` 
                                  : 'bg-white hover:bg-slate-100 text-slate-400 hover:scale-105'
                              }`}
                              title={config.label}
                            >
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <ExportButton 
              data={prepareExportData()} 
              filename={`asistencia_${selectedCategory.replace(/\s+/g, '_')}`}
            />
          </div>
          <AttendanceStats 
            players={categoryPlayers} 
            attendances={categoryAttendances}
            categoryFilter={selectedCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}