import React from "react";
import MisFirmadosLista from "@/components/contratos/MisFirmadosLista";

// Cada persona ve y descarga los documentos que ha firmado con el club
export default function MisDocumentos() {
  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">📄 Mis documentos firmados</h1>
      <MisFirmadosLista />
    </div>
  );
}