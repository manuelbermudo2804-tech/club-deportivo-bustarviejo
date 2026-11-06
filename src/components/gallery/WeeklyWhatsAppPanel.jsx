import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CalendarDays, Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const PHONE_KEY = "cdb_weekly_whatsapp_phone";
const dateISO = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,"0")}-${String(x.getDate()).padStart(2,"0")}`;
};
const parseMatchDate = (p) => p.fecha_iso || (p.fecha ? (() => {
  const m = String(p.fecha).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
})() : "");
const formatDate = (iso) => {
  if (!iso) return "Fecha por confirmar";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const addDaysISO = (iso, amount) => {
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + amount);
  return dateISO(date);
};

export default function WeeklyWhatsAppPanel({ albums = [] }) {
  const [phone, setPhone] = useState(() => {
    try { return localStorage.getItem(PHONE_KEY) || ""; } catch { return ""; }
  });
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [copied, setCopied] = useState(false);
  const todayISO = dateISO(new Date());
  const defaultStart = addDaysISO(todayISO, 1);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(addDaysISO(defaultStart, 6));
  const queryClient = useQueryClient();

  const { data: scheduleCaches = [], isLoading: loadingMatches, isFetching: refreshingMatches, refetch: refetchMatches } = useQuery({
    queryKey: ["weeklyWhatsAppCompetitionCache"],
    queryFn: () => base44.entities.CompetitionCache.filter({ tipo: "jornadas" }, "-updated_date", 100),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const refreshSchedule = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    toast("Consultando de nuevo el calendario…");
    try {
      await queryClient.invalidateQueries({ queryKey: ["weeklyWhatsAppCompetitionCache"], exact: true, refetchType: "none" });
      const result = await refetchMatches();
      if (result.error) throw result.error;
      toast.success(`Calendarios recargados: ${result.data?.length ?? 0} calendarios federativos consultados`);
    } catch (error) {
      console.error("Error actualizando horarios para WhatsApp:", error);
      toast.error("No se han podido actualizar los horarios. Inténtalo de nuevo.");
    }
  };

  // Fuente de horarios: calendarios federativos sincronizados (CompetitionCache).
  // Elegimos el último caché de cada categoría/competición para evitar registros duplicados
  // y no depender de ProximoPartido, que puede quedarse con horas antiguas o vacías.
  const allFuture = useMemo(() => {
    const latestByCompetition = new Map();
    for (const cache of scheduleCaches) {
      const key = `${cache.categoria || ""}::${cache.competicion || "Liga"}`;
      const stamp = cache.ultima_sync || cache.updated_date || cache.created_date || "";
      const previous = latestByCompetition.get(key);
      const previousStamp = previous?.ultima_sync || previous?.updated_date || previous?.created_date || "";
      if (!previous || String(stamp) >= String(previousStamp)) latestByCompetition.set(key, cache);
    }

    const seen = new Set();
    const upcoming = [];
    for (const cache of latestByCompetition.values()) {
      const jornadas = Array.isArray(cache.datos) ? cache.datos : (cache.datos?.jornadas || []);
      for (const jornada of jornadas) {
        for (const match of (jornada.matches || [])) {
          const teams = `${match.local || ""} ${match.visitante || ""}`;
          if (!/BUSTARVIEJO/i.test(teams) || /DESCANSA/i.test(teams) || match.jugado === true) continue;
          const iso = parseMatchDate(match);
          if (!iso || iso < todayISO) continue;

          const competition = cache.competicion || "Liga";
          const id = [cache.categoria, competition, jornada.jornada, iso, match.local, match.visitante].join("::");
          if (seen.has(id)) continue;
          seen.add(id);
          upcoming.push({
            ...match,
            id,
            categoria: cache.categoria || "Equipo",
            competicion: competition,
            jornada: jornada.jornada,
            fecha_iso: iso,
            _date: iso,
          });
        }
      }
    }
    return upcoming.sort((a,b) => a._date.localeCompare(b._date) || String(a.hora || "").localeCompare(String(b.hora || "")));
  }, [scheduleCaches, todayISO]);

  const inPeriod = useMemo(() => allFuture.filter(p =>
    periodStart && periodEnd && periodStart <= periodEnd && p._date >= periodStart && p._date <= periodEnd
  ), [allFuture, periodStart, periodEnd]);

  // Al cambiar el periodo, se marcan inicialmente todos los partidos que caen en él.
  useEffect(() => {
    setSelectedMatchIds(inPeriod.map(p => p.id).filter(Boolean));
  }, [periodStart, periodEnd, allFuture]);

  const selectedMatches = useMemo(() => inPeriod.filter(p => selectedMatchIds.includes(p.id)), [inPeriod, selectedMatchIds]);

  const scheduleText = useMemo(() => {
    const lines = [`🟠⚫ *C.D. BUSTARVIEJO | PARTIDOS DEL ${formatDate(periodStart)} AL ${formatDate(periodEnd)}* ⚽`, ""];
    if (!selectedMatches.length) lines.push("No hay partidos seleccionados para este periodo. Revisa las fechas o marca los encuentros que quieras anunciar.");
    else selectedMatches.forEach(p => {
      lines.push(`⚽ *${p.categoria || "Equipo"}*${p.competicion && p.competicion !== "Liga" ? ` · ${p.competicion}` : ""}`);
      lines.push(`${p.local || ""} - ${p.visitante || ""}`.trim());
      lines.push(`📅 ${formatDate(p._date)} · 🕒 ${p.hora || "Hora por confirmar"}`);
      if (p.campo) lines.push(`📍 ${p.campo}`);
      lines.push("");
    });
    lines.push("¡Mucha suerte a todos nuestros equipos! 💪", "🟠 ¡Vamos, Bustarviejo! ⚫");
    return lines.join("\n");
  }, [selectedMatches, periodStart, periodEnd]);

  const message = scheduleText;
  const savePhone = (value) => {
    setPhone(value);
    try { localStorage.setItem(PHONE_KEY, value); } catch {}
  };
  const openWhatsApp = () => {
    const normalized = phone.replace(/\D/g, "");
    if (!normalized) { toast.error("Introduce el número de teléfono con prefijo de país (por ejemplo, 34XXXXXXXXX)."); return; }
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success("Mensaje copiado");
    } catch { toast.error("No se ha podido copiar el mensaje en este dispositivo."); }
  };
  const toggleMatch = (id) => setSelectedMatchIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return <Card className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
    <CardHeader className="bg-emerald-50 border-b border-emerald-100">
      <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><MessageCircle className="h-5 w-5 text-emerald-700"/> Comunicaciones por WhatsApp</CardTitle>
      <p className="text-sm text-slate-600">Prepara el mensaje, revisa los partidos y confirma el envío en WhatsApp.</p>
    </CardHeader>
    <CardContent className="space-y-5 p-4 sm:p-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="weekly-wa-phone">Número de destino (con prefijo internacional)</label>
        <Input id="weekly-wa-phone" value={phone} onChange={e => savePhone(e.target.value)} placeholder="34XXXXXXXXX" inputMode="tel" className="max-w-md"/>
        <p className="text-xs text-slate-500">Se guarda en este navegador. Escribe el prefijo 34 para España, sin necesidad de poner el signo +.</p>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm font-semibold text-orange-900"><CalendarDays className="h-5 w-5"/> Calendario y horarios</div>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-800">1. Elige el periodo que quieres anunciar</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="wa-period-start" className="mb-1 block text-xs font-medium text-slate-600">Desde</label><Input id="wa-period-start" type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}/></div>
            <div><label htmlFor="wa-period-end" className="mb-1 block text-xs font-medium text-slate-600">Hasta</label><Input id="wa-period-end" type="date" min={periodStart} value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}/></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => {setPeriodStart(defaultStart);setPeriodEnd(addDaysISO(defaultStart,6));}}>Próximos 7 días</Button><Button size="sm" variant="outline" onClick={() => {setPeriodStart(todayISO);setPeriodEnd(addDaysISO(todayISO,13));}}>Próximas 2 semanas</Button></div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">2. Marca los partidos que quieras incluir</p><div className="flex flex-wrap items-center gap-2"><Badge>{loadingMatches ? "Cargando calendario…" : `${allFuture.length} partidos futuros · ${inPeriod.length} en el periodo`}</Badge><Button type="button" size="sm" variant="outline" onClick={refreshSchedule} disabled={false} className="relative z-10 pointer-events-auto cursor-pointer gap-1.5 border-orange-300 bg-white hover:bg-orange-50 active:scale-[0.98]"><RefreshCw className={`h-3.5 w-3.5 ${refreshingMatches ? "animate-spin" : ""}`}/>{refreshingMatches ? "Actualizando…" : "Actualizar horarios"}</Button></div></div>
          <p className="mb-3 text-sm text-slate-600">Los horarios se leen del último calendario federativo sincronizado de cada categoría y competición. Selecciona los que vas a anunciar; las horas pendientes de confirmar aparecerán como «Hora por confirmar».</p>
          {periodStart > periodEnd && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">La fecha de inicio debe ser anterior o igual a la fecha final.</p>}
          {inPeriod.length === 0 && periodStart <= periodEnd && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay partidos futuros registrados en este periodo. Comprueba el calendario y si los encuentros aplazados tienen ya una nueva fecha asignada.</p>}
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {inPeriod.map(p => <label key={p.id || `${p.categoria}-${p._date}-${p.local}-${p.visitante}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" checked={selectedMatchIds.includes(p.id)} onChange={() => toggleMatch(p.id)} disabled={!p.id}/>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{p.categoria || "Equipo"}{p.competicion && p.competicion !== "Liga" ? ` · ${p.competicion}` : ""} · {formatDate(p._date)}</span><span className="block text-sm text-slate-700">{p.local || "Local por confirmar"} — {p.visitante || "Visitante por confirmar"}</span><span className="block text-xs text-slate-500">{p.hora || "Hora por confirmar"}{p.campo ? ` · ${p.campo}` : ""}</span></span>
            </label>)}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">Vista previa del mensaje</label>
        <textarea readOnly value={message} rows={12} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800"/>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={openWhatsApp} className="bg-emerald-600 font-bold text-white hover:bg-emerald-700"><ExternalLink className="mr-2 h-4 w-4"/>Abrir WhatsApp con el mensaje</Button>
          <Button variant="outline" onClick={copyMessage}>{copied ? <Check className="mr-2 h-4 w-4"/> : <Copy className="mr-2 h-4 w-4"/>}{copied ? "Copiado" : "Copiar mensaje"}</Button>
        </div>
      </div>
    </CardContent>
  </Card>;
}