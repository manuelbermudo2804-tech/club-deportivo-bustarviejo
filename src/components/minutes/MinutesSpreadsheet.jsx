import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function MinutesSpreadsheet({ players, matchStructure, onSave }) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const getMinutes = (match, playerId, half) => {
    const entry = match.minutos_jugadores?.find(m => m.jugador_id === playerId);
    if (!entry) return 0;
    return half === 1 ? (entry.minutos_1parte || 0) : (entry.minutos_2parte || 0);
  };

  const getPlayerMatchTotal = (match, playerId) => {
    const entry = match.minutos_jugadores?.find(m => m.jugador_id === playerId);
    return (entry?.minutos_1parte || 0) + (entry?.minutos_2parte || 0);
  };

  const getPlayerGrandTotal = (playerId) => {
    return matchStructure.reduce((sum, m) => sum + getPlayerMatchTotal(m, playerId), 0);
  };

  const handleCellClick = (matchIdx, playerId, half) => {
    const match = matchStructure[matchIdx];
    const val = getMinutes(match, playerId, half);
    setEditingCell({ matchIdx, playerId, half });
    setEditValue(val > 0 ? String(val) : "");
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const { matchIdx, playerId, half } = editingCell;
    const match = matchStructure[matchIdx];
    const numVal = Math.max(0, parseInt(editValue) || 0);

    const updatedMinutos = [...(match.minutos_jugadores || [])];
    const idx = updatedMinutos.findIndex(m => m.jugador_id === playerId);

    if (idx >= 0) {
      if (half === 1) updatedMinutos[idx].minutos_1parte = numVal;
      else updatedMinutos[idx].minutos_2parte = numVal;
    } else {
      const player = players.find(p => p.id === playerId);
      updatedMinutos.push({
        jugador_id: playerId,
        jugador_nombre: player?.nombre || "",
        minutos_1parte: half === 1 ? numVal : 0,
        minutos_2parte: half === 2 ? numVal : 0,
      });
    }

    onSave(match, updatedMinutos);
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCellSave();
    if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
    if (e.key === "Tab") { e.preventDefault(); handleCellSave(); }
  };

  // Agrupar por vuelta
  const idaMatches = matchStructure.filter(m => m.vuelta === "ida");
  const vueltaMatches = matchStructure.filter(m => m.vuelta === "vuelta");

  const shortName = (name) => {
    if (!name) return "?";
    // Quitar prefijos comunes
    return name
      .replace(/^(C\.D\.|A\.D\.|U\.D\.|RECREATIVO|C\.F\.)\s*/i, '')
      .replace(/\s*"[A-Z]"$/i, '')
      .trim()
      .split(' ').slice(0, 2).join(' ');
  };

  if (!players.length) return null;

  const renderHalf = (matches, label, colorClass) => (
    <div className="space-y-2">
      <div className={`flex items-center gap-2 px-2`}>
        <Badge className={`${colorClass} text-xs font-bold`}>{label}</Badge>
        <span className="text-xs text-slate-500">{matches.length} partidos</span>
      </div>
      <div className="border rounded-xl overflow-hidden bg-white shadow-lg">
        <div className="overflow-x-auto" ref={label === "1ª VUELTA" ? scrollRef : undefined}>
          <table className="w-full border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="sticky left-0 z-20 bg-slate-800 px-3 py-2 text-left text-xs font-bold min-w-[140px] border-r border-slate-700">
                  Jugador
                </th>
                {matches.map((m, idx) => (
                  <th key={idx} colSpan={2} className="px-1 py-2 text-center text-[10px] font-bold border-r border-slate-700 min-w-[100px]">
                    <div className="truncate max-w-[90px] mx-auto" title={m.rival}>
                      {shortName(m.rival)}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      {m.jornada && <span className="text-slate-400">J{m.jornada}</span>}
                      {m.localVisitante && (
                        <span className={m.localVisitante === "Local" ? "text-green-400" : "text-orange-400"}>
                          {m.localVisitante === "Local" ? "L" : "V"}
                        </span>
                      )}
                      {m.resultado && m.estado === "finalizado" && (
                        <span className="text-yellow-300 font-bold">{m.resultado}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-xs font-bold bg-amber-700 min-w-[50px]">TOT</th>
              </tr>
              <tr className="bg-slate-700 text-slate-300">
                <th className="sticky left-0 z-20 bg-slate-700 px-3 py-1 text-[10px] border-r border-slate-600"></th>
                {matches.map((_, idx) => (
                  <React.Fragment key={`h-${idx}`}>
                    <th className="px-1 py-0.5 text-center text-[9px] font-semibold border-r border-slate-600 bg-blue-900/40">1ª</th>
                    <th className="px-1 py-0.5 text-center text-[9px] font-semibold border-r border-slate-600 bg-green-900/40">2ª</th>
                  </React.Fragment>
                ))}
                <th className="px-2 py-0.5 text-[9px] text-center bg-amber-700/80">min</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, pIdx) => {
                const halfTotal = matches.reduce((s, m) => s + getPlayerMatchTotal(m, player.id), 0);
                return (
                  <tr key={player.id} className={pIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className={`sticky left-0 z-10 px-2 py-1.5 text-xs font-semibold border-r border-slate-200 ${pIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-1.5">
                        {player.foto_url ? (
                          <img src={player.foto_url} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 flex-shrink-0">
                            {player.nombre?.charAt(0)}
                          </div>
                        )}
                        <span className="truncate max-w-[90px] text-[11px]">{player.nombre?.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                    </td>
                    {matches.map((match, mIdx) => {
                      const globalIdx = matchStructure.indexOf(match);
                      return (
                        <React.Fragment key={mIdx}>
                          {[1, 2].map(half => {
                            const isEditing = editingCell?.matchIdx === globalIdx && editingCell?.playerId === player.id && editingCell?.half === half;
                            const val = getMinutes(match, player.id, half);
                            return (
                              <td
                                key={half}
                                className={`px-0.5 py-1 text-center border-r border-slate-200 cursor-pointer transition-colors min-w-[42px] ${
                                  half === 1 ? 'bg-blue-50/30' : 'bg-green-50/30'
                                } ${isEditing ? 'bg-yellow-100' : 'hover:bg-yellow-50'}`}
                                onClick={() => !isEditing && handleCellClick(globalIdx, player.id, half)}
                              >
                                {isEditing ? (
                                  <Input
                                    ref={inputRef}
                                    type="number"
                                    min="0"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleCellSave}
                                    onKeyDown={handleKeyDown}
                                    className="h-6 w-12 mx-auto text-center text-[11px] p-0 border-yellow-400"
                                  />
                                ) : (
                                  <span className={`text-[11px] font-medium ${val > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                    {val > 0 ? val : '·'}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    <td className="px-2 py-1.5 text-center text-[11px] font-bold text-amber-800 bg-amber-50/60">
                      {halfTotal > 0 ? halfTotal : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {idaMatches.length > 0 && renderHalf(idaMatches, "1ª VUELTA (Ida)", "bg-blue-600 text-white")}
      {vueltaMatches.length > 0 && renderHalf(vueltaMatches, "2ª VUELTA (Vuelta)", "bg-green-600 text-white")}

      {/* Gran total */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
        <h3 className="font-bold text-amber-900 text-sm mb-3">📊 Total Temporada</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {players
            .map(p => ({ ...p, total: getPlayerGrandTotal(p.id) }))
            .sort((a, b) => b.total - a.total)
            .map(p => (
              <div key={p.id} className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border">
                <span className="text-[11px] font-medium text-slate-700 truncate flex-1">
                  {p.nombre?.split(' ').slice(0, 2).join(' ')}
                </span>
                <span className={`text-xs font-bold ${p.total > 0 ? 'text-amber-700' : 'text-slate-300'}`}>
                  {p.total > 0 ? `${p.total}'` : '—'}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}