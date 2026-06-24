import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Euro, Users, AlertTriangle, Building2, TrendingUp, Crown, Calendar, BarChart3, RefreshCw, Mail } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

export default function SponsorDashboard({ sponsors, onRenew, onNotifyRenewal, renewingId, notifyingId }) {
  const activeSponsors = sponsors.filter(s => s.activo === true);
  const inactiveSponsors = sponsors.filter(s => s.activo === false);

  const totalActiveIncome = activeSponsors.reduce((sum, s) => sum + (s.precio_anual || 0), 0);
  const avgIncome = activeSponsors.length > 0 ? Math.round(totalActiveIncome / activeSponsors.length) : 0;
  const totalClicks = sponsors.reduce((sum, s) => sum + (s.clicks_totales || 0), 0);

  // Reparto por nivel (solo activos)
  const nivelCounts = activeSponsors.reduce((acc, s) => {
    const n = s.nivel_patrocinio || "Colaborador";
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});
  const NIVELES_ORDEN = ["Principal", "Oro", "Plata", "Bronce", "Colaborador"];

  // Vencimientos
  const expiredSponsors = activeSponsors.filter(s => {
    if (!s.fecha_fin) return false;
    return differenceInDays(new Date(s.fecha_fin), new Date()) < 0;
  });
  const expiringSponsors = activeSponsors.filter(s => {
    if (!s.fecha_fin) return false;
    const d = differenceInDays(new Date(s.fecha_fin), new Date());
    return d >= 0 && d <= 30;
  });

  // Lista combinada de avisos (vencidos primero, luego próximos), ordenada por fecha
  const avisos = [...expiredSponsors, ...expiringSponsors].sort(
    (a, b) => new Date(a.fecha_fin) - new Date(b.fecha_fin)
  );

  const kpis = [
    {
      label: "Ingresos Anuales", value: `${totalActiveIncome.toLocaleString('es-ES')}€`,
      icon: Euro, bg: "from-green-50 to-green-100", iconBg: "bg-green-600", text: "text-green-800", sub: "text-green-700"
    },
    {
      label: "Activos en Banner", value: activeSponsors.length,
      icon: Building2, bg: "from-amber-50 to-amber-100", iconBg: "bg-amber-600", text: "text-amber-800", sub: "text-amber-700"
    },
    {
      label: "Media por Patrocinador", value: `${avgIncome.toLocaleString('es-ES')}€`,
      icon: TrendingUp, bg: "from-blue-50 to-blue-100", iconBg: "bg-blue-600", text: "text-blue-800", sub: "text-blue-700"
    },
    {
      label: "Clicks en Banner", value: totalClicks.toLocaleString('es-ES'),
      icon: BarChart3, bg: "from-purple-50 to-purple-100", iconBg: "bg-purple-600", text: "text-purple-800", sub: "text-purple-700"
    },
    {
      label: "Inactivos", value: inactiveSponsors.length,
      icon: Users, bg: "from-slate-50 to-slate-100", iconBg: "bg-slate-600", text: "text-slate-800", sub: "text-slate-700"
    },
    {
      label: "Vencidos / Por vencer", value: `${expiredSponsors.length} / ${expiringSponsors.length}`,
      icon: AlertTriangle,
      bg: avisos.length > 0 ? "from-red-50 to-red-100" : "from-slate-50 to-slate-100",
      iconBg: avisos.length > 0 ? "bg-red-600" : "bg-slate-600",
      text: avisos.length > 0 ? "text-red-800" : "text-slate-800",
      sub: avisos.length > 0 ? "text-red-700" : "text-slate-700"
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <Card key={k.label} className={`border-none shadow-lg bg-gradient-to-br ${k.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 ${k.iconBg} rounded-xl shrink-0`}>
                  <k.icon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${k.sub}`}>{k.label}</p>
                  <p className={`text-2xl font-bold ${k.text} truncate`}>{k.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reparto por nivel */}
      {activeSponsors.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-500" /> Reparto por nivel (activos)
            </h3>
            <div className="flex flex-wrap gap-2">
              {NIVELES_ORDEN.filter(n => nivelCounts[n]).map(n => (
                <Badge key={n} variant="outline" className="text-sm py-1.5 px-3">
                  {n}: <span className="font-bold ml-1">{nivelCounts[n]}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de renovación */}
      {avisos.length > 0 && (
        <Card className="border-none shadow-lg border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <h3 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Alertas de Renovación
            </h3>
            <div className="space-y-2">
              {avisos.map(s => {
                const dias = differenceInDays(new Date(s.fecha_fin), new Date());
                const vencido = dias < 0;
                return (
                  <div key={s.id} className={`flex items-center justify-between p-3 rounded-lg ${vencido ? 'bg-red-100' : 'bg-orange-50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.nombre} className="w-10 h-10 object-contain rounded bg-white p-0.5 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-red-200 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-red-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{s.nombre}</p>
                        <p className="text-xs text-slate-600">{s.nivel_patrocinio} • {(s.precio_anual || 0).toLocaleString('es-ES')}€/año</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                      <div className="text-right">
                        <Badge className={vencido ? "bg-red-600 text-white" : "bg-orange-500 text-white"}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(s.fecha_fin), "d MMM yyyy", { locale: es })}
                        </Badge>
                        <p className={`text-xs mt-1 font-medium ${vencido ? 'text-red-700' : 'text-orange-600'}`}>
                          {vencido ? `Venció hace ${Math.abs(dias)} días` : `Quedan ${dias} días`}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => onRenew?.(s)}
                          disabled={renewingId === s.id}
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${renewingId === s.id ? 'animate-spin' : ''}`} />
                          Renovar 1 año
                        </Button>
                        {s.contacto_email && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => onNotifyRenewal?.(s)}
                            disabled={notifyingId === s.id}
                          >
                            <Mail className={`w-3 h-3 mr-1 ${notifyingId === s.id ? 'animate-pulse' : ''}`} />
                            Avisar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}