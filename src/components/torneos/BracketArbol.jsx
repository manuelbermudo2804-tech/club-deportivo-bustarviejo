import React from "react";
import { SeedBadge } from "./PartidoResultRow";
import { RONDA_TERCER_PUESTO } from "@/lib/torneoBracket";

// Cuadro eliminatorio tipo ÁRBOL SIMÉTRICO (estilo PDF oficial "Fase Oro"):
// los partidos de la primera ronda se reparten mitad a la izquierda y mitad a la
// derecha, y convergen hacia la final en el centro. Vista de solo lectura.
//
// Rondas soportadas (de fuera hacia dentro): Octavos → Cuartos → Semifinales → Final.
// El 3er/4º puesto se muestra aparte, debajo.

const ORDEN_RONDAS = ["1/16", "Octavos", "Cuartos", "Semifinales", "Final"];

function ordenarRondas(rondas) {
  return [...rondas].sort(
    (a, b) => ORDEN_RONDAS.indexOf(a) - ORDEN_RONDAS.indexOf(b)
  );
}

// Tarjeta de un partido (dos escudos, marcador, hora). lado: 'left' | 'right' | 'center'
function MatchCard({ partido, equipos, seedLocal, seedVisitante, lado = "left", color }) {
  const eqL = equipos.find((e) => e.id === partido.equipo_local_id);
  const eqV = equipos.find((e) => e.id === partido.equipo_visitante_id);
  const nombreL = eqL?.nombre || partido.equipo_local_placeholder || "Por decidir";
  const nombreV = eqV?.nombre || partido.equipo_visitante_placeholder || "Por decidir";
  const fin = partido.finalizado;
  const ganaL = fin && partido.marcador_local > partido.marcador_visitante;
  const ganaV = fin && partido.marcador_visitante > partido.marcador_local;

  const hora = partido.fecha_hora
    ? new Date(partido.fecha_hora).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    : null;
  const reverse = lado === "right";

  const Fila = ({ escudo, nombre, marcador, gana, pos }) => (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 ${reverse ? "flex-row-reverse text-right" : ""} ${
        gana ? "font-bold text-white" : "text-slate-300"
      }`}
    >
      {pos != null && <SeedBadge pos={pos} />}
      {escudo ? (
        <img src={escudo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
      ) : (
        <span className="w-5 h-5 rounded-full bg-white/10 flex-shrink-0" />
      )}
      <span className="truncate text-[11px] flex-1 leading-tight">{nombre}</span>
      <span className="text-xs tabular-nums w-4 text-center">{fin ? marcador : ""}</span>
    </div>
  );

  return (
    <div
      className="rounded-md border bg-white/5 overflow-hidden w-full"
      style={{ borderColor: `${color}55` }}
    >
      <Fila escudo={eqL?.escudo_url} nombre={nombreL} marcador={partido.marcador_local} gana={ganaL} pos={seedLocal} />
      <div className="border-t" style={{ borderColor: `${color}33` }} />
      <Fila escudo={eqV?.escudo_url} nombre={nombreV} marcador={partido.marcador_visitante} gana={ganaV} pos={seedVisitante} />
      {hora && (
        <div
          className={`text-[10px] py-0.5 px-2 font-semibold tabular-nums ${reverse ? "text-right" : ""}`}
          style={{ color, background: `${color}12` }}
        >
          🕐 {hora}
        </div>
      )}
    </div>
  );
}

// Una columna de una ronda dentro de un lado del árbol
function ColumnaLado({ partidos, equipos, seedDe, lado, color }) {
  return (
    <div className="flex flex-col justify-around gap-4 flex-1 min-w-0">
      {partidos.map((p) => (
        <MatchCard
          key={p.id}
          partido={p}
          equipos={equipos}
          lado={lado}
          color={color}
          seedLocal={seedDe(p.equipo_local_id, p.equipo_local_pos)}
          seedVisitante={seedDe(p.equipo_visitante_id, p.equipo_visitante_pos)}
        />
      ))}
    </div>
  );
}

export default function BracketArbol({ partidos, equipos, fase, titulo, color = "#fbbf24", seedPorEquipo = {} }) {
  const seedDe = (equipoId, posGuardada) => seedPorEquipo[equipoId] ?? posGuardada ?? null;
  const partidosFase = partidos.filter((p) => p.fase === fase);
  if (partidosFase.length === 0) return null;

  const porRonda = (ronda) =>
    partidosFase
      .filter((p) => p.ronda === ronda)
      .sort((a, b) => (a.orden_bracket || 0) - (b.orden_bracket || 0));

  const rondas = ordenarRondas([...new Set(partidosFase.map((p) => p.ronda))].filter((r) => r !== RONDA_TERCER_PUESTO));
  const final = porRonda("Final");
  const tercerPuesto = porRonda(RONDA_TERCER_PUESTO);

  // Rondas de árbol = todas menos la Final (la Final va sola en el centro)
  const rondasArbol = rondas.filter((r) => r !== "Final");

  // Para cada ronda, partir sus partidos en dos mitades: izquierda / derecha
  const mitades = rondasArbol.map((ronda) => {
    const ps = porRonda(ronda);
    const mid = Math.ceil(ps.length / 2);
    return { ronda, left: ps.slice(0, mid), right: ps.slice(mid) };
  });

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg flex items-center gap-2" style={{ color }}>
        <span className="w-3 h-3 rounded-full" style={{ background: color }} /> {titulo}
      </h3>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px] flex items-stretch gap-3">
          {/* Lado izquierdo: rondas de fuera hacia dentro */}
          {mitades.map((m) => (
            <ColumnaLado key={`L-${m.ronda}`} partidos={m.left} equipos={equipos} seedDe={seedDe} lado="left" color={color} />
          ))}

          {/* Centro: la Final */}
          <div className="flex flex-col justify-center items-center flex-shrink-0 w-40 px-1">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2 text-center" style={{ color }}>
              🏆 Final
            </p>
            {final.length > 0 ? (
              final.map((p) => (
                <MatchCard key={p.id} partido={p} equipos={equipos} lado="center" color={color}
                  seedLocal={seedDe(p.equipo_local_id, p.equipo_local_pos)} seedVisitante={seedDe(p.equipo_visitante_id, p.equipo_visitante_pos)} />
              ))
            ) : (
              <div className="text-[11px] text-slate-500 text-center">Por decidir</div>
            )}
          </div>

          {/* Lado derecho: rondas de dentro hacia fuera (espejo) */}
          {[...mitades].reverse().map((m) => (
            <ColumnaLado key={`R-${m.ronda}`} partidos={m.right} equipos={equipos} seedDe={seedDe} lado="right" color={color} />
          ))}
        </div>
      </div>

      {/* 3er / 4º puesto, debajo */}
      {tercerPuesto.length > 0 && (
        <div className="max-w-xs mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-center text-slate-400">
            🥉 3er / 4º puesto
          </p>
          {tercerPuesto.map((p) => (
            <MatchCard key={p.id} partido={p} equipos={equipos} lado="center" color="#cd7f32"
              seedLocal={seedDe(p.equipo_local_id, p.equipo_local_pos)} seedVisitante={seedDe(p.equipo_visitante_id, p.equipo_visitante_pos)} />
          ))}
        </div>
      )}
    </div>
  );
}