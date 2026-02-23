import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  UserCheck,
  AlertTriangle,
  Eye,
  EyeOff,
  MoreVertical,
  Users,
  Clock,
  HeartHandshake,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserManagementTable({
  users,
  players,
  pairByEmail,
  onCoachToggle,
  onCoordinatorToggle,
  onTreasurerToggle,
  onToggleHijos,
  onToggleFirmas,
  onToggleJunta,
  onChatBlock,
  onPairParents,
  onSetCargoJunta,
  onRestrictAccess,
  onDeleteUser,
  onSendInstallReminder,
  onActivateAccess,
}) {
  const [expandedUser, setExpandedUser] = useState(null);

  const getUserPlayers = (userEmail) => {
    const email = (userEmail || "").trim().toLowerCase();
    return players.filter(
      (p) =>
        (p.email_padre && p.email_padre.trim().toLowerCase() === email) ||
        (p.email_tutor_2 && p.email_tutor_2.trim().toLowerCase() === email)
    );
  };

  const getLastActivity = (user) => {
    if (!user.updated_date) return "—";
    const date = new Date(user.updated_date);
    const now = new Date();
    const days = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Hoy";
    if (days === 1) return "Ayer";
    if (days < 30) return `Hace ${days}d`;
    return date.toLocaleDateString("es-ES");
  };

  // Reordenar usuarios agrupando parejas consecutivas
  const sortedUsers = (() => {
    if (!users || !pairByEmail) return users || [];
    const result = [];
    const placed = new Set();
    
    users.forEach((user) => {
      if (placed.has(user.id)) return;
      placed.add(user.id);
      result.push(user);
      
      // Si tiene pareja, buscar y colocar justo después
      const pair = pairByEmail[user.email?.toLowerCase()];
      if (pair?.partner?.email) {
        const partner = users.find(u => u.email?.toLowerCase() === pair.partner.email.toLowerCase());
        if (partner && !placed.has(partner.id)) {
          placed.add(partner.id);
          result.push(partner);
        }
      }
    });
    
    return result;
  })();

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No hay usuarios para mostrar</p>
      </div>
    );
  }

  // Precalcular qué emails forman parte de una pareja (para saber quién es primero y quién segundo)
  const pairGroupMap = (() => {
    const map = {};
    if (!pairByEmail) return map;
    const processed = new Set();
    sortedUsers.forEach((user) => {
      const email = user.email?.toLowerCase();
      if (!email || processed.has(email)) return;
      const pair = pairByEmail[email];
      if (!pair?.partner?.email) return;
      const partnerEmail = pair.partner.email.toLowerCase();
      if (processed.has(partnerEmail)) return;
      processed.add(email);
      processed.add(partnerEmail);
      map[email] = { position: 'first', partner: pair.partner, sharedPlayers: pair.sharedPlayers };
      map[partnerEmail] = { position: 'second', partner: user, sharedPlayers: pair.sharedPlayers };
    });
    return map;
  })();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Usuario</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">Acceso</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              📚 Entrenador
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              🎓 Coordinador
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              💰 Tesorero
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              ⚽ Jugador
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              🧒 Juvenil
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              🏛️ Junta
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              👨‍👩‍👧 Hijos
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              🖊️ Firmas
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">
              💬 Chat
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">Última activ.</th>
            <th className="px-4 py-3 text-center font-semibold text-slate-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => {
            const userPlayers = getUserPlayers(user.email);
            const isExpanded = expandedUser === user.id;
            const isRestricted = user.acceso_activo === false;
            const isDeleted = user.eliminado === true;
            const hasAnomalies =
              isRestricted || isDeleted || (user.role === "user" && userPlayers.length === 0);
            const pairInfo = pairByEmail?.[user.email?.toLowerCase()];
            const pairGroup = pairGroupMap[user.email?.toLowerCase()];

            return (
              <React.Fragment key={user.id}>
                {/* ROW PRINCIPAL */}
                <tr
                  className={`hover:bg-slate-50 transition-colors ${
                    isRestricted ? "bg-red-50" : isDeleted ? "bg-slate-100" : ""
                  }`}
                >
                  {/* Usuario */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {user.full_name || user.email?.split("@")[0]}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                      </div>
                      {user.es_menor === true && (
                        <Badge className="bg-teal-600 text-[10px] px-1.5 py-0">🧒 Juvenil</Badge>
                      )}
                      {hasAnomalies && (
                        <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      )}
                    </div>
                    {pairInfo && (
                      <div className="flex items-center gap-1 mt-1 bg-pink-50 border border-pink-200 rounded px-2 py-0.5">
                        <HeartHandshake className="w-3 h-3 text-pink-500 flex-shrink-0" />
                        <span className="text-[10px] text-pink-700 truncate">
                          Pareja: <strong>{pairInfo.partner?.full_name || pairInfo.partner?.email}</strong>
                        </span>
                        <span className="text-[10px] text-pink-500 flex-shrink-0">
                          · {pairInfo.sharedPlayers?.length || 0} hijo{(pairInfo.sharedPlayers?.length || 0) !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Acceso */}
                  <td className="px-4 py-3 text-center">
                    {isDeleted ? (
                      <Badge className="bg-slate-500">Eliminado</Badge>
                    ) : isRestricted ? (
                      <Badge className="bg-red-600">Restringido</Badge>
                    ) : (
                      <Badge className="bg-green-600">Activo</Badge>
                    )}
                  </td>

                  {/* Entrenador */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.es_entrenador === true}
                      onCheckedChange={() => onCoachToggle(user)}
                      disabled={isRestricted || isDeleted}
                    />
                  </td>

                  {/* Coordinador */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.es_coordinador === true}
                      onCheckedChange={() => onCoordinatorToggle(user)}
                      disabled={isRestricted || isDeleted || !user.es_entrenador}
                    />
                  </td>

                  {/* Tesorero */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.es_tesorero === true}
                      onCheckedChange={() => onTreasurerToggle(user)}
                      disabled={isRestricted || isDeleted}
                    />
                  </td>

                  {/* Jugador */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.es_jugador === true}
                      onCheckedChange={() => console.log("Jugador toggle")}
                      disabled={isRestricted || isDeleted}
                    />
                  </td>

                  {/* Juvenil (menor) */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.es_menor === true}
                      disabled={true}
                    />
                  </td>

                  {/* Junta */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.es_junta === true}
                      onCheckedChange={() => onToggleJunta(user)}
                      disabled={isRestricted || isDeleted}
                    />
                  </td>

                  {/* Tiene Hijos */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.tiene_hijos_jugando === true}
                      onCheckedChange={() => onToggleHijos(user)}
                      disabled={isRestricted || isDeleted}
                    />
                  </td>

                  {/* Gestiona Firmas */}
                  <td className="px-4 py-3 text-center">
                    <Switch
                      checked={user.puede_gestionar_firmas === true}
                      onCheckedChange={() => onToggleFirmas(user)}
                      disabled={isRestricted || isDeleted}
                    />
                  </td>

                  {/* Chat Bloqueado */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      {user.chat_bloqueado === true ? (
                        <Badge className="bg-red-600 text-xs">Bloqueado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Libre
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Última actividad */}
                  <td className="px-4 py-3 text-center text-xs text-slate-600">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3" />
                      {getLastActivity(user)}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setExpandedUser(user.id)}>
                          👁️ Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onChatBlock(user)}>
                          💬 Gestionar chat
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onPairParents(user)}>
                          👨‍👩‍👧 Emparejar progenitores
                        </DropdownMenuItem>
                        {user.es_junta && (
                          <DropdownMenuItem onClick={() => onSetCargoJunta(user, "presidente")}>
                            🎖️ Cargo en Junta
                          </DropdownMenuItem>
                        )}
                        {!user.app_instalada && (
                          <DropdownMenuItem
                            onClick={() => onSendInstallReminder(user)}
                            className="text-amber-600"
                          >
                            📲 Recordar instalación
                          </DropdownMenuItem>
                        )}
                        {!isRestricted && (
                          <DropdownMenuItem
                            onClick={() => onRestrictAccess(user)}
                            className="text-orange-600"
                          >
                            ⛔ Restringir acceso
                          </DropdownMenuItem>
                        )}
                        {isRestricted && (
                          <DropdownMenuItem
                            onClick={() => onActivateAccess(user.id)}
                            className="text-green-600"
                          >
                            ✅ Activar acceso
                          </DropdownMenuItem>
                        )}
                        {!isDeleted && (
                          <DropdownMenuItem
                            onClick={() => onDeleteUser(user)}
                            className="text-red-600"
                          >
                            🗑️ Eliminar usuario
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>

                {/* FILA EXPANDIDA - Detalles y Hijos */}
                {isExpanded && (
                  <tr className="bg-slate-50 border-b border-slate-300">
                    <td colSpan="11" className="px-4 py-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Detalles del usuario */}
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Información</h4>
                          <div className="space-y-2 text-sm">
                            <p>
                              <strong>Email:</strong> {user.email}
                            </p>
                            <p>
                              <strong>Nombre:</strong> {user.full_name}
                            </p>
                            <p>
                              <strong>Rol:</strong> {user.role}
                              {user.es_menor && " · 🧒 Juvenil"}
                              {user.es_jugador && " · ⚽ Jugador +18"}
                            </p>
                            <p>
                              <strong>Registrado:</strong>{" "}
                              {new Date(user.created_date).toLocaleDateString("es-ES")}
                            </p>
                            {user.acceso_activo === false && (
                              <div className="bg-red-100 border border-red-300 rounded p-2 mt-2">
                                <p className="font-medium text-red-900">Motivo restricción:</p>
                                <p className="text-red-800">{user.motivo_restriccion}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hijos vinculados */}
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">
                            👨‍👩‍👧 Jugadores vinculados ({userPlayers.length})
                          </h4>
                          {userPlayers.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {userPlayers.map((player) => (
                                <div
                                  key={player.id}
                                  className="bg-white border border-slate-200 rounded p-2 text-sm"
                                >
                                  <p className="font-medium">{player.nombre}</p>
                                  <p className="text-xs text-slate-600">
                                    {player.categoria_principal}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {player.activo ? "✅ Activo" : "⛔ Inactivo"}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-500">
                              {user.role === "user"
                                ? "⚠️ Sin jugadores activos"
                                : "—"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Botón cerrar */}
                      <div className="mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedUser(null)}
                        >
                          Cerrar detalles
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}