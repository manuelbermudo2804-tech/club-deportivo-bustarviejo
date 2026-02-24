import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Users, AlertCircle, Loader2 } from "lucide-react";

function PlayerList({ players, teamName }) {
  if (!players || players.length === 0) return null;
  const titulares = players.filter(p => p.titular);
  const suplentes = players.filter(p => !p.titular);

  return (
    <div>
      <h4 className="font-bold text-sm text-slate-800 mb-1.5 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-orange-600" />
        {teamName}
      </h4>
      {titulares.length > 0 && (
        <div className="mb-1">
          <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Titulares</p>
          <div className="flex flex-wrap gap-1">
            {titulares.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-slate-100 rounded-lg px-1.5 py-0.5 text-xs">
                <span className="font-bold text-orange-700 text-[10px]">{p.dorsal}</span>
                <span className="text-slate-700">{p.nombre}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {suplentes.length > 0 && (
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-semibold mb-0.5">Suplentes</p>
          <div className="flex flex-wrap gap-1">
            {suplentes.map((p, i) => (
              <span key={i} className="inline-flex items-center gap-1 bg-slate-50 rounded-lg px-1.5 py-0.5 text-xs text-slate-500">
                <span className="font-bold text-[10px]">{p.dorsal}</span>
                <span>{p.nombre}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GoalsList({ goles }) {
  if (!goles || goles.length === 0) return null;
  return (
    <div>
      <h4 className="font-bold text-sm text-slate-800 mb-1.5">⚽ Goles</h4>
      <div className="space-y-1">
        {goles.map((g, i) => (
          <div key={i} className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-2 py-1">
            <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">{g.minuto}'</Badge>
            <span className="font-medium text-slate-800">{g.jugador}</span>
            {g.equipo && <Badge variant="outline" className="text-[10px] ml-auto">{g.equipo}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardsList({ tarjetas }) {
  if (!tarjetas || tarjetas.length === 0) return null;
  return (
    <div>
      <h4 className="font-bold text-sm text-slate-800 mb-1.5">🟨 Tarjetas</h4>
      <div className="space-y-1">
        {tarjetas.map((t, i) => {
          const color = t.tipo === 'roja' ? 'bg-red-50 border-red-200' : t.tipo === 'doble_amarilla' ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200';
          const emoji = t.tipo === 'roja' ? '🟥' : t.tipo === 'doble_amarilla' ? '🟧' : '🟨';
          return (
            <div key={i} className={`flex items-center gap-2 text-xs ${color} border rounded-lg px-2 py-1`}>
              <span>{emoji}</span>
              {t.minuto && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.minuto}'</Badge>}
              <span className="font-medium text-slate-800">{t.jugador}</span>
              {t.equipo && <Badge variant="outline" className="text-[10px] ml-auto">{t.equipo}</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubsList({ cambios }) {
  if (!cambios || cambios.length === 0) return null;
  return (
    <div>
      <h4 className="font-bold text-sm text-slate-800 mb-1.5">🔄 Cambios</h4>
      <div className="space-y-1">
        {cambios.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 flex-wrap">
            {c.minuto && <Badge className="bg-blue-600 text-white text-[10px] px-1.5 py-0">{c.minuto}'</Badge>}
            <span className="text-red-600">▼ {c.sale}</span>
            <span className="text-slate-400">→</span>
            <span className="text-green-600">▲ {c.entra}</span>
            {c.equipo && <Badge variant="outline" className="text-[10px] ml-auto">{c.equipo}</Badge>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchReportModal({ open, onClose, resultado }) {
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const resultadoId = resultado?.id;
  const actaUrl = resultado?.acta_url;

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ['match_report', resultadoId],
    queryFn: () => base44.entities.MatchReport.filter({ resultado_id: resultadoId }),
    enabled: !!resultadoId && open,
    staleTime: 5 * 60_000,
  });

  const report = reports[0] || null;

  const handleScrape = async () => {
    setScraping(true);
    setScrapeError(null);
    try {
      const res = await base44.functions.invoke('rffmFetchMatchReport', {
        acta_url: actaUrl,
        resultado_id: resultadoId,
        categoria: resultado.categoria,
        temporada: resultado.temporada,
        jornada: resultado.jornada,
        local: resultado.local,
        visitante: resultado.visitante,
        goles_local: resultado.goles_local,
        goles_visitante: resultado.goles_visitante,
      });
      if (res.data?.error) {
        setScrapeError(res.data.error);
      } else {
        await refetch();
      }
    } catch (e) {
      setScrapeError(e?.response?.data?.error || e.message || 'Error al obtener ficha');
    } finally {
      setScraping(false);
    }
  };

  // Auto-trigger scrape when modal opens and no report exists yet
  React.useEffect(() => {
    if (open && !isLoading && !report && actaUrl && !scraping && !autoTriggered && !scrapeError) {
      setAutoTriggered(true);
      handleScrape();
    }
  }, [open, isLoading, report, actaUrl, autoTriggered]);

  // Reset auto-trigger when modal closes
  React.useEffect(() => {
    if (!open) {
      setAutoTriggered(false);
      setScrapeError(null);
    }
  }, [open]);

  const hasScore = Number.isFinite(resultado?.goles_local) && Number.isFinite(resultado?.goles_visitante);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header con resultado */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-t-lg">
          <DialogTitle className="sr-only">Ficha del Partido</DialogTitle>
          <div className="text-center">
            {report?.fecha && <p className="text-xs text-slate-400 mb-1">📅 {report.fecha} — {report.hora || ''}</p>}
            {report?.arbitro && <p className="text-xs text-slate-400 mb-2">🏁 Árbitro: {report.arbitro}</p>}
            {report?.campo && <p className="text-xs text-slate-400 mb-2">🏟️ {report.campo}</p>}
            
            <div className="flex items-center justify-center gap-3 my-2">
              <div className="text-right flex-1">
                <p className={`text-sm font-bold ${/bustarviejo/i.test(resultado?.local) ? 'text-orange-400' : ''}`}>
                  {resultado?.local}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 min-w-[70px]">
                <p className="text-2xl font-black">
                  {hasScore ? `${resultado.goles_local} - ${resultado.goles_visitante}` : 'vs'}
                </p>
              </div>
              <div className="text-left flex-1">
                <p className={`text-sm font-bold ${/bustarviejo/i.test(resultado?.visitante) ? 'text-orange-400' : ''}`}>
                  {resultado?.visitante}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Badge className="bg-orange-600 text-white text-[10px]">J{resultado?.jornada}</Badge>
              <span>{resultado?.temporada}</span>
              <span>{resultado?.categoria}</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
              <span className="ml-2 text-sm text-slate-600">Cargando ficha...</span>
            </div>
          )}

          {!isLoading && !report && (
            <div className="text-center py-6 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-500">
                {actaUrl ? 'Ficha no descargada aún' : 'No hay ficha disponible para este partido'}
              </p>
              {actaUrl && (
                <Button 
                  onClick={handleScrape} 
                  disabled={scraping}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {scraping ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Descargando ficha...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" /> Descargar ficha de la RFFM</>
                  )}
                </Button>
              )}
              {scrapeError && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {scrapeError}
                </div>
              )}
            </div>
          )}

          {report && (
            <>
              {/* Goles */}
              <GoalsList goles={report.goles} />
              
              {/* Tarjetas */}
              <CardsList tarjetas={report.tarjetas} />
              
              {/* Cambios */}
              <SubsList cambios={report.cambios} />

              {/* Alineaciones */}
              <PlayerList players={report.alineacion_local} teamName={resultado?.local || 'Local'} />
              <PlayerList players={report.alineacion_visitante} teamName={resultado?.visitante || 'Visitante'} />

              {/* Re-download button */}
              {actaUrl && (
                <div className="text-center pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleScrape} 
                    disabled={scraping}
                    className="text-xs"
                  >
                    {scraping ? (
                      <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Actualizando...</>
                    ) : (
                      '🔄 Volver a descargar ficha'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}