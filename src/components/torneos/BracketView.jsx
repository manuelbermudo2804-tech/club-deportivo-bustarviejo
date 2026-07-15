import React from "react";

// Bracket visual reutilizable (admin y público). Solo muestra; la edición de
// resultados se hace desde PartidoResultRow en el panel admin.
// Si onSave se pasa, muestra inputs de resultado inline (modo admin).
import PartidoResultRow from "./PartidoResultRow";
import { RONDA_TERCER_PUESTO } from "@/lib/torneoBracket";

const ORDEN_RONDAS = ["1/16", "Octavos", "Cuartos", "Semifinales", RONDA_TERCER_PUESTO, "Final"];

function ordenarRondas(rondas) {
  return [...rondas].sort((a, b) => {
    const ia = ORDEN_RONDAS.indexOf(a);
    const ib = ORDEN_RONDAS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export default function BracketView({ partidos, equipos, fase, titulo, color, onSave, isSaving }) {
  const partidosFase = partidos.filter((p) => p.fase === fase);
  if (partidosFase.length === 0) return null;

  const rondas = ordenarRondas([...new Set(partidosFase.map((p) => p.ronda))]);

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-lg flex items-center gap-2" style={{ color }}>
        <span className="w-3 h-3 rounded-full" style={{ background: color }} /> {titulo}
      </h3>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {rondas.map((ronda) => {
          const partidosRonda = partidosFase
            .filter((p) => p.ronda === ronda)
            .sort((a, b) => (a.orden_bracket || 0) - (b.orden_bracket || 0));
          return (
            <div key={ronda} className="flex-shrink-0 w-64 space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">{ronda}</p>
              <div className="space-y-3 flex flex-col justify-around h-full">
                {partidosRonda.map((p) =>
                  onSave ? (
                    <PartidoResultRow key={p.id} partido={p} equipos={equipos} onSave={onSave} isSaving={isSaving} />
                  ) : (
                    <BracketMatchReadOnly key={p.id} partido={p} equipos={equipos} />
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatchReadOnly({ partido, equipos }) {
  const eqL = equipos.find((e) => e.id === partido.equipo_local_id);
  const eqV = equipos.find((e) => e.id === partido.equipo_visitante_id);
  const nombreL = eqL?.nombre || partido.equipo_local_placeholder || "Por decidir";
  const nombreV = eqV?.nombre || partido.equipo_visitante_placeholder || "Por decidir";
  const ganadorL = partido.finalizado && partido.marcador_local > partido.marcador_visitante;
  const ganadorV = partido.finalizado && partido.marcador_visitante > partido.marcador_local;

  // Ubicación del partido (sede + campo), si está informada
  const ubicacion = [partido.sede_nombre, partido.campo].filter(Boolean).join(" · ");

  const Fila = ({ escudo, nombre, marcador, ganador }) => (
    <div className={`flex items-center gap-2 px-2 py-1.5 ${ganador ? "font-bold text-slate-900" : "text-slate-500"}`}>
      {escudo
        ? <img src={escudo} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
        : <span className="w-5 h-5 rounded-full bg-slate-100 flex-shrink-0" />}
      <span className="truncate text-sm flex-1">{nombre}</span>
      <span className="text-sm tabular-nums">{marcador ?? "-"}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <Fila escudo={eqL?.escudo_url} nombre={nombreL} marcador={partido.finalizado ? partido.marcador_local : null} ganador={ganadorL} />
      <div className="border-t" />
      <Fila escudo={eqV?.escudo_url} nombre={nombreV} marcador={partido.finalizado ? partido.marcador_visitante : null} ganador={ganadorV} />
      {ubicacion && (
        <div className="border-t px-2 py-1 text-[11px] text-slate-400 truncate">📍 {ubicacion}</div>
      )}
    </div>
  );
}