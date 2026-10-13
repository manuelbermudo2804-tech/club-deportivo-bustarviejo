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
    <div className="diag-center p-3 sm:p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 p-5 sm:p-7 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-orange-500/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center ring-1 ring-white/20 flex-shrink-0">
            <Microscope className="w-6 h-6 sm:w-7 sm:h-7 text-orange-300" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Centro de Diagnóstico</h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">Registros, altas, instalaciones, subidas y errores de la app en tiempo real</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="publico" className="w-full">
        <div className="sticky top-[100px] lg:top-0 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-1 bg-slate-50/90 backdrop-blur">
          <TabsList className="flex w-full justify-start overflow-x-auto no-scrollbar h-auto p-1.5 gap-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}
                className="flex-shrink-0 lg:flex-1 rounded-xl px-3.5 py-2 text-sm text-slate-600 data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow">
                <Icon className="w-4 h-4 mr-1.5" /> {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TABS.map(({ value, el }) => (
          <TabsContent key={value} value={value} className="mt-4">{el}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
}