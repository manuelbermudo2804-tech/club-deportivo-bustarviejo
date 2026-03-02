import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import UserManagementTable from "@/components/admin/UserManagementTable";
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
  Send,
  FileSignature,
  AlertTriangle,
  Heart,
  Wand2
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
  const [showChatBlockDialog, setShowChatBlockDialog] = useState(false);
  const [chatBlockData, setChatBlockData] = useState({ motivo_bloqueo_chat: "" });
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
  const [showReminderDialog, setShowReminderDialog] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("");
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [pairingContext, setPairingContext] = useState({ user: null, playerId: "", partnerEmail: "" });
  const [showPairingResults, setShowPairingResults] = useState(false);
  const [pairingResults, setPairingResults] = useState(null);
  const [isDetectingPairs, setIsDetectingPairs] = useState(false);

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

  const { data: categoryConfigs } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
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
      setShowChatBlockDialog(false);
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
      tipo_panel: isSettingAsPlayer ? 'jugador_adulto' : null,
      player_id: isSettingAsPlayer && selectedPlayerId ? selectedPlayerId : null
    };

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
        es_coordinador: isSettingAsCoordinator
      }
    });
  };

  const handleConfirmTreasurer = async () => {
    if (!selectedUser) return;

    const isSettingAsTreasurer = !selectedUser.es_tesorero;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        es_tesorero: isSettingAsTreasurer
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

  const handleToggleJunta = async (user) => {
  const newValue = !user.es_junta;
  const update = { es_junta: newValue };
  if (!newValue) update.cargo_junta = null;
  updateUserMutation.mutate({ userId: user.id, userData: update });
};

const handleSetCargoJunta = async (user, cargo) => {
  updateUserMutation.mutate({ userId: user.id, userData: { cargo_junta: cargo } });
};

const handleChatBlock = (user) => {
    setSelectedUser(user);
    setChatBlockData({ motivo_bloqueo_chat: user.motivo_bloqueo_chat || "" });
    setShowChatBlockDialog(true);
  };

  const handleConfirmChatBlock = async () => {
    if (!selectedUser) return;

    const isBlocking = !selectedUser.chat_bloqueado;

    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        chat_bloqueado: isBlocking,
        motivo_bloqueo_chat: isBlocking ? chatBlockData.motivo_bloqueo_chat : null,
        fecha_bloqueo_chat: isBlocking ? new Date().toISOString() : null
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

  // Detectar padres/jugadores sin hijos activos
  const usersWithoutActivePlayers = users.filter(user => {
    if (user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero) return false;
    if (user.eliminado === true) return false;
    
    const email = (user.email || '').trim().toLowerCase();
    const activePlayers = players.filter(p => {
      if (p.activo !== true) return false;
      return (
        (p.email_padre && p.email_padre.trim().toLowerCase() === email) ||
        (p.email_tutor_2 && p.email_tutor_2.trim().toLowerCase() === email) ||
        (p.email_jugador && p.email_jugador.trim().toLowerCase() === email)
      );
    });
    
    return activePlayers.length === 0;
  });

  // Detectar menores (acceso juvenil) cuyos jugadores ya no están activos / no han renovado
  const minorsWithoutActivePlayer = users.filter(user => {
    if (user.es_menor !== true || user.eliminado === true) return false;
    // Buscar jugador vinculado por email del menor
    const linkedPlayers = players.filter(p =>
      p.acceso_menor_email && p.acceso_menor_email.trim().toLowerCase() === (user.email || '').trim().toLowerCase()
    );
    if (linkedPlayers.length === 0) return true; // no tiene jugador vinculado
    // Si todos sus jugadores están inactivos o no han renovado
    return linkedPlayers.every(p => p.activo !== true);
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
      if (roleFilter === "minor" && user.es_menor !== true) return false;
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
      if (roleFilter === "inactive_parents" && !usersWithoutActivePlayers.some(u => u.id === user.id)) return false;
      if (roleFilter === "inactive_minors" && !minorsWithoutActivePlayer.some(u => u.id === user.id)) return false;
    }

    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Obtener jugadores por usuario
  const getUserPlayers = (userEmail) => {
    const email = (userEmail || '').trim().toLowerCase();
    return players.filter(p => 
      (p.email_padre && p.email_padre.trim().toLowerCase() === email) ||
      (p.email_tutor_2 && p.email_tutor_2.trim().toLowerCase() === email)
    );
  };

  // Detectar parejas de progenitores (comparten al menos un jugador)
  const detectParentPairs = () => {
    const pairs = [];
    const processedPairs = new Set();

    players.forEach(player => {
      const p1 = (player.email_padre || '').trim().toLowerCase();
      const p2 = (player.email_tutor_2 || '').trim().toLowerCase();
      if (!p1 || !p2) return; // Ambos emails necesarios para ser pareja

      const pairKey = [p1, p2].sort().join('|');
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const parent1 = users.find(u => u.email?.trim().toLowerCase() === p1);
      const parent2 = users.find(u => u.email?.trim().toLowerCase() === p2);

      // Obtener todos los jugadores compartidos (normalizando emails)
      const sharedPlayers = players.filter(sp => {
        const sp1 = (sp.email_padre || '').trim().toLowerCase();
        const sp2 = (sp.email_tutor_2 || '').trim().toLowerCase();
        return (sp1 === p1 && sp2 === p2) || (sp1 === p2 && sp2 === p1);
      });

      if (sharedPlayers.length > 0) {
        pairs.push({
          parent1: parent1 || { email: p1, full_name: p1 },
          parent2: parent2 || { email: p2, full_name: p2 },
          sharedPlayers,
          parent1Registered: !!parent1,
          parent2Registered: !!parent2
        });
      }
    });

    return pairs;
  };

  const parentPairs = detectParentPairs();

  // Mapa rápido: email -> { partner, sharedPlayers }
  const pairByEmail = (() => {
    const map = {};
    parentPairs.forEach(pair => {
      const p1 = pair.parent1?.email?.toLowerCase();
      const p2 = pair.parent2?.email?.toLowerCase();
      if (p1) map[p1] = { partner: pair.parent2, sharedPlayers: pair.sharedPlayers };
      if (p2) map[p2] = { partner: pair.parent1, sharedPlayers: pair.sharedPlayers };
    });
    console.log('🔍 [PAIRS] parentPairs:', parentPairs.length, 'pairByEmail keys:', Object.keys(map));
    return map;
  })();

  // Estadísticas (sin contar eliminados)
  const activeUsersWithoutDeleted = users.filter(u => u.eliminado !== true);
  const activeUsers = activeUsersWithoutDeleted.filter(u => u.acceso_activo !== false && u.role === "user");
  const restrictedUsers = activeUsersWithoutDeleted.filter(u => u.acceso_activo === false);
  const admins = activeUsersWithoutDeleted.filter(u => u.role === "admin");
  const deletedUsers = users.filter(u => u.eliminado === true);
  const jugadores = activeUsersWithoutDeleted.filter(u => u.es_jugador === true);
  const menores = activeUsersWithoutDeleted.filter(u => u.es_menor === true);
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

  const enviarRecordatorioRenovacionMutation = useMutation({
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

  const pairParentsMutation = useMutation({
    mutationFn: async ({ playerId, data }) => {
      return await base44.entities.Player.update(playerId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setShowPairDialog(false);
      toast.success('Progenitores emparejados');
    },
  });

  const openPairDialog = (user) => {
    const ups = getUserPlayers(user.email);
    setPairingContext({ user, playerId: ups[0]?.id || "", partnerEmail: "" });
    setShowPairDialog(true);
  };

  const handleConfirmPairing = () => {
    const userEmail = pairingContext.user?.email?.trim().toLowerCase();
    const partnerEmail = pairingContext.partnerEmail?.trim().toLowerCase();
    const player = players.find(p => p.id === pairingContext.playerId);
    if (!player || !userEmail || !partnerEmail) return;

    const p1 = (player.email_padre || '').trim().toLowerCase();
    const p2 = (player.email_tutor_2 || '').trim().toLowerCase();
    let email_padre = p1;
    let email_tutor_2 = p2;

    if (p1 === userEmail) {
      email_tutor_2 = partnerEmail;
    } else if (p2 === userEmail) {
      email_padre = partnerEmail || email_padre;
    } else if (!p1 && !p2) {
      email_padre = userEmail;
      email_tutor_2 = partnerEmail;
    } else if (!p1) {
      email_padre = userEmail;
    } else if (!p2) {
      email_tutor_2 = partnerEmail;
    } else {
      email_tutor_2 = partnerEmail;
    }

    pairParentsMutation.mutate({ playerId: player.id, data: { email_padre, email_tutor_2 } });
  };

  const handleClearSecondParent = () => {
    const player = players.find(p => p.id === pairingContext.playerId);
    if (!player) return;
    pairParentsMutation.mutate({ playerId: player.id, data: { email_tutor_2: null } });
  };


   return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-600 mt-1">Control de acceso, roles, permisos y entrenadores</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { setPairingContext({ user: null, playerId: "", partnerEmail: "" }); setShowPairDialog(true); }}>
            👨‍👩‍👧 Casar progenitores
          </Button>
        </div>
      </div>

      {/* Estadísticas compactas */}
      <div className="grid grid-cols-5 md:grid-cols-11 gap-2">
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
          <p className="text-[9px] text-slate-500">Jugad.+18</p>
        </div>
        <div className="bg-white rounded-lg p-2 shadow text-center border-l-4 border-teal-500">
          <p className="text-lg font-bold text-teal-600">{menores.length}</p>
          <p className="text-[9px] text-slate-500">Juveniles</p>
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
      {(usersWithoutApp.length > 5 || pendingPlayerAccessUsers.length > 0 || usersWithoutActivePlayers.length > 0 || minorsWithoutActivePlayer.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          {minorsWithoutActivePlayer.length > 0 && (
            <div className="bg-teal-50 border border-teal-300 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-teal-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-teal-900">🧒 {minorsWithoutActivePlayer.length} juveniles sin jugador activo</p>
                <p className="text-xs text-teal-700">Accesos juveniles que deberían desactivarse</p>
              </div>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-xs h-7" onClick={() => setRoleFilter("inactive_minors")}>
                Ver
              </Button>
            </div>
          )}
          {usersWithoutActivePlayers.length > 0 && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-900">🔴 {usersWithoutActivePlayers.length} sin hijos activos</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs h-7" onClick={() => setRoleFilter("inactive_parents")}>
                  Ver
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
                  onClick={async () => {
                    toast.info(`Enviando ${usersWithoutActivePlayers.length} recordatorios...`);
                    let sent = 0;
                    for (const u of usersWithoutActivePlayers) {
                      try {
                        await base44.integrations.Core.SendEmail({
                          from_name: "CD Bustarviejo",
                          to: u.email,
                          subject: "¿Vas a renovar? - CD Bustarviejo",
                          body: `Hola ${u.full_name},\n\nVemos que aún no has renovado a tus jugadores para la nueva temporada.\n\n¿Tienes pensado inscribirlos de nuevo este año?\n\nSi necesitas ayuda o tienes alguna duda, estamos aquí para ayudarte.\n\nAtentamente,\nCD Bustarviejo`
                        });
                        sent++;
                        await new Promise(r => setTimeout(r, 300));
                      } catch (e) { console.error(e); }
                    }
                    toast.success(`✅ ${sent} recordatorios enviados`);
                  }}
                >
                  <Send className="w-3 h-3 mr-1" />
                  Recordar Todos
                </Button>
              </div>
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

        {/* Botón de detección automática de parejas */}
        <Button
          size="sm"
          onClick={async () => {
            try {
              setIsDetectingPairs(true);
              const { data } = await base44.functions.invoke('detectParentPairs');
              setPairingResults(data);
              setShowPairingResults(true);
              // Refrescar players Y users para que pairByEmail se recalcule con los datos actualizados
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['players'] }),
                queryClient.invalidateQueries({ queryKey: ['allUsers'] }),
              ]);
              toast.success(`✅ Se detectaron ${data.pairsDetected} parejas de progenitores`);
            } catch (error) {
              toast.error('Error detectando parejas: ' + error.message);
            } finally {
              setIsDetectingPairs(false);
            }
          }}
          disabled={isDetectingPairs}
          className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-sm"
        >
          {isDetectingPairs ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Detectando...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4 mr-2" />
              🔍 Detectar Parejas
            </>
          )}
        </Button>
        
        {/* Filtros compactos */}
        <div className="flex flex-wrap gap-1">
          {[
            { key: "all", label: "Todos", count: users.filter(u => !u.eliminado).length },
            { key: "parent", label: "👨‍👩‍👧 Padres", count: activeUsers.length },
            { key: "inactive_parents", label: "🔴 Sin Hijos", count: usersWithoutActivePlayers.length, highlight: true },
            { key: "staff", label: "👔 Staff", count: staffUsers.length },
            { key: "admin", label: "🎓 Admin", count: admins.length },
            { key: "player", label: "⚽ Jugad.+18", count: jugadores.length },
            { key: "minor", label: "🧒 Juvenil", count: menores.length },
            { key: "inactive_minors", label: "🧒🔴 Juv. Inact.", count: minorsWithoutActivePlayer.length, highlight: minorsWithoutActivePlayer.length > 0 },
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
                  : f.highlight && f.count > 0
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 animate-pulse'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>



      {/* Lista de Usuarios - Tabla Compacta */}
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
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <UserManagementTable
              users={filteredUsers}
              players={players}
              pairByEmail={pairByEmail}
              onCoachToggle={handleCoachToggle}
              onCoordinatorToggle={handleCoordinatorToggle}
              onTreasurerToggle={handleTreasurerToggle}
              onToggleHijos={handleToggleHijos}
              onToggleFirmas={handleToggleFirmas}
              onToggleJunta={handleToggleJunta}
              onChatBlock={handleChatBlock}
              onPairParents={openPairDialog}
              onSetCargoJunta={handleSetCargoJunta}
              onRestrictAccess={(user) => {
                setSelectedUser(user);
                setShowRestrictDialog(true);
              }}
              onDeleteUser={(user) => {
                setSelectedUser(user);
                setShowDeleteDialog(true);
              }}
              onSendInstallReminder={sendInstallReminder}
              onActivateAccess={activarAccesoMutation.mutate}
            />
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Jugador +18 */}
      <Dialog open={showPlayerDialog} onOpenChange={setShowPlayerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Label htmlFor="player-select">Vincular a Ficha de Jugador (opcional)</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger id="player-select">
                    <SelectValue placeholder="Ninguna (el jugador creará su ficha después)" />
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
                  💡 Puedes activar el acceso sin vincular. El jugador verá su panel y podrá crear su ficha después.
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
                Al activar este acceso, el usuario verá el <strong>Panel Jugador</strong> en lugar del Panel Familia.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                💡 <strong>Si no tiene ficha aún:</strong> El jugador podrá acceder a su panel y crear su propia ficha de inscripción desde allí.
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
              disabled={updateUserMutation.isPending}
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
                    {(() => {
                      // Usar categorías dinámicas de CategoryConfig + fallback a las base
                      const baseCats = [
                        "Fútbol Pre-Benjamín (Mixto)",
                        "Fútbol Benjamín (Mixto)",
                        "Fútbol Alevín (Mixto)",
                        "Fútbol Infantil (Mixto)",
                        "Fútbol Cadete",
                        "Fútbol Juvenil",
                        "Fútbol Aficionado",
                        "Fútbol Femenino",
                        "Baloncesto (Mixto)"
                      ];
                      const extraCats = (categoryConfigs || [])
                        .map(c => c.nombre)
                        .filter(n => n && !baseCats.includes(n));
                      return [...baseCats, ...extraCats];
                    })().map(category => (
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {/* Diálogo de Bloqueo de Chat */}
      <Dialog open={showChatBlockDialog} onOpenChange={setShowChatBlockDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedUser?.chat_bloqueado ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  Desbloquear Acceso al Chat
                </>
              ) : (
                <>
                  <Ban className="w-6 h-6 text-orange-600" />
                  Bloquear Acceso al Chat
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.chat_bloqueado ? (
                <>Restaurar acceso al chat de <strong>{selectedUser?.full_name}</strong></>
              ) : (
                <>Bloquear acceso al chat de <strong>{selectedUser?.full_name}</strong> por malas prácticas</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!selectedUser?.chat_bloqueado && (
              <div className="space-y-2">
                <Label htmlFor="chat-block-reason">Motivo del Bloqueo de Chat *</Label>
                <Select
                  value={chatBlockData.motivo_bloqueo_chat}
                  onValueChange={(value) => setChatBlockData({ motivo_bloqueo_chat: value })}
                >
                  <SelectTrigger id="chat-block-reason">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lenguaje ofensivo reiterado">
                      Lenguaje ofensivo reiterado
                    </SelectItem>
                    <SelectItem value="Acoso o amenazas">
                      Acoso o amenazas
                    </SelectItem>
                    <SelectItem value="Spam o mensajes excesivos">
                      Spam o mensajes excesivos
                    </SelectItem>
                    <SelectItem value="Conflictos repetidos con staff">
                      Conflictos repetidos con staff
                    </SelectItem>
                    <SelectItem value="Incumplimiento reiterado de normas">
                      Incumplimiento reiterado de normas
                    </SelectItem>
                    <SelectItem value="Otro">
                      Otro motivo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <p className="text-sm text-orange-900 font-bold mb-2">
                {selectedUser?.chat_bloqueado ? "✅ Desbloquear Chat" : "⚠️ Bloquear Chat"}
              </p>
              {selectedUser?.chat_bloqueado ? (
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>✅ El usuario podrá volver a enviar mensajes en los chats</li>
                  <li>✅ Tendrá acceso al Chat Coordinador y Chat Entrenador</li>
                </ul>
              ) : (
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>🚫 El usuario NO podrá enviar mensajes en los chats</li>
                  <li>🚫 Afecta a: Chat Coordinador y Chat Entrenador</li>
                  <li>✅ Podrá seguir usando el resto de la app</li>
                  <li>✅ Es reversible en cualquier momento</li>
                </ul>
              )}
            </div>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm text-blue-900 font-bold mb-2">
                📊 Registros relacionados:
              </p>
              <p className="text-sm text-blue-800">
                Puedes revisar el historial de mensajes bloqueados y discusiones en la sección 
                <strong> "Stats Chat Entrena."</strong> para ver el comportamiento del usuario.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChatBlockDialog(false);
                setSelectedUser(null);
                setChatBlockData({ motivo_bloqueo_chat: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmChatBlock}
              disabled={updateUserMutation.isPending || (!selectedUser?.chat_bloqueado && !chatBlockData.motivo_bloqueo_chat)}
              className={selectedUser?.chat_bloqueado ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {updateUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : selectedUser?.chat_bloqueado ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Desbloquear Chat
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4 mr-2" />
                  Confirmar Bloqueo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Eliminación */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                   <SelectItem value="tablet">📲 Tablet Check-in (solo check-in)</SelectItem>
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
                {selectedRole === "tablet" && "📲 Tablet Check-in - Solo pantalla de asistencia"}
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
                 {selectedRole === "tablet" && (
                   <>
                     <li>✅ Solo ve la pantalla de check-in de asistencia</li>
                     <li>✅ Sin menú, sin sidebar, sin acceso a nada más</li>
                     <li>💡 Ideal para dejar una tablet en el campo</li>
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

      {/* Diálogo Casar Progenitores */}
      <Dialog open={showPairDialog} onOpenChange={setShowPairDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">👨‍👩‍👧 Casar progenitores</DialogTitle>
            <DialogDescription>
              Vincula manualmente a dos progenitores en la ficha de un jugador.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Jugador</Label>
              <Select value={pairingContext.playerId} onValueChange={(v) => setPairingContext(prev => ({...prev, playerId: v}))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona jugador" />
                </SelectTrigger>
                <SelectContent>
                  {(pairingContext.user ? getUserPlayers(pairingContext.user.email) : players).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Otro progenitor (email)</Label>
              <Input
                placeholder="email@ejemplo.com"
                value={pairingContext.partnerEmail}
                onChange={(e) => setPairingContext(prev => ({...prev, partnerEmail: e.target.value}))}
              />
              <p className="text-xs text-slate-500">Se mantendrá el email del usuario seleccionado y se establecerá el otro como segundo progenitor (o viceversa si procede).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPairDialog(false)}>Cancelar</Button>
            <Button variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={handleClearSecondParent} disabled={!pairingContext.playerId || pairParentsMutation.isPending}>
              Quitar 2º progenitor
            </Button>
            <Button onClick={handleConfirmPairing} disabled={!pairingContext.playerId || !pairingContext.partnerEmail || pairParentsMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
              <UserCheck className="w-4 h-4 mr-2" />
              Confirmar emparejado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de recordatorio de renovación */}
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
              <Label>Mensaje del email:</Label>
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
              onClick={() => enviarRecordatorioRenovacionMutation.mutate({ 
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

       {/* Diálogo de resultados de parejas detectadas */}
       <Dialog open={showPairingResults} onOpenChange={setShowPairingResults}>
         <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <Heart className="w-6 h-6 text-pink-600" />
               Parejas de Progenitores Detectadas
             </DialogTitle>
           </DialogHeader>
           
           {pairingResults && (
             <div className="space-y-4">
               <div className="bg-green-50 border border-green-300 rounded-lg p-3">
                 <p className="text-sm font-bold text-green-900">
                   ✅ Se detectaron <strong>{pairingResults.pairsDetected}</strong> parejas de progenitores
                 </p>
               </div>

               <div className="space-y-3 max-h-[400px] overflow-y-auto">
                 {pairingResults.pairs && pairingResults.pairs.map((pair, idx) => (
                   <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                     <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2 flex-1">
                         <Heart className="w-5 h-5 text-pink-500" />
                         <div className="flex-1">
                           <p className="text-sm font-bold text-slate-900">{pair.name1}</p>
                           <p className="text-xs text-slate-500">{pair.email1}</p>
                         </div>
                       </div>
                       <div className="text-slate-400 font-bold px-2">↔️</div>
                       <div className="flex-1 text-right">
                         <p className="text-sm font-bold text-slate-900">{pair.name2}</p>
                         <p className="text-xs text-slate-500">{pair.email2}</p>
                       </div>
                     </div>
                     <div className="bg-blue-50 rounded px-3 py-1 text-xs text-blue-800">
                       👥 Comparten {pair.sharedPlayerCount} jugador{pair.sharedPlayerCount !== 1 ? 'es' : ''}
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           )}

           <DialogFooter>
             <Button onClick={async () => {
               setShowPairingResults(false);
               // Forzar recarga de players para que pairByEmail se recalcule
               await queryClient.refetchQueries({ queryKey: ['players'] });
             }} className="bg-blue-600 hover:bg-blue-700">
               ✅ Entendido
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

    </div>
  );
}