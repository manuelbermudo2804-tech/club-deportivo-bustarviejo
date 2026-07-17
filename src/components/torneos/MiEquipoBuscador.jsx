import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Clock, Trophy } from "lucide-react";
import { enriquecerPartidos, faseLabel, horaCorta } from "@/lib/torneoPartidos";

// Fila de un partido del equipo buscado
function PartidoFila({ p, equipoId }) {
  const localMio = p.equipo_local_id === equipoId;
  const finalizado = p.finalizado && p.marcador_local != null && p.marcador_visitante != null;
  const hora = horaCorta(p.fecha_hora);

  return (
    <div className="bg-white rounded-xl border p-3">
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
        <span className="font-semibold">{faseLabel(p)}</span>
        <span className="flex items-center gap-2">
          {hora && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{hora}</span>}
          {(p.campo || p.sede_nombre) && (
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.sede_nombre, p.campo].filter(Boolean).join(" · ")}</span>
          )}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`flex-1 text-right text-sm ${localMio ? "font-bold text-slate-900" : "text-slate-700"}`}>{p.local_nombre}</span>
        <span className="px-3 py-1 rounded-lg bg-slate-100 font-black text-slate-900 text-sm min-w-[52px] text-center">
          {finalizado ? `${p.marcador_local} - ${p.marcador_visitante}` : "vs"}
        </span>
        <span className={`flex-1 text-left text-sm ${!localMio ? "font-bold text-slate-900" : "text-slate-700"}`}>{p.visitante_nombre}</span>
      </div>
    </div>
  );
}

export default function MiEquipoBuscador({ equipos, partidos, grupos }) {
  const [query, setQuery] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  const enriquecidos = useMemo(() => enriquecerPartidos(partidos, equipos, grupos), [partidos, equipos, grupos]);

  const sugerencias = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return equipos.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 8);
  }, [query, equipos]);

  const misPartidos = useMemo(() => {
    if (!seleccionado) return [];
    return enriquecidos
      .filter((p) => p.equipo_local_id === seleccionado.id || p.equipo_visitante_id === seleccionado.id)
      .sort((a, b) => new Date(a.fecha_hora || 0) - new Date(b.fecha_hora || 0));
  }, [enriquecidos, seleccionado]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSeleccionado(null); }}
          placeholder="Escribe el nombre de tu equipo..."
          className="pl-9 bg-white"
        />
      </div>

      {!seleccionado && sugerencias.length > 0 && (
        <div className="bg-white rounded-xl border divide-y overflow-hidden">
          {sugerencias.map((e) => (
            <button
              key={e.id}
              onClick={() => { setSeleccionado(e); setQuery(e.nombre); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 text-sm text-slate-800"
            >
              {e.escudo_url
                ? <img src={e.escudo_url} alt="" className="w-6 h-6 object-contain rounded-full" />
                : <span className="w-6 h-6 rounded-full bg-slate-100" />}
              {e.nombre}
            </button>
          ))}
        </div>
      )}

      {!seleccionado && query.trim() && sugerencias.length === 0 && (
        <p className="text-center text-slate-400 py-6 text-sm">No se encontró ningún equipo con ese nombre.</p>
      )}

      {seleccionado && (
        misPartidos.length === 0 ? (
          <p className="text-center text-slate-400 py-6 text-sm">Este equipo aún no tiene partidos programados.</p>
        ) : (
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-bold text-slate-200">
              <Trophy className="w-4 h-4 text-amber-400" /> Partidos de {seleccionado.nombre}
            </p>
            {misPartidos.map((p) => <PartidoFila key={p.id} p={p} equipoId={seleccionado.id} />)}
          </div>
        )
      )}
    </div>
  );
}