import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, Mail } from "lucide-react";
import { toast } from "sonner";

import DiagnosticHealthBar from "../components/diagnostic/DiagnosticHealthBar";
import DiagnosticSummary from "../components/diagnostic/DiagnosticSummary";
import DiagnosticFindings from "../components/diagnostic/DiagnosticFindings";
import DiagnosticStats from "../components/diagnostic/DiagnosticStats";
import PublicPageStats from "../components/admin/PublicPageStats";

export default function AppAnalytics() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin';

  const runDiagnostic = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('runDiagnostic', {});
      setResult(response.data);
    } catch (e) {
      console.error('Diagnostic error:', e);
      setError(e.message || 'Error ejecutando diagnóstico');
    } finally {
      setIsRunning(false);
    }
  };

  const sendByEmail = async () => {
    if (!result) return;
    try {
      const findingsText = result.findings.map(f => 
        `[${f.severity.toUpperCase()}] ${f.module}: ${f.title}\n  → ${f.description}\n  → Acción: ${f.action}`
      ).join('\n\n');

      await base44.integrations.Core.SendEmail({
        to: user.email,
        subject: `🔬 Diagnóstico CD Bustarviejo — Salud: ${result.healthScore}/100`,
        body: `<h2>Diagnóstico del Club — ${new Date(result.timestamp).toLocaleString('es-ES')}</h2>
<h3>Puntuación de Salud: ${result.healthScore}/100</h3>
<p>🔴 ${result.summary.critical} críticos | 🟠 ${result.summary.high} altos | 🟡 ${result.summary.medium} medios | 🟢 ${result.summary.low} info</p>
<hr>
<h3>Resumen Ejecutivo</h3>
<p>${(result.aiSummary || '').replace(/\n/g, '<br>')}</p>
<hr>
<h3>Hallazgos Detallados (${result.findings.length})</h3>
<pre style="font-size:12px;white-space:pre-wrap;">${findingsText}</pre>`
      });
      toast.success('Informe enviado por email');
    } catch (e) {
      toast.error('Error enviando email');
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">❌ Acceso Restringido</h1>
          <p className="text-red-800">Solo los administradores pueden acceder al diagnóstico</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 lg:p-8 text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
              Centro de Diagnóstico
            </h1>
            <p className="text-slate-400 mt-1 text-sm lg:text-base">
              Motor inteligente que analiza toda la app y detecta problemas reales
            </p>
          </div>
          <div className="flex gap-2">
            {result && (
              <Button
                variant="outline"
                onClick={sendByEmail}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar por email
              </Button>
            )}
            <Button
              onClick={runDiagnostic}
              disabled={isRunning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  {result ? 'Ejecutar de nuevo' : 'Ejecutar Diagnóstico'}
                </>
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div className="mt-6">
            <DiagnosticHealthBar score={result.healthScore} summary={result.summary} timestamp={result.timestamp} />
          </div>
        )}
      </div>

      {/* Loading state */}
      {isRunning && (
        <div className="bg-white rounded-2xl border-2 border-slate-200 p-12 text-center">
          <div className="spinner-elegant mx-auto mb-4" style={{ width: 48, height: 48, borderWidth: 4 }} />
          <h3 className="text-xl font-bold text-slate-900">Analizando toda la app...</h3>
          <p className="text-slate-500 mt-2 text-sm">
            Revisando accesos, subidas, pagos, jugadores, socios, convocatorias e integridad de datos
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['🔑 Accesos', '📤 Subidas', '💳 Pagos', '👥 Jugadores', '🎫 Socios', '📋 Convocatorias', '💬 Comunicación', '⚙️ Integridad'].map(m => (
              <span key={m} className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 animate-pulse">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 text-center">
          <p className="text-red-800 font-bold">Error: {error}</p>
          <Button onClick={runDiagnostic} className="mt-3" variant="outline">Reintentar</Button>
        </div>
      )}

      {/* Visitas a páginas públicas — siempre visible */}
      <PublicPageStats />

      {/* No result yet */}
      {!result && !isRunning && !error && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">Diagnóstico bajo demanda</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
            Pulsa "Ejecutar Diagnóstico" para analizar accesos, subidas, pagos, fichas de jugadores, socios, convocatorias y la integridad general de los datos.
          </p>
          <Button onClick={runDiagnostic} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-3">
            <Activity className="w-5 h-5 mr-2" />
            Ejecutar Diagnóstico
          </Button>
        </div>
      )}

      {/* Results */}
      {result && !isRunning && (
        <div className="space-y-6">
          <DiagnosticSummary aiSummary={result.aiSummary} />
          <DiagnosticStats stats={result.stats} />
          <DiagnosticFindings findings={result.findings} />
        </div>
      )}
    </div>
  );
}