import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ShieldCheck, ShieldAlert, ShieldX, Search, ChevronDown, ChevronUp, 
  CheckCircle2, XCircle, Clock, AlertTriangle, UserCheck, UserX, Eye
} from "lucide-react";

const STATUS_CONFIG = {
  authorized: { label: "✅ Autorizado", bg: "bg-green-50 border-green-300", text: "text-green-800", badgeBg: "bg-green-100 text-green-800" },
  pending: { label: "⏳ Pendiente", bg: "bg-yellow-50 border-yellow-300", text: "text-yellow-800", badgeBg: "bg-yellow-100 text-yellow-800" },
  expired: { label: "⌛ Expirado", bg: "bg-orange-50 border-orange-300", text: "text-orange-800", badgeBg: "bg-orange-100 text-orange-800" },
  cancelled: { label: "🚫 Cancelado", bg: "bg-slate-50 border-slate-300", text: "text-slate-600", badgeBg: "bg-slate-100 text-slate-700" },
  intruder: { label: "🚨 Sin invitación", bg: "bg-red-50 border-red-400", text: "text-red-800", badgeBg: "bg-red-100 text-red-800" },
};

function AuditRow({ person, expanded, onToggle }) {
  const config = STATUS_CONFIG[person.status] || STATUS_CONFIG.intruder;
  
  return (
    <div className={`border rounded-xl overflow-hidden ${config.bg}`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-black/5 transition-colors"
      >
        <div className="flex-shrink-0">
          {person.status === 'authorized' && <ShieldCheck className="w-5 h-5 text-green-600" />}
          {person.status === 'pending' && <Clock className="w-5 h-5 text-yellow-600" />}
          {person.status === 'expired' && <AlertTriangle className="w-5 h-5 text-orange-600" />}
          {person.status === 'cancelled' && <ShieldX className="w-5 h-5 text-slate-500" />}
          {person.status === 'intruder' && <ShieldAlert className="w-5 h-5 text-red-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-sm ${config.text}`}>{person.nombre || person.email}</span>
            <Badge className={`text-[10px] ${config.badgeBg}`}>{config.label}</Badge>
            {person.tipo && <Badge variant="outline" className="text-[10px]">{person.tipoLabel}</Badge>}
          </div>
          <p className="text-xs text-slate-500 truncate">{person.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {person.hasAttempts && (
            <Badge className={`text-[10px] ${person.failedAttempts > 0 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {person.totalAttempts} intento{person.totalAttempts !== 1 ? 's' : ''}
              {person.failedAttempts > 0 && ` (${person.failedAttempts} fallido${person.failedAttempts !== 1 ? 's' : ''})`}
            </Badge>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-3 border-t border-black/10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {/* Columna: Código enviado */}
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" /> Código de Invitación
              </p>
              {person.code ? (
                <div className="space-y-1 text-xs text-slate-600">
                  <p>🔑 <span className="font-mono font-bold text-orange-600">{person.code.codigo}</span></p>
                  <p>📧 Enviado a: {person.code.email}</p>
                  <p>📅 Fecha envío: {new Date(person.code.fecha_envio || person.code.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  <p>📌 Estado: <span className="font-semibold">{person.code.estado}</span></p>
                  {person.code.fecha_uso && <p>✅ Usado: {new Date(person.code.fecha_uso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
                  {person.code.reenvios > 0 && <p>🔄 Reenvíos: {person.code.reenvios}</p>}
                  {person.code.jugador_nombre && <p>⚽ Jugador: {person.code.jugador_nombre}</p>}
                  {person.code.invitado_por_nombre && <p>👤 Invitado por: {person.code.invitado_por_nombre}</p>}
                </div>
              ) : (
                <p className="text-xs text-red-600 font-semibold">❌ No se le ha enviado ningún código</p>
              )}
            </div>
            
            {/* Columna: Intentos de acceso */}
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Actividad de Acceso
              </p>
              {person.attempts.length > 0 ? (
                <div className="space-y-1.5 text-xs max-h-40 overflow-y-auto">
                  {person.attempts.slice(0, 10).map((a, i) => (
                    <div key={i} className={`flex items-center gap-2 py-1 px-2 rounded ${a.exitoso ? 'bg-green-50' : 'bg-red-50'}`}>
                      {a.exitoso ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /> : <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      <span className="flex-1 truncate">
                        {a.motivo_fallo === 'pantalla_acceso' ? 'Visitó pantalla' : 
                         a.motivo_fallo === 'bloqueado' ? '🔒 Bloqueado' :
                         a.motivo_fallo === 'email_incorrecto' ? '📧 Email incorrecto' :
                         a.motivo_fallo === 'codigo_invalido' ? '🔑 Código inválido' :
                         a.motivo_fallo === 'codigo_expirado' ? '⌛ Código expirado' :
                         a.exitoso ? '✅ Validado correctamente' :
                         a.motivo_fallo || 'Intento fallido'}
                      </span>
                      <span className="text-slate-400 text-[10px] flex-shrink-0">
                        {new Date(a.created_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {person.attempts.length > 10 && (
                    <p className="text-slate-400 text-[10px] text-center">y {person.attempts.length - 10} más...</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sin actividad registrada</p>
              )}
            </div>
          </div>
          
          {/* Veredicto */}
          <div className={`mt-3 rounded-lg p-2.5 text-xs font-medium ${
            person.status === 'authorized' ? 'bg-green-100 text-green-800' :
            person.status === 'intruder' ? 'bg-red-100 text-red-800' :
            person.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            'bg-slate-100 text-slate-700'
          }`}>
            {person.status === 'authorized' && '✅ Todo correcto — este usuario recibió código, lo usó y tiene acceso legítimo.'}
            {person.status === 'pending' && '⏳ Código enviado pero aún no utilizado. El usuario puede necesitar ayuda.'}
            {person.status === 'expired' && '⌛ El código expiró sin ser usado. Puedes reenviar uno nuevo.'}
            {person.status === 'cancelled' && '🚫 La invitación fue cancelada. No tiene acceso.'}
            {person.status === 'intruder' && '🚨 ATENCIÓN: Este usuario está intentando acceder SIN haber recibido invitación. Posible acceso fraudulento.'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AccessAuditPanel({ accessCodes, accessAttempts, allUsers }) {
  const [search, setSearch] = useState("");
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const auditData = useMemo(() => {
    const emailMap = {};

    const tipoLabels = {
      padre_nuevo: "👨‍👩‍👧 Padre Nuevo",
      segundo_progenitor: "👥 2º Progenitor",
      juvenil: "⚽ Juvenil",
      jugador_adulto: "🏃 Jugador +18",
      entrenador: "🏃‍♂️ Entrenador",
      coordinador: "📋 Coordinador",
    };

    // 1. Add everyone who has a code
    for (const code of accessCodes) {
      const email = code.email?.toLowerCase();
      if (!email) continue;
      const isExpired = code.fecha_expiracion && new Date(code.fecha_expiracion) < new Date();
      let status;
      if (code.estado === 'usado') status = 'authorized';
      else if (code.estado === 'cancelado') status = 'cancelled';
      else if (isExpired) status = 'expired';
      else status = 'pending';

      // If already exists, keep the "best" status (authorized > pending > expired > cancelled)
      const priority = { authorized: 4, pending: 3, expired: 2, cancelled: 1, intruder: 0 };
      if (!emailMap[email] || priority[status] > priority[emailMap[email].status]) {
        emailMap[email] = {
          email,
          nombre: code.nombre_destino || allUsers.find(u => u.email?.toLowerCase() === email)?.full_name || '',
          status,
          tipo: code.tipo,
          tipoLabel: tipoLabels[code.tipo] || code.tipo,
          code,
          attempts: [],
          hasAttempts: false,
          totalAttempts: 0,
          failedAttempts: 0,
        };
      }
    }

    // 2. Add attempt data
    for (const attempt of accessAttempts) {
      const email = attempt.user_email?.toLowerCase();
      if (!email) continue;
      
      if (!emailMap[email]) {
        // Person has attempts but NO code → intruder
        emailMap[email] = {
          email,
          nombre: allUsers.find(u => u.email?.toLowerCase() === email)?.full_name || '',
          status: 'intruder',
          tipo: null,
          tipoLabel: '',
          code: null,
          attempts: [],
          hasAttempts: true,
          totalAttempts: 0,
          failedAttempts: 0,
        };
      }
      
      emailMap[email].attempts.push(attempt);
      emailMap[email].hasAttempts = true;
      emailMap[email].totalAttempts++;
      if (!attempt.exitoso && attempt.motivo_fallo !== 'pantalla_acceso') {
        emailMap[email].failedAttempts++;
      }
    }

    // Sort attempts within each person (newest first)
    for (const entry of Object.values(emailMap)) {
      entry.attempts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    }

    return Object.values(emailMap);
  }, [accessCodes, accessAttempts, allUsers]);

  // Filter and search
  const filteredData = useMemo(() => {
    return auditData
      .filter(p => {
        if (filterStatus !== 'all' && p.status !== filterStatus) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return p.email.includes(q) || p.nombre?.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        // intruders first, then pending, then expired, then authorized, then cancelled
        const order = { intruder: 0, pending: 1, expired: 2, authorized: 3, cancelled: 4 };
        return (order[a.status] ?? 5) - (order[b.status] ?? 5);
      });
  }, [auditData, filterStatus, search]);

  // Counts
  const counts = useMemo(() => {
    const c = { authorized: 0, pending: 0, expired: 0, cancelled: 0, intruder: 0 };
    auditData.forEach(p => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [auditData]);

  return (
    <Card className="mb-6 border-2 border-indigo-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          🔍 Auditoría: Códigos Enviados vs Intentos de Acceso
        </CardTitle>
        <p className="text-sm text-slate-600 mt-1">
          Comparativa completa de todas las personas con invitación y todos los que intentan entrar
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary cards */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {[
            { key: 'authorized', label: 'Autorizados', count: counts.authorized, color: 'bg-green-50 border-green-200 text-green-700' },
            { key: 'pending', label: 'Pendientes', count: counts.pending, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
            { key: 'expired', label: 'Expirados', count: counts.expired, color: 'bg-orange-50 border-orange-200 text-orange-700' },
            { key: 'cancelled', label: 'Cancelados', count: counts.cancelled, color: 'bg-slate-50 border-slate-200 text-slate-600' },
            { key: 'intruder', label: 'Sin invitación', count: counts.intruder, color: 'bg-red-50 border-red-300 text-red-700' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
              className={`rounded-xl p-2.5 border text-center transition-all ${s.color} ${filterStatus === s.key ? 'ring-2 ring-indigo-400 scale-105' : 'hover:scale-102'}`}
            >
              <p className="text-xl font-bold">{s.count}</p>
              <p className="text-[10px] font-medium leading-tight">{s.label}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o nombre..."
            className="pl-10"
          />
        </div>

        {filterStatus !== 'all' && (
          <div className="mb-3 flex items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-800">
              Filtro: {STATUS_CONFIG[filterStatus]?.label}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')} className="text-xs h-6">
              Quitar filtro
            </Button>
          </div>
        )}

        {/* List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filteredData.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">No hay registros {filterStatus !== 'all' ? 'con ese filtro' : ''}</p>
            </div>
          ) : (
            filteredData.map(person => (
              <AuditRow
                key={person.email}
                person={person}
                expanded={expandedEmail === person.email}
                onToggle={() => setExpandedEmail(expandedEmail === person.email ? null : person.email)}
              />
            ))
          )}
        </div>

        <div className="mt-3 text-[11px] text-slate-400 text-center">
          Mostrando {filteredData.length} de {auditData.length} registros
        </div>
      </CardContent>
    </Card>
  );
}