import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { toast } from "sonner";

import UserManagementTable from "@/components/admin/UserManagementTable";
import UserStats from "@/components/admin/UserStats";
import UserAlertsBar from "@/components/admin/UserAlertsBar";
import UserFilters from "@/components/admin/UserFilters";
import UserDialogs from "@/components/admin/UserDialogs";
import PairParentsDialog from "@/components/admin/dialogs/PairParentsDialog";
import PairingResultsDialog from "@/components/admin/dialogs/PairingResultsDialog";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

export default function UserManagement() {
  // ===== UI STATE =====
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [coachData, setCoachData] = useState({ categorias_entrena: [], telefono_entrenador: "" });
  const [restrictionData, setRestrictionData] = useState({ motivo_restriccion: "", notas_admin: "" });
  const [chatBlockData, setChatBlockData] = useState({ motivo_bloqueo_chat: "" });

  // Dialog open flags
  const [showRestrictDialog, setShowRestrictDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showCoachDialog, setShowCoachDialog] = useState(false);
  const [showCoordinatorDialog, setShowCoordinatorDialog] = useState(false);
  const [showTreasurerDialog, setShowTreasurerDialog] = useState(false);
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [showChatBlockDialog, setShowChatBlockDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(null);
  const [reminderMessage, setReminderMessage] = useState("");

  // Pair parents
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [pairingContext, setPairingContext] = useState({ user: null, playerId: "", partnerEmail: "" });
  const [showPairingResults, setShowPairingResults] = useState(false);
  const [pairingResults, setPairingResults] = useState(null);
  const [isDetectingPairs, setIsDetectingPairs] = useState(false);

  const queryClient = useQueryClient();

  // ===== DATA =====
  const { data: users, isLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ["players"],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const { data: categoryConfigs } = useQuery({
    queryKey: ["categoryConfigs"],
    queryFn: () => base44.entities.CategoryConfig.filter({ activa: true }),
    initialData: [],
  });

  // ===== MUTATIONS =====
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }) => {
      const cleanData = Object.entries(userData).reduce((acc, [key, value]) => {
        if (value !== undefined) acc[key] = value;
        return acc;
      }, {});
      return await base44.entities.User.update(userId, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
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
    onError: (error) => {
      console.error("updateUserMutation error:", error);
      toast.error("Error al actualizar el usuario: " + (error?.message || "desconocido"));
    },
  });

  const activarAccesoMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.User.update(userId, { acceso_activo: true, motivo_restriccion: "" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success("Acceso reactivado");
    },
    onError: (error) => {
      toast.error("Error reactivando acceso: " + (error?.message || ""));
    },
  });

  const pairParentsMutation = useMutation({
    mutationFn: async ({ playerId, data }) => base44.entities.Player.update(playerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      setShowPairDialog(false);
      toast.success("Progenitores emparejados correctamente");
    },
    onError: (error) => {
      toast.error("Error emparejando progenitores: " + (error?.message || ""));
    },
  });

  const minorRevokeMutation = useMutation({
    mutationFn: async ({ player, revoke }) =>
      base44.entities.Player.update(player.id, { acceso_menor_revocado: revoke }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success(vars.revoke ? "Acceso juvenil revocado" : "Acceso juvenil restaurado");
    },
    onError: (error) => toast.error("Error: " + (error?.message || "")),
  });

  const enviarRecordatorioRenovacionMutation = useMutation({
    mutationFn: async ({ user, message }) => {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: user.email,
        subject: "¿Vas a renovar? - CD Bustarviejo",
        body: message,
      });
    },
    onSuccess: () => {
      setShowReminderDialog(null);
      setReminderMessage("");
      toast.success("Recordatorio enviado");
    },
    onError: (error) => toast.error("Error enviando recordatorio: " + (error?.message || "")),
  });

  // ===== HANDLERS =====
  const handleCoachToggle = (user) => {
    setSelectedUser(user);
    setCoachData({
      categorias_entrena: user.categorias_entrena || [],
      telefono_entrenador: user.telefono_entrenador || "",
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

  const handlePlayerToggle = (user) => {
    setSelectedUser(user);
    setSelectedPlayerId(user.player_id || "");
    setShowPlayerDialog(true);
  };

  const handleConfirmPlayer = () => {
    if (!selectedUser) return;
    const isSettingAsPlayer = !selectedUser.es_jugador;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        es_jugador: isSettingAsPlayer,
        tipo_panel: isSettingAsPlayer ? "jugador_adulto" : null,
        player_id: isSettingAsPlayer && selectedPlayerId ? selectedPlayerId : null,
      },
    });
  };

  const handleConfirmCoach = () => {
    if (!selectedUser) return;
    const isSettingAsCoach = !selectedUser.es_entrenador;
    const updateData = { es_entrenador: isSettingAsCoach };
    if (isSettingAsCoach) {
      updateData.categorias_entrena = coachData.categorias_entrena;
      if (coachData.telefono_entrenador) updateData.telefono_entrenador = coachData.telefono_entrenador;
    } else {
      updateData.categorias_entrena = [];
      updateData.telefono_entrenador = null;
      updateData.es_coordinador = false;
    }
    updateUserMutation.mutate({ userId: selectedUser.id, userData: updateData });
  };

  const handleConfirmCoordinator = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: { es_coordinador: !selectedUser.es_coordinador },
    });
  };

  const handleConfirmTreasurer = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: { es_tesorero: !selectedUser.es_tesorero },
    });
  };

  const handleToggleHijos = (user) =>
    updateUserMutation.mutate({
      userId: user.id,
      userData: { tiene_hijos_jugando: !user.tiene_hijos_jugando },
    });

  const handleToggleFirmas = (user) =>
    updateUserMutation.mutate({
      userId: user.id,
      userData: { puede_gestionar_firmas: !user.puede_gestionar_firmas },
    });

  const handleToggleJunta = (user) => {
    const newValue = !user.es_junta;
    const update = { es_junta: newValue };
    if (!newValue) update.cargo_junta = null;
    updateUserMutation.mutate({ userId: user.id, userData: update });
  };

  const handleSetCargoJunta = (user, cargo) =>
    updateUserMutation.mutate({ userId: user.id, userData: { cargo_junta: cargo } });

  const handleChatBlock = (user) => {
    setSelectedUser(user);
    setChatBlockData({ motivo_bloqueo_chat: user.motivo_bloqueo_chat || "" });
    setShowChatBlockDialog(true);
  };

  const handleConfirmChatBlock = () => {
    if (!selectedUser) return;
    const isBlocking = !selectedUser.chat_bloqueado;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        chat_bloqueado: isBlocking,
        motivo_bloqueo_chat: isBlocking ? chatBlockData.motivo_bloqueo_chat : null,
        fecha_bloqueo_chat: isBlocking ? new Date().toISOString() : null,
      },
    });
  };

  const handleChangeRole = (user) => {
    setSelectedUser(user);
    setSelectedRole(user.role || "user");
    setSelectedPlayerId(user.jugador_id || user.player_id || "");
    setShowRoleDialog(true);
  };

  const handleConfirmRoleChange = () => {
    if (!selectedUser) return;
    const updateData = { role: selectedRole };
    if (selectedRole === "jugador") {
      if (!selectedPlayerId) {
        toast.error("Por favor, selecciona un jugador para vincular.");
        return;
      }
      updateData.jugador_id = selectedPlayerId;
      updateData.player_id = selectedPlayerId;
      updateData.es_jugador = true;
      updateData.tipo_panel = "jugador_adulto";
    } else {
      updateData.jugador_id = null;
      updateData.player_id = null;
      if (selectedUser.role === "jugador") {
        updateData.es_jugador = false;
        updateData.tipo_panel = null;
      }
    }
    updateUserMutation.mutate({ userId: selectedUser.id, userData: updateData });
  };

  const handleConfirmRestriction = () => {
    if (!selectedUser) return;
    const isRestricting = selectedUser.acceso_activo !== false;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        acceso_activo: !isRestricting,
        motivo_restriccion: isRestricting ? restrictionData.motivo_restriccion : null,
        fecha_restriccion: isRestricting ? new Date().toISOString() : null,
        notas_admin: restrictionData.notas_admin || selectedUser.notas_admin,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedUser) return;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData: {
        eliminado: true,
        acceso_activo: false,
        fecha_eliminacion: new Date().toISOString(),
        motivo_eliminacion: "Cuenta eliminada por el administrador",
      },
    });
  };

  // ===== JUVENIL =====
  const handleMinorRevoke = (user) => {
    const linked = players.find(
      (p) => p.acceso_menor_email && p.acceso_menor_email.trim().toLowerCase() === (user.email || "").trim().toLowerCase()
    );
    if (!linked) {
      toast.error("No se encontró el jugador vinculado a este acceso juvenil");
      return;
    }
    const isCurrentlyActive = !linked.acceso_menor_revocado;
    const action = isCurrentlyActive ? "REVOCAR" : "RESTAURAR";
    if (!window.confirm(`¿Quieres ${action} el acceso juvenil de ${linked.nombre}?`)) return;
    minorRevokeMutation.mutate({ player: linked, revoke: isCurrentlyActive });
  };

  // ===== PAIR PROGENITORES =====
  const getUserPlayers = (userEmail) => {
    const email = (userEmail || "").trim().toLowerCase();
    if (!email) return [];
    return players.filter(
      (p) =>
        (p.email_padre && p.email_padre.trim().toLowerCase() === email) ||
        (p.email_tutor_2 && p.email_tutor_2.trim().toLowerCase() === email)
    );
  };

  const openPairDialog = (user) => {
    const ups = getUserPlayers(user?.email);
    setPairingContext({ user, playerId: ups[0]?.id || "", partnerEmail: "" });
    setShowPairDialog(true);
  };

  const handleConfirmPairing = () => {
    const player = players.find((p) => p.id === pairingContext.playerId);
    if (!player) {
      toast.error("Selecciona un jugador");
      return;
    }
    const partnerEmail = pairingContext.partnerEmail?.trim().toLowerCase();
    if (!partnerEmail || !partnerEmail.includes("@")) {
      toast.error("Introduce un email válido del segundo progenitor");
      return;
    }
    const userEmail = pairingContext.user?.email?.trim().toLowerCase();
    if (userEmail && partnerEmail === userEmail) {
      toast.error("Los dos progenitores no pueden ser el mismo email");
      return;
    }

    const p1 = (player.email_padre || "").trim().toLowerCase();
    const p2 = (player.email_tutor_2 || "").trim().toLowerCase();
    let email_padre = p1;
    let email_tutor_2 = p2;

    if (userEmail && p1 === userEmail) {
      email_tutor_2 = partnerEmail;
    } else if (userEmail && p2 === userEmail) {
      email_padre = userEmail;
      email_tutor_2 = partnerEmail;
    } else if (!p1 && !p2) {
      email_padre = userEmail || partnerEmail;
      email_tutor_2 = userEmail ? partnerEmail : "";
    } else if (!p2) {
      email_tutor_2 = partnerEmail;
    } else {
      if (p2 && p2 !== partnerEmail) {
        const ok = window.confirm(
          `Este jugador ya tiene un segundo progenitor (${player.email_tutor_2}). ¿Quieres reemplazarlo por ${partnerEmail}?`
        );
        if (!ok) return;
      }
      email_tutor_2 = partnerEmail;
    }

    if (!email_padre || !email_tutor_2) {
      toast.error("Faltan datos para casar progenitores");
      return;
    }
    pairParentsMutation.mutate({ playerId: player.id, data: { email_padre, email_tutor_2 } });
  };

  const handleClearSecondParent = () => {
    const player = players.find((p) => p.id === pairingContext.playerId);
    if (!player) return;
    if (!player.email_tutor_2) {
      toast.info("Este jugador no tiene segundo progenitor asignado");
      return;
    }
    if (!window.confirm(`¿Quitar a ${player.email_tutor_2} como segundo progenitor de ${player.nombre}?`)) return;
    pairParentsMutation.mutate({ playerId: player.id, data: { email_tutor_2: null } });
  };

  const handleDetectPairs = async () => {
    try {
      setIsDetectingPairs(true);
      const { data } = await base44.functions.invoke("detectParentPairs");
      setPairingResults(data);
      setShowPairingResults(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["players"] }),
        queryClient.invalidateQueries({ queryKey: ["allUsers"] }),
      ]);
      toast.success(`✅ ${data.pairsDetected} parejas detectadas, ${data.pairsSaved || 0} aplicadas`);
    } catch (error) {
      toast.error("Error detectando parejas: " + error.message);
    } finally {
      setIsDetectingPairs(false);
    }
  };

  // ===== INSTALL REMINDERS =====
  const sendInstallReminder = async (user) => {
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: user.email,
        subject: "📲 ¡Instala la App del CD Bustarviejo en tu móvil!",
        body: `Hola ${user.full_name}, hemos detectado que aún no tienes la app instalada. Abre la app en tu navegador y pulsa en el menú → "📲 Ver cómo instalar".`,
      });
      await base44.entities.User.update(user.id, {
        recordatorio_instalacion_enviado: true,
        fecha_recordatorio_instalacion: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      toast.success(`✅ Recordatorio enviado a ${user.full_name}`);
    } catch (error) {
      console.error(error);
      toast.error("Error al enviar el recordatorio");
    }
  };

  const sendBulkInstallReminders = async () => {
    const usersToRemind = usersWithoutApp.filter((u) => !u.recordatorio_instalacion_enviado);
    if (usersToRemind.length === 0) return toast.info("Ya se enviaron recordatorios a todos los usuarios");
    toast.info(`Enviando ${usersToRemind.length} recordatorios...`);
    let sent = 0;
    for (const user of usersToRemind) {
      try {
        await sendInstallReminder(user);
        sent++;
      } catch (e) {
        console.error(e);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    toast.success(`✅ ${sent} recordatorios enviados`);
  };

  const sendBulkRenewalReminders = async () => {
    toast.info(`Enviando ${usersWithoutActivePlayers.length} recordatorios...`);
    let sent = 0;
    for (const u of usersWithoutActivePlayers) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: u.email,
          subject: "¿Vas a renovar? - CD Bustarviejo",
          body: `Hola ${u.full_name},\n\nVemos que aún no has renovado a tus jugadores para la nueva temporada.\n\n¿Tienes pensado inscribirlos de nuevo este año?\n\nAtentamente,\nCD Bustarviejo`,
        });
        sent++;
        await new Promise((r) => setTimeout(r, 300));
      } catch (e) {
        console.error(e);
      }
    }
    toast.success(`✅ ${sent} recordatorios enviados`);
  };

  // ===== DERIVED DATA (memoized) =====
  const usersWithPlayerAccessIds = useMemo(
    () => users.filter((u) => u.es_jugador === true).map((u) => u.player_id).filter(Boolean),
    [users]
  );

  const pendingPlayerAccessUsers = useMemo(
    () =>
      users.filter((user) => {
        if (user.eliminado || user.es_jugador || user.role === "admin") return false;
        const matchingPlayer = players.find(
          (p) =>
            p.activo &&
            p.email_padre === user.email &&
            calcularEdad(p.fecha_nacimiento) >= 18 &&
            !usersWithPlayerAccessIds.includes(p.id)
        );
        return !!matchingPlayer;
      }),
    [users, players, usersWithPlayerAccessIds]
  );

  const usersWithoutActivePlayers = useMemo(
    () =>
      users.filter((user) => {
        if (user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero) return false;
        if (user.eliminado === true) return false;
        const email = (user.email || "").trim().toLowerCase();
        const activePlayers = players.filter((p) => {
          if (p.activo !== true) return false;
          return (
            (p.email_padre && p.email_padre.trim().toLowerCase() === email) ||
            (p.email_tutor_2 && p.email_tutor_2.trim().toLowerCase() === email) ||
            (p.email_jugador && p.email_jugador.trim().toLowerCase() === email)
          );
        });
        return activePlayers.length === 0;
      }),
    [users, players]
  );

  const minorsWithoutActivePlayer = useMemo(
    () =>
      users.filter((user) => {
        if (user.es_menor !== true || user.eliminado === true) return false;
        const linked = players.filter(
          (p) => p.acceso_menor_email && p.acceso_menor_email.trim().toLowerCase() === (user.email || "").trim().toLowerCase()
        );
        if (linked.length === 0) return true;
        return linked.every((p) => p.activo !== true);
      }),
    [users, players]
  );

  const parentPairs = useMemo(() => {
    const pairs = [];
    const processed = new Set();
    players.forEach((player) => {
      const p1 = (player.email_padre || "").trim().toLowerCase();
      const p2 = (player.email_tutor_2 || "").trim().toLowerCase();
      if (!p1 || !p2) return;
      const key = [p1, p2].sort().join("|");
      if (processed.has(key)) return;
      processed.add(key);
      const parent1 = users.find((u) => u.email?.trim().toLowerCase() === p1);
      const parent2 = users.find((u) => u.email?.trim().toLowerCase() === p2);
      const sharedPlayers = players.filter((sp) => {
        const sp1 = (sp.email_padre || "").trim().toLowerCase();
        const sp2 = (sp.email_tutor_2 || "").trim().toLowerCase();
        return (sp1 === p1 && sp2 === p2) || (sp1 === p2 && sp2 === p1);
      });
      if (sharedPlayers.length > 0) {
        pairs.push({
          parent1: parent1 || { email: p1, full_name: p1 },
          parent2: parent2 || { email: p2, full_name: p2 },
          sharedPlayers,
        });
      }
    });
    return pairs;
  }, [users, players]);

  const pairByEmail = useMemo(() => {
    const map = {};
    parentPairs.forEach((pair) => {
      const p1 = pair.parent1?.email?.toLowerCase();
      const p2 = pair.parent2?.email?.toLowerCase();
      if (p1) map[p1] = { partner: pair.parent2, sharedPlayers: pair.sharedPlayers };
      if (p2) map[p2] = { partner: pair.parent1, sharedPlayers: pair.sharedPlayers };
    });
    return map;
  }, [parentPairs]);

  const activeUsersWithoutDeleted = useMemo(() => users.filter((u) => u.eliminado !== true), [users]);
  const activeUsers = activeUsersWithoutDeleted.filter((u) => u.acceso_activo !== false && u.role === "user");
  const restrictedUsers = activeUsersWithoutDeleted.filter((u) => u.acceso_activo === false);
  const admins = activeUsersWithoutDeleted.filter((u) => u.role === "admin");
  const deletedUsers = users.filter((u) => u.eliminado === true);
  const jugadores = activeUsersWithoutDeleted.filter((u) => u.es_jugador === true);
  const menores = activeUsersWithoutDeleted.filter((u) => u.es_menor === true);
  const entrenadores = activeUsersWithoutDeleted.filter((u) => u.es_entrenador === true && !u.es_coordinador);
  const coordinadores = activeUsersWithoutDeleted.filter((u) => u.es_coordinador === true);
  const tesoreros = activeUsersWithoutDeleted.filter((u) => u.es_tesorero === true);
  const usersWithApp = activeUsersWithoutDeleted.filter((u) => u.app_instalada === true);
  const usersWithoutApp = activeUsersWithoutDeleted.filter((u) => u.app_instalada !== true && u.role !== "admin");
  const staffUsers = activeUsersWithoutDeleted.filter((u) => u.role === "admin" || u.es_entrenador || u.es_coordinador || u.es_tesorero);

  // ===== FILTERED USERS =====
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (!showDeleted && user.eliminado === true) return false;

      if (roleFilter !== "all") {
        if (roleFilter === "admin" && user.role !== "admin") return false;
        if (roleFilter === "parent" && (user.role === "admin" || user.es_jugador || user.es_entrenador || user.es_coordinador || user.es_tesorero)) return false;
        if (roleFilter === "player" && user.es_jugador !== true) return false;
        if (roleFilter === "minor" && user.es_menor !== true) return false;
        if (roleFilter === "coach" && (user.es_entrenador !== true || user.es_coordinador === true)) return false;
        if (roleFilter === "coordinator" && user.es_coordinador !== true) return false;
        if (roleFilter === "treasurer" && user.es_tesorero !== true) return false;
        if (roleFilter === "restricted" && user.acceso_activo !== false) return false;
        if (roleFilter === "pending_player" && !pendingPlayerAccessUsers.some((u) => u.id === user.id)) return false;
        if (roleFilter === "with_app" && user.app_instalada !== true) return false;
        if (roleFilter === "without_app" && (user.app_instalada === true || user.role === "admin")) return false;
        if (roleFilter === "staff" && !(user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero)) return false;
        if (roleFilter === "inactive_parents" && !usersWithoutActivePlayers.some((u) => u.id === user.id)) return false;
        if (roleFilter === "inactive_minors" && !minorsWithoutActivePlayer.some((u) => u.id === user.id)) return false;
      }

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        user.full_name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.dni?.toLowerCase().includes(term) ||
        user.telefono?.toLowerCase().includes(term)
      );
    });
  }, [users, showDeleted, roleFilter, searchTerm, pendingPlayerAccessUsers, usersWithoutActivePlayers, minorsWithoutActivePlayer]);

  const filterCounts = {
    all: users.filter((u) => !u.eliminado).length,
    parent: activeUsers.length,
    inactive_parents: usersWithoutActivePlayers.length,
    staff: staffUsers.length,
    admin: admins.length,
    player: jugadores.length,
    minor: menores.length,
    inactive_minors: minorsWithoutActivePlayer.length,
    coach: entrenadores.length,
    coordinator: coordinadores.length,
    treasurer: tesoreros.length,
    restricted: restrictedUsers.length,
    with_app: usersWithApp.length,
    without_app: usersWithoutApp.length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <p className="text-slate-600 mt-1">Control de acceso, roles, permisos y entrenadores</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => {
              setPairingContext({ user: null, playerId: "", partnerEmail: "" });
              setShowPairDialog(true);
            }}
          >
            👨‍👩‍👧 Casar progenitores manualmente
          </Button>
        </div>
      </div>

      <UserStats
        activeUsers={activeUsers}
        admins={admins}
        jugadores={jugadores}
        menores={menores}
        entrenadores={entrenadores}
        coordinadores={coordinadores}
        tesoreros={tesoreros}
        restrictedUsers={restrictedUsers}
        deletedUsers={deletedUsers}
        usersWithApp={usersWithApp}
        usersWithoutApp={usersWithoutApp}
      />

      <UserAlertsBar
        usersWithoutApp={usersWithoutApp}
        pendingPlayerAccessUsers={pendingPlayerAccessUsers}
        usersWithoutActivePlayers={usersWithoutActivePlayers}
        minorsWithoutActivePlayer={minorsWithoutActivePlayer}
        onBulkInstallReminders={sendBulkInstallReminders}
        onBulkRenewalReminders={sendBulkRenewalReminders}
        onSetFilter={setRoleFilter}
      />

      <UserFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showDeleted={showDeleted}
        setShowDeleted={setShowDeleted}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        filterCounts={filterCounts}
        isDetectingPairs={isDetectingPairs}
        onDetectPairs={handleDetectPairs}
      />

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
              onPlayerToggle={handlePlayerToggle}
              onMinorRevoke={handleMinorRevoke}
              onToggleHijos={handleToggleHijos}
              onToggleFirmas={handleToggleFirmas}
              onToggleJunta={handleToggleJunta}
              onChatBlock={handleChatBlock}
              onPairParents={openPairDialog}
              onSetCargoJunta={handleSetCargoJunta}
              onChangeRole={handleChangeRole}
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

      <UserDialogs
        selectedUser={selectedUser}
        isPending={updateUserMutation.isPending}
        // player +18
        showPlayerDialog={showPlayerDialog}
        setShowPlayerDialog={setShowPlayerDialog}
        selectedPlayerId={selectedPlayerId}
        setSelectedPlayerId={setSelectedPlayerId}
        onConfirmPlayer={handleConfirmPlayer}
        players={players}
        // coach
        showCoachDialog={showCoachDialog}
        setShowCoachDialog={setShowCoachDialog}
        coachData={coachData}
        setCoachData={setCoachData}
        onConfirmCoach={handleConfirmCoach}
        categoryConfigs={categoryConfigs}
        // coord
        showCoordinatorDialog={showCoordinatorDialog}
        setShowCoordinatorDialog={setShowCoordinatorDialog}
        onConfirmCoordinator={handleConfirmCoordinator}
        // tesor
        showTreasurerDialog={showTreasurerDialog}
        setShowTreasurerDialog={setShowTreasurerDialog}
        onConfirmTreasurer={handleConfirmTreasurer}
        // restrict
        showRestrictDialog={showRestrictDialog}
        setShowRestrictDialog={setShowRestrictDialog}
        restrictionData={restrictionData}
        setRestrictionData={setRestrictionData}
        onConfirmRestriction={handleConfirmRestriction}
        // delete
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        onConfirmDelete={handleConfirmDelete}
        // role
        showRoleDialog={showRoleDialog}
        setShowRoleDialog={setShowRoleDialog}
        selectedRole={selectedRole}
        setSelectedRole={setSelectedRole}
        onConfirmRoleChange={handleConfirmRoleChange}
        // chat
        showChatBlockDialog={showChatBlockDialog}
        setShowChatBlockDialog={setShowChatBlockDialog}
        chatBlockData={chatBlockData}
        setChatBlockData={setChatBlockData}
        onConfirmChatBlock={handleConfirmChatBlock}
        // reminder
        showReminderDialog={showReminderDialog}
        setShowReminderDialog={setShowReminderDialog}
        reminderMessage={reminderMessage}
        setReminderMessage={setReminderMessage}
        onSendReminder={() =>
          enviarRecordatorioRenovacionMutation.mutate({ user: showReminderDialog, message: reminderMessage })
        }
      />

      <PairParentsDialog
        open={showPairDialog}
        onOpenChange={setShowPairDialog}
        pairingContext={pairingContext}
        setPairingContext={setPairingContext}
        players={players}
        getUserPlayers={getUserPlayers}
        onConfirm={handleConfirmPairing}
        onClearSecondParent={handleClearSecondParent}
        isPending={pairParentsMutation.isPending}
      />

      <PairingResultsDialog
        open={showPairingResults}
        onOpenChange={setShowPairingResults}
        pairingResults={pairingResults}
        onAccept={async () => {
          setShowPairingResults(false);
          await queryClient.refetchQueries({ queryKey: ["players"] });
        }}
      />
    </div>
  );
}