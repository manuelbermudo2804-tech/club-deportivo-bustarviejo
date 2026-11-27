import React, { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import moment from "moment";
import { Download, ExternalLink, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 4;
const CLUB_SHIELD = "https://www.cdbustarviejo.com/img/escudo.png";

function formatDay(date) {
  const parsed = moment(date, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
  return parsed.isValid() ? parsed.format("ddd D MMM").toUpperCase() : "FECHA POR CONFIRMAR";
}

export default function WeekendMatchesGraphic({ matches = [], weekendLabel = "" }) {
  const [page, setPage] = useState(0);
  const [caption, setCaption] = useState("⚽ ¡Este fin de semana vuelve el fútbol! Aquí tienes los horarios de nuestros equipos. ¡Vamos Bustarviejo! 🧡🖤");
  const [generating, setGenerating] = useState(false);
  const graphicRef = useRef(null);

  const pages = useMemo(() => {
    const result = [];
    for (let i = 0; i < matches.length; i += PAGE_SIZE) result.push(matches.slice(i, i + PAGE_SIZE));
    return result;
  }, [matches]);

  const currentMatches = pages[page] || [];
  const captureImage = async () => {
    if (!graphicRef.current) throw new Error("No se encuentra la vista previa.");
    const width = graphicRef.current.offsetWidth;
    return html2canvas(graphicRef.current, {
      backgroundColor: "#0b1220",
      scale: 1200 / width,
      useCORS: true,
      logging: false,
    });
  };

  const downloadImage = async () => {
    setGenerating(true);
    try {
      const canvas = await captureImage();
      const link = document.createElement("a");
      link.download = `CD-Bustarviejo-partidos-${page + 1}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagen descargada. Ya puedes adjuntarla en X.");
    } catch (error) {
      toast.error(error?.message || "No se pudo generar la imagen.");
    } finally {
      setGenerating(false);
    }
  };

  const openX = () => {
    if (!caption.trim()) {
      toast.error("Escribe un comentario para acompañar la imagen.");
      return;
    }
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(caption.trim())}`, "_blank", "noopener,noreferrer");
  };

  if (!matches.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="font-bold text-slate-900">📅 No hay partidos cargados para este fin de semana.</p>
        <p className="mt-1 text-sm text-slate-700">Cuando el calendario tenga encuentros publicados, aquí podrás crear la imagen automáticamente.</p>
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-orange-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-slate-900"><ImageIcon className="h-4 w-4 text-orange-600" /> Imagen de horarios para redes</p>
          <p className="mt-1 text-xs text-slate-600">Lista preparada con los partidos del calendario del club.</p>
        </div>
        {pages.length > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(v => Math.max(0, v - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-bold text-slate-600">{page + 1} / {pages.length}</span>
            <button type="button" onClick={() => setPage(v => Math.min(pages.length - 1, v + 1))} disabled={page === pages.length - 1} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <div className="w-full overflow-hidden rounded-xl shadow-lg">
        <div
          ref={graphicRef}
          style={{
            width: "100%",
            aspectRatio: "16 / 9",
            boxSizing: "border-box",
            overflow: "hidden",
            padding: "3.2%",
            display: "flex",
            flexDirection: "column",
            color: "#fff",
            background: "radial-gradient(circle at 90% 8%, rgba(249,115,22,.38), transparent 30%), linear-gradient(135deg,#070d18 0%,#172033 58%,#351707 100%)",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "2%", marginBottom: "2.1%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "2.5%" }}>
              <div style={{ width: "9%", aspectRatio: "1", minWidth: "9%", borderRadius: "12px", background: "#fff", padding: "3px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}><img src={CLUB_SHIELD} crossOrigin="anonymous" alt="Escudo CD Bustarviejo" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></div>
              <div>
                <div style={{ fontSize: "1.2vw", fontWeight: 800, letterSpacing: ".16em", color: "#fdba74" }}>CLUB DEPORTIVO</div>
                <div style={{ fontSize: "2.25vw", lineHeight: 1.05, fontWeight: 900, letterSpacing: "-.035em" }}>BUSTARVIEJO</div>
              </div>
            </div>
            <div style={{ padding: "1.1% 2%", borderRadius: "999px", background: "rgba(249,115,22,.18)", border: "1px solid rgba(251,146,60,.55)", color: "#fed7aa", fontSize: "1.2vw", fontWeight: 800, letterSpacing: ".12em", whiteSpace: "nowrap" }}>JORNADA · FIN DE SEMANA</div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "2%", gap: "2%" }}>
            <div>
              <div style={{ fontSize: "3.1vw", fontWeight: 900, lineHeight: .98, letterSpacing: "-.04em" }}>AGENDA DE PARTIDOS</div>
              <div style={{ marginTop: ".7%", fontSize: "1.35vw", color: "#fdba74", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" }}>{weekendLabel}</div>
            </div>
            <div style={{ fontSize: "1.1vw", color: "#cbd5e1", fontWeight: 700, textAlign: "right" }}>NARANJA Y NEGRO<br/>ORGULLO DE PUEBLO</div>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: ".9%" }}>
            {currentMatches.map((match, index) => (
              <div key={match.id || index} style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", gap: "2%", padding: "1.05% 1.5%", borderRadius: "10px", background: index % 2 === 0 ? "rgba(255,255,255,.105)" : "rgba(255,255,255,.065)", border: "1px solid rgba(255,255,255,.12)" }}>
                <div style={{ width: "19%", minWidth: "19%" }}>
                  <div style={{ display: "inline-block", maxWidth: "100%", padding: "5% 8%", borderRadius: "6px", background: "#f97316", color: "#111827", fontSize: "clamp(9px,1.05vw,15px)", lineHeight: 1.12, fontWeight: 900, textTransform: "uppercase" }}>{match.categoria}</div>
                  <div style={{ marginTop: "5%", fontSize: "clamp(9px,1vw,14px)", color: "#fdba74", fontWeight: 800 }}>{formatDay(match.fecha)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "1.5%" }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: "clamp(11px,1.45vw,21px)", lineHeight: 1.15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.local}</div>
                  <div style={{ flexShrink: 0, color: "#fb923c", fontSize: "clamp(9px,1vw,14px)", fontWeight: 900, letterSpacing: ".08em" }}>VS</div>
                  <div style={{ flex: 1, minWidth: 0, fontSize: "clamp(11px,1.45vw,21px)", lineHeight: 1.15, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.visitante}</div>
                </div>
                <div style={{ width: "19%", minWidth: "19%", textAlign: "right" }}>
                  <div style={{ fontSize: "clamp(17px,2.1vw,30px)", lineHeight: 1, fontWeight: 900, color: "#fdba74" }}>{match.hora || "—"}</div>
                  <div style={{ marginTop: "5%", fontSize: "clamp(8px,.95vw,13px)", lineHeight: 1.15, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.campo || "Campo por confirmar"}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2%", paddingTop: "1.5%", borderTop: "1px solid rgba(255,255,255,.2)" }}>
            <div style={{ fontSize: "1.25vw", fontWeight: 900, color: "#fff" }}>¡VAMOS BUSTARVIEJO! <span style={{ color: "#fb923c" }}>🧡</span></div>
            <div style={{ fontSize: "1vw", color: "#cbd5e1", fontWeight: 700 }}>CD BUSTARVIEJO · {page + 1}/{pages.length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800" htmlFor="weekend-x-caption">Comentario que acompañará a la imagen en X</label>
        <textarea id="weekend-x-caption" value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} maxLength={280} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
        <div className="flex items-center justify-between text-xs text-slate-500"><span>El comentario es editable y no tiene que resumir los horarios.</span><span>{caption.length}/280</span></div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={downloadImage} disabled={generating} className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Descargar imagen PNG
        </button>
        <button type="button" onClick={openX} disabled={!caption.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60">
          <ExternalLink className="h-4 w-4" /> Abrir X con el comentario
        </button>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Descarga primero el PNG y, al abrir X, adjúntalo al borrador antes de publicar. {pages.length > 1 ? "Hay varias imágenes: descarga y adjunta cada página para no dejar partidos fuera." : "La imagen incluye todos los partidos de esta página."}</p>
    </section>
  );
}
