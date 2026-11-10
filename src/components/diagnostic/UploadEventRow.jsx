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
      <div role="button" tabIndex={0} className="w-full text-left flex items-start gap-3 p-3 sm:p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
...
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
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