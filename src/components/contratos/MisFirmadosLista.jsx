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
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Download className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="break-words font-semibold leading-snug text-slate-900">{c.titulo}</p>
              {c.jugador_nombre && <p className="mt-1 text-sm text-slate-600">{c.jugador_nombre}</p>}
              <p className="mt-1 text-xs text-slate-500">Firmado el {new Date(c.firma_fecha).toLocaleString("es-ES")}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => descargar(c)} disabled={busy === c.id} className="h-10 w-full shrink-0 rounded-xl border-orange-200 font-semibold text-orange-700 hover:bg-orange-50 hover:text-orange-800 sm:w-auto">
            {busy === c.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Descargar PDF
          </Button>
        </article>
      ))}
    </div>
  );
}