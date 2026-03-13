import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function MinutesSpreadsheet({ 
  players, 
  matchRecords, 
  onSaveMatch, 
  onDeleteMatch,
  duracionPartido = 0 
}) {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const getMinutes = (record, playerId, half) => {
    const entry = record.minutos_jugadores?.find(m => m.jugador_id === playerId);
    if (!entry) return 0;
    return half === 1 ? (entry.minutos_1parte || 0) : (entry.minutos_2parte || 0);
  };

  const getPlayerTotal = (playerId) => {
    return matchRecords.reduce((sum, rec) => {
      const entry = rec.minutos_jugadores?.find(m => m.jugador_id === playerId);
      return sum + (entry?.minutos_1parte || 0) + (entry?.minutos_2parte || 0);
    }, 0);
  };

  const getPlayerMatchTotal = (record, playerId) => {
    const entry = record.minutos_jugadores?.find(m => m.jugador_id === playerId);
    return (entry?.minutos_1parte || 0) + (entry?.minutos_2parte || 0);
  };

  const totalPossibleMinutes = matchRecords.reduce((sum, rec) => sum + (rec.duracion_partido || duracionPartido || 0), 0);

  const handleCellClick = (recordId, playerId, half) => {
    const record = matchRecords.find(r => r.id === recordId);
    const val = getMinutes(record, playerId, half);
    setEditingCell({ recordId, playerId, half });
    setEditValue(val > 0 ? String(val) : "");
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const { recordId, playerId, half } = editingCell;
    const record = matchRecords.find(r => r.id === recordId);
    if (!record) return;

    const numVal = Math.max(0, parseInt(editValue) || 0);
    const updatedMinutos = [...(record.minutos_jugadores || [])];
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
        minutos_2parte: half === 2 ? numVal : 0
      });
    }

    onSaveMatch(recordId, { minutos_jugadores: updatedMinutos });
    setEditingCell(null);
    setEditValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleCellSave();
    if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
    if (e.key === "Tab") {
      e.preventDefault();
      handleCellSave();
    }
  };

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 200, behavior: "smooth" });
    }
  };

  if (players.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="p-8 text-center text-slate-500">
          No hay jugadores en esta categoría
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Scroll controls */}
      {matchRecords.length > 2 && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => scroll(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => scroll(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden bg-white shadow-lg">
        <div className="overflow-x-auto" ref={scrollRef}>
          <table className="w-full border-collapse min-w-max">
            <thead>
              {/* Row 1: Rival names */}
              <tr className="bg-slate-800 text-white">
                <th className="sticky left-0 z-20 bg-slate-800 px-3 py-2 text-left text-xs font-bold min-w-[150px] border-r border-slate-700">
                  Jugador
                </th>
                {matchRecords.map((rec) => (
                  <th key={rec.id} colSpan={2} className="px-2 py-2 text-center text-xs font-bold border-r border-slate-700 min-w-[120px]">
                    <div className="flex items-center justify-center gap-1">
                      <span className="truncate max-w-[80px]">{rec.rival}</span>
                      <button
                        onClick={() => onDeleteMatch(rec.id)}
                        className="ml-1 p-0.5 hover:bg-red-500/30 rounded text-red-300 hover:text-red-100 transition-colors"
                        title="Eliminar partido"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                      {rec.fecha_partido ? new Date(rec.fecha_partido).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : ''}
                      {rec.local_visitante ? ` · ${rec.local_visitante === 'Local' ? 'L' : 'V'}` : ''}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-xs font-bold bg-amber-700 min-w-[70px]">
                  TOTAL
                </th>
                {totalPossibleMinutes > 0 && (
                  <th className="px-3 py-2 text-center text-xs font-bold bg-amber-800 min-w-[60px]">
                    %
                  </th>
                )}
              </tr>
              {/* Row 2: 1ª / 2ª labels */}
              <tr className="bg-slate-700 text-slate-300">
                <th className="sticky left-0 z-20 bg-slate-700 px-3 py-1 text-left text-[10px] border-r border-slate-600"></th>
                {matchRecords.map((rec) => (
                  <React.Fragment key={`h2-${rec.id}`}>
                    <th className="px-2 py-1 text-center text-[10px] font-semibold border-r border-slate-600 bg-blue-900/40">1ª</th>
                    <th className="px-2 py-1 text-center text-[10px] font-semibold border-r border-slate-600 bg-green-900/40">2ª</th>
                  </React.Fragment>
                ))}
                <th className="px-3 py-1 text-center text-[10px] bg-amber-700/80">min</th>
                {totalPossibleMinutes > 0 && (
                  <th className="px-3 py-1 text-center text-[10px] bg-amber-800/80">%</th>
                )}
              </tr>
            </thead>
            <tbody>
              {players.map((player, pIdx) => {
                const totalMin = getPlayerTotal(player.id);
                const pct = totalPossibleMinutes > 0 ? Math.round((totalMin / totalPossibleMinutes) * 100) : 0;
                const pctColor = pct >= 70 ? "text-green-700 bg-green-50" : pct >= 40 ? "text-yellow-700 bg-yellow-50" : pct > 0 ? "text-red-700 bg-red-50" : "text-slate-400";
                
                return (
                  <tr key={player.id} className={pIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className={`sticky left-0 z-10 px-3 py-2 text-xs font-semibold border-r border-slate-200 ${pIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-2">
                        {player.foto_url ? (
                          <img src={player.foto_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {player.nombre?.charAt(0)}
                          </div>
                        )}
                        <span className="truncate max-w-[100px]">{player.nombre?.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                    </td>
                    {matchRecords.map((rec) => (
                      <React.Fragment key={`${player.id}-${rec.id}`}>
                        {[1, 2].map((half) => {
                          const isEditing = editingCell?.recordId === rec.id && editingCell?.playerId === player.id && editingCell?.half === half;
                          const val = getMinutes(rec, player.id, half);
                          return (
                            <td 
                              key={half}
                              className={`px-1 py-1 text-center border-r border-slate-200 cursor-pointer transition-colors min-w-[60px] ${
                                half === 1 ? 'bg-blue-50/30' : 'bg-green-50/30'
                              } ${isEditing ? 'bg-yellow-100' : 'hover:bg-yellow-50'}`}
                              onClick={() => !isEditing && handleCellClick(rec.id, player.id, half)}
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
                                  className="h-7 w-14 mx-auto text-center text-xs p-0 border-yellow-400"
                                />
                              ) : (
                                <span className={`text-xs font-medium ${val > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                                  {val > 0 ? val : '·'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    ))}
                    <td className="px-3 py-2 text-center text-xs font-bold text-amber-800 bg-amber-50/60">
                      {totalMin > 0 ? totalMin : '—'}
                    </td>
                    {totalPossibleMinutes > 0 && (
                      <td className={`px-3 py-2 text-center text-xs font-bold ${pctColor}`}>
                        {totalMin > 0 ? `${pct}%` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {/* Footer: totals per match */}
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 border-r">
                  Total partido
                </td>
                {matchRecords.map((rec) => {
                  const matchTotal1 = players.reduce((s, p) => s + getMinutes(rec, p.id, 1), 0);
                  const matchTotal2 = players.reduce((s, p) => s + getMinutes(rec, p.id, 2), 0);
                  return (
                    <React.Fragment key={`ft-${rec.id}`}>
                      <td className="px-2 py-2 text-center text-xs font-bold text-blue-700 border-r bg-blue-50/50">{matchTotal1 || '—'}</td>
                      <td className="px-2 py-2 text-center text-xs font-bold text-green-700 border-r bg-green-50/50">{matchTotal2 || '—'}</td>
                    </React.Fragment>
                  );
                })}
                <td className="px-3 py-2 text-center text-xs font-bold text-amber-800 bg-amber-100">
                  {players.reduce((s, p) => s + getPlayerTotal(p.id), 0) || '—'}
                </td>
                {totalPossibleMinutes > 0 && <td className="bg-amber-100"></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}