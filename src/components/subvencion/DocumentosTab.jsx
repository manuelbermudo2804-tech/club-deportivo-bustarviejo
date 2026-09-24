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
    <div className="space-y-5">
      {carpetas.map((carpeta) => (
        <div key={carpeta} className="space-y-2">
          <h3 className="font-semibold text-slate-700 text-sm">📁 {carpeta}</h3>
          {DOCUMENTOS_BASE.filter((d) => d.carpeta === carpeta).map((def) => (
            <DocumentoRow
              key={def.clave}
              def={def}
              doc={getDoc(def.clave)}
              fechaLimite={exp.fecha_limite_justificacion}
              onChange={(patch) => changeDoc(def.clave, patch)}
              onGoTab={onGoTab}
            />
          ))}
        </div>
      ))}
    </div>
  );
}