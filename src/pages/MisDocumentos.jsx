import React from "react";
import MisFirmadosLista from "@/components/contratos/MisFirmadosLista";
import { FileText } from "lucide-react";

// Cada persona ve y descarga los documentos que ha firmado con el club
export default function MisDocumentos() {
  return (
    <main className="mx-auto box-border w-full min-w-0 max-w-[1100px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:space-y-6 sm:px-5 lg:px-8 lg:pt-7">
      <header className="relative isolate overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-950/30 sm:h-14 sm:w-14">
            <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Club Deportivo Bustarviejo</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Mis documentos</h1>
            <p className="mt-2 text-sm text-slate-300">Retoma los documentos pendientes de firma y consulta o descarga los que ya has firmado con el club.</p>
          </div>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
        <MisFirmadosLista />
      </section>
    </main>
  );
}