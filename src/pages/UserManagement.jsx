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
  Check,
  Smartphone,
  Send
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
  const [showTreasurerDialog, setShowTreasurerDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
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
      setShowTreasurerDialog(false);
      setShowPlayerDialog(false);
      setSelectedUser(null);
      setSelectedPlayerId("");
      setRestrictionData({ motivo_restriccion: "", notas_admin: "" });
      setCoachData({ categorias_entrena: [], telefono_entrenador: "" });
      toast.success("Usuario actualizado correctamente");
    },
  });

  const handlePlayerToggle = (user) => {
    setSelectedUser(user);
    setSelectedPlayerId(user.player_id || "");
    setShowPlayerDialog(true);
  };

  const handleConfirmPlayer = async () => {
    if (!selectedUser) return;

    const isSettingAsPlayer = !selectedUser.es_jugador;

    const updateData = {
      es_jugador: isSettingAsPlayer,
      player_id: isSettingAsPlayer ? selectedPlayerId : null
    };

    if (isSettingAsPlayer && !selectedPlayerId) {
      toast.error("Por favor, selecciona un jugador para vincular.");
      return;
    }

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: updateData
    });
  };

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

  const handleTreasurerToggle = (user) => {
    setSelectedUser(user);
    setShowTreasurerDialog(true);
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

  const handleConfirmTreasurer = async () => {
    if (!selectedUser) return;

    const isSettingAsTreasurer = !selectedUser.es_tesorero;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        es_tesorero: isSettingAsTreasurer,
        tiene_hijos_jugando: isSettingAsTreasurer ? false : selectedUser.tiene_hijos_jugando
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

  const handleToggleFirmas = async (user) => {
    const newValue = !user.puede_gestionar_firmas;
    updateUserMutation.mutate({
      userId: user.id,
      userData: {
        puede_gestionar_firmas: newValue
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

  // Calcular edad de jugador
  const calcularEdad = (fechaNac) => {
    if (!fechaNac) return null;
    const hoy = new Date();
    const nacimiento = new Date(fechaNac);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  // Detectar usuarios que deberían tener acceso de jugador +18
  const usersWithPlayerAccess = users.filter(u => u.es_jugador === true).map(u => u.player_id);
  const pendingPlayerAccessUsers = users.filter(user => {
    if (user.eliminado || user.es_jugador || user.role === "admin") return false;
    // Buscar si hay un jugador +18 con el email de este usuario
    const matchingPlayer = players.find(p => 
      p.activo && 
      p.email_padre === user.email && 
      calcularEdad(p.fecha_nacimiento) >= 18 &&
      !usersWithPlayerAccess.includes(p.id)
    );
    return !!matchingPlayer;
  });

  // Filtrar usuarios (ocultar eliminados por defecto)
  const filteredUsers = users.filter(user => {
    // Filtrar eliminados
    if (!showDeleted && user.eliminado === true) {
      return false;
    }

    // Filtrar por rol
    if (roleFilter !== "all") {
      if (roleFilter === "admin" && user.role !== "admin") return false;
      if (roleFilter === "parent" && (user.role === "admin" || user.es_jugador || user.es_entrenador || user.es_coordinador || user.es_tesorero)) return false;
      if (roleFilter === "player" && user.es_jugador !== true) return false;
      if (roleFilter === "coach" && (user.es_entrenador !== true || user.es_coordinador === true)) return false;
      if (roleFilter === "coordinator" && user.es_coordinador !== true) return false;
      if (roleFilter === "treasurer" && user.es_tesorero !== true) return false;
      if (roleFilter === "restricted" && user.acceso_activo !== false) return false;
      if (roleFilter === "pending_player") {
        return pendingPlayerAccessUsers.some(u => u.id === user.id);
      }
      if (roleFilter === "with_app" && user.app_instalada !== true) return false;
      if (roleFilter === "without_app" && (user.app_instalada === true || user.role === "admin")) return false;
      if (roleFilter === "staff" && !(user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero)) return false;
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

  // Detectar parejas de progenitores (comparten al menos un jugador)
  const detectParentPairs = () => {
    const pairs = [];
    const processedPairs = new Set();

    players.forEach(player => {
      if (!player.email_padre || !player.email_tutor_2) return;
      
      const parent1Email = player.email_padre.toLowerCase();
      const parent2Email = player.email_tutor_2.toLowerCase();
      const pairKey = [parent1Email, parent2Email].sort().join('|');
      
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const parent1 = users.find(u => u.email?.toLowerCase() === parent1Email);
      const parent2 = users.find(u => u.email?.toLowerCase() === parent2Email);
      
      // Obtener todos los jugadores compartidos
      const sharedPlayers = players.filter(p => 
        (p.email_padre?.toLowerCase() === parent1Email && p.email_tutor_2?.toLowerCase() === parent2Email) ||
        (p.email_padre?.toLowerCase() === parent2Email && p.email_tutor_2?.toLowerCase() === parent1Email)
      );

      if (sharedPlayers.length > 0) {
        pairs.push({
          parent1: parent1 || { email: parent1Email, full_name: parent1Email },
          parent2: parent2 || { email: parent2Email, full_name: parent2Email },
          sharedPlayers,
          parent1Registered: !!parent1,
          parent2Registered: !!parent2
        });
      }
    });

    return pairs;
  };

  const parentPairs = detectParentPairs();

  // Estadísticas (sin contar eliminados)
  const activeUsersWithoutDeleted = users.filter(u => u.eliminado !== true);
  const activeUsers = activeUsersWithoutDeleted.filter(u => u.acceso_activo !== false && u.role === "user");
  const restrictedUsers = activeUsersWithoutDeleted.filter(u => u.acceso_activo === false);
  const admins = activeUsersWithoutDeleted.filter(u => u.role === "admin");
  const deletedUsers = users.filter(u => u.eliminado === true);
  const jugadores = activeUsersWithoutDeleted.filter(u => u.es_jugador === true);
  const entrenadores = activeUsersWithoutDeleted.filter(u => u.es_entrenador === true && !u.es_coordinador);
  const coordinadores = activeUsersWithoutDeleted.filter(u => u.es_coordinador === true);
  const tesoreros = activeUsersWithoutDeleted.filter(u => u.es_tesorero === true);
  const usersWithApp = activeUsersWithoutDeleted.filter(u => u.app_instalada === true);
  const usersWithoutApp = activeUsersWithoutDeleted.filter(u => u.app_instalada !== true && u.role !== "admin");
  const staffUsers = activeUsersWithoutDeleted.filter(u => u.role === "admin" || u.es_entrenador || u.es_coordinador || u.es_tesorero);

  // Enviar recordatorio de instalación
  const sendInstallReminder = async (user) => {
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: user.email,
        subject: "📲 ¡Instala la App del CD Bustarviejo en tu móvil!",
        body: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial;padding:20px;background:#f1f5f9;">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;">
<div style="background:#ea580c;padding:20px;text-align:center;">
<h1 style="color:white;margin:0;">📲 ¡Instala la App!</h1>
</div>
<div style="padding:20px;">
<p>Hola <strong>${user.full_name}</strong>,</p>
<p>Hemos detectado que <strong>aún no tienes la app del club instalada</strong> en tu móvil.</p>
<p>Con la app instalada podrás:</p>
<ul>
<li>✅ Recibir notificaciones de convocatorias</li>
<li>✅ Acceso rápido desde la pantalla de inicio</li>
<li>✅ Mejor experiencia de uso</li>
</ul>
<p><strong>¿Cómo instalarla?</strong></p>
<p>1. Abre la app en tu navegador</p>
<p>2. Pulsa en el menú → "📲 Ver cómo instalar"</p>
<p>3. Sigue las instrucciones según tu móvil</p>
<div style="text-align:center;margin:20px 0;">
<a href="https://club-gestion-bustarviejo-1fb134d6.base44.app" style="background:#ea580c;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Abrir la App →</a>
</div>
</div>
</div>
</body></html>`
      });

      await base44.entities.User.update(user.id, {
        recordatorio_instalacion_enviado: true,
        fecha_recordatorio_instalacion: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      toast.success(`✅ Recordatorio enviado a ${user.full_name}`);
    } catch (error) {
      console.error("Error enviando recordatorio:", error);
      toast.error("Error al enviar el recordatorio");
    }
  };

  // Enviar recordatorio masivo
  const sendBulkInstallReminders = async () => {
    const usersToRemind = usersWithoutApp.filter(u => !u.recordatorio_instalacion_enviado);
    if (usersToRemind.length === 0) {
      toast.info("Ya se enviaron recordatorios a todos los usuarios");
      return;
    }

    toast.info(`Enviando ${usersToRemind.length} recordatorios...`);
    let sent = 0;
    for (const user of usersToRemind) {
      try {
        await sendInstallReminder(user);
        sent++;
      } catch (e) {
        console.error(e);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    toast.success(`✅ ${sent} recordatorios enviados`);
  };


  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-600 mt-1">Control de acceso, roles, permisos y entrenadores</p>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-green-500">
          <p className="text-lg font-bold text-green-600">{activeUsers.length}</p>
          <p className="text-[9px] text-slate-500">Padres</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-orange-500">
          <p className="text-lg font-bold text-orange-600">{admins.length}</p>
          <p className="text-[9px] text-slate-500">Admins</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-purple-500">
          <p className="text-lg font-bold text-purple-600">{jugadores.length}</p>
          <p className="text-[9px] text-slate-500">Jugadores</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-blue-500">
          <p className="text-lg font-bold text-blue-600">{entrenadores.length}</p>
          <p className="text-[9px] text-slate-500">Entren.</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-cyan-500">
          <p className="text-lg font-bold text-cyan-600">{coordinadores.length}</p>
          <p className="text-[9px] text-slate-500">Coord.</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-emerald-500">
          <p className="text-lg font-bold text-emerald-600">{tesoreros.length}</p>
          <p className="text-[9px] text-slate-500">Tesor.</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-red-500">
          <p className="text-lg font-bold text-red-600">{restrictedUsers.length}</p>
          <p className="text-[9px] text-slate-500">Restrin.</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-slate-400">
          <p className="text-lg font-bold text-slate-600">{deletedUsers.length}</p>
          <p className="text-[9px] text-slate-500">Elimin.</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-green-400">
          <p className="text-lg font-bold text-green-600">{usersWithApp.length}</p>
          <p className="text-[9px] text-slate-500">📲 App</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-amber-400">
          <p className="text-lg font-bold text-amber-600">{usersWithoutApp.length}</p>
          <p className="text-[9px] text-slate-500">📵 Sin</p>
        </div>
      </div>

      {/* Alertas compactas */}
      {(usersWithoutApp.length > 5 || pendingPlayerAccessUsers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {usersWithoutApp.length > 5 && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900">📵 {usersWithoutApp.length} sin app</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs h-7" onClick={sendBulkInstallReminders}>
                <Send className="w-3 h-3 mr-1" />
                Recordar
              </Button>
            </div>
          )}
          {pendingPlayerAccessUsers.length > 0 && (
            <div className="bg-purple-50 border border-purple-300 rounded-lg p-3 flex items-center gap-3">
              <User className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-purple-900">⚽ {pendingPlayerAccessUsers.length} jugadores +18 pendientes</p>
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs h-7" onClick={() => setRoleFilter("pending_player")}>
                Ver
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Buscador + Filtros compactos */}
      <div className="bg-white rounded-lg shadow p-3 space-y-3">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-slate-50 rounded px-3 py-1">
            <Switch id="show-deleted" checked={showDeleted} onCheckedChange={setShowDeleted} className="scale-90" />
            <Label htmlFor="show-deleted" className="text-xs cursor-pointer">Eliminados</Label>
          </div>
        </div>
        
        {/* Filtros compactos */}
        <div className="flex flex-wrap gap-1">
          {[
            { key: "all", label: "Todos", count: users.filter(u => !u.eliminado).length },
            { key: "parent", label: "👨‍👩‍👧 Padres", count: activeUsers.length },
            { key: "staff", label: "👔 Staff", count: staffUsers.length },
            { key: "admin", label: "🎓 Admin", count: admins.length },
            { key: "player", label: "⚽ Jugador", count: jugadores.length },
            { key: "coach", label: "🏃 Entren.", count: entrenadores.length },
            { key: "coordinator", label: "🎓 Coord.", count: coordinadores.length },
            { key: "treasurer", label: "💰 Tesor.", count: tesoreros.length },
            { key: "restricted", label: "🚫 Restrin.", count: restrictedUsers.length },
            { key: "with_app", label: "📲 App", count: usersWithApp.length },
            { key: "without_app", label: "📵 Sin", count: usersWithoutApp.length },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                roleFilter === f.key 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>



      {/* Lista de Usuarios */}
      <Card className="border-none shadow-lg">
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-orange-600" />
            Usuarios ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
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
            <div className="space-y-2">
              {filteredUsers.map((user) => {
                const userPlayers = getUserPlayers(user.email);
                const activePlayers = userPlayers.filter(p => p.activo);
                const hasRestriction = user.acceso_activo === false;
                const isDeleted = user.eliminado === true;
                const linkedPlayer = user.jugador_id ? players.find(p => p.id === user.jugador_id) : null;
                const isCoach = user.es_entrenador === true && !user.es_coordinador;
                const isCoordinator = user.es_coordinador === true;
                const isTreasurer = user.es_tesorero === true;
                const isPlayerUser = user.es_jugador === true;

                return (
                  <div
                    key={user.id}
                    className={`p-3 rounded-lg border transition-all ${
                      isDeleted
                        ? 'bg-slate-100 border-slate-300 opacity-60'
                        : hasRestriction
                        ? 'bg-red-50 border-red-200'
                        : isCoordinator
                        ? 'bg-cyan-50 border-cyan-200'
                        : isTreasurer
                        ? 'bg-green-50 border-green-200'
                        : isCoach
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-900 truncate">{user.full_name}</span>
                          {/* Badges compactos */}
                          <div className="flex gap-1 flex-wrap">
                            {user.role === "admin" && <Badge className="bg-orange-600 text-[10px] px-1.5 py-0">Admin</Badge>}
                            {isPlayerUser && <Badge className="bg-purple-600 text-[10px] px-1.5 py-0">⚽+18</Badge>}
                            {isCoordinator && <Badge className="bg-cyan-600 text-[10px] px-1.5 py-0">Coord</Badge>}
                            {isTreasurer && <Badge className="bg-green-600 text-[10px] px-1.5 py-0">Teso</Badge>}
                            {isCoach && <Badge className="bg-blue-600 text-[10px] px-1.5 py-0">Entr</Badge>}
                            {isDeleted && <Badge className="bg-slate-600 text-[10px] px-1.5 py-0">Elim</Badge>}
                            {!isDeleted && hasRestriction && <Badge className="bg-red-600 text-[10px] px-1.5 py-0">🚫</Badge>}
                            {user.app_instalada === true && <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">📲</Badge>}
                            {user.app_instalada !== true && user.role !== "admin" && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0">📵</Badge>}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                        
                        {/* Info adicional en línea compacta */}
                        {(userPlayers.length > 0 || user.categorias_entrena?.length > 0 || linkedPlayer) && (
                          <p className="text-xs text-slate-600 mt-1 truncate">
                            {userPlayers.length > 0 && !isPlayerUser && `👶 ${userPlayers.map(p => p.nombre).join(", ")}`}
                            {user.categorias_entrena?.length > 0 && ` 🏃 ${user.categorias_entrena.length} cat.`}
                            {linkedPlayer && `⚽ ${linkedPlayer.nombre}`}
                          </p>
                        )}
                        
                        {/* Alerta jugador +18 */}
                        {pendingPlayerAccessUsers.some(u => u.id === user.id) && (
                          <p className="text-xs text-purple-700 bg-purple-100 rounded px-2 py-0.5 mt-1 inline-block animate-pulse">
                            ⚠️ +18 pendiente
                          </p>
                        )}
                      </div>

                      {/* Botones de roles */}
                      {!isDeleted && user.role !== "admin" && (
                        <div className="flex gap-2 flex-wrap justify-end">
                          <button onClick={() => handlePlayerToggle(user)} className={`px-3 py-2 rounded-lg text-sm font-semibold shadow ${isPlayerUser ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-300'}`}>
                            ⚽ Jugador {isPlayerUser && "✓"}
                          </button>
                          <button onClick={() => handleCoordinatorToggle(user)} className={`px-3 py-2 rounded-lg text-sm font-semibold shadow ${isCoordinator ? 'bg-cyan-600 text-white' : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200 border border-cyan-300'}`}>
                            🎓 Coord {isCoordinator && "✓"}
                          </button>
                          <button onClick={() => handleTreasurerToggle(user)} className={`px-3 py-2 rounded-lg text-sm font-semibold shadow ${isTreasurer ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'}`}>
                            💰 Tesor {isTreasurer && "✓"}
                          </button>
                          <button onClick={() => handleCoachToggle(user)} className={`px-3 py-2 rounded-lg text-sm font-semibold shadow ${user.es_entrenador ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300'}`}>
                            🏃 Entren {user.es_entrenador && "✓"}
                          </button>
                          <button onClick={() => handleRestrictAccess(user)} className={`px-3 py-2 rounded-lg text-sm font-semibold shadow ${hasRestriction ? 'bg-green-600 text-white' : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'}`}>
                            {hasRestriction ? "✅ Activo" : "🚫 Restringir"}
                          </button>
                          <button onClick={() => handleDeleteUser(user)} className="px-3 py-2 rounded-lg text-sm font-semibold shadow bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300">
                            🗑️ Eliminar
                          </button>
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

      {/* Diálogo de Jugador +18 */}
      <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <User className="w-6 h-6 text-purple-600" />
              {selectedUser?.es_jugador ? "Quitar Acceso de Jugador" : "Activar Acceso de Jugador +18"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.es_jugador ? (
                <>Quitar acceso directo de jugador a <strong>{selectedUser?.full_name}</strong></>
              ) : (
                <>Dar acceso directo a <strong>{selectedUser?.full_name}</strong> como jugador mayor de 18 años</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!selectedUser?.es_jugador && (
              <div className="space-y-2">
                <Label htmlFor="player-select">Vincular a Ficha de Jugador *</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger id="player-select">
                    <SelectValue placeholder="Selecciona el jugador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter(p => p.es_mayor_edad === true || 
                        (p.fecha_nacimiento && new Date().getFullYear() - new Date(p.fecha_nacimiento).getFullYear() >= 18))
                      .map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} - {p.deporte}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-purple-600">
                  Solo se muestran jugadores mayores de 18 años.
                </p>
              </div>
            )}

            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
              <p className="text-sm text-purple-900 font-bold mb-2">
                ⚽ ¿Qué es el acceso de Jugador +18?
              </p>
              <p className="text-sm text-purple-800 mb-3">
                Cuando un jugador es <strong>mayor de 18 años</strong>, puede acceder a la app directamente 
                con su propio email (no necesita que un padre gestione su cuenta).
              </p>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>✅ Ver sus convocatorias y confirmar asistencia</li>
                <li>✅ Ver sus pagos pendientes</li>
                <li>✅ Comunicarse con entrenadores por chat</li>
                <li>✅ Acceder al calendario y eventos</li>
                <li>✅ Ver anuncios y galería</li>
              </ul>
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-bold mb-2">
                ℹ️ Importante:
              </p>
              <p className="text-sm text-blue-800">
                El email del usuario debe coincidir con el email del jugador en su ficha.
                Al activar este acceso, el usuario verá el <strong>Panel Jugador</strong> en lugar del Panel Familia.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPlayerDialog(false);
                setSelectedUser(null);
                setSelectedPlayerId("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPlayer}
              disabled={updateUserMutation.isPending || (!selectedUser?.es_jugador && !selectedPlayerId)}
              className={selectedUser?.es_jugador ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.es_jugador ? (
                "Quitar Acceso de Jugador"
              ) : (
                "Confirmar Jugador +18"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Diálogo de Tesorero */}
      <Dialog open={showTreasurerDialog} onOpenChange={setShowTreasurerDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-green-600" />
              {selectedUser?.es_tesorero ? "Quitar Rol de Tesorero" : "Asignar como Tesorero"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.es_tesorero ? (
                <>Quitar permisos de Tesorero a <strong>{selectedUser?.full_name}</strong></>
              ) : (
                <>Asignar permisos de Tesorero a <strong>{selectedUser?.full_name}</strong></>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <p className="text-sm text-green-900 font-bold mb-2">
                💰 Permisos de Tesorero:
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li>✅ <strong>Gestión de Pagos:</strong> Ver y gestionar todos los pagos del club</li>
                <li>✅ <strong>Recordatorios:</strong> Enviar recordatorios de pago</li>
                <li>✅ <strong>Histórico:</strong> Acceso completo al historial de pagos</li>
                <li>✅ <strong>Pedidos:</strong> Gestionar pedidos de equipación</li>
                <li>✅ <strong>Temporadas:</strong> Configurar cuotas y temporadas</li>
                <li>✅ <strong>Calendario y Anuncios:</strong> Ver y publicar información</li>
                <li>❌ <strong>NO gestiona:</strong> Jugadores, evaluaciones, entrenadores</li>
              </ul>
            </div>

            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
              <p className="text-sm text-green-900 font-bold mb-2">
                ℹ️ Información:
              </p>
              <p className="text-sm text-green-800 mb-2">
                El <strong>Tesorero</strong> tiene acceso completo a la gestión financiera del club.
              </p>
              <p className="text-sm text-green-800">
                Usa el botón <strong>"Tiene hijos"</strong> para darle acceso a funciones de padre 
                (gestión de jugadores propios y vista familiar) si tiene hijos en el club.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTreasurerDialog(false);
                setSelectedUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmTreasurer}
              disabled={updateUserMutation.isPending}
              className={selectedUser?.es_tesorero ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.es_tesorero ? (
                "Quitar Rol de Tesorero"
              ) : (
                "Confirmar Tesorero"
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