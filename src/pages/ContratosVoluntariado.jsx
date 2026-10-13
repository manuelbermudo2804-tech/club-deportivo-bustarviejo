import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2, Loader2, FileSignature } from "lucide-react";
import NuevoContratoForm from "@/components/contratos/NuevoContratoForm";
import FirmaClubConfig from "@/components/contratos/FirmaClubConfig";
import { descargarContratoPdf } from "@/components/contratos/contratoPdf";

export default function ContratosVoluntariado() {
  const [busy, setBusy] = useState(null);
  const { data: contratos = [], isLoading, refetch } = useQuery({
    queryKey: ["contratosVoluntariado"],
    queryFn: () => base44.entities.ContratoVoluntariado.list("-created_date"),
  });

  const descargar = async (c) => { setBusy(c.id); await descargarContratoPdf(c); setBusy(null); };
  const borrar = async (c) => {
    if (!confirm(`¿Borrar el acuerdo de ${c.entrenador_nombre}?`)) return;
    await base44.entities.ContratoVoluntariado.delete(c.id);
    refetch();
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
            <FileSignature className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Gestión documental · Club Deportivo Bustarviejo</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Documentos para firmar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Gestiona los acuerdos, configura la firma del club y consulta el estado de cada documento.</p>
          </div>
        </div>
      </section>
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
          <FirmaClubConfig />
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
          <NuevoContratoForm onCreated={refetch} />
        </div>
      </div>
      <section className="min-w-0 space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900">Acuerdos y estado de firma</h2>
          <p className="text-sm text-slate-500">{contratos.length} documento{contratos.length === 1 ? "" : "s"}</p>
        </div>
        {isLoading && <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-10"><Loader2 className="h-6 w-6 animate-spin text-orange-600" /></div>}
        {!isLoading && contratos.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center"><FileSignature className="mx-auto mb-3 h-8 w-8 text-slate-400" /><p className="font-semibold text-slate-800">Aún no hay acuerdos</p><p className="mt-1 text-sm text-slate-500">Cuando crees un documento aparecerá aquí para consultar su estado o descargarlo.</p></div>}
        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          {contratos.map((c) => (
            <div key={c.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:p-4">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><FileSignature className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{c.entrenador_nombre}</p>
                  <p className="mt-0.5 break-words text-sm text-slate-600">{c.titulo}</p>
                  {c.firma_fecha && <p className="mt-1 text-xs text-slate-500">Firmado {new Date(c.firma_fecha).toLocaleString("es-ES")}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <Badge className={c.estado === "firmado" ? "bg-green-600 text-white" : "bg-amber-500 text-white"}>{c.estado === "firmado" ? "Firmado" : "Pendiente"}</Badge>
                <Button size="icon" variant="outline" aria-label="Descargar documento" onClick={() => descargar(c)} disabled={busy === c.id}>
                  {busy === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" aria-label="Eliminar documento" onClick={() => borrar(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}