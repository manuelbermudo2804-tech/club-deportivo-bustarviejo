import React, { Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BarChart3, MapPin, Brain, Activity, HeartPulse, Loader2 } from "lucide-react";
import JuntaKPIDashboard from "@/components/junta/JuntaKPIDashboard";

const GrowthMap = React.lazy(() => import("./GrowthMap"));
const ClubIA = React.lazy(() => import("./ClubIA"));
const AppAnalytics = React.lazy(() => import("./AppAnalytics"));
const HealthCheck = React.lazy(() => import("./HealthCheck"));

const Loading = () => (
  <div className="flex justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
  </div>
);

export default function CentroDatos() {
  const [tab, setTab] = useState("resumen");

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 p-3 sm:p-5 lg:space-y-6 lg:p-7">
      <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7 lg:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner ring-1 ring-white/15 sm:h-14 sm:w-14">
              <BarChart3 className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Inteligencia · Datos del club</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-300" />
                  Panel de gestión
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">Centro de Datos</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Una visión global del club: actividad, crecimiento, analítica y estado del sistema.
              </p>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">C.D. Bustarviejo</div>
            <div className="mt-1 text-sm font-semibold text-white">Centro de información</div>
            <div className="mt-0.5 text-xs text-slate-400">Indicadores y herramientas</div>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {[
            { label: "Resumen", icon: BarChart3 },
            { label: "Crecimiento", icon: MapPin },
            { label: "Club IA", icon: Brain },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-slate-200 sm:text-sm">
              <Icon className="h-4 w-4 shrink-0 text-orange-300" />
              <span>{label}</span>
            </div>
          ))}
          <div className="col-span-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-xs font-medium text-slate-200 sm:col-span-1 sm:text-sm">
            <Activity className="h-4 w-4 shrink-0 text-orange-300" />
            <span>Uso de la app · Salud del sistema</span>
          </div>
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="w-full space-y-4">
        <div className="sticky top-[76px] z-20 -mx-3 bg-slate-50/95 px-3 py-2 backdrop-blur-md sm:top-[88px] sm:mx-0 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:bg-white/90 sm:p-2 sm:shadow-sm">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-xl bg-transparent p-0 sm:grid-cols-3 lg:grid-cols-5">
            <TabsTrigger value="resumen" className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/60 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:text-sm">
              <BarChart3 className="h-4 w-4 shrink-0" /><span className="truncate">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="crecimiento" className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/60 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:text-sm">
              <MapPin className="h-4 w-4 shrink-0" /><span className="truncate">Crecimiento</span>
            </TabsTrigger>
            <TabsTrigger value="clubia" className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/60 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:text-sm">
              <Brain className="h-4 w-4 shrink-0" /><span className="truncate">Club IA</span>
            </TabsTrigger>
            <TabsTrigger value="app" className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/60 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:text-sm">
              <Activity className="h-4 w-4 shrink-0" /><span className="truncate">Uso de la app</span>
            </TabsTrigger>
            <TabsTrigger value="salud" className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-2 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition-all hover:border-orange-200 hover:bg-orange-50/60 data-[state=active]:border-orange-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md sm:col-span-3 sm:text-sm lg:col-span-1">
              <HeartPulse className="h-4 w-4 shrink-0" /><span className="truncate">Salud del sistema</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumen" className="mt-0 min-w-0 focus-visible:outline-none">
          <JuntaKPIDashboard />
        </TabsContent>
        <TabsContent value="crecimiento" className="mt-0 min-w-0 focus-visible:outline-none">
          <Suspense fallback={<Loading />}>{tab === "crecimiento" && <GrowthMap />}</Suspense>
        </TabsContent>
        <TabsContent value="clubia" className="mt-0 min-w-0 focus-visible:outline-none">
          <Suspense fallback={<Loading />}>{tab === "clubia" && <ClubIA />}</Suspense>
        </TabsContent>
        <TabsContent value="app" className="mt-0 min-w-0 focus-visible:outline-none">
          <Suspense fallback={<Loading />}>{tab === "app" && <AppAnalytics />}</Suspense>
        </TabsContent>
        <TabsContent value="salud" className="mt-0 min-w-0 focus-visible:outline-none">
          <Suspense fallback={<Loading />}>{tab === "salud" && <HealthCheck />}</Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}