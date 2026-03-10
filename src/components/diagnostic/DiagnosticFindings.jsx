import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Filter } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { label: 'CRÍTICO', color: 'bg-red-600 text-white', border: 'border-l-red-600', bg: 'bg-red-50', emoji: '🔴' },
  high: { label: 'ALTO', color: 'bg-orange-500 text-white', border: 'border-l-orange-500', bg: 'bg-orange-50', emoji: '🟠' },
  medium: { label: 'MEDIO', color: 'bg-yellow-500 text-white', border: 'border-l-yellow-500', bg: 'bg-yellow-50', emoji: '🟡' },
  low: { label: 'INFO', color: 'bg-blue-500 text-white', border: 'border-l-blue-500', bg: 'bg-blue-50', emoji: '🟢' },
};

const MODULE_LABELS = {
  accesos: '🔑 Accesos',
  subidas: '📤 Subidas',
  pagos: '💳 Pagos',
  jugadores: '👥 Jugadores',
  socios: '🎫 Socios',
  convocatorias: '📋 Convocatorias',
  comunicacion: '💬 Comunicación',
  integridad: '⚙️ Integridad',
};

function FindingRow({ finding }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.low;

  return (
    <div className={`border-l-4 ${sev.border} ${sev.bg} rounded-lg p-4 transition-all`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className={sev.color + ' text-[10px] px-1.5 py-0'}>{sev.label}</Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{MODULE_LABELS[finding.module] || finding.module}</Badge>
          </div>
          <h4 className="font-bold text-slate-900 text-sm">{finding.title}</h4>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{finding.description}</p>
          {finding.action && (
            <div className="mt-2 px-2 py-1.5 bg-white/70 rounded border border-slate-200 text-xs text-slate-700">
              💡 <strong>Acción:</strong> {finding.action}
            </div>
          )}
        </div>
        {finding.affected && finding.affected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0 h-8 w-8 p-0"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {expanded && finding.affected && finding.affected.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-semibold">
            Afectados ({finding.affected.length})
          </p>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {finding.affected.map((item, idx) => (
              <div key={idx} className="flex flex-wrap gap-x-4 gap-y-0.5 bg-white/50 rounded px-2 py-1 text-xs">
                {Object.entries(item).map(([key, val]) => (
                  <span key={key} className="text-slate-600">
                    <span className="font-medium text-slate-800">{key}:</span> {String(val)}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiagnosticFindings({ findings }) {
  const [filterModule, setFilterModule] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  if (!findings || findings.length === 0) {
    return (
      <Card className="border-2 border-emerald-200 bg-emerald-50">
        <CardContent className="p-8 text-center">
          <span className="text-5xl">✅</span>
          <h3 className="text-xl font-bold text-emerald-800 mt-3">¡Todo en orden!</h3>
          <p className="text-emerald-600 text-sm mt-1">No se detectaron problemas significativos</p>
        </CardContent>
      </Card>
    );
  }

  const modules = [...new Set(findings.map(f => f.module))];
  const filtered = findings
    .filter(f => filterModule === 'all' || f.module === filterModule)
    .filter(f => filterSeverity === 'all' || f.severity === filterSeverity);

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Hallazgos Detallados ({findings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm" variant={filterSeverity === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterSeverity('all')}
              className="h-7 text-xs"
            >Todos</Button>
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
              <Button
                key={key} size="sm"
                variant={filterSeverity === key ? 'default' : 'outline'}
                onClick={() => setFilterSeverity(key)}
                className="h-7 text-xs"
              >{cfg.emoji} {cfg.label}</Button>
            ))}
          </div>
          <div className="w-px bg-slate-200 mx-1" />
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm" variant={filterModule === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterModule('all')}
              className="h-7 text-xs"
            >Todos</Button>
            {modules.map(m => (
              <Button
                key={m} size="sm"
                variant={filterModule === m ? 'default' : 'outline'}
                onClick={() => setFilterModule(m)}
                className="h-7 text-xs"
              >{MODULE_LABELS[m] || m}</Button>
            ))}
          </div>
        </div>

        {/* Findings list */}
        <div className="space-y-3">
          {filtered.map((finding, idx) => (
            <FindingRow key={idx} finding={finding} />
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 py-6 text-sm">No hay hallazgos con estos filtros</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}