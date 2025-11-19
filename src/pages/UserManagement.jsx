import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Ban,
  Trash2,
  Eye,
  EyeOff,
  User,
  Check
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [showCoordinatorDialog, setShowCoordinatorDialog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [restrictionData, setRestrictionData] = useState({
    motivo_restriccion: "",
    notas_admin: ""
  });
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [coachData, setCoachData] = useState({
    categorias_entrena: [],
    telefono_entrenador: ""
  });

  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
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
      // Clean the data - remove null/undefined values
      const cleanData = Object.entries(userData).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      return await base44.entities.User.update(userId, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowRestrictDialog(false);
      setShowDeleteDialog(false);
      setShowRoleDialog(false);
      setShowCoachDialog(false);
      setShowCoordinatorDialog(false);
      setSelectedUser(null);
      setRestrictionData({ motivo_restriccion: "", notas_admin: "" });
      setCoachData({ categorias_entrena: [], telefono_entrenador: "" });
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

  const handleDeleteUser = async (user) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
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

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        eliminado: true,
        acceso_activo: false,
        fecha_eliminacion: new Date().toISOString(),
        motivo_eliminacion: "Cuenta eliminada por el administrador"
      }
    });
  };

  const handleChangeRole = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role || "user");
    setSelectedPlayerId(user.jugador_id || "");
    setShowRoleDialog(true);
  };

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return;

    const updateData = {
      role: selectedRole
    };

    if (selectedRole === "jugador") {
      if (!selectedPlayerId) {
        toast.error("Por favor, selecciona un jugador para vincular.");
        return;
      }
      updateData.jugador_id = selectedPlayerId;
    } else {
      updateData.jugador_id = null;
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: updateData
    });
  };

  const handleCoachToggle = (user) => {
    setSelectedUser(user);
    setCoachData({
      categorias_entrena: user.categorias_entrena || [],
      telefono_entrenador: user.telefono_entrenador || ""
    });
    setShowCoachDialog(true);
  };

  const handleCoordinatorToggle = (user) => {
    setSelectedUser(user);
    setShowCoordinatorDialog(true);
  };

  const handleConfirmCoach = async () => {
    if (!selectedUser) return;

    const isSettingAsCoach = !selectedUser.es_entrenador;

    // Build minimal update object
    const updateData = {
      es_entrenador: isSettingAsCoach
    };
    
    if (isSettingAsCoach) {
      updateData.categorias_entrena = coachData.categorias_entrena;
      if (coachData.telefono_entrenador) {
        updateData.telefono_entrenador = coachData.telefono_entrenador;
      }
    } else {
      updateData.categorias_entrena = [];
      updateData.telefono_entrenador = null;
      updateData.es_coordinador = false;
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: updateData
    });
  };

  const handleConfirmCoordinator = async () => {
    if (!selectedUser) return;

    const isSettingAsCoordinator = !selectedUser.es_coordinador;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        es_coordinador: isSettingAsCoordinator,
        tiene_hijos_jugando: isSettingAsCoordinator ? false : selectedUser.tiene_hijos_jugando
      }
    });
  };

  const handleToggleHijos = async (user) => {
    const newValue = !user.tiene_hijos_jugando;
    updateUserMutation.mutate({
      userId: user.id,
      userData: {
        tiene_hijos_jugando: newValue
      }
    });
  };

  const toggleCategory = (category) => {
    setCoachData(prev => {
      const current = prev.categorias_entrena || [];
      if (current.includes(category)) {
        return {
          ...prev,
          categorias_entrena: current.filter(c => c !== category)
        };
      } else {
        return {
          ...prev,
          categorias_entrena: [...current, category]
        };
      }
    });
  };

  // Filtrar usuarios (ocultar eliminados por defecto)
  const filteredUsers = users.filter(user => {
    // Filtrar eliminados
    if (!showDeleted && user.eliminado === true) {
      return false;
    }

    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Obtener jugadores por usuario
  const getUserPlayers = (userEmail) => {
    return players.filter(p => p.email_padre === userEmail || p.email === userEmail);
  };

  // Estadísticas (sin contar eliminados)
  const activeUsersWithoutDeleted = users.filter(u => u.eliminado !== true);
  const activeUsers = activeUsersWithoutDeleted.filter(u => u.acceso_activo !== false && u.role === "user");
  const restrictedUsers = activeUsersWithoutDeleted.filter(u => u.acceso_activo === false);
  const admins = activeUsersWithoutDeleted.filter(u => u.role === "admin");
  const deletedUsers = users.filter(u => u.eliminado === true);
  const jugadores = activeUsersWithoutDeleted.filter(u => u.role === "jugador");
  const entrenadores = activeUsersWithoutDeleted.filter(u => u.es_entrenador === true && !u.es_coordinador);
  const coordinadores = activeUsersWithoutDeleted.filter(u => u.es_coordinador === true);


  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-600 mt-1">Control de acceso, roles, permisos y entrenadores</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Padres Activos</p>
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
                <p className="text-sm text-slate-600 mb-1">Administradores</p>
                <p className="text-3xl font-bold text-orange-600">{admins.length}</p>
              </div>
              <Shield className="w-12 h-12 text-orange-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg border-2 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Jugadores</p>
                <p className="text-3xl font-bold text-purple-600">{jugadores.length}</p>
              </div>
              <User className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">🎓 Entrenadores</p>
                <p className="text-3xl font-bold text-blue-600">{entrenadores.length}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg border-2 border-cyan-200 bg-cyan-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">🎓 Coordinadores</p>
                <p className="text-3xl font-bold text-cyan-600">{coordinadores.length}</p>
              </div>
              <Shield className="w-12 h-12 text-cyan-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Restringidos</p>
                <p className="text-3xl font-bold text-red-600">{restrictedUsers.length}</p>
              </div>
              <UserX className="w-12 h-12 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg border-2 border-slate-300">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Eliminados</p>
                <p className="text-3xl font-bold text-slate-600">{deletedUsers.length}</p>
              </div>
              <Trash2 className="w-12 h-12 text-slate-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Buscador + Toggle de eliminados */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar usuario por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2">
              {showDeleted ? <Eye className="w-5 h-5 text-slate-600" /> : <EyeOff className="w-5 h-5 text-slate-400" />}
              <Label htmlFor="show-deleted" className="text-sm font-medium cursor-pointer">
                Mostrar eliminados ({deletedUsers.length})
              </Label>
              <Switch
                id="show-deleted"
                checked={showDeleted}
                onCheckedChange={setShowDeleted}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Alerta informativa */}
      {deletedUsers.length > 0 && (
        <Card className="border-none shadow-lg bg-blue-50 border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="bg-blue-500 rounded-full p-2">
                <Trash2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-blue-900 mb-2">ℹ️ Sobre los usuarios "eliminados"</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Los usuarios marcados como "eliminados" <strong>no pueden iniciar sesión</strong> y <strong>no aparecen en las listas</strong>,
                  pero sus datos permanecen en el sistema. Es como si estuvieran borrados.
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Para eliminarlos definitivamente del sistema:</strong> Usa el botón de Feedback en el sidebar y solicita
                  al equipo de Base44 que elimine estos usuarios. Ellos tienen acceso al sistema de autenticación y pueden borrarlos permanentemente.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                const isDeleted = user.eliminado === true;
                const linkedPlayer = user.jugador_id ? players.find(p => p.id === user.jugador_id) : null;
                const isCoach = user.es_entrenador === true && !user.es_coordinador;
                const isCoordinator = user.es_coordinador === true;

                return (
                  <div
                    key={user.id}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isDeleted
                        ? 'bg-slate-100 border-slate-400 opacity-75'
                        : hasRestriction
                        ? 'bg-red-50 border-red-200'
                        : isCoordinator
                        ? 'bg-cyan-50 border-cyan-300'
                        : isCoach
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="font-bold text-lg text-slate-900">{user.full_name}</h3>
                          <Badge className={
                            user.role === "admin"
                              ? "bg-orange-600"
                              : user.role === "jugador"
                              ? "bg-purple-600"
                              : "bg-slate-600"
                          }>
                            {user.role === "admin" ? "🎓 Administrador" : user.role === "jugador" ? "⚽ Jugador" : "👨‍👩‍👧 Padre/Tutor"}
                          </Badge>
                          {isCoordinator && (
                            <Badge className="bg-cyan-600 text-white">
                              🎓 Coordinador Deportivo
                            </Badge>
                          )}
                          {isCoach && (
                            <Badge className="bg-blue-600 text-white">
                              🏃 Entrenador
                            </Badge>
                          )}
                          {isDeleted && (
                            <Badge className="bg-slate-700 text-white">
                              <Trash2 className="w-3 h-3 mr-1" />
                              ELIMINADO
                            </Badge>
                          )}
                          {!isDeleted && hasRestriction && (
                            <Badge className="bg-red-600 text-white">
                              <Ban className="w-3 h-3 mr-1" />
                              Restringido
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <Mail className="w-4 h-4" />
                          <span>{user.email}</span>
                        </div>

                        {isCoordinator && (
                          <div className="text-sm text-cyan-700 bg-cyan-100 rounded p-2 mb-2">
                            <strong>🎓 Coordinador Deportivo</strong>
                            {user.tiene_hijos_jugando && (
                              <span className="ml-2">• 👨‍👩‍👧 Con hijos jugando</span>
                            )}
                          </div>
                        )}

                        {isCoach && user.categorias_entrena && user.categorias_entrena.length > 0 && (
                          <div className="text-sm text-blue-700 bg-blue-100 rounded p-2 mb-2">
                            <strong>🏃 {isCoordinator ? "También Entrena:" : "Entrena:"}</strong> {user.categorias_entrena.join(", ")}
                            {user.telefono_entrenador && ` • 📱 ${user.telefono_entrenador}`}
                            {!isCoordinator && user.tiene_hijos_jugando && (
                              <span className="ml-2">• 👨‍👩‍👧 Con hijos jugando</span>
                            )}
                          </div>
                        )}

                        {user.role === "jugador" && linkedPlayer && (
                          <div className="text-sm text-purple-700 bg-purple-50 rounded p-2 mb-2">
                            <strong>Jugador vinculado:</strong> {linkedPlayer.nombre} - {linkedPlayer.deporte}
                          </div>
                        )}

                        {userPlayers.length > 0 && user.role !== "jugador" && (
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

                        {isDeleted && user.fecha_eliminacion && (
                          <div className="flex items-center gap-2 text-xs text-slate-600 mt-2 bg-slate-200 rounded p-2">
                            <Calendar className="w-3 h-3" />
                            Eliminado: {new Date(user.fecha_eliminacion).toLocaleDateString('es-ES')}
                          </div>
                        )}

                        {!isDeleted && hasRestriction && user.motivo_restriccion && (
                          <div className="text-sm text-red-700 bg-red-100 rounded p-2 mt-2">
                            <strong>Motivo:</strong> {user.motivo_restriccion}
                          </div>
                        )}

                        {!isDeleted && hasRestriction && user.fecha_restriccion && (
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

                      {!isDeleted && (
                        <div className="flex flex-col gap-2">
                          {user.role !== "admin" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCoordinatorToggle(user)}
                                className={isCoordinator ? "bg-cyan-100 hover:bg-cyan-200 border-cyan-400" : "bg-cyan-50 hover:bg-cyan-100 border-cyan-300"}
                              >
                                {isCoordinator ? "✅ Coordinador" : "🎓 Marcar Coordinador"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCoachToggle(user)}
                                className={user.es_entrenador ? "bg-blue-100 hover:bg-blue-200 border-blue-400" : "bg-blue-50 hover:bg-blue-100 border-blue-300"}
                              >
                                {user.es_entrenador ? "✅ Entrenador" : "🎓 Marcar Entrenador"}
                              </Button>
                              {(isCoordinator || isCoach) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleHijos(user)}
                                  className={user.tiene_hijos_jugando ? "bg-green-100 hover:bg-green-200 border-green-400" : "bg-slate-50 hover:bg-slate-100 border-slate-300"}
                                >
                                  {user.tiene_hijos_jugando ? "✅ Con hijos" : "👨‍👩‍👧 Tiene hijos"}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleChangeRole(user)}
                                className="bg-purple-50 hover:bg-purple-100 border-purple-300"
                              >
                                <Shield className="w-4 h-4 mr-1" />
                                Cambiar Rol
                              </Button>
                              <Button
                                size="sm"
                                variant={hasRestriction ? "default" : "destructive"}
                                onClick={() => handleRestrictAccess(user)}
                                className={hasRestriction ? "bg-green-600 hover:bg-green-700" : ""}
                              >
                                {hasRestriction ? (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Restaurar
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4 mr-1" />
                                    Restringir
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(user)}
                                className="bg-slate-700 hover:bg-slate-800"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Eliminar
                              </Button>
                            </>
                          )}
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

      {/* Diálogo de Entrenador */}
      <Dialog open={showCoachDialog} onOpenChange={setShowCoachDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              {selectedUser?.es_entrenador ? "Quitar Rol de Entrenador" : "Asignar como Entrenador"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.es_entrenador ? (
                <>Quitar permisos de entrenador a <strong>{selectedUser?.full_name}</strong></>
              ) : (
                <>Asignar permisos de entrenador a <strong>{selectedUser?.full_name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!selectedUser?.es_entrenador && (
              <>
                <div className="space-y-2">
                  <Label>Categorías que Entrena (selecciona una o varias) *</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border-2 border-slate-200 rounded-lg p-3">
                    {[
                      "Fútbol Pre-Benjamín (Mixto)",
                      "Fútbol Benjamín (Mixto)",
                      "Fútbol Alevín (Mixto)",
                      "Fútbol Infantil (Mixto)",
                      "Fútbol Cadete",
                      "Fútbol Juvenil",
                      "Fútbol Aficionado",
                      "Fútbol Femenino",
                      "Baloncesto (Mixto)"
                    ].map(category => (
                      <div
                        key={category}
                        onClick={() => toggleCategory(category)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          coachData.categorias_entrena?.includes(category)
                            ? 'bg-blue-100 border-blue-500 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            coachData.categorias_entrena?.includes(category)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-slate-300'
                          }`}>
                            {coachData.categorias_entrena?.includes(category) && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                          <span className={`font-medium ${
                            coachData.categorias_entrena?.includes(category)
                              ? 'text-blue-900'
                              : 'text-slate-700'
                          }`}>
                            {category.includes("Fútbol") ? "⚽" : "🏀"} {category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {coachData.categorias_entrena?.length > 0 && (
                    <p className="text-sm text-blue-700 font-medium">
                      ✅ {coachData.categorias_entrena.length} categoría{coachData.categorias_entrena.length !== 1 ? 's' : ''} seleccionada{coachData.categorias_entrena.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coach-phone-input">Teléfono de Contacto (opcional)</Label>
                  <Input
                    id="coach-phone-input"
                    type="tel"
                    placeholder="Ej: 666 123 456"
                    value={coachData.telefono_entrenador}
                    onChange={(e) => setCoachData({...coachData, telefono_entrenador: e.target.value})}
                  />
                </div>
              </>
            )}

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-bold mb-2">
                🎓 Permisos de Entrenador:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✅ Crear convocatorias para partidos/entrenamientos</li>
                <li>✅ Gestionar jugadores convocados</li>
                <li>✅ Ver confirmaciones de asistencia</li>
                <li>✅ Enviar notificaciones automáticas</li>
                <li>✅ Acceso a todas sus categorías asignadas</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCoachDialog(false);
                setSelectedUser(null);
                setCoachData({ categorias_entrena: [], telefono_entrenador: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCoach}
              disabled={updateUserMutation.isPending || (!selectedUser?.es_entrenador && (!coachData.categorias_entrena || coachData.categorias_entrena.length === 0))}
              className={selectedUser?.es_entrenador ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.es_entrenador ? (
                "Quitar Rol de Entrenador"
              ) : (
                "Confirmar Entrenador"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Coordinador */}
      <Dialog open={showCoordinatorDialog} onOpenChange={setShowCoordinatorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-600" />
              {selectedUser?.es_coordinador ? "Quitar Rol de Coordinador" : "Asignar como Coordinador Deportivo"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.es_coordinador ? (
                <>Quitar permisos de Coordinador a <strong>{selectedUser?.full_name}</strong></>
              ) : (
                <>Asignar permisos de Coordinador-Director Deportivo a <strong>{selectedUser?.full_name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-cyan-50 border-2 border-cyan-300 rounded-lg p-4">
              <p className="text-sm text-cyan-900 font-bold mb-2">
                🎓 Permisos de Coordinador-Director Deportivo:
              </p>
              <ul className="text-sm text-cyan-800 space-y-1">
                <li>✅ <strong>Visibilidad completa:</strong> Asistencia y evaluaciones de todas las categorías</li>
                <li>✅ <strong>Reportes:</strong> Ver reportes de entrenadores de todos los equipos</li>
                <li>✅ <strong>Plantillas:</strong> Acceso a todos los jugadores del club</li>
                <li>✅ <strong>Convocatorias:</strong> Ver todas las convocatorias (sin crear)</li>
                <li>✅ <strong>Chat especial:</strong> "Coordinación Deportiva" para familias</li>
                <li>❌ <strong>NO gestiona:</strong> Pagos, inscripciones, administración</li>
              </ul>
            </div>

            <div className="bg-cyan-50 border-2 border-cyan-300 rounded-lg p-4">
              <p className="text-sm text-cyan-900 font-bold mb-2">
                ℹ️ Información:
              </p>
              <p className="text-sm text-cyan-800 mb-2">
                El <strong>Coordinador Deportivo</strong> tiene acceso a todas las categorías para asistencia, evaluaciones y reportes.
              </p>
              <p className="text-sm text-cyan-800 mb-2">
                <strong>Puede ser también Entrenador</strong> de categorías específicas si se le asigna ese rol.
              </p>
              <p className="text-sm text-cyan-800">
                Usa el botón <strong>"Tiene hijos"</strong> para darle acceso a funciones de padre 
                (gestión de jugadores y pagos) si tiene hijos en el club.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCoordinatorDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmCoordinator}
              disabled={updateUserMutation.isPending}
              className={selectedUser?.es_coordinador ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.es_coordinador ? (
                "Quitar Rol de Coordinador"
              ) : (
                "Confirmar Coordinador Deportivo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                <Label htmlFor="restriction-reason-select">Motivo de la Restricción</Label>
                <Select
                  value={restrictionData.motivo_restriccion}
                  onValueChange={(value) => setRestrictionData({...restrictionData, motivo_restriccion: value})}
                >
                  <SelectTrigger id="restriction-reason-select">
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
              <Label htmlFor="admin-notes-textarea">Notas del Administrador (opcional)</Label>
              <Textarea
                id="admin-notes-textarea"
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

      {/* Diálogo de Eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-slate-700" />
              Eliminar Usuario
            </DialogTitle>
            <DialogDescription>
              Marcar como eliminado a <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <p className="text-sm text-orange-900 mb-3">
                <strong>⚠️ ¿Qué hace este botón?</strong>
              </p>
              <ul className="text-sm text-orange-800 space-y-2 list-disc list-inside">
                <li>El usuario <strong>NO podrá iniciar sesión</strong></li>
                <li>El usuario <strong>NO aparecerá en las listas</strong></li>
                <li>Los datos permanecen en el sistema (jugadores, pagos, etc.)</li>
                <li>Es <strong>reversible</strong> si es necesario</li>
              </ul>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-2">
                <strong>📧 Para eliminar DEFINITIVAMENTE del sistema:</strong>
              </p>
              <p className="text-sm text-blue-800">
                Usa el botón de <strong>Feedback</strong> en el sidebar y solicita al equipo de Base44 que elimine este usuario permanentemente del sistema de autenticación.
              </p>
            </div>

            {selectedUser && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-700">
                  <strong>Usuario a eliminar:</strong><br/>
                  {selectedUser.full_name} - {selectedUser.email}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={updateUserMutation.isPending}
              className="bg-slate-700 hover:bg-slate-800"
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Sí, Marcar como Eliminado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Cambio de Rol */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />
              Cambiar Rol de Usuario
            </DialogTitle>
            <DialogDescription>
              Cambiar el rol de <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-role-select">Rol del Usuario</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="user-role-select">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">👨‍👩‍👧 Padre/Tutor (acceso completo)</SelectItem>
                  <SelectItem value="jugador">⚽ Jugador (acceso limitado)</SelectItem>
                  <SelectItem value="admin">🎓 Administrador (gestión total)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === "jugador" && (
              <div className="space-y-2">
                <Label htmlFor="player-link-select">Vincular a Jugador *</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger id="player-link-select">
                    <SelectValue placeholder="Selecciona el jugador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter(p => p.acceso_jugador_autorizado && p.email_jugador === selectedUser?.email)
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} - {p.deporte}
                        </SelectItem>
                      ))}
                    {players.filter(p => p.acceso_jugador_autorizado && p.email_jugador === selectedUser?.email).length === 0 && (
                      <div className="p-2 text-sm text-gray-500">
                        No hay jugadores autorizados para este usuario con el email {selectedUser?.email}.
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-purple-600">
                  Solo se muestran jugadores autorizados con este email.
                  Asegúrate de que el jugador tenga el email correcto y 'acceso_jugador_autorizado' activado.
                </p>
              </div>
            )}

            <div className={`rounded-lg p-4 ${
              selectedRole === "admin"
                ? "bg-orange-50 border-2 border-orange-300"
                : selectedRole === "jugador"
                ? "bg-purple-50 border-2 border-purple-300"
                : "bg-blue-50 border-2 border-blue-300"
            }`}>
              <p className="text-sm font-bold mb-2">
                {selectedRole === "admin" && "🎓 Administrador - Acceso Total"}
                {selectedRole === "jugador" && "⚽ Jugador - Acceso Limitado"}
                {selectedRole === "user" && "👨‍👩‍👧 Padre/Tutor - Acceso Completo"}
              </p>
              <ul className="text-xs space-y-1">
                {selectedRole === "admin" && (
                  <>
                    <li>✅ Gestión de jugadores, pagos, pedidos, usuarios</li>
                    <li>✅ Control total de la aplicación</li>
                  </>
                )}
                {selectedRole === "jugador" && (
                  <>
                    <li>✅ Ver su perfil, horarios, calendario, anuncios, galería</li>
                    <li>✅ Chat con equipo y entrenadores</li>
                    <li>❌ NO puede: gestionar pagos, pedidos ni otros jugadores</li>
                  </>
                )}
                {selectedRole === "user" && (
                  <>
                    <li>✅ Gestión de sus jugadores</li>
                    <li>✅ Pagos, pedidos, chat, calendario, etc.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRoleDialog(false);
                setSelectedUser(null);
                setSelectedRole("user");
                setSelectedPlayerId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRoleChange}
              disabled={updateUserMutation.isPending || (selectedRole === "jugador" && !selectedPlayerId)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Confirmar Cambio de Rol
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}