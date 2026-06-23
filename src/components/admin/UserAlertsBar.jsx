import React from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, User, AlertTriangle, Send } from "lucide-react";

export default function UserAlertsBar({
  usersWithoutApp,
  pendingPlayerAccessUsers,
  usersWithoutActivePlayers,
  minorsWithoutActivePlayer,
  onBulkInstallReminders,
  onBulkRenewalReminders,
  onSetFilter,
}) {
  const showAny =
    usersWithoutApp.length > 5 ||
    pendingPlayerAccessUsers.length > 0 ||
    usersWithoutActivePlayers.length > 0 ||
    minorsWithoutActivePlayer.length > 0;

  if (!showAny) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {usersWithoutApp.length > 5 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center gap-3">
          <Smartphone className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">📵 {usersWithoutApp.length} sin app</p>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs h-7" onClick={onBulkInstallReminders}>
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
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs h-7" onClick={() => onSetFilter("pending_player")}>
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
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-xs h-7" onClick={() => onSetFilter("inactive_minors")}>
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
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs h-7" onClick={() => onSetFilter("inactive_parents")}>
              Ver
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7"
              onClick={onBulkRenewalReminders}
            >
              <Send className="w-3 h-3 mr-1" />
              Recordar Todos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}