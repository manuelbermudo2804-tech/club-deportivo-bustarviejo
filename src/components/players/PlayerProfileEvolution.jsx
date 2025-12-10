import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Target, MessageSquare, Calendar, CheckCircle2, Clock, AlertCircle, Plus, Edit2, Trash2 } from "lucide-react";
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function PlayerProfileEvolution({ player, isCoach = false }) {
  const [user, setUser] = useState(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const currentSeason = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  }, []);

  // Fetch attendance data
  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances', player.id],
    queryFn: async () => {
      const all = await base44.entities.Attendance.list();
      return all.filter(a => 
        a.jugadores_asistencia?.some(j => j.jugador_id === player.id)
      );
    }
  });

  // Fetch evaluations
  const { data: evaluations = [] } = useQuery({
    queryKey: ['evaluations', player.id],
    queryFn: async () => {
      const all = await base44.entities.PlayerEvaluation.list();
      return all.filter(e => e.jugador_id === player.id).sort((a, b) => 
        new Date(b.fecha) - new Date(a.fecha)
      );
    }
  });

  // Fetch goals
  const { data: goals = [] } = useQuery({
    queryKey: ['playerGoals', player.id],
    queryFn: async () => {
      const all = await base44.entities.PlayerGoal.list();
      return all.filter(g => g.jugador_id === player.id).sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      );
    }
  });

  // Fetch development notes
  const { data: notes = [] } = useQuery({
    queryKey: ['playerNotes', player.id],
    queryFn: async () => {
      const all = await base44.entities.PlayerDevelopmentNote.list();
      return all.filter(n => n.jugador_id === player.id).sort((a, b) => 
        new Date(b.fecha_evento || b.created_date) - new Date(a.fecha_evento || a.created_date)
      );
    }
  });

  // Create/Update goal mutation
  const goalMutation = useMutation({
    mutationFn: async (goalData) => {
      if (editingGoal) {
        return await base44.entities.PlayerGoal.update(editingGoal.id, goalData);
      }
      return await base44.entities.PlayerGoal.create(goalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerGoals'] });
      setGoalDialogOpen(false);
      setEditingGoal(null);
      toast.success(editingGoal ? 'Objetivo actualizado' : 'Objetivo creado');
    }
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: (goalId) => base44.entities.PlayerGoal.delete(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerGoals'] });
      toast.success('Objetivo eliminado');
    }
  });

  // Create note mutation
  const noteMutation = useMutation({
    mutationFn: (noteData) => base44.entities.PlayerDevelopmentNote.create(noteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playerNotes'] });
      setNoteDialogOpen(false);
      toast.success('Nota añadida');
    }
  });

  // Calculate attendance chart data (last 6 months)
  const attendanceChartData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
      
      const monthAttendances = attendances.filter(a => {
        const aDate = new Date(a.fecha);
        return aDate >= monthStart && aDate <= monthEnd;
      });

      const totalSessions = monthAttendances.length;
      const attended = monthAttendances.filter(a => 
        a.jugadores_asistencia?.find(j => j.jugador_id === player.id)?.estado === "Asistió"
      ).length;

      const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

      return {
        mes: format(month, 'MMM', { locale: es }),
        asistencia: percentage,
        sesiones: totalSessions
      };
    });
  }, [attendances, player.id]);

  // Calculate evaluation chart data
  const evaluationChartData = useMemo(() => {
    const actitudeMap = {
      "Excelente": 5,
      "Buena": 4,
      "Normal": 3,
      "Mejorable": 2,
      "Preocupante": 1
    };

    return evaluations.slice(0, 10).reverse().map(ev => ({
      fecha: format(parseISO(ev.fecha), 'dd/MM', { locale: es }),
      actitud: actitudeMap[ev.actitud] || 3,
      actitudLabel: ev.actitud
    }));
  }, [evaluations]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalAttendances = attendances.length;
    const attended = attendances.filter(a => 
      a.jugadores_asistencia?.find(j => j.jugador_id === player.id)?.estado === "Asistió"
    ).length;
    const attendanceRate = totalAttendances > 0 ? Math.round((attended / totalAttendances) * 100) : 0;

    const avgAttitude = evaluations.length > 0
      ? evaluations.reduce((sum, ev) => {
          const map = { "Excelente": 5, "Buena": 4, "Normal": 3, "Mejorable": 2, "Preocupante": 1 };
          return sum + (map[ev.actitud] || 3);
        }, 0) / evaluations.length
      : 3;

    return {
      totalSessions: totalAttendances,
      attendedSessions: attended,
      attendanceRate,
      totalEvaluations: evaluations.length,
      avgAttitude: avgAttitude.toFixed(1),
      activeGoals: goals.filter(g => g.estado === "En progreso").length,
      completedGoals: goals.filter(g => g.estado === "Completado").length
    };
  }, [attendances, evaluations, goals, player.id]);

  const handleGoalSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    goalMutation.mutate({
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      entrenador_email: user.email,
      entrenador_nombre: user.full_name,
      titulo: formData.get('titulo'),
      descripcion: formData.get('descripcion'),
      categoria: formData.get('categoria'),
      progreso: editingGoal ? editingGoal.progreso : 0,
      estado: formData.get('estado') || 'Pendiente',
      fecha_limite: formData.get('fecha_limite'),
      visible_para_padres: formData.get('visible_para_padres') === 'on',
      temporada: currentSeason,
      notas_progreso: editingGoal?.notas_progreso || []
    });
  };

  const handleNoteSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    noteMutation.mutate({
      jugador_id: player.id,
      jugador_nombre: player.nombre,
      autor_email: user.email,
      autor_nombre: user.full_name,
      tipo_nota: formData.get('tipo_nota'),
      contenido: formData.get('contenido'),
      visible_para_padres: formData.get('visible_para_padres') === 'on',
      categoria: player.deporte,
      temporada: currentSeason,
      fecha_evento: formData.get('fecha_evento') || new Date().toISOString().split('T')[0]
    });
  };

  const getGoalIcon = (estado) => {
    switch(estado) {
      case "Completado": return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case "En progreso": return <Clock className="w-4 h-4 text-blue-600" />;
      case "Cancelado": return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Target className="w-4 h-4 text-slate-400" />;
    }
  };

  const getNoteColor = (tipo) => {
    switch(tipo) {
      case "Logro": return "bg-green-100 text-green-700";
      case "Progreso": return "bg-blue-100 text-blue-700";
      case "Preocupación": return "bg-red-100 text-red-700";
      case "Recomendación": return "bg-purple-100 text-purple-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.attendanceRate}%</div>
            <div className="text-xs text-slate-600">Asistencia</div>
            <div className="text-xs text-slate-400">{stats.attendedSessions}/{stats.totalSessions} sesiones</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.avgAttitude}</div>
            <div className="text-xs text-slate-600">Actitud Media</div>
            <div className="text-xs text-slate-400">{stats.totalEvaluations} evaluaciones</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completedGoals}</div>
            <div className="text-xs text-slate-600">Objetivos Logrados</div>
            <div className="text-xs text-slate-400">{stats.activeGoals} activos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">{notes.filter(n => n.visible_para_padres || isCoach).length}</div>
            <div className="text-xs text-slate-600">Notas</div>
            <div className="text-xs text-slate-400">Esta temporada</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="graficas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="graficas">📊 Gráficas</TabsTrigger>
          <TabsTrigger value="objetivos">🎯 Objetivos</TabsTrigger>
          <TabsTrigger value="notas">📝 Notas</TabsTrigger>
          <TabsTrigger value="historial">📅 Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="graficas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Evolución de Asistencia (últimos 6 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="asistencia" stroke="#f97316" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Evaluación de Actitud (últimas 10 sesiones)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={evaluationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                  <Tooltip />
                  <Bar dataKey="actitud" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="objetivos" className="space-y-4">
          {isCoach && (
            <Button onClick={() => { setEditingGoal(null); setGoalDialogOpen(true); }} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Objetivo
            </Button>
          )}

          {goals.filter(g => !isCoach ? g.visible_para_padres : true).map(goal => (
            <Card key={goal.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    {getGoalIcon(goal.estado)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{goal.titulo}</h4>
                      <p className="text-sm text-slate-600 mt-1">{goal.descripcion}</p>
                    </div>
                  </div>
                  {isCoach && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditingGoal(goal); setGoalDialogOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteGoalMutation.mutate(goal.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Badge className={getNoteColor(goal.categoria)}>{goal.categoria}</Badge>
                    <Badge variant="outline">{goal.estado}</Badge>
                  </div>
                  <Progress value={goal.progreso} className="h-2" />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Progreso: {goal.progreso}%</span>
                    {goal.fecha_limite && <span>Fecha límite: {format(parseISO(goal.fecha_limite), 'dd/MM/yyyy', { locale: es })}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {goals.filter(g => !isCoach ? g.visible_para_padres : true).length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay objetivos definidos todavía</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notas" className="space-y-4">
          {isCoach && (
            <Button onClick={() => setNoteDialogOpen(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Nota
            </Button>
          )}

          {notes.filter(n => !isCoach ? n.visible_para_padres : true).map(note => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-slate-400 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getNoteColor(note.tipo_nota)}>{note.tipo_nota}</Badge>
                      <span className="text-xs text-slate-500">
                        {format(parseISO(note.fecha_evento || note.created_date), 'dd MMM yyyy', { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{note.contenido}</p>
                    <p className="text-xs text-slate-400 mt-2">Por {note.autor_nombre}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {notes.filter(n => !isCoach ? n.visible_para_padres : true).length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay notas todavía</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-3">
          {[...evaluations.slice(0, 20)].map(ev => (
            <Card key={ev.id} className="bg-slate-50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{format(parseISO(ev.fecha), 'dd MMM yyyy', { locale: es })}</span>
                  <Badge variant="outline">{ev.actitud}</Badge>
                </div>
                {ev.observaciones && (
                  <p className="text-xs text-slate-600 mt-2">{ev.observaciones}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {evaluations.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No hay historial de evaluaciones</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Goal Dialog */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar' : 'Nuevo'} Objetivo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGoalSubmit} className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título del Objetivo</Label>
              <Input id="titulo" name="titulo" defaultValue={editingGoal?.titulo} required />
            </div>
            <div>
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" name="descripcion" defaultValue={editingGoal?.descripcion} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="categoria">Categoría</Label>
                <Select name="categoria" defaultValue={editingGoal?.categoria || "Técnica"} required>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Técnica">Técnica</SelectItem>
                    <SelectItem value="Táctica">Táctica</SelectItem>
                    <SelectItem value="Física">Física</SelectItem>
                    <SelectItem value="Mental">Mental</SelectItem>
                    <SelectItem value="Actitud">Actitud</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingGoal && (
                <div>
                  <Label htmlFor="estado">Estado</Label>
                  <Select name="estado" defaultValue={editingGoal?.estado} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                      <SelectItem value="En progreso">En progreso</SelectItem>
                      <SelectItem value="Completado">Completado</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="fecha_limite">Fecha Límite</Label>
              <Input type="date" id="fecha_limite" name="fecha_limite" defaultValue={editingGoal?.fecha_limite} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="visible_para_padres" name="visible_para_padres" defaultChecked={editingGoal?.visible_para_padres !== false} />
              <Label htmlFor="visible_para_padres">Visible para padres</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGoalDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingGoal ? 'Guardar' : 'Crear'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Nota de Desarrollo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleNoteSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tipo_nota">Tipo de Nota</Label>
              <Select name="tipo_nota" defaultValue="Observación" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Observación">Observación</SelectItem>
                  <SelectItem value="Progreso">Progreso</SelectItem>
                  <SelectItem value="Preocupación">Preocupación</SelectItem>
                  <SelectItem value="Logro">Logro</SelectItem>
                  <SelectItem value="Recomendación">Recomendación</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contenido">Contenido</Label>
              <Textarea id="contenido" name="contenido" rows={4} required />
            </div>
            <div>
              <Label htmlFor="fecha_evento">Fecha</Label>
              <Input type="date" id="fecha_evento" name="fecha_evento" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>
            <div className="flex items-center gap-2">
              <Switch id="visible_para_padres" name="visible_para_padres" defaultChecked />
              <Label htmlFor="visible_para_padres">Visible para padres</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Nota</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}