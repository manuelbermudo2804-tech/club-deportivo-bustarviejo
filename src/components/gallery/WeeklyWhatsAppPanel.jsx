import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, CalendarDays, Copy, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
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

export default function WeeklyWhatsAppPanel({ albums = [] }) {
  const [phone, setPhone] = useState(() => {
    try { return localStorage.getItem(PHONE_KEY) || ""; } catch { return ""; }
  });
  const [mode, setMode] = useState("schedule");
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [copied, setCopied] = useState(false);
  const today = new Date();
  const day = today.getDay();
  const daysToWednesday = (3 - day + 7) % 7;
  const nextWednesday = new Date(today);
  nextWednesday.setDate(today.getDate() + (daysToWednesday === 0 ? 0 : daysToWednesday));
  const nextWeekendStart = new Date(nextWednesday);
  nextWeekendStart.setDate(nextWednesday.getDate() + 2);
  const nextWeekendEnd = new Date(nextWednesday);
  nextWeekendEnd.setDate(nextWednesday.getDate() + 4);
  const weekendStartISO = dateISO(nextWeekendStart);
  const weekendEndISO = dateISO(nextWeekendEnd);

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["weeklyWhatsAppUpcoming"],
    queryFn: () => base44.entities.ProximoPartido.list("fecha_iso", 300),
  });
  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ["weeklyWhatsAppResults"],
    queryFn: () => base44.entities.Resultado.filter({ estado: "finalizado" }, "-fecha_actualizacion", 300),
  });

  const upcoming = useMemo(() => matches.filter(p => {
    const d = parseMatchDate(p);
    return p.jugado !== true && d && d >= weekendStartISO && d <= weekendEndISO;
  }).sort((a,b) => parseMatchDate(a).localeCompare(parseMatchDate(b))), [matches, weekendStartISO, weekendEndISO]);

  const recentResults = useMemo(() => {
    const start = new Date(today); start.setDate(today.getDate() - (day === 0 ? 6 : day === 1 ? 7 : day + 6));
    const end = new Date(today); end.setDate(today.getDate() - 1);
    const startISO = dateISO(start), endISO = dateISO(end);
    return results.filter(r => {
      const d = r.fecha_partido || "";
      return d && d >= startISO && d <= endISO;
    }).sort((a,b) => (a.categoria || "").localeCompare(b.categoria || ""));
  }, [results, today.getFullYear(), today.getMonth(), today.getDate(), day]);

  const photoOptions = useMemo(() => albums.flatMap(album =>
    (Array.isArray(album.fotos) ? album.fotos : []).map((foto, i) => ({
      id: `${album.id || album.titulo}-${i}`,
      url: foto?.url,
      title: album.titulo || "Álbum",
      category: album.categoria || "",
      date: album.fecha_evento || "",
    })).filter(f => typeof f.url === "string" && f.url.startsWith("https://"))
  ).filter(f => f.date >= weekendStartISO && f.date <= weekendEndISO || f.date >= dateISO(new Date(today.getFullYear(), today.getMonth(), today.getDate()-7)) && f.date <= dateISO(today)), [albums, weekendStartISO, weekendEndISO, today.getFullYear(), today.getMonth(), today.getDate()]);

  const scheduleText = useMemo(() => {
    const lines = ["🟠⚫ *C.D. BUSTARVIEJO | HORARIOS DEL FIN DE SEMANA* ⚽", ""];
    if (!upcoming.length) lines.push("Todavía no hay horarios registrados para este fin de semana.");
    else upcoming.forEach(p => {
      lines.push(`⚽ *${p.categoria || "Equipo"}*`);
      lines.push(`${p.local || ""} - ${p.visitante || ""}`.trim());
      lines.push(`📅 ${parseMatchDate(p)} · 🕒 ${p.hora || "Hora por confirmar"}`);
      if (p.campo) lines.push(`📍 ${p.campo}`);
      lines.push("");
    });
    lines.push("¡Mucha suerte a todos nuestros equipos! 💪", "🟠 ¡Vamos, Bustarviejo! ⚫");
    return lines.join("\n");
  }, [upcoming]);

  const resultsText = useMemo(() => {
    const lines = ["🟠⚫ *C.D. BUSTARVIEJO | RESULTADOS DE LA JORNADA* ⚽", ""];
    if (!recentResults.length) lines.push("Todavía no hay resultados finales registrados de la jornada.");
    else recentResults.forEach(r => {
      lines.push(`⚽ *${r.categoria || "Equipo"}*`);
      lines.push(`${r.local || r.equipo_local || "Bustarviejo"} ${r.goles_local ?? "—"} - ${r.goles_visitante ?? "—"} ${r.visitante || r.rival || ""}`);
      lines.push("");
    });
    const chosen = photoOptions.filter(f => selectedPhotos.includes(f.id));
    if (chosen.length) {
      lines.push("📸 *FOTOS DE ESTA JORNADA*");
      chosen.forEach(f => lines.push(`• ${f.title}${f.category ? " ("+f.category+")" : ""}: ${f.url}`));
      lines.push("");
    } else {
      lines.push("📸 Las fotos de los equipos se añadirán al seleccionar las imágenes de esta jornada.", "");
    }
    lines.push("¡Enhorabuena a todos por el esfuerzo! 🧡🖤");
    return lines.join("\n");
  }, [recentResults, photoOptions, selectedPhotos]);

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
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
      toast.success("Mensaje copiado");
    } catch { toast.error("No se ha podido copiar el mensaje en este dispositivo."); }
  };
  const togglePhoto = (id) => setSelectedPhotos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return <Card className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
    <CardHeader className="bg-emerald-50 border-b border-emerald-100">
      <CardTitle className="flex items-center gap-2 text-lg font-extrabold text-slate-900"><MessageCircle className="h-5 w-5 text-emerald-700"/> Comunicaciones semanales por WhatsApp</CardTitle>
      <p className="text-sm text-slate-600">Dos mensajes preparados desde la app. Revisa el contenido y confirma el envío en WhatsApp.</p>
    </CardHeader>
    <CardContent className="space-y-5 p-4 sm:p-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800" htmlFor="weekly-wa-phone">Número de destino (con prefijo internacional)</label>
        <Input id="weekly-wa-phone" value={phone} onChange={e => savePhone(e.target.value)} placeholder="34XXXXXXXXX" inputMode="tel" className="max-w-md"/>
        <p className="text-xs text-slate-500">Se guarda en este navegador. Escribe el prefijo 34 para España, sin necesidad de poner el signo +.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button variant={mode === "schedule" ? "default" : "outline"} onClick={() => setMode("schedule")} className={mode === "schedule" ? "bg-orange-600 hover:bg-orange-700" : ""}><CalendarDays className="mr-2 h-4 w-4"/> Miércoles · Horarios</Button>
        <Button variant={mode === "results" ? "default" : "outline"} onClick={() => setMode("results")} className={mode === "results" ? "bg-orange-600 hover:bg-orange-700" : ""}>🏆 Lunes · Resultados y fotos</Button>
      </div>
      {mode === "schedule" ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex items-center justify-between gap-2"><Badge>{loadingMatches ? "Cargando partidos…" : `${upcoming.length} partidos encontrados`}</Badge><span className="text-xs text-slate-500">{weekendStartISO} — {weekendEndISO}</span></div>
        <p className="text-sm text-slate-600">Se incluyen los partidos registrados entre viernes y domingo. Si falta un horario, se indicará como pendiente de confirmar.</p>
      </div> : <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><Badge>{loadingResults ? "Cargando resultados…" : `${recentResults.length} resultados encontrados`}</Badge><p className="mt-2 text-sm text-slate-600">Selecciona únicamente las fotos de la jornada actual. Las fotos no seleccionadas no se incluirán.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {photoOptions.map(f => <button type="button" key={f.id} onClick={() => togglePhoto(f.id)} className={`overflow-hidden rounded-xl border text-left ${selectedPhotos.includes(f.id) ? "border-emerald-600 ring-2 ring-emerald-200" : "border-slate-200"}`}>
            <img src={f.url} alt={f.title} className="h-28 w-full object-cover" loading="lazy"/>
            <span className="block p-2 text-xs font-medium text-slate-700">{selectedPhotos.includes(f.id) ? "✓ " : ""}{f.title}</span>
            <span className="block px-2 pb-2 text-[11px] text-slate-500">{f.category} · {f.date}</span>
          </button>)}
        </div>
        {photoOptions.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"><ImageIcon className="mr-1 inline h-4 w-4"/>No hay fotos fechadas en el periodo reciente. Puedes abrir la galería, subir el álbum de esta jornada y volver aquí.</p>}
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
