import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, User, Smartphone, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Pestaña enfocada SOLO en los eventos del formulario público de solicitud
 * de acceso (/SolicitarAcceso). Filtra por context que empieza por
 * "PublicAccessRequest". Útil para entender por qué la gente no completa
 * el formulario (qué validación falla, en qué momento abandonan, etc.)
 */
export default function RegistroPublicoTab() {
  const { data: events = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["public-access-events"],
    queryFn: async () => {
      // Trae los últimos eventos de error de la app y filtra los del registro público
      const items = await base44.entities.UploadDiagnostic.filter(
        { event_type: "app_error" }, "-created_date", 300
      );
      return items.filter(e => (e.context || "").startsWith("PublicAccessRequest"));
    },
    refetchInterval: 20000,
    staleTime: 0,
  });

  // Agrupa por motivo para ver de un vistazo cuál falla más
  const motivos = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      const accion = e.extra_data?.accion || e.error_message || "desconocido";
      map.set(accion, (map.get(accion) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  const stats = useMemo(() => {
    const total = events.length;
    const fallos = events.filter(e => (e.extra_data?.accion || "").includes("validation_failed")).length;
    const intentos = events.filter(e => (e.extra_data?.accion || "") === "submit_attempt").length;
    const exitos = events.filter(e => (e.extra_data?.accion || "") === "submit_success").length;
    return { total, fallos, intentos, exitos };
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-slate-600">
          Eventos del formulario público <code className="text-xs bg-slate-100 px-1 rounded">/SolicitarAcceso</code>. Muestra qué intenta hacer la gente y por qué no completa.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-slate-500">Total eventos</div>
        </CardContent></Card>
        <Card className="border-blue-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.intentos}</div>
          <div className="text-xs text-blue-600">Intentos envío</div>
        </CardContent></Card>
        <Card className="border-orange-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.fallos}</div>
          <div className="text-xs text-orange-600">Validación falló</div>
        </CardContent></Card>
        <Card className="border-green-200"><CardContent className="p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.exitos}</div>
          <div className="text-xs text-green-600">Enviados OK</div>
        </CardContent></Card>
      </div>

      {/* Top motivos */}
      {motivos.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 text-sm">📊 ¿Qué pasa más?</h3>
            <div className="space-y-1">
              {motivos.slice(0, 8).map(([motivo, count]) => (
                <div key={motivo} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{motivo}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de eventos */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400">Cargando eventos...</div>
      ) : events.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p className="text-lg">📭 Aún no hay eventos registrados</p>
          <p className="text-sm mt-1">Aparecerán aquí cuando la gente use el formulario de /SolicitarAcceso</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {events.slice(0, 100).map(evt => {
            const accion = evt.extra_data?.accion || "evento";
            const isError = accion.includes("error") || accion.includes("failed");
            const isSuccess = accion === "submit_success";
            const color = isSuccess ? "border-green-200 bg-green-50/40"
                       : isError ? "border-red-200 bg-red-50/40"
                       : "border-slate-200 bg-white";
            return (
              <div key={evt.id} className={`border rounded-xl p-3 ${color}`}>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white flex-shrink-0">
                    <AlertTriangle className={`w-4 h-4 ${isSuccess ? "text-green-600" : isError ? "text-red-600" : "text-slate-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{accion}</Badge>
                      {evt.extra_data?.motivo && (
                        <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                          {evt.extra_data.motivo}
                        </Badge>
                      )}
                    </div>
                    {evt.error_message && evt.error_message !== accion && (
                      <div className="text-sm text-slate-700 mt-1">{evt.error_message}</div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{evt.user_email || "anónimo"}</span>
                      <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" />{evt.device || "?"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {evt.created_date ? format(new Date(evt.created_date), "dd/MM HH:mm:ss", { locale: es }) : "?"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}