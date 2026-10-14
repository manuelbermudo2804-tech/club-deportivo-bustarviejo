import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { descargarContratoPdf } from "@/components/contratos/contratoPdf";

// Lista de documentos firmados por el usuario actual. "ocultarVacio" para no mostrar nada si no hay.
export default function MisFirmadosLista({ ocultarVacio = false }) {
  const [busy, setBusy] = useState(null);
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["misDocumentosFirmados"],
    queryFn: async () => {
      const me = await base44.auth.me();
      return base44.entities.ContratoVoluntariado.filter({ entrenador_email: me.email, estado: "firmado" }, "-firma_fecha");
    },
  });
  const descargar = async (c) => { setBusy(c.id); await descargarContratoPdf(c); setBusy(null); };

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin mx-auto" />;
  if (docs.length === 0) return ocultarVacio ? null : <p className="text-sm text-slate-500 text-center py-6">Todavía no has firmado ningún documento.</p>;
  return (
    <div className="space-y-3">
      {docs.map((c) => (
        <article key={c.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:border-orange-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{c.titulo}</p>
            <p className="text-xs text-slate-500">{c.jugador_nombre ? `${c.jugador_nombre} · ` : ""}Firmado {new Date(c.firma_fecha).toLocaleString("es-ES")}</p>
          </div>
          <Button variant="outline" onClick={() => descargar(c)} disabled={busy === c.id}>
            {busy === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} PDF
          </Button>
        </div>
      ))}
    </div>
  );
}