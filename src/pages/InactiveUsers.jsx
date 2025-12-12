import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserX, Mail, Trash2, AlertTriangle, Search, Ban, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function InactiveUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [showReminderDialog, setShowReminderDialog] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("");
  
  const queryClient = useQueryClient();

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allPlayers = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  // Detectar usuarios inactivos (padres sin hijos activos)
  const inactiveUsers = allUsers.filter(user => {
    // Excluir admins, entrenadores, coordinadores, tesoreros, jugadores
    if (user.role === "admin") return false;
    if (user.es_entrenador || user.es_coordinador || user.es_tesorero || user.es_jugador) return false;
    
    // Buscar si tiene jugadores activos
    const activePlayers = allPlayers.filter(p => 
      (p.email_padre === user.email || p.email_tutor_2 === user.email) && 
      p.activo === true
    );
    
    return activePlayers.length === 0;
  }).map(user => {
    // Obtener todos los jugadores que tuvo (activos e inactivos)
    const allUserPlayers = allPlayers.filter(p => 
      p.email_padre === user.email || p.email_tutor_2 === user.email
    );
    
    // Fecha del último jugador activo
    const lastActiveDate = allUserPlayers.length > 0 
      ? allUserPlayers.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0].updated_date
      : null;
    
    return {
      ...user,
      total_jugadores: allUserPlayers.length,
      jugadores_inactivos: allUserPlayers.filter(p => !p.activo),
      ultima_actividad: lastActiveDate
    };
  }).filter(u => 
    !searchTerm || 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const desactivarAccesoMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { 
        acceso_activo: false,
        motivo_restriccion: "Sin jugadores activos en el club - Temporada finalizada"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success("Acceso desactivado");
    },
  });

  const activarAccesoMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { 
        acceso_activo: true,
        motivo_restriccion: ""
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success("Acceso reactivado");
    },
  });

  const enviarRecordatorioMutation = useMutation({
    mutationFn: async ({ user, message }) => {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: user.email,
        subject: "¿Vas a renovar? - CD Bustarviejo",
        body: message
      });
    },
    onSuccess: () => {
      setShowReminderDialog(null);
      setReminderMessage("");
      toast.success("Recordatorio enviado");
    },
  });

  const eliminarUsuarioMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.delete(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowDeleteDialog(null);
      toast.success("Usuario eliminado");
    },
  });

  if (loadingUsers || loadingPlayers) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <Card className="border-none shadow-xl">
        <CardHeader className="border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserX className="w-8 h-8 text-red-600" />
              <div>
                <CardTitle className="text-2xl">Usuarios Inactivos</CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Padres sin jugadores activos - Gestión de limpieza de temporada
                </p>
              </div>
            </div>
            <Badge className="bg-red-600 text-lg px-4 py-2">
              {inactiveUsers.length} usuarios
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          
          {/* Info */}
          <Alert className="mb-6 bg-blue-50 border-blue-300">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <p className="font-semibold mb-1">📊 ¿Qué muestra esta página?</p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Padres/tutores que <strong>NO tienen ningún jugador activo</strong> en la temporada actual</li>
                <li>Excluye automáticamente admins, entrenadores, coordinadores y tesoreros</li>
                <li>Útil para limpiar usuarios después del reset de temporada</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Búsqueda */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de usuarios inactivos */}
          {inactiveUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">
                {searchTerm ? "No se encontraron usuarios" : "No hay usuarios inactivos"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inactiveUsers.map(user => (
                <Card key={user.id} className="border-l-4 border-l-red-500">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-bold text-slate-900">{user.full_name}</h3>
                          {user.acceso_activo === false && (
                            <Badge className="bg-red-600">🔒 Acceso Bloqueado</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{user.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500">
                          <span>👥 {user.total_jugadores} jugador(es) total</span>
                          <span>❌ {user.jugadores_inactivos?.length || 0} inactivo(s)</span>
                          {user.ultima_actividad && (
                            <span>📅 Última actividad: {format(new Date(user.ultima_actividad), "dd MMM yyyy", { locale: es })}</span>
                          )}
                        </div>
                        {user.jugadores_inactivos?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs text-slate-500 font-medium">Jugadores inactivos:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {user.jugadores_inactivos.map(p => (
                                <Badge key={p.id} variant="outline" className="text-xs">
                                  {p.nombre}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {user.acceso_activo !== false ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setShowReminderDialog(user);
                                setReminderMessage(`Hola ${user.full_name},

Vemos que aún no has renovado a tus jugadores para la nueva temporada.

¿Tienes pensado inscribirlos de nuevo este año?

Si necesitas ayuda o tienes alguna duda, estamos aquí para ayudarte.

Atentamente,
CD Bustarviejo`);
                              }}
                              className="text-blue-600 border-blue-300"
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Recordatorio
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => desactivarAccesoMutation.mutate(user.id)}
                              className="text-orange-600 border-orange-300"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Desactivar
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => activarAccesoMutation.mutate(user.id)}
                            className="text-green-600 border-green-300"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reactivar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowDeleteDialog(user)}
                          className="text-red-600 border-red-300"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">⚠️ Eliminar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-700">
              ¿Estás seguro de que quieres <strong>eliminar permanentemente</strong> al usuario:
            </p>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-bold text-slate-900">{showDeleteDialog?.full_name}</p>
              <p className="text-sm text-slate-600">{showDeleteDialog?.email}</p>
            </div>
            <Alert className="bg-red-50 border-red-300">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <p className="font-semibold">Esta acción NO se puede deshacer.</p>
                <p className="text-sm mt-1">El usuario no podrá volver a acceder a la aplicación.</p>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => eliminarUsuarioMutation.mutate(showDeleteDialog.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de recordatorio */}
      <Dialog open={!!showReminderDialog} onOpenChange={() => setShowReminderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>📧 Enviar Recordatorio de Renovación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="font-bold text-slate-900">{showReminderDialog?.full_name}</p>
              <p className="text-sm text-slate-600">{showReminderDialog?.email}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Mensaje del email:</label>
              <Textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowReminderDialog(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => enviarRecordatorioMutation.mutate({ 
                user: showReminderDialog, 
                message: reminderMessage 
              })}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar Recordatorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}