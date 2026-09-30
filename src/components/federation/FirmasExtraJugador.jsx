import React from "react";
import { ExternalLink, CheckCircle2, Clock } from "lucide-react";

// Muestra al jugador/familia las firmas federativas de sus otras categorías
export default function FirmasExtraJugador({ player }) {
  const firmas = (player.firmas_extra || []).filter((f) => f.enlace);
  if (firmas.length === 0) return null;
  return (
    <>
      {firmas.map((f) => (
        <div key={f.categoria} className={`p-4 rounded-lg border-2 ${f.completada ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900 text-sm">Firma federativa · {f.categoria}</p>
            {f.completada ? (
              <span className="text-green-700 text-xs flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Firmado</span>
            ) : (
              <span className="text-yellow-700 text-xs flex items-center gap-1"><Clock className="w-4 h-4" />Pendiente</span>
            )}
          </div>
          {!f.completada && (
            <a href={f.enlace} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <ExternalLink className="w-4 h-4" /> Firmar ahora
            </a>
          )}
        </div>
      ))}
    </>
  );
}