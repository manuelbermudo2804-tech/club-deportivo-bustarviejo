import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, RefreshCw, Zap, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

const PLAN_LIMIT = 10000;

// Automations with their estimated credit cost per execution
// 1 credit per execution + extra if the function calls integrations internally
const AUTOMATIONS = [
  { name: "RFFM Monitor Horarios", freq: "cada 6h", perDay: 4, extraCredits: 0 },
  { name: "RFFM Sync Clasificaciones", freq: "L,J,S,D", perDay: 4/7, extraCredits: 0 },
  { name: "Auto-cierre convocatorias", freq: "diario", perDay: 1, extraCredits: 0 },
  { name: "Cierre renovaciones", freq: "diario", perDay: 1, extraCredits: 0 },
  { name: "Expirar códigos acceso", freq: "cada 6h", perDay: 4, extraCredits: 0 },
  { name: "Cumpleaños", freq: "diario", perDay: 1, extraCredits: 0.1 },
  { name: "Recordatorios socios", freq: "diario", perDay: 1, extraCredits: 0.1 },
  { name: "Aviso acceso juvenil", freq: "diario", perDay: 1, extraCredits: 0 },
];

export default function CreditMonitor() {
  const [monthDay, setMonthDay] = useState(1);
  
  useEffect(() => {
    setMonthDay(new Date().getDate());
  }, []);

  const dailyCost = AUTOMATIONS.reduce((sum, a) => sum + a.perDay * (1 + a.extraCredits), 0);
  const monthlyCost = Math.round(dailyCost * 30);
  const usedEstimate = Math.round(dailyCost * monthDay);
  const remaining = PLAN_LIMIT - usedEstimate;
  const percentUsed = Math.round((usedEstimate / PLAN_LIMIT) * 100);

  const status = percentUsed < 50 ? "ok" : percentUsed < 80 ? "warning" : "danger";
  const statusConfig = {
    ok: { color: "from-green-600 to-green-700", icon: CheckCircle2, label: "Consumo bajo", bg: "bg-green-50", border: "border-green-300", text: "text-green-700" },
    warning: { color: "from-yellow-600 to-orange-600", icon: TrendingUp, label: "Consumo moderado", bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-700" },
    danger: { color: "from-red-600 to-red-700", icon: AlertTriangle, label: "Consumo alto", bg: "bg-red-50", border: "border-red-300", text: "text-red-700" },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <Card className="border-2 border-slate-700 shadow-xl overflow-hidden bg-slate-800">
      <div className={`bg-gradient-to-r ${statusConfig.color} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Monitor de Créditos</h3>
              <p className="text-sm opacity-90">Plan Builder: {PLAN_LIMIT.toLocaleString()} créditos/mes</p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 text-base px-3 py-1">
            ~{usedEstimate.toLocaleString()} / {PLAN_LIMIT.toLocaleString()}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Día {monthDay} del mes</span>
            <span className={statusConfig.text}>{percentUsed}% usado</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full bg-gradient-to-r ${statusConfig.color} transition-all duration-500`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">~{remaining.toLocaleString()} restantes</span>
            <span className="text-slate-500">~{monthlyCost}/mes estimado</span>
          </div>
        </div>

        {/* Status indicator */}
        <div className={`${statusConfig.bg} ${statusConfig.border} border rounded-xl p-3 flex items-center gap-2`}>
          <StatusIcon className={`w-5 h-5 flex-shrink-0 ${statusConfig.text}`} />
          <div>
            <p className={`font-medium text-sm ${statusConfig.text}`}>{statusConfig.label}</p>
            <p className="text-xs text-slate-600">
              {status === "ok" && `A este ritmo gastarás ~${monthlyCost} créditos/mes. Te sobran ${(PLAN_LIMIT - monthlyCost).toLocaleString()}.`}
              {status === "warning" && `Atención: a este ritmo podrías acercarte al límite. Revisa las automatizaciones.`}
              {status === "danger" && `⚠️ Riesgo de superar el límite. Considera reducir frecuencias.`}
            </p>
          </div>
        </div>

        {/* Breakdown table */}
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
            <BarChart3 className="w-3 h-3" /> Desglose por automatización
          </p>
          <div className="space-y-1">
            {AUTOMATIONS.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-700/50">
                <span className="text-slate-300">{a.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{a.freq}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-300">
                    ~{Math.round(a.perDay * 30 * (1 + a.extraCredits))}/mes
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-slate-600 text-center">
          Estimación basada en frecuencias configuradas. Los créditos reales pueden variar (emails, subidas de archivo, etc.). Consulta Dashboard → Settings → Usage para el dato exacto.
        </p>
      </CardContent>
    </Card>
  );
}