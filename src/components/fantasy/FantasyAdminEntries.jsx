import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Search, Trash2, Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculateFantasyPoints } from "./calculateFantasyPoints";

export default function FantasyAdminEntries({ entries, config, onRefresh }) {
  const [search, setSearch] = useState("");
  const [calculating, setCalculating] = useState(false);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.nickname?.toLowerCase().includes(q) || e.email?.toLowerCase().includes(q) || e.nombre?.toLowerCase().includes(q);
  });

  const setPaymentStatus = async (entry, status) => {
    try {
      const me = await base44.auth.me();
      await base44.entities.FantasyMundial.update(entry.id, {
        estado_pago: status,
        fecha_pago_verificado: status === 'pagado' ? new Date().toISOString() : null,
        verificado_por: me?.email || '',
      });
      toast.success(`Marcado como ${status}`);
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Error");
    }
  };

  const remove = async (entry) => {
    if (!confirm(`¿Eliminar inscripción de ${entry.nickname}?`)) return;
    try {
      await base44.entities.FantasyMundial.delete(entry.id);
      toast.success("Eliminada");
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Error");
    }
  };

  const recalcAllPoints = async () => {
    if (!config?.campeon_oficial) {
      return toast.error("Primero rellena los resultados oficiales en la pestaña Configuración");
    }
    setCalculating(true);
    try {
      let updated = 0;
      for (const e of entries) {
        const { puntos, aciertos, desglose } = calculateFantasyPoints(e, config);
        await base44.entities.FantasyMundial.update(e.id, {
          puntos_total: puntos,
          predicciones_acertadas: aciertos,
          desglose_puntos: desglose,
        });
        updated++;
      }
      toast.success(`Puntos recalculados para ${updated} participantes`);
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Error");
    } finally {
      setCalculating(false);
    }
  };

  const totales = {
    total: entries.length,
    pagados: entries.filter((e) => e.estado_pago === 'pagado').length,
    pendientes: entries.filter((e) => e.estado_pago === 'pendiente').length,
    bote: entries.filter((e) => e.estado_pago === 'pagado').length * (config?.precio_inscripcion ?? 10),
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total" value={totales.total} color="slate" />
          <Stat label="Pagados" value={totales.pagados} color="emerald" />
          <Stat label="Pendientes" value={totales.pendientes} color="orange" />
          <Stat label="Bote (€)" value={totales.bote} color="indigo" />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nickname, email o nombre..." className="pl-9" />
          </div>
          <Button onClick={recalcAllPoints} disabled={calculating} variant="outline">
            {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Recalcular puntos
          </Button>
        </div>

        <div className="space-y-2">
          {filtered.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{e.nickname}</span>
                  <PaymentBadge status={e.estado_pago} />
                  {e.puntos_total > 0 && <Badge className="bg-indigo-100 text-indigo-800">{e.puntos_total} pts</Badge>}
                </div>
                <div className="text-xs text-slate-600 mt-0.5 truncate">{e.nombre} • {e.email} • {e.telefono}</div>
                <div className="text-xs text-slate-500 mt-1">🏆 {e.campeon} | 🥈 {e.subcampeon} | 👟 {e.maximo_goleador} | ✨ {e.seleccion_sorpresa}</div>
              </div>
              <div className="flex gap-1">
                {e.estado_pago !== 'pagado' && (
                  <Button size="sm" variant="outline" className="text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => setPaymentStatus(e, 'pagado')}>
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
                {e.estado_pago !== 'rechazado' && (
                  <Button size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-50" onClick={() => setPaymentStatus(e, 'rechazado')}>
                    <XCircle className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-slate-700" onClick={() => remove(e)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500">Sin inscripciones</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }) {
  const colors = {
    slate: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-100 text-emerald-700",
    orange: "bg-orange-100 text-orange-700",
    indigo: "bg-indigo-100 text-indigo-700",
  };
  return (
    <div className={`p-3 rounded-xl ${colors[color]}`}>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}

function PaymentBadge({ status }) {
  if (status === 'pagado') return <Badge className="bg-emerald-100 text-emerald-800">✓ Pagado</Badge>;
  if (status === 'rechazado') return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
  return <Badge className="bg-orange-100 text-orange-800">Pendiente</Badge>;
}