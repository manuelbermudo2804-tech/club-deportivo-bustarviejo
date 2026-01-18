import React from "react";
import InstallSuccessOverlay from "../components/pwa/InstallSuccessOverlay";

export default function InstallSuccessPreview() {
  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Vista previa: Pantalla post-instalación</h1>
        <p className="text-slate-600 mb-6">Así se verá la pantalla tras pulsar “Ya la tengo instalada”.</p>
      </div>
      <InstallSuccessOverlay variant="embedded" />
      <div className="max-w-5xl mx-auto px-4 py-6 text-slate-500 text-sm">
        <p>Nota: Esta es una vista previa embebida para revisión visual. En la app real se muestra a pantalla completa.</p>
      </div>
    </div>
  );
}