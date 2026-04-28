import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Loader2,
  CheckCircle2,
  Ban,
  Trash2,
  User,
  Users,
  Shield,
  Check,
  Mail,
} from "lucide-react";

const RESTRICT_REASONS = [
  "Jugador ya no forma parte del club",
  "Finalización de temporada",
  "Baja voluntaria",
  "Impago de cuotas",
  "Otro",
];

const CHAT_BLOCK_REASONS = [
  "Lenguaje ofensivo reiterado",
  "Acoso o amenazas",
  "Spam o mensajes excesivos",
  "Conflictos repetidos con staff",
  "Incumplimiento reiterado de normas",
  "Otro",
];

const BASE_CATEGORIES = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)",
];

export default function UserDialogs(props) {
  const {
    selectedUser,
    isPending,
    // player +18
    showPlayerDialog,
    setShowPlayerDialog,
    selectedPlayerId,
    setSelectedPlayerId,
    onConfirmPlayer,
    players,
    // coach
    showCoachDialog,
    setShowCoachDialog,
    coachData,
    setCoachData,
    onConfirmCoach,
    categoryConfigs,
    // coordinator
    showCoordinatorDialog,
    setShowCoordinatorDialog,
    onConfirmCoordinator,
    // treasurer
    showTreasurerDialog,
    setShowTreasurerDialog,
    onConfirmTreasurer,
    // restrict
    showRestrictDialog,
    setShowRestrictDialog,
    restrictionData,
    setRestrictionData,
    onConfirmRestriction,
    // delete
    showDeleteDialog,
    setShowDeleteDialog,
    onConfirmDelete,
    // role
    showRoleDialog,
    setShowRoleDialog,
    selectedRole,
    setSelectedRole,
    onConfirmRoleChange,
    // chat block
    showChatBlockDialog,
    setShowChatBlockDialog,
    chatBlockData,
    setChatBlockData,
    onConfirmChatBlock,
    // reminder
    showReminderDialog,
    setShowReminderDialog,
    reminderMessage,
    setReminderMessage,
    onSendReminder,
  } = props;

  const toggleCategory = (category) => {
    setCoachData((prev) => {
      const current = prev.categorias_entrena || [];
      if (current.includes(category)) {
        return { ...prev, categorias_entrena: current.filter((c) => c !== category) };
      }
      return { ...prev, categorias_entrena: [...current, category] };
    });
  };

  const allCoachCategories = (() => {
    const extras = (categoryConfigs || []).map((c) => c.nombre).filter((n) => n && !BASE_CATEGORIES.includes(n));
    return [...BASE_CATEGORIES, ...extras];
  })();

  return (
    <>
      {/* Jugador +18 */}
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
                      .filter(
                        (p) =>
                          p.es_mayor_edad === true ||
                          (p.fecha_nacimiento &&
                            new Date().getFullYear() - new Date(p.fecha_nacimiento).getFullYear() >= 18)
                      )
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} - {p.deporte}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
              <p className="text-sm text-purple-900 font-bold mb-2">⚽ ¿Qué es el acceso de Jugador +18?</p>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>✅ Ver sus convocatorias y confirmar asistencia</li>
                <li>✅ Ver sus pagos pendientes</li>
                <li>✅ Comunicarse con entrenadores por chat</li>
                <li>✅ Acceder al calendario y eventos</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlayerDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmPlayer}
              disabled={isPending}
              className={selectedUser?.es_jugador ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"}
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                selectedUser?.es_jugador ? "Quitar Acceso de Jugador" : "Confirmar Jugador +18"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entrenador */}
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
                    {allCoachCategories.map((category) => {
                      const checked = coachData.categorias_entrena?.includes(category);
                      return (
                        <div
                          key={category}
                          onClick={() => toggleCategory(category)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            checked ? "bg-blue-100 border-blue-500 shadow-sm" : "bg-white border-slate-200 hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              checked ? "bg-blue-600 border-blue-600" : "border-slate-300"
                            }`}>
                              {checked && <Check className="w-4 h-4 text-white" />}
                            </div>
                            <span className={`font-medium ${checked ? "text-blue-900" : "text-slate-700"}`}>
                              {category.includes("Fútbol") ? "⚽" : "🏀"} {category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coach-phone-input">Teléfono de Contacto (opcional)</Label>
                  <Input
                    id="coach-phone-input"
                    type="tel"
                    placeholder="Ej: 666 123 456"
                    value={coachData.telefono_entrenador}
                    onChange={(e) => setCoachData({ ...coachData, telefono_entrenador: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoachDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmCoach}
              disabled={isPending || (!selectedUser?.es_entrenador && (!coachData.categorias_entrena || coachData.categorias_entrena.length === 0))}
              className={selectedUser?.es_entrenador ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                selectedUser?.es_entrenador ? "Quitar Rol de Entrenador" : "Confirmar Entrenador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coordinador */}
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
          <div className="bg-cyan-50 border-2 border-cyan-300 rounded-lg p-4 my-4">
            <p className="text-sm text-cyan-900 font-bold mb-2">🎓 Permisos:</p>
            <ul className="text-sm text-cyan-800 space-y-1">
              <li>✅ Visibilidad completa de todas las categorías</li>
              <li>✅ Reportes de entrenadores</li>
              <li>✅ Chat especial con familias</li>
              <li>❌ NO gestiona pagos ni inscripciones</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoordinatorDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmCoordinator}
              disabled={isPending}
              className={selectedUser?.es_coordinador ? "bg-red-600 hover:bg-red-700" : "bg-cyan-600 hover:bg-cyan-700"}
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                selectedUser?.es_coordinador ? "Quitar Rol" : "Confirmar Coordinador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tesorero */}
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
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 my-4">
            <p className="text-sm text-green-900 font-bold mb-2">💰 Permisos:</p>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✅ Gestión completa de pagos</li>
              <li>✅ Recordatorios y histórico</li>
              <li>✅ Configuración de cuotas y temporadas</li>
              <li>❌ NO gestiona jugadores ni evaluaciones</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTreasurerDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmTreasurer}
              disabled={isPending}
              className={selectedUser?.es_tesorero ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                selectedUser?.es_tesorero ? "Quitar Rol" : "Confirmar Tesorero"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restricción */}
      <Dialog open={showRestrictDialog} onOpenChange={setShowRestrictDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedUser?.acceso_activo !== false ? (
                <><Ban className="w-6 h-6 text-red-600" />Restringir Acceso</>
              ) : (
                <><CheckCircle2 className="w-6 h-6 text-green-600" />Restaurar Acceso</>
              )}
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedUser?.acceso_activo !== false && (
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select
                  value={restrictionData.motivo_restriccion}
                  onValueChange={(value) => setRestrictionData({ ...restrictionData, motivo_restriccion: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un motivo" /></SelectTrigger>
                  <SelectContent>
                    {RESTRICT_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notas del Administrador (opcional)</Label>
              <Textarea
                placeholder="Notas internas..."
                value={restrictionData.notas_admin}
                onChange={(e) => setRestrictionData({ ...restrictionData, notas_admin: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestrictDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmRestriction}
              disabled={isPending || (selectedUser?.acceso_activo !== false && !restrictionData.motivo_restriccion)}
              className={selectedUser?.acceso_activo !== false ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                selectedUser?.acceso_activo !== false ? <><Ban className="w-4 h-4 mr-2" />Confirmar Restricción</> :
                <><CheckCircle2 className="w-4 h-4 mr-2" />Confirmar Restauración</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bloqueo Chat */}
      <Dialog open={showChatBlockDialog} onOpenChange={setShowChatBlockDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              {selectedUser?.chat_bloqueado ? (
                <><CheckCircle2 className="w-6 h-6 text-green-600" />Desbloquear Chat</>
              ) : (
                <><Ban className="w-6 h-6 text-orange-600" />Bloquear Chat</>
              )}
            </DialogTitle>
            <DialogDescription><strong>{selectedUser?.full_name}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!selectedUser?.chat_bloqueado && (
              <div className="space-y-2">
                <Label>Motivo *</Label>
                <Select
                  value={chatBlockData.motivo_bloqueo_chat}
                  onValueChange={(value) => setChatBlockData({ motivo_bloqueo_chat: value })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecciona un motivo" /></SelectTrigger>
                  <SelectContent>
                    {CHAT_BLOCK_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChatBlockDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmChatBlock}
              disabled={isPending || (!selectedUser?.chat_bloqueado && !chatBlockData.motivo_bloqueo_chat)}
              className={selectedUser?.chat_bloqueado ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                selectedUser?.chat_bloqueado ? "Desbloquear Chat" : "Confirmar Bloqueo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Eliminar */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-slate-700" />Eliminar Usuario
            </DialogTitle>
            <DialogDescription>
              Marcar como eliminado a <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 my-4">
            <ul className="text-sm text-orange-800 space-y-2 list-disc list-inside">
              <li>El usuario <strong>NO podrá iniciar sesión</strong></li>
              <li>El usuario <strong>NO aparecerá en las listas</strong></li>
              <li>Los datos permanecen en el sistema</li>
              <li>Es <strong>reversible</strong></li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button onClick={onConfirmDelete} disabled={isPending} className="bg-slate-700 hover:bg-slate-800">
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                <><Trash2 className="w-4 h-4 mr-2" />Sí, Marcar como Eliminado</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cambio de rol */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-600" />Cambiar Rol
            </DialogTitle>
            <DialogDescription>
              <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rol del Usuario</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">👨‍👩‍👧 Padre/Tutor (acceso completo)</SelectItem>
                  <SelectItem value="jugador">⚽ Jugador (acceso limitado)</SelectItem>
                  <SelectItem value="admin">🎓 Administrador (gestión total)</SelectItem>
                  <SelectItem value="tablet">📲 Tablet Check-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedRole === "jugador" && (
              <div className="space-y-2">
                <Label>Vincular a Jugador *</Label>
                <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona el jugador..." /></SelectTrigger>
                  <SelectContent>
                    {players
                      .filter((p) => p.acceso_jugador_autorizado && p.email_jugador === selectedUser?.email)
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre} - {p.deporte}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancelar</Button>
            <Button
              onClick={onConfirmRoleChange}
              disabled={isPending || (selectedRole === "jugador" && !selectedPlayerId)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Procesando...</> :
                <><Shield className="w-4 h-4 mr-2" />Confirmar Cambio de Rol</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recordatorio renovación */}
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
            <Button variant="outline" onClick={() => setShowReminderDialog(null)}>Cancelar</Button>
            <Button onClick={onSendReminder} className="bg-blue-600 hover:bg-blue-700">
              <Mail className="w-4 h-4 mr-2" />Enviar Recordatorio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}