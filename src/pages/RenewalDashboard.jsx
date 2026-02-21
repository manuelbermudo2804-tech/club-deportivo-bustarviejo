import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, RefreshCw, AlertTriangle, CheckCircle2, Clock, 
  Mail, Search, Filter, Send, XCircle, RotateCcw, Download,
  Settings, BarChart3, MessageSquare, Zap, Phone
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";

export default function RenewalDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();

  const [daysFilter, setDaysFilter] = useState("all");

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allReminders = [] } = useQuery({
    queryKey: ['renewalReminders'],
    queryFn: () => base44.entities.Reminder.list(),
  });

  // Estadísticas
  const stats = useMemo(() => {
    const total = allPlayers.length;
    const renovados = allPlayers.filter(p => 
      p.estado_renovacion === "renovado" && 
      p.temporada_renovacion === seasonConfig?.temporada
    ).length;
    const noRenuevan = allPlayers.filter(p => 
      p.estado_renovacion === "no_renueva" && 
      p.temporada_renovacion === seasonConfig?.temporada
    ).length;
    const pendientes = allPlayers.filter(p => 
      p.estado_renovacion === "pendiente" && 
      p.temporada_renovacion === seasonConfig?.temporada
    ).length;

    const tasaRenovacion = total > 0 ? Math.round((renovados / total) * 100) : 0;

    // Por categoría
    const porCategoria = {};
    allPlayers.forEach(p => {
      if (!porCategoria[p.deporte]) {
        porCategoria[p.deporte] = { total: 0, renovados: 0, pendientes: 0, noRenuevan: 0 };
      }
      porCategoria[p.deporte].total++;
      if (p.estado_renovacion === "renovado" && p.temporada_renovacion === seasonConfig?.temporada) {
        porCategoria[p.deporte].renovados++;
      } else if (p.estado_renovacion === "pendiente" && p.temporada_renovacion === seasonConfig?.temporada) {
        porCategoria[p.deporte].pendientes++;
      } else if (p.estado_renovacion === "no_renueva" && p.temporada_renovacion === seasonConfig?.temporada) {
        porCategoria[p.deporte].noRenuevan++;
      }
    });

    return { total, renovados, pendientes, noRenuevan, tasaRenovacion, porCategoria };
  }, [allPlayers, seasonConfig]);

  // Familias que NO han renovado
  const familiasNoRenovadas = useMemo(() => {
    const jugadoresPendientes = allPlayers.filter(p => 
      p.estado_renovacion === "pendiente" && 
      p.temporada_renovacion === seasonConfig?.temporada
    );

    // Agrupar por email de padre O email_jugador (adultos +18)
    const familias = {};
    jugadoresPendientes.forEach(player => {
      // Si es jugador +18 con email propio, agrupar por su email
      const email = (player.es_mayor_edad && player.email_jugador) 
        ? player.email_jugador 
        : player.email_padre;
      if (!email) return;
      
      if (!familias[email]) {
        const usuario = allUsers.find(u => u.email === email);
        const reminders = allReminders
          .filter(r => r.email_padre === email && r.enviado)
          .sort((a, b) => new Date(b.fecha_enviado || b.created_date) - new Date(a.fecha_enviado || a.created_date));
        const lastReminder = reminders[0];
        
        familias[email] = {
          email,
          nombre: usuario?.full_name || email,
          telefono: player.telefono || null,
          jugadores: [],
          esAdulto: !!(player.es_mayor_edad && player.email_jugador),
          ultimoRecordatorio: lastReminder ? (lastReminder.fecha_enviado || lastReminder.created_date) : null
        };
      }
      familias[email].jugadores.push(player);
    });

    return Object.values(familias);
  }, [allPlayers, allUsers, allReminders, seasonConfig]);

  const sendReminderMutation = useMutation({
    mutationFn: async (familias) => {
      for (const familia of familias) {
        const jugadoresNombres = familia.jugadores.map(j => j.nombre).join(", ");
        
        await base44.functions.invoke('sendEmail', {
          to: familia.email,
          subject: `⏰ Recordatorio: Renovación pendiente - Temporada ${seasonConfig?.temporada}`,
          html: `Estimada familia ${familia.nombre},<br><br>

Les recordamos que tienen jugadores pendientes de renovar para la temporada ${seasonConfig?.temporada}:<br><br>

${familia.jugadores.map(j => `• ${j.nombre} (${j.deporte})<br>`).join('')}
<br>
${seasonConfig?.fecha_limite_renovaciones ? `📅 Fecha límite: ${format(new Date(seasonConfig.fecha_limite_renovaciones), "d 'de' MMMM 'de' yyyy", { locale: es })}<br><br>` : ''}

Para renovar:<br>
1. Accede a la aplicación del club<br>
2. Ve a "Mis Jugadores"<br>
3. Haz clic en "Renovar Jugador"<br><br>

Si tienen dudas o problemas, no duden en contactarnos.<br><br>

Un saludo,<br>
CD Bustarviejo`
        });

        // Crear notificación en la app
        await base44.entities.AppNotification.create({
          usuario_email: familia.email,
          titulo: "⏰ Renovación Pendiente",
          mensaje: `Tienes ${familia.jugadores.length} jugador(es) pendientes de renovar: ${jugadoresNombres}`,
          tipo: "importante",
          icono: "⏰",
          enlace: "ParentPlayers",
          vista: false
        });
      }
    },
    onSuccess: (_, familias) => {
      setSuccessMessage(`✅ Recordatorios enviados a ${familias.length} familia(s)`);
      setShowSuccess(true);
      setSelectedFamilies([]);
    },
  });

  const reactivatePlayerMutation = useMutation({
    mutationFn: async (playerId) => {
      const player = allPlayers.find(p => p.id === playerId);
      await base44.entities.Player.update(playerId, {
        estado_renovacion: "pendiente",
        activo: false,
        fecha_renovacion: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
      toast.success("Jugador reactivado para renovación");
    },
  });

  const filteredFamilias = familiasNoRenovadas.filter(familia => {
    const matchesSearch = searchTerm === "" ||
      familia.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      familia.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      familia.jugadores.some(j => j.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === "all" ||
      familia.jugadores.some(j => j.deporte === categoryFilter);

    // Filtro por días sin responder
    let matchesDays = true;
    if (daysFilter !== "all") {
      const days = parseInt(daysFilter);
      if (familia.ultimoRecordatorio) {
        const daysSinceReminder = Math.floor((new Date() - new Date(familia.ultimoRecordatorio)) / (1000 * 60 * 60 * 24));
        matchesDays = daysSinceReminder >= days;
      } else {
        matchesDays = true; // Nunca se les envió → siempre mostrar
      }
    }

    return matchesSearch && matchesCategory && matchesDays;
  });

  const handleSelectAll = (checked) => {
    setSelectedFamilies(checked ? filteredFamilias.map(f => f.email) : []);
  };

  const handleSelectFamily = (email, checked) => {
    setSelectedFamilies(prev => 
      checked ? [...prev, email] : prev.filter(e => e !== email)
    );
  };

  const handleSendReminders = () => {
    const familiasToNotify = familiasNoRenovadas.filter(f => selectedFamilies.includes(f.email));
    sendReminderMutation.mutate(familiasToNotify);
  };

  const diasRestantes = seasonConfig?.fecha_limite_renovaciones 
    ? Math.ceil((new Date(seasonConfig.fecha_limite_renovaciones) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const categorias = [...new Set(allPlayers.map(p => p.deporte).filter(Boolean))].sort();

  // Exportar a Excel
  const handleExportExcel = () => {
    const data = familiasNoRenovadas.flatMap(familia => 
      familia.jugadores.map(j => ({
        Familia: familia.nombre,
        Email: familia.email,
        Jugador: j.nombre,
        Categoría: j.deporte,
        Estado: j.estado_renovacion
      }))
    );
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renovaciones_pendientes_${seasonConfig?.temporada}.csv`;
    a.click();
    toast.success("✅ Excel descargado");
  };

  return (
    <>
      <CheckmarkAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={successMessage}
      />
      <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">🔄 Centro de Renovaciones</h1>
          <p className="text-slate-600">Control total del proceso de renovación - Temporada {seasonConfig?.temporada}</p>
        </div>
        <Badge className="bg-blue-600 text-white text-lg px-4 py-2">
          {stats.tasaRenovacion}% Completado
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Zap className="w-4 h-4" />
            Acciones
          </TabsTrigger>
          <TabsTrigger value="families" className="gap-2">
            <Users className="w-4 h-4" />
            Familias
          </TabsTrigger>
          <TabsTrigger value="individual" className="gap-2">
            <Search className="w-4 h-4" />
            Individual
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* TAB: RESUMEN */}
        <TabsContent value="overview" className="space-y-6">
          {/* Fecha límite y días restantes */}
          {seasonConfig?.fecha_limite_renovaciones && (
        <Card className={`border-2 ${diasRestantes > 7 ? 'border-blue-300 bg-blue-50' : diasRestantes > 0 ? 'border-orange-300 bg-orange-50' : 'border-red-300 bg-red-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className={`w-8 h-8 ${diasRestantes > 7 ? 'text-blue-600' : diasRestantes > 0 ? 'text-orange-600' : 'text-red-600'}`} />
                <div>
                  <p className="font-bold text-lg">
                    {diasRestantes > 0 ? `${diasRestantes} días restantes` : '¡Fecha límite alcanzada!'}
                  </p>
                  <p className="text-sm text-slate-600">
                    Fecha límite: {format(new Date(seasonConfig.fecha_limite_renovaciones), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>
              {diasRestantes <= 0 && stats.pendientes > 0 && (
                <Badge className="bg-red-600 text-white animate-pulse">
                  ⚠️ {stats.pendientes} sin renovar
                </Badge>
              )}
            </div>
          </CardContent>
          </Card>
          )}

          {/* Estadísticas globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-1">Total Jugadores</p>
              <p className="text-4xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-700 mb-1">Renovados</p>
              <p className="text-4xl font-bold text-green-700">{stats.renovados}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-orange-700 mb-1">Pendientes</p>
              <p className="text-4xl font-bold text-orange-700">{stats.pendientes}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-sm text-red-700 mb-1">No Renuevan</p>
              <p className="text-4xl font-bold text-red-700">{stats.noRenuevan}</p>
            </div>
          </CardContent>
          </Card>
          </div>

          {/* Tasa de renovación */}
      <Card className="border-none shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-slate-900">Progreso de Renovaciones</p>
            <p className="text-3xl font-bold text-green-600">{stats.tasaRenovacion}%</p>
          </div>
          <Progress value={stats.tasaRenovacion} className="h-4" />
          <div className="flex justify-between text-sm mt-2">
            <span className="text-green-600">✅ {stats.renovados} renovados</span>
            <span className="text-orange-600">⏳ {stats.pendientes} pendientes</span>
          </div>
          </CardContent>
          </Card>

          {/* Por categoría */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>📊 Renovaciones por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.porCategoria).map(([categoria, data]) => {
              const tasa = Math.round((data.renovados / data.total) * 100);
              return (
                <Card key={categoria} className="border-2 border-slate-200">
                  <CardContent className="pt-4">
                    <p className="font-bold text-slate-900 mb-2 truncate">{categoria}</p>
                    <div className="space-y-2">
                      <Progress value={tasa} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className="text-green-600">✅ {data.renovados}</span>
                        <span className="text-orange-600">⏳ {data.pendientes}</span>
                        <span className="text-red-600">❌ {data.noRenuevan}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            </div>
          </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ACCIONES RÁPIDAS */}
        <TabsContent value="actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Preparar Renovaciones (admin) */}
            <Card className="border-2 border-emerald-300 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Preparar renovaciones</h3>
                    <p className="text-sm text-slate-600">Marca a los jugadores como pendientes y avisa a las familias</p>
                  </div>
                  <Button
                    onClick={async () => {
                      const res = await base44.functions.invoke('prepareRenewals', {});
                      const data = res?.data || {};
                      setSuccessMessage(`Listo: ${data.updatedPlayers || 0} jugadores preparados, ${data.familiesNotified || 0} familias avisadas`);
                      setShowSuccess(true);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    Ejecutar ahora
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-300 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Send className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Recordatorio Masivo</h3>
                    <p className="text-sm text-slate-600">Enviar a todas las familias pendientes</p>
                  </div>
                  <Button
                    onClick={() => {
                      setSelectedFamilies(familiasNoRenovadas.map(f => f.email));
                      handleSendReminders();
                    }}
                    disabled={familiasNoRenovadas.length === 0 || sendReminderMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    Enviar a {familiasNoRenovadas.length} familias
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-300 hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Download className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Exportar Excel</h3>
                    <p className="text-sm text-slate-600">Descargar listado completo</p>
                  </div>
                  <Button
                    onClick={handleExportExcel}
                    disabled={familiasNoRenovadas.length === 0}
                    variant="outline"
                    className="w-full border-green-600 text-green-600 hover:bg-green-50"
                  >
                    Descargar CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-300 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Contactar por WhatsApp</h3>
                    <p className="text-sm text-slate-600">Ver teléfonos en la pestaña Familias</p>
                  </div>
                  <Button
                    onClick={() => setActiveTab("families")}
                    variant="outline"
                    className="w-full border-purple-600 text-purple-600 hover:bg-purple-50"
                  >
                    Ir a Familias
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-300 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                    <Settings className="w-8 h-8 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Configuración</h3>
                    <p className="text-sm text-slate-600">Ajustar fechas y opciones</p>
                  </div>
                  <Button
                    onClick={() => window.location.href = '/SeasonManagement'}
                    variant="outline"
                    className="w-full border-orange-600 text-orange-600 hover:bg-orange-50"
                  >
                    Ir a Configuración
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-blue-300">
            <CardHeader className="bg-blue-50">
              <CardTitle>📊 Resumen Rápido</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.renovados}</p>
                  <p className="text-sm text-slate-600">Renovados</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{stats.pendientes}</p>
                  <p className="text-sm text-slate-600">Pendientes</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">{stats.noRenuevan}</p>
                  <p className="text-sm text-slate-600">No Renuevan</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{familiasNoRenovadas.length}</p>
                  <p className="text-sm text-slate-600">Familias Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: VISTA POR FAMILIA */}
        <TabsContent value="families" className="space-y-6">
          {/* Familias pendientes de renovar */}
      <Card className="border-2 border-orange-300">
        <CardHeader className="bg-orange-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
              Familias Pendientes de Renovar ({familiasNoRenovadas.length})
            </CardTitle>
            {selectedFamilies.length > 0 && (
              <Button
                onClick={handleSendReminders}
                disabled={sendReminderMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Recordatorio ({selectedFamilies.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar familia o jugador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Todas las categorías</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={daysFilter}
              onChange={(e) => setDaysFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">Sin filtro de días</option>
              <option value="3">+3 días sin responder</option>
              <option value="7">+7 días sin responder</option>
              <option value="15">+15 días sin responder</option>
              <option value="30">+30 días sin responder</option>
            </select>
          </div>

          {filteredFamilias.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
              <Checkbox
                checked={selectedFamilies.length === filteredFamilias.length}
                onCheckedChange={handleSelectAll}
              />
              <label className="text-sm font-medium cursor-pointer">
                Seleccionar todas ({filteredFamilias.length})
              </label>
            </div>
          )}

          {filteredFamilias.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-bold text-green-900">¡Todas las familias han renovado!</p>
              <p className="text-slate-600 text-sm">No hay familias pendientes de renovación</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFamilias.map(familia => (
                <Card key={familia.email} className="border-2 border-orange-200 hover:shadow-lg transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedFamilies.includes(familia.email)}
                        onCheckedChange={(checked) => handleSelectFamily(familia.email, checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-slate-900">{familia.nombre}</p>
                            <p className="text-xs text-slate-500">{familia.email}</p>
                            {familia.telefono && (
                              <a href={`https://wa.me/34${familia.telefono.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" /> {familia.telefono}
                              </a>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            <Badge className="bg-orange-500">
                              {familia.jugadores.length} jugador(es)
                            </Badge>
                            {familia.ultimoRecordatorio ? (
                              <p className="text-[10px] text-slate-500">
                                📧 Último: {format(new Date(familia.ultimoRecordatorio), "d MMM", { locale: es })}
                              </p>
                            ) : (
                              <p className="text-[10px] text-red-500 font-medium">
                                ⚠️ Nunca notificada
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          {familia.jugadores.map(jugador => (
                            <div key={jugador.id} className="flex items-center justify-between bg-orange-50 rounded px-3 py-2 text-sm">
                              <span className="font-medium">{jugador.nombre}</span>
                              <span className="text-slate-600 text-xs">{jugador.deporte}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendReminderMutation.mutate([familia])}
                            disabled={sendReminderMutation.isPending}
                            className="flex-1"
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            Enviar Recordatorio
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            )}
          </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: VISTA INDIVIDUAL */}
        <TabsContent value="individual" className="space-y-6">
          <Card className="border-2 border-slate-300">
            <CardHeader>
              <CardTitle>🔍 Búsqueda Individual de Jugadores</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Buscar jugador por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              
              <div className="space-y-2">
                {allPlayers
                  .filter(p => 
                    p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    p.temporada_renovacion === seasonConfig?.temporada
                  )
                  .slice(0, 30)
                  .map(player => (
                    <div key={player.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3 border">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">{player.nombre}</p>
                        <p className="text-xs text-slate-600">{player.deporte}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {player.email_padre && <span>📧 {player.email_padre}</span>}
                          {player.telefono && (
                            <a href={`https://wa.me/34${player.telefono.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {player.telefono}
                            </a>
                          )}
                        </div>
                        {player.fecha_renovacion && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Actualizado: {format(new Date(player.fecha_renovacion), "d MMM yyyy", { locale: es })}
                          </p>
                        )}
                      </div>
                      <Badge className={
                        player.estado_renovacion === "renovado" ? "bg-green-500" :
                        player.estado_renovacion === "no_renueva" ? "bg-red-500" :
                        "bg-orange-500"
                      }>
                        {player.estado_renovacion === "renovado" ? "✅ Renovado" :
                         player.estado_renovacion === "no_renueva" ? "❌ No renueva" :
                         "⏳ Pendiente"}
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ESTADÍSTICAS DETALLADAS */}
        <TabsContent value="stats" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle>📊 Renovaciones por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.porCategoria).map(([categoria, data]) => {
                  const tasa = Math.round((data.renovados / data.total) * 100);
                  return (
                    <Card key={categoria} className="border-2 border-slate-200">
                      <CardContent className="pt-4">
                        <p className="font-bold text-slate-900 mb-2 truncate">{categoria}</p>
                        <div className="space-y-2">
                          <Progress value={tasa} className="h-2" />
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600">✅ {data.renovados}</span>
                            <span className="text-orange-600">⏳ {data.pendientes}</span>
                            <span className="text-red-600">❌ {data.noRenuevan}</span>
                          </div>
                          <p className="text-center text-sm font-bold text-slate-900">{tasa}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Jugadores que NO renuevan */}
      {stats.noRenuevan > 0 && (
        <Card className="border-2 border-red-300">
          <CardHeader className="bg-red-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <XCircle className="w-6 h-6" />
              Jugadores que NO Renuevan ({stats.noRenuevan})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {allPlayers
                .filter(p => p.estado_renovacion === "no_renueva" && p.temporada_renovacion === seasonConfig?.temporada)
                .map(player => (
                  <div key={player.id} className="flex items-center justify-between bg-red-50 rounded-lg p-3 border border-red-200">
                    <div>
                      <p className="font-bold text-slate-900">{player.nombre}</p>
                      <p className="text-xs text-slate-600">{player.deporte}</p>
                      {player.fecha_renovacion && (
                        <p className="text-xs text-slate-500">
                          Marcado el: {format(new Date(player.fecha_renovacion), "d 'de' MMM", { locale: es })}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reactivatePlayerMutation.mutate(player.id)}
                      disabled={reactivatePlayerMutation.isPending}
                      className="border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reactivar
                    </Button>
                  </div>
                ))}
            </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}