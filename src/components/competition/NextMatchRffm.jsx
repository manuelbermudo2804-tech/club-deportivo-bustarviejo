import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Trophy, Loader2, RefreshCw } from "lucide-react";
import { extractTownFromCampo } from "../utils/campoParsing";

function buildIntranetUrl(publicUrl) {
  if (!publicUrl) return null;
  try {
    // If already an intranet URL, use it directly
    if (publicUrl.includes("intranet.ffmadrid.es")) return publicUrl;
    // Otherwise convert from public rffm.es URL
    const u = new URL(publicUrl);
    const comp = u.searchParams.get("competicion");
    const grupo = u.searchParams.get("grupo");
    const temp = u.searchParams.get("temporada");
    if (!comp || !grupo || !temp) return null;
    return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=1000128&CodCompeticion=${comp}&CodGrupo=${grupo}&CodTemporada=${temp}`;
  } catch { return null; }
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  // dateStr is "dd/mm/yyyy"
  const parts = dateStr.split("/");
  if (parts.length !== 3) return dateStr;
  const [d, m, y] = parts;
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

export default function NextMatchRffm({ config, category, standings, onMatchLoaded }) {
  const intranetUrl = config?.rfef_results_url ? buildIntranetUrl(config.rfef_results_url) : 
                      config?.rfef_url ? buildIntranetUrl(config.rfef_url) : null;

  // Detect starting jornada: use standings if available, otherwise extract from URL, fallback to auto-detect (0)
  const startJornada = React.useMemo(() => {
    if (standings?.jornada) return (standings.jornada || 0) + 1;
    // Try to extract CodJornada from the config URL as a reasonable starting point
    try {
      const url = config?.rfef_results_url || config?.rfef_url;
      if (url) {
        const u = new URL(url);
        const j = parseInt(u.searchParams.get('CodJornada'));
        if (j > 0) return j;
      }
    } catch {}
    return 1;
  }, [standings, config]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['next-match-rffm', category, startJornada],
    queryFn: async () => {
      if (!intranetUrl) return null;
      const res = await base44.functions.invoke("rffmScraper", {
        action: "next_match",
        url: intranetUrl,
        jornada: startJornada,
      });
      // Auto-save to ProximoPartido entity so non-admins can see it
      if (res.data?.match) {
        try {
          const m = res.data.match;
          const fechaIso = m.fecha ? (() => {
            const [d, mo, y] = m.fecha.split("/");
            return `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
          })() : null;
          // Delete ALL old records for this category first, then create one new
          const old = await base44.entities.ProximoPartido.filter({ categoria: category });
          // Delete all in sequence to avoid race conditions
          for (const o of old) { try { await base44.entities.ProximoPartido.delete(o.id); } catch {} }
          // Small delay to ensure deletes are processed before create
          await new Promise(r => setTimeout(r, 200));
          // Check again to prevent duplicates from concurrent renders
          const check = await base44.entities.ProximoPartido.filter({ categoria: category });
          if (check.length === 0) {
            await base44.entities.ProximoPartido.create({
              categoria: category,
              jornada: res.data.jornada || startJornada,
              local: m.local,
              visitante: m.visitante,
              fecha: m.fecha,
              hora: m.hora,
              campo: m.campo,
              fecha_iso: fechaIso,
            });
          }
        } catch (e) { console.error("Error saving ProximoPartido:", e); }
      }
      return res.data;
    },
    enabled: !!intranetUrl,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  if (!intranetUrl) return null;

  if (isLoading) {
    return (
      <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 mb-4">
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-green-600" />
          <span className="text-sm text-green-700">Buscando próximo partido...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data?.match) return null;

  const match = data.match;
  const jornada = data.jornada;
  const isLocal = match.local?.toUpperCase().includes("BUSTARVIEJO");
  const rival = isLocal ? match.visitante : match.local;

  // Find rival in standings
  const rivalStats = standings?.data?.find(s => 
    s.nombre_equipo?.toUpperCase().includes(rival?.toUpperCase()?.split('"')[0]?.trim()) ||
    rival?.toUpperCase()?.includes(s.nombre_equipo?.toUpperCase())
  );
  const bustarStats = standings?.data?.find(s => 
    s.nombre_equipo?.toUpperCase().includes("BUSTARVIEJO")
  );

  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-lg border-2 border-green-500/50 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-green-400" />
          <h3 className="font-bold text-lg">⚽ Próximo Partido</h3>
          <Badge className="bg-green-600 text-white">Jornada {jornada}</Badge>
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} className="text-slate-400 hover:text-white h-8 w-8">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Match info */}
      <div className="grid grid-cols-3 gap-2 items-center mb-3">
        <div className="text-center">
          <p className={`font-bold text-sm ${isLocal ? 'text-orange-400' : 'text-slate-300'}`}>
            {match.local}
          </p>
          {isLocal && <Badge className="bg-orange-600/30 text-orange-300 text-xs mt-1">Nosotros</Badge>}
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-green-400">VS</p>
        </div>
        <div className="text-center">
          <p className={`font-bold text-sm ${!isLocal ? 'text-orange-400' : 'text-slate-300'}`}>
            {match.visitante}
          </p>
          {!isLocal && <Badge className="bg-orange-600/30 text-orange-300 text-xs mt-1">Nosotros</Badge>}
        </div>
      </div>

      {/* Date, time, location */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
        {match.fecha && (
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-green-400" />
            <span className="capitalize">{formatDate(match.fecha)}</span>
          </div>
        )}
        {match.hora && (
          <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-green-400" />
            <span>{match.hora}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
          <MapPin className="w-4 h-4 text-green-400" />
          <span>{isLocal ? "🏠 Casa" : "✈️ Fuera"}</span>
        </div>
        {match.campo && (
          !isLocal ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('campo de fútbol ' + match.campo)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="text-xs text-blue-300">📍 {extractTownFromCampo(match.campo) || match.campo}</span>
              <span className="text-[10px] text-blue-400 font-semibold">→ Mapa</span>
            </a>
          ) : (
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5">
              <span className="text-xs text-slate-300">📍 {match.campo}</span>
            </div>
          )
        )}
      </div>

      {/* Stats comparison if available */}
      {bustarStats && rivalStats && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <p className="text-orange-400 font-bold">{bustarStats.posicion}º</p>
              <p className="text-slate-400">Pos</p>
            </div>
            <div>
              <p className="text-slate-300 font-bold">
                {bustarStats.puntos} - {rivalStats.puntos}
              </p>
              <p className="text-slate-400">Puntos</p>
            </div>
            <div>
              <p className="text-slate-300 font-bold">{rivalStats.posicion}º</p>
              <p className="text-slate-400">Rival</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}