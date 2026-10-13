import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Trash2, Activity, CheckCircle2, AlertCircle, Users, FileText, Camera, Loader2 } from "lucide-react";
import UploadEventRow from "./UploadEventRow";
import DiagMetric from "./DiagMetric";

export default function UploadsTab() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [limit, setLimit] = useState(50);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['upload-diagnostics'],
    queryFn: async () => {
      const types = ['button_click', 'input_change', 'upload_start', 'upload_success', 'upload_error', 'validation_reject', 'diagnostic_report'];
      const results = await Promise.all(
        types.map(t => base44.entities.UploadDiagnostic.filter({ event_type: t }, '-created_date', 50))
      );
      return results.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 200);
    },
    refetchInterval: 15000,
  });

  const filtered = useMemo(() => {
    let result = events;
    if (filterType !== 'all') result = result.filter(e => e.event_type === filterType);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e =>
        ['user_email', 'file_name', 'error_message', 'diagnostic_code', 'device', 'context'].some(k => (e[k] || '').toLowerCase().includes(q))
      );
    }
    return result.slice(0, limit);
  }, [events, filterType, search, limit]);

  const stats = useMemo(() => ({
    total: events.length,
    errors: events.filter(e => e.event_type === 'upload_error').length,
    successes: events.filter(e => e.event_type === 'upload_success').length,
    uniqueUsers: new Set(events.map(e => e.user_email)).size,
    reports: events.filter(e => e.event_type === 'diagnostic_report').length,
  }), [events]);

  const handleClearAll = async () => {
    if (!confirm(`¿Borrar los ${events.length} registros? Esta acción no se puede deshacer.`)) return;
    for (const e of events) {
      try { await base44.entities.UploadDiagnostic.delete(e.id); } catch {}
    }
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-600 flex-1 min-w-[200px]">Seguimiento de fotos y documentos subidos por los usuarios. Se actualiza cada 15 s.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-1" /> Actualizar</Button>
          {events.length > 0 && (
            <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={handleClearAll}><Trash2 className="w-4 h-4 mr-1" /> Limpiar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <DiagMetric icon={Activity} label="Total eventos" value={stats.total} tone="slate" />
        <DiagMetric icon={CheckCircle2} label="Éxitos" value={stats.successes} tone="green" />
        <DiagMetric icon={AlertCircle} label="Errores" value={stats.errors} tone="red" />
        <DiagMetric icon={Users} label="Usuarios" value={stats.uniqueUsers} tone="blue" />
        <DiagMetric icon={FileText} label="Reportes" value={stats.reports} tone="cyan" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar email, archivo, error, código..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 border-0 bg-slate-50 focus-visible:ring-1" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-52 border-0 bg-slate-50"><SelectValue /></SelectTrigger>
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

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400"><Loader2 className="w-5 h-5 animate-spin" /> Cargando eventos...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-14 px-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Camera className="w-7 h-7 text-slate-400" /></div>
          <p className="font-semibold text-slate-700">No hay eventos de subida registrados</p>
          <p className="text-sm text-slate-500 mt-1">Aparecerán aquí cuando los usuarios suban fotos o documentos</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(event => <UploadEventRow key={event.id} event={event} />)}
          {filtered.length >= limit && (
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setLimit(l => l + 50)}>Cargar más</Button>
          )}
        </div>
      )}
    </div>
  );
}