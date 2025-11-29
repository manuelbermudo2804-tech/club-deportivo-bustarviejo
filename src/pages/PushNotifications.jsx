import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Send, Users, CheckCircle2 } from "lucide-react";
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

  // Enviar notificación
  const sendNotificationMutation = useMutation({
    mutationFn: async (data) => {
      // Calcular destinatarios
      let destinatarios = [];
      const playersList = players || [];
      const usersList = users || [];
      
      if (data.tipo_destinatario === "todos") {
        // Todos los usuarios
        destinatarios = usersList.map(u => u.email);
        // Añadir padres de jugadores
        playersList.forEach(p => {
          if (p.email_padre) destinatarios.push(p.email_padre);
          if (p.email_tutor_2) destinatarios.push(p.email_tutor_2);
        });
      } else if (data.tipo_destinatario === "padres") {
        // Solo padres/familias (usuarios que no son admin ni entrenadores)
        playersList.forEach(p => {
          if (p.email_padre) destinatarios.push(p.email_padre);
          if (p.email_tutor_2) destinatarios.push(p.email_tutor_2);
        });
      } else if (data.tipo_destinatario === "entrenadores") {
        // Solo entrenadores
        destinatarios = usersList.filter(u => u.es_entrenador === true).map(u => u.email);
      } else if (data.tipo_destinatario === "administradores") {
        // Solo admins
        destinatarios = usersList.filter(u => u.role === "admin").map(u => u.email);
      } else if (data.tipo_destinatario === "categoria") {
        // Por categoría específica
        playersList
          .filter(p => p.deporte === data.categoria_destino)
          .forEach(p => {
            if (p.email_padre) destinatarios.push(p.email_padre);
            if (p.email_tutor_2) destinatarios.push(p.email_tutor_2);
          });
      }

      // Eliminar duplicados
      destinatarios = [...new Set(destinatarios)].filter(Boolean);

      if (destinatarios.length === 0) {
        throw new Error("No hay destinatarios para esta notificación");
      }

      // Guardar la notificación
      const notification = await base44.entities.PushNotification.create({
        ...data,
        enviada: true,
        fecha_envio: new Date().toISOString(),
        destinatarios_count: destinatarios.length,
        enviado_por: user?.email
      });

      // Crear notificaciones individuales en AppNotification para cada destinatario
      const notificacionesIndividuales = destinatarios.map(email => ({
        usuario_email: email,
        titulo: `${data.icono} ${data.titulo}`,
        mensaje: data.mensaje,
        tipo: data.prioridad,
        icono: data.icono,
        enlace: data.enlace_destino ? createPageUrl(data.enlace_destino) : null,
        vista: false
      }));

      // Crear en lotes de 10
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
      toast.success(`✅ Notificación enviada a ${result.destinatarios_count} usuarios`);
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
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Notificación
        </Button>
      </div>

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
      <Card className="border-none shadow-md bg-slate-50">
        <CardContent className="p-4">
          <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Cómo funcionan las notificaciones
          </h3>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Las notificaciones aparecen en el centro de notificaciones de cada usuario</li>
            <li>• Los usuarios con notificaciones push activadas las recibirán en su dispositivo</li>
            <li>• Puedes segmentar por rol (padres, entrenadores) o por categoría deportiva</li>
            <li>• Si incluyes un enlace, al tocar la notificación irán a esa sección</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}