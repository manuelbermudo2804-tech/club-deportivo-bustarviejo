import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";

import PushNotificationForm from "../components/notifications/PushNotificationForm";
import PushNotificationCard from "../components/notifications/PushNotificationCard";

export default function PushNotifications() {
  const [showForm, setShowForm] = useState(false);
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Obtener notificaciones enviadas
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['pushNotifications'],
    queryFn: () => base44.entities.PushNotification.list('-created_date'),
    initialData: [],
  });

  // Obtener jugadores para calcular destinatarios
  const { data: players } = useQuery({
    queryKey: ['playersForPush'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Obtener usuarios para destinatarios
  const { data: users } = useQuery({
    queryKey: ['usersForPush'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Obtener configuración de temporada
  const { data: seasonConfigs = [] } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: () => base44.entities.SeasonConfig.list(),
  });

  const activeSeason = seasonConfigs.find(s => s.activa === true);
  const pushEnabled = activeSeason?.notificaciones_push_activas !== false;

  const togglePushMutation = useMutation({
    mutationFn: (enabled) => base44.entities.SeasonConfig.update(activeSeason.id, { 
      notificaciones_push_activas: enabled 
    }),
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['seasonConfig'] });
      toast.success(enabled ? "✅ Push activadas" : "⏸️ Push desactivadas");
    },
  });

  // Enviar notificación con PUSH REAL
  const sendNotificationMutation = useMutation({
    mutationFn: async (data) => {
      // Verificar si las push están activas
      if (!pushEnabled) {
        throw new Error("Las notificaciones push están desactivadas. Actívalas con el switch de arriba.");
      }

      // Calcular destinatarios
      let destinatarios = [];
      const playersList = players || [];
      const usersList = users || [];
      
      if (data.tipo_destinatario === "todos") {
        destinatarios = usersList.map(u => u.email);
        playersList.forEach(p => {
          if (p.email_padre) destinatarios.push(p.email_padre);
          if (p.email_tutor_2) destinatarios.push(p.email_tutor_2);
        });
      } else if (data.tipo_destinatario === "padres") {
        playersList.forEach(p => {
          if (p.email_padre) destinatarios.push(p.email_padre);
          if (p.email_tutor_2) destinatarios.push(p.email_tutor_2);
        });
      } else if (data.tipo_destinatario === "entrenadores") {
        destinatarios = usersList.filter(u => u.es_entrenador === true).map(u => u.email);
      } else if (data.tipo_destinatario === "administradores") {
        destinatarios = usersList.filter(u => u.role === "admin").map(u => u.email);
      } else if (data.tipo_destinatario === "categoria") {
        playersList
          .filter(p => p.deporte === data.categoria_destino)
          .forEach(p => {
            if (p.email_padre) destinatarios.push(p.email_padre);
            if (p.email_tutor_2) destinatarios.push(p.email_tutor_2);
          });
      }

      destinatarios = [...new Set(destinatarios)].filter(Boolean);

      if (destinatarios.length === 0) {
        throw new Error("No hay destinatarios para esta notificación");
      }

      // Guardar notificación en BD
      const notification = await base44.entities.PushNotification.create({
        ...data,
        enviada: true,
        fecha_envio: new Date().toISOString(),
        destinatarios_count: destinatarios.length,
        enviado_por: user?.email
      });

      // 3. Crear notificaciones in-app para cada destinatario
      const notificacionesIndividuales = destinatarios.map(email => ({
        usuario_email: email,
        titulo: `${data.icono} ${data.titulo}`,
        mensaje: data.mensaje,
        tipo: data.prioridad,
        icono: data.icono,
        enlace: data.enlace_destino || null,
        vista: false
      }));

      for (let i = 0; i < notificacionesIndividuales.length; i += 10) {
        const batch = notificacionesIndividuales.slice(i, i + 10);
        await base44.entities.AppNotification.bulkCreate(batch);
      }

      return { notification, destinatarios_count: destinatarios.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pushNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
      setShowForm(false);
      toast.success(`✅ Notificación PUSH enviada a ${result.destinatarios_count} usuarios`);
    },
    onError: (error) => {
      toast.error(error.message || "Error al enviar la notificación");
    }
  });

  // Filtrar notificaciones
  const filteredNotifications = filter === "all" 
    ? notifications 
    : notifications.filter(n => n.tipo_destinatario === filter);

  // Estadísticas
  const stats = {
    total: notifications.length,
    hoy: notifications.filter(n => {
      const fecha = new Date(n.fecha_envio);
      const hoy = new Date();
      return fecha.toDateString() === hoy.toDateString();
    }).length,
    destinatarios: notifications.reduce((sum, n) => sum + (n.destinatarios_count || 0), 0)
  };

  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-600" />
            Notificaciones Push
          </h1>
          <p className="text-slate-600 mt-1 text-sm">Envía notificaciones a los usuarios de la app</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700"
          disabled={!pushEnabled}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Notificación
        </Button>
      </div>

      {/* Control de activación/desactivación de Push */}
      <Card className={`border-2 ${pushEnabled ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                pushEnabled ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <Bell className={`w-6 h-6 ${pushEnabled ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="font-bold text-slate-900">
                  📲 Notificaciones Push {pushEnabled ? 'Activadas' : 'Desactivadas'}
                </p>
                <p className="text-xs text-slate-600">
                  {pushEnabled 
                    ? "Se enviarán push automáticas (chats, eventos) y manuales (las de abajo)" 
                    : "⚠️ BLOQUEADAS: No se enviarán push automáticas NI manuales hasta activar"}
                </p>
              </div>
            </div>
            <Switch
              checked={pushEnabled}
              onCheckedChange={(checked) => {
                if (activeSeason) {
                  togglePushMutation.mutate(checked);
                }
              }}
              disabled={!activeSeason}
            />
          </div>
        </CardContent>
      </Card>

      {!pushEnabled && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            <strong>⚠️ Push BLOQUEADAS:</strong> No se puede enviar ninguna notificación (ni automáticas de chat, ni manuales) hasta que actives el switch de arriba. El botón "Nueva Notificación" está deshabilitado.
          </AlertDescription>
        </Alert>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.total}</p>
            <p className="text-xs text-slate-600">Total enviadas</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.hoy}</p>
            <p className="text-xs text-slate-600">Hoy</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.destinatarios}</p>
            <p className="text-xs text-slate-600">Destinatarios</p>
          </CardContent>
        </Card>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <PushNotificationForm
            onSubmit={(data) => sendNotificationMutation.mutate(data)}
            onCancel={() => setShowForm(false)}
            isSubmitting={sendNotificationMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Filtros */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-white shadow-sm flex-wrap h-auto p-1">
          <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
          <TabsTrigger value="todos" className="text-xs">👥 Todos</TabsTrigger>
          <TabsTrigger value="padres" className="text-xs">👨‍👩‍👧 Padres</TabsTrigger>
          <TabsTrigger value="entrenadores" className="text-xs">🏃 Entrenadores</TabsTrigger>
          <TabsTrigger value="categoria" className="text-xs">⚽ Categoría</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Lista de notificaciones */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="border-none shadow-md">
          <CardContent className="p-8 text-center">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay notificaciones enviadas</p>
            <p className="text-sm text-slate-400 mt-1">Pulsa "Nueva Notificación" para enviar una</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map(notification => (
            <PushNotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      {/* Información */}
      <Card className="border-none shadow-md bg-blue-50 border-2 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            ℹ️ Notificaciones In-App
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Las notificaciones aparecen dentro de la app</li>
            <li>• Puedes segmentar por rol (padres, entrenadores) o por categoría</li>
            <li>• Si incluyes un enlace, al tocar irán a esa sección</li>
          </ul>
          <p className="text-xs text-slate-500 mt-2">
            ⚠️ Las notificaciones push con app cerrada no están disponibles en Base44 actualmente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}