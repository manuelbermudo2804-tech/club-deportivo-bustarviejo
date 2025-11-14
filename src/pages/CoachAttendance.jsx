import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CoachAttendance() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      if (currentUser.categorias_entrena?.length > 0) {
        setSelectedCategory(currentUser.categorias_entrena[0]);
      }
    };
    fetchUser();
  }, []);

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

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
      toast.success("Asistencia guardada");
    },
  });

  const categoryPlayers = players.filter(p => 
    p.deporte === selectedCategory && p.activo
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

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
    } else {
      setAttendanceData({});
    }
  }, [selectedCategory, selectedDate, attendances]);

  const handleAttendanceChange = (playerId, status) => {
    setAttendanceData(prev => ({
      ...prev,
      [playerId]: status
    }));
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

  const statusConfig = {
    presente: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Presente" },
    ausente: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Ausente" },
    justificado: { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "Justificado" },
    tardanza: { icon: Clock, color: "text-orange-600", bg: "bg-orange-100", label: "Tardanza" }
  };

  if (!user || !user.categorias_entrena || user.categorias_entrena.length === 0) {
    return (
      <div className="p-4 lg:p-6">
        <div className="text-center py-12">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No tienes equipos asignados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">✅ Control de Asistencia</h1>
        <p className="text-slate-600 mt-1 text-sm">Registra la asistencia de tus entrenamientos</p>
      </div>

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
                  {user.categorias_entrena.map(cat => (
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
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 h-8 text-sm">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Guardar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryPlayers.map(player => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    {player.foto_url ? (
                      <img src={player.foto_url} className="w-8 h-8 rounded-full object-cover" />
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
                              ? `${config.bg} ${config.color} ring-2 ring-offset-1 ring-${config.color.split('-')[1]}-400` 
                              : 'bg-white hover:bg-slate-100 text-slate-400'
                          }`}
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
    </div>
  );
}