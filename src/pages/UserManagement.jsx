import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Search,
  UserCheck,
  UserX,
  Shield,
  Mail,
  Calendar,
  Loader2,
  CheckCircle2,
  Ban
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRestrictDialog, setShowRestrictDialog] = useState(false);
  const [restrictionData, setRestrictionData] = useState({
    motivo_restriccion: "",
    notas_admin: ""
  });

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      // Obtener todos los usuarios
      return await base44.entities.User.list();
    },
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      return await base44.entities.User.update(userId, userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowRestrictDialog(false);
      setSelectedUser(null);
      setRestrictionData({ motivo_restriccion: "", notas_admin: "" });
      toast.success("Usuario actualizado correctamente");
    },
  });

  const handleRestrictAccess = async (user) => {
    setSelectedUser(user);
    setRestrictionData({
      motivo_restriccion: "",
      notas_admin: ""
    });
    setShowRestrictDialog(true);
  };

  const handleConfirmRestriction = async () => {
    if (!selectedUser) return;

    const isRestricting = selectedUser.acceso_activo !== false;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        acceso_activo: !isRestricting,
        motivo_restriccion: isRestricting ? restrictionData.motivo_restriccion : null,
        fecha_restriccion: isRestricting ? new Date().toISOString() : null,
        notas_admin: restrictionData.notas_admin || selectedUser.notas_admin
      }
    });
  };

  const sendAccessNotification = async (user, isRestricting) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: isRestricting 
          ? "Acceso Restringido - CF Bustarviejo" 
          : "Acceso Restaurado - CF Bustarviejo",
        body: isRestricting ? `
          <h2>Acceso Restringido</h2>
          <p>Estimado/a ${user.full_name},</p>
          <p>Te informamos que tu acceso a la aplicación del CF Bustarviejo ha sido restringido.</p>
          ${restrictionData.motivo_restriccion ? `<p><strong>Motivo:</strong> ${restrictionData.motivo_restriccion}</p>` : ''}
          <p>Si tienes alguna duda, por favor contacta con la administración del club.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">CF Bustarviejo</p>
        ` : `
          <h2>Acceso Restaurado</h2>
          <p>Estimado/a ${user.full_name},</p>
          <p>Te informamos que tu acceso a la aplicación del CF Bustarviejo ha sido restaurado.</p>
          <p>Ya puedes acceder nuevamente a la aplicación.</p>
          <hr>
          <p style="font-size: 12px; color: #666;">CF Bustarviejo</p>
        `
      });
      toast.success("Notificación enviada por email");
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Obtener jugadores por usuario
  const getUserPlayers = (userEmail) => {
    return players.filter(p => p.email_padre === userEmail || p.email === userEmail);
  };

  // Estadísticas
  const activeUsers = users.filter(u => u.acceso_activo !== false && u.role !== "admin");
  const restrictedUsers = users.filter(u => u.acceso_activo === false);
  const admins = users.filter(u => u.role === "admin");
  const parentsWithNoActivePlayers = users.filter(u => {
    if (u.role === "admin") return false;
    const userPlayers = getUserPlayers(u.email);
    return userPlayers.length === 0 || userPlayers.every(p => !p.activo);
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-600 mt-1">Control de acceso y permisos de la aplicación</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Usuarios Activos</p>
                <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
              </div>
              <UserCheck className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Acceso Restringido</p>
                <p className="text-3xl font-bold text-red-600">{restrictedUsers.length}</p>
              </div>
              <UserX className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Administradores</p>
                <p className="text-3xl font-bold text-orange-600">{admins.length}</p>
              </div>
              <Shield className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Sin Jugadores Activos</p>
                <p className="text-3xl font-bold text-amber-600">{parentsWithNoActivePlayers.length}</p>
              </div>
              <Users className="w-12 h-12 text-amber-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar usuario por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Lista de Usuarios */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            Lista de Usuarios ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const userPlayers = getUserPlayers(user.email);
                const activePlayers = userPlayers.filter(p => p.activo);
                const hasRestriction = user.acceso_activo === false;

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      hasRestriction
                        ? 'bg-red-50 border-red-200'
                        : 'bg-white border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-slate-900">{user.full_name}</h3>
                          <Badge className={user.role === "admin" ? "bg-orange-600" : "bg-slate-600"}>
                            {user.role === "admin" ? "Administrador" : "Padre/Tutor"}
                          </Badge>
                          {hasRestriction && (
                            <Badge className="bg-red-600 text-white">
                              <Ban className="w-3 h-3 mr-1" />
                              Acceso Restringido
                            </Badge>
                          )}
                          {activePlayers.length === 0 && !hasRestriction && user.role !== "admin" && (
                            <Badge className="bg-amber-100 text-amber-700">
                              Sin jugadores activos
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>

                        {userPlayers.length > 0 && (
                          <div className="text-sm text-slate-600 mb-2">
                            <span className="font-medium">Jugadores:</span>{" "}
                            {userPlayers.map(p => p.nombre).join(", ")}
                            {activePlayers.length < userPlayers.length && (
                              <span className="text-amber-600 ml-2">
                                ({activePlayers.length} activos de {userPlayers.length})
                              </span>
                            )}
                          </div>
                        )}

                        {hasRestriction && user.motivo_restriccion && (
                          <div className="text-sm text-red-700 bg-red-100 rounded p-2 mt-2">
                            <strong>Motivo:</strong> {user.motivo_restriccion}
                          </div>
                        )}

                        {hasRestriction && user.fecha_restriccion && (
                          <div className="flex items-center gap-2 text-xs text-red-600 mt-2">
                            <Calendar className="w-3 h-3" />
                            Restringido: {new Date(user.fecha_restriccion).toLocaleDateString('es-ES')}
                          </div>
                        )}

                        {user.notas_admin && (
                          <div className="text-sm text-slate-600 bg-slate-50 rounded p-2 mt-2">
                            <strong>Notas:</strong> {user.notas_admin}
                          </div>
                        )}
                      </div>

                      {user.role !== "admin" && (
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant={hasRestriction ? "default" : "destructive"}
                            onClick={() => handleRestrictAccess(user)}
                            className={hasRestriction ? "bg-green-600 hover:bg-green-700" : ""}
                          >
                            {hasRestriction ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Restaurar Acceso
                              </>
                            ) : (
                              <>
                                <Ban className="w-4 h-4 mr-1" />
                                Restringir Acceso
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => sendAccessNotification(user, !hasRestriction)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Notificar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Restricción */}
      <Dialog open={showRestrictDialog} onOpenChange={setShowRestrictDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedUser?.acceso_activo !== false ? (
                <>
                  <Ban className="w-6 h-6 text-red-600" />
                  Restringir Acceso
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  Restaurar Acceso
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.acceso_activo !== false ? (
                <>
                  Restringir el acceso a <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
                </>
              ) : (
                <>
                  Restaurar el acceso a <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedUser?.acceso_activo !== false && (
              <div className="space-y-2">
                <Label>Motivo de la Restricción</Label>
                <Select
                  value={restrictionData.motivo_restriccion}
                  onValueChange={(value) => setRestrictionData({...restrictionData, motivo_restriccion: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jugador ya no forma parte del club">
                      Jugador ya no forma parte del club
                    </SelectItem>
                    <SelectItem value="Finalización de temporada">
                      Finalización de temporada
                    </SelectItem>
                    <SelectItem value="Baja voluntaria">
                      Baja voluntaria
                    </SelectItem>
                    <SelectItem value="Impago de cuotas">
                      Impago de cuotas
                    </SelectItem>
                    <SelectItem value="Otro">
                      Otro motivo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas del Administrador (opcional)</Label>
              <Textarea
                placeholder="Añade notas internas sobre este usuario..."
                value={restrictionData.notas_admin}
                onChange={(e) => setRestrictionData({...restrictionData, notas_admin: e.target.value})}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                {selectedUser?.acceso_activo !== false ? (
                  <>
                    <strong>⚠️ Importante:</strong> Al restringir el acceso, el usuario no podrá iniciar sesión en la aplicación.
                    Los datos del usuario y sus jugadores se mantendrán en el sistema.
                  </>
                ) : (
                  <>
                    <strong>✅ Restaurar Acceso:</strong> El usuario podrá volver a iniciar sesión y acceder a la aplicación normalmente.
                  </>
                )}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestrictDialog(false);
                setSelectedUser(null);
                setRestrictionData({ motivo_restriccion: "", notas_admin: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRestriction}
              disabled={updateUserMutation.isPending || (selectedUser?.acceso_activo !== false && !restrictionData.motivo_restriccion)}
              className={selectedUser?.acceso_activo !== false ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.acceso_activo !== false ? (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Confirmar Restricción
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirmar Restauración
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}