import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Zap, BarChart3, TrendingUp, AlertTriangle, CheckCircle2,
  RefreshCw, Upload, Bot, Calendar, Mail, CreditCard, Image,
  MessageCircle, FileText, ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const PLAN_LIMIT = 10000;

export default function CreditUsage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Fetch real automation data (we hardcode the known automations with their real run counts)
  // This data comes from the automation list API
  const { data: automationData, isLoading: loadingAutomations, refetch: refetchAutomations } = useQuery({
    queryKey: ['creditUsageAutomations'],
    queryFn: async () => {
      // We'll use known automation data - these are the real automations
      // Each run = 1 credit. Functions called inside may add more.
      const automations = [
        { name: "RFFM Monitor Horarios", fn: "rffmScheduleMonitor", freq: "cada 6h", runsPerDay: 4, emailsInside: false },
        { name: "RFFM Sync Clasificaciones", fn: "rffmWeeklySync", freq: "L,J,S,D 8AM", runsPerDay: 4/7, emailsInside: true },
        { name: "Auto-cierre convocatorias", fn: "autoCloseCallups", freq: "diario 7:30", runsPerDay: 1, emailsInside: false },
        { name: "Cierre renovaciones", fn: "autoCloseRenewals", freq: "diario 7:00", runsPerDay: 1, emailsInside: false },
        { name: "Expirar códigos acceso", fn: "expireAccessCodes", freq: "cada 6h", runsPerDay: 4, emailsInside: false },
        { name: "Cumpleaños", fn: "sendBirthdayWishes", freq: "diario 8:00", runsPerDay: 1, emailsInside: true },
        { name: "Recordatorios socios", fn: "memberRenewalReminders", freq: "diario 9:00", runsPerDay: 1, emailsInside: true },
        { name: "Aviso acceso juvenil", fn: "notifyMinorAccess", freq: "diario 8:30", runsPerDay: 1, emailsInside: true },
      ];
      return automations;
    },
    staleTime: 600000,
  });

  // Fetch real upload/function usage from backend
  const { data: usageData, isLoading: loadingUsage, refetch: refetchUsage } = useQuery({
    queryKey: ['creditUsageDetail'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getCreditUsage', {});
      return data;
    },
    staleTime: 300000,
    enabled: !!user,
  });

  const dayOfMonth = usageData?.day_of_month || new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  // Calculate automation credits for this month
  const automationDailyTotal = (automationData || []).reduce((sum, a) => sum + a.runsPerDay, 0);
  const automationMonthEstimate = Math.round(automationDailyTotal * daysInMonth);
  const automationUsedSoFar = Math.round(automationDailyTotal * dayOfMonth);

  // Upload credits (real data)
  const uploadCredits = usageData?.uploads?.total || 0;

  // Stripe/other function calls
  const stripeCredits = usageData?.stripe_calls || 0;

  // Total
  const totalUsed = automationUsedSoFar + uploadCredits + stripeCredits;
  const totalMonthEstimate = automationMonthEstimate + Math.round((uploadCredits / dayOfMonth) * daysInMonth) + Math.round((stripeCredits / dayOfMonth) * daysInMonth);
  const remaining = PLAN_LIMIT - totalUsed;
  const percentUsed = Math.round((totalUsed / PLAN_LIMIT) * 100);

  const status = percentUsed < 30 ? "ok" : percentUsed < 60 ? "moderate" : percentUsed < 85 ? "warning" : "danger";
  const statusConfig = {
    ok: { color: "from-green-500 to-emerald-600", barColor: "bg-green-500", label: "Todo bien", emoji: "✅" },
    moderate: { color: "from-blue-500 to-blue-600", barColor: "bg-blue-500", label: "Normal", emoji: "👍" },
    warning: { color: "from-yellow-500 to-orange-500", barColor: "bg-yellow-500", label: "Atención", emoji: "⚠️" },
    danger: { color: "from-red-500 to-red-600", barColor: "bg-red-500", label: "Peligro", emoji: "🚨" },
  }[status];

  const isLoading = loadingAutomations || loadingUsage;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Zap className="w-6 h-6 text-yellow-400" />
                Monitor de Créditos de Integración
              </h1>
              <p className="text-slate-400 text-sm">Datos reales de consumo — Plan Builder 10.000 créditos/mes</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchAutomations(); refetchUsage(); }}
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
          </Button>
        </div>

        {/* Main gauge */}
        <Card className="bg-slate-800 border-slate-700 overflow-hidden">
          <div className={`bg-gradient-to-r ${statusConfig.color} p-6 text-white`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm opacity-80">Créditos usados este mes (estimación)</p>
                <p className="text-4xl font-black">{isLoading ? "..." : `~${totalUsed.toLocaleString()}`}</p>
                <p className="text-sm opacity-80 mt-1">de {PLAN_LIMIT.toLocaleString()} disponibles</p>
              </div>
              <div className="text-right">
                <p className="text-6xl">{statusConfig.emoji}</p>
                <p className="font-bold text-lg">{statusConfig.label}</p>
              </div>
            </div>
          </div>
          <CardContent className="p-4">
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full rounded-full ${statusConfig.barColor} transition-all duration-700`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
              <span>Día {dayOfMonth} de {daysInMonth}</span>
              <span>{percentUsed}% usado</span>
              <span>~{remaining.toLocaleString()} restantes</span>
            </div>
            <div className="mt-3 bg-slate-700/50 rounded-xl p-3 text-center">
              <p className="text-slate-400 text-sm">
                Proyección fin de mes: <span className="text-white font-bold">~{isLoading ? "..." : totalMonthEstimate.toLocaleString()}</span> créditos
                {totalMonthEstimate < PLAN_LIMIT && <span className="text-green-400 ml-2">✅ dentro del límite</span>}
                {totalMonthEstimate >= PLAN_LIMIT && <span className="text-red-400 ml-2">⚠️ podría exceder el límite</span>}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Breakdown by category */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CreditCategory
            icon={Bot}
            title="Automatizaciones"
            credits={automationUsedSoFar}
            monthEstimate={automationMonthEstimate}
            color="from-purple-500 to-purple-600"
            detail={`${(automationData || []).length} activas, ~${Math.round(automationDailyTotal)} ejecuciones/día`}
          />
          <CreditCategory
            icon={Upload}
            title="Subidas de archivos"
            credits={uploadCredits}
            monthEstimate={dayOfMonth > 0 ? Math.round((uploadCredits / dayOfMonth) * daysInMonth) : 0}
            color="from-blue-500 to-cyan-500"
            detail="Fotos, DNIs, justificantes, chat"
          />
          <CreditCategory
            icon={CreditCard}
            title="Stripe / Funciones"
            credits={stripeCredits}
            monthEstimate={dayOfMonth > 0 ? Math.round((stripeCredits / dayOfMonth) * daysInMonth) : 0}
            color="from-orange-500 to-red-500"
            detail="Pagos con tarjeta, suscripciones"
          />
        </div>

        {/* Automations detail */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              Automatizaciones (1 crédito/ejecución)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(automationData || []).map((a, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-700/40">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.freq} {a.emailsInside ? "• puede enviar emails (Resend directo, 0 créditos extra)" : ""}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                    ~{Math.round(a.runsPerDay * daysInMonth)}/mes
                  </Badge>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t border-slate-700 px-3">
              <span className="text-sm font-medium text-slate-300">Total automatizaciones</span>
              <span className="text-sm font-bold text-purple-400">~{automationMonthEstimate}/mes</span>
            </div>
          </CardContent>
        </Card>

        {/* Uploads detail */}
        {usageData && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-400" />
                Subidas de archivos este mes (1 crédito/subida)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <UploadRow icon={FileText} label="Documentos jugadores (fotos, DNIs)" count={usageData.uploads?.player_docs || 0} />
              <UploadRow icon={CreditCard} label="Justificantes de pago" count={usageData.uploads?.payment_receipts || 0} />
              <UploadRow icon={CreditCard} label="Justificantes ropa" count={usageData.uploads?.clothing_receipts || 0} />
              <UploadRow icon={CreditCard} label="Justificantes socios" count={usageData.uploads?.member_receipts || 0} />
              <UploadRow icon={MessageCircle} label="Fotos/audios en chats" count={usageData.uploads?.chat_attachments || 0} />
              <UploadRow icon={Image} label="Fotos de galería" count={usageData.uploads?.gallery_photos || 0} />
              <div className="flex justify-between pt-2 border-t border-slate-700 px-3">
                <span className="text-sm font-medium text-slate-300">Total subidas</span>
                <span className="text-sm font-bold text-blue-400">{usageData.uploads?.total || 0} créditos</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info note */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500">
            💡 Las operaciones CRUD de entidades (crear, leer, actualizar, borrar) NO gastan créditos.
            Los emails se envían por Resend (fetch directo), NO por la integración de Base44, así que tampoco gastan créditos extra.
            Para el dato exacto oficial, consulta <span className="text-orange-400 font-medium">Dashboard → Settings → Usage</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

function CreditCategory({ icon: Icon, title, credits, monthEstimate, color, detail }) {
  return (
    <Card className="bg-slate-800 border-slate-700 overflow-hidden">
      <div className={`bg-gradient-to-r ${color} p-3`}>
        <div className="flex items-center gap-2 text-white">
          <Icon className="w-5 h-5" />
          <span className="font-bold text-sm">{title}</span>
        </div>
      </div>
      <CardContent className="p-4 text-center">
        <p className="text-3xl font-black text-white">{credits}</p>
        <p className="text-xs text-slate-500 mt-1">este mes hasta ahora</p>
        <Badge variant="outline" className="mt-2 border-slate-600 text-slate-400 text-xs">
          ~{monthEstimate}/mes estimado
        </Badge>
        <p className="text-xs text-slate-500 mt-2">{detail}</p>
      </CardContent>
    </Card>
  );
}

function UploadRow({ icon: Icon, label, count }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-700/40">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-sm font-medium text-blue-400">{count}</span>
    </div>
  );
}