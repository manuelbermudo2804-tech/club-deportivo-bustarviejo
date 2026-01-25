import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, Users, BarChart3, CheckCircle2, XCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

export default function AdminAttendance() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sessionData, setSessionData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const queryClient = useQueryClient();

  // Cargar todos los jugadores para obtener categorías y nombres
  const { data: allPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Obtener categorías únicas
  const categories = React.useMemo(() => {
    return [...new Set(allPlayers.map(p => p.deporte).filter(Boolean))].sort();
  }, [allPlayers]);

  // Cargar asistencias de la fecha seleccionada (todas las categorías)
  const { data: dailyAttendances } = useQuery({
    queryKey: ['attendances', 'admin', selectedDate],
    queryFn: async () => {
      // Filtrar por fecha en el cliente o servidor si la API lo permite
      // Como list() trae todo, idealmente usaríamos filter({ fecha: selectedDate })
      return base44.entities.Attendance.filter({ fecha: selectedDate });
    },
    initialData: [],
  });

  // Mutation para guardar asistencia (modo edición)
  const saveSessionMutation = useMutation({
    mutationFn: async (data) => {
      const existing = dailyAttendances.find(a => 
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
      toast.success("✅ Asistencia actualizada correctamente");
    },
    onError: () => {
      toast.error("❌ Error al guardar la asistencia");
    }
  });

  // Preparar datos para el modo edición
  useEffect(() => {
    if (selectedCategory === "all") return;

    const existing = dailyAttendances.find(a => a.categoria === selectedCategory);
    if (existing) {
      const data = {};
      existing.asistencias.forEach(a => {
        data[a.jugador_id] = {
          asistencia: a.estado,
          observaciones: a.observaciones
        };
      });
      setSessionData(data);
      setHasUnsavedChanges(false);
    } else {
      setSessionData({});
      setHasUnsavedChanges(false);
    }
  }, [selectedCategory, selectedDate, dailyAttendances]);

  const handleAttendanceChange = (playerId, status) => {
    setSessionData(prev => ({
      ...prev,
      [playerId]: { ...prev[playerId], asistencia: status }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    const categoryPlayers = allPlayers.filter(p => p.deporte === selectedCategory && p.activo);
    const asistencias = categoryPlayers.map(p => ({
      jugador_id: p.id,
      jugador_nombre: p.nombre,
      estado: sessionData[p.id]?.asistencia || "ausente",
      observaciones: sessionData[p.id]?.observaciones || ""
    }));

    const currentUser = await base44.auth.me();

    saveSessionMutation.mutate({
      fecha: selectedDate,
      categoria: selectedCategory,
      entrenador_email: currentUser.email, // Admin actúa como recorder
      entrenador_nombre: currentUser.full_name,
      asistencias
    });
  };

  // Calcular estadísticas globales del día
  const getDailyStats = () => {
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalJustified = 0;
    
    dailyAttendances.forEach(record => {
      record.asistencias?.forEach(a => {
        if (a.estado === 'presente') totalPresent++;
        if (a.estado === 'ausente') totalAbsent++;
        if (a.estado === 'tardanza') totalLate++;
        if (a.estado === 'justificado') totalJustified++;
      });
    });

    const total = totalPresent + totalAbsent + totalLate + totalJustified;
    const percentage = total > 0 ? Math.round((totalPresent / total) * 100) : 0;

    return { totalPresent, totalAbsent, totalLate, totalJustified, percentage };
  };

  const dailyStats = getDailyStats();

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-600" />
            Control de Asistencia Global
          </h1>
          <p className="text-slate-600">Monitorización de asistencia de todos los equipos</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border">
          <Calendar className="w-5 h-5 text-slate-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border-none focus:ring-0 text-sm font-medium text-slate-700"
          />
        </div>
      </div>

      {/* Resumen Superior */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Presentes</p>
              <p className="text-2xl font-bold text-green-900">{dailyStats.totalPresent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-red-700 font-medium">Ausentes</p>
              <p className="text-2xl font-bold text-red-900">{dailyStats.totalAbsent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">Tardanzas</p>
              <p className="text-2xl font-bold text-orange-900">{dailyStats.totalLate}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium">Asistencia Media</p>
              <p className="text-2xl font-bold text-blue-900">{dailyStats.percentage}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="overview">Resumen por Equipos</TabsTrigger>
          <TabsTrigger value="manage">Gestionar Detalle</TabsTrigger>
        </TabsList>

        {/* PESTAÑA RESUMEN */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(category => {
              const record = dailyAttendances.find(a => a.categoria === category);
              const playersInCat = allPlayers.filter(p => p.deporte === category && p.activo).length;
              
              const presentes = record?.asistencias?.filter(a => a.estado === 'presente').length || 0;
              const porcentaje = playersInCat > 0 ? (presentes / playersInCat) * 100 : 0;
              const statusColor = porcentaje >= 80 ? 'bg-green-500' : porcentaje >= 50 ? 'bg-orange-500' : 'bg-red-500';

              return (
                <Card key={category} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setSelectedCategory(category);
                  document.querySelector('[value="manage"]').click();
                }}>
                  <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-bold truncate pr-2" title={category}>
                      {category}
                    </CardTitle>
                    {record ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                        Registrado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400">
                        Pendiente
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-2 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Asistencia:</span>
                      <span className="font-semibold">{presentes} / {playersInCat}</span>
                    </div>
                    <Progress value={porcentaje} className={`h-2 ${statusColor}`} />
                    {record && (
                      <p className="text-xs text-slate-400 mt-2">
                        Registrado por: {record.entrenador_nombre?.split(' ')[0]}
                      </p>
                    )}
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-1 h-7">
                      Ver detalle <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* PESTAÑA GESTIÓN */}
        <TabsContent value="manage" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Gestión Detallada</CardTitle>
                <p className="text-sm text-slate-500">Selecciona un equipo para ver o editar la asistencia</p>
              </div>
              <div className="w-[250px]">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar Equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">-- Selecciona Equipo --</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedCategory === "all" ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Selecciona un equipo arriba para comenzar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Header de edición */}
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                    <div className="text-sm text-slate-600">
                      Mostrando: <span className="font-bold text-slate-900">{selectedCategory}</span>
                    </div>
                    <Button 
                      onClick={handleSave} 
                      disabled={!hasUnsavedChanges}
                      className={`${hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' : 'bg-slate-200 text-slate-500'}`}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </Button>
                  </div>

                  {/* Tabla de Jugadores */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
                        <tr>
                          <th className="p-3 text-left">Jugador</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-left">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allPlayers.filter(p => p.deporte === selectedCategory && p.activo).map(player => {
                          const status = sessionData[player.id]?.asistencia || 'ausente';
                          return (
                            <tr key={player.id} className="bg-white hover:bg-slate-50">
                              <td className="p-3">
                                <div className="flex items-center gap-3">
                                  {player.foto_url ? (
                                    <img src={player.foto_url} className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                                      {player.nombre.charAt(0)}
                                    </div>
                                  )}
                                  <span className="font-medium text-sm">{player.nombre}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex justify-center gap-1">
                                  {[
                                    { id: 'presente', icon: CheckCircle2, color: 'text-green-600', activeBg: 'bg-green-100' },
                                    { id: 'ausente', icon: XCircle, color: 'text-red-600', activeBg: 'bg-red-100' },
                                    { id: 'tardanza', icon: Clock, color: 'text-orange-600', activeBg: 'bg-orange-100' }
                                  ].map(opt => (
                                    <button
                                      key={opt.id}
                                      onClick={() => handleAttendanceChange(player.id, opt.id)}
                                      className={`p-2 rounded-md transition-all ${
                                        status === opt.id 
                                          ? `${opt.activeBg} ${opt.color} ring-1 ring-current` 
                                          : 'text-slate-300 hover:bg-slate-100'
                                      }`}
                                    >
                                      <opt.icon className="w-5 h-5" />
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3">
                                <input
                                  type="text"
                                  placeholder="Nota..."
                                  className="w-full text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-orange-500 outline-none"
                                  value={sessionData[player.id]?.observaciones || ''}
                                  onChange={(e) => {
                                    setSessionData(prev => ({
                                      ...prev,
                                      [player.id]: { ...prev[player.id], observaciones: e.target.value }
                                    }));
                                    setHasUnsavedChanges(true);
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}