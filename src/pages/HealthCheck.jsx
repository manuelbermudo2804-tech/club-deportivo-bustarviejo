import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2, AlertTriangle, XCircle, Info, RefreshCw, Loader2,
  ChevronDown, ChevronUp, HeartPulse, ShieldCheck
} from "lucide-react";

const SEV = {
  error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Error" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Aviso" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Info" },
};

function CheckRow({ check }) {
  const [open, setOpen] = useState(false);
  const sev = SEV[check.severidad] || SEV.info;
  const Icon = check.ok ? CheckCircle2 : sev.icon;
  const hasItems = check.items && check.items.length > 0;

  return (
    <div className={`rounded-xl border ${check.ok ? "border-green-200 bg-green-50/50" : `${sev.border} ${sev.bg}`} overflow-hidden`}>
      <button
        onClick={() => hasItems && setOpen(!open)}
        className={`w-full flex items-start gap-3 p-4 text-left ${hasItems ? "cursor-pointer" : "cursor-default"}`}
      >
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${check.ok ? "text-green-600" : sev.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{check.titulo}</span>
            {!check.ok && (
              <Badge variant="outline" className={`${sev.color} ${sev.border} text-xs`}>
                {sev.label}
              </Badge>
            )}
            {!check.ok && check.total > 0 && (
              <Badge variant="secondary" className="text-xs">{check.total}</Badge>
            )}
          </div>
          <p className="text-sm text-slate-600 mt-1">{check.detalle}</p>
        </div>
        {hasItems && (
          <div className="flex-shrink-0 text-slate-400 mt-1">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </button>
      {open && hasItems && (
        <div className="px-4 pb-4 pt-0">
          <div className="bg-white rounded-lg border border-slate-200 p-3 max-h-64 overflow-auto">
            <ul className="space-y-1 text-sm text-slate-700">
              {check.items.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            {check.total > check.items.length && (
              <p className="text-xs text-slate-400 mt-2">…y {check.total - check.items.length} más</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HealthCheck() {
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["healthCheck"],
    queryFn: async () => {
      const res = await base44.functions.invoke("healthCheck", {});
      return res.data;
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const estado = data?.estado;
  const resumen = data?.resumen;

  const estadoConfig = {
    ok: { icon: ShieldCheck, color: "text-green-600", bg: "from-green-500 to-emerald-600", titulo: "Todo en orden", sub: "No hay problemas de configuración detectados." },
    warning: { icon: AlertTriangle, color: "text-amber-600", bg: "from-amber-500 to-orange-600", titulo: "Hay avisos", sub: "Algunas cosas conviene revisarlas." },
    error: { icon: XCircle, color: "text-red-600", bg: "from-red-500 to-rose-600", titulo: "Hay problemas", sub: "Hay errores que deberías corregir." },
  };
  const ec = estadoConfig[estado] || estadoConfig.ok;
  const EstadoIcon = ec.icon;

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel de Salud</h1>
            <p className="text-sm text-slate-500">Revisa la configuración de tu club de un vistazo</p>
          </div>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching} variant="outline" className="gap-2">
          {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Volver a comprobar
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      )}

      {error && (
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            No se pudo cargar el panel de salud. Inténtalo de nuevo.
          </AlertDescription>
        </Alert>
      )}

      {data && (
        <>
          {/* Resumen general */}
          <Card className={`border-none shadow-lg overflow-hidden`}>
            <div className={`bg-gradient-to-r ${ec.bg} p-6 text-white flex items-center gap-4`}>
              <EstadoIcon className="w-10 h-10 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-bold">{ec.titulo}</h2>
                <p className="text-white/90 text-sm">{ec.sub}</p>
              </div>
              <div className="flex gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold">{resumen?.errores ?? 0}</div>
                  <div className="text-xs text-white/80">Errores</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{resumen?.avisos ?? 0}</div>
                  <div className="text-xs text-white/80">Avisos</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Lista de comprobaciones */}
          <div className="space-y-3">
            {/* Primero los que tienen problemas, luego los OK */}
            {[...data.checks].sort((a, b) => (a.ok === b.ok ? 0 : a.ok ? 1 : -1)).map((check) => (
              <CheckRow key={check.id} check={check} />
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Última comprobación: {data.generado ? new Date(data.generado).toLocaleString("es-ES") : "—"}
          </p>
        </>
      )}
    </div>
  );
}