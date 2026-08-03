import React from "react";
import { calcularClasificacionGeneral } from "@/lib/torneoGrupoUnico";
import { labelAnotacion } from "@/lib/torneoStandings";

const COLOR_FASE = {
  oro: { row: "bg-amber-50", dot: "bg-amber-400" },
  plata: { row: "bg-slate-100", dot: "bg-slate-400" },
  bronce: { row: "bg-orange-50", dot: "bg-orange-400" },
};

// Tabla única de clasificación general (grupo único). Resalta los tramos que
// entran en cada fase final del torneo (Oro 1-16, Plata 17-24, etc.)
export default function ClasificacionGeneral({ equipos, partidos, torneo }) {
  const filas = calcularClasificacionGeneral(equipos, partidos, torneo);
  const anot = labelAnotacion(torneo);
  const fases = (torneo?.fases_finales || []).filter((f) => f.desde && f.hasta);

  const faseDePosicion = (pos) => fases.find((f) => pos >= f.desde && pos <= f.hasta);

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-3 py-2 bg-slate-800 text-white font-semibold text-sm flex items-center justify-between">
        <span>Clasificación general</span>
        <span className="text-[11px] font-normal text-slate-300">{equipos.length} equipos</span>
      </div>
      {equipos.length === 0 ? (
        <p className="text-center text-slate-400 text-sm py-4">Sin equipos</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-slate-500 border-b">
              <th className="text-left py-1.5 pl-3">#</th>
              <th className="text-left">Equipo</th>
              <th className="w-8 text-center">PJ</th>
              <th className="w-8 text-center">G</th>
              <th className="w-8 text-center">E</th>
              <th className="w-8 text-center">P</th>
              <th className="w-8 text-center" title={`${anot} a favor`}>GF</th>
              <th className="w-8 text-center" title={`${anot} en contra`}>GC</th>
              <th className="w-10 text-center" title={`Diferencia de ${anot.toLowerCase()}`}>+/-</th>
              <th className="w-10 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const fase = faseDePosicion(f.posicion);
              const col = fase ? COLOR_FASE[fase.clave] : null;
              return (
                <tr key={f.equipo_id} className={`border-b last:border-0 ${col?.row || ""}`}>
                  <td className="py-1.5 pl-3">
                    <span className="inline-flex items-center gap-1">
                      {f.posicion}
                      {col && <span className={`w-1.5 h-1.5 rounded-full ${col.dot}`} />}
                    </span>
                  </td>
                  <td className="font-medium text-slate-800">
                    <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                      {f.escudo_url
                        ? <img src={f.escudo_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                        : <span className="w-5 h-5 rounded-full bg-slate-100 flex-shrink-0" />}
                      <span className="truncate">{f.nombre}</span>
                    </span>
                  </td>
                  <td className="text-center text-slate-500">{f.jugados}</td>
                  <td className="text-center text-slate-500">{f.ganados}</td>
                  <td className="text-center text-slate-500">{f.empatados}</td>
                  <td className="text-center text-slate-500">{f.perdidos}</td>
                  <td className="text-center text-slate-500">{f.favor}</td>
                  <td className="text-center text-slate-500">{f.contra}</td>
                  <td className={`text-center ${f.diferencia > 0 ? "text-green-600" : f.diferencia < 0 ? "text-red-500" : "text-slate-400"}`}>
                    {f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia}
                  </td>
                  <td className="text-center font-bold text-slate-900">{f.puntos}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {fases.length > 0 && (
        <div className="px-3 py-2 border-t flex flex-wrap gap-3 text-[11px] text-slate-500">
          {fases.map((f) => (
            <span key={f.clave} className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${COLOR_FASE[f.clave]?.dot || "bg-slate-300"}`} />
              {f.nombre || f.clave} ({f.desde}º–{f.hasta}º)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}