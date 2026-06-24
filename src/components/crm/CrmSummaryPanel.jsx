import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Building2, Handshake, TrendingUp, Euro, RefreshCw, AlertTriangle } from "lucide-react";
import { getSponsorAlert, fmtEuro } from "./crmConfig";

// Panel resumen estratégico del estado de patrocinio del club.
export default function CrmSummaryPanel({ sponsors = [] }) {
  const stats = useMemo(() => {
    const activos = sponsors.filter(s => (s.etapa_crm === "ganado") || (!s.etapa_crm && s.activo));
    const negociacion = sponsors.filter(s => ["reunion", "propuesta", "negociacion"].includes(s.etapa_crm));
    const sinContactar = sponsors.filter(s => s.etapa_crm === "prospecto");

    const comprometido = activos.reduce((sum, s) => sum + (s.precio_anual || 0), 0);
    const potencial = negociacion.reduce((sum, s) => sum + (s.importe_potencial || s.precio_anual || 0), 0);

    let renovaciones = 0;
    let sinSeguimiento = 0;
    sponsors.forEach(s => {
      const alert = getSponsorAlert(s);
      if (!alert) return;
      if (alert.tipo === "renovacion" || alert.tipo === "vencido") renovaciones++;
      if (alert.tipo === "seguimiento" || alert.tipo === "sin_contacto") sinSeguimiento++;
    });

    return {
      activos: activos.length,
      negociacion: negociacion.length,
      sinContactar: sinContactar.length,
      comprometido,
      potencial,
      renovaciones,
      sinSeguimiento,
    };
  }, [sponsors]);

  const cards = [
    { label: "Patrocinadores activos", value: stats.activos, icon: Building2, color: "text-green-600", bg: "bg-green-50" },
    { label: "En negociación", value: stats.negociacion, icon: Handshake, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Sin contactar", value: stats.sinContactar, icon: TrendingUp, color: "text-slate-600", bg: "bg-slate-100" },
    { label: "€ Comprometidos", value: fmtEuro(stats.comprometido), icon: Euro, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "€ Potencial pipeline", value: fmtEuro(stats.potencial), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Renovaciones (60 días)", value: stats.renovaciones, icon: RefreshCw, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Necesitan seguimiento", value: stats.sinSeguimiento, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <Card className="p-4 lg:p-5 bg-gradient-to-br from-slate-900 to-slate-800 border-0">
      <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
        📊 Estado de patrocinio del club
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl p-3 flex flex-col">
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${c.color}`} />
              </div>
              <span className="text-xl font-bold text-slate-900 leading-tight">{c.value}</span>
              <span className="text-[11px] text-slate-500 leading-tight mt-0.5">{c.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}