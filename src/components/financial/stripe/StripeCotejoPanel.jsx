import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import StripeDescuadres from "./StripeDescuadres";
import StripeComisiones from "./StripeComisiones";

export default function StripeCotejoPanel() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["stripeCotejo"],
    queryFn: async () => (await base44.functions.invoke("stripeCotejo", {})).data,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return <div className="flex items-center gap-2 py-12 justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /> Consultando Stripe...</div>;
  }

  if (!data || data.error) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-slate-600">No se han podido cargar los datos de Stripe{data?.error ? `: ${data.error}` : "."}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {data.desde ? `Desde el ${data.desde}` : "Todo el historial"}: <b>{data.total_cobros}</b> cobros en Stripe, <b>{data.cuadrados}</b> pagos cuadrados.
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Actualizar
        </Button>
      </div>
      <StripeDescuadres descuadres={data.descuadres} sinVincular={data.sin_vincular} onChange={refetch} />
      <StripeComisiones meses={data.comisiones} />
    </div>
  );
}