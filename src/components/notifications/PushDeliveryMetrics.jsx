import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2, XCircle, Clock, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

function detectDevice(ua = '') {
  const l = ua.toLowerCase();
  if (l.includes('iphone') || l.includes('ipad')) return 'iOS';
  if (l.includes('android')) return 'Android';
  if (l.includes('windows')) return 'Windows';
  if (l.includes('mac')) return 'Mac';
  return 'Otro';
}

export default function PushDeliveryMetrics() {
  const { data: deliveries = [], isLoading, refetch } = useQuery({
    queryKey: ['push-deliveries'],
    queryFn: () => base44.entities.PushDelivery.list('-sent_at', 500),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const stats = useMemo(() => {
    if (deliveries.length === 0) {
      return null;
    }

    const total = deliveries.length;
    const delivered = deliveries.filter(d => d.delivered).length;
    const withError = deliveries.filter(d => d.send_error).length;
    const pending = total - delivered - withError;
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    // Latencias
    const latencies = deliveries
      .filter(d => typeof d.latency_ms === 'number' && d.latency_ms >= 0)
      .map(d => d.latency_ms)
      .sort((a, b) => a - b);

    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
      : null;
    const medianLatency = latencies.length > 0
      ? latencies[Math.floor(latencies.length / 2)]
      : null;
    const p95Latency = latencies.length > 0
      ? latencies[Math.floor(latencies.length * 0.95)]
      : null;

    // Por dispositivo
    const byDevice = {};
    deliveries.forEach(d => {
      const dev = detectDevice(d.user_agent);
      if (!byDevice[dev]) byDevice[dev] = { total: 0, delivered: 0 };
      byDevice[dev].total += 1;
      if (d.delivered) byDevice[dev].delivered += 1;
    });
    const deviceRows = Object.entries(byDevice)
      .map(([dev, v]) => ({
        dev,
        total: v.total,
        delivered: v.delivered,
        rate: v.total > 0 ? Math.round((v.delivered / v.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);

    // Últimas 20 entregas
    const recent = deliveries.slice(0, 20);

    return { total, delivered, withError, pending, deliveryRate, avgLatency, medianLatency, p95Latency, deviceRows, recent };
  }, [deliveries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">Cargando métricas de entrega…</CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Entrega real de push (enviadas vs recibidas)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Aún no hay datos de entrega. Las próximas notificaciones enviadas se registrarán automáticamente.
            La métrica compara push enviadas desde el servidor contra las que el Service Worker confirma recibir.
          </p>
        </CardContent>
      </Card>
    );
  }

  const rateColor = stats.deliveryRate >= 80 ? 'text-green-600' : stats.deliveryRate >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-600" />
          Entrega real (enviadas vs recibidas por el SW)
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">Últimas 500 push registradas · se actualiza cada 30s</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border">
            <div className="flex items-center gap-2 text-slate-600 text-xs">
              <Send className="w-3.5 h-3.5" /> Enviadas
            </div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 text-green-700 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> Recibidas
            </div>
            <div className="text-2xl font-bold text-green-700">{stats.delivered}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-700 text-xs">
              <Clock className="w-3.5 h-3.5" /> Pendientes / perdidas
            </div>
            <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
            {stats.withError > 0 && (
              <div className="text-xs text-red-600 mt-0.5">{stats.withError} con error de envío</div>
            )}
          </div>
          <div className={`p-3 rounded-lg border ${stats.deliveryRate >= 80 ? 'bg-green-50 border-green-200' : stats.deliveryRate >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
            <div className="text-xs text-slate-600">Tasa de entrega</div>
            <div className={`text-2xl font-bold ${rateColor}`}>{stats.deliveryRate}%</div>
          </div>
        </div>

        {/* Latencias */}
        {stats.avgLatency !== null && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="text-xs text-indigo-700">Latencia media</div>
              <div className="text-lg font-bold text-indigo-700">{(stats.avgLatency / 1000).toFixed(1)}s</div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="text-xs text-indigo-700">Mediana</div>
              <div className="text-lg font-bold text-indigo-700">{(stats.medianLatency / 1000).toFixed(1)}s</div>
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <div className="text-xs text-indigo-700">P95 (peor caso)</div>
              <div className="text-lg font-bold text-indigo-700">{(stats.p95Latency / 1000).toFixed(1)}s</div>
            </div>
          </div>
        )}

        {/* Por dispositivo */}
        {stats.deviceRows.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-slate-700 mb-2">Tasa por dispositivo</div>
            <div className="space-y-1.5">
              {stats.deviceRows.map(row => (
                <div key={row.dev} className="flex items-center gap-3 text-sm">
                  <div className="w-20 font-medium text-slate-700">{row.dev}</div>
                  <div className="flex-1 bg-slate-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-3 ${row.rate >= 80 ? 'bg-green-500' : row.rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${row.rate}%` }}
                    />
                  </div>
                  <div className="w-28 text-right text-slate-600 text-xs tabular-nums">
                    {row.delivered}/{row.total} · {row.rate}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Últimas entregas */}
        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">Últimas 20 push</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500 border-b">
                  <th className="text-left py-1.5 px-2">Cuándo</th>
                  <th className="text-left py-1.5 px-2">Destinatario</th>
                  <th className="text-left py-1.5 px-2">Origen</th>
                  <th className="text-left py-1.5 px-2">Estado</th>
                  <th className="text-right py-1.5 px-2">Latencia</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map(d => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="py-1.5 px-2 text-slate-600 whitespace-nowrap">
                      {d.sent_at ? formatDistanceToNow(new Date(d.sent_at), { addSuffix: true, locale: es }) : '—'}
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 truncate max-w-[180px]">{d.usuario_email}</td>
                    <td className="py-1.5 px-2 text-slate-500">{d.source || '—'}</td>
                    <td className="py-1.5 px-2">
                      {d.delivered ? (
                        <Badge className="bg-green-100 text-green-700 border-0">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Recibida
                        </Badge>
                      ) : d.send_error ? (
                        <Badge className="bg-red-100 text-red-700 border-0" title={d.send_error}>
                          <XCircle className="w-3 h-3 mr-1" /> Error
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 border-0">
                          <Clock className="w-3 h-3 mr-1" /> Pendiente
                        </Badge>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-600 tabular-nums">
                      {typeof d.latency_ms === 'number' ? `${(d.latency_ms / 1000).toFixed(1)}s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-xs text-slate-500 border-t pt-3">
          <strong>Cómo leerlo:</strong> "Enviadas" = push aceptadas por el push service.
          "Recibidas" = el Service Worker ha confirmado la recepción al servidor.
          La diferencia muestra el efecto real de Doze / suspensión de Chrome en Android.
          Latencia &lt;3s = entrega inmediata, &gt;30s = el SO retrasó la entrega.
        </div>
      </CardContent>
    </Card>
  );
}