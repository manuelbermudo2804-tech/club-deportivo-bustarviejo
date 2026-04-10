import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BUST = ["BUSTARVIEJO"];
function isBust(name) {
  if (!name) return false;
  return BUST.some(b => name.toUpperCase().includes(b));
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
    .replace(/\s*"([A-Z])"\s*/gi, " $1")
    .trim();
}

function parseDateToObj(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const year = y.length === 2 ? `20${y}` : y;
  return new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}T12:00:00`);
}

function formatDate(dateStr) {
  const d = parseDateToObj(dateStr);
  if (!d || isNaN(d)) return null;
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

export default function BustarviejoSchedule({ config }) {
  const hasUrl = !!config?.rfef_url;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["bust-schedule", config?.rfef_url],
    queryFn: async () => {
      const res = await base44.functions.invoke("rffmScraper", {
        action: "all_results",
        url: config.rfef_url,
      });
      return res.data;
    },
    enabled: hasUrl,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { matches, stats, nextIdx } = useMemo(() => {
    if (!data?.jornadas) return { matches: [], stats: null, nextIdx: -1 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list = [];

    for (const j of data.jornadas) {
      const bm = j.matches.find(m =>
        isBust(m.local) || isBust(m.visitante)
      );
      if (bm) {
        const isLocal = isBust(bm.local);
        const rival = isLocal ? bm.visitante : bm.local;
        const isDescansa = /descansa/i.test(bm.local) || /descansa/i.test(bm.visitante);
        list.push({
          jornada: j.jornada,
          rival,
          isLocal,
          jugado: bm.jugado,
          golesF: isLocal ? bm.goles_local : bm.goles_visitante,
          golesC: isLocal ? bm.goles_visitante : bm.goles_local,
          fecha: bm.fecha,
          hora: bm.hora,
          campo: bm.campo,
          isDescansa,
        });
      } else {
        // Jornada sin partido de Bustarviejo (descansa implícito)
        list.push({
          jornada: j.jornada,
          rival: null,
          isLocal: false,
          jugado: false,
          golesF: null,
          golesC: null,
          fecha: null,
          hora: null,
          campo: null,
          isDescansa: true,
        });
      }
    }

    let wins = 0, draws = 0, losses = 0, played = 0;
    list.forEach(m => {
      if (m.jugado && !m.isDescansa) {
        played++;
        if (m.golesF > m.golesC) wins++;
        else if (m.golesF === m.golesC) draws++;
        else losses++;
      }
    });

    // Find next match
    let next = -1;
    for (let i = 0; i < list.length; i++) {
      if (!list[i].jugado && !list[i].isDescansa) {
        next = i;
        break;
      }
    }

    return {
      matches: list,
      stats: { played, wins, draws, losses, pending: list.filter(m => !m.jugado && !m.isDescansa).length, total: list.length },
      nextIdx: next,
    };
  }, [data]);

  if (!hasUrl) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 text-orange-600 mx-auto mb-2 animate-spin" />
          <p className="text-sm text-slate-600">Cargando calendario de jornadas...</p>
        </CardContent>
      </Card>
    );
  }

  if (!matches.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800">📅 Calendario de Jornadas</h3>
          <p className="text-xs text-slate-500">
            {stats.played} jugados · {stats.pending} pendientes · {stats.total} jornadas
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => { refetch(); toast.info("Actualizando..."); }}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Mini stats */}
      <div className="flex items-center gap-3 text-xs">
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold">{stats.wins}V</span>
        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg font-semibold">{stats.draws}E</span>
        <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold">{stats.losses}D</span>
        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-semibold">{stats.played}/{stats.total}</span>
      </div>

      {/* Jornadas list */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-slate-100">
          {matches.map((m, idx) => {
            const isNext = idx === nextIdx;
            let rowBg = "bg-white";
            let resultEl = null;

            if (m.isDescansa) {
              rowBg = "bg-slate-50";
              resultEl = <span className="text-slate-400 text-xs italic">Descansa</span>;
            } else if (m.jugado) {
              const isWin = m.golesF > m.golesC;
              const isDraw = m.golesF === m.golesC;
              rowBg = isWin ? "bg-green-50" : isDraw ? "bg-yellow-50" : "bg-red-50";
              resultEl = (
                <span className={`font-bold text-sm ${isWin ? "text-green-700" : isDraw ? "text-yellow-700" : "text-red-600"}`}>
                  {m.golesF} - {m.golesC}
                </span>
              );
            } else {
              resultEl = <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-500">Pendiente</Badge>;
            }

            if (isNext) rowBg = "bg-orange-50 ring-2 ring-inset ring-orange-300";

            return (
              <div key={m.jornada} className={`px-3 py-2.5 ${rowBg} transition-colors`}>
                <div className="flex items-center gap-2">
                  {/* Jornada number */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    isNext ? "bg-orange-600 text-white" :
                    m.jugado ? "bg-slate-200 text-slate-700" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    J{m.jornada}
                  </div>

                  {/* Match info */}
                  <div className="flex-1 min-w-0">
                    {m.isDescansa ? (
                      <span className="text-xs text-slate-400 italic">Jornada de descanso</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                          m.isLocal ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                        }`}>
                          {m.isLocal ? "L" : "V"}
                        </span>
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {shortName(m.rival)}
                        </span>
                        {isNext && <Badge className="bg-orange-600 text-white text-[9px] px-1 py-0 ml-1">Próximo</Badge>}
                      </div>
                    )}
                    {!m.isDescansa && m.fecha && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {formatDate(m.fecha)}{m.hora ? ` · ${m.hora}` : ""}
                        {m.campo && !m.isLocal ? ` · ${m.campo.substring(0, 35)}` : ""}
                      </div>
                    )}
                  </div>

                  {/* Result */}
                  <div className="shrink-0">
                    {resultEl}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}