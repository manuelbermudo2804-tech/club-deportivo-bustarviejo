import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Users, TrendingDown, TrendingUp, CalendarCheck, Clock } from "lucide-react";

function formatCurrency(n) {
  try { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n || 0); } catch { return `${n?.toFixed?.(2) || 0} €`; }
}

export default function JuntaKPIDashboard({ incidencias = [] }) {
  // Pagos últimos 500
  const { data: payments = [] } = useQuery({
    queryKey: ['payments-for-junta'],
    queryFn: () => base44.entities.Payment.list('-updated_date', 500),
    initialData: []
  });

  // Asistencias últimas 200
  const { data: attendances = [] } = useQuery({
    queryKey: ['attendance-for-junta'],
    queryFn: () => base44.entities.Attendance.list('-fecha', 200),
    initialData: []
  });

  // MOROSIDAD
  const { morososCount, importePendiente } = useMemo(() => {
    const pending = payments.filter(p => p.estado !== 'Pagado' && p.estado !== 'Anulado');
    return {
      morososCount: pending.length,
      importePendiente: pending.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0)
    };
  }, [payments]);

  // ASISTENCIA (30 días y 7 días)
  const { asistencia30d, asistencia7d } = useMemo(() => {
    const now = new Date();
    const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    const calcRate = (records, fromDate) => {
      const recent = records.filter(r => {
        if (!r.fecha) return false;
        const f = new Date(r.fecha);
        return f >= fromDate;
      });
      let total = 0, present = 0;
      recent.forEach(r => {
        (r.asistencias || []).forEach(a => {
          total += 1;
          if (a.estado === 'presente') present += 1;
        });
      });
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;
      return rate;
    };

    return {
      asistencia30d: calcRate(attendances, daysAgo(30)),
      asistencia7d: calcRate(attendances, daysAgo(7))
    };
  }, [attendances]);

  // INCIDENCIAS + SLA
  const { abiertas, vencidasSLA, proximasVencer } = useMemo(() => {
    const SLA_HOURS = { Alta: 48, Media: 120, Baja: 240 }; // 2d, 5d, 10d
    const isOpen = (i) => i.estado === 'Abierta' || i.estado === 'En curso';
    const open = incidencias.filter(isOpen);

    const now = Date.now();
    let overdue = 0; let near = 0;
    open.forEach(i => {
      const created = new Date(i.created_date).getTime();
      const thresholdH = SLA_HOURS[i.prioridad] || 120;
      const elapsedH = (now - created) / (1000 * 60 * 60);
      if (elapsedH > thresholdH) overdue += 1;
      else if (thresholdH - elapsedH <= 12) near += 1; // a 12h de vencer
    });

    return { abiertas: open.length, vencidasSLA: overdue, proximasVencer: near };
  }, [incidencias]);

  // RESUMEN SEMANAL
  const resumen = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const nuevasInc = incidencias.filter(i => new Date(i.created_date) >= weekAgo).length;
    const resueltasInc = incidencias.filter(i => i.estado === 'Resuelta' && (i.fecha_resolucion ? new Date(i.fecha_resolucion) : new Date(i.updated_date)) >= weekAgo).length;

    const pagosOk = payments.filter(p => p.estado === 'Pagado' && new Date(p.updated_date) >= weekAgo).length;
    const pagosNuevosPend = payments.filter(p => p.estado !== 'Pagado' && new Date(p.created_date) >= weekAgo).length;

    return { nuevasInc, resueltasInc, pagosOk, pagosNuevosPend };
  }, [incidencias, payments]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border bg-white/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Morosidad</p>
              {morososCount > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-green-600" />}
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(importePendiente)}</div>
            <p className="text-xs text-slate-500">{morososCount} pagos pendientes</p>
          </CardContent>
        </Card>

        <Card className="border bg-white/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Asistencia 30 días</p>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-slate-900">{asistencia30d}%</div>
              <Badge variant="outline" className="text-xs">7d: {asistencia7d}%</Badge>
            </div>
            <div className="mt-2">
              <Progress value={asistencia30d} />
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Incidencias abiertas</p>
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{abiertas}</div>
            <div className="text-xs text-slate-600 mt-1 flex gap-2">
              <Badge className="bg-red-500">SLA vencidas: {vencidasSLA}</Badge>
              <Badge variant="outline">Próx. 12h: {proximasVencer}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white/90">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">Resumen semanal</p>
              <CalendarCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 rounded p-2">
                <p className="text-slate-500">Inc. nuevas</p>
                <p className="font-bold">{resumen.nuevasInc}</p>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <p className="text-slate-500">Inc. resueltas</p>
                <p className="font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> {resumen.resueltasInc}</p>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <p className="text-slate-500">Pagos ok</p>
                <p className="font-bold">{resumen.pagosOk}</p>
              </div>
              <div className="bg-slate-50 rounded p-2">
                <p className="text-slate-500">Nuevos pendientes</p>
                <p className="font-bold">{resumen.pagosNuevosPend}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-slate-500 flex items-center gap-2">
        <Clock className="w-3 h-3" /> Datos agregados (últ. 500 pagos, 200 asistencias, SLA: Alta 48h / Media 5d / Baja 10d)
      </div>
    </div>
  );
}