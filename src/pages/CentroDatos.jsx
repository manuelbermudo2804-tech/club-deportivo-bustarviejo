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
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-orange-600" /> Centro de Datos
        </h1>
        <p className="text-sm text-slate-500 mt-1">Todos los datos del club en un solo sitio.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="resumen" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Resumen</TabsTrigger>
          <TabsTrigger value="crecimiento" className="gap-1.5"><MapPin className="w-4 h-4" /> Crecimiento</TabsTrigger>
          <TabsTrigger value="clubia" className="gap-1.5"><Brain className="w-4 h-4" /> Club IA</TabsTrigger>
          <TabsTrigger value="app" className="gap-1.5"><Activity className="w-4 h-4" /> Uso de la app</TabsTrigger>
          <TabsTrigger value="salud" className="gap-1.5"><HeartPulse className="w-4 h-4" /> Salud del sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <JuntaKPIDashboard />
        </TabsContent>
        <TabsContent value="crecimiento" className="mt-2">
          <Suspense fallback={<Loading />}>{tab === "crecimiento" && <GrowthMap />}</Suspense>
        </TabsContent>
        <TabsContent value="clubia" className="mt-2">
          <Suspense fallback={<Loading />}>{tab === "clubia" && <ClubIA />}</Suspense>
        </TabsContent>
        <TabsContent value="app" className="mt-2">
          <Suspense fallback={<Loading />}>{tab === "app" && <AppAnalytics />}</Suspense>
        </TabsContent>
        <TabsContent value="salud" className="mt-2">
          <Suspense fallback={<Loading />}>{tab === "salud" && <HealthCheck />}</Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}