import React from "react";
import PWAInstallGuide from "../components/pwa/PWAInstallGuide";

export default function InstallGuidePreview() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Vista previa: Guía de instalación</h1>
        <p className="text-slate-600 mb-6">Previsualiza la guía con imágenes tal y como la verá el usuario en el onboarding.</p>
      </div>
      <PWAInstallGuide variant="embedded" onComplete={() => { alert("Simulación: 'Ya la tengo instalada'"); }} onClose={() => { alert("Simulación: Cerrar"); }} />
      <div className="max-w-5xl mx-auto px-4 py-6 text-slate-500 text-sm">
        <p>Nota: En el onboarding se muestra como modal a pantalla completa.</p>
      </div>
    </div>
  );
}