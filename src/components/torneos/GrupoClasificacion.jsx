import React from "react";
import { calcularClasificacionGrupo, labelAnotacion } from "@/lib/torneoStandings";

// Tabla de clasificación de un grupo. Resalta las filas Oro (1º-2º) y Plata (3º-4º)
export default function GrupoClasificacion({ grupo, equipos, partidos, torneo, plazasOro = 2, plazasPlata = 2 }) {
  const equiposGrupo = equipos.filter((e) => e.grupo_id === grupo.id);
  const partidosGrupo = partidos.filter((p) => p.fase === "liguilla" && p.grupo_id === grupo.id);
  const filas = calcularClasificacionGrupo(equiposGrupo, partidosGrupo, torneo);
  const anot = labelAnotacion(torneo);

  const nivelFila = (pos) => {
    if (pos <= plazasOro) return "oro";
    if (pos <= plazasOro + plazasPlata) return "plata";
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="px-3 py-2 bg-slate-800 text-white font-semibold text-sm">{grupo.nombre}</div>
      {equiposGrupo.length === 0 ? (
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
              <th className="w-10 text-center" title={anot}>+/-</th>
              <th className="w-10 text-center font-bold">Pts</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const nivel = nivelFila(f.posicion);
              return (
                <tr
                  key={f.equipo_id}
                  className={`border-b last:border-0 ${
                    nivel === "oro" ? "bg-amber-50" : nivel === "plata" ? "bg-slate-100" : ""
                  }`}
                >
                  <td className="py-1.5 pl-3">
                    <span className="inline-flex items-center gap-1">
                      {f.posicion}
                      {nivel === "oro" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {nivel === "plata" && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
                    </span>
                  </td>
                  <td className="font-medium text-slate-800">
                    <span className="flex items-center gap-1.5 truncate max-w-[140px]">
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
    </div>
  );
}