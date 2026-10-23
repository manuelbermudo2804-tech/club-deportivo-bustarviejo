import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Panel de LIMPIEZA de pruebas del pago por adelantado (solo administradores).
 * Lista las inscripciones creadas con el botón "🧪 Saltar pago (prueba)" y permite borrar cada una
 * con su jugador y sus pagos. Si no hay pruebas, el panel no se muestra.
 * El borrado lo hace el servidor (función prepagoInscripcion, acción limpiar_prueba), que solo
 * acepta prepagos marcados como prueba.
 */
export default function PruebasPagoAdelantadoPanel() {
  const qc = useQueryClient();

  const { data: pruebas = [], isLoading } = useQuery({
    queryKey: ["prepagosPrueba"],
    queryFn: () => base44.entities.PrepagoInscripcion.filter({ es_prueba: true }, "-created_date", 100),
    staleTime: 30000,
  });

  const borrar = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke("prepagoInscripcion", { action: "limpiar_prueba", prepago_id: id });
      return res?.data || res;
    },
    onSuccess: (d) => {
      toast.success(
        d?.jugador_borrado
          ? `Prueba borrada: jugador y ${d.pagos_borrados} pagos eliminados`
          : "Registro de prueba borrado"
      );
      qc.invalidateQueries();
    },
    onError: (e) => {
      toast.error(e?.response?.data?.error || e?.message || "No se pudo borrar la prueba");
    },
  });

  if (isLoading || pruebas.length === 0) return null;

  const confirmarBorrado = (p) => {
    const detalle = p.jugador_id
      ? "Se borrarán el jugador de prueba, sus pagos y el registro del prepago."
      : "Se borrará el registro del prepago (no llegó a crearse ningún jugador).";
    if (window.confirm(`¿Borrar la prueba de "${p.jugador_nombre || "sin nombre"}" (${p.categoria})?\n\n${detalle}`)) {
      borrar.mutate(p.id);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/60 shadow-sm">
      <CardHeader className="border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <FlaskConical className="h-5 w-5" />
          Pruebas de pago por adelantado ({pruebas.length})
        </CardTitle>
        <p className="text-xs text-amber-800">
          Inscripciones creadas saltando Stripe. Bórralas cuando termines de probar para que no cuenten como jugadores
          ni como pagos reales. No se deshacen correos ya enviados ni otros registros relacionados (por ejemplo, el de
          socio, si se creó).
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:p-4">
        {pruebas.map((p) => (
          <div
            key={p.id}
            className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-slate-900">
                {p.jugador_nombre || "Sin nombre"} · {p.categoria}
              </p>
              <p className="text-xs text-slate-600">
                {p.tipo_pago === "Único" ? "Pago único" : "Tres plazos"} · {p.temporada} ·{" "}
                {p.jugador_id ? "con jugador creado" : "sin jugador (inscripción sin terminar)"} · estado: {p.estado}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={borrar.isPending}
              onClick={() => confirmarBorrado(p)}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              {borrar.isPending && borrar.variables === p.id ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1 h-4 w-4" />
              )}
              Borrar prueba
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
