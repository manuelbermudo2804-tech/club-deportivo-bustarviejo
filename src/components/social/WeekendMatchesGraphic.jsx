import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import moment from "moment";
import { Download, ExternalLink, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 4;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 675;
const CLUB_SHIELD = "https://www.cdbustarviejo.com/img/escudo.png";

function formatDay(date) {
  const parsed = moment(date, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
  return parsed.isValid() ? parsed.format("ddd D MMM").toUpperCase() : "FECHA POR CONFIRMAR";
}

export default function WeekendMatchesGraphic({ matches = [], weekendLabel = "" }) {
  const [page, setPage] = useState(0);
  const [caption, setCaption] = useState("⚽ ¡Este fin de semana vuelve el fútbol! Aquí tienes los horarios de nuestros equipos. ¡Vamos Bustarviejo! 🧡🖤");
  const [generating, setGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const previewRef = useRef(null);
  const graphicRef = useRef(null);

  const pages = useMemo(() => {
    const result = [];
    for (let i = 0; i < matches.length; i += PAGE_SIZE) result.push(matches.slice(i, i + PAGE_SIZE));
    return result;
  }, [matches]);
  const currentMatches = pages[page] || [];

  useEffect(() => {
    if (!previewRef.current) return;
    const node = previewRef.current;
    const update = () => setPreviewScale(Math.min(1, node.clientWidth / CANVAS_WIDTH));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const captureImage = async () => {
    if (!graphicRef.current) throw new Error("No se encuentra la vista previa.");
    const canvas = await html2canvas(graphicRef.current, {
      backgroundColor: "#0b1220",
      scale: 1,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      windowWidth: CANVAS_WIDTH,
      onclone: (doc) => {
        const cloned = doc.getElementById("cd-bustarviejo-match-artwork");
        if (cloned) cloned.style.transform = "none";
      },
    });
    return canvas;
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
    if (!caption.trim()) return toast.error("Escribe un comentario para acompañar a la imagen.");
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(caption.trim())}`, "_blank", "noopener,noreferrer");
  };

  if (!matches.length) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-slate-900">📅 No hay partidos cargados para este fin de semana.</p><p className="mt-1 text-sm text-slate-700">Cuando el calendario tenga encuentros publicados, aquí podrás crear la imagen automáticamente.</p></div>;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-orange-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="flex items-center gap-2 text-sm font-black text-slate-900"><ImageIcon className="h-4 w-4 text-orange-600" /> Imagen de horarios para redes</p><p className="mt-1 text-xs text-slate-600">Diseño horizontal de alta resolución · máximo 4 partidos por imagen.</p></div>
        {pages.length > 1 && <div className="flex items-center gap-2"><button type="button" onClick={() => setPage(v => Math.max(0, v - 1))} disabled={page === 0} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></button><span className="text-xs font-bold text-slate-600">{page + 1} / {pages.length}</span><button type="button" onClick={() => setPage(v => Math.min(pages.length - 1, v + 1))} disabled={page === pages.length - 1} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight className="h-4 w-4" /></button></div>}
      </div>

      <div ref={previewRef} className="relative w-full overflow-hidden rounded-xl shadow-lg" style={{ aspectRatio: "16 / 9" }}>
        <div id="cd-bustarviejo-match-artwork" ref={graphicRef} style={{
          width: CANVAS_WIDTH, height: CANVAS_HEIGHT, boxSizing: "border-box", overflow: "hidden",
          transform: `scale(${previewScale})`, transformOrigin: "top left",
          padding: "42px 48px 30px", display: "flex", flexDirection: "column", color: "#fff",
          background: "radial-gradient(circle at 92% 5%, rgba(249,115,22,.34), transparent 31%), linear-gradient(125deg,#07101f 0%,#172033 60%,#351707 100%)",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}>
          <div style={{height:88,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:18}}>
              <div style={{width:76,height:76,borderRadius:12,background:"#fff",padding:4,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center"}}><img src={CLUB_SHIELD} crossOrigin="anonymous" alt="Escudo oficial CD Bustarviejo" style={{width:"100%",height:"100%",objectFit:"contain"}} /></div>
              <div><div style={{fontSize:17,fontWeight:800,letterSpacing:3,color:"#fdba74"}}>CLUB DEPORTIVO</div><div style={{fontSize:32,lineHeight:1.05,fontWeight:900,letterSpacing:-1}}>BUSTARVIEJO</div></div>
            </div>
            <div style={{padding:"12px 20px",borderRadius:30,background:"rgba(249,115,22,.18)",border:"1px solid rgba(251,146,60,.6)",color:"#fed7aa",fontSize:15,fontWeight:800,letterSpacing:1.5}}>JORNADA · FIN DE SEMANA</div>
          </div>

          <div style={{height:100,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div><div style={{fontSize:39,fontWeight:900,lineHeight:1,letterSpacing:-1}}>AGENDA DE PARTIDOS</div><div style={{marginTop:10,fontSize:18,color:"#fdba74",fontWeight:800,letterSpacing:1.1,textTransform:"uppercase"}}>{weekendLabel}</div></div>
            <div style={{fontSize:14,color:"#cbd5e1",fontWeight:700,textAlign:"right",lineHeight:1.5}}>NARANJA Y NEGRO<br/>ORGULLO DE PUEBLO</div>
          </div>

          <div style={{height:350,display:"flex",flexDirection:"column",gap:10,flexShrink:0}}>
            {currentMatches.map((match,index)=>(
              <div key={match.id || index} style={{height:80,flexShrink:0,boxSizing:"border-box",display:"grid",gridTemplateColumns:"190px minmax(0,1fr) 174px",alignItems:"center",columnGap:18,padding:"10px 18px",borderRadius:14,background:index%2===0?"rgba(255,255,255,.105)":"rgba(255,255,255,.065)",border:"1px solid rgba(255,255,255,.16)"}}>
                <div style={{minWidth:0}}>
                  <div style={{display:"inline-block",maxWidth:"100%",boxSizing:"border-box",padding:"8px 12px",borderRadius:8,background:"#f97316",color:"#111827",fontSize:14,lineHeight:1.12,fontWeight:900,textTransform:"uppercase"}}>{match.categoria}</div>
                  <div style={{marginTop:5,fontSize:13,color:"#fdba74",fontWeight:800}}>{formatDay(match.fecha)}</div>
                </div>
                <div style={{minWidth:0,display:"grid",gridTemplateColumns:"minmax(0,1fr) 38px minmax(0,1fr)",alignItems:"center",columnGap:8}}>
                  <div title={match.local} style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:17,fontWeight:900,lineHeight:1.2}}>{match.local}</div>
                  <div style={{textAlign:"center",color:"#fb923c",fontSize:14,fontWeight:900}}>VS</div>
                  <div title={match.visitante} style={{minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:17,fontWeight:900,lineHeight:1.2}}>{match.visitante}</div>
                </div>
                <div style={{minWidth:0,textAlign:"right"}}>
                  <div style={{fontSize:30,lineHeight:1,fontWeight:900,color:"#fdba74"}}>{match.hora || "—"}</div>
                  <div title={match.campo || "Campo por confirmar"} style={{marginTop:7,fontSize:12,lineHeight:1.2,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.campo || "Campo por confirmar"}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{height:50,marginTop:"auto",paddingTop:12,boxSizing:"border-box",display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px solid rgba(255,255,255,.2)"}}>
            <div style={{fontSize:18,fontWeight:900}}>¡VAMOS BUSTARVIEJO! <span style={{color:"#fb923c"}}>🧡</span></div>
            <div style={{fontSize:13,color:"#cbd5e1",fontWeight:700}}>CD BUSTARVIEJO · {page+1}/{pages.length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-800" htmlFor="weekend-x-caption">Comentario que acompañará a la imagen en X</label>
        <textarea id="weekend-x-caption" value={caption} onChange={event=>setCaption(event.target.value)} rows={3} maxLength={280} className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100" />
        <div className="flex items-center justify-between text-xs text-slate-500"><span>El comentario es editable.</span><span>{caption.length}/280</span></div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={downloadImage} disabled={generating} className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60">{generating?<Loader2 className="h-4 w-4 animate-spin"/>:<Download className="h-4 w-4"/>}Descargar imagen PNG</button>
        <button type="button" onClick={openX} disabled={!caption.trim()} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"><ExternalLink className="h-4 w-4"/>Abrir X con el comentario</button>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">Descarga el PNG y adjúntalo en X antes de publicar. {pages.length>1?"Descarga cada página para incluir todos los partidos.":"La imagen incluye todos los partidos."}</p>
    </section>
  );
}
