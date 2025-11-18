import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Star, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ExportButton from "../components/ExportButton";

export default function CoachEvaluationReports() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Si es entrenador, pre-seleccionar su primera categoría
      if (currentUser.es_entrenador && !currentUser.role === "admin") {
        const categories = currentUser.categorias_entrena || [];
        if (categories.length === 1) {
          setSelectedCategory(categories[0]);
        }
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
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list('-fecha'),
    initialData: [],
  });

  // Filtrar categorías según el rol del usuario
  const allCategories = [...new Set(players.map(p => p.deporte).filter(Boolean))];
  const categories = user?.role === "admin" 
    ? allCategories 
    : (user?.categorias_entrena || []);

  // Filtrar asistencias según rol y permisos
  const filteredAttendances = attendances.filter(att => {
    // Filtrar por categorías del entrenador si no es admin
    if (user?.role !== "admin" && user?.categorias_entrena) {
      if (!user.categorias_entrena.includes(att.categoria)) return false;
    }
    
    if (selectedCategory !== "all" && att.categoria !== selectedCategory) return false;
    if (dateFrom && att.fecha < dateFrom) return false;
    if (dateTo && att.fecha > dateTo) return false;
    return true;
  });

  // Extraer todas las evaluaciones individuales
  const allEvaluations = [];
  
  console.log('Total attendances:', attendances.length);
  console.log('Filtered attendances:', filteredAttendances.length);
  
  filteredAttendances.forEach(attendance => {
    console.log('Processing attendance:', attendance.fecha, attendance.categoria, attendance.asistencias?.length);
    
    attendance.asistencias?.forEach(asistencia => {
      console.log('Asistencia:', asistencia.jugador_nombre, 'estado:', asistencia.estado, 'actitud:', asistencia.actitud, 'observaciones:', asistencia.observaciones);
      
      // Incluir TODAS las asistencias con estado presente o tardanza
      if (asistencia.estado === 'presente' || asistencia.estado === 'tardanza') {
        const player = players.find(p => p.id === asistencia.jugador_id);
        if (player) {
          if (selectedPlayer !== "all" && asistencia.jugador_id !== selectedPlayer) return;
          if (searchTerm && !player.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return;

          allEvaluations.push({
            ...asistencia,
            fecha: attendance.fecha,
            categoria: attendance.categoria,
            entrenador_nombre: attendance.entrenador_nombre,
            jugador: player
          });
        }
      }
    });
  });
  
  console.log('Total evaluations found:', allEvaluations.length);

  // Estadísticas por jugador
  const playerStats = {};
  allEvaluations.forEach(ev => {
    if (!playerStats[ev.jugador_id]) {
      playerStats[ev.jugador_id] = {
        jugador: ev.jugador,
        categoria: ev.categoria,
        totalSesiones: 0,
        promedioActitud: 0,
        evaluaciones: []
      };
    }
    playerStats[ev.jugador_id].totalSesiones++;
    playerStats[ev.jugador_id].evaluaciones.push(ev);
  });

  // Calcular promedios
  Object.keys(playerStats).forEach(playerId => {
    const stats = playerStats[playerId];
    const actitudSum = stats.evaluaciones.reduce((sum, ev) => sum + (ev.actitud || 0), 0);
    stats.promedioActitud = (actitudSum / stats.totalSesiones).toFixed(1);
  });

  const playersWithStats = Object.values(playerStats).sort((a, b) => 
    b.totalSesiones - a.totalSesiones
  );

  // Datos para exportar
  const exportData = allEvaluations.map(ev => ({
    Fecha: format(new Date(ev.fecha), 'dd/MM/yyyy'),
    Jugador: ev.jugador.nombre,
    Categoria: ev.categoria,
    Entrenador: ev.entrenador_nombre,
    Actitud: `${ev.actitud}/5`,
    Observaciones: ev.observaciones || '-'
  }));

  if (!user || (!user.es_entrenador && user.role !== "admin")) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso Restringido</h2>
            <p className="text-red-700">Solo administradores y entrenadores pueden ver este reporte</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">📊 Evaluaciones de Entrenadores</h1>
          <p className="text-slate-600 mt-1">
            {user?.role === "admin" 
              ? "Historial completo de actitud evaluada por los entrenadores" 
              : "Historial de tus evaluaciones de actitud"}
          </p>
        </div>
        {allEvaluations.length > 0 && (
          <ExportButton 
            data={exportData} 
            filename="evaluaciones_entrenadores"
          />
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Categoría</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Buscar Jugador</label>
              <div className="relative">
                <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-8 h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{allEvaluations.length}</div>
              <div className="text-sm text-slate-600">Evaluaciones totales</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{playersWithStats.length}</div>
              <div className="text-sm text-slate-600">Jugadores evaluados</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {allEvaluations.length > 0 
                  ? (allEvaluations.reduce((sum, ev) => sum + ev.actitud, 0) / allEvaluations.length).toFixed(1)
                  : '0'}
              </div>
              <div className="text-sm text-slate-600">Promedio general actitud</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="por_jugador" className="space-y-4">
        <TabsList>
          <TabsTrigger value="por_jugador">Por Jugador</TabsTrigger>
          <TabsTrigger value="detalle">Detalle Cronológico</TabsTrigger>
        </TabsList>

        <TabsContent value="por_jugador" className="space-y-4">
          {playersWithStats.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No hay evaluaciones disponibles</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playersWithStats.map(stats => (
                <Card key={stats.jugador.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      {stats.jugador.foto_url ? (
                        <img src={stats.jugador.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
                          {stats.jugador.nombre.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <CardTitle className="text-sm">{stats.jugador.nombre}</CardTitle>
                        <p className="text-xs text-slate-500">{stats.categoria}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Sesiones:</span>
                      <Badge variant="outline">{stats.totalSesiones}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">Actitud promedio:</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-orange-600">{stats.promedioActitud}/5</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-slate-600 mb-2">Últimas evaluaciones:</p>
                      <div className="space-y-1">
                        {stats.evaluaciones.slice(0, 3).map((ev, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between bg-slate-50 p-2 rounded">
                            <span className="text-slate-600">
                              {format(new Date(ev.fecha), 'dd/MM/yy')}
                            </span>
                            <span className="font-medium">{'⭐'.repeat(ev.actitud)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="detalle" className="space-y-4">
          {allEvaluations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">No hay evaluaciones disponibles</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b">
                      <tr>
                        <th className="p-3 text-left text-xs font-semibold text-slate-700">Fecha</th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-700">Jugador</th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-700">Categoría</th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-700">Entrenador</th>
                        <th className="p-3 text-center text-xs font-semibold text-slate-700">Actitud</th>
                        <th className="p-3 text-left text-xs font-semibold text-slate-700">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allEvaluations.map((ev, idx) => (
                        <tr key={idx} className="border-b hover:bg-slate-50">
                          <td className="p-3 text-xs">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              {format(new Date(ev.fecha), "dd MMM yyyy", { locale: es })}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {ev.jugador.foto_url ? (
                                <img src={ev.jugador.foto_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
                                  {ev.jugador.nombre.charAt(0)}
                                </div>
                              )}
                              <span className="text-xs font-medium">{ev.jugador.nombre}</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-slate-600">{ev.categoria}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <span className="text-xs">{ev.entrenador_nombre}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1 bg-orange-50 px-2 py-1 rounded">
                              <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                              <span className="text-xs font-bold text-orange-600">{ev.actitud}/5</span>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-slate-600">
                            {ev.observaciones || <span className="text-slate-400">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}