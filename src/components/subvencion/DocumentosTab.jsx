import React from "react";
import DocumentoRow from "@/components/subvencion/DocumentoRow";
import { DOCUMENTOS_BASE } from "@/components/subvencion/expedienteConfig";

export default function DocumentosTab({ exp, updateExp, onGoTab }) {
  const docs = exp.documentos || [];
  const getDoc = (clave) => docs.find((d) => d.clave === clave) || { clave };

  const changeDoc = (clave, patch) => {
    const exists = docs.some((d) => d.clave === clave);
    const next = exists
      ? docs.map((d) => (d.clave === clave ? { ...d, ...patch } : d))
      : [...docs, { clave, estado: "pendiente", ...patch }];
    return updateExp({ documentos: next });
  };

  const carpetas = [...new Set(DOCUMENTOS_BASE.map((d) => d.carpeta))];

  return (
    <div className="min-w-0 space-y-5">
      <p className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 text-sm leading-relaxed text-slate-700">
        Aquí descargas los documentos que prepara la app, listos para firmar y entregar al Ayuntamiento. Los que emiten otros (Hacienda, Seguridad Social, banco, Federación) los pides tú y los entregas directamente; aquí solo los marcas como hechos.
      </p>
      {carpetas.map((carpeta) => (
        <div key={carpeta} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-800">📁 {carpeta}</h3>
          {DOCUMENTOS_BASE.filter((d) => d.carpeta === carpeta).map((def) => (
            <DocumentoRow
              key={def.clave}
              def={def}
              doc={getDoc(def.clave)}
              exp={exp}
              onChange={(patch) => changeDoc(def.clave, patch)}
              onGoTab={onGoTab}
            />
          ))}
        </div>
      ))}
    </div>
  );
}