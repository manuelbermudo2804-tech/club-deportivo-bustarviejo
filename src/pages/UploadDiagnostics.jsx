import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Microscope, Camera, Bug, TrendingUp, UserPlus, Download, Globe } from "lucide-react";
import ErrorsTab from "../components/diagnostic/ErrorsTab";
import WizardTab from "../components/diagnostic/WizardTab";
import AltasEnCursoTab from "../components/diagnostic/AltasEnCursoTab";
import PWAAdoptionTab from "../components/diagnostic/PWAAdoptionTab";
import RegistroPublicoTab from "../components/diagnostic/RegistroPublicoTab";
import UploadsTab from "../components/diagnostic/UploadsTab";

const TABS = [
  { value: "publico", label: "Registro Público", icon: Globe, el: <RegistroPublicoTab /> },
  { value: "altas", label: "Altas", icon: UserPlus, el: <AltasEnCursoTab /> },
  { value: "wizard", label: "Wizard", icon: TrendingUp, el: <WizardTab /> },
  { value: "pwa", label: "PWA", icon: Download, el: <PWAAdoptionTab /> },
  { value: "uploads", label: "Subidas", icon: Camera, el: <UploadsTab /> },
  { value: "errors", label: "Errores", icon: Bug, el: <ErrorsTab /> },
];

export default function UploadDiagnostics() {
  return (
    <div className="diag-center mx-auto w-full max-w-[1440px] space-y-5 p-3 sm:p-5 lg:space-y-6 lg:p-7">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner ring-1 ring-white/15 sm:h-14 sm:w-14">
              <Microscope className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Sistema · Monitorización</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
                  Seguimiento activo
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Centro de Diagnóstico</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Control centralizado de registros, altas, instalaciones, subidas y errores de la aplicación.
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">C.D. Bustarviejo</div>
            <div className="mt-1 text-sm font-semibold text-white">Panel técnico</div>
            <div className="mt-0.5 text-xs text-slate-400">Diagnóstico y actividad</div>
          </div>
        </div>
      </section>

      <Tabs defaultValue="publico" className="w-full space-y-4">
        <div className="sticky top-[76px] z-20 -mx-3 bg-slate-50/95 px-3 py-2 backdrop-blur-md sm:top-[88px] sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white/90 sm:p-2 sm:shadow-sm">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-xl bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-6">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/60 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:text-sm"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map(({ value, el }) => (
          <TabsContent key={value} value={value} className="mt-0 min-w-0 focus-visible:outline-none">{el}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
}