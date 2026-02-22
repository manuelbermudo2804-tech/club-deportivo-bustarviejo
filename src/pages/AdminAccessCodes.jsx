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
import { 
  Mail, UserPlus, Clock, CheckCircle2, XCircle, Loader2, 
  RefreshCw, Search, Send, KeyRound, Users, AlertCircle, Ban
} from "lucide-react";
import { toast } from "sonner";

function InviteDialog({ open, onOpenChange, onInvite }) {
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("padre_nuevo");
  const [mensaje, setMensaje] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await onInvite({ email: email.trim(), nombre_destino: nombre.trim(), tipo, mensaje_personalizado: mensaje.trim() });
      setEmail("");
      setNombre("");
      setMensaje("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" />
            Nueva Invitación
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email del destinatario *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@email.com"
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
          <div>
            <Label>Mensaje personalizado (opcional)</Label>
            <Input
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder="Bienvenido al club..."
            />
          </div>
          <Button type="submit" disabled={loading || !email.trim()} className="w-full bg-orange-600 hover:bg-orange-700">
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
              {code.reenvios > 0 && <p>🔄 Reenvíos: {code.reenvios}</p>}
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
  const queryClient = useQueryClient();

  const { data: accessCodes = [], isLoading } = useQuery({
    queryKey: ['accessCodes'],
    queryFn: () => base44.entities.AccessCode.list('-created_date'),
  });

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
        <Button onClick={() => setInviteOpen(true)} className="bg-orange-600 hover:bg-orange-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Nueva Invitación
        </Button>
      </div>

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