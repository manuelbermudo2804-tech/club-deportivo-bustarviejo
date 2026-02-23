import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Mail, UserPlus, Clock, CheckCircle2, XCircle, Loader2, 
  RefreshCw, Search, Send, KeyRound, Users, AlertCircle, Ban, SendHorizonal, ShieldAlert, Info, Copy, Zap
} from "lucide-react";
import { toast } from "sonner";
import BulkInviteDialog from "@/components/admin/BulkInviteDialog";

function InviteDialog({ open, onOpenChange, onInvite }) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("padre_nuevo");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchPlayer, setSearchPlayer] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const needsPlayer = tipo === 'segundo_progenitor' || tipo === 'juvenil';

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['playersForInvite'],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    enabled: open,
  });

  const filteredPlayers = searchPlayer.trim().length >= 2
    ? allPlayers.filter(p => 
        p.nombre?.toLowerCase().includes(searchPlayer.toLowerCase()) ||
        p.email_padre?.toLowerCase().includes(searchPlayer.toLowerCase())
      ).slice(0, 10)
    : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (needsPlayer && !selectedPlayer) {
      toast.error("Selecciona el jugador al que vincular esta invitación");
      return;
    }
    setLoading(true);
    try {
      await onInvite({ 
        email: email.trim(), 
        nombre_destino: nombre.trim(), 
        tipo, 
        mensaje_personalizado: mensaje.trim(),
        ...(selectedPlayer ? { jugador_id: selectedPlayer.id, jugador_nombre: selectedPlayer.nombre } : {})
      });
      setEmail("");
      setNombre("");
      setMensaje("");
      setSelectedPlayer(null);
      setSearchPlayer("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // Reset jugador al cambiar tipo
  React.useEffect(() => {
    if (!needsPlayer) {
      setSelectedPlayer(null);
      setSearchPlayer("");
    }
  }, [tipo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" />
            Nueva Invitación
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de invitación</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="padre_nuevo">👨‍👩‍👧 Padre/Madre Nuevo</SelectItem>
                <SelectItem value="segundo_progenitor">👥 Segundo Progenitor</SelectItem>
                <SelectItem value="juvenil">⚽ Acceso Juvenil (+13)</SelectItem>
                <SelectItem value="jugador_adulto">🏃 Jugador +18</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de jugador vinculado (para segundo_progenitor y juvenil) */}
          {needsPlayer && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                ⚽ Jugador vinculado *
              </Label>
              {selectedPlayer ? (
                <div className="flex items-center justify-between bg-green-50 border-2 border-green-300 rounded-lg p-3">
                  <div>
                    <p className="font-bold text-sm text-green-900">{selectedPlayer.nombre}</p>
                    <p className="text-xs text-green-700">
                      {selectedPlayer.categoria_principal || 'Sin categoría'} · Padre: {selectedPlayer.email_padre}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPlayer(null); setSearchPlayer(""); }} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={searchPlayer}
                    onChange={(e) => setSearchPlayer(e.target.value)}
                    placeholder="Busca por nombre del jugador o email del padre..."
                  />
                  {filteredPlayers.length > 0 && (
                    <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                      {filteredPlayers.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedPlayer(p); setSearchPlayer(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors"
                        >
                          <p className="font-medium text-sm">{p.nombre}</p>
                          <p className="text-xs text-slate-500">{p.categoria_principal} · {p.email_padre}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {searchPlayer.trim().length >= 2 && filteredPlayers.length === 0 && (
                    <p className="text-xs text-slate-500 text-center py-2">No se encontraron jugadores</p>
                  )}
                </div>
              )}
              <p className="text-xs text-slate-500">
                {tipo === 'segundo_progenitor' 
                  ? '⚠️ Selecciona el hijo/a al que el segundo progenitor tendrá acceso'
                  : '⚠️ Selecciona el jugador que recibirá acceso juvenil (debe tener 13-17 años)'}
              </p>
            </div>
          )}

          <div>
            <Label>Email del destinatario *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tipo === 'juvenil' ? "email.del.menor@gmail.com" : "ejemplo@email.com"}
              required
            />
          </div>
          <div>
            <Label>Nombre (opcional)</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del destinatario"
            />
          </div>
          <div>
            <Label>Mensaje personalizado (opcional)</Label>
            <Input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Bienvenido al club..."
            />
          </div>
          <Button type="submit" disabled={loading || !email.trim() || (needsPlayer && !selectedPlayer)} className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Generar Código y Enviar Email
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CodeCard({ code, onResend, onCancel, isResending }) {
  const isExpired = code.fecha_expiracion && new Date(code.fecha_expiracion) < new Date();
  const displayEstado = isExpired && code.estado === 'pendiente' ? 'expirado' : code.estado;

  const estadoConfig = {
    pendiente: { color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock, label: "Pendiente" },
    usado: { color: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2, label: "Usado" },
    expirado: { color: "bg-red-100 text-red-800 border-red-300", icon: AlertCircle, label: "Expirado" },
    cancelado: { color: "bg-slate-100 text-slate-800 border-slate-300", icon: Ban, label: "Cancelado" },
  };

  const tipoConfig = {
    padre_nuevo: { emoji: "👨‍👩‍👧", label: "Padre Nuevo", borderColor: "border-l-orange-500" },
    segundo_progenitor: { emoji: "👥", label: "2º Progenitor", borderColor: "border-l-blue-500" },
    juvenil: { emoji: "⚽", label: "Acceso Juvenil", borderColor: "border-l-green-500" },
    jugador_adulto: { emoji: "🏃", label: "Jugador +18", borderColor: "border-l-purple-500" },
  };

  const estado = estadoConfig[displayEstado] || estadoConfig.pendiente;
  const tipo = tipoConfig[code.tipo] || tipoConfig.padre_nuevo;
  const StatusIcon = estado.icon;

  return (
    <Card className={`border-l-4 ${tipo.borderColor}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xl">{tipo.emoji}</span>
              <span className="font-bold text-sm">{code.nombre_destino || code.email}</span>
              <Badge className={`${estado.color} border text-xs`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {estado.label}
              </Badge>
              <Badge variant="outline" className="text-xs">{tipo.label}</Badge>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <p>📧 {code.email}</p>
              {code.jugador_nombre && <p>⚽ Jugador: {code.jugador_nombre}</p>}
              <p>🔑 Código: <span className="font-mono font-bold text-orange-600">{code.codigo}</span></p>
              <p>📅 Enviado: {new Date(code.fecha_envio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              {code.fecha_expiracion && (
                <p>⏰ Expira: {new Date(code.fecha_expiracion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
              )}
              {code.reenvios > 0 && <p>🔄 Reenvíos: {code.reenvios}/3 {code.reenvios >= 3 ? '(máximo alcanzado)' : '(se reenvía auto si expira)'}</p>}
              {code.fecha_uso && <p>✅ Usado: {new Date(code.fecha_uso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
              {code.invitado_por_nombre && <p>👤 Invitado por: {code.invitado_por_nombre}</p>}
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            {(displayEstado === 'pendiente' || displayEstado === 'expirado') && (
              <Button
                size="sm"
                onClick={() => onResend(code.id)}
                disabled={isResending}
                className="bg-orange-600 hover:bg-orange-700 text-xs"
              >
                {isResending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Reenviar
              </Button>
            )}
            {displayEstado === 'pendiente' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCancel(code.id)}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                <Ban className="w-3 h-3 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAccessCodes() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filter, setFilter] = useState("pendiente");
  const [searchTerm, setSearchTerm] = useState("");
  const [resendingId, setResendingId] = useState(null);
  const [bulkResending, setBulkResending] = useState(false);
  const queryClient = useQueryClient();

  const { data: accessCodes = [], isLoading } = useQuery({
    queryKey: ['accessCodes'],
    queryFn: () => base44.entities.AccessCode.list('-created_date'),
  });

  // Usuarios registrados SIN código validado (se quedaron atascados)
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersAccessCodes'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000,
  });

  // Intentos de acceso (para detectar fraude)
  const { data: accessAttempts = [] } = useQuery({
    queryKey: ['accessAttempts'],
    queryFn: () => base44.entities.AccessCodeAttempt.list('-created_date', 200),
    staleTime: 30000,
  });

  const stuckUsers = allUsers.filter(u => 
    u.role !== 'admin' && 
    !u.codigo_acceso_validado && 
    !u.tipo_panel && 
    !u.es_entrenador && 
    !u.es_coordinador && 
    !u.es_tesorero &&
    !u.es_segundo_progenitor
  );

  // Verificar si ya tienen un código pendiente
  const stuckUsersWithStatus = stuckUsers.map(u => {
    const existingCode = accessCodes.find(c => c.email?.toLowerCase() === u.email?.toLowerCase() && c.estado === 'pendiente');
    return { ...u, existingCode };
  });

  // Análisis de seguridad: agrupar intentos por email
  const securityAlerts = React.useMemo(() => {
    const byEmail = {};
    accessAttempts.forEach(a => {
      const email = a.user_email?.toLowerCase();
      if (!email) return;
      if (!byEmail[email]) byEmail[email] = { email, attempts: [], screenViews: 0, failures: 0, blocked: 0, wrongEmail: 0, invalidCodes: 0, lastAttempt: null };
      byEmail[email].attempts.push(a);
      if (a.motivo_fallo === 'pantalla_acceso') byEmail[email].screenViews++;
      else if (!a.exitoso) {
        byEmail[email].failures++;
        if (a.motivo_fallo === 'bloqueado') byEmail[email].blocked++;
        if (a.motivo_fallo === 'email_incorrecto') byEmail[email].wrongEmail++;
        if (a.motivo_fallo === 'codigo_invalido') byEmail[email].invalidCodes++;
      }
      const date = new Date(a.created_date);
      if (!byEmail[email].lastAttempt || date > byEmail[email].lastAttempt) byEmail[email].lastAttempt = date;
    });

    // Marcar como sospechoso si: tiene bloqueos, muchos intentos fallidos, o intentó email incorrecto
    return Object.values(byEmail)
      .filter(e => e.blocked > 0 || e.failures >= 3 || e.wrongEmail > 0)
      .sort((a, b) => {
        // Priorizar: bloqueados > muchos fallos > email incorrecto
        if (a.blocked !== b.blocked) return b.blocked - a.blocked;
        return b.failures - a.failures;
      });
  }, [accessAttempts]);

  // Usuarios que visitaron pantalla de código pero NO tienen código generado (posible acceso fraudulento)
  const unauthorizedScreenVisits = React.useMemo(() => {
    const screenEmails = [...new Set(accessAttempts.filter(a => a.motivo_fallo === 'pantalla_acceso').map(a => a.user_email?.toLowerCase()))];
    return screenEmails
      .filter(email => {
        // No tiene código generado para ese email
        const hasCode = accessCodes.some(c => c.email?.toLowerCase() === email);
        return !hasCode;
      })
      .map(email => {
        const userObj = allUsers.find(u => u.email?.toLowerCase() === email);
        const visits = accessAttempts.filter(a => a.user_email?.toLowerCase() === email && a.motivo_fallo === 'pantalla_acceso');
        const failedAttempts = accessAttempts.filter(a => a.user_email?.toLowerCase() === email && !a.exitoso && a.motivo_fallo !== 'pantalla_acceso');
        return { email, user: userObj, visitCount: visits.length, failedAttempts: failedAttempts.length, lastVisit: visits[0]?.created_date };
      })
      .sort((a, b) => b.failedAttempts - a.failedAttempts || b.visitCount - a.visitCount);
  }, [accessAttempts, accessCodes, allUsers]);

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const { data: result } = await base44.functions.invoke('generateAccessCode', data);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
      toast.success(`Código ${data.codigo} generado y enviado por email`);
    },
    onError: (err) => {
      toast.error(err?.response?.data?.error || 'Error al generar código');
    }
  });

  const resendMutation = useMutation({
    mutationFn: async (id) => {
      setResendingId(id);
      const { data: result } = await base44.functions.invoke('generateAccessCode', { action: 'resend', access_code_id: id });
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
      toast.success(`Código ${data.codigo} reenviado`);
      setResendingId(null);
    },
    onError: (err) => {
      toast.error('Error al reenviar');
      setResendingId(null);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessCode.update(id, { estado: 'cancelado' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
      toast.success('Invitación cancelada');
    }
  });

  const handleBulkResend = async () => {
    const pendingCodes = accessCodes.filter(c => 
      c.estado === 'pendiente' && (!c.fecha_expiracion || new Date(c.fecha_expiracion) >= new Date())
    );
    if (pendingCodes.length === 0) {
      toast.info('No hay invitaciones pendientes para reenviar');
      return;
    }
    if (!confirm(`¿Reenviar ${pendingCodes.length} invitaciones pendientes?`)) return;
    setBulkResending(true);
    let sent = 0;
    for (const code of pendingCodes) {
      try {
        await base44.functions.invoke('generateAccessCode', { action: 'resend', access_code_id: code.id });
        sent++;
      } catch (e) { /* skip errors */ }
    }
    setBulkResending(false);
    queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
    toast.success(`${sent} invitaciones reenviadas`);
  };

  const filtered = accessCodes.filter(c => {
    const matchesFilter = filter === 'all' || c.estado === filter || 
      (filter === 'expirado' && c.estado === 'pendiente' && c.fecha_expiracion && new Date(c.fecha_expiracion) < new Date());
    const matchesSearch = !searchTerm || 
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.nombre_destino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    pendiente: accessCodes.filter(c => c.estado === 'pendiente' && (!c.fecha_expiracion || new Date(c.fecha_expiracion) >= new Date())).length,
    expirado: accessCodes.filter(c => c.estado === 'expirado' || (c.estado === 'pendiente' && c.fecha_expiracion && new Date(c.fecha_expiracion) < new Date())).length,
    usado: accessCodes.filter(c => c.estado === 'usado').length,
    total: accessCodes.length,
  };

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🔑 Códigos de Acceso</h1>
          <p className="text-slate-600 mt-1">Genera y gestiona los códigos de invitación al club</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleBulkResend}
            disabled={bulkResending || counts.pendiente === 0}
            size="sm"
          >
            {bulkResending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Reenviar todas ({counts.pendiente})
          </Button>
          <Button onClick={() => setInviteOpen(true)} className="bg-orange-600 hover:bg-orange-700" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Nueva Invitación
          </Button>
        </div>
      </div>

      {/* 🚨 ALERTAS DE SEGURIDAD */}
      {(securityAlerts.length > 0 || unauthorizedScreenVisits.length > 0) && (
        <Card className="mb-6 border-2 border-red-400 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-800 text-lg">
              <ShieldAlert className="w-5 h-5" />
              Alertas de Seguridad
            </CardTitle>
            <p className="text-sm text-red-700">
              Actividad sospechosa detectada. Estos usuarios pueden estar intentando acceder sin invitación.
            </p>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {/* Usuarios que visitaron la pantalla sin tener código */}
            {unauthorizedScreenVisits.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 uppercase mb-2">🔍 Accesos sin invitación ({unauthorizedScreenVisits.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {unauthorizedScreenVisits.map(u => (
                    <div key={u.email} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-red-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{u.user?.full_name || u.email}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                            Sin invitación
                          </Badge>
                          {u.failedAttempts > 0 && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                              {u.failedAttempts} intento{u.failedAttempts !== 1 ? 's' : ''} fallido{u.failedAttempts !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {u.lastVisit ? new Date(u.lastVisit).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                        onClick={() => {
                          generateMutation.mutate({ email: u.email, nombre_destino: u.user?.full_name || '', tipo: 'padre_nuevo' });
                        }}
                        disabled={generateMutation.isPending}
                      >
                        <SendHorizonal className="w-3 h-3 mr-1" />
                        Enviar Código
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Usuarios con intentos sospechosos de fuerza bruta */}
            {securityAlerts.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-700 uppercase mb-2">⚠️ Intentos sospechosos ({securityAlerts.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {securityAlerts.map(alert => (
                    <div key={alert.email} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-red-200">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-slate-900 truncate">{alert.email}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {alert.blocked > 0 && (
                            <Badge className="bg-red-500 text-white text-[10px]">
                              🔒 Bloqueado {alert.blocked}x
                            </Badge>
                          )}
                          {alert.wrongEmail > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">
                              📧 Email incorrecto {alert.wrongEmail}x
                            </Badge>
                          )}
                          {alert.invalidCodes > 0 && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">
                              🔑 Códigos inválidos: {alert.invalidCodes}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            Total fallos: {alert.failures}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            Último: {alert.lastAttempt ? new Date(alert.lastAttempt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Banner: usuarios sin código */}
      {stuckUsersWithStatus.length > 0 && (
        <Card className="mb-6 border-2 border-amber-400 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-800 text-lg">
              <AlertCircle className="w-5 h-5" />
              {stuckUsersWithStatus.length} usuario{stuckUsersWithStatus.length !== 1 ? 's' : ''} esperando código de acceso
            </CardTitle>
            <p className="text-sm text-amber-700">
              Estos usuarios se registraron pero no pueden entrar porque no tienen código. Envíales uno para que puedan acceder.
            </p>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stuckUsersWithStatus.map(u => (
                <div key={u.id} className="flex items-center justify-between gap-3 bg-white rounded-xl p-3 border border-amber-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{u.full_name || u.email}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <p className="text-xs text-amber-600">
                      Registrado: {new Date(u.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  {u.existingCode ? (
                    <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs whitespace-nowrap">
                      <Clock className="w-3 h-3 mr-1" />
                      Código enviado: {u.existingCode.codigo}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
                      onClick={() => {
                        generateMutation.mutate({ email: u.email, nombre_destino: u.full_name || '', tipo: 'padre_nuevo' });
                      }}
                      disabled={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <SendHorizonal className="w-3 h-3 mr-1" />}
                      Enviar Código
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info: sistema de reenvío automático */}
      <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-900 text-sm">🔄 Sistema de reenvío automático activo</p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Cuando un código <strong>expira sin ser usado</strong>, el sistema automáticamente genera un código nuevo y lo reenvía al destinatario (máximo 3 veces). 
                Si después de 3 reenvíos sigue sin validarlo, se marca como <strong>expirado definitivamente</strong> y recibirás un email de aviso. 
                También puedes reenviar manualmente en cualquier momento pulsando "Reenviar".
              </p>
              <div className="flex gap-4 mt-2 text-[11px] text-blue-600">
                <span>✅ Reenvío auto cada 7 días</span>
                <span>📧 Hasta 3 reenvíos</span>
                <span>🔔 Notificación al admin si expira</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{counts.pendiente}</p>
            <p className="text-xs text-yellow-600">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{counts.expirado}</p>
            <p className="text-xs text-red-600">Expirados</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{counts.usado}</p>
            <p className="text-xs text-green-600">Completados</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-700">{counts.total}</p>
            <p className="text-xs text-slate-600">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'pendiente', label: 'Pendientes', icon: Clock, color: 'bg-yellow-600' },
          { key: 'expirado', label: 'Expirados', icon: AlertCircle, color: 'bg-red-600' },
          { key: 'usado', label: 'Completados', icon: CheckCircle2, color: 'bg-green-600' },
          { key: 'all', label: 'Todos', icon: KeyRound, color: 'bg-slate-600' },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? f.color : ""}
            size="sm"
          >
            <f.icon className="w-3 h-3 mr-1" />
            {f.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por email, nombre o código..."
          className="pl-10"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            <KeyRound className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay invitaciones {filter !== 'all' ? `con estado "${filter}"` : ''}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(code => (
            <CodeCard
              key={code.id}
              code={code}
              onResend={(id) => resendMutation.mutate(id)}
              onCancel={(id) => cancelMutation.mutate(id)}
              isResending={resendingId === code.id}
            />
          ))}
        </div>
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={(data) => generateMutation.mutateAsync(data)}
      />
    </div>
  );
}