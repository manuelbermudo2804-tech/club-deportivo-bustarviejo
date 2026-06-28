import React, { useMemo } from "react";

// Muestra, para una fase eliminatoria, los EQUIPOS REALES que avanzaron a esa fase
// (según los partidos reales que metió el admin) comparados con lo que el usuario predijo.
// No compara "cruce a cruce" (eso confunde) sino "qué equipos llegaron" — que es como
// se reparten los puntos en esta porra.
//
// fase: clave de la fase actual ('16avos','8vos','4tos','semis','final')
// La "fase real" de un equipo es: aparece como ganador en la fase ANTERIOR
// (porque ganar en 16avos = clasificarse a octavos). Para 16avos, los equipos
// reales son los que el admin puso como local/visitante en los partidos de 16avos.
export default function BracketRealVsPrediccion({ faseKey, partidos, equipos, prediccionesUsuario }) {
  const equiposPorCodigo = useMemo(() => {
    const m = {};
    (equipos || []).forEach((e) => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  // Equipos REALES que llegaron a esta fase
  const equiposRealesFase = useMemo(() => {
    const codigos = new Set();
    if (faseKey === "16avos") {
      // Los participantes reales de 16avos son los local/visitante de esos partidos
      partidos
        .filter((p) => p.fase === "16avos")
        .forEach((p) => {
          if (p.equipo_local_codigo) codigos.add(p.equipo_local_codigo);
          if (p.equipo_visitante_codigo) codigos.add(p.equipo_visitante_codigo);
        });
    } else {
      // Para 8vos+, los que llegaron = ganadores de la fase anterior
      const FASES = ["16avos", "8vos", "4tos", "semis", "final"];
      const idx = FASES.indexOf(faseKey);
      if (idx <= 0) return [];
      const faseAnterior = FASES[idx - 1];
      partidos
        .filter((p) => p.fase === faseAnterior && p.finalizado && p.ganador_codigo)
        .forEach((p) => codigos.add(p.ganador_codigo));
    }
    return Array.from(codigos);
  }, [faseKey, partidos]);

  // Equipos que el USUARIO predijo que llegan a esta fase = ganadores que eligió en la fase anterior.
  // Para 16avos, son los que el usuario clasificó (su cuadro), pero como esos ya se ven en el bracket,
  // aquí comparamos contra sus predicciones de eliminatorias de la fase anterior.
  const prediccionUsuarioFase = useMemo(() => {
    const FASES = ["16avos", "8vos", "4tos", "semis", "final"];
    const idx = FASES.indexOf(faseKey);
    const set = new Set();
    if (faseKey === "16avos") {
      // Lo que el usuario clasificó a 16avos: sus 1º/2º + terceros (ya está en su cuadro).
      // Para comparar usamos los local/visitante de SU cuadro no están aquí; comparamos solo reales.
      return { reales: equiposRealesFase, prediccion: set };
    }
    if (idx > 0) {
      const faseAnterior = FASES[idx - 1];
      partidos
        .filter((p) => p.fase === faseAnterior)
        .forEach((p) => {
          const g = prediccionesUsuario?.[p.id];
          if (g) set.add(g);
        });
    }
    return { reales: equiposRealesFase, prediccion: set };
  }, [faseKey, partidos, prediccionesUsuario, equiposRealesFase]);

  if (equiposRealesFase.length === 0) return null;

  const { prediccion } = prediccionUsuarioFase;

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
      <p className="text-xs font-bold text-emerald-900 mb-2 flex items-center gap-1">
        ✅ Equipos REALES que llegaron a esta fase
      </p>
      <div className="flex flex-wrap gap-1.5">
        {equiposRealesFase.map((codigo) => {
          const eq = equiposPorCodigo[codigo];
          if (!eq) return null;
          const acertado = faseKey === "16avos" ? null : prediccion.has(codigo);
          return (
            <span
              key={codigo}
              className={`text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 border ${
                acertado === true
                  ? "bg-green-100 border-green-300 text-green-800"
                  : acertado === false
                  ? "bg-white border-slate-200 text-slate-500"
                  : "bg-white border-emerald-200 text-emerald-800"
              }`}
            >
              <span>{eq.bandera_emoji}</span>
              <span className="truncate max-w-[90px]">{eq.nombre}</span>
              {acertado === true && <span className="text-green-600">✓</span>}
              {acertado === false && <span className="text-slate-400">✗</span>}
            </span>
          );
        })}
      </div>
      {faseKey !== "16avos" && (
        <p className="text-[10px] text-emerald-700 mt-2">
          ✓ = lo tenías en tu cuadro · ✗ = no lo predijiste
        </p>
      )}
    </div>
  );
}