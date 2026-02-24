import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Extracts intranet params from a public rffm.es URL.
 * Public URL has: competicion, grupo, temporada, tipojuego
 * Intranet needs: CodCompeticion, CodGrupo, CodTemporada, cod_primaria
 */
function buildIntranetUrl(publicUrl) {
  if (!publicUrl) return null;
  // If the URL is already an intranet URL, use it directly
  if (publicUrl.includes("intranet.ffmadrid.es")) return publicUrl;
  // Otherwise convert from public rffm.es URL
  const u = new URL(publicUrl);
  const comp = u.searchParams.get("competicion");
  const grupo = u.searchParams.get("grupo");
  const temp = u.searchParams.get("temporada");
  if (!comp || !grupo || !temp) return null;
  return `https://intranet.ffmadrid.es/nfg/NPcd/NFG_VisClasificacion?cod_primaria=1000128&CodCompeticion=${comp}&CodGrupo=${grupo}&CodTemporada=${temp}`;
}

/**
 * RffmImportButton - Imports data from RFFM scraper
 * @param {string} type - 'standings' | 'results' | 'scorers'
 * @param {object} config - StandingsConfig record with rfef_url, rfef_results_url, rfef_scorers_url
 * @param {string} category - current category name
 * @param {function} onDataReady - callback with the imported data formatted for the review table
 */
export default function RffmImportButton({ type, config, category, onDataReady }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

  // Choose the right public URL based on type
  const publicUrl =
    type === "standings" ? config?.rfef_url :
    type === "results" ? config?.rfef_results_url :
    type === "scorers" ? config?.rfef_scorers_url : null;

  const intranetUrl = publicUrl ? buildIntranetUrl(publicUrl) : null;

  const handleImport = async () => {
    if (!intranetUrl) {
      toast.error(`No hay URL configurada de ${type === "standings" ? "clasificación" : type === "results" ? "resultados" : "goleadores"} para ${category}`);
      return;
    }

    setLoading(true);
    setProgress("Conectando con RFFM...");

    try {
      if (type === "standings") {
        setProgress("Descargando clasificación...");
        const res = await base44.functions.invoke("rffmScraper", {
          action: "standings",
          url: intranetUrl,
        });
        const standings = res.data?.standings;
        if (!standings?.length) {
          toast.error("No se encontraron datos de clasificación");
          return;
        }

        // Get current season string
        const now = new Date();
        const y = now.getFullYear();
        const temporada = now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

        // Try to detect jornada from existing data or URL
        const urlParams = new URL(publicUrl);
        const jornadaFromUrl = parseInt(urlParams.searchParams.get("jornada")) || standings.length;
        // Use the number of PJ of the first team as a better estimate
        const jornadaEstimate = standings[0]?.pj || jornadaFromUrl;

        // Format for ReviewStandingsTable
        const formatted = {
          temporada,
          categoria: category,
          jornada: jornadaEstimate,
          standings: standings.map((s) => ({
            posicion: s.posicion,
            nombre_equipo: s.equipo,
            puntos: s.puntos,
            partidos_jugados: s.pj,
            ganados: s.pg,
            empatados: s.pe,
            perdidos: s.pp,
            goles_favor: s.gf,
            goles_contra: s.gc,
          })),
        };

        toast.success(`${standings.length} equipos importados`);
        onDataReady(formatted);

      } else if (type === "results") {
        setProgress("Descargando todas las jornadas...");
        const res = await base44.functions.invoke("rffmScraper", {
          action: "all_results",
          url: intranetUrl,
        });

        const jornadas = res.data?.jornadas;
        if (!jornadas?.length) {
          toast.error("No se encontraron resultados");
          return;
        }

        const now = new Date();
        const y = now.getFullYear();
        const temporada = now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

        // Find the latest jornada that has played matches
        const playedJornadas = jornadas.filter(j => j.matches.some(m => m.jugado));
        const latestPlayed = playedJornadas.length ? playedJornadas[playedJornadas.length - 1] : jornadas[jornadas.length - 1];

        // Format for ReviewResultsTable - use the latest played jornada
        const formatted = {
          temporada,
          categoria: category,
          jornada: latestPlayed.jornada,
          matches: latestPlayed.matches.map((m) => ({
            local: m.local,
            visitante: m.visitante,
            goles_local: m.goles_local,
            goles_visitante: m.goles_visitante,
          })),
        };

        const totalPlayed = res.data?.summary?.played || 0;
        toast.success(`Jornada ${latestPlayed.jornada}: ${latestPlayed.matches.length} partidos (${totalPlayed} jugados en total)`);
        onDataReady(formatted);

      } else if (type === "scorers") {
        setProgress("Descargando goleadores...");
        const res = await base44.functions.invoke("rffmScraper", {
          action: "scorers",
          url: intranetUrl,
        });

        const scorers = res.data?.scorers;
        if (!scorers?.length) {
          toast.error("No se encontraron goleadores");
          return;
        }

        const now = new Date();
        const y = now.getFullYear();
        const temporada = now.getMonth() >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

        // Format for ReviewScorersTable
        const formatted = {
          temporada,
          categoria: category,
          players: scorers.map((s) => ({
            jugador_nombre: s.jugador,
            equipo: s.equipo,
            goles: s.goles,
          })),
        };

        toast.success(`${scorers.length} goleadores importados`);
        onDataReady(formatted);
      }
    } catch (err) {
      console.error("RFFM import error:", err);
      toast.error(`Error al importar: ${err.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  if (!publicUrl) {
    return (
      <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200 text-sm text-yellow-800">
        ⚠️ No hay URL de RFFM configurada para <strong>{category}</strong> ({type === "standings" ? "clasificación" : type === "results" ? "resultados" : "goleadores"}). Configúrala arriba primero.
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-xl p-4 border-2 border-green-300 space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-green-900 flex items-center gap-2">
            🤖 Importar de RFFM
            <Badge className="bg-green-100 text-green-700">Automático</Badge>
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            Descarga los datos directamente desde la web de la federación
          </p>
        </div>
        <Button
          onClick={handleImport}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress || "Importando..."}
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Importar {type === "standings" ? "Clasificación" : type === "results" ? "Resultados" : "Goleadores"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}