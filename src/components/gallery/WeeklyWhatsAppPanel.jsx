import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CalendarDays, Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const PHONE_KEY = "cdb_weekly_whatsapp_phone";
const COMMUNICATED_MATCHES_KEY = "cdb_weekly_whatsapp_communicated_matches";
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
  const [mode, setMode] = useState("schedule");
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState([]);
  const [communicatedMatches, setCommunicatedMatches] = useState(() => {
    try { return JSON.parse(localStorage.getItem(COMMUNICATED_MATCHES_KEY) || "[]"); } catch { return []; }
  });
  const [copied, setCopied] = useState(false);
  const todayISO = dateISO(new Date());
  const defaultStart = addDaysISO(todayISO, 1);
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(addDaysISO(defaultStart, 6));
  const today = new Date();
  const day = today.getDay();

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["weeklyWhatsAppUpcoming"],
    queryFn: () => base44.entities.ProximoPartido.list("fecha_iso", 500),
  });
  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ["weeklyWhatsAppResults"],
    queryFn: () => base44.entities.Resultado.filter({ estado: "finalizado" }, "-fecha_actualizacion", 300),
  });

  // Descubrimiento: mantenemos a la vista todos los encuentros futuros registrados.
  const allFuture = useMemo(() => matches
    .map(p => ({ ...p, _date: parseMatchDate(p) }))
    .filter(p => p.jugado !== true && p._date && p._date >= todayISO)
    .sort((a,b) => a._date.localeCompare(b._date) || String(a.hora || "").localeCompare(String(b.hora || ""))),
  [matches, todayISO]);

  const inPeriod = useMemo(() => allFuture.filter(p =>
    periodStart && periodEnd && periodStart <= periodEnd && p._date >= periodStart && p._date <= periodEnd
  ), [allFuture, periodStart, periodEnd]);

  // Al cambiar el periodo, se marcan inicialmente todos los partidos que caen en él.
  useEffect(() => {
    setSelectedMatchIds(inPeriod.map(p => p.id).filter(Boolean));
  }, [periodStart, periodEnd, matches]);

  const selectedMatches = useMemo(() => inPeriod.filter(p => selectedMatchIds.includes(p.id)), [inPeriod, selectedMatchIds]);

  const pastCommunicatedMatches = useMemo(
    () => communicatedMatches.filter(p => p.fecha_iso && p.fecha_iso < todayISO),
    [communicatedMatches, todayISO]
  );

  const recentResults = useMemo(() => {
    const toISO = (raw) => {
      const m = String(raw || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      return m ? `${m[3]}-${m[2]}-${m[1]}` : String(raw || "");
    };
    if (!pastCommunicatedMatches.length) return [];
    return results.filter(r => r.estado === "finalizado" && pastCommunicatedMatches.some(p =>
      (r.categoria || "").trim().toLowerCase() === (p.categoria || "").trim().toLowerCase() &&
      toISO(r.fecha_partido) === p.fecha_iso &&
      (r.local || "").trim().toLowerCase() === (p.local || "").trim().toLowerCase() &&
      (r.visitante || "").trim().toLowerCase() === (p.visitante || "").trim().toLowerCase()
    )).sort((a,b) => (a.categoria || "").localeCompare(b.categoria || ""));
  }, [results, pastCommunicatedMatches]);

  // El mensaje semanal usa las fotos de los álbumes de los últimos 7 días,
  // agrupadas por fecha del partido/evento y equipo (categoría), sin vincularlas
  // a la lista de partidos comunicados.
  const photoOptions = useMemo(() => {
    const cutoff = addDaysISO(todayISO, -6);
    return [...albums]
      .filter(album => {
        const date = String(album.fecha_evento || "").slice(0, 10);
        return date && date >= cutoff && date <= todayISO;
      })
      .sort((a, b) => String(b.fecha_evento || "").localeCompare(String(a.fecha_evento || "")) || String(a.categoria || "").localeCompare(String(b.categoria || "")))
      .flatMap(album => (Array.isArray(album.fotos) ? album.fotos : []).map((foto, i) => ({
        id: `${album.id || album.titulo}-${i}`,
        url: foto?.url,
        title: album.titulo || "Álbum",
        category: album.categoria || "Equipo sin categoría",
        date: album.fecha_evento || "",
      })).filter(f => typeof f.url === "string" && f.url.startsWith("https://")));
  }, [albums, todayISO]);

  const scheduleText = useMemo(() => {
    const lines = [`🟠⚫ *C.D. BUSTARVIEJO | PARTIDOS DEL ${formatDate(periodStart)} AL ${formatDate(periodEnd)}* ⚽`, ""];
    if (!selectedMatches.length) lines.push("No hay partidos seleccionados para este periodo. Revisa las fechas o marca los encuentros que quieras anunciar.");
    else selectedMatches.forEach(p => {
      lines.push(`⚽ *${p.categoria || "Equipo"}*`);
      lines.push(`${p.local || ""} - ${p.visitante || ""}`.trim());
      lines.push(`📅 ${formatDate(p._date)} · 🕒 ${p.hora || "Hora por confirmar"}`);
      if (p.campo) lines.push(`📍 ${p.campo}`);
      lines.push("");
    });
    lines.push("¡Mucha suerte a todos nuestros equipos! 💪", "🟠 ¡Vamos, Bustarviejo! ⚫");
    return lines.join("\n");
  }, [selectedMatches, periodStart, periodEnd]);

  const resultsText = useMemo(() => {
    const lines = ["🟠⚫ *C.D. BUSTARVIEJO | RESULTADOS DE LOS PARTIDOS COMUNICADOS* ⚽", ""];
    if (!pastCommunicatedMatches.length) lines.push("No hay partidos anteriores marcados como comunicados. En Horarios, selecciona los encuentros y pulsa «Marcar como comunicados» después de enviarlos por WhatsApp.");
    else if (!recentResults.length) lines.push("Todavía no hay resultados finales registrados para los partidos que marcaste como comunicados.");
    else recentResults.forEach(r => {
      lines.push(`⚽ *${r.categoria || "Equipo"}*`);
      lines.push(`${r.local || r.equipo_local || "Bustarviejo"} ${r.goles_local ?? "—"} - ${r.goles_visitante ?? "—"} ${r.visitante || r.rival || ""}`);
      lines.push("");
    });
    const chosen = photoOptions.filter(f => selectedPhotos.includes(f.id));
    if (chosen.length) {
      lines.push("📸 *ÚLTIMAS FOTOS POR FECHA Y EQUIPO*");
      chosen.forEach(f => lines.push(`• ${f.title}${f.category ? " ("+f.category+")" : ""}: ${f.url}`));
      lines.push("");
    } else {
      lines.push("📸 Las fotos de los equipos se añadirán al seleccionar las imágenes de esta jornada.", "");
    }
    lines.push("¡Enhorabuena a todos por el esfuerzo! 🧡🖤");
    return lines.join("\n");
  }, [recentResults, photoOptions, selectedPhotos, pastCommunicatedMatches]);

  const message = mode === "schedule" ? scheduleText : resultsText;
  const savePhone = (value) => {
    setPhone(value);
    try { localStorage.setItem(PHONE_KEY, value); } catch {}
  };
  const openWhatsApp = () => {
    const normalized = phone.replace(/\D/g, "");
    if (!normalized) { toast.error("Introduce el número de teléfono con prefijo de país (por ejemplo, 34XXXXXXXXX)."); return; }
    window.open(`https://wa.me/${normalized}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };
  const markSelectedAsCommunicated = () => {
    if (!selectedMatches.length) { toast.error("Selecciona al menos un partido."); return; }
    const existing = communicatedMatches.filter(old => !selectedMatches.some(p => p.id === old.id));
    const marked = selectedMatches.map(p => ({ id: p.id, categoria: p.categoria || "", local: p.local || "", visitante: p.visitante || "", fecha_iso: p._date, hora: p.hora || "", campo: p.campo || "", marked_at: new Date().toISOString() }));
    const next = [...existing, ...marked].sort((a,b) => a.fecha_iso.localeCompare(b.fecha_iso));
    setCommunicatedMatches(next);
    try { localStorage.setItem(COMMUNICATED_MATCHES_KEY, JSON.stringify(next)); } catch {}
    toast.success(`${marked.length} partido(s) marcados como comunicados`);
  };
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success("Mensaje copiado");
    } catch { toast.error("No se ha podido copiar el mensaje en este dispositivo."); }
  };
  const togglePhoto = (id) => setSelectedPhotos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant={mode === "schedule" ? "default" : "outline"} onClick={() => setMode("schedule")} className={mode === "schedule" ? "bg-orange-600 hover:bg-orange-700" : ""}><CalendarDays className="mr-2 h-4 w-4"/> Calendario y horarios</Button>
        <Button variant={mode === "results" ? "default" : "outline"} onClick={() => setMode("results")} className={mode === "results" ? "bg-orange-600 hover:bg-orange-700" : ""}>🏆 Lunes · Resultados y fotos</Button>
      </div>
      {mode === "schedule" ? <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-semibold text-slate-800">1. Elige el periodo que quieres anunciar</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label htmlFor="wa-period-start" className="mb-1 block text-xs font-medium text-slate-600">Desde</label><Input id="wa-period-start" type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}/></div>
            <div><label htmlFor="wa-period-end" className="mb-1 block text-xs font-medium text-slate-600">Hasta</label><Input id="wa-period-end" type="date" min={periodStart} value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}/></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => {setPeriodStart(defaultStart);setPeriodEnd(addDaysISO(defaultStart,6));}}>Próximos 7 días</Button><Button size="sm" variant="outline" onClick={() => {setPeriodStart(todayISO);setPeriodEnd(addDaysISO(todayISO,13));}}>Próximas 2 semanas</Button></div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">2. Marca los partidos que quieras incluir</p><Badge>{loadingMatches ? "Cargando calendario…" : `${allFuture.length} partidos futuros · ${inPeriod.length} en el periodo`}</Badge></div>
          <p className="mb-3 text-sm text-slate-600">La app consulta todos los partidos futuros. Selecciona los que vas a anunciar; después de enviarlos en WhatsApp, pulsa «Marcar selección como comunicada» para que el mensaje del lunes solo tenga en cuenta estos encuentros.</p>
          {periodStart > periodEnd && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">La fecha de inicio debe ser anterior o igual a la fecha final.</p>}
          {inPeriod.length === 0 && periodStart <= periodEnd && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No hay partidos futuros registrados en este periodo. Comprueba el calendario y si los encuentros aplazados tienen ya una nueva fecha asignada.</p>}
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {inPeriod.map(p => <label key={p.id || `${p.categoria}-${p._date}-${p.local}-${p.visitante}`} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-orange-600" checked={selectedMatchIds.includes(p.id)} onChange={() => toggleMatch(p.id)} disabled={!p.id}/>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{p.categoria || "Equipo"} · {formatDate(p._date)}</span><span className="block text-sm text-slate-700">{p.local || "Local por confirmar"} — {p.visitante || "Visitante por confirmar"}</span><span className="block text-xs text-slate-500">{p.hora || "Hora por confirmar"}{p.campo ? ` · ${p.campo}` : ""}</span></span>
            </label>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2"><Button onClick={markSelectedAsCommunicated} variant="outline" className="border-orange-300 text-orange-800 hover:bg-orange-50">✓ Marcar selección como comunicada</Button><Badge>{communicatedMatches.length} partidos marcados como comunicados</Badge></div>

      </div> : <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><Badge>{loadingResults ? "Cargando resultados…" : `${recentResults.length} resultados de partidos comunicados`}</Badge><p className="mt-2 text-sm text-slate-600">Los resultados corresponden a los partidos marcados como comunicados. Las fotos se muestran por fecha y equipo, usando los álbumes de los últimos 7 días.</p><p className="mt-1 text-xs text-slate-500">{pastCommunicatedMatches.length} partidos comunicados anteriores guardados en este navegador.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photoOptions.map(f => <button type="button" key={f.id} onClick={() => togglePhoto(f.id)} className={`overflow-hidden rounded-xl border text-left ${selectedPhotos.includes(f.id) ? "border-emerald-600 ring-2 ring-emerald-200" : "border-slate-200"}`}>
            <img src={f.url} alt={f.title} className="h-28 w-full object-cover" loading="lazy"/>
            <span className="block p-2 text-xs font-medium text-slate-700">{selectedPhotos.includes(f.id) ? "✓ " : ""}{f.title}</span>
            <span className="block px-2 pb-2 text-[11px] text-slate-500">{f.category} · {f.date}</span>
          </button>)}
        </div>
        {photoOptions.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><ImageIcon className="mr-1 inline h-4 w-4"/>{"No hay fotos en álbumes de los últimos 7 días. Comprueba la fecha del álbum y su equipo."}</p>}
      </div>}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800">Vista previa del mensaje</label>
        <textarea readOnly value={message} rows={12} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800"/>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={openWhatsApp} className="bg-emerald-600 font-bold text-white hover:bg-emerald-700"><ExternalLink className="mr-2 h-4 w-4"/>Abrir WhatsApp con el mensaje</Button>
          <Button variant="outline" onClick={copyMessage}>{copied ? <Check className="mr-2 h-4 w-4"/> : <Copy className="mr-2 h-4 w-4"/>}{copied ? "Copiado" : "Copiar mensaje"}</Button>
        </div>
        <p className="text-xs text-slate-500">WhatsApp no permite adjuntar fotos mediante un enlace de texto. El mensaje incluye enlaces a las fotos seleccionadas; para enviarlas como archivos adjuntos tendrás que añadirlas dentro de WhatsApp antes de pulsar enviar.</p>
      </div>
    </CardContent>
  </Card>;
}