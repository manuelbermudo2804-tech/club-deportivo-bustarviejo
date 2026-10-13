import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Smartphone, Clock, User, FileText, AlertCircle, CheckCircle2, MousePointer, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const EVENT_ICONS = {
  button_click: { icon: MousePointer, color: "text-blue-600", bg: "bg-blue-50", label: "Botón pulsado" },
  input_change: { icon: ArrowRightLeft, color: "text-purple-600", bg: "bg-purple-50", label: "Input cambió" },
  upload_start: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Subida iniciada" },
  upload_success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Éxito" },
  upload_error: { icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", label: "Error" },
  validation_reject: { icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50", label: "Rechazado" },
  diagnostic_report: { icon: FileText, color: "text-cyan-600", bg: "bg-cyan-50", label: "Reporte manual" },
};

const Row = ({ label, children }) => (
  <div className="flex gap-2 py-1 border-b border-slate-100 last:border-0">
    <span className="w-20 flex-shrink-0 font-semibold text-slate-500">{label}</span>
    <span className="break-all text-slate-700">{children}</span>
  </div>
);

export default function UploadEventRow({ event }) {
  const [expanded, setExpanded] = useState(false);
  const config = EVENT_ICONS[event.event_type] || EVENT_ICONS.upload_error;
  const Icon = config.icon;
  const isError = event.event_type === 'upload_error' || event.event_type === 'validation_reject';
  const isSuccess = event.event_type === 'upload_success';
  const accent = isError ? 'border-l-red-500' : isSuccess ? 'border-l-green-500' : 'border-l-slate-300';

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 border-l-4 ${accent} shadow-sm hover:shadow-md transition-shadow`}>
      <button type="button" className="w-full text-left flex items-start gap-3 p-3 sm:p-4" onClick={() => setExpanded(!expanded)}>
        <div className={`p-2.5 rounded-xl ${config.bg} flex-shrink-0`}><Icon className={`w-4 h-4 ${config.color}`} /></div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-xs ${config.color} border-current/20`}>{config.label}</Badge>
            {event.context && <span className="text-xs text-slate-500 truncate">{event.context}</span>}
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-500 flex-wrap">
            <span className="flex items-center gap-1 min-w-0 break-all"><User className="w-3 h-3 flex-shrink-0" />{event.user_email}</span>
            <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{event.device || '?'}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.created_date ? format(new Date(event.created_date), "dd/MM HH:mm:ss", { locale: es }) : '?'}</span>
          </div>
          {event.file_name && (
            <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 min-w-0">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{event.file_name} {event.file_size ? `(${Math.round(event.file_size / 1024)}KB)` : ''} {event.file_type ? `· ${event.file_type}` : ''}</span>
            </div>
          )}
          {event.error_message && (
            <div className="text-xs text-red-700 mt-2 font-medium bg-red-50 rounded-lg px-2.5 py-1.5">{event.error_message}</div>
          )}
          {isSuccess && event.result_url && (
            <a href={event.result_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="inline-block mt-2">
              <img src={event.result_url} alt="Subida" className="w-16 h-16 object-cover rounded-xl border border-green-200" onError={e => { e.target.style.display = 'none'; }} />
            </a>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="mx-3 sm:mx-4 mb-3 sm:mb-4 p-3 rounded-xl bg-slate-50 text-xs">
          {event.diagnostic_code && <Row label="Código">{event.diagnostic_code}</Row>}
          {event.connection && <Row label="Conexión">{event.connection}</Row>}
          {event.memory_mb && <Row label="Memoria">{event.memory_mb}MB</Row>}
          {event.is_pwa !== null && <Row label="PWA">{event.is_pwa ? 'Sí' : 'No'}</Row>}
          {event.session_id && <Row label="Sesión">{event.session_id}</Row>}
          {event.result_url && <Row label="URL">{event.result_url}</Row>}
          {event.user_agent && <Row label="UA">{event.user_agent}</Row>}
          {event.extra_data && (
            <details className="mt-2">
              <summary className="cursor-pointer font-semibold text-orange-600">Datos extra</summary>
              <pre className="mt-1 bg-slate-900 text-slate-100 p-3 rounded-lg text-[10px] overflow-auto max-h-40">{JSON.stringify(event.extra_data, null, 2)}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}