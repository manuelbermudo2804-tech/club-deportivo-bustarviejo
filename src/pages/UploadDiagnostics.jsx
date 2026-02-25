import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Trash2, ChevronDown, ChevronUp, Smartphone, Wifi, Clock, User, FileText, AlertCircle, CheckCircle2, MousePointer, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const EVENT_ICONS = {
  button_click: { icon: MousePointer, color: "text-blue-600", bg: "bg-blue-50", label: "Botón pulsado" },
  input_change: { icon: ArrowRightLeft, color: "text-purple-600", bg: "bg-purple-50", label: "Input cambió" },
  upload_start: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Subida iniciada" },
  upload_success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Éxito" },
  upload_error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Error" },
  validation_reject: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", label: "Rechazado" },
  diagnostic_report: { icon: FileText, color: "text-cyan-600", bg: "bg-cyan-50", label: "Reporte manual" },
};

function EventRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_ICONS[event.event_type] || EVENT_ICONS.upload_error;
  const Icon = config.icon;
  const isError = event.event_type === 'upload_error' || event.event_type === 'validation_reject';
  const isSuccess = event.event_type === 'upload_success';

  return (
    <div className={`border rounded-xl p-3 ${isError ? 'border-red-200 bg-red-50/30' : isSuccess ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
      <div className="flex items-start gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{config.label}</Badge>
            {event.context && <span className="text-xs text-slate-500 truncate">{event.context}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{event.user_email}</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{event.device || '?'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.created_date ? format(new Date(event.created_date), "dd/MM HH:mm:ss", { locale: es }) : '?'}</span>
          </div>
          {event.file_name && (
            <div className="text-xs text-slate-600 mt-1">
              📄 {event.file_name} {event.file_size ? `(${Math.round(event.file_size / 1024)}KB)` : ''} {event.file_type ? `· ${event.file_type}` : ''}
            </div>
          )}
          {event.error_message && (
            <div className="text-xs text-red-600 mt-1 font-medium">⚠️ {event.error_message}</div>
          )}
        </div>
        <div className="flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs space-y-1 text-slate-600">
          {event.diagnostic_code && <div><strong>Código:</strong> {event.diagnostic_code}</div>}
          {event.connection && <div><strong>Conexión:</strong> {event.connection}</div>}
          {event.memory_mb && <div><strong>Memoria:</strong> {event.memory_mb}MB</div>}
          {event.is_pwa !== null && <div><strong>PWA:</strong> {event.is_pwa ? 'Sí' : 'No'}</div>}
          {event.session_id && <div><strong>Sesión:</strong> {event.session_id}</div>}
          {event.result_url && <div><strong>URL:</strong> {event.result_url}</div>}
          {event.user_agent && <div className="break-all"><strong>UA:</strong> {event.user_agent}</div>}
          {event.extra_data && (
            <details className="mt-1">
              <summary className="cursor-pointer text-blue-600">Datos extra</summary>
              <pre className="mt-1 bg-slate-100 p-2 rounded text-[10px] overflow-auto max-h-40">
                {JSON.stringify(event.extra_data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadDiagnostics() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [limit, setLimit] = useState(50);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['upload-diagnostics'],
    queryFn: () => base44.entities.UploadDiagnostic.list('-created_date', 200),
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    let result = events;
    if (filterType !== 'all') result = result.filter(e => e.event_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        (e.user_email || '').toLowerCase().includes(q) ||
        (e.file_name || '').toLowerCase().includes(q) ||
        (e.error_message || '').toLowerCase().includes(q) ||
        (e.diagnostic_code || '').toLowerCase().includes(q) ||
        (e.device || '').toLowerCase().includes(q) ||
        (e.context || '').toLowerCase().includes(q)
      );
    }
    return result.slice(0, limit);
  }, [events, filterType, search, limit]);

  // Stats
  const stats = useMemo(() => {
    const total = events.length;
    const errors = events.filter(e => e.event_type === 'upload_error').length;
    const successes = events.filter(e => e.event_type === 'upload_success').length;
    const uniqueUsers = new Set(events.map(e => e.user_email)).size;
    const reports = events.filter(e => e.event_type === 'diagnostic_report').length;
    return { total, errors, successes, uniqueUsers, reports };
  }, [events]);

  const handleClearAll = async () => {
    if (!confirm(`¿Borrar los ${events.length} registros? Esta acción no se puede deshacer.`)) return;
    for (const e of events) {
      try { await base44.entities.UploadDiagnostic.delete(e.id); } catch {}
    }
    refetch();
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📸 Diagnóstico de Subidas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
          {events.length > 0 && (
            <Button variant="outline" size="sm" className="text-red-600" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-1" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-slate-500">Total eventos</div>
        </CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.successes}</div>
          <div className="text-xs text-green-600">Éxitos</div>
        </CardContent></Card>
        <Card className="border-red-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          <div className="text-xs text-red-600">Errores</div>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
          <div className="text-xs text-slate-500">Usuarios</div>
        </CardContent></Card>
        <Card className="border-cyan-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-cyan-600">{stats.reports}</div>
          <div className="text-xs text-cyan-600">Reportes</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar email, archivo, error, código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los eventos</SelectItem>
            <SelectItem value="button_click">Botón pulsado</SelectItem>
            <SelectItem value="input_change">Input cambió</SelectItem>
            <SelectItem value="upload_start">Subida iniciada</SelectItem>
            <SelectItem value="upload_success">Éxito</SelectItem>
            <SelectItem value="upload_error">Error</SelectItem>
            <SelectItem value="validation_reject">Rechazado</SelectItem>
            <SelectItem value="diagnostic_report">Reporte manual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando eventos...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">No hay eventos de subida registrados</p>
          <p className="text-sm mt-1">Los eventos aparecerán aquí cuando los usuarios suban fotos o documentos</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(event => <EventRow key={event.id} event={event} />)}
          {filtered.length >= limit && (
            <Button variant="outline" className="w-full" onClick={() => setLimit(l => l + 50)}>
              Cargar más...
            </Button>
          )}
        </div>
      )}
    </div>
  );
}