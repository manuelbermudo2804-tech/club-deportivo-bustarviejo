import React, { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, AlertCircle } from "lucide-react";
import BustarviejoSchedule from "./BustarviejoSchedule";
import { toast } from "sonner";

const BUST = ["BUSTARVIEJO"];
function isBust(name) {
  if (!name) return false;
  const u = name.toUpperCase();
  return BUST.some(b => u.includes(b));
}

function shortName(name) {
  if (!name) return "?";
  return name
    .replace(/^C\.D\.\s*/i, "")
    .replace(/^A\.D\.\s*/i, "")
    .replace(/^UNION DEPORTIVA\s*/i, "UD ")
    .replace(/^ESC\.FUT\.\s*/i, "")
    .replace(/^RECREATIVO\s*/i, "REC. ")
    .replace(/^ATLETICO\s*/i, "ATL. ")
    .replace(/\s*C\.F\.\s*/gi, " ")
    .replace(/\s*\"([A-Z])\"\s*/gi, " $1")
    .trim()
    .substring(0, 20);
}

function CellScore({ cell }) {
  if (!cell) return <span className="text-slate-300">—</span>;
  if (!cell.jugado) return <span className="text-slate-400 text-[9px]">Pend.</span>;
  const { goles_local: gl, goles_visitante: gv } = cell;
  const isWin = gl > gv;
  const isDraw = gl === gv;
  return (
    <span className={`font-bold text-xs whitespace-nowrap ${isWin ? "text-green-700" : isDraw ? "text-yellow-700" : "text-red-600"}`}>
      {gl}-{gv}
    </span>
  );
}

export default function CrossTable({ category, config }) {
  const scrollRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isAdmin = me?.role === "admin";

  const configReady = config !== undefined;
  const hasUrl = !!config?.rfef_url;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["cross-table", category],
    queryFn: async () => {
      const res = await base44.functions.invoke("rffmScraper", {
        action: "cross_table",
        url: config.rfef_url,
      });
      return res.data;
    },
    enabled: configReady && hasUrl,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { teams, matrix, bustIdx } = useMemo(() => {
    if (!data?.teams) return { teams: [], matrix: {}, bustIdx: -1 };
    const bIdx = data.teams.findIndex(t => isBust(t.name));
    return { teams: data.teams, matrix: data.matrix || {}, bustIdx: bIdx };
  }, [data]);

  if (!configReady) {
    return (
      <Card><CardContent className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-orange-600 mx-auto mb-2 animate-spin" />
        <p className="text-slate-600 text-sm">Cargando configuración...</p>
      </CardContent></Card>
    );
  }

  if (!hasUrl) {
    return (
      <Card className="border-2 border-dashed border-orange-300 bg-gradient-to-br from-orange-50 to-white">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-orange-400 mx-auto mb-3" />
          <p className="font-bold text-slate-800 mb-1">Tabla Cruzada no disponible</p>
          <p className="text-sm text-slate-600">Se necesita la URL de la RFFM configurada para esta categoría.</p>
          {isAdmin && <p className="text-xs text-slate-500 mt-2">Admin: configura la URL en la pestaña Clasificación.</p>}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card><CardContent className="p-8 text-center">
        <Loader2 className="w-8 h-8 text-orange-600 mx-auto mb-2 animate-spin" />
        <p className="text-slate-600 text-sm">Cargando tabla cruzada desde la RFFM...</p>
        <p className="text-xs text-slate-400 mt-1">Esto puede tardar unos segundos</p>
      </CardContent></Card>
    );
  }

  if (error || !data?.success) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-700 mb-2">Error al cargar la tabla cruzada</p>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!teams.length) {
    return (
      <Card><CardContent className="p-8 text-center">
        <p className="text-slate-600">No se encontraron datos de tabla cruzada.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">Tabla Cruzada</h3>
          <p className="text-xs text-slate-500">{teams.length} equipos · {data.result_count} enfrentamientos</p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => { refetch(); toast.info("Actualizando..."); }}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Victoria local</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> Empate</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" /> Derrota local</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 border border-slate-300" /> Sin jugar</span>
      </div>

      <Card className="overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="text-[10px] sm:text-xs border-collapse min-w-max">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-800 text-white px-2 py-2 text-left font-bold min-w-[120px]">
                  Local ↓ / Visitante →
                </th>
                {teams.map((t) => (
                  <th
                    key={t.id}
                    className={`px-1 py-2 text-center font-semibold min-w-[48px] max-w-[60px] border-l border-slate-200 ${
                      isBust(t.name) ? "bg-orange-100 text-orange-800" : "bg-slate-100 text-slate-700"
                    }`}
                    title={t.name}
                  >
                    <div className="text-[9px] sm:text-[10px] leading-tight truncate" style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", maxHeight: 80 }}>
                      {shortName(t.name)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((localTeam, localIdx) => {
                const isBustRow = isBust(localTeam.name);
                return (
                  <tr key={localTeam.id} className={isBustRow ? "bg-orange-50" : localIdx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td
                      className={`sticky left-0 z-10 px-2 py-1.5 font-semibold border-t border-slate-200 truncate max-w-[150px] ${
                        isBustRow ? "bg-orange-100 text-orange-900 border-l-4 border-l-orange-500" : "bg-white text-slate-800"
                      }`}
                      title={localTeam.name}
                    >
                      {shortName(localTeam.name)}
                    </td>
                    {teams.map((visitTeam, visitIdx) => {
                      const isSame = localIdx === visitIdx;
                      const cell = matrix[localIdx]?.[visitIdx];
                      const isBustCol = isBust(visitTeam.name);

                      if (isSame) {
                        return (
                          <td key={visitTeam.id} className="bg-slate-300 border border-slate-200 text-center px-1 py-1.5">
                            <span className="text-slate-500">✕</span>
                          </td>
                        );
                      }

                      let bgClass = "bg-white";
                      if (cell?.jugado) {
                        if (cell.goles_local > cell.goles_visitante) bgClass = "bg-green-50";
                        else if (cell.goles_local === cell.goles_visitante) bgClass = "bg-yellow-50";
                        else bgClass = "bg-red-50";
                      }

                      return (
                        <td
                          key={visitTeam.id}
                          className={`text-center px-1 py-1.5 border border-slate-200 ${bgClass} ${
                            isBustRow || isBustCol ? "ring-1 ring-inset ring-orange-200" : ""
                          }`}
                          title={cell?.jugado ? `${localTeam.name} ${cell.goles_local} - ${cell.goles_visitante} ${visitTeam.name}` : `${localTeam.name} vs ${visitTeam.name}: pendiente`}
                        >
                          <CellScore cell={cell} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {bustIdx >= 0 && <BustarvijoDetail teams={teams} matrix={matrix} bustIdx={bustIdx} />}

      <BustarviejoSchedule config={config} />

      <p className="text-[10px] text-slate-400 text-center">
        Datos extraídos de la intranet RFFM · Desliza horizontalmente para ver toda la tabla
      </p>
    </div>
  );
}

function BustarvijoDetail({ teams, matrix, bustIdx }) {
  const bustTeam = teams[bustIdx];
  const homeResults = [];
  const awayResults = [];

  teams.forEach((t, idx) => {
    if (idx === bustIdx) return;
    const homeCell = matrix[bustIdx]?.[idx];
    if (homeCell) homeResults.push({ rival: t, ...homeCell });
    const awayCell = matrix[idx]?.[bustIdx];
    if (awayCell) awayResults.push({ rival: t, gl: awayCell.goles_visitante, gv: awayCell.goles_local, jugado: awayCell.jugado, isAway: true });
  });

  const allPlayed = [...homeResults.filter(r => r.jugado), ...awayResults.filter(r => r.jugado)];
  const wins = allPlayed.filter(r => (r.isAway ? r.gl > r.gv : r.goles_local > r.goles_visitante)).length;
  const draws = allPlayed.filter(r => (r.isAway ? r.gl === r.gv : r.goles_local === r.goles_visitante)).length;
  const losses = allPlayed.length - wins - draws;

  return (
    <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-orange-600 text-white">CD Bustarviejo</Badge>
          <span className="text-xs text-slate-600">{allPlayed.length} partidos jugados</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
            <div className="text-lg font-bold text-green-700">{wins}</div>
            <div className="text-[10px] text-green-600">Victorias</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
            <div className="text-lg font-bold text-yellow-700">{draws}</div>
            <div className="text-[10px] text-yellow-600">Empates</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2 border border-red-200">
            <div className="text-lg font-bold text-red-700">{losses}</div>
            <div className="text-[10px] text-red-600">Derrotas</div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1.5">🏠 En casa</p>
          <div className="space-y-1">
            {homeResults.map((r, i) => (
              <div key={i} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                !r.jugado ? "bg-slate-50" : r.goles_local > r.goles_visitante ? "bg-green-50" : r.goles_local === r.goles_visitante ? "bg-yellow-50" : "bg-red-50"
              }`}>
                <span className="truncate flex-1">{shortName(r.rival.name)}</span>
                {r.jugado ? (
                  <span className="font-bold ml-2">{r.goles_local} - {r.goles_visitante}</span>
                ) : (
                  <span className="text-slate-400 ml-2">Pend.</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700 mb-1.5">📍 Fuera</p>
          <div className="space-y-1">
            {awayResults.map((r, i) => (
              <div key={i} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                !r.jugado ? "bg-slate-50" : r.gl > r.gv ? "bg-green-50" : r.gl === r.gv ? "bg-yellow-50" : "bg-red-50"
              }`}>
                <span className="truncate flex-1">{shortName(r.rival.name)}</span>
                {r.jugado ? (
                  <span className="font-bold ml-2">{r.gl} - {r.gv}</span>
                ) : (
                  <span className="text-slate-400 ml-2">Pend.</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}