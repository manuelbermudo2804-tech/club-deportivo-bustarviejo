import React,{useEffect,useState} from "react";
import {Link,useNavigate} from "react-router-dom";
import {base44} from "@/api/base44Client";
import {Trophy,Users,ArrowRight,ShieldCheck,CalendarDays,Loader2} from "lucide-react";
import {Button} from "@/components/ui/button";
export default function Eurocopa2028(){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true);const nav=useNavigate();const previewCodigo=new URLSearchParams(window.location.search).get("preview")||"";
 useEffect(()=>{document.title="Porra Eurocopa 2028 — CD Bustarviejo";base44.functions.invoke("eurocopaPublicLanding",previewCodigo?{preview_codigo:previewCodigo}:{}).then(r=>setData(r.data||null)).catch(()=>setData(null)).finally(()=>setLoading(false));},[]);
 if(loading)return <div className="min-h-screen grid place-items-center bg-slate-950"><Loader2 className="h-9 w-9 animate-spin text-orange-400"/></div>;
 const c=data?.config;
 return <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
 <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Link to="/" className="text-sm text-white/70 hover:text-white">← CD Bustarviejo</Link><span className="rounded-full border border-orange-300/30 bg-orange-400/10 px-3 py-1 text-xs font-bold text-orange-200">EURO 2028</span></header>
 {data?.preview_mode&&<div className="bg-violet-300 px-4 py-3 text-center text-sm font-black text-violet-950">🧪 ENTORNO DE PRUEBAS PRIVADO · No es la competición oficial y no se realizan cobros.</div>}
 <section className="mx-auto flex max-w-4xl flex-col items-center px-5 py-12 text-center">
 <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-orange-400/15 ring-1 ring-orange-300/30"><Trophy className="h-10 w-10 text-orange-300"/></div>
 <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-blue-200">CD Bustarviejo presenta</p><h1 className="text-4xl font-black sm:text-6xl">Porra Eurocopa 2028</h1>
 <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/75">Pronostica los partidos, compite con amigos y sigue la clasificación. Esta competición tiene datos, participantes y resultados independientes del Mundial 2026.</p>
 <div className="mt-8 grid w-full max-w-2xl gap-3 text-left sm:grid-cols-3">
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Users className="mb-2 h-5 w-5 text-orange-300"/><b>{data?.stats?.total_participantes||0} participantes</b><p className="mt-1 text-sm text-white/60">Inscripciones de Eurocopa</p></div>
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><CalendarDays className="mb-2 h-5 w-5 text-orange-300"/><b>24 selecciones</b><p className="mt-1 text-sm text-white/60">Seis grupos y fase eliminatoria</p></div>
 <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="mb-2 h-5 w-5 text-orange-300"/><b>Pago seguro</b><p className="mt-1 text-sm text-white/60">Stripe y enlace mágico personal</p></div></div>
 {c?.activa&&c?.estado==="inscripciones_abiertas"?<><p className="mt-7 text-white/70">Entrada: <strong className="text-white">{c.precio_entrada} €</strong> · {c.comision_club_porcentaje}% para el club</p><Button onClick={()=>nav(`/Eurocopa2028Crear${previewCodigo?`?preview=${encodeURIComponent(previewCodigo)}`:""}`)} className="mt-5 bg-orange-500 px-7 py-6 text-base font-black hover:bg-orange-400">Apuntarme a la porra <ArrowRight className="ml-2 h-5 w-5"/></Button></>:<div className="mt-8 max-w-xl rounded-2xl border border-orange-300/25 bg-orange-300/10 px-5 py-4 text-sm text-orange-100">Las inscripciones aún no están abiertas. Estamos preparando la competición y sus reglas.</div>}
 <Button variant="outline" onClick={()=>nav("/Eurocopa2028Ranking")} className="mt-3 border-white/20 bg-white/5 text-white hover:bg-white/10">Ver clasificación</Button>
 </section><footer className="pb-8 text-center text-xs text-white/40">© {new Date().getFullYear()} CD Bustarviejo · Porra Eurocopa 2028</footer></main>;
}