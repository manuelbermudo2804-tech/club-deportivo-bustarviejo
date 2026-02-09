import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Bell, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PushNotificationSubscriber from "@/components/notifications/PushNotificationSubscriber";

export default function NotificationPreferences() {
  const [user, setUser] = useState(null);
  const [isStaff, setIsStaff] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const staff = currentUser.role === "admin" || currentUser.es_entrenador || currentUser.es_coordinador || currentUser.es_tesorero;
        setIsStaff(staff);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['myNotificationPreferences', user?.email],
    queryFn: async () => {
      const all = await base44.entities.NotificationPreference.list();
      return all.find(p => p.usuario_email === user?.email);
    },
    enabled: !!user && isStaff,
  });

  const [localPrefs, setLocalPrefs] = useState(null);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    } else if (user && isStaff) {
      // Valores por defecto
      setLocalPrefs({
        usuario_email: user.email,
        tipo_usuario: user.role === "admin" ? "admin" : user.es_coordinador ? "coordinador" : user.es_tesorero ? "tesorero" : "entrenador",
        notif_convocatorias: true,
        notif_pagos: true,
        notif_recordatorios_pago: true,
        notif_chats_grupo: true,
        notif_mensajes_sistema: true,
        notif_chats_urgentes: true,
        notif_evaluaciones: true,
        notif_anuncios: true,
        modo_entrega: "inmediato",
        silenciar_horario: false,
        hora_inicio_silencio: "22:00",
        hora_fin_silencio: "08:00",
        resumen_semanal_email: false,
      });
    }
  }, [preferences, user, isStaff]);

  const saveMutation = useMutation({
    mutationFn: async (prefs) => {
      if (preferences?.id) {
        return base44.entities.NotificationPreference.update(preferences.id, prefs);
      } else {
        return base44.entities.NotificationPreference.create(prefs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myNotificationPreferences'] });
      toast.success("✅ Preferencias guardadas");
    },
    onError: (error) => {
      console.error("Error saving preferences:", error);
      toast.error("Error al guardar preferencias");
    }
  });

  const handleSave = () => {
    if (!localPrefs) return;
    saveMutation.mutate(localPrefs);
  };

  if (!user) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-600">Cargando...</p>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertCircle className="w-16 h-16 text-orange-600 mx-auto" />
              <h2 className="text-2xl font-bold text-orange-900">Preferencias de Notificaciones</h2>
              <p className="text-orange-700">
                Como padre/madre, recibirás todas las notificaciones importantes automáticamente (convocatorias, pagos, mensajes urgentes). No es posible desactivarlas para garantizar que estés informado.
              </p>
              <div className="bg-white rounded-lg p-4 text-left mt-4">
                <p className="text-sm font-semibold text-slate-900 mb-2">✅ Notificaciones activas:</p>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>🏆 Nuevas convocatorias de partidos</li>
                  <li>💰 Recordatorios de pagos pendientes</li>
                  <li>⏰ Recordatorios de pagos próximos</li>
                  <li>💬 Mensajes del chat de grupo</li>
                  <li>📬 Mensajes del Club (sistema)</li>
                  <li>💬 Mensajes urgentes del club</li>
                  <li>📢 Anuncios importantes</li>
                  <li>⭐ Nuevas evaluaciones de tus hijos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !localPrefs) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-slate-600">Cargando preferencias...</p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Bell className="w-8 h-8 text-orange-600" />
          Preferencias de Notificaciones
        </h1>
        <p className="text-slate-600 mt-1">Personaliza cómo y cuándo recibes notificaciones</p>
      </div>



      <Alert className="bg-blue-50 border-blue-200">
        <AlertDescription className="text-blue-800">
          ℹ️ Como miembro del staff, puedes personalizar tus notificaciones. Los padres recibirán todas las notificaciones importantes automáticamente.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>🔔 Tipos de Notificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Convocatorias</Label>
              <p className="text-sm text-slate-600">Nuevas convocatorias y recordatorios</p>
            </div>
            <Switch
              checked={localPrefs.notif_convocatorias}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_convocatorias: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Pagos</Label>
              <p className="text-sm text-slate-600">Cambios de estado y recordatorios de pago</p>
            </div>
            <Switch
              checked={localPrefs.notif_pagos}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_pagos: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Recordatorios de Pago</Label>
              <p className="text-sm text-slate-600">Recordatorios de pagos próximos a vencer</p>
            </div>
            <Switch
              checked={localPrefs.notif_recordatorios_pago}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_recordatorios_pago: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Mensajes Chat de Grupo</Label>
              <p className="text-sm text-slate-600">Mensajes nuevos en chats de categoría</p>
            </div>
            <Switch
              checked={localPrefs.notif_chats_grupo}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_chats_grupo: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Mensajes del Club</Label>
              <p className="text-sm text-slate-600">Mensajes privados del sistema/administración</p>
            </div>
            <Switch
              checked={localPrefs.notif_mensajes_sistema}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_mensajes_sistema: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Chats Urgentes</Label>
              <p className="text-sm text-slate-600">Mensajes marcados como urgentes</p>
            </div>
            <Switch
              checked={localPrefs.notif_chats_urgentes}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_chats_urgentes: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Evaluaciones</Label>
              <p className="text-sm text-slate-600">Nuevas evaluaciones de jugadores</p>
            </div>
            <Switch
              checked={localPrefs.notif_evaluaciones}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_evaluaciones: checked})}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Anuncios</Label>
              <p className="text-sm text-slate-600">Anuncios importantes del club</p>
            </div>
            <Switch
              checked={localPrefs.notif_anuncios}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, notif_anuncios: checked})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>⏱️ Modo de Entrega</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={localPrefs.modo_entrega} onValueChange={(value) => setLocalPrefs({...localPrefs, modo_entrega: value})}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="inmediato" id="inmediato" />
              <Label htmlFor="inmediato" className="flex-1 cursor-pointer">
                <div className="font-semibold">Inmediato</div>
                <div className="text-sm text-slate-600">Recibir notificaciones al instante</div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <RadioGroupItem value="resumen_diario" id="resumen_diario" />
              <Label htmlFor="resumen_diario" className="flex-1 cursor-pointer">
                <div className="font-semibold">Resumen Diario</div>
                <div className="text-sm text-slate-600">Recibir un resumen al final del día (20:00)</div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🌙 Horario de Silencio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Silenciar fuera de horario</Label>
              <p className="text-sm text-slate-600">No recibir notificaciones en horario nocturno</p>
            </div>
            <Switch
              checked={localPrefs.silenciar_horario}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, silenciar_horario: checked})}
            />
          </div>

          {localPrefs.silenciar_horario && (
            <div className="grid grid-cols-2 gap-4 pl-3">
              <div>
                <Label className="text-sm">Inicio</Label>
                <Input
                  type="time"
                  value={localPrefs.hora_inicio_silencio}
                  onChange={(e) => setLocalPrefs({...localPrefs, hora_inicio_silencio: e.target.value})}
                />
              </div>
              <div>
                <Label className="text-sm">Fin</Label>
                <Input
                  type="time"
                  value={localPrefs.hora_fin_silencio}
                  onChange={(e) => setLocalPrefs({...localPrefs, hora_fin_silencio: e.target.value})}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📧 Email</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <Label className="font-semibold">Resumen Semanal</Label>
              <p className="text-sm text-slate-600">Recibir resumen semanal por email (lunes, 9:00)</p>
            </div>
            <Switch
              checked={localPrefs.resumen_semanal_email}
              onCheckedChange={(checked) => setLocalPrefs({...localPrefs, resumen_semanal_email: checked})}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📲 Notificaciones Push</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">Recibe notificaciones en tiempo real, incluso cuando la app está cerrada (como WhatsApp).</p>
          <PushNotificationSubscriber user={user} />
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        className="w-full bg-orange-600 hover:bg-orange-700 font-bold py-6 text-lg"
        disabled={saveMutation.isPending}
      >
        <Save className="w-5 h-5 mr-2" />
        {saveMutation.isPending ? "Guardando..." : "Guardar Preferencias"}
      </Button>
    </div>
  );
}