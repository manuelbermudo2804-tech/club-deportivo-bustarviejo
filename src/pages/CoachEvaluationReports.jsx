import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Calendar, User, Star, Search, AlertCircle, Send, Mail, MessageCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import ExportButton from "../components/ExportButton";

export default function CoachEvaluationReports() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPlayer, setSelectedPlayer] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sendingReport, setSendingReport] = useState(null);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [selectedPlayerForReport, setSelectedPlayerForReport] = useState(null);
  const [sendMethod, setSendMethod] = useState("email");
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      
      // Si es entrenador (no coordinador ni admin), pre-seleccionar su primera categoría
      if (currentUser.es_entrenador && !currentUser.es_coordinador && currentUser.role !== "admin") {
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
    // Admin y coordinador ven todas las categorías
    // Entrenadores (no coordinadores) solo ven sus categorías asignadas
    const categories = (user?.role === "admin" || user?.es_coordinador) 
      ? allCategories 
      : (user?.categorias_entrena || []);

  // Filtrar asistencias según rol y permisos
  const filteredAttendances = attendances.filter(att => {
    // Admin y coordinador: ven TODAS las categorías (sin restricción)
    // Entrenadores (no coordinadores): SOLO ven sus categorías asignadas
    if (user?.role !== "admin" && !user?.es_coordinador) {
      // Si es entrenador pero no coordinador, filtrar por sus categorías
      const coachCategories = user?.categorias_entrena || [];
      if (!coachCategories.includes(att.categoria)) return false;
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

  const sendPlayerReport = async (stats, method) => {
    setSendingReport(stats.jugador.id);
    
    try {
      const player = stats.jugador;
      const evaluaciones = stats.evaluaciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      
      const reportHTML = `
        <h2 style="color: #ea580c;">Reporte de Asistencia y Evaluación</h2>
        <h3>${player.nombre} - ${stats.categoria}</h3>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #64748b; margin-top: 0;">📊 Resumen General</h4>
          <ul style="list-style: none; padding: 0;">
            <li>✅ <strong>Total de sesiones:</strong> ${stats.totalSesiones}</li>
            <li>⭐ <strong>Promedio de actitud:</strong> ${stats.promedioActitud}/5</li>
            <li>📅 <strong>Periodo:</strong> ${format(new Date(evaluaciones[evaluaciones.length - 1].fecha), 'dd/MM/yyyy')} - ${format(new Date(evaluaciones[0].fecha), 'dd/MM/yyyy')}</li>
          </ul>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">
          <strong>📧 Reporte generado por:</strong> ${user.full_name || user.email}<br>
          <strong>📅 Fecha:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}
        </p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
        
        <p style="color: #64748b; font-size: 14px;">
          Para cualquier consulta, contacta con el club:<br>
          📧 <a href="mailto:cdbustarviejo@gmail.com" style="color: #ea580c;">cdbustarviejo@gmail.com</a>
        </p>
      `;

      const reportText = `
Estimados padres/tutores,

A continuación el reporte de asistencia y evaluación de ${player.nombre}.

====================================
REPORTE DE ASISTENCIA Y EVALUACION
====================================

Jugador: ${player.nombre}
Categoria: ${stats.categoria}
Periodo: ${format(new Date(evaluaciones[evaluaciones.length - 1].fecha), 'dd/MM/yyyy')} - ${format(new Date(evaluaciones[0].fecha), 'dd/MM/yyyy')}

====================================
RESUMEN
====================================

Total de sesiones: ${stats.totalSesiones}
Actitud promedio: ${stats.promedioActitud}/5

====================================

Reporte generado por: ${user.full_name || user.email}
Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}

Para cualquier consulta, contacta con el club:
cdbustarviejo@gmail.com

Atentamente,
CD Bustarviejo
      `.trim();
      
      if (method === 'email' || method === 'both') {
        if (player.email_padre) {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Evaluaciones",
            to: player.email_padre,
            subject: `Reporte de Asistencia y Evaluación - ${player.nombre}`,
            body: reportHTML
          });
        }
        
        if (player.email_tutor_2) {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Evaluaciones",
            to: player.email_tutor_2,
            subject: `Reporte de Asistencia y Evaluación - ${player.nombre}`,
            body: reportHTML
          });
        }
      }

      if (method === 'chat' || method === 'both') {
        // Enviar mensaje individual al padre principal
        if (player.email_padre) {
          await base44.entities.ChatMessage.create({
            remitente_email: user.email,
            remitente_nombre: user.full_name,
            destinatario_email: player.email_padre,
            destinatario_nombre: `Padre de ${player.nombre}`,
            mensaje: reportText,
            prioridad: "Normal",
            tipo: "admin_a_grupo",
            deporte: stats.categoria,
            grupo_id: stats.categoria,
            leido: false,
            archivos_adjuntos: []
          });
        }
        
        // Enviar mensaje individual al tutor 2 si existe
        if (player.email_tutor_2) {
          await base44.entities.ChatMessage.create({
            remitente_email: user.email,
            remitente_nombre: user.full_name,
            destinatario_email: player.email_tutor_2,
            destinatario_nombre: `Tutor 2 de ${player.nombre}`,
            mensaje: reportText,
            prioridad: "Normal",
            tipo: "admin_a_grupo",
            deporte: stats.categoria,
            grupo_id: stats.categoria,
            leido: false,
            archivos_adjuntos: []
          });
        }
      }
      
      toast.success(`Reporte enviado correctamente`);
    } catch (error) {
      console.error("Error sending report:", error);
      toast.error("Error al enviar el reporte");
    } finally {
      setSendingReport(null);
      setShowSendDialog(false);
      setSelectedPlayerForReport(null);
    }
  };

  const handleOpenSendDialog = (stats) => {
    setSelectedPlayerForReport(stats);
    setShowSendDialog(true);
    setSendMethod("email");
    
    // Establecer periodo por defecto: últimos 30 días
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    setReportDateTo(today.toISOString().split('T')[0]);
    setReportDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  };

  const handleConfirmSend = () => {
    if (selectedPlayerForReport) {
      // Filtrar evaluaciones por el periodo seleccionado
      const filteredEvaluations = selectedPlayerForReport.evaluaciones.filter(ev => 
        ev.fecha >= reportDateFrom && ev.fecha <= reportDateTo
      );
      
      if (filteredEvaluations.length === 0) {
        toast.error("No hay evaluaciones en el periodo seleccionado");
        return;
      }
      
      // Calcular estadísticas para el periodo filtrado
      const actitudSum = filteredEvaluations.reduce((sum, ev) => sum + (ev.actitud || 0), 0);
      const promedioActitud = (actitudSum / filteredEvaluations.length).toFixed(1);
      
      const filteredStats = {
        ...selectedPlayerForReport,
        evaluaciones: filteredEvaluations,
        totalSesiones: filteredEvaluations.length,
        promedioActitud: promedioActitud
      };
      
      sendPlayerReport(filteredStats, sendMethod);
    }
  };

  if (!user || (!user.es_entrenador && !user.es_coordinador && user.role !== "admin")) {
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
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Reporte - {selectedPlayerForReport?.jugador.nombre}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Periodo del Reporte</Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Desde</label>
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-600 mb-1 block">Hasta</label>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">¿Cómo deseas enviar el reporte?</Label>
              <RadioGroup value={sendMethod} onValueChange={setSendMethod}>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="email" id="email" />
                  <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-xs text-slate-500">Enviar por correo electrónico</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="chat" id="chat" />
                  <Label htmlFor="chat" className="flex items-center gap-2 cursor-pointer flex-1">
                    <MessageCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="font-medium">Chat del Grupo</p>
                      <p className="text-xs text-slate-500">Publicar en el chat de la categoría</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                  <RadioGroupItem value="both" id="both" />
                  <Label htmlFor="both" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Send className="w-4 h-4 text-orange-600" />
                    <div>
                      <p className="font-medium">Ambos</p>
                      <p className="text-xs text-slate-500">Email + Chat del grupo</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowSendDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmSend}
                disabled={sendingReport}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {sendingReport ? "Enviando..." : "Enviar Reporte"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">📊 Evaluaciones de Entrenadores</h1>
          <p className="text-slate-600 mt-1">
            {user?.role === "admin" || user?.es_coordinador
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
                    <Button
                      onClick={() => handleOpenSendDialog(stats)}
                      disabled={sendingReport === stats.jugador.id}
                      className="w-full bg-orange-600 hover:bg-orange-700 mt-3"
                      size="sm"
                    >
                      {sendingReport === stats.jugador.id ? (
                        <>
                          <Mail className="w-4 h-4 mr-2 animate-pulse" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Reporte a Padres
                        </>
                      )}
                    </Button>
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