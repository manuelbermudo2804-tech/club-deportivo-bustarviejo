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
  RefreshCw, Search, Send, KeyRound, Users, AlertCircle, Ban, SendHorizonal, ShieldAlert, Info, Copy, Zap, Trash2, MessageCircle
} from "lucide-react";
import { toast } from "sonner";
import BulkInviteDialog from "@/components/admin/BulkInviteDialog";
import BandejaTab from "@/components/admin/access-codes/BandejaTab";
import CodigosTab from "@/components/admin/access-codes/CodigosTab";
import SeguridadTab from "@/components/admin/access-codes/SeguridadTab";
import { getWhatsAppUrl } from "@/components/admin/access-codes/whatsappCodeMessage";

function InviteDialog({ open, onOpenChange, onInvite }) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("padre_nuevo");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchPlayer, setSearchPlayer] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedCategorias, setSelectedCategorias] = useState([]);

  const needsPlayer = tipo === 'segundo_progenitor' || tipo === 'juvenil';
  const needsCategoria = tipo === 'entrenador' || tipo === 'coordinador';

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['playersForInvite'],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    enabled: open,
  });

  const { data: allCategories = [] } = useQuery({
    queryKey: ['categoriesForInvite'],
    queryFn: async () => {
      const cats = await base44.entities.CategoryConfig.filter({ activa: true });
      // Deduplicar por nombre (puede haber configs de distintas temporadas)
      const seen = new Set();
      return cats.filter(c => {
        if (seen.has(c.nombre)) return false;
        seen.add(c.nombre);
        return true;
      });
    },
    enabled: open && needsCategoria,
  });

  const filteredPlayers = searchPlayer.trim().length >= 2
    ? allPlayers.filter(p => 
        p.nombre?.toLowerCase().includes(searchPlayer.toLowerCase()) ||
        p.email_padre?.toLowerCase().includes(searchPlayer.toLowerCase())
      ).slice(0, 10)
    : [];

  const toggleCategoria = (cat) => {
    setSelectedCategorias(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (needsPlayer && !selectedPlayer) {
      toast.error("Selecciona el jugador al que vincular esta invitación");
      return;
    }
    if (needsCategoria && selectedCategorias.length === 0) {
      toast.error("Selecciona al menos una categoría");
      return;
    }
    setLoading(true);
    try {
      await onInvite({ 
        email: email.trim(), 
        nombre_destino: nombre.trim(), 
        tipo, 
        mensaje_personalizado: mensaje.trim(),
        ...(selectedPlayer ? { jugador_id: selectedPlayer.id, jugador_nombre: selectedPlayer.nombre } : {}),
        ...(needsCategoria ? { categorias_asignadas: selectedCategorias } : {})
      });
      setEmail("");
      setNombre("");
      setMensaje("");
      setSelectedPlayer(null);
      setSearchPlayer("");
      setSelectedCategorias([]);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  // Reset campos al cambiar tipo
  React.useEffect(() => {
    if (!needsPlayer) {
      setSelectedPlayer(null);
      setSearchPlayer("");
    }
    if (!needsCategoria) {
      setSelectedCategorias([]);
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
                <SelectItem value="entrenador">🏃‍♂️ Entrenador</SelectItem>
                <SelectItem value="coordinador">📋 Coordinador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de categorías (para entrenador y coordinador) */}
          {needsCategoria && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                📋 Categorías asignadas *
              </Label>
              <p className="text-xs text-slate-500">
                Selecciona las categorías que {tipo === 'entrenador' ? 'entrenará' : 'coordinará'}
              </p>
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {allCategories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.nombre)}
                    className={`w-full text-left px-3 py-2.5 transition-colors flex items-center gap-2 ${
                      selectedCategorias.includes(cat.nombre) 
                        ? 'bg-orange-50 border-l-4 border-l-orange-500' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                      selectedCategorias.includes(cat.nombre) 
                        ? 'bg-orange-600 border-orange-600 text-white' 
                        : 'border-slate-300'
                    }`}>
                      {selectedCategorias.includes(cat.nombre) && '✓'}
                    </span>
                    <span className="font-medium text-sm">{cat.nombre}</span>
                  </button>
                ))}
              </div>
              {selectedCategorias.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedCategorias.map(c => (
                    <Badge key={c} className="bg-orange-100 text-orange-800 text-xs">
                      {c}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

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
          <Button type="submit" disabled={loading || !email.trim() || (needsPlayer && !selectedPlayer) || (needsCategoria && selectedCategorias.length === 0)} className="w-full bg-orange-600 hover:bg-orange-700">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Generar Código y Enviar Email
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CodeCard({ code, onResend, onCancel, onDelete, isResending, telefono }) {
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
    entrenador: { emoji: "🏃‍♂️", label: "Entrenador", borderColor: "border-l-cyan-500" },
    coordinador: { emoji: "📋", label: "Coordinador", borderColor: "border-l-indigo-500" },
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
              {code.categorias_asignadas?.length > 0 && <p>📋 Categorías: {code.categorias_asignadas.join(', ')}</p>}
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
            {displayEstado === 'pendiente' && telefono && (() => {
              const waUrl = getWhatsAppUrl(telefono, code.tipo, code.nombre_destino, code.codigo, code.email);
              if (!waUrl) return null;
              return (
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs w-full">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    WhatsApp
                  </Button>
                </a>
              );
            })()}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm(`¿Eliminar permanentemente esta invitación para ${code.email}?`)) onDelete(code.id);
              }}
              className="text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Borrar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminAccessCodes() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [filter, setFilter] = useState("pendiente");
  // Tab inicial desde la URL (?tab=bandeja|codigos|seguridad) — usado por notificaciones push
  const initialTab = React.useMemo(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      return ['bandeja', 'codigos', 'seguridad'].includes(t) ? t : 'bandeja';
    } catch { return 'bandeja'; }
  }, []);
  const [searchTerm, setSearchTerm] = useState("");
  const [resendingId, setResendingId] = useState(null);
  const [bulkResending, setBulkResending] = useState(false);
  const [clearingAlerts, setClearingAlerts] = useState(false);
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

  // Solicitudes públicas (tienen teléfono) — para enriquecer datos de usuarios atascados
  const { data: accessRequests = [] } = useQuery({
    queryKey: ['accessRequestsForPhones'],
    queryFn: () => base44.entities.AccessRequest.list('-created_date', 500),
    staleTime: 60000,
  });

  // Jugadores activos (tienen teléfono del tutor) — backup para buscar contacto
  const { data: playersForPhones = [] } = useQuery({
    queryKey: ['playersForPhones'],
    queryFn: () => base44.entities.Player.filter({ activo: true }),
    staleTime: 60000,
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

  // Verificar si ya tienen un código pendiente + enriquecer con teléfono
  const stuckUsersWithStatus = stuckUsers.map(u => {
    const emailLower = u.email?.toLowerCase();
    const existingCode = accessCodes.find(c => c.email?.toLowerCase() === emailLower && c.estado === 'pendiente');
    // Buscar teléfono: 1º en AccessRequest, 2º en Player (email_padre / email_tutor_2)
    const req = accessRequests.find(r => r.email?.toLowerCase() === emailLower);
    const player = !req?.telefono ? playersForPhones.find(p =>
      p.email_padre?.toLowerCase() === emailLower || p.email_tutor_2?.toLowerCase() === emailLower
    ) : null;
    const telefono = req?.telefono || player?.telefono || player?.telefono_tutor_2 || '';
    return { ...u, existingCode, telefono };
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

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.AccessCode.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accessCodes'] });
      toast.success('Invitación eliminada');
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

  // Mapa email → teléfono para enriquecer CodeCards con botón WhatsApp
  const phoneByEmail = React.useMemo(() => {
    const map = {};
    accessRequests.forEach(r => {
      if (r.email && r.telefono) map[r.email.toLowerCase()] = r.telefono;
    });
    playersForPhones.forEach(p => {
      if (p.email_padre && p.telefono && !map[p.email_padre.toLowerCase()]) map[p.email_padre.toLowerCase()] = p.telefono;
      if (p.email_tutor_2 && p.telefono_tutor_2 && !map[p.email_tutor_2.toLowerCase()]) map[p.email_tutor_2.toLowerCase()] = p.telefono_tutor_2;
      // Acceso juvenil: si el menor dio su teléfono, usarlo para WhatsApp
      if (p.acceso_menor_email && p.acceso_menor_telefono && !map[p.acceso_menor_email.toLowerCase()]) map[p.acceso_menor_email.toLowerCase()] = p.acceso_menor_telefono;
    });
    return map;
  }, [accessRequests, playersForPhones]);

  // Contadores para los badges de las pestañas
  const bandejaCount = stuckUsersWithStatus.length;
  const seguridadCount = securityAlerts.length + unauthorizedScreenVisits.length;

  return (
    <div className="container mx-auto px-3 pt-4 pb-3 lg:p-6 max-w-5xl">
      {/* Header compacto */}
      <div className="mb-4">
        <h1 className="text-xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <span>🔑</span>
          <span>Códigos de Acceso</span>
        </h1>
        <p className="text-xs lg:text-sm text-slate-500 mt-0.5">Genera y gestiona los códigos de invitación al club</p>
      </div>

      {/* Acciones — grid responsive */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 h-auto py-2 flex flex-col items-center gap-0.5 text-[11px] lg:text-sm lg:flex-row lg:gap-2"
          size="sm"
        >
          <UserPlus className="w-4 h-4" />
          <span className="leading-tight">Nueva</span>
        </Button>
        <Button
          onClick={() => setBulkOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 h-auto py-2 flex flex-col items-center gap-0.5 text-[11px] lg:text-sm lg:flex-row lg:gap-2"
          size="sm"
        >
          <Zap className="w-4 h-4" />
          <span className="leading-tight">Masiva</span>
        </Button>
        <Button
          variant="outline"
          onClick={handleBulkResend}
          disabled={bulkResending || counts.pendiente === 0}
          className="h-auto py-2 flex flex-col items-center gap-0.5 text-[11px] lg:text-sm lg:flex-row lg:gap-2"
          size="sm"
        >
          {bulkResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="leading-tight">Reenviar ({counts.pendiente})</span>
        </Button>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6 h-auto">
          <TabsTrigger value="bandeja" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
            <span className="flex items-center gap-1.5">📥 <span className="hidden sm:inline">Bandeja</span><span className="sm:hidden">Bandeja</span></span>
            {bandejaCount > 0 && (
              <Badge className="bg-amber-500 text-white text-[10px] h-5 px-1.5">{bandejaCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="codigos" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
            <span className="flex items-center gap-1.5">🔑 <span>Códigos</span></span>
            <Badge variant="outline" className="text-[10px] h-5 px-1.5">{counts.total}</Badge>
          </TabsTrigger>
          <TabsTrigger value="seguridad" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-3">
            <span className="flex items-center gap-1.5">🛡️ <span>Seguridad</span></span>
            {seguridadCount > 0 && (
              <Badge className="bg-red-500 text-white text-[10px] h-5 px-1.5">{seguridadCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bandeja">
          <BandejaTab
            stuckUsersWithStatus={stuckUsersWithStatus}
            accessCodes={accessCodes}
            generateMutation={generateMutation}
            resendMutation={resendMutation}
          />
        </TabsContent>

        <TabsContent value="codigos">
          <CodigosTab
            counts={counts}
            filter={filter}
            setFilter={setFilter}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filtered={filtered}
            isLoading={isLoading}
            CodeCard={CodeCard}
            resendMutation={resendMutation}
            cancelMutation={cancelMutation}
            deleteMutation={deleteMutation}
            resendingId={resendingId}
            phoneByEmail={phoneByEmail}
          />
        </TabsContent>

        <TabsContent value="seguridad">
          <SeguridadTab
            securityAlerts={securityAlerts}
            unauthorizedScreenVisits={unauthorizedScreenVisits}
            accessAttempts={accessAttempts}
            accessCodes={accessCodes}
            allUsers={allUsers}
            generateMutation={generateMutation}
            resendMutation={resendMutation}
          />
        </TabsContent>
      </Tabs>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={(data) => generateMutation.mutateAsync(data)}
      />

      <BulkInviteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        existingCodes={accessCodes}
        onBulkGenerate={() => queryClient.invalidateQueries({ queryKey: ['accessCodes'] })}
      />
    </div>
  );
}